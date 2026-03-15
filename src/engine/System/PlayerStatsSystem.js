export class PlayerStatsSystem {
    constructor(player) {
        this.player = player;
        this.listeners = new Map();
    }

    /**
     * Отримує повну статистику гравця
     */
    getFullStats() {
        return {
            // Базова інформація
            name: this.player.name,
            level: this.player.level,
            xp: this.player.xp,
            nextLevelXp: this.player.nextLevelXp,
            title: this.player.title,
            className: this.player.className,
            race: this.player.race,
            avatar: this.player.avatar,

            // Здоров'я та бойові характеристики
            hp: this.player.hp,
            maxHp: this.player.maxHp,
            attack: this.player.attack,
            defense: this.player.defense,
            critChance: this.player.critChance,
            critDamage: this.player.critDamage,

            // Базові стати
            constitution: this.player.constitution,
            strength: this.player.strength,
            agility: this.player.agility,
            intellect: this.player.intellect,

            // Фінанси
            money: this.player.money,
            bankBalance: this.player.bankBalance,
            datarii: this.player.datarii || 0,

            // Сила
            canUseForce: this.player.canUseForce,
            forcePoints: this.player.forcePoints,
            maxForcePoints: this.player.maxForcePoints,
            activeForceSkill: this.player.activeForceSkill,
            unlockedForceSkills: this.player.unlockedForceSkills || [],

            // Репутація та вирівнювання
            reputation: this.player.reputation,
            alignment: this.player.alignment,

            // Локація та активності
            locationId: this.player.locationId,
            activeJob: this.player.activeJob,
            jobEndTime: this.player.jobEndTime,

            // Інвентар та спорядження
            inventory: this.player.inventory,
            equipment: this.player.equipment,
            ship: this.player.ship,

            // Квести
            dailyQuests: this.player.dailyQuests,
            quests: this.player.quests,

            // Бафи
            buffs: this.player.buffs,

            // Часові мітки
            lastSaveTime: Date.now(),
            playTime: this.player.playTime || 0
        };
    }

    /**
     * Отримує статистику для відображення в модальному вікні
     */
    getModalStats() {
        const stats = this.getFullStats();
        
        return {
            // Основна інформація
            basic: {
                name: stats.name,
                avatar: stats.avatar,
                level: stats.level,
                title: stats.title,
                className: stats.className,
                race: stats.race
            },

            // Бойові характеристики
            combat: {
                hp: { current: stats.hp, max: stats.maxHp },
                attack: stats.attack,
                defense: stats.defense,
                critChance: stats.critChance,
                critDamage: stats.critDamage
            },

            // Базові стати
            baseStats: {
                constitution: stats.constitution,
                strength: stats.strength,
                agility: stats.agility,
                intellect: stats.intellect
            },

            // Прогрес
            progress: {
                xp: { current: stats.xp, next: stats.nextLevelXp },
                xpPercentage: Math.floor((stats.xp / stats.nextLevelXp) * 100)
            },

            // Фінанси
            finances: {
                money: stats.money,
                bankBalance: stats.bankBalance,
                datarii: stats.datarii
            },

            // Сила
            force: {
                canUseForce: stats.canUseForce,
                forcePoints: { current: stats.forcePoints, max: stats.maxForcePoints },
                activeForceSkill: stats.activeForceSkill,
                unlockedSkills: stats.unlockedForceSkills.length
            },

            // Репутація
            reputation: {
                points: stats.reputation,
                alignment: stats.alignment,
                alignmentName: this.getAlignmentName(stats.alignment)
            },

            // Активності
            activities: {
                location: this.getLocationName(stats.locationId),
                activeJob: stats.activeJob,
                jobEndTime: stats.jobEndTime
            }
        };
    }

    /**
     * Отримує назву вирівнювання
     */
    getAlignmentName(alignment) {
        if (alignment > 50) return "Світлий воїн";
        if (alignment < -50) return "Темний воїн";
        if (alignment > 0) return "Світлий схил";
        if (alignment < 0) return "Темний схил";
        return "Нейтральний";
    }

    /**
     * Отримує назву локації
     */
    getLocationName(locationId) {
        // Можна додати імпорт LOCATIONS для отримання назви
        const locationNames = {
            'tatooine_spaceport': 'Космопорт Мосс Эйсли',
            'tatooine_cantina': 'Кантина Мосс Эйсли',
            'tatooine_market': 'Рынок Мосс Эйсли',
            'coruscant_spaceport': 'Космопорт Корусанта',
            'korriban_academy': 'Академия Ситхов',
            'dantooine_enclave': 'Анклав Джедаев'
        };
        return locationNames[locationId] || locationId;
    }

    /**
     * Отримує статистику інвентаря
     */
    getInventoryStats() {
        const inventory = this.player.inventory || [];
        const equipment = this.player.equipment || {};

        return {
            totalItems: inventory.length,
            equippedItems: Object.keys(equipment).filter(key => equipment[key]).length,
            inventoryValue: this.calculateInventoryValue(inventory),
            equipmentStats: this.calculateEquipmentStats(equipment)
        };
    }

    /**
     * Розраховує цінність інвентаря
     */
    calculateInventoryValue(inventory) {
        // Спрощена логіка - можна розширити
        return inventory.reduce((total, item) => {
            return total + (item.value || 0);
        }, 0);
    }

    /**
     * Розраховує статистику спорядження
     */
    calculateEquipmentStats(equipment) {
        return {
            weaponSlots: Object.keys(equipment).filter(key => key.includes('weapon')).length,
            armorSlots: Object.keys(equipment).filter(key => key.includes('armor')).length,
            accessorySlots: Object.keys(equipment).filter(key => key.includes('accessory')).length,
            totalEquipped: Object.keys(equipment).filter(key => equipment[key]).length
        };
    }

    /**
     * Отримує статистику квестів
     */
    getQuestStats() {
        const dailyQuests = this.player.dailyQuests || [];
        const quests = this.player.quests || {};

        return {
            dailyQuestsCount: dailyQuests.length,
            activeQuestsCount: Object.keys(quests).filter(key => quests[key].active).length,
            completedQuestsCount: Object.keys(quests).filter(key => quests[key].completed).length,
            totalQuestsCount: Object.keys(quests).length
        };
    }

    /**
     * Отримує статистику бафів
     */
    getBuffStats() {
        const buffs = this.player.buffs || {};

        return {
            activeBuffsCount: Object.keys(buffs).filter(key => buffs[key].active).length,
            totalBuffsCount: Object.keys(buffs).length,
            buffList: Object.keys(buffs).map(key => ({
                id: key,
                name: buffs[key].name || key,
                duration: buffs[key].duration,
                active: buffs[key].active
            }))
        };
    }

    /**
     * Отримує історію активності
     */
    getActivityHistory() {
        // Можна додати логування активності
        return {
            lastLogin: this.player.lastLogin || Date.now(),
            totalPlayTime: this.player.playTime || 0,
            sessionTime: Date.now() - (this.player.sessionStart || Date.now()),
            locationsVisited: this.player.visitedLocations || [],
            monstersDefeated: this.player.monstersDefeated || 0,
            itemsCrafted: this.player.itemsCrafted || 0
        };
    }

    /**
     * Підписується на зміни статистики
     */
    onChange(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType).push(callback);
    }

    /**
     * Відписується від змін статистики
     */
    offChange(eventType, callback) {
        if (!this.listeners.has(eventType)) return;
        
        const callbacks = this.listeners.get(eventType);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * Сповіщає про зміни
     */
    emitChange(eventType, data) {
        if (!this.listeners.has(eventType)) return;
        
        this.listeners.get(eventType).forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in stats change listener for ${eventType}:`, error);
            }
        });
    }

    /**
     * Оновлює статистику при змінах гравця
     */
    updateStats() {
        this.emitChange('stats:updated', this.getFullStats());
    }

    /**
     * Отримує порівняльну статистику
     */
    getComparisonStats(otherPlayer) {
        const myStats = this.getFullStats();
        const otherStats = otherPlayer.getFullStats();

        return {
            levelDifference: myStats.level - otherStats.level,
            powerDifference: this.calculatePower(myStats) - this.calculatePower(otherStats),
            alignmentDifference: myStats.alignment - otherStats.alignment,
            moneyDifference: myStats.money - otherStats.money
        };
    }

    /**
     * Розраховує силу гравця
     */
    calculatePower(stats) {
        return Math.floor(
            stats.level * 10 +
            stats.attack * 2 +
            stats.defense * 1.5 +
            stats.hp * 0.1 +
            (stats.canUseForce ? stats.maxForcePoints * 0.5 : 0)
        );
    }

    /**
     * Отримує рейтинг гравця
     */
    getRanking() {
        const stats = this.getFullStats();
        const power = this.calculatePower(stats);

        return {
            power: power,
            rank: this.calculateRank(power),
            percentile: this.calculatePercentile(power)
        };
    }

    /**
     * Розраховує ранг
     */
    calculateRank(power) {
        if (power < 100) return "Новачок";
        if (power < 300) return "Рекрут";
        if (power < 600) return "Воїн";
        if (power < 1000) return "Ветеран";
        if (power < 1500) return "Еліт";
        if (power < 2000) return "Майстер";
        return "Легенда";
    }

    /**
     * Розраховує перцентиль (спрощено)
     */
    calculatePercentile(power) {
        // Можна додати реальну логіку з базою даних гравців
        if (power < 200) return 10;
        if (power < 500) return 25;
        if (power < 800) return 50;
        if (power < 1200) return 75;
        return 90;
    }
}
