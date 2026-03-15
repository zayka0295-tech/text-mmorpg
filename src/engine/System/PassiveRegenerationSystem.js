import { Notifications } from '../../ui/Notifications.js';

export class PassiveRegenerationSystem {
    constructor(player, gameLoopManager) {
        this.player = player;
        this.gameLoopManager = gameLoopManager;
        this.isPaused = false;
        this.loops = new Map();
    }

    /**
     * Ініціалізує системи пасивної регенерації
     */
    initialize() {
        this.setupHpRegeneration();
        this.setupForceRegeneration();
        this.setupJobCompletionCheck();
    }

    /**
     * Налаштовує регенерацію HP
     */
    setupHpRegeneration() {
        const hpLoopId = 'hp-regeneration';
        
        this.gameLoopManager.addLoop(hpLoopId, (currentTime, deltaTime) => {
            if (this.isPaused) return;
            
            // Останавливаем регенерацию во время боя
            if (this.isInCombat()) return;

            if (this.player.hp < this.player.maxHp) {
                let multiplier = 1;
                if (this.player.hasBuff('juma_juice')) multiplier = 5;

                const regenAmt = Math.max(1, Math.floor(this.player.maxHp * 0.01 * multiplier));
                const healed = this.player.heal(regenAmt);
                
                // Сповіщення про регенерацію (опціонально)
                if (healed > 0 && Math.random() < 0.1) { // 10% шанс показати повідомлення
                    this.emitRegenerationEvent('hp', healed);
                }
            }
        }, 10000); // Кожні 10 секунд

        this.loops.set(hpLoopId, 'hp');
    }

    /**
     * Налаштовує регенерацію Сили
     */
    setupForceRegeneration() {
        const forceLoopId = 'force-regeneration';
        
        this.gameLoopManager.addLoop(forceLoopId, (currentTime, deltaTime) => {
            if (this.isPaused) return;
            
            // Останавливаем регенерацию во время боя
            if (this.isInCombat()) return;
            
            if (this.player.canUseForce && this.player.forcePoints < this.player.maxForcePoints) {
                let addAmt = 1;
                if (this.player.hasBuff('juma_juice')) addAmt = 5;

                const oldForce = this.player.forcePoints;
                this.player.forcePoints = Math.min(
                    this.player.forcePoints + addAmt,
                    this.player.maxForcePoints
                );
                
                const regenerated = this.player.forcePoints - oldForce;
                
                // Сповіщення про регенерацію (опціонально)
                if (regenerated > 0 && Math.random() < 0.05) { // 5% шанс показати повідомлення
                    this.emitRegenerationEvent('force', regenerated);
                }
            }
        }, 1000); // Кожну секунду

        this.loops.set(forceLoopId, 'force');
    }

    /**
     * Налаштовує перевірку завершення роботи
     */
    setupJobCompletionCheck() {
        const jobLoopId = 'job-completion';
        
        this.gameLoopManager.addLoop(jobLoopId, (currentTime, deltaTime) => {
            if (this.isPaused) return;
            
            if (this.player.activeJob && this.player.jobEndTime > 0) {
                // Check if time passed
                if (Date.now() >= this.player.jobEndTime) {
                    // Attempt to complete the job using Player entity logic
                    const result = this.player.completeActiveJob();
                    
                    if (result) {
                        Notifications.show(`Работа завершена! +${result.credits}кр., +${result.xp} XP`, 'success');
                        
                        // Сповіщення про завершення роботи
                        this.emitJobCompletionEvent(result);
                    }
                }
            }
        }, 1000); // Кожну секунду

        this.loops.set(jobLoopId, 'job');
    }

    /**
     * Перевіряє, чи гравець в бою
     */
    isInCombat() {
        // Цей метод буде оновлено при інтеграції з CombatScreen
        return window.gameInstance?.combatScreen?.monster || false;
    }

    /**
     * Вмикає/вимикає регенерацію
     */
    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
    }

    /**
     * Вимикає конкретний тип регенерації
     */
    toggleRegeneration(type, enabled) {
        for (const [loopId, loopType] of this.loops) {
            if (loopType === type) {
                this.gameLoopManager.toggleLoop(loopId, enabled);
            }
        }
    }

    /**
     * Видаляє всі цикли регенерації
     */
    destroy() {
        for (const loopId of this.loops.keys()) {
            this.gameLoopManager.removeLoop(loopId);
        }
        this.loops.clear();
    }

    /**
     * Сповіщає про регенерацію через події
     */
    emitRegenerationEvent(type, amount) {
        document.dispatchEvent(new CustomEvent('game:regeneration', {
            detail: { type, amount }
        }));
    }

    /**
     * Сповіщає про завершення роботи через події
     */
    emitJobCompletionEvent(result) {
        document.dispatchEvent(new CustomEvent('game:job-completed', {
            detail: result
        }));
    }

    /**
     * Отримує статистику регенерації
     */
    getStats() {
        return {
            isPaused: this.isPaused,
            activeLoops: this.loops.size,
            loops: Array.from(this.loops.entries()).map(([id, type]) => ({ id, type }))
        };
    }
}
