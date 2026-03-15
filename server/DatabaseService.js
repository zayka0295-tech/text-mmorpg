const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    dotenv.config();
}

class DatabaseService {
    constructor() {
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
     * Handle reputation voting
     * @param {string} targetId
     * @param {string} voterName
     * @param {string} voteType 'up' or 'down'
     * @returns {Promise<{data, error}>}
     */
    async voteReputation(targetId, voterName, voteType) {
        if (!this.supabase) return { error: 'Database not configured' };

        try {
            if (!targetId || !voterName || !['up', 'down'].includes(voteType)) {
                return { error: 'Invalid reputation vote payload' };
            }

            const { data: profile, error: fetchError } = await this.supabase
                .from('profiles')
                .select('id, reputation, reputation_votes')
                .eq('id', targetId)
                .single();

            if (fetchError || !profile) {
                if (fetchError) {
                    this._logDbError('voteReputation.fetchTarget', fetchError, { targetId, voterName, voteType });
                }
                return { error: 'Target not found' };
            }

            const votes = { ...(profile.reputation_votes || {}) };
            let reputation = profile.reputation || 0;
            const prevVote = votes[voterName];

            if (prevVote === voteType) {
                delete votes[voterName];
                reputation += (voteType === 'up' ? -1 : 1);
            } else {
                if (prevVote) {
                    reputation += (prevVote === 'up' ? -1 : 1);
                }
                votes[voterName] = voteType;
                reputation += (voteType === 'up' ? 1 : -1);
            }

            const { error: updateError } = await this.supabase
                .from('profiles')
                .update({ 
                    reputation: reputation, 
                    reputation_votes: votes,
                    updated_at: new Date()
                })
                .eq('id', targetId);

            if (updateError) {
                this._logDbError('voteReputation.updateTarget', updateError, { targetId, voterName, voteType, reputation });
                return { error: updateError.message };
            }

            return { data: { reputation, voteType }, error: null };
        } catch (error) {
            this._logDbError('voteReputation.catch', error, { targetId, voterName, voteType });
            return { error: 'Internal reputation vote error' };
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

        let itemDef = null;
        let cost = 0;

        if (customItemData) {
            itemDef = customItemData;
            if (itemDef.id !== itemId) return { error: 'Item ID mismatch' };
            cost = (itemDef.value || 0) * amount;
        } else {
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
                    inventory.push({ id: itemId, amount: amount, itemData: customItemData });
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

        let itemDef = null;
        try {
            const ITEMS = require('./data/items');
            itemDef = ITEMS[itemId];
        } catch (e) {
             // If item is not in static list, check player inventory later? 
             // We can't easily validate price of generated items without trust or storing original value in DB.
             // For now, assume generated items have value stored in inventory or rely on server-side Items if possible.
             // But ITEMS only has static.
        }
        
        // We need to fetch profile first to verify ownership AND get item details if it's dynamic
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
                 // Fallback: If we can't find definition, maybe it's an old item? 
                 // We can't determine price.
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
