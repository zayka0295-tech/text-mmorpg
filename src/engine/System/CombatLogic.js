export class CombatLogic {
    constructor(player, monster) {
        this.player = player;
        this.monster = monster;
        this.isPlayerTurn = true;
        this.isProcessingAttack = false;
        this.currentAttackDamage = 0;
        this.lastTurnTime = Date.now();
    }

    /**
     * Обробляє атаку гравця
     */
    executePlayerAttack(weaponData) {
        if (!this.isPlayerTurn || this.isProcessingAttack) return false;

        this.isProcessingAttack = true;
        this.currentAttackDamage = this.player.attack || 0;

        // Розрахунок критичного удару
        const isCrit = Math.random() < (this.player.critChance / 100);
        if (isCrit) {
            this.currentAttackDamage *= this.player.critDamage;
        }

        // Завдання шкоди монстру
        const actualDamage = this.monster.takeDamage(this.currentAttackDamage);

        return {
            success: true,
            damage: actualDamage,
            isCrit: isCrit,
            attacker: this.player.name,
            target: this.monster.name
        };
    }

    /**
     * Обробляє використання Сили
     */
    executeForceSkill(skillId, cost, getItemData) {
        if (!this.isPlayerTurn || this.isProcessingAttack) return false;
        if (this.player.forcePoints < cost) return false;

        this.player.forcePoints -= cost;
        this.isProcessingAttack = true;

        let damage = 0;
        let message = '';

        switch (skillId) {
            case 'mind_control':
                // Контроль розуму - пропускає хід монстра
                message = `${this.player.name} контролює розум ${this.monster.name}!`;
                break;
            case 'force_pull':
                // Силове притягання - шкодить та оглушує
                damage = this.player.intellect * 2;
                this.monster.takeDamage(damage);
                this.monster.stunned = true;
                message = `${this.player.name} притягує ${this.monster.name} Силою!`;
                break;
            case 'force_heal':
                // Лікування Силою
                const healAmount = this.player.intellect * 3;
                this.player.heal(healAmount);
                message = `${this.player.name} лікується Силою на ${healAmount} HP!`;
                break;
            case 'force_speed':
                // Швидкість Сили - додатковий хід
                message = `${this.player.name} використовує Швидкість Сили!`;
                // Не змінюємо хід, дозволяємо атакувати ще раз
                this.isProcessingAttack = false;
                break;
            case 'sith_lightning':
                // Молнія Ситха
                damage = this.player.intellect * 4;
                this.monster.takeDamage(damage);
                message = `${this.player.name} вражає ${this.monster.name} молнією Ситха!`;
                break;
            case 'sith_rage':
                // Ярость Ситха - підвищує атаку
                this.player.attack *= 1.5;
                message = `${this.player.name} входить в Ярость Ситха!`;
                break;
            case 'lightsaber_throw':
                // Бросок світлового меча
                damage = this.player.attack * 1.8;
                this.monster.takeDamage(damage);
                message = `${this.player.name} кидає світловий меч в ${this.monster.name}!`;
                break;
            case 'force_choke':
                // Удушення Силою
                damage = this.player.intellect * 3;
                this.monster.takeDamage(damage);
                this.monster.stunned = true;
                message = `${this.player.name} душить ${this.monster.name} Силою!`;
                break;
            default:
                return false;
        }

        return {
            success: true,
            damage: damage,
            message: message,
            skillId: skillId,
            attacker: this.player.name,
            target: this.monster.name
        };
    }

    /**
     * Обробляє хід монстра
     */
    executeMonsterTurn(getItemData) {
        if (this.monster.hp <= 0 || this.player.hp <= 0) return null;

        // Якщо монстр оглушений, пропускає хід
        if (this.monster.stunned) {
            this.monster.stunned = false;
            return {
                success: true,
                message: `${this.monster.name} оглушений і пропускає хід!`,
                damage: 0,
                attacker: this.monster.name,
                target: this.player.name
            };
        }

        // Логіка атаки монстра (спрощена)
        const damage = Math.max(1, (this.monster.attack || 0) - Math.floor((this.player.defense || 0) * 0.5));
        const actualDamage = this.player.takeDamage(damage);

        return {
            success: true,
            damage: actualDamage,
            attacker: this.monster.name,
            target: this.player.name
        };
    }

    /**
     * Перевіряє завершення бою
     */
    checkCombatEnd() {
        if (this.monster.hp <= 0) {
            return {
                ended: true,
                winner: 'player',
                rewards: this.monster.getRewards()
            };
        }

        if (this.player.hp <= 0) {
            return {
                ended: true,
                winner: 'monster',
                rewards: null
            };
        }

        return { ended: false };
    }

    /**
     * Перемикає хід
     */
    switchTurn() {
        this.isPlayerTurn = !this.isPlayerTurn;
        this.isProcessingAttack = false;
        this.lastTurnTime = Date.now();
    }

    /**
     * Отримує поточний стан бою
     */
    getCombatState() {
        return {
            isPlayerTurn: this.isPlayerTurn,
            isProcessingAttack: this.isProcessingAttack,
            playerHp: this.player.hp,
            playerMaxHp: this.player.maxHp,
            monsterHp: this.monster.hp,
            monsterMaxHp: this.monster.maxHp,
            lastTurnTime: this.lastTurnTime
        };
    }

    /**
     * Завершує бій
     */
    endCombat() {
        this.isProcessingAttack = false;
        this.isPlayerTurn = true;
    }
}
