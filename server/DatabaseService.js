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
    async registerUser(username, password) {
        if (!this.supabase) return { error: 'Database not configured' };

        try {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            const profile = {
                username: username,
                password_hash: passwordHash,
                class_name: 'Контрабандист',
                race: 'Человек',
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

            return { data: this._mapDbProfileToGameData(data), error: null };
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
                hasMigratedToStatPoints: true
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
     */
    async loadProfile(username) {
        if (!this.supabase) return { error: 'Database not configured' };

        try {
            const { data: dbProfile, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('username', username)
                .single();

            if (error) {
                if (error.code !== 'PGRST116') {
                    this._logDbError('loadProfile.select', error, { username });
                }
                return { data: null, error };
            }

            return { data: this._mapDbProfileToGameData(dbProfile), error: null };
        } catch (error) {
            this._logDbError('loadProfile.catch', error, { username });
            return { data: null, error };
        }
    }
    
    /**
     * Load player profile by ID
     * @param {string} id 
     * @returns {Promise<{data, error}>}
     */
    async loadProfileById(id) {
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
