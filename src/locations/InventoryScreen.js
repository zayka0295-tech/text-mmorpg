import { EquipmentView } from '../ui/components/EquipmentView.js';
import { BackpackView } from '../ui/components/BackpackView.js';
import { ItemInfoModal } from '../ui/modals/ItemInfoModal.js';

export class InventoryScreen {
    constructor(screenManager, player) {
        this.screenManager = screenManager;
        this.player = player;
        this.container = document.getElementById('inventory-screen');
        this.activeTab = 'equipment'; // 'equipment', 'inventory', 'craft'

        this.itemInfoModal = new ItemInfoModal(this.player, () => {
            this.render();
        });

        this.equipmentView = new EquipmentView(
            this.player,
            () => this.render(),
            (itemObj, action, slotName) => this.showItemDetails(itemObj, action, slotName)
        );
        this.backpackView = new BackpackView(
            this.player,
            () => this.render(),
            (itemObj, action) => this.showItemDetails(itemObj, action, null)
        );

        this.screenManager.subscribe('inventory-screen', () => {
            if (!this.activeTab) this.activeTab = 'equipment';
            this.render();
        });
        this.init();
    }

    init() {
        if (!this.container) return;
        this.render();
    }

    render() {
        if (!this.container) return;

        // Сохраняем текущие позиции прокрутки перед рендером
        const contentArea = this.container.querySelector('.inventory-content-area');
        const tabsContainer = this.container.querySelector('#inv-tabs-container');
        const savedScrollTop = contentArea ? contentArea.scrollTop : 0;
        const savedScrollLeft = tabsContainer ? tabsContainer.scrollLeft : 0;

        let contentHtml = '';
        if (this.activeTab === 'equipment') {
            contentHtml = this.equipmentView.render('all'); // Always render all 8 slots
        } else if (this.activeTab === 'inventory') {
            const subTabsHtml = `
                <div class="market-tabs" id="inv-tabs-container" style="border-bottom:none; margin-bottom:15px; border-radius: 6px; position: sticky; top: 0; z-index: 10; background: #111; padding-top: 15px; margin-top: -15px;">
                    <button class="m-tab inv-filter-tab ${this.activeInvTab === 'all' ? 'active' : ''}" data-filter="all">📦 Все</button>
                    <button class="m-tab inv-filter-tab${this.activeInvTab === 'weapon' ? 'active' : ''}" data-filter="weapon">🔫 Оружие</button>
                    <button class="m-tab inv-filter-tab${this.activeInvTab === 'armor' ? 'active' : ''}" data-filter="armor">🛡️ Броня</button>
                    <button class="m-tab inv-filter-tab${this.activeInvTab === 'helmet' ? 'active' : ''}" data-filter="helmet">🪖 Шлем</button>
                    <button class="m-tab inv-filter-tab${this.activeInvTab === 'pants' ? 'active' : ''}" data-filter="pants">👖 Брюки</button>
                    <button class="m-tab inv-filter-tab${this.activeInvTab === 'boots' ? 'active' : ''}" data-filter="boots">👢 Ботинки</button>
                    <button class="m-tab inv-filter-tab${this.activeInvTab === 'accessory' ? 'active' : ''}" data-filter="accessory">💍 Аксессуар</button>
                    <button class="m-tab inv-filter-tab${this.activeInvTab === 'artifact' ? 'active' : ''}" data-filter="artifact">🔮 Артефакт</button>
                    <button class="m-tab inv-filter-tab${this.activeInvTab === 'consumable' ? 'active' : ''}" data-filter="consumable">💉 Аптечки</button>
                    <button class="m-tab inv-filter-tab${this.activeInvTab === 'material' ? 'active' : ''}" data-filter="material">⚙️ Материалы</button>
                    <button class="m-tab inv-filter-tab${this.activeInvTab === 'quest' ? 'active' : ''}" data-filter="quest">📜 Квест</button>
                </div>`;
            contentHtml = subTabsHtml + this.backpackView.render(this.activeInvTab || 'all');
        } else if (this.activeTab === 'craft') {
            contentHtml = `<div style="padding: 20px; text-align: center; color: white; background: rgba(0,0,0,0.5); font-size: 20px;">Крафт пока в разработке...</div>`;
        }

        let html = `
            <div class="inventory-main-wrapper" style="display: flex; flex-direction: column; height: 100%; box-sizing: border-box; background: #0a0a0a;">
                
                <!-- TAB BAR -->
                <div class="inventory-tabs" style="display:flex; flex-shrink: 0; background:#1a1a1a; justify-content: space-around; font-size: 16px; border-bottom: 1px solid #2a2a2a;">
                    <div class="inv-tab ${this.activeTab === 'equipment' ? 'active' : ''}" data-tab="equipment" style="flex:1; text-align:center; padding: 12px; cursor:pointer; color: ${this.activeTab === 'equipment' ? '#fff' : '#a0a0a0'}; font-weight: ${this.activeTab === 'equipment' ? 'bold' : 'normal'}; border-bottom: ${this.activeTab === 'equipment' ? '3px solid #f1c40f' : '3px solid transparent'}; transition: 0.2s;">Экипировка</div>
                    <div class="inv-tab${this.activeTab === 'inventory' ? 'active' : ''}" data-tab="inventory" style="flex:1; text-align:center; padding: 12px; cursor:pointer; color: ${this.activeTab === 'inventory' ? '#fff' : '#a0a0a0'}; font-weight: ${this.activeTab === 'inventory' ? 'bold' : 'normal'}; border-bottom: ${this.activeTab === 'inventory' ? '3px solid #f1c40f' : '3px solid transparent'}; transition: 0.2s;">Инвентарь</div>
                    <div class="inv-tab${this.activeTab === 'craft' ? 'active' : ''}" data-tab="craft" style="flex:1; text-align:center; padding: 12px; cursor:pointer; color: ${this.activeTab === 'craft' ? '#fff' : '#a0a0a0'}; font-weight: ${this.activeTab === 'craft' ? 'bold' : 'normal'}; border-bottom: ${this.activeTab === 'craft' ? '3px solid #f1c40f' : '3px solid transparent'}; transition: 0.2s;">Крафт</div>
                </div>

                <div class="inventory-content-area" style="flex: 1; min-height: 0; padding: 15px; overflow-y: auto; background: #111;">${contentHtml}</div>

                <!-- ACTIVE BUFFS SECTION - ПЕРЕМЕЩЕНО ВНИЗ -->
                <div style="padding: 15px; background: rgba(255,255,255,0.02); border-top: 1px solid #222;">
                    <div style="font-weight: 900; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                        <ion-icon name="flash-outline" style="color: #f1c40f;"></ion-icon> Активные баффы
                    </div>
                    <div class="inventory-buffs-section" style="display: grid; grid-template-columns: 1fr; gap: 10px;">
                        <!-- Баффы будут здесь -->
                    </div>
                </div>

                <!-- Панель деталей (скрыта по умолчанию) -->${this.itemInfoModal.renderHTML()}
            </div>
        `;

        this.container.innerHTML = html;
        this.attachEventListeners();

        // Восстанавливаем позиции прокрутки
        const newContentArea = this.container.querySelector('.inventory-content-area');
        const newTabsContainer = this.container.querySelector('#inv-tabs-container');
        
        // Позицию списка восстанавливаем только если мы не меняли вкладку фильтра (activeInvTab)
        // Но для горизонтальной прокрутки вкладок - восстанавливаем всегда
        if (newContentArea) newContentArea.scrollTop = savedScrollTop;
        if (newTabsContainer) newTabsContainer.scrollLeft = savedScrollLeft;

        //Темный фон для инвентаря
        const mainWrapper = this.container.querySelector('.inventory-main-wrapper');
        if (mainWrapper) {
            mainWrapper.style.background = '#0a0a0a';
        }

        this._renderActiveBuffs();
    }

