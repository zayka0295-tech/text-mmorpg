export class StatsManager {
    constructor(player) {
        this.player = player;
    }

    applyInitialBonuses(race, className) {
        const raceStats = {
            'Люди': { const: 1, str: 1, agi: 1, int: 1 },
            'Чиссы': { int: 3, agi: 1 },
            'Вуки': { str: 4, const: 2, int: -2 },
            "Тви'леки": { agi: 3, int: 1 },
            'Тогруты': { agi: 2, int: 2 },
            'Забраки': { str: 2, const: 2 },
            'Хатты': { const: 5, int: 2, str: -3, agi: -4 },
            'Раса Йоды': { int: 5, agi: 2, str: -4 },
            'Каминоанцы': { int: 4, const: -2 },
            'Мон-каламари': { int: 2, const: 1, agi: 1 }
        };

        const classStats = {
            'Контрабандист': { agi: 2, int: 2 },
            'Наемник': { str: 3, const: 1 },
            'Солдат': { const: 3, str: 1 },
            'Шпион': { int: 3, agi: 1 },
            'Охотник за головами': { str: 2, agi: 2 }
        };

        const raceBonus = raceStats[race] || raceStats['Люди'];
        const classBonus = classStats[className] || classStats['Контрабандист'];

        this.player._baseConstitution += (raceBonus.const || 0) + (classBonus.const || 0);
        this.player._baseStrength += (raceBonus.str || 0) + (classBonus.str || 0);
        this.player._baseAgility += (raceBonus.agi || 0) + (classBonus.agi || 0);
        this.player._baseIntellect += (raceBonus.int || 0) + (classBonus.int || 0);
    }

    getFinalStat(statName, baseVal) {
        if (!this.player.inventoryMgr) return baseVal;
        return (baseVal || 10) + this.player.inventoryMgr.getEquipmentStat(statName);
    }

    gainXp(amount) {
        if (this.player.level >= 100) return;

        this.player.xp += amount;

        while (this.player.xp >= this.player.nextLevelXp && this.player.level < 100) {
            this.levelUp();
        }

        if (this.player.level >= 100) {
            this.player.xp = this.player.nextLevelXp;
        }
    }

    levelUp() {
        if (this.player.level >= 100) return;

        this.player.level++;
        this.player.xp -= this.player.nextLevelXp;
        this.player.nextLevelXp = Math.floor(this.player.nextLevelXp * 1.5);

        this.player.statPoints += 3;
        this.player.hp = this.player.maxHp; 
    }
}
