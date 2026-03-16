import { ITEMS } from '../engine/Data/items.js';
import { Modals } from '../ui/Modals.js';
import { ItemGenerator, BASE_WEAPON1, BASE_ARMOR, BASE_HELMET, BASE_PANTS, BASE_BOOTS } from '../engine/Data/ItemGenerator.js';

export class MarketScreen {
    constructor(screenManager, player) {
        this.screenManager = screenManager;
        this.player = player;
        this.container = document.getElementById('market-screen');

        //Товары на рынке - только аптечки и ремкомплект
        this.marketInventory = [
            'bacta_small',
            'bacta_medium',
            'ship_repair_kit',
        ];
    }

    openMarket(locationId) {
        this.currentLocationId = locationId;
        this._generateStarterItems();
        this.screenManager.showScreen('market-screen');
        this.render();
    }

    /** Генерируем стартовые Lvl1 Common вещи один раз при открытии*/
    _generateStarterItems() {
        const mk = (id_base, rarity = 'common', lvl = 1) => ItemGenerator.createItem(id_base, rarity, lvl);
        this.starterWeapons = [
            ...BASE_WEAPON1.map(t => mk(t.id_base)),
        ];
        this.starterArmor   = BASE_ARMOR.map(t  => mk(t.id_base));
        this.starterHelmet  = BASE_HELMET.map(t => mk(t.id_base));
        this.starterPants   = BASE_PANTS.map(t  => mk(t.id_base));
        this.starterBoots   = BASE_BOOTS.map(t  => mk(t.id_base));

        this._genItemMap = {};
        [...this.starterWeapons, ...this.starterArmor, ...this.starterHelmet, ...this.starterPants, ...this.starterBoots]
            .forEach(item => { this._genItemMap[item.id] = item; });
    }

    _initMarketEvents() {
        if (this._marketEventsInitialized) return;
        this._marketEventsInitialized = true;
        console.log('MarketScreen events initialized'); // Force update
        
        document.addEventListener('network:market_result', (e) => {
            const { ok, operation, error, profile, itemId, amount } = e.detail;
            if (ok) {
                // Update local player state from server profile
                if (profile) {
                    this.player.money = profile.money;
                    if (profile.inventoryData) {
                        this.player.inventoryMgr.load(profile.inventoryData.inventory, profile.inventoryData.equipment);
                    }
                    this.player._emit('money-changed');
                    this.player._emit('inventory-changed'); // Trigger UI update
                }

                const item = ITEMS[itemId];
                const itemName = item ? item.name : 'Предмет';
                
                if (operation === 'buy') {
                    Modals.alert('Успех', `<span style="color:#27ae60; font-weight:bold; font-size:16px;">Куплено: ${itemName} (x${amount})</span>`);
                } else {
                    // Re-render tab to remove sold item
                    const activeTab = this.container.querySelector('.m-tab.active');
                    if (activeTab) this.renderTabContent(activeTab.getAttribute('data-tab'));
                    Modals.alert('Успех', `<span style="color:#2980b9; font-weight:bold; font-size:16px;">Продано: ${itemName} x${amount}</span>`);
                }
            } else {
                Modals.alert('Ошибка', error || 'Операция не удалась');
            }
        });
    }

    render() {
        this._initMarketEvents();
        const html = `<div class="market-tabs">
                <button class="m-tab active" data-tab="consumable">💉 Аптечки</button>
                <button class="m-tab" data-tab="weapon">🔫 Оружие</button>
                <button class="m-tab" data-tab="armor">🛡️ Броня</button>
                <button class="m-tab" data-tab="helmet">🪖 Шлем</button>
                <button class="m-tab" data-tab="pants">👖 Брюки</button>
                <button class="m-tab" data-tab="boots">👢 Ботинки</button>
                <button class="m-tab" data-tab="other">📦 Продажа</button>
            </div>
            <div id="market-content" class="market-cards-area"></div>
            <div class="market-footer">
                <button id="btn-market-close" class="market-close-btn">✕ ЗАКРЫТЬ</button>
            </div>`;
        this.container.innerHTML = html;
        this.renderTabContent('consumable');
        this.attachEventListeners();
    }