    _renderActiveBuffs() {
        const buffsContainer = this.container.querySelector('.inventory-buffs-section');
        if (!buffsContainer) return;

        const activeBuffs = [];
        if (this.player.hasBuff('juma_juice')) {
            activeBuffs.push({ name: '🥤 Сок джумы', desc: 'Регенерация x5', time: this.player.getBuffTimeLeft('juma_juice') });
        }
        if (this.player.hasBuff('corellian_ale')) {
            activeBuffs.push({ name: '🍺 Кореллианский эль', desc: 'Работа за 3 мин.', time: this.player.getBuffTimeLeft('corellian_ale') });
        }

        if (activeBuffs.length === 0) {
            buffsContainer.innerHTML = '<div style="color: #666; font-style: italic; font-size: 13px;">Нет активных эффектов</div>';
            return;
        }

        buffsContainer.innerHTML = activeBuffs.map(b => {
            const min = Math.floor(b.time / 60000);
            const sec = Math.floor((b.time % 60000) / 1000);
            return `
                <div style="background: rgba(255,255,255,0.05); border: 1px solid #333; padding: 10px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 900; color: #f1c40f; font-size: 14px;">${b.name}</div>
                        <div style="font-size: 11px; color: #aaa;">${b.desc}</div>
                    </div>
                    <div style="font-family: monospace; color: #00bcd4; font-weight: 700;">${min}:${sec.toString().padStart(2, '0')}</div>
                </div>
            `;
        }).join('');

        // Обновляем таймеры каждую секунду, пока мы в инвентаре
        if (this._buffInterval) clearInterval(this._buffInterval);
        this._buffInterval = setInterval(() => {
            if (!document.body.contains(this.container)) {
                clearInterval(this._buffInterval);
                return;
            }
            this._renderActiveBuffs();
        }, 1000);
    }

    showItemDetails(itemObj, actionType, slotName = null) {
        this.itemInfoModal.show(this.container, itemObj, actionType, slotName);
    }

    attachEventListeners() {
        //Главные Табы
        const tabs = this.container.querySelectorAll('.inv-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.target.getAttribute('data-tab');
                if (targetTab && this.activeTab !== targetTab) {
                    this.activeTab = targetTab;
                    this.render();
                }
            });
        });

        //Саб-табы для инвентаря (фильтры)
        if (this.activeTab === 'inventory') {
            const invTabs = this.container.querySelectorAll('.inv-filter-tab');
            invTabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    const targetFilter = e.target.getAttribute('data-filter');
                    if (targetFilter && this.activeInvTab !== targetFilter) {
                        this.activeInvTab = targetFilter;
                        this.render();
                    }
                });
            });

            // --- Drag to Scroll & Mousewheel support for inv tabs ---
            const tabsContainer = this.container.querySelector('#inv-tabs-container');
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
                    const walk = (x - startX) * 2;
                    tabsContainer.scrollLeft = scrollLeft - walk;
                });
                
                tabsContainer.addEventListener('wheel', (e) => {
                    if (e.deltaY !== 0) {
                        e.preventDefault();
                        tabsContainer.scrollLeft += e.deltaY;
                    }
                }, { passive: false });
            }
        }

        //Делегирование событий для контента
        if (this.activeTab === 'equipment' && this.equipmentView) {
            this.equipmentView.attachEventListeners(this.container);
        } else if (this.activeTab === 'inventory' && this.backpackView) {
            this.backpackView.attachEventListeners(this.container);
        }


    }

    update() { }
}
