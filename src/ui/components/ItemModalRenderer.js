export class ItemModalRenderer {
    constructor(modalSystem, statsSystem) {
        this.modalSystem = modalSystem;
        this.statsSystem = statsSystem;
    }

    /**
     * Рендерить модальне вікно предмета
     */
    renderItemModal(item, player) {
        const stats = this.statsSystem.getItemStats(item, player);
        const content = this.generateItemModalHTML(item, stats);
        
        this.modalSystem.show('item-modal', content, {
            closeOnEscape: true,
            closeOnOverlay: true,
            showCloseButton: true
        });
    }

    /**
     * Генерує HTML для модального вікна предмета
     */
    generateItemModalHTML(item, stats) {
        return `
            <div class="item-modal-content">
                <div class="item-header">
                    <div class="item-icon">${this.statsSystem.getItemTypeIcon(item.type)}</div>
                    <div class="item-basic-info">
                        <h2 class="item-name" style="color: ${stats.base.rarityColor}">
                            ${stats.base.name}
                        </h2>
                        <div class="item-meta">
                            <span class="item-rarity" style="color: ${stats.base.rarityColor}">
                                ${this.statsSystem.getRarityName(stats.base.rarity)}
                            </span>
                            <span class="item-level">Рівень ${stats.base.level}</span>
                            <span class="item-category">${stats.base.category}</span>
                        </div>
                    </div>
                </div>

                <div class="item-description">
                    <p>${this.statsSystem.getItemDescription(item)}</p>
                </div>

                <div class="item-stats-grid">
                    ${this.renderComparisonStats(stats.comparison)}
                    ${this.renderUsageStats(stats.usage)}
                    ${this.renderMarketStats(stats.market)}
                </div>

                <div class="item-actions">
                    ${this.renderActionButtons(item, stats)}
                </div>
            </div>
        `;
    }

    /**
     * Рендерить статистику порівняння
     */
    renderComparisonStats(comparison) {
        if (Object.keys(comparison.statDifferences).length === 0) {
            return '';
        }

        return `
            <div class="stats-section comparison-stats">
                <h3>Порівняння з поточним спорядженням</h3>
                <div class="comparison-status ${comparison.isBetter ? 'better' : comparison.isWorse ? 'worse' : 'same'}">
                    ${comparison.isEquipped ? 'Надягнуто' : 
                      comparison.isBetter ? 'Краще за поточне' : 
                      comparison.isWorse ? 'Гірше за поточне' : 
                      'Еквівалентно'}
                </div>
                <div class="stats-differences">
                    ${Object.entries(comparison.statDifferences).map(([stat, diff]) => `
                        <div class="stat-diff ${diff > 0 ? 'positive' : diff < 0 ? 'negative' : 'neutral'}">
                            <span class="stat-name">${this.getStatName(stat)}</span>
                            <span class="stat-value">
                                ${diff > 0 ? '+' : ''}${this.statsSystem.formatValue(diff, stat)}
                            </span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Рендерить статистику використання
     */
    renderUsageStats(usage) {
        return `
            <div class="stats-section usage-stats">
                <h3>Використання</h3>
                <div class="usage-requirements">
                    <div class="requirement-status ${usage.canUse ? 'can-use' : 'cannot-use'}">
                        ${usage.canUse ? '✅ Можна використати' : '❌ Не можна використати'}
                    </div>
                    ${usage.requirements.length > 0 ? `
                        <div class="requirements-list">
                            ${usage.requirements.map(req => `
                                <div class="requirement ${req.met ? 'met' : 'unmet'}">
                                    ${this.getRequirementText(req)}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                ${usage.effects.length > 0 ? `
                    <div class="item-effects">
                        <h4>Ефекти:</h4>
                        <div class="effects-list">
                            ${usage.effects.map(effect => `
                                <div class="effect-item">
                                    <span class="effect-description">${effect.description}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                ${usage.cooldown.hasCooldown ? `
                    <div class="item-cooldown">
                        <span class="cooldown-label">Кулдаун:</span>
                        <span class="cooldown-value">${usage.cooldown.cooldownTime}с</span>
                    </div>
                ` : ''}
                ${usage.uses.total > 1 ? `
                    <div class="item-uses">
                        <span class="uses-label">Кількість:</span>
                        <span class="uses-value">${usage.uses.total}/${usage.uses.maxStack}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Рендерить ринкову статистику
     */
    renderMarketStats(market) {
        return `
            <div class="stats-section market-stats">
                <h3>Ринок</h3>
                <div class="market-info">
                    <div class="market-price">
                        <span class="price-label">Базова ціна:</span>
                        <span class="price-value">${this.statsSystem.formatValue(market.basePrice, 'currency')}</span>
                    </div>
                    <div class="market-price">
                        <span class="price-label">Ціна продажу:</span>
                        <span class="price-value">${this.statsSystem.formatValue(market.sellPrice, 'currency')}</span>
                    </div>
                    <div class="market-price">
                        <span class="price-label">Ціна покупки:</span>
                        <span class="price-value">${this.statsSystem.formatValue(market.buyPrice, 'currency')}</span>
                    </div>
                    <div class="market-demand">
                        <span class="demand-label">Попит:</span>
                        <span class="demand-value ${market.marketDemand}">${this.getDemandText(market.marketDemand)}</span>
                    </div>
                    <div class="market-status">
                        <span class="status-label">Статус:</span>
                        <span class="status-value">
                            ${market.tradable ? '✅ Торгується' : '❌ Не торгується'}
                            ${market.sellable ? '✅ Продається' : '❌ Не продається'}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Рендерить кнопки дій
     */
    renderActionButtons(item, stats) {
        const buttons = [];

        if (stats.usage.canUse) {
            if (stats.base.consumable) {
                buttons.push('<button class="btn btn-primary" data-action="use">Використати</button>');
            } else {
                buttons.push('<button class="btn btn-primary" data-action="equip">Надіти</button>');
            }
        }

        if (stats.comparison.isEquipped) {
            buttons.push('<button class="btn btn-secondary" data-action="unequip">Зняти</button>');
        }

        if (stats.market.tradable) {
            buttons.push('<button class="btn btn-info" data-action="trade">Торгувати</button>');
        }

        if (stats.market.sellable) {
            buttons.push('<button class="btn btn-warning" data-action="sell">Продати</button>');
        }

        buttons.push('<button class="btn btn-danger" data-action="drop">Викинути</button>');

        return `
            <div class="action-buttons">
                ${buttons.join('')}
            </div>
        `;
    }

    /**
     * Отримує назву стати
     */
    getStatName(stat) {
        const names = {
            attack: 'Атака',
            defense: 'Захист',
            critChance: 'Кріт. шанс',
            critDamage: 'Кріт. шкода',
            hp: 'HP',
            forcePoints: 'FP'
        };
        return names[stat] || stat;
    }

    /**
     * Отримує текст вимоги
     */
    getRequirementText(requirement) {
        const texts = {
            level: `Рівень ${requirement.value}`,
            title: `Титул: ${requirement.value}`,
            class: `Клас: ${requirement.value}`,
            alignment: `Вирівнювання: ${requirement.value}`
        };
        return texts[requirement.type] || requirement.value;
    }

    /**
     * Отримує текст попиту
     */
    getDemandText(demand) {
        const texts = {
            high: 'Високий',
            medium: 'Середній',
            low: 'Низький'
        };
        return texts[demand] || 'Середній';
    }

    /**
     * Рендерить картку предмета для списку
     */
    renderItemCard(item, player) {
        const stats = this.statsSystem.getItemStats(item, player);
        
        return `
            <div class="item-card" data-item-id="${item.id}">
                <div class="item-card-icon">${this.statsSystem.getItemTypeIcon(item.type)}</div>
                <div class="item-card-info">
                    <div class="item-card-name" style="color: ${stats.base.rarityColor}">
                        ${stats.base.name}
                    </div>
                    <div class="item-card-rarity" style="color: ${stats.base.rarityColor}">
                        ${this.statsSystem.getRarityName(stats.base.rarity)}
                    </div>
                    <div class="item-card-level">Рівень ${stats.base.level}</div>
                    ${item.amount > 1 ? `<div class="item-card-amount">x${item.amount}</div>` : ''}
                </div>
                <div class="item-card-stats">
                    ${this.renderMiniStats(item)}
                </div>
                <div class="item-card-actions">
                    <button class="btn btn-small btn-primary" data-action="view">Переглянути</button>
                    ${stats.usage.canUse ? `
                        <button class="btn btn-small btn-success" data-action="use">
                            ${stats.base.consumable ? 'Використати' : 'Надіти'}
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Рендерить міні-статистику
     */
    renderMiniStats(item) {
        const stats = [];
        
        if (item.attack) stats.push(`⚔️ ${item.attack}`);
        if (item.defense) stats.push(`🛡️ ${item.defense}`);
        if (item.heal) stats.push(`💊 ${item.heal}`);
        if (item.forcePoints) stats.push(`✨ ${item.forcePoints}`);
        
        return stats.length > 0 ? `<div class="mini-stats">${stats.join(' ')}</div>` : '';
    }

    /**
     * Рендерить список предметів
     */
    renderItemList(items, player) {
        return `
            <div class="item-list">
                <h3>Предмети</h3>
                <div class="items-grid">
                    ${items.map(item => this.renderItemCard(item, player)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Оновлює існуюче модальне вікно
     */
    updateModal(item, player) {
        const stats = this.statsSystem.getItemStats(item, player);
        const content = this.generateItemModalHTML(item, stats);
        
        this.modalSystem.updateContent('item-modal', content);
    }

    /**
     * Закриває модальне вікно
     */
    closeModal() {
        this.modalSystem.close('item-modal');
    }
}
