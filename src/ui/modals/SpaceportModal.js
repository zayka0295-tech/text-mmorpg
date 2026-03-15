import { PLANETS } from '../../engine/Data/planets.js';
import { Modals } from '../Modals.js';

export class SpaceportModal {
    constructor(container, player, renderCallback) {
        this.container = container;
        this.player = player;
        this.renderCallback = renderCallback; //Функция для обновления MapScreen после перелета
    }

    renderSpaceportModal(currentPlanetId) {
        let modalHtml = `<div id="spaceport-modal" class="spaceport-overlay" style="display: none;">
                <div class="spaceport-box">
                    <div class="spaceport-header">
                        <h2>КОСМОПОРТ</h2>
                        <button id="btn-close-spaceport" class="btn-close">✖</button>
                    </div>
                    <div class="planets-grid">`;

        Object.values(PLANETS).forEach(planet => {
            const isCurrent = planet.id === currentPlanetId;
            const bgImage = `/public/assets/locations/planet_${planet.id}.png`;

            let costText = `${planet.flightCost}кр.`;
            let actualCost = planet.flightCost;
            
            //Если есть корабль - бесплатно
            if (this.player.ship) {
                costText = `<span style="text-decoration: line-through; color: #aaa;">${planet.flightCost}</span> <span style="color: #27ae60;">0 кр.</span>`;
                actualCost = 0;
            }

            modalHtml += `
                <div class="planet-card ${isCurrent ? 'current-planet' : ''}" style="background-image: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.8)), url('${bgImage}'); background-size: cover; background-position: center; border: ${isCurrent ? '2px solid #1abc9c' : '1px solid #333'};">
                    <div class="planet-icon"><ion-icon name="${planet.icon}"></ion-icon></div>
                    <div class="planet-info">
                        <h3 style="text-shadow: 2px 2px 4px #000;">${(planet?.name || '')}</h3>
                        <p style="text-shadow: 1px 1px 3px #000;">${planet.description}</p>
                    </div>
            `;

            if (isCurrent) {
                modalHtml += `<button class="btn-fly btn-disabled" disabled>ВЫ ЗДЕСЬ</button>`;
            } else {
                modalHtml += `<button class="btn-fly" data-planet="${planet.id}" data-cost="${actualCost}">
                                ЛЕТЕТЬ (${costText})
                              </button>`;
            }
            modalHtml += `</div>`;
        });

        modalHtml += `
                    </div>
                </div>
            </div>
        `;
        return modalHtml;
    }

