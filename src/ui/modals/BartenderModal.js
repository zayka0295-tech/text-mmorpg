import { Modals } from '../Modals.js';
import { Notifications } from '../Notifications.js';
import { getItemData } from '../../engine/Data/items.js';

export class BartenderModal {
    constructor(player, onAction) {
        this.player = player;
        this.onAction = onAction;
    }

    show() {
        const modalHtml = `
            <div id="bartender-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;">
                <div class="modal-box bartender-box" style="background: #1a1a1a; border: 2px solid #d35400; border-radius: 12px; padding: 20px; width: 100%; max-width: 400px; color: #fff; position: relative; max-height: 90vh; overflow-y: auto;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 style="margin: 0; color: #d35400;">🍻 Стойка Бармена</h2>
                        <button id="close-bartender" style="background: none; border: none; color: #888; font-size: 32px; cursor: pointer; padding: 5px;">&times;</button>
                    </div>

                    <div class="bartender-menu" style="display: flex; flex-direction: column; gap: 15px;">
                        <!-- ITEM 1 -->
                        <div class="menu-item" style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border: 1px solid #333;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div>
                                    <h3 style="margin: 0; color: #3498db;">🥛 Голубое молоко</h3>
                                    <p style="margin: 5px 0; font-size: 12px; color: #ccc;">Свежее молоко с ферм Татуина. Мгновенно восстанавливает всё здоровье.</p>
                                </div>
                                <div style="text-align: right;">
                                    <span style="display: block; font-weight: 900; color: #f1c40f;">1 500 кр.</span>
                                </div>
                            </div>
                            <button class="buy-btn" data-id="blue_milk" style="width: 100%; margin-top: 10px; padding: 8px; background: #3498db; border: none; border-radius: 4px; color: #fff; font-weight: 900; cursor: pointer;">КУПИТЬ</button>
                        </div>

                        <!-- ITEM 2 -->
                        <div class="menu-item" style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border: 1px solid #333;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div>
                                    <h3 style="margin: 0; color: #9b59b6;">🥤 Сок джумы</h3>
                                    <p style="margin: 5px 0; font-size: 12px; color: #ccc;">Тонизирующий напиток. Ускоряет регенерацию HP и Силы в 5 раз на 5 минут!</p>
                                </div>
                                <div style="text-align: right;">
                                    <span style="display: block; font-weight: 900; color: #f1c40f;">50 000 кр.</span>
                                </div>
                            </div>
                            <button class="buy-btn" data-id="juma_juice" style="width: 100%; margin-top: 10px; padding: 8px; background: #9b59b6; border: none; border-radius: 4px; color: #fff; font-weight: 900; cursor: pointer;">КУПИТЬ</button>
                        </div>

                        <!-- ITEM 3 -->
                        <div class="menu-item" style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border: 1px solid #d35400;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div>
                                    <h3 style="margin: 0; color: #e67e22;">🍺 Кореллианский эль</h3>
                                    <p style="margin: 5px 0; font-size: 12px; color: #ccc;">Легендарный эль. Уменьшает время всех работ до 3 минут. Действует 30 минут.</p>
                                </div>
                                <div style="text-align: right;">
                                    <span style="display: block; font-weight: 900; color: #00bcd4;">1 ₵</span>
                                </div>
                            </div>
                            <button class="buy-btn" data-id="corellian_ale" style="width: 100%; margin-top: 10px; padding: 8px; background: #e67e22; border: none; border-radius: 4px; color: #fff; font-weight: 900; cursor: pointer;">КУПИТЬ</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this._attachEvents();
    }

    _attachEvents() {
        const modal = document.getElementById('bartender-modal');
        document.getElementById('close-bartender').onclick = () => this.hide();

        modal.querySelectorAll('.buy-btn').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                this._handlePurchase(id);
            };
        });
    }

    _handlePurchase(id) {
        let price = 0;
        let currency = 'credits';

        if (id === 'blue_milk') price = 1500;
        else if (id === 'juma_juice') price = 50000;
        else if (id === 'corellian_ale') {
            price = 1;
            currency = 'datarii';
        }

        if (currency === 'credits' && this.player.money < price) {
            Notifications.show('Недостаточно кредитов!', 'error');
            return;
        }
        if (currency === 'datarii' && (this.player.datarii || 0) < price) {
            Notifications.show('Недостаточно Датариев!', 'error');
            return;
        }

        // Вычитаем валюту
        if (currency === 'credits') this.player.money -= price;
        else this.player.datarii -= price;

        // Добавляем предмет в инвентарь вместо мгновенного использования
        this.player.addItem(id, 1);
        
        const itemData = getItemData(id, this.player);
        Notifications.show(`Вы купили ${itemData.name}. Предмет добавлен в инвентарь! 🎒`, 'success');

        this.player.save();
        if (this.onAction) this.onAction();
        this.hide();
    }

    hide() {
        const modal = document.getElementById('bartender-modal');
        if (modal) modal.remove();
    }
}
