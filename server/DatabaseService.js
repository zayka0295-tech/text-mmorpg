const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { validateItemPrice } = require('./ItemValidator');

if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    dotenv.config();
}

class DatabaseService {
    constructor() {
        this.locks = new Map(); // Mutex for player inventory operations
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.warn('⚠️ Supabase URL or Key is missing. Database features will be disabled.', {
                hasUrl: !!supabaseUrl,
                hasKey: !!supabaseKey
            });
            this.supabase = null;
        } else {
            this.supabase = createClient(supabaseUrl, supabaseKey);
            console.log('✅ Connected to Supabase');
        }
    }

    _logDbError(context, error, extra = {}) {
        console.error(`[DatabaseService.${context}]`, {
            message: error?.message,
            code: error?.code,
            details: error?.details,
            hint: error?.hint,
            ...extra
        });
    }

    _isMissingColumnError(error, columnName) {
        const errorText = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
        return errorText.includes(columnName.toLowerCase()) && (errorText.includes('column') || errorText.includes('schema cache'));
    }

    // Simple mutex to prevent race conditions on inventory
    async _withLock(playerId, operation) {
        const start = Date.now();
        while (this.locks.get(playerId)) {
            if (Date.now() - start > 5000) throw new Error('Lock timeout');
            await new Promise(r => setTimeout(r, 10));
        }
        this.locks.set(playerId, true);
        try {
            return await operation();
        } finally {
            this.locks.delete(playerId);
        }
    }

    /**
     * Register a new user
     * @param {string} username
     * @param {string} password
     * @returns {Promise<{data, error}>}
     */
    async registerUser(username, password, race, className) {
        if (!this.supabase) return { error: 'Database not configured' };

        try {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);
            const sessionToken = uuidv4();

            const profile = {
                username: username,
                password_hash: passwordHash,
                session_token: sessionToken,
                class_name: className || 'Контрабандист',
                race: race || 'Человек',
                title: className || 'Контрабандист', // Title defaults to class name
                level: 1,
                xp: 0,
                money: 0,
                location_id: 'tatooine_spaceport',
                updated_at: new Date()
            };

            const { data, error } = await this.supabase
                .from('profiles')
                .insert([profile])
                .select()
                .single();

            if (error) {
                this._logDbError('registerUser.insert', error, { username });
                if (error.code === '23505') {
                    return { error: 'Username already taken' };
                }
                return { error: error.message };
            }

            const gameData = this._mapDbProfileToGameData(data);
            gameData.sessionToken = sessionToken; // Ensure token is passed back

            return { data: gameData, error: null };
        } catch (error) {
            this._logDbError('registerUser.catch', error, { username });
            return { error: 'Internal registration error' };
        }
    }

    /**
     * Login user
     * @param {string} username
     * @param {string} password
     * @returns {Promise<{data, error}>}
     */
    async loginUser(username, password) {
        if (!this.supabase) return { error: 'Database not configured' };

        try {
            const { data: dbProfile, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('username', username)
                .single();

            if (error || !dbProfile) {
                if (error && error.code !== 'PGRST116') {
                    this._logDbError('loginUser.select', error, { username });
                }
                return { error: 'User not found' };
            }

            const isMatch = await bcrypt.compare(password, dbProfile.password_hash);
            if (!isMatch) {
                return { error: 'Invalid password' };
            }

            const sessionToken = uuidv4();
            let persistedSessionToken = null;

            const { error: sessionError } = await this.supabase
                .from('profiles')
                .update({ session_token: sessionToken, updated_at: new Date() })
                .eq('id', dbProfile.id);

            if (sessionError) {
                this._logDbError('loginUser.updateSessionToken', sessionError, { username, profileId: dbProfile.id });
                if (!this._isMissingColumnError(sessionError, 'session_token')) {
                    return { error: 'Failed to create session token' };
                }
            } else {
                persistedSessionToken = sessionToken;
            }

            const gameData = this._mapDbProfileToGameData(dbProfile);
            gameData.sessionToken = persistedSessionToken;

            return { data: gameData, error: null };
        } catch (error) {
            this._logDbError('loginUser.catch', error, { username });
            return { error: 'Internal login error' };
        }
    }

    /**
     * Login with Session Token
     * @param {string} token
     * @returns {Promise<{data, error}>}
     */
    async loginWithToken(token) {
        if (!this.supabase) return { error: 'Database not configured' };

        try {
            const { data: dbProfile, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('session_token', token)
                .single();

            if (error || !dbProfile) {
                if (error) {
                    this._logDbError('loginWithToken.select', error, { hasToken: !!token });
                    if (this._isMissingColumnError(error, 'session_token')) {
                        return { error: 'Session login is unavailable: session_token column is missing in Supabase' };
                    }
                }
                return { error: 'Invalid or expired session' };
            }

            const gameData = this._mapDbProfileToGameData(dbProfile);
            gameData.sessionToken = token;

            return { data: gameData, error: null };
        } catch (error) {
            this._logDbError('loginWithToken.catch', error, { hasToken: !!token });
            return { error: 'Internal token login error' };
        }
    }

    /**
     * Handle reputation voting using the reputation_votes table (UUID-keyed, no duplicates)
     * @param {string} targetId - UUID of target profile
     * @param {string} voterId  - UUID of the voter (from session)
     * @param {string} voteType 'up' or 'down'
     * @returns {Promise<{data, error}>}
     */
    async voteReputation(targetId, voterId, voteType) {
        if (!this.supabase) return { error: 'Database not configured' };

        try {
            if (!targetId || !voterId || !['up', 'down'].includes(voteType)) {
                return { error: 'Invalid reputation vote payload' };
            }
            if (targetId === voterId) {
                return { error: 'Cannot vote for yourself' };
            }

            // 1. Check existing vote (to determine intent: new, unvote, or switch)
            const { data: existing } = await this.supabase
                .from('reputation_votes')
                .select('vote_type')
                .eq('voter_id', voterId)
                .eq('target_id', targetId)
                .maybeSingle();

            // 2. ALWAYS Delete existing votes for this pair first (Clean slate / Clean up duplicates)
            const { error: delErr } = await this.supabase
                .from('reputation_votes')
                .delete()
                .eq('voter_id', voterId)
                .eq('target_id', targetId);

            if (delErr) return { error: delErr.message };

            let activeVote = null;

            // 3. Insert new vote ONLY if it's a New Vote or a Switch (If same type, we stop here = Unvote)
            if (!existing || existing.vote_type !== voteType) {
                const { error: insErr } = await this.supabase
                    .from('reputation_votes')
                    .insert({ voter_id: voterId, target_id: targetId, vote_type: voteType });
                
                if (insErr) return { error: insErr.message };
                activeVote = voteType;
            }

            // 4. Recalculate total reputation from source of truth
            const { count: upVotes, error: upErr } = await this.supabase
                .from('reputation_votes')
                .select('*', { count: 'exact', head: true })
                .eq('target_id', targetId)
                .eq('vote_type', 'up');

            const { count: downVotes, error: downErr } = await this.supabase
                .from('reputation_votes')
                .select('*', { count: 'exact', head: true })
                .eq('target_id', targetId)
                .eq('vote_type', 'down');

            if (upErr || downErr) {
                return { error: 'Failed to recalculate reputation' };
            }

            const newReputation = (upVotes || 0) - (downVotes || 0);

            const { error: updateError } = await this.supabase
                .from('profiles')
                .update({ reputation: newReputation, updated_at: new Date() })
                .eq('id', targetId);

            if (updateError) {
                this._logDbError('voteReputation.updateTarget', updateError, { targetId, voterId, voteType, reputation: newReputation });
                return { error: updateError.message };
            }

            return { data: { reputation: newReputation, activeVote }, error: null };
        } catch (error) {
            this._logDbError('voteReputation.catch', error, { targetId, voterId, voteType });
            return { error: 'Internal reputation vote error' };
        }
    }

    /**
     * Get the current player's vote for a specific target
     * @param {string} voterId - UUID of the voter
     * @param {string} targetId - UUID of the target
     * @returns {Promise<string|null>} 'up', 'down', or null
     */
    async getMyVote(voterId, targetId) {
        if (!this.supabase || !voterId || !targetId) return null;
        try {
            const { data } = await this.supabase
                .from('reputation_votes')
                .select('vote_type')
                .eq('voter_id', voterId)
                .eq('target_id', targetId)
                .maybeSingle();
            return data?.vote_type || null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Get all players in a specific location
     * @param {string} locationId
     * @returns {Promise<{data, error}>}
     */
    async getPlayersInLocation(locationId) {
        if (!this.supabase) return { error: 'Database not configured' };

        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('location_id', locationId)
                .order('updated_at', { ascending: false })
                .limit(50);

            if (error) {
                this._logDbError('getPlayersInLocation.select', error, { locationId });
                return { error: error.message };
            }

            return { data: (data || []).map(p => this._mapDbProfileToGameData(p)), error: null };
        } catch (error) {
            this._logDbError('getPlayersInLocation.catch', error, { locationId });
            return { error: 'Internal location query error' };
        }
    }

    /**
     * Save or update player profile
     * @param {Object} playerData - Data object similar to what PersistenceManager saves
     * @returns {Promise<{data, error}>}
     */
    async saveProfile(playerData) {
        if (!this.supabase) return { error: 'Database not configured' };

        if (!playerData?.id) {
            return { error: 'Player ID is required for saveProfile' };
        }

        // Map game data to database columns
        const profile = {
            id: playerData.id, // UUID from NetworkManager
            username: playerData.name,
            
            // Basic Info
            class_name: playerData.className,
            race: playerData.race,
            title: playerData.title,
            level: playerData.level,
            xp: playerData.xp,
            alignment: playerData.alignment,
            reputation: playerData.reputation,
            
            // Economy
            money: playerData.money,
            bank_balance: playerData.bankBalance,
            datarii: playerData.datarii,
            
            // Location
            location_id: playerData.locationId,
            
            // Complex Data (JSONB)
            stats: {
                baseConstitution: playerData.baseConstitution,
                baseStrength: playerData.baseStrength,
                baseAgility: playerData.baseAgility,
                baseIntellect: playerData.baseIntellect,
                hp: playerData.hp,
                statPoints: playerData.statPoints,
                hasMigratedToStatPoints: true,
                combatState: playerData.combatState // Save combat state
            },
            inventory_data: playerData.inventoryData, // { inventory: [], equipment: {} }
            quests_data: {
                quests: playerData.quests,
                dailyQuests: playerData.dailyQuests
            },
            force_data: {
                points: playerData.forcePoints,
                unlocked: playerData.unlockedForceSkills,
                activeSkill: playerData.activeForceSkill
            },
            reputation_votes: playerData.reputationVotes,
            ship_data: playerData.ship,
            appearance: {
                avatar: playerData.avatar
            },
            buffs: playerData.buffs,
            job_data: {
                activeJob: playerData.activeJob,
                jobEndTime: Number(playerData.jobEndTime) || 0, // Force number
                jobNotified: playerData.jobNotified,
                viewingJobBoard: playerData.viewingJobBoard
            },
            
            updated_at: new Date()
        };

        // Remove undefined keys to avoid issues
        Object.keys(profile).forEach(key => profile[key] === undefined && delete profile[key]);

        try {
            // 1. Fetch existing profile to protect server-authoritative fields
            const { data: existingProfile } = await this.supabase
                .from('profiles')
                .select('job_data')
                .eq('id', profile.id)
                .single();

            // 2. Merge Job Data (Server Authority for activeJob/jobEndTime)
            const existingJobData = existingProfile?.job_data || {};
            profile.job_data = {
                activeJob: existingJobData.activeJob,         // PROTECTED: Server controls start/finish
                jobEndTime: existingJobData.jobEndTime,       // PROTECTED: Server controls duration
                jobNotified: playerData.jobNotified,          // Client UI flag
                viewingJobBoard: playerData.viewingJobBoard   // Client UI flag
            };

            // 3. Update the profile
            const { data, error } = await this.supabase
                .from('profiles')
                .update(profile)
                .eq('id', profile.id)
                .select();

            if (error) {
                this._logDbError('saveProfile.update', error, {
                    profileId: profile.id,
                    username: profile.username,
                    locationId: profile.location_id
                });
            }

            return { data, error };
        } catch (error) {
            this._logDbError('saveProfile.catch', error, {
                profileId: profile.id,
                username: profile.username,
                locationId: profile.location_id
            });
            return { data: null, error };
        }
    }

    /**
     * Load player profile by username
     * @param {string} username 
     * @returns {Promise<{data, error}>}
    }
        if (!this.supabase) return { error: 'Database not configured' };

        try {
            const { data: dbProfile, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                this._logDbError('loadProfileById.select', error, { id });
                return { data: null, error };
            }

            return { data: this._mapDbProfileToGameData(dbProfile), error: null };
        } catch (error) {
            this._logDbError('loadProfileById.catch', error, { id });
            return { data: null, error };
        }
    }

    /**
     * Buy an item securely
     * @param {string} playerId
     * @param {string} itemId
     * @param {number} amount
     * @param {object} [customItemData] - Optional item data for generated items
     * @returns {Promise<{data, error}>}
     */
    async buyItem(playerId, itemId, amount, customItemData = null) {
        if (!this.supabase) return { error: 'Database not configured' };
        if (amount <= 0) return { error: 'Invalid amount' };

        return this._withLock(playerId, async () => {
            let itemDef = null;
            let cost = 0;

            if (customItemData) {
                // Generated Item: Validate price strictly!
                itemDef = customItemData;
                if (itemDef.id !== itemId) return { error: 'Item ID mismatch' };
                
                // Validate Price
                const validPrice = validateItemPrice(itemDef);
                if (validPrice === null) return { error: 'Invalid item data for price validation' };
                
                // Allow small variance? No, should be exact.
                // But let's say >= expected.
                if ((itemDef.value || 0) < validPrice) {
                    console.warn(`[buyItem] Price spoof attempt? Item: ${itemDef.value}, Expected: ${validPrice}`);
                    cost = validPrice * amount; // Force correct price
                } else {
                    cost = (itemDef.value || 0) * amount;
                }

            } else {
                // Static Item
                try {
                    const ITEMS = require('./data/items');
                    itemDef = ITEMS[itemId];
                } catch (e) {
                    console.error('Failed to load ITEMS', e);
                }
                if (!itemDef) return { error: 'Item not found' };
                cost = itemDef.value * amount;
            }

            if (cost < 0) return { error: 'Invalid cost' };

            try {
                const { data: profile, error: fetchError } = await this.supabase
                    .from('profiles')
                    .select('money, inventory_data')
                    .eq('id', playerId)
                    .single();

                if (fetchError || !profile) return { error: 'Profile not found' };

                if (profile.money < cost) {
                    return { error: 'Insufficient funds' };
                }

                const inventory = profile.inventory_data?.inventory || [];
                const existingItemIndex = inventory.findIndex(i => i.id === itemId);
                
                if (existingItemIndex >= 0 && !customItemData) {
                    inventory[existingItemIndex].amount = (inventory[existingItemIndex].amount || 1) + amount;
                } else {
                    if (customItemData) {
                        inventory.push({ id: itemId, amount: amount, item: customItemData });
                    } else {
                        inventory.push({ id: itemId, amount: amount });
                    }
                }

                const newMoney = profile.money - cost;

                const { data: updatedProfile, error: updateError } = await this.supabase
                    .from('profiles')
                    .update({ 
                        money: newMoney,
                        inventory_data: { ...profile.inventory_data, inventory: inventory },
                        updated_at: new Date()
                    })
                    .eq('id', playerId)
                    .select()
                    .single();

                if (updateError) return { error: updateError.message };

                return { data: this._mapDbProfileToGameData(updatedProfile), error: null };
            } catch (error) {
                this._logDbError('buyItem.catch', error, { playerId, itemId });
                return { error: 'Transaction failed' };
            }
        });
    }

    /**
     * Sell an item securely
     * @param {string} playerId
     * @param {string} itemId
     * @param {number} amount
     * @returns {Promise<{data, error}>}
     */
    async sellItem(playerId, itemId, amount) {
        if (!this.supabase) return { error: 'Database not configured' };
        if (amount <= 0) return { error: 'Invalid amount' };

        return this._withLock(playerId, async () => {
            let itemDef = null;
            try {
                const ITEMS = require('./data/items');
                itemDef = ITEMS[itemId];
            } catch (e) {
                 // Dynamic item handling below
            }
            
            try {
                const { data: profile, error: fetchError } = await this.supabase
                    .from('profiles')
                    .select('money, inventory_data')
                    .eq('id', playerId)
                    .single();

                if (fetchError || !profile) return { error: 'Profile not found' };

                let inventory = profile.inventory_data?.inventory || [];
                const itemIndex = inventory.findIndex(i => i.id === itemId);

                if (itemIndex === -1 || (inventory[itemIndex].amount || 1) < amount) {
                    return { error: 'Not enough items' };
                }

                const invItem = inventory[itemIndex];
                // If itemDef missing (dynamic item?), try to get from inventory data
                if (!itemDef && invItem.itemData) {
                    itemDef = invItem.itemData;
                }

                if (!itemDef) {
                     return { error: 'Item definition not found for price calculation' };
                }

                const sellPrice = Math.floor((itemDef.value || 0) * 0.5) * amount;

                // Deduct item
                if (inventory[itemIndex].amount > amount) {
                    inventory[itemIndex].amount -= amount;
                } else {
                    inventory.splice(itemIndex, 1);
                }

                const newMoney = profile.money + sellPrice;

                const { data: updatedProfile, error: updateError } = await this.supabase
                    .from('profiles')
                    .update({
                        money: newMoney,
                        inventory_data: { ...profile.inventory_data, inventory: inventory },
                        updated_at: new Date()
                    })
                    .eq('id', playerId)
                    .select()
                    .single();

                if (updateError) return { error: updateError.message };

                return { data: this._mapDbProfileToGameData(updatedProfile), error: null };
            } catch (error) {
                this._logDbError('sellItem.catch', error, { playerId, itemId });
                return { error: 'Transaction failed' };
            }
        });
    }

    /**
     * Start a job securely
     * @param {string} playerId
     * @param {string} jobId
     * @returns {Promise<{data, error}>}
     */
    async startJob(playerId, jobId) {
        if (!this.supabase) return { error: 'Database not configured' };

        try {
            const JOBS = require('./data/jobs');
            const jobDef = JOBS[jobId];
            if (!jobDef) return { error: 'Job not found' };

            // Fetch profile to check if already working and check buffs
            const { data: profile, error: fetchError } = await this.supabase
                .from('profiles')
                .select('job_data, buffs')
                .eq('id', playerId)
                .single();

            if (fetchError || !profile) return { error: 'Profile not found' };

            if (profile.job_data?.activeJob) {
                // Check if old job is actually expired/stuck? 
                // For now, strict rule: cannot start new if active exists.
                // Client should complete it first.
                // But if stuck, user might be locked. 
                // We'll assume completeActiveJob handles stuck jobs or we overwrite if forced?
                // Better: Require completion.
                return { error: 'You already have an active job' };
            }

            let durationMs = jobDef.timeMs;
            
            // Server-side buff check for Corellian Ale
            // buffs structure: { "buffId": expireTimeMs, ... } or similar?
            // Player.js: this.buffs = {}; addBuff(id, duration) -> this.buffs[id] = Date.now() + duration
            // So buffs key is ID, value is expiration timestamp.
            const buffs = profile.buffs || {};
            const now = Date.now();
            
            if (buffs['corellian_ale'] && buffs['corellian_ale'] > now) {
                durationMs = Math.min(durationMs, 3 * 60 * 1000); // 3 minutes cap
            }

            const jobEndTime = now + durationMs;

            const newJobData = {
                ...profile.job_data,
                activeJob: jobId,
                jobEndTime: jobEndTime,
                jobNotified: false
            };

            const { data: updatedProfile, error: updateError } = await this.supabase
                .from('profiles')
                .update({ 
                    job_data: newJobData,
                    updated_at: new Date()
                })
                .eq('id', playerId)
                .select()
                .single();

            if (updateError) return { error: updateError.message };

            return { data: this._mapDbProfileToGameData(updatedProfile), error: null };
        } catch (error) {
            this._logDbError('startJob.catch', error, { playerId, jobId });
            return { error: 'Failed to start job' };
        }
    }

    /**
     * Complete active job securely
     * @param {string} playerId
     * @returns {Promise<{data, error}>}
     */
    async completeJob(playerId) {
        if (!this.supabase) return { error: 'Database not configured' };

        try {
            const { data: profile, error: fetchError } = await this.supabase
                .from('profiles')
                .select('*') // Need full profile for stats update (money, xp, etc)
                .eq('id', playerId)
                .single();

            if (fetchError || !profile) return { error: 'Profile not found' };

            const jobData = profile.job_data || {};
            const activeJobId = jobData.activeJob;
            const jobEndTime = jobData.jobEndTime || 0;

            if (!activeJobId) return { error: 'No active job' };

            if (Date.now() < jobEndTime) {
                const remaining = Math.ceil((jobEndTime - Date.now()) / 1000);
                return { error: `Job not finished yet. Wait ${remaining}s` };
            }

            const JOBS = require('./data/jobs');
            const jobDef = JOBS[activeJobId];
            if (!jobDef) {
                // Invalid job in DB? Clear it to unstuck user
                await this.supabase.from('profiles').update({ job_data: {} }).eq('id', playerId);
                return { error: 'Invalid job data found. Resetting.' };
            }

            // Calculate rewards
            const rewards = jobDef.rewards || {};
            let newMoney = (profile.money || 0) + (rewards.credits || 0);
            let newXp = (profile.xp || 0) + (rewards.xp || 0);
            let newAlignment = (profile.alignment || 0) + (rewards.alignment || 0);
            
            // Level up logic? 
            // Ideally we just save XP and let client/next sync handle level up calc?
            // Or simple server-side level up check?
            // DatabaseService shouldn't contain complex game logic ideally.
            // But we need to update level if we want it persisted correctly.
            // Let's implement basic level up: XP needed = 100 * (1.5 ^ (level - 1))
            // This matches StatsManager.js logic roughly (needs verification of exact formula)
            // StatsManager: this.player.nextLevelXp = Math.floor(100 * Math.pow(1.5, this.player.level - 1));
            // Let's allow client to detect level up from XP change? 
            // Or we just update XP and Level here if we can.
            // For now, update XP. If client sees XP > max, it calls levelUp?
            // But 'xp' in DB is just number. 'level' is number.
            // If we don't update level here, client might level up locally, then save?
            // Yes, client `gainXp` -> `levelUp` -> `save()`.
            // But if we trust client for level up, it's exploitable?
            // Ideally server handles XP -> Level.
            // Let's implement basic level loop here to be safe.
            
            let currentLevel = profile.level || 1;
            // Re-calculate nextLevelXp logic
            const getNextXp = (lvl) => Math.floor(100 * Math.pow(1.5, lvl - 1));
            
            // Note: DB stores current XP. 
            // StatsManager: gainXp adds to xp. while xp >= nextLevelXp -> level++, xp -= nextLevelXp.
            // DB 'xp' is usually current progress within level? Or total?
            // Client Player.js: xp = 0 initially. gainXp adds.
            // It seems 'xp' is "current XP into level".
            // So we just add reward XP to current.
            
            while (newXp >= getNextXp(currentLevel) && currentLevel < 100) {
                newXp -= getNextXp(currentLevel);
                currentLevel++;
                // Add stat points? 
                // DB stats.statPoints.
                // We need to update that too.
            }
            
            let newStatPoints = (profile.stats?.statPoints || 0);
            if (currentLevel > (profile.level || 1)) {
                newStatPoints += (currentLevel - (profile.level || 1)) * 3;
            }

            const newJobData = {
                ...jobData,
                activeJob: null,
                jobEndTime: 0,
                jobNotified: false
            };

            const newStats = {
                ...profile.stats,
                statPoints: newStatPoints
            };

            const { data: updatedProfile, error: updateError } = await this.supabase
                .from('profiles')
                .update({ 
                    money: newMoney,
                    xp: newXp,
                    level: currentLevel,
                    alignment: newAlignment,
                    stats: newStats,
                    job_data: newJobData,
                    updated_at: new Date()
                })
                .eq('id', playerId)
                .select()
                .single();

            if (updateError) return { error: updateError.message };

            return { 
                data: this._mapDbProfileToGameData(updatedProfile), 
                rewards: { 
                    credits: rewards.credits, 
                    xp: rewards.xp, 
                    title: jobDef.title 
                },
                error: null 
            };

        } catch (error) {
            this._logDbError('completeJob.catch', error, { playerId });
            return { error: 'Failed to complete job' };
        }
    }

    /**
     * Rob a player securely
     * @param {string} attackerId
     * @param {string} targetId
     * @returns {Promise<{data, error}>}
     */
    async robPlayer(attackerId, targetId) {
        if (!this.supabase) return { error: 'Database not configured' };
        if (attackerId === targetId) return { error: 'Cannot rob yourself' };

        // Step 1: Deduct from Target (Critical Source of Truth)
        const deductResult = await this._withLock(targetId, async () => {
            const { data: target, error: fetchError } = await this.supabase
                .from('profiles')
                .select('money, username')
                .eq('id', targetId)
                .single();

            if (fetchError || !target) return { error: 'Target not found' };
            if ((target.money || 0) <= 0) return { error: 'Target has no money' };

            const stolen = Math.floor(target.money * 0.45);
            if (stolen <= 0) return { error: 'Target has too little money' };

            const newMoney = target.money - stolen;
            const { error: updateError } = await this.supabase
                .from('profiles')
                .update({ money: newMoney, updated_at: new Date() })
                .eq('id', targetId);

            if (updateError) return { error: updateError.message };

            return { stolen, targetName: target.username };
        });

        if (deductResult.error) return deductResult;
        const { stolen, targetName } = deductResult;

        // Step 2: Add to Attacker
        // If this fails, money is "burnt" (deflation), which is safer than inflation.
        await this._withLock(attackerId, async () => {
            const { data: attacker, error: fetchErr } = await this.supabase
                .from('profiles')
                .select('money')
                .eq('id', attackerId)
                .single();
            
            if (fetchErr || !attacker) {
                console.error('[robPlayer] Failed to fetch attacker to add money', fetchErr);
                return;
            }

            const { error: upErr } = await this.supabase
                .from('profiles')
                .update({ money: (attacker.money || 0) + stolen, updated_at: new Date() })
                .eq('id', attackerId);
            
            if (upErr) console.error('[robPlayer] Failed to add money to attacker', upErr);
        });

        return { data: { stolen, targetName }, error: null };
    }

    /**
     * Deposit money into bank
     * @param {string} playerId
     * @param {number} amount
     * @returns {Promise<{data, error}>}
     */
    async deposit(playerId, amount) {
        if (!this.supabase) return { error: 'Database not configured' };
        if (amount <= 0) return { error: 'Invalid amount' };

        return this._withLock(playerId, async () => {
            try {
                const { data: profile, error: fetchError } = await this.supabase
                    .from('profiles')
                    .select('money, bank_balance')
                    .eq('id', playerId)
                    .single();

                if (fetchError || !profile) return { error: 'Profile not found' };

                if (profile.money < amount) {
                    return { error: 'Insufficient funds' };
                }

                const newMoney = profile.money - amount;
                const newBank = (profile.bank_balance || 0) + amount;

                const { data: updatedProfile, error: updateError } = await this.supabase
                    .from('profiles')
                    .update({ 
                        money: newMoney, 
                        bank_balance: newBank,
                        updated_at: new Date()
                    })
                    .eq('id', playerId)
                    .select()
                    .single();

                if (updateError) return { error: updateError.message };

                return { data: this._mapDbProfileToGameData(updatedProfile), error: null };
            } catch (error) {
                this._logDbError('deposit.catch', error, { playerId });
                return { error: 'Transaction failed' };
            }
        });
    }

    /**
     * Withdraw money from bank
     * @param {string} playerId
     * @param {number} amount
     * @returns {Promise<{data, error}>}
     */
    async withdraw(playerId, amount) {
        if (!this.supabase) return { error: 'Database not configured' };
        if (amount <= 0) return { error: 'Invalid amount' };

        return this._withLock(playerId, async () => {
            try {
                const { data: profile, error: fetchError } = await this.supabase
                    .from('profiles')
                    .select('money, bank_balance')
                    .eq('id', playerId)
                    .single();

                if (fetchError || !profile) return { error: 'Profile not found' };

                const currentBank = profile.bank_balance || 0;
                if (currentBank < amount) {
                    return { error: 'Insufficient bank funds' };
                }

                const newMoney = profile.money + amount;
                const newBank = currentBank - amount;

                const { data: updatedProfile, error: updateError } = await this.supabase
                    .from('profiles')
                    .update({ 
                        money: newMoney, 
                        bank_balance: newBank,
                        updated_at: new Date()
                    })
                    .eq('id', playerId)
                    .select()
                    .single();

                if (updateError) return { error: updateError.message };

                return { data: this._mapDbProfileToGameData(updatedProfile), error: null };
            } catch (error) {
                this._logDbError('withdraw.catch', error, { playerId });
                return { error: 'Transaction failed' };
            }
        });
    }

    /**
     * Equip an item securely
     * @param {string} playerId
     * @param {string} itemId
     * @returns {Promise<{data, error}>}
     */
    async equipItem(playerId, itemId) {
        if (!this.supabase) return { error: 'Database not configured' };

        return this._withLock(playerId, async () => {
            try {
                const { data: profile, error: fetchError } = await this.supabase
                    .from('profiles')
                    .select('inventory_data, title, alignment') // Fetch title/alignment for requirements
                    .eq('id', playerId)
                    .single();

                if (fetchError || !profile) return { error: 'Profile not found' };

                let inventory = profile.inventory_data?.inventory || [];
                let equipment = profile.inventory_data?.equipment || {};

                const itemIndex = inventory.findIndex(i => i.id === itemId);
                if (itemIndex === -1) return { error: 'Item not in inventory' };

                const invItem = inventory[itemIndex];
                
                // Server-side requirement check
                let itemDef = null;
                if (invItem.item || invItem.itemData) {
                    // Generated item (support both storage keys)
                    itemDef = invItem.item || invItem.itemData;
                } else {
                    try {
                        const ITEMS = require('./data/items');
                        itemDef = ITEMS[itemId];
                    } catch (e) {}
                }

                if (!itemDef) return { error: 'Item definition not found' };

                // Check requirements
                if (itemDef.reqAlignment === 'light' && (profile.alignment || 0) <= 0) return { error: 'Requires Light alignment' };
                if (itemDef.reqAlignment === 'dark' && (profile.alignment || 0) >= 0) return { error: 'Requires Dark alignment' };

                const slot = itemDef.type;
                if (!slot) return { error: 'Invalid item type' };

                // If slot occupied, unequip first (swap)
                if (equipment[slot]) {
                    const oldItem = equipment[slot];
                    // Add old item back to inventory
                    const existingIndex = inventory.findIndex(i => i.id === oldItem.id);
                    if (existingIndex >= 0) {
                        inventory[existingIndex].amount = (inventory[existingIndex].amount || 1) + 1;
                    } else {
                        inventory.push({ id: oldItem.id, amount: 1, item: oldItem.item });
                    }
                }

                // Remove 1 from inventory
                if (invItem.amount > 1) {
                    invItem.amount -= 1;
                } else {
                    inventory.splice(itemIndex, 1);
                }

                // Set new equipment
                equipment[slot] = { id: itemId, amount: 1, item: itemDef };

                const { data: updatedProfile, error: updateError } = await this.supabase
                    .from('profiles')
                    .update({ 
                        inventory_data: { inventory, equipment },
                        updated_at: new Date()
                    })
                    .eq('id', playerId)
                    .select()
                    .single();

                if (updateError) return { error: updateError.message };

                return { data: this._mapDbProfileToGameData(updatedProfile), error: null };

            } catch (error) {
                this._logDbError('equipItem.catch', error, { playerId, itemId });
                return { error: 'Failed to equip item' };
            }
        });
    }

    /**
     * Unequip an item securely
     * @param {string} playerId
     * @param {string} slot
     * @returns {Promise<{data, error}>}
     */
    async unequipItem(playerId, slot) {
        if (!this.supabase) return { error: 'Database not configured' };

        return this._withLock(playerId, async () => {
            try {
                const { data: profile, error: fetchError } = await this.supabase
                    .from('profiles')
                    .select('inventory_data')
                    .eq('id', playerId)
                    .single();

                if (fetchError || !profile) return { error: 'Profile not found' };

                let inventory = profile.inventory_data?.inventory || [];
                let equipment = profile.inventory_data?.equipment || {};

                if (!equipment[slot]) return { error: 'Slot is empty' };

                const itemToUnequip = equipment[slot];
                
                // Add to inventory
                const existingIndex = inventory.findIndex(i => i.id === itemToUnequip.id);
                if (existingIndex >= 0) {
                    inventory[existingIndex].amount = (inventory[existingIndex].amount || 1) + 1;
                } else {
                    inventory.push({ id: itemToUnequip.id, amount: 1, item: itemToUnequip.item });
                }

                // Clear slot
                equipment[slot] = null;

                const { data: updatedProfile, error: updateError } = await this.supabase
                    .from('profiles')
                    .update({ 
                        inventory_data: { inventory, equipment },
                        updated_at: new Date()
                    })
                    .eq('id', playerId)
                    .select()
                    .single();

                if (updateError) return { error: updateError.message };

                return { data: this._mapDbProfileToGameData(updatedProfile), error: null };

            } catch (error) {
                this._logDbError('unequipItem.catch', error, { playerId, slot });
                return { error: 'Failed to unequip item' };
            }
        });
    }

    /**
     * Claim quest reward securely
     * @param {string} playerId
     * @param {string} questId
     * @returns {Promise<{data, error}>}
     */
    async claimQuestReward(playerId, questId) {
        if (!this.supabase) return { error: 'Database not configured' };

        try {
            const { data: profile, error: fetchError } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', playerId)
                .single();

            if (fetchError || !profile) return { error: 'Profile not found' };

            let quests = profile.quests_data?.quests || {};
            let dailyQuests = profile.quests_data?.dailyQuests || [];
            
            let foundQuest = null;
            let isDaily = false;

            // Check daily quests first
            const dailyIndex = dailyQuests.findIndex(q => q.id === questId);
            if (dailyIndex !== -1) {
                foundQuest = dailyQuests[dailyIndex];
                isDaily = true;
            } else {
                // Check story quests
                // Story quests are usually stored as key-value state: { "quest_id": "active" | "completed" }
                // Reward claiming logic for story quests is complex (custom rewards).
                // For now, let's focus on Daily Quests which have standard rewards structure.
                // If the user meant story quest, we need more logic.
                // Assuming this is for Daily Quests based on QuestsScreen.js audit.
            }

            if (!foundQuest) return { error: 'Quest not found or not active' };

            if (!foundQuest.isCompleted) return { error: 'Quest not completed yet' };
            if (foundQuest.isRewardClaimed) return { error: 'Reward already claimed' };

            // Apply rewards
            const reward = foundQuest.reward || {};
            let newMoney = (profile.money || 0) + (reward.money || 0);
            let newXp = (profile.xp || 0) + (reward.xp || 0);
            
            // Mark as claimed
            foundQuest.isRewardClaimed = true;
            if (isDaily) {
                dailyQuests[dailyIndex] = foundQuest;
            }

            // Level up logic (reuse simplified version or shared helper if I had one)
            let currentLevel = profile.level || 1;
            const getNextXp = (lvl) => Math.floor(100 * Math.pow(1.5, lvl - 1));
            while (newXp >= getNextXp(currentLevel) && currentLevel < 100) {
                newXp -= getNextXp(currentLevel);
                currentLevel++;
            }
            
            let newStatPoints = (profile.stats?.statPoints || 0);
            if (currentLevel > (profile.level || 1)) {
                newStatPoints += (currentLevel - (profile.level || 1)) * 3;
            }

            const newStats = { ...profile.stats, statPoints: newStatPoints };

            const { data: updatedProfile, error: updateError } = await this.supabase
                .from('profiles')
                .update({ 
                    money: newMoney,
                    xp: newXp,
                    level: currentLevel,
                    stats: newStats,
                    quests_data: { quests, dailyQuests },
                    updated_at: new Date()
                })
                .eq('id', playerId)
                .select()
                .single();

            if (updateError) return { error: updateError.message };

            return { data: this._mapDbProfileToGameData(updatedProfile), rewards: reward, error: null };

        } catch (error) {
            this._logDbError('claimQuestReward.catch', error, { playerId, questId });
            return { error: 'Failed to claim reward' };
        }
    }

    /**
     * Helper to convert DB snake_case to game camelCase
     */
    _mapDbProfileToGameData(dbProfile) {
        if (!dbProfile) return null;

        const shipData = dbProfile.ship_data && typeof dbProfile.ship_data === 'object' && dbProfile.ship_data.id
            ? dbProfile.ship_data
            : null;

        // Map back to format expected by PersistenceManager.load() logic
        return {
            id: dbProfile.id,
            name: dbProfile.username,
            // Don't send password_hash back to client!
            
            className: dbProfile.class_name,
            race: dbProfile.race,
            title: dbProfile.title,
            level: dbProfile.level,
            xp: dbProfile.xp,
            alignment: dbProfile.alignment,
            reputation: dbProfile.reputation,
            
            money: dbProfile.money,
            bankBalance: dbProfile.bank_balance,
            datarii: dbProfile.datarii,
            
            locationId: dbProfile.location_id,
            
            // Extract from JSONB fields
            baseConstitution: dbProfile.stats?.baseConstitution,
            baseStrength: dbProfile.stats?.baseStrength,
            baseAgility: dbProfile.stats?.baseAgility,
            baseIntellect: dbProfile.stats?.baseIntellect,
            hp: dbProfile.stats?.hp,
            statPoints: dbProfile.stats?.statPoints,
            combatState: dbProfile.stats?.combatState, // Hydrate combat state
            hasMigratedToStatPoints: dbProfile.stats?.hasMigratedToStatPoints,
            
            inventoryData: dbProfile.inventory_data,
            
            quests: dbProfile.quests_data?.quests,
            dailyQuests: dbProfile.quests_data?.dailyQuests,
            
            forcePoints: dbProfile.force_data?.points,
            unlockedForceSkills: dbProfile.force_data?.unlocked,
            activeForceSkill: dbProfile.force_data?.activeSkill,
            
            reputationVotes: dbProfile.reputation_votes,
            ship: shipData,
            avatar: dbProfile.appearance?.avatar,
            buffs: dbProfile.buffs,
            
            activeJob: dbProfile.job_data?.activeJob,
            jobEndTime: dbProfile.job_data?.jobEndTime,
            jobNotified: dbProfile.job_data?.jobNotified,
            viewingJobBoard: dbProfile.job_data?.viewingJobBoard,
            
            lastOnline: new Date(dbProfile.updated_at).getTime()
        };
    }
}

module.exports = new DatabaseService();
