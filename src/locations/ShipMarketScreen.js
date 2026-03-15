import { ITEMS } from '../engine/Data/items.js';
import { Modals } from '../ui/Modals.js';

export class ShipMarketScreen {
    constructor(screenManager, player) {
        this.screenManager = screenManager;
        this.player = player;
        this.container = document.getElementById('ship-market-screen');

        this.ships = [
            'ship_ebon_hawk',
            'ship_fury_interceptor',
            'ship_phantom',
            'ship_defender'
        ];
    }

    _getValidShip() {
        return this.player.ship && this.player.ship.id && ITEMS[this.player.ship.id]
            ? this.player.ship
            : null;
    }

    openShipMarket(locationId) {
        this.currentLocationId = locationId;
        this.screenManager.showScreen('ship-market-screen');
        this.render();
    }

    render() {
        const validShip = this._getValidShip();
        let html = `<div class="market-tabs">
                <div style="display:flex; align-items:center; gap:8px; color:#70c4c4; font-weight:700; font-size:13px; letter-spacing:1px; padding: 0 4px;">
                    <ion-icon name="rocket-outline"></ion-icon> КОРАБЛЫ
                </div>
            </div>
            <div id="ship-market-content" class="market-cards-area">
                <div class="market-cards-grid">`;

        //Отображение текущего корабля (Продажа)
        if (validShip) {
            const currentShip = ITEMS[validShip.id];
            if (currentShip) {
                const sellPrice = Math.floor(currentShip.value * 0.5);
                const maxHp = currentShip.stats?.maxHp || 100;
                const hpPercent = Math.round((validShip.hp / maxHp) * 100);
                const hpColor = hpPercent > 60 ? '#2ecc71' : hpPercent > 30 ? '#f39c12' : '#e74c3c';

                html += `
                    <div class="market-card rarity-border-rare" style="border-color:#1abc9c; background: linear-gradient(135deg,#0d2e25,#1a3d2e);">
                        <div class="market-card-icon ship-card-img" style="background-image:url('/public/assets/ships/${{ 'ship_ebon_hawk': 'ebon_hawk', 'ship_fury_interceptor': 'sith_fury', 'ship_phantom': 'phantom', 'ship_defender': 'defender' }[currentShip.id] || 'ebon_hawk'}.png');background-size:cover;background-position:center;"></div>
                        <div class="market-card-body">
                            <div class="market-card-name" style="color:#1abc9c;">${(currentShip?.name || '')} <span style="font-size:10px;color:#aaa;">ВАШ КОРАБЛЬ</span></div>
                            <div class="market-card-desc">${currentShip.description}</div>
                            <div style="margin-top:5px;">
                                <div style="font-size:10px;color:#aaa;margin-bottom:3px;">Корпус: <span style="color:${hpColor};font-weight:700;">${validShip.hp} / ${maxHp} (${hpPercent}%)</span></div>
                                <div style="height:4px;background:#333;border-radius:2px;overflow:hidden;">
                                    <div style="height:100%;width:${hpPercent}%;background:${hpColor};border-radius:2px;transition:width 0.3s;"></div>
                                </div>
                            </div>
                        </div>
                        <div class="market-card-footer">
                            <span class="market-price" style="color:#e74c3c;">-${sellPrice.toLocaleString()}кр.</span>
                            <button class="btn-sell btn-sell-ship" data-item="${currentShip.id}" data-price="${sellPrice}">ПРОДАТЬ</button>
                        </div>
                    </div>
                    <div class="market-sell-divider"><span>🚀 КУПИТЬ НОВЫЙ</span></div>`;
            }
        }

        //Список кораблей для покупки
        this.ships.forEach(shipId => {
            const ship = ITEMS[shipId];
            if (!ship) return;

            const isOwned = validShip && validShip.id === shipId;
            const canBuy = !validShip && this.player.money >= ship.value;
            const rarity = ship.rarity || 'rare';

            const statsHtml = (() => {
                if (!ship.stats) return '';
                const parts = [];
                if (ship.stats.attack) parts.push(`Атк: +${ship.stats.attack}`);
                if (ship.stats.defense) parts.push(`Зах: +${ship.stats.defense}`);
                if (ship.stats.maxHp) parts.push(`HP: +${ship.stats.maxHp}`);
                return parts.map(p => `<span class="stat-badge">${p}</span>`).join('');
            })();

            const shipImages = {
                'ship_ebon_hawk': '/public/assets/ships/ebon_hawk.png',
                'ship_fury_interceptor': '/public/assets/ships/sith_fury.png',
                'ship_phantom': '/public/assets/ships/phantom.png',
                'ship_defender': '/public/assets/ships/defender.png',
            };
            const shipImg = shipImages[shipId] || '';

            html += `
                <div class="market-card rarity-border-${rarity} ${isOwned ? 'ship-card-owned' : ''}">
                    <div class="market-card-icon ship-card-img" style="${shipImg ? `background-image:url('${shipImg}');background-size:cover;background-position:center;background-repeat:no-repeat;` : ''}">
                        ${!shipImg ? '<ion-icon name="rocket-outline"></ion-icon>' : ''}
                    </div>
                    <div class="market-card-body">
                        <div class="market-card-name item-rarity-${rarity}">${(ship?.name || '')}</div>
                        <div class="market-card-desc">${(ship?.description || '')}</div>
                        ${statsHtml ? `<div class="market-card-stats">${statsHtml}</div>` : ''}
                    </div>
                    <div class="market-card-footer">
                        <span class="market-price ${this.player.money < ship.value && !isOwned ? 'price-unaffordable' : ''}">${ship.value.toLocaleString()}кр.</span>
                        ${isOwned
                            ?`<button class="btn-buy btn-buy-disabled" disabled>В СОБСТВЕННОСТИ</button>`
                            : `<button class="btn-buy-ship ${canBuy ? '' : 'btn-buy-disabled'}" data-item="${ship.id}" data-cost="${ship.value}" ${canBuy ? '' : 'disabled'}>
                                    ${validShip ? 'СНАЧАЛА ПРОДАЙТЕ' : canBuy ? 'КУПИТ' : 'МАЛО КРЕДИТОВ'}
                               </button>`
                        }
                    </div>
                </div>
            `;
        });

        html += `</div>
            </div>
            <div class="market-footer">
                <button id="btn-ship-market-close" class="market-close-btn">✕ ЗАКРЫТЬ</button>
            </div>`;

        this.container.innerHTML = html;
        this.attachEventListeners();
    }