    attachEventListeners() {
        const btnOpenSpaceport = this.container.querySelector('#btn-open-spaceport');
        const btnCloseSpaceport = this.container.querySelector('#btn-close-spaceport');
        const spaceportModal = this.container.querySelector('#spaceport-modal');

        if (btnOpenSpaceport && spaceportModal) {
            btnOpenSpaceport.addEventListener('click', () => {
                if (window.gameInstance && window.gameInstance.mapScreen && window.gameInstance.mapScreen.isMeditating) {
                    Modals.alert('Медитация', 'Вы сейчас медитируете. Дождитесь завершения!');
                    return;
                }
                
                // Проверка на поиск (мусор, кристаллы, раскопки)
                if (window.gameInstance && window.gameInstance.mapScreen && window.gameInstance.mapScreen.isSearching) {
                    Modals.alert('Вы заняты', 'Вы не можете улететь, пока заняты поиском или раскопками!');
                    return;
                }

                // Check if under PvP attack (combat lock)
                const pvpLockKey = `sw_pvp_combat_lock_${this.player.name}`;
                const rawLock = localStorage.getItem(pvpLockKey);
                if (rawLock) {
                    try {
                        const lock = JSON.parse(rawLock);
                        const age = Date.now() - (lock.ts || 0);
                        if (age < 10 * 60 * 1000) { // 10 minutes max lock
                            Modals.alert('⚔️ Бой!', `На вас накал${lock.attacker || 'другой игрок'}! Нельзя покинуть зону во время PvP боя.`);
                            return;
                        } else {
                            localStorage.removeItem(pvpLockKey); // Stale lock — clear it
                        }
                    } catch { localStorage.removeItem(pvpLockKey); }
                }
                spaceportModal.style.display = 'flex';
            });
        }

        if (btnCloseSpaceport && spaceportModal) {
            btnCloseSpaceport.addEventListener('click', () => {
                spaceportModal.style.display = 'none';
            });
        }

        const flyBtns = this.container.querySelectorAll('.btn-fly:not(:disabled)');
        flyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target.closest('.btn-fly');
                if (!target) return;

                const planetId = target.getAttribute('data-planet');
                const cost = parseInt(target.getAttribute('data-cost'));
                const planetData = PLANETS[planetId];

                if (!planetData) return;

                //Если есть корабль, проверяем его состояние
                if (this.player.ship && this.player.ship.hp <= 0) {
                     Modals.alert('Критическая поломка', 'Ваш корабль уничтожен/сломан! Отремонтируйте его на рынке (Ремкомплект), чтобы летать.');
                     return;
                }

                if (this.player.money >= cost) {
                    //Проверка или игрок на работе
                    if (this.player.activeJob && this.player.jobEndTime > Date.now()) {
                        Modals.alert('Ошибка', 'Вы на работе! Перелеты заблокированы.');
                        return;
                    }

                    //Проверка HP (< 50%)
                    const hpPercent = (this.player.hp / this.player.maxHp) * 100;
                    if (hpPercent < 50) {
                        Modals.alert('Вы слишком ранены', 'Перелеты недоступны (HP <50%). Используйте аптечку.');
                        return;
                    }

                    Modals.confirm(
                        'Подтверждение полета',
                        `Вылететь на планету <b>${(planetData?.name || '')}</b> по <span style="color:#f1c40f">${cost}кр.</span>?`,
                        'Улететь 🚀',
                        'Отмена',
                        () => {
                            this.player.money -= cost;
                            this.player.locationId = planetData.landingZone;

                            //Треккинг квеста
                            this.player.updateQuestProgress('visit_planet', planetId);

                            //ШАНС НАПАДАНИЯ (Только если есть корабль и мы летим на нем)
                            let attackMsg = '';
                            if (this.player.ship) {
                                if (Math.random() < 0.10) { //10% шанс
                                     const shipData = PLANETS[planetId]; // This is wrong, should get item data
                                     import('../../engine/Data/items.js').then(itemsModule => {
                                         const shipItem = itemsModule.ITEMS[this.player.ship.id];
                                         const maxHp = shipItem?.stats?.maxHp || 100;
                                         
                                         // Урон от 10% до 25% от максимального HP
                                         const dmgPercent = 0.10 + (Math.random() * 0.15);
                                         const dmg = Math.floor(maxHp * dmgPercent);
                                         
                                         this.player.ship.hp = Math.max(0, (this.player.ship.hp || 0) - dmg);
                                         const hpPercent = Math.round((this.player.ship.hp / maxHp) * 100);

                                         if (this.player.ship.hp <= 0) {
                                             //Корабль уничтожен навсегда!
                                             const destroyedShipName = shipItem?.name || 'корабль';
                                             this.player.ship = null;
                                             this.player.save(); //Сохраняем — корабль уничтожен
                                             attackMsg = `<br><br><span style="color:#e74c3c; font-weight:bold; font-size:14px;">💥 КОРАБЛЬ Уничтожен!</span><br><span style="color:#e74c3c;">Пираты уничтожили <b>${destroyedShipName}</b>! Вам удалось эвакуироваться в спасательную капсулу. Ваш корабль потерян навсегда. Купите новый на рынке кораблей.</span>`;
                                         } else {
                                             this.player.save(); //Сохраняем повреждения
                                             attackMsg = `<br><br><span style="color:#e74c3c; font-weight:bold;">⚠️ ВНИМАНИЕ! На вас напали пираты во время перелета!</span><br>Ваш корабль получил ${dmg} ед. урона. Состояние: ${this.player.ship.hp} / ${maxHp} (${hpPercent}%)`;
                                         }

                                         spaceportModal.style.display = 'none'; //Закрыть модалку
                                         if (this.renderCallback) this.renderCallback();
                                         Modals.alert('Успех', `<span style="color:#27ae60;font-weight:bold;font-size:16px;">Перелет на ${(planetData?.name || '')} успешный! 🚀</span>${attackMsg}`);
                                     });
                                     return; // Ждем промиса импорта
                                }
                            }

                            spaceportModal.style.display = 'none'; //Закрыть модалку

                            if (this.renderCallback) {
                                this.renderCallback(); //Перерисовываем карту для новой планеты
                            }

                            Modals.alert('Успех', `<span style="color:#27ae60;font-weight:bold;font-size:16px;">Перелет на ${(planetData?.name || '')} успешный! 🚀</span>${attackMsg}`);
                        }
                    );
                } else {
                    Modals.alert('Нехватка средств', `Недостаточно кредитов для перелета! (Требуется <span style="color:#e74c3c">${cost}кр.</span>)`);
                }
            });
        });
    }
}
