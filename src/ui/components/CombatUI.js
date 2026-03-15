export class CombatUI {
    constructor(container) {
        this.container = container;
    }

    logMessage(msg) {
        const logEl = this.container.querySelector('#combat-action-log');
        if (logEl) {
            logEl.innerHTML = msg;
        }
    }

    updateHpBars(playerHp, playerMaxHp, monsterHp, monsterMaxHp) {
        const pHp = Math.max(0, playerHp);
        const mHp = Math.max(0, monsterHp);
        const pPct = Math.min(100, (pHp / playerMaxHp) * 100);
        const mPct = Math.min(100, (mHp / monsterMaxHp) * 100);

        const enemyHpBar = this.container.querySelector('.enemy-hp');
        const playerHpBar = this.container.querySelector('.player-hp');
        const enemyHpLabel = this.container.querySelector('.combat-top-panel .combat-hp-label');
        const playerHpLabel = this.container.querySelector('.combat-bottom-panel .combat-hp-label');

        if (enemyHpBar) enemyHpBar.style.width = `${mPct}%`;
        if (playerHpBar) playerHpBar.style.width = `${pPct}%`;
        if (enemyHpLabel) enemyHpLabel.innerHTML = `ЗДОРОВЬЕ <span class="pull-right">${mHp} / ${monsterMaxHp}</span>`;
        if (playerHpLabel) playerHpLabel.innerHTML = `ЗДОРОВЬЕ (ВЫ) <span class="pull-right">${pHp} / ${playerMaxHp}</span>`;
    }

    showFloatingDamage(amount, isCrit = false) {
        const centerArea = this.container.querySelector('.combat-center-area');
        if (!centerArea) return;

        const el = document.createElement('div');
        el.className = `floating-damage ${isCrit ? 'crit' : ''}`;
        el.innerText = `-${amount} HP`;

        const left = 30 + Math.random() * 40;
        const top = 30 + Math.random() * 40;

        el.style.left = `${left}%`;
        el.style.top = `${top}%`;

        centerArea.appendChild(el);

        setTimeout(() => {
            if (el && el.parentNode) {
                el.parentNode.removeChild(el);
            }
        }, 1100);
    }

    renderFullCombat(player, monster, weaponData, forceData, skillData, medkitData) {
        const pMaxHp = player.maxHp;
        const pHp = player.hp;
        const pPct = Math.max(0, Math.min(100, (pHp / pMaxHp) * 100));

        const mMaxHp = monster.maxHp;
        const mHp = monster.hp;
        const mPct = Math.max(0, Math.min(100, (mHp / mMaxHp) * 100));

        let html = `<div class="combat-layout">
                <!-- ВЕРХ: Враг -->
                <div class="combat-top-panel">
                    <div class="combat-enemy-name">${(monster?.name || '')}</div>
                    <div class="combat-hp-label">ЗДОРОВЬЕ <span class="pull-right">${mHp} / ${mMaxHp}</span></div>
                    <div class="combat-hp-bar-bg">
                        <div class="combat-hp-bar-fill enemy-hp" style="width: ${mPct}%;"></div>
                    </div>
                </div>

                <!-- ЦЕНТР: Иконка/Аватар -->
                <div class="combat-center-area">
                    <img src="/public/assets/monsters/${monster.id}.png" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" 
                         class="combat-bg-image">
                    <div class="combat-fallback-emoji" style="display:none;">😈</div>
                    <div id="combat-action-log" class="combat-log-text">Ваш ход! Выберите действие.</div>
                </div>

                <!-- НИЗ: Игрок -->
                <div class="combat-bottom-panel">
                    <div class="combat-hp-label">ЗДОРОВЬЕ (ВЫ) <span class="pull-right">${pHp} / ${pMaxHp}</span></div>
                    <div class="combat-hp-bar-bg">
                        <div class="combat-hp-bar-fill player-hp" style="width: ${pPct}%;"></div>
                    </div>
                </div>

                <!-- КНОПКИ ДЕЙСТВЕННЫЙ -->
                <div class="combat-actions-grid">`;

        //Кнопки вытаскиваем из экипировки.
        if (weaponData) {
            html += `<button class="btn-combat-action btn-weapon item-rarity-${weaponData.rarity || 'common'}" data-atk="0">${(weaponData?.name || '')}</button>`;
        } else {
            html += `<button class="btn-combat-action btn-weapon" data-atk="0">👊 Кулак</button>`;
        }

        if (forceData) {
            html += `<button class="btn-combat-action btn-weapon item-rarity-${forceData.rarity || 'common'}" data-atk="0">${(forceData?.name || '')}</button>`;
        } else {
            if (player.canUseForce) {
                if (skillData) {
                    const canAfford = player.forcePoints >= skillData.cost;
                    html += `<button class="btn-combat-action btn-force ${canAfford ? 'item-rarity-legendary' : 'btn-disabled'}" 
                                data-skill="${skillData.id}" data-cost="${skillData.cost}" ${canAfford ? '' : 'disabled'}>
                                ⚡ ${(skillData?.name || '')} (${skillData.cost} FP)
                             </button>`;
                } else {
                    html += `<button class="btn-combat-action btn-disabled">Сила (не выбрана)</button>`;
                }
            } else {
                html += `<div></div>`;
            }
        }

        if (medkitData) {
            html += `<button class="btn-combat-action btn-heal item-rarity-${medkitData.rarity || 'common'}" style="grid-column: span 3;" data-id="${medkitData.id}" data-heal="${medkitData.heal}">${(medkitData?.name || '')} (${medkitData.amount}шт)</button>`;
        } else {
            html += `<button class="btn-combat-action btn-disabled" style="grid-column: span 3;">Аптечка (нет)</button>`;
        }

        html += `</div></div>`;
        this.container.innerHTML = html;
    }

    showVictoryModal(rewards, alignmentHtml, lootHtml, onContinue) {
        const modalHtml = `<div class="combat-result-overlay" id="combat-result-modal">
                <div class="combat-result-box victory">
                    <div class="combat-result-title">ПЕРЕМОГА!</div>
                    <div class="combat-result-rewards">
                        <div class="combat-result-item">⭐ Опыт: +${rewards.xp}</div>
                        <div class="combat-result-item">💰 Валюта: +${rewards.money}кр.</div>${alignmentHtml}
                        ${lootHtml}</div>
                    <button class="btn-continue" id="btn-combat-continue">ПРОДЛИТЬ</button>
                </div>
            </div>`;
        this.container.insertAdjacentHTML('beforeend', modalHtml);
        document.getElementById('btn-combat-continue').addEventListener('click', () => {
            const modal = document.getElementById('combat-result-modal');
            if (modal) modal.remove();
            if (onContinue) onContinue();
        });
    }

    showDefeatModal(onContinue) {
        const modalHtml = `<div class="combat-result-overlay" id="combat-result-modal">
                <div class="combat-result-box defeat">
                    <div class="combat-result-title">ВАС УБИЛИ</div>
                    <div class="combat-result-rewards">
                        <div class="combat-result-item">
                            <ion-icon name="skull-outline" style="margin-right: 8px; vertical-align: middle;"></ion-icon>
                            Вы проиграли бой...
                        </div>
                        <p style="margin-top: 10px; font-size: 13px; line-height: 1.4; color: #ccc;">
                            Вас ограбили, вы едва стоите на ногах. Нужна аптечка для восстановления!
                        </p>
                    </div>
                    <button class="btn-continue" id="btn-combat-continue">ВЕРНУТЬСЯ НА БАЗУ</button>
                </div>
            </div>`;
        this.container.insertAdjacentHTML('beforeend', modalHtml);
        document.getElementById('btn-combat-continue').addEventListener('click', () => {
            const modal = document.getElementById('combat-result-modal');
            if (modal) modal.remove();
            if (onContinue) onContinue();
        });
    }

    disableButtons() {
        this.container.querySelectorAll('.btn-combat-action').forEach(btn => btn.disabled = true);
    }
}
