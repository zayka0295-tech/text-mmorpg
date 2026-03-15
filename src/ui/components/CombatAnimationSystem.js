export class CombatAnimationSystem {
    constructor(container) {
        this.container = container;
        this.activeAnimations = new Map();
    }

    /**
     * Показує анімацію завдання шкоди
     */
    showDamage(target, damage, isCrit = false, type = 'normal') {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) return;

        const damageElement = document.createElement('div');
        damageElement.className = `damage-animation ${type} ${isCrit ? 'crit' : 'normal'}`;
        damageElement.textContent = `-${damage}`;

        // Додаємо стилі для анімації
        this.applyDamageStyles(damageElement, isCrit);

        targetElement.appendChild(damageElement);

        // Анімація появи та зникнення
        this.animateDamage(damageElement, () => {
            damageElement.remove();
        });
    }

    /**
     * Показує анімацію лікування
     */
    showHeal(target, amount) {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) return;

        const healElement = document.createElement('div');
        healElement.className = 'heal-animation';
        healElement.textContent = `+${amount}`;

        this.applyHealStyles(healElement);
        targetElement.appendChild(healElement);

        this.animateHeal(healElement, () => {
            healElement.remove();
        });
    }

    /**
     * Показує анімацію використання Сили
     */
    showForceAnimation(skillName, caster, target) {
        const casterElement = this.getTargetElement(caster);
        const targetElement = this.getTargetElement(target);

        if (!casterElement || !targetElement) return;

        // Створюємо ефект Сили
        const forceEffect = document.createElement('div');
        forceEffect.className = `force-effect ${skillName}`;
        forceEffect.textContent = this.getForceSkillName(skillName);

        // Розраховуємо траєкторію від caster до target
        const casterRect = casterElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();

        forceEffect.style.position = 'fixed';
        forceEffect.style.left = `${casterRect.left + casterRect.width / 2}px`;
        forceEffect.style.top = `${casterRect.top + casterRect.height / 2}px`;

        document.body.appendChild(forceEffect);

        // Анімуємо політ ефекту
        this.animateForceEffect(forceEffect, casterRect, targetRect, () => {
            forceEffect.remove();
            // Показуємо ефект на цілі
            this.showForceImpact(target, skillName);
        });
    }

    /**
     * Показує ефект удару
     */
    showImpact(target, impactType = 'normal') {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) return;

        const impactElement = document.createElement('div');
        impactElement.className = `impact-effect ${impactType}`;

        this.applyImpactStyles(impactElement, impactType);
        targetElement.appendChild(impactElement);

        // Струшування елемента
        this.shakeElement(targetElement, () => {
            impactElement.remove();
        });
    }

    /**
     * Показує анімацію перемоги/поразки
     */
    showCombatResult(result, rewards) {
        const resultElement = document.createElement('div');
        resultElement.className = `combat-result ${result ? 'victory' : 'defeat'}`;

        const resultHtml = `
            <div class="result-content">
                <h2 class="result-title">${result ? '🎉 ПОБЕДА!' : '💀 ПОРАЖЕНИЕ'}</h2>
                ${result && rewards ? this.generateRewardsHtml(rewards) : ''}
                <button class="result-close-btn">Закрыть</button>
            </div>
        `;

        resultElement.innerHTML = resultHtml;
        this.container.appendChild(resultElement);

        // Анімація появи
        setTimeout(() => {
            resultElement.classList.add('show');
        }, 100);

        // Обробка закриття
        const closeBtn = resultElement.querySelector('.result-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideCombatResult(resultElement);
            });
        }
    }

    /**
     * Показує індикатор ходу
     */
    showTurnIndicator(isPlayerTurn) {
        const indicator = document.createElement('div');
        indicator.className = `turn-indicator ${isPlayerTurn ? 'player' : 'monster'}`;
        indicator.innerHTML = `
            <div class="indicator-content">
                <div class="indicator-icon">${isPlayerTurn ? '⚔️' : '👹'}</div>
                <div class="indicator-text">${isPlayerTurn ? 'ВАШ ХОД' : 'ХОД ПРОТИВНИКА'}</div>
            </div>
        `;

        this.container.appendChild(indicator);

        // Анімація появи та зникнення
        setTimeout(() => {
            indicator.classList.add('show');
        }, 100);

        setTimeout(() => {
            indicator.classList.remove('show');
            setTimeout(() => {
                indicator.remove();
            }, 300);
        }, 2000);
    }

    /**
     * Струшує елемент (для ударів)
     */
    shakeElement(element, callback) {
        element.style.animation = 'shake 0.5s';
        
        setTimeout(() => {
            element.style.animation = '';
            if (callback) callback();
        }, 500);
    }

    /**
     * Отримує елемент цілі
     */
    getTargetElement(target) {
        if (typeof target === 'string') {
            return this.container.querySelector(target);
        }
        return this.container.querySelector(`[data-target="${target}"]`) || 
               this.container.querySelector(`.${target}`);
    }

    /**
     * Застосовує стилі для анімації шкоди
     */
    applyDamageStyles(element, isCrit) {
        element.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-weight: bold;
            font-size: ${isCrit ? '24px' : '18px'};
            color: ${isCrit ? '#ff6b6b' : '#ff4444'};
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            z-index: 1000;
            pointer-events: none;
            animation: damageFloat 1s ease-out forwards;
        `;
    }

    /**
     * Застосовує стилі для анімації лікування
     */
    applyHealStyles(element) {
        element.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-weight: bold;
            font-size: 20px;
            color: #4CAF50;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            z-index: 1000;
            pointer-events: none;
            animation: healFloat 1s ease-out forwards;
        `;
    }

    /**
     * Застосовує стилі для ефекту удару
     */
    applyImpactStyles(element, impactType) {
        const colors = {
            normal: 'rgba(255, 255, 255, 0.8)',
            critical: 'rgba(255, 107, 107, 0.8)',
            force: 'rgba(147, 51, 234, 0.8)',
            poison: 'rgba(76, 175, 80, 0.8)'
        };

        element.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, ${colors[impactType] || colors.normal} 0%, transparent 70%);
            pointer-events: none;
            animation: impactFlash 0.3s ease-out forwards;
        `;
    }

    /**
     * Анімує шкоду
     */
    animateDamage(element, callback) {
        element.style.animation = 'damageFloat 1s ease-out forwards';
        setTimeout(callback, 1000);
    }

    /**
     * Анімує лікування
     */
    animateHeal(element, callback) {
        element.style.animation = 'healFloat 1s ease-out forwards';
        setTimeout(callback, 1000);
    }

    /**
     * Анімує ефект Сили
     */
    animateForceEffect(element, fromRect, toRect, callback) {
        const duration = 500;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const currentX = fromRect.left + (toRect.left - fromRect.left) * progress;
            const currentY = fromRect.top + (toRect.top - fromRect.top) * progress;

            element.style.left = `${currentX}px`;
            element.style.top = `${currentY}px`;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                callback();
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * Показує ефект удару Сили на цілі
     */
    showForceImpact(target, skillName) {
        const impactTypes = {
            'force_pull': 'pull',
            'force_push': 'push',
            'sith_lightning': 'lightning',
            'force_choke': 'choke',
            'mind_control': 'control'
        };

        const impactType = impactTypes[skillName] || 'normal';
        this.showImpact(target, impactType);
    }

    /**
     * Генерує HTML для нагород
     */
    generateRewardsHtml(rewards) {
        return `
            <div class="rewards-container">
                <div class="reward-item xp">+${rewards.xp} XP</div>
                <div class="reward-item money">+${rewards.money} кр.</div>
                ${rewards.items && rewards.items.length > 0 ? `
                    <div class="reward-items">
                        ${rewards.items.map(item => `
                            <div class="reward-item item">${typeof item === 'object' ? item.name : item}</div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Ховає результат бою
     */
    hideCombatResult(element) {
        element.classList.remove('show');
        setTimeout(() => {
            element.remove();
        }, 300);
    }

    /**
     * Отримує назву навику Сили
     */
    getForceSkillName(skillId) {
        const names = {
            'mind_control': 'Контроль розуму',
            'force_pull': 'Силове притягання',
            'force_heal': 'Лікування Силою',
            'force_speed': 'Швидкість Сили',
            'sith_lightning': 'Молнія Ситха',
            'sith_rage': 'Ярость Ситха',
            'lightsaber_throw': 'Бросок світлового меча',
            'force_choke': 'Удушення Силою'
        };
        return names[skillId] || skillId;
    }

    /**
     * Очищує всі активні анімації
     */
    clearAllAnimations() {
        for (const [id, animation] of this.activeAnimations) {
            if (animation.element && animation.element.parentNode) {
                animation.element.remove();
            }
        }
        this.activeAnimations.clear();
    }
}