    renderTabContent(tabId) {
        const content = this.container.querySelector('#market-content');
        let isSellMode = false;
        let staticItems = [];
        let generatedItems = [];

        if (tabId === 'consumable') {
            staticItems = this.marketInventory.filter(id => ITEMS[id] && ITEMS[id].type === 'consumable');
        } else if (tabId === 'weapon') {
            generatedItems = this.starterWeapons || [];
        } else if (tabId === 'armor') {
            generatedItems = this.starterArmor || [];
        } else if (tabId === 'helmet') {
            generatedItems = this.starterHelmet || [];
        } else if (tabId === 'pants') {
            generatedItems = this.starterPants || [];
        } else if (tabId === 'boots') {
            generatedItems = this.starterBoots || [];
        } else if (tabId === 'other') {
            isSellMode = true;
        }

        let html = '<div class="market-cards-grid">';

        // --- Static ITEMS (consumables, materials) ---
        staticItems.forEach(itemId => {
            const item = ITEMS[itemId];
            if (!item) return;
            html += this._renderItemCard(item, false);
        });

        // --- Generated starter items (weapons/gear) ---
        generatedItems.forEach(item => {
            if (!item) return;
            html += this._renderItemCard(item, true);
        });

        html += '</div>';

        if (isSellMode && this.player.inventory.length > 0) {
            // Separate sell section
            const sellableItems = this.player.inventory.filter(invItem => {
                const d = ITEMS[invItem.id] || invItem;
                return d;
            });

            if (sellableItems.length > 0) {
                html += `<div class="market-sell-divider">
                        <span>📤 ВАШ ИНВЕНТАРЬ (ПРОДАЖА)</span>
                    </div>
                    <div class="market-cards-grid">`;

                this.player.inventory.forEach(invItem => {
                    // Support both static ITEMS and generated items stored in inventory
                    const item = ITEMS[invItem.id] || invItem.itemData;
                    if (!item) return;
                    const sellPrice = Math.max(1, Math.floor((item.value || 10) / 2));
                    const iconName = this.getIconForItemType(item.type);
                    const rarity = item.rarity || 'common';

                    html += `
                        <div class="market-card market-card-sell rarity-border-${rarity}">
                            <div class="market-card-icon" style="color:#e74c3c;">
                                <ion-icon name="${iconName}"></ion-icon>
                            </div>
                            <div class="market-card-body">
                                <div class="market-card-name item-rarity-${rarity}">${(item?.name || '')} <span style="color:#aaa;font-size:11px;">x${invItem.amount}</span></div>
                                <div class="market-card-desc">${(item?.description || '') || ''}</div>
                            </div>
                            <div class="market-card-footer">
                                <span class="market-price" style="color:#e74c3c;">+${sellPrice.toLocaleString()}кр.</span>
                                <button class="btn-sell" data-item="${invItem.id}" data-price="${sellPrice}">ПРОДАТЬ</button>
                            </div>
                        </div>`;
                });

                html += '</div>';
            }
        }

        content.innerHTML = html;
        this.attachBuyListeners();
        this.attachGenBuyListeners();
        this.attachSellListeners();
    }

    _renderItemCard(item, isGenerated) {
        const iconName = this.getIconForItemType(item.type);
        const rarity = item.rarity || 'common';
        const statsHtml = this.formatStats(item.stats);
        const canAfford = this.player.money >= item.value;
        const dataAttr = isGenerated ? `data-gen-id="${item.id}"` : `data-item="${item.id}" data-cost="${item.value}"`;

        return `
            <div class="market-card rarity-border-${rarity}">
                <div class="market-card-icon">
                    <ion-icon name="${iconName}"></ion-icon>
                </div>
                <div class="market-card-body">
                    <div class="market-card-name item-rarity-${rarity}">${(item?.name || '')}</div>
                    <div class="market-card-desc">${(item?.description || '') || ''}</div>
                    ${statsHtml ? `<div class="market-card-stats">${statsHtml}</div>` : ''}
                </div>
                <div class="market-card-footer">
                    <span class="market-price ${canAfford ? '' : 'price-unaffordable'}">${item.value.toLocaleString()}кр.</span>
                    <button class="${isGenerated ? 'btn-gen-buy' : 'btn-buy'} ${canAfford ? '' : 'btn-buy-disabled'}" ${dataAttr} data-cost="${item.value}" ${canAfford ? '' : 'disabled'}>
                        ${canAfford ? 'КУПИТЬ' : 'МАЛО КРЕДИТОВ'}
                    </button>
                </div>
            </div>
        `;
    }

    getIconForItemType(type) {
        switch (type) {
            case 'weapon1': return 'flash-outline';
            case 'armor':
            case 'pants':
            case 'boots': return 'shirt-outline';
            case 'helmet': return 'eye-outline';
            case 'consumable': return 'medkit-outline';
            case 'ship': return 'rocket-outline';
            default: return 'cube-outline';
        }
    }

