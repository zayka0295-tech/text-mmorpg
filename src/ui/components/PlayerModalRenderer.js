export class PlayerModalRenderer {
    constructor(modalSystem, statsSystem) {
        this.modalSystem = modalSystem;
        this.statsSystem = statsSystem;
    }

    /**
     * Рендерить модальне вікно гравця
     */
    renderPlayerModal(player) {
        const stats = this.statsSystem.getModalStats();
        const content = this.generatePlayerModalHTML(player, stats);
        
        this.modalSystem.show('player-modal', content, {
            closeOnEscape: true,
            closeOnOverlay: true,
            showCloseButton: true
        });
    }

    /**
     * Генерує HTML для модального вікна гравця
     */
    generatePlayerModalHTML(player, stats) {
        return `
            <div class="player-modal-content">
                <div class="player-header">
                    <div class="player-avatar">${player.avatar}</div>
                    <div class="player-basic-info">
                        <h2 class="player-name">${player.name}</h2>
                        <div class="player-title">${player.title || 'Без титулу'}</div>
                        <div class="player-class">${player.className}</div>
                    </div>
                </div>

                <div class="player-stats-grid">
                    ${this.renderBasicStats(stats)}
                    ${this.renderCombatStats(stats)}
                    ${this.renderProgressStats(stats)}
                    ${this.renderForceStats(stats)}
                    ${this.renderFinancialStats(stats)}
                    ${this.renderActivityStats(stats)}
                </div>

                <div class="player-actions">
                    ${this.renderActionButtons(player)}
                </div>
            </div>
        `;
    }

    /**
     * Рендерить базові стати
     */
    renderBasicStats(stats) {
        return `
            <div class="stats-section basic-stats">
                <h3>Базові характеристики</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Конституція</span>
                        <span class="stat-value">${stats.baseStats.constitution}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Сила</span>
                        <span class="stat-value">${stats.baseStats.strength}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Спритність</span>
                        <span class="stat-value">${stats.baseStats.agility}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Інтелект</span>
                        <span class="stat-value">${stats.baseStats.intellect}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Рендерить бойові стати
     */
    renderCombatStats(stats) {
        return `
            <div class="stats-section combat-stats">
                <h3>Бойові характеристики</h3>
                <div class="stats-grid">
                    <div class="stat-item hp-stat">
                        <span class="stat-label">HP</span>
                        <div class="hp-bar">
                            <div class="hp-fill" style="width: ${(stats.combat.hp.current / stats.combat.hp.max) * 100}%"></div>
                        </div>
                        <span class="stat-value">${stats.combat.hp.current}/${stats.combat.hp.max}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Атака</span>
                        <span class="stat-value">${stats.combat.attack}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Захист</span>
                        <span class="stat-value">${stats.combat.defense}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Кріт. шанс</span>
                        <span class="stat-value">${stats.combat.critChance}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Кріт. шкода</span>
                        <span class="stat-value">x${stats.combat.critDamage}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Рендерить прогрес
     */
    renderProgressStats(stats) {
        return `
            <div class="stats-section progress-stats">
                <h3>Прогрес</h3>
                <div class="stats-grid">
                    <div class="stat-item level-stat">
                        <span class="stat-label">Рівень</span>
                        <span class="stat-value level-value">${stats.basic.level}</span>
                    </div>
                    <div class="stat-item xp-stat">
                        <span class="stat-label">Досвід</span>
                        <div class="xp-bar">
                            <div class="xp-fill" style="width: ${stats.progress.xpPercentage}%"></div>
                        </div>
                        <span class="stat-value">${stats.progress.xp.current}/${stats.progress.xp.next}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Репутація</span>
                        <span class="stat-value">${stats.reputation.points}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Вирівнювання</span>
                        <span class="stat-value alignment-${stats.reputation.alignmentName.toLowerCase()}">${stats.reputation.alignmentName}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Рендерить стати Сили
     */
    renderForceStats(stats) {
        if (!stats.force.canUseForce) return '';

        return `
            <div class="stats-section force-stats">
                <h3>Сила</h3>
                <div class="stats-grid">
                    <div class="stat-item fp-stat">
                        <span class="stat-label">FP</span>
                        <div class="fp-bar">
                            <div class="fp-fill" style="width: ${(stats.force.forcePoints.current / stats.force.forcePoints.max) * 100}%"></div>
                        </div>
                        <span class="stat-value">${stats.force.forcePoints.current}/${stats.force.forcePoints.max}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Активний навик</span>
                        <span class="stat-value">${stats.force.activeForceSkill || 'Немає'}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Вивчено навиків</span>
                        <span class="stat-value">${stats.force.unlockedSkills}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Рендерить фінансові стати
     */
    renderFinancialStats(stats) {
        return `
            <div class="stats-section financial-stats">
                <h3>Фінанси</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Гроші</span>
                        <span class="stat-value money">${stats.finances.money.toLocaleString()} кр.</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Банк</span>
                        <span class="stat-value bank">${stats.finances.bankBalance.toLocaleString()} кр.</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Датарії</span>
                        <span class="stat-value datarii">${stats.finances.datarii.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Рендерить стати активності
     */
    renderActivityStats(stats) {
        return `
            <div class="stats-section activity-stats">
                <h3>Активність</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Локація</span>
                        <span class="stat-value">${stats.activities.location}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Робота</span>
                        <span class="stat-value">${stats.activities.activeJob || 'Немає'}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Статус</span>
                        <span class="stat-value">${this.getPlayerStatus(stats)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Рендерить кнопки дій
     */
    renderActionButtons(player) {
        return `
            <div class="action-buttons">
                <button class="btn btn-primary" data-action="attack">Атакувати</button>
                <button class="btn btn-secondary" data-action="trade">Торгувати</button>
                <button class="btn btn-info" data-action="message">Повідомлення</button>
                <button class="btn btn-warning" data-action="report">Скарга</button>
            </div>
        `;
    }

    /**
     * Отримує статус гравця
     */
    getPlayerStatus(stats) {
        if (stats.activities.activeJob) return 'На роботі';
        if (stats.activities.location.includes('космопорт')) return 'У подорожі';
        if (stats.activities.location.includes('академія')) return 'Навчання';
        return 'Активний';
    }

    /**
     * Рендерить картку гравця для списку
     */
    renderPlayerCard(player) {
        const stats = this.statsSystem.getModalStats();
        
        return `
            <div class="player-card" data-player-name="${player.name}">
                <div class="player-card-avatar">${player.avatar}</div>
                <div class="player-card-info">
                    <div class="player-card-name">${player.name}</div>
                    <div class="player-card-level">Рівень ${stats.basic.level}</div>
                    <div class="player-card-title">${player.title || 'Без титулу'}</div>
                    <div class="player-card-location">${stats.activities.location}</div>
                </div>
                <div class="player-card-actions">
                    <button class="btn btn-small btn-primary" data-action="view">Переглянути</button>
                    <button class="btn btn-small btn-danger" data-action="attack">Атакувати</button>
                </div>
            </div>
        `;
    }

    /**
     * Рендерить список гравців
     */
    renderPlayerList(players) {
        return `
            <div class="player-list">
                <h3>Гравці в зоні</h3>
                <div class="players-grid">
                    ${players.map(player => this.renderPlayerCard(player)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Оновлює існуюче модальне вікно
     */
    updateModal(player) {
        const stats = this.statsSystem.getModalStats();
        const content = this.generatePlayerModalHTML(player, stats);
        
        this.modalSystem.updateContent('player-modal', content);
    }

    /**
     * Закриває модальне вікно
     */
    closeModal() {
        this.modalSystem.close('player-modal');
    }
}