    attachEventListeners() {
        const btnClose = this.container.querySelector('#btn-ship-market-close');
        if (btnClose) {
            btnClose.addEventListener('click', () => {
                this.screenManager.showScreen('maps-screen');
                if (window.gameInstance) window.gameInstance.mapScreen.render();
            });
        }

        // Listeners for selling
        const sellBtn = this.container.querySelector('.btn-sell-ship');
        if (sellBtn) {
            sellBtn.addEventListener('click', (e) => {
                const target = e.target.closest('.btn-sell-ship');
                if (!target) return;

                const price = parseInt(target.getAttribute('data-price'));
                const shipId = target.getAttribute('data-item');
                const ship = ITEMS[shipId];

                Modals.confirm(
                    'Продажа корабля',
                    `Вы уверены, что хотите продать <b>${(ship?.name || '')}</b> по <span style="color:#f1c40f">${price.toLocaleString()}кр.</span>?`,
                    'Продать',
                    'Отмена',
                    () => {
                        this.player.money += price;
                        this.player.ship = null;
                        this.player.save();
                        this.render(); // Re-render this screen
                        Modals.alert('Успех', 'Корабль успешно продан!');
                    }
                );
            });
        }

        // Listeners for buying
        const buyBtns = this.container.querySelectorAll('.btn-buy-ship:not(:disabled)');
        buyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target.closest('.btn-buy-ship');
                if (!target) return;

                const cost = parseInt(target.getAttribute('data-cost'));
                const shipId = target.getAttribute('data-item');
                const ship = ITEMS[shipId];

                if (this.player.money < cost) {
                    Modals.alert('Ошибка', 'Не хватает кредитов!');
                    return;
                }

                Modals.confirm(
                    'Покупка корабля',
                    `Купить корабль <b>${(ship?.name || '')}</b> по <span style="color:#f1c40f">${cost.toLocaleString()}кр.</span>?`,
                    'Купить 🚀',
                    'Отмена',
                    () => {
                        this.player.money -= cost;
                        this.player.ship = { 
                            id: shipId, 
                            hp: ship.stats?.maxHp || 100 
                        };
                        this.player.save();
                        this.render();
                        Modals.alert('Поздравляем!', `Вы приобрели корабль <b>${ship.name}</b>! Теперь перелеты между планетами для вас бесплатны.`);
                    }
                );
            });
        });
    }
}
