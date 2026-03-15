require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class DatabaseService {
    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.warn('⚠️ Supabase URL or Key is missing. Database features will be disabled.');
            this.supabase = null;
        } else {
            this.supabase = createClient(supabaseUrl, supabaseKey);
            console.log('✅ Connected to Supabase');
        }
    }

    /**
     * Register a new user
     * @param {string} username
     * @param {string} password
     * @returns {Promise<{data, error}>}
     */
    async registerUser(username, password) {
        if (!this.supabase) return { error: 'Database not configured' };

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create initial profile
        const profile = {
            username: username,
            password_hash: passwordHash,
            class_name: 'Контрабандист', // Default
            race: 'Человек', // Default
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
            console.error('Error registering user:', error);
            if (error.code === '23505') { // Unique violation
                return { error: 'Username already taken' };
            }
            return { error: error.message };
        }

        return { data: this._mapDbProfileToGameData(data), error: null };
    }

    /**
     * Login user
     * @param {string} username
     * @param {string} password
     * @returns {Promise<{data, error}>}
     */
    async loginUser(username, password) {
        if (!this.supabase) return { error: 'Database not configured' };

        // Fetch user by username (including password_hash)
        const { data: dbProfile, error } = await this.supabase
            .from('profiles')
            .select('*')
            .eq('username', username)
            .single();

        if (error || !dbProfile) {
            return { error: 'User not found' };
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, dbProfile.password_hash);
        if (!isMatch) {
            return { error: 'Invalid password' };
        }

        // Generate Session Token
        const sessionToken = uuidv4();
        
        // Update profile with session token
        await this.supabase
            .from('profiles')
            .update({ session_token: sessionToken, updated_at: new Date() })
            .eq('id', dbProfile.id);

        const gameData = this._mapDbProfileToGameData(dbProfile);
        gameData.sessionToken = sessionToken; // Pass to client

        return { data: gameData, error: null };
    }

    /**
     * Login with Session Token
     * @param {string} token
     * @returns {Promise<{data, error}>}
     */
    async loginWithToken(token) {
        if (!this.supabase) return { error: 'Database not configured' };

        const { data: dbProfile, error } = await this.supabase
            .from('profiles')
            .select('*')
            .eq('session_token', token)
            .single();

        if (error || !dbProfile) {
            return { error: 'Invalid or expired session' };
        }

        const gameData = this._mapDbProfileToGameData(dbProfile);
        gameData.sessionToken = token; // Return it back just in case

        return { data: gameData, error: null };
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

        // 1. Fetch target profile
        const { data: profile, error: fetchError } = await this.supabase
            .from('profiles')
            .select('id, reputation, reputation_votes')
            .eq('id', targetId)
            .single();

        if (fetchError || !profile) return { error: 'Target not found' };

        let votes = profile.reputation_votes || {};
        let reputation = profile.reputation || 0;
        const prevVote = votes[voterName];

        // Logic matches ReputationManager.js
        if (prevVote === voteType) {
            // Remove vote
            delete votes[voterName];
            reputation += (voteType === 'up' ? -1 : 1);
        } else {
            // Change or new vote
            if (prevVote) {
                reputation += (prevVote === 'up' ? -1 : 1); // Undo previous
            }
            votes[voterName] = voteType;
            reputation += (voteType === 'up' ? 1 : -1);
        }

        // 2. Update DB
        const { data: updated, error: updateError } = await this.supabase
            .from('profiles')
            .update({ 
                reputation: reputation, 
                reputation_votes: votes,
                updated_at: new Date()
            })
            .eq('id', targetId)
            .select()
            .single();

        if (updateError) return { error: updateError.message };

        return { data: { reputation, voteType }, error: null };
    }

    /**
     * Get all players in a specific location
     * @param {string} locationId
     * @returns {Promise<{data, error}>}
     */
    async getPlayersInLocation(locationId) {
        if (!this.supabase) return { error: 'Database not configured' };

        const { data, error } = await this.supabase
            .from('profiles')
            .select('*') // Select all to map correctly
            .eq('location_id', locationId)
            .order('updated_at', { ascending: false })
            .limit(50); // Limit to prevent overload

        if (error) return { error: error.message };

        return { data: data.map(p => this._mapDbProfileToGameData(p)), error: null };
    }

    /**
     * Save or update player profile
     * @param {Object} playerData - Data object similar to what PersistenceManager saves
     * @returns {Promise<{data, error}>}
     */
    async saveProfile(playerData) {
        if (!this.supabase) return { error: 'Database not configured' };

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

        // Use update() instead of upsert() because upsert() tries an INSERT first, 
        // which fails due to missing password_hash (NOT NULL constraint).
        // Since we only save for existing users, update() is correct.
        const { data, error } = await this.supabase
            .from('profiles')
            .update(profile)
            .eq('id', profile.id)
            .select();

        if (error) {
            console.error('Error saving profile:', error);
        }

        return { data, error };
    }

    /**
     * Load player profile by username
     * @param {string} username 
     * @returns {Promise<{data, error}>}
     */
    async loadProfile(username) {
        if (!this.supabase) return { error: 'Database not configured' };

        const { data: dbProfile, error } = await this.supabase
            .from('profiles')
            .select('*')
            .eq('username', username)
            .single();

        if (error) {
            if (error.code !== 'PGRST116') { // PGRST116 is "Row not found"
                console.error('Error loading profile:', error);
            }
            return { data: null, error };
        }

        return { data: this._mapDbProfileToGameData(dbProfile), error: null };
    }
    
    /**
     * Load player profile by ID
     * @param {string} id 
     * @returns {Promise<{data, error}>}
     */
    async loadProfileById(id) {
        if (!this.supabase) return { error: 'Database not configured' };

        const { data: dbProfile, error } = await this.supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return { data: null, error };

        return { data: this._mapDbProfileToGameData(dbProfile), error: null };
    }

    /**
     * Helper to convert DB snake_case to game camelCase
     */
    _mapDbProfileToGameData(dbProfile) {
        if (!dbProfile) return null;

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
            ship: dbProfile.ship_data,
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
