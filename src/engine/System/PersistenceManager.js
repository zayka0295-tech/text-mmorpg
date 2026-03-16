export class PersistenceManager {
    constructor(player) {
        this.player = player;
    }

    save() {
        const p = this.player;
        const data = {
            name: p.name,
            race: p.race,
            className: p.className,
            title: p.title,
            avatar: p.avatar,
            level: p.level,
            xp: p.xp,
            nextLevelXp: p.nextLevelXp,
            money: p.money,
            bankBalance: p.bankBalance,
            datarii: p.datarii,
            buffs: p.buffs,
            locationId: p.locationId,
            baseConstitution: p.baseConstitution,
            baseStrength: p.baseStrength,
            baseAgility: p.baseAgility,
            baseIntellect: p.baseIntellect,
            // Computed totals for cross-player visibility
            totalAttack: p.attack,
            totalDefense: p.defense,
            totalMaxHp: p.maxHp,
            totalConstitution: p.constitution,
            totalStrength: p.strength,
            totalAgility: p.agility,
            totalIntellect: p.intellect,
            statPoints: p.statPoints,
            hasMigratedToStatPoints: true,
            hp: p.hp,
            inventoryData: p.inventoryMgr.getExportData(),
            ship: p.ship,
            forcePoints: p.forcePoints,
            activeForceSkill: p.activeForceSkill,
            unlockedForceSkills: p.unlockedForceSkills,
            dailyQuests: p.dailyQuests,
            alignment: p.alignment,
            lastOnline: Date.now(),
            activeJob: p.activeJob,
            jobEndTime: p.jobEndTime,
            jobNotified: p.jobNotified || false,
            viewingJobBoard: p.viewingJobBoard || false,
            viewingBank: p.viewingBank || false,
            quests: p.quests,
            reputation: p.reputation,
            reputationVotes: p.reputationVotes,
        };
        try {
            localStorage.setItem(`sw_player_save_${p.name}`, JSON.stringify(data));
        } catch (e) {
            console.warn('Save failed', e);
        }
    }

    load() {
        const p = this.player;
        p.isInitialLoading = true;
        const savedData = localStorage.getItem(`sw_player_save_${p.name}`);
        
        if (!savedData) {
            p.isInitialLoading = false;
            return;
        }

        try {
            const data = JSON.parse(savedData);
            
            p.race = data.race || p.race;
            p.className = data.className || p.className;
            p.title = data.title || p.title;
            p.avatar = data.avatar || p.avatar;
            p.alignment = data.alignment || 0;
            p.activeJob = data.activeJob || null;
            p.jobEndTime = data.jobEndTime ?? 0;
            p.jobNotified = data.jobNotified || false;
            p.viewingJobBoard = data.viewingJobBoard || false;
            p.viewingBank = data.viewingBank || false;

            p.level = data.level || p.level;
            p.xp = data.xp || p.xp;
            p.nextLevelXp = data.nextLevelXp || p.nextLevelXp;
            p.money = data.money !== undefined ? data.money : p.money;
            p.bankBalance = data.bankBalance !== undefined ? data.bankBalance : p.bankBalance;
            p.datarii = data.datarii || 0;
            p.buffs = data.buffs || {};
            p.locationId = data.locationId || p.locationId;

            // Migration logic
            this._handleMigrations(p, data);

            p.inventoryMgr.load(
                data.inventoryData ? data.inventoryData.inventory : data.inventory,
                data.inventoryData ? data.inventoryData.equipment : data.equipment
            );
            
            p.ship = data.ship || null;
            p.forcePoints = data.forcePoints || 0;
            p.activeForceSkill = data.activeForceSkill || null;
            p.unlockedForceSkills = data.unlockedForceSkills || [];

            if (data.dailyQuests && data.dailyQuests.length > 0) {
                p.dailyQuests = data.dailyQuests;
            }
            if (data.quests) p.quests = data.quests;
            p.reputation = data.reputation || 0;
            p.reputationVotes = data.reputationVotes || {};

            p.enforceTitleRestrictions();
        } catch (e) {
            console.error("Ошибка при загрузке хранения:", e);
        } finally {
            p.isInitialLoading = false;
            p._emit('stats-changed');
        }
    }

    _handleMigrations(p, data) {
        // Job center migrations
        const jobLocs = ["tatooine_job_center", "coruscant_job_center", "dantooine_job_center", "naboo_job_center"];
        if (jobLocs.includes(p.locationId) || p.locationId === "coruscant_bank") {
            p.locationId = p.locationId.split('_')[0] + "_spaceport";
        }

        // Stats migration
        p.baseConstitution = data.baseConstitution || 10;
        p.baseStrength = data.baseStrength || 10;
        p.baseAgility = data.baseAgility || 10;
        p.baseIntellect = data.baseIntellect || 10;
        p.statPoints = data.statPoints || 0;

        if (!data.hasMigratedToStatPoints) {
            p.baseConstitution = 10;
            p.baseStrength = 10;
            p.baseAgility = 10;
            p.baseIntellect = 10;
            p.statPoints = Math.max(0, (p.level - 1) * 3);
            p._applyInitialBonuses(); // Re-apply bonuses to the new base 10
        }

        // Auto-correct missing points
        const expectedTotalPoints = Math.max(0, (p.level - 1) * 3);
        const spentPoints = Math.max(0, p.baseConstitution - 10) 
                          + Math.max(0, p.baseStrength - 10)
                          + Math.max(0, p.baseAgility - 10)
                          + Math.max(0, p.baseIntellect - 10);
                          
        const totalPointsWeHave = spentPoints + p.statPoints;
        if (totalPointsWeHave < expectedTotalPoints) {
            p.statPoints += (expectedTotalPoints - totalPointsWeHave);
        }

        p.hp = data.hp !== undefined ? data.hp : p.maxHp;
    }
}
