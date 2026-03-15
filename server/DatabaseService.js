require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

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

        return { data: this._mapDbProfileToGameData(dbProfile), error: null };
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
                jobEndTime: playerData.jobEndTime,
                jobNotified: playerData.jobNotified,
                viewingJobBoard: playerData.viewingJobBoard
            },
            
            updated_at: new Date()
        };

        // Remove undefined keys to avoid issues
        Object.keys(profile).forEach(key => profile[key] === undefined && delete profile[key]);

        const { data, error } = await this.supabase
            .from('profiles')
            .upsert(profile, { onConflict: 'id' })
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