    formatStats(stats) {
        if (!stats) return '';
        const parts = [];
        if (stats.attack) parts.push(`Атк:${stats.attack > 0 ? '+' : ''}${stats.attack}`);
        if (stats.defense) parts.push(`Зах:${stats.defense > 0 ? '+' : ''}${stats.defense}`);
        if (stats.maxHp) parts.push(`HP: ${stats.maxHp > 0 ? '+' : ''}${stats.maxHp}`);
        if (stats.critChance) parts.push(`Крит: +${stats.critChance}%`);
        if (stats.critDamage) parts.push(`Крит.x: +${stats.critDamage}`);
        return parts.map(p => `<span class="stat-badge">${p}</span>`).join('');
    }

    attachEventListeners() {
        const btnClose = this.container.querySelector('#btn-market-close');
        if (btnClose) {
            btnClose.addEventListener('click', () => {
                this.screenManager.showScreen('maps-screen');
                if (window.gameInstance) window.gameInstance.mapScreen.render();
            });
        }

        const tabs = this.container.querySelectorAll('.m-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                tabs.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');

                const targetTab = e.target.getAttribute('data-tab');
                this.renderTabContent(targetTab);
            });
        });

        // --- Drag to Scroll & Mousewheel support for tabs ---
        const tabsContainer = this.container.querySelector('.market-tabs');
        if (tabsContainer) {
            let isDown = false;
            let startX;
            let scrollLeft;

            tabsContainer.addEventListener('mousedown', (e) => {
                isDown = true;
                tabsContainer.style.cursor = 'grabbing';
                startX = e.pageX - tabsContainer.offsetLeft;
                scrollLeft = tabsContainer.scrollLeft;
            });
            tabsContainer.addEventListener('mouseleave', () => {
                isDown = false;
                tabsContainer.style.cursor = 'default';
            });
            tabsContainer.addEventListener('mouseup', () => {
                isDown = false;
                tabsContainer.style.cursor = 'default';
            });
            tabsContainer.addEventListener('mousemove', (e) => {
                if (!isDown) return;
                e.preventDefault();
                const x = e.pageX - tabsContainer.offsetLeft;
                const walk = (x - startX) * 2; // scroll-fast multiplier
                tabsContainer.scrollLeft = scrollLeft - walk;
            });
            
            // Mouse wheel horizontal scrolling
            tabsContainer.addEventListener('wheel', (e) => {
                if (e.deltaY !== 0) {
                    e.preventDefault();
                    tabsContainer.scrollLeft += e.deltaY;
                }
            }, { passive: false });
        }
    }

    /** Покупка сгенерированных предметов (Оружие/Экип)*/
    attachGenBuyListeners() {
        const btns = this.container.querySelectorAll('.btn-gen-buy:not(:disabled)');
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                const genId = btn.getAttribute('data-gen-id');
                const cost  = parseInt(btn.getAttribute('data-cost'), 10);
                const item  = this._genItemMap && this._genItemMap[genId];
                if (!item) return;

                if (this.player.money < cost) {
                    Modals.alert('Ошибка', 'Не хватает кредитов!');
                    return;
                }

                Modals.confirm(
                    'Подтверждение покупки',
                    `Купить <b>${(item?.name || '')}</b> по <span style="color:#f1c40f">${cost.toLocaleString()}кр.</span>?`,
                    'Купить',
                    'Отмена',
                    () => {
                        if (this.player.money < cost) {
                            Modals.alert('Ошибка', 'Не хватает кредитов!');
                            return;
                        }
                        if (this.player.networkMgr) {
                            this.player.networkMgr.send('market_buy', { itemId: item.id, amount: 1 });
                        }
                    }
                );
            });
        });
    }

    attachBuyListeners() {
        const buyBtns = this.container.querySelectorAll('.btn-buy');
        buyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target.closest('.btn-buy');
                if (!target) return;

                const itemId = target.getAttribute('data-item');
                const cost = parseInt(target.getAttribute('data-cost'), 10);
                const item = ITEMS[itemId];

                if (!item) return;

                if (item.type === 'consumable') {
                    if (item.isRepairKit) {
                         //Добавляем ремкомплект в инвентарь вместо мгновенного использования.
                         Modals.promptNumber(
                            'Купить ремкомплект',
                            `Сколько <b>${(item?.name || '')}</b> вы хотите купить?<br><span style="color:#aaa;font-size:12px;">Цена:${cost}кр. / шт.</span>`,
                            1,
                            'Купить',
                            'Отмена',
                            (amount) => {
                                if (amount <= 0) {
                                    Modals.alert('Ошибка', `Количество должно быть больше нуля!`);
                                    return;
                                }
                                const totalCost = cost * amount;
                                if (this.player.money >= totalCost) {
                                    if (this.player.networkMgr) {
                                        this.player.networkMgr.send('market_buy', { itemId, amount });
                                    }
                                } else {
                                    Modals.alert('Ошибка', `Не хватает кредитов!`);
                                }
                            }
                        );
                        return;
                    }

                    Modals.promptNumber(
                        'Количество',
                        `Сколько <b>${(item?.name || '')}</b> вы хотите купить?<br><span style="color:#aaa;font-size:12px;">Цена:${cost}кр. / шт.</span>`,
                        1,
                        'Купить',
                        'Отмена',
                        (amount) => {
                            if (amount <= 0) {
                                Modals.alert('Ошибка', `Количество должно быть больше нуля!`);
                                return;
                            }
                            const totalCost = cost * amount;
                            if (this.player.money >= totalCost) {
                                if (this.player.networkMgr) {
                                    this.player.networkMgr.send('market_buy', { itemId, amount });
                                }
                            } else {
                                Modals.alert('Ошибка', `Не хватает кредитов! Надо: <span style="color:#e74c3c">${totalCost}кр.</span>`);
                            }
                        }
                    );
                } else if (item.type === 'ship') {
                    Modals.confirm(
                        'Покупка корабля',
                        `Вы уверены, что хотите купить <b>${(item?.name || '')}</b> по <span style="color:#f1c40f">${cost}кр.</span>?`,
                        'Купить 🚀',
                        'Отмена',
                        () => {
                            if (this.player.money >= cost) {
                                if (this.player.networkMgr) {
                                    this.player.networkMgr.send('market_buy', { itemId, amount: 1 });
                                }
                            } else {
                                Modals.alert('Ошибка', `Не хватает кредитов!`);
                            }
                        }
                    );
                } else {
                    if (this.player.money >= cost) {
                        Modals.confirm(
                            'Подтверждение покупки',
                            `Вы уверены, что хотите купить <b>${(item?.name || '')}</b> по <span style="color:#f1c40f">${cost}кр.</span>?`,
                            'Купить',
                            'Отмена',
                            () => {
                                if (this.player.networkMgr) {
                                    this.player.networkMgr.send('market_buy', { itemId, amount: 1 });
                                }
                            }
                        );
                    } else {
                        Modals.alert('Ошибка', `Не хватает кредитов! Надо: <span style="color:#e74c3c">${cost}кр.</span>`);
                    }
                }
            });
        });
    }

    attachSellListeners() {
        //Сохраняем список ID одетых предметов, чтобы не разрешать их продавать
        const equippedIds = new Set(Object.values(this.player.equipment).filter(Boolean));

        const sellBtns = this.container.querySelectorAll('.btn-sell');
        sellBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target.closest('.btn-sell');
                if (!target) return;

                const itemId = target.getAttribute('data-item');
                const price = parseInt(target.getAttribute('data-price'), 10);
                const item = ITEMS[itemId];

                if (equippedIds.has(itemId)) {
                    Modals.alert('Ошибка', `Сначала снимите <b>${(item?.name || '')}</b> с экипировкой!`);
                    return;
                }

                if (item.type === 'consumable' || item.type === 'material') {
                    //Находим, сколько всего таких предметов у игрока
                    const invItem = this.player.inventory.find(i => i.id === itemId);
                    const maxAmount = invItem ? invItem.amount : 1;

                    Modals.promptNumber(
                        'Количество',
                        `Сколько <b>${(item?.name || '')}</b> вы хотите продать?<br><span style="color:#aaa;font-size:12px;">Доступно:${maxAmount}шт. / Выручка:${price}кр. за шт.</span>`,
                        maxAmount,
                        'Продать',
                        'Отмена',
                        (amount) => {
                            if (amount <= 0) {
                                Modals.alert('Ошибка', `Количество должно быть больше нуля!`);
                                return;
                            }
                            if (amount > maxAmount) {
                                Modals.alert('Ошибка', `У вас нет столько предметов!`);
                                return;
                            }
                            // const totalReturn = price * amount; // Server calculates price
                            if (this.player.networkMgr) {
                                this.player.networkMgr.send('market_sell', { itemId, amount });
                            }
                        }
                    );
                } else {
                    Modals.confirm(
                        'Подтверждение продаж',
                        `Продать <b>${(item?.name || '')}</b> по <span style="color:#f1c40f">${price}кр.</span>?`,
                        'Продать',
                        'Отмена',
                        () => {
                            if (this.player.networkMgr) {
                                this.player.networkMgr.send('market_sell', { itemId, amount: 1 });
                            }
                        }
                    );
                }
            });
        });
    }
}
