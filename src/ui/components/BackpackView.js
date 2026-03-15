import { getItemData, formatStats } from '../../engine/Data/items.js';
import { ITEM_TYPES } from '../../engine/Data/itemTypes.js';

export class BackpackView {
    constructor(player, renderCallback, showDetailsCallback) {
        this.player = player;
        this.renderCallback = renderCallback;
        this.showDetailsCallback = showDetailsCallback;
    }

    render(activeFilter = 'all') {
        let html = `<div class="market-cards-grid" style="padding-bottom: 20px;">`;

        if (!this.player.inventory || this.player.inventory.length === 0) {
            html += `<div style="grid-column: 1/-1; text-align: center; color: #888; padding: 30px;">Рюкзак пуст. Пора найти трофеи!</div>`;
            html += `</div>`;
            return html;
        }

        let itemsToRender = this.player.inventory.map((itemObj, index) => {
            return { itemObj, index, data: getItemData(itemObj.id, this.player) };
        }).filter(item => item.data);

        if (activeFilter !== 'all') {
            itemsToRender = itemsToRender.filter(item => {
                const type = item.data.type;
                if (activeFilter === 'weapon') return ['weapon1'].includes(type);
                if (activeFilter === 'armor') return type === 'armor';
                if (activeFilter === 'helmet') return type === 'helmet';
                if (activeFilter === 'pants') return type === 'pants';
                if (activeFilter === 'boots') return type === 'boots';
                if (activeFilter === 'accessory') return type === 'accessory';
                if (activeFilter === 'artifact') return type === 'artifact';
                if (activeFilter === 'consumable') return type === 'consumable';
                if (activeFilter === 'material') return type === 'material';
                if (activeFilter === 'quest') return type === 'quest';
                return true;
            });
        }

        if (itemsToRender.length === 0) {
             html += `<div style="grid-column: 1 / -1; text-align: center; color: #888; padding: 30px;">В этой категории пусто.</div>`;
             html += `</div>`;
             return html;
        }

        itemsToRender.forEach(({ itemObj, index, data }) => {

            itemObj._index = index;
            const strData = encodeURIComponent(JSON.stringify(itemObj));
            
            const iconName = this.getIconForItemType(data.type);
            const rarity = data.rarity || 'common';
            const statsHtml = formatStats(data) ? `<div class="market-card-stats">${formatStats(data).replace(/<br>/g, ' ')}</div>` : '';
            const amountHtml = itemObj.amount > 1 ? `<span style="color:#aaa;font-size:11px;">x${itemObj.amount}</span>` : '';

            html += `
                <div class="market-card inv-list-item item-slot rarity-border-${rarity}" data-item='${strData}' style="cursor: pointer;">
                    <div class="market-card-icon">
                        <ion-icon name="${iconName}"></ion-icon>
                    </div>
                    <div class="market-card-body">
                        <div class="market-card-name item-rarity-${rarity}">${(data?.name || '')} ${amountHtml}</div>
                        <div class="market-card-desc">${(data?.description || '') || ''}</div>
                        ${statsHtml}
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        return html;
    }

    getIconForItemType(type) {
        switch (type) {
            case 'weapon1': return 'flash';
            case 'armor': return 'shirt';
            case 'helmet': return 'headset';
            case 'pants': return 'walk';
            case 'boots': return 'footsteps';
            case 'accessory': return 'pulse';
            case 'artifact': return 'planet';
            case 'consumable': return 'medkit';
            case 'material': return 'construct';
            case 'quest': return 'document-text';
            default: return 'cube-outline';
        }
    }

    attachEventListeners(container) {
        //Клики по предметам в рюкзаке
        const listItems = container.querySelectorAll('.inv-list-item');
        listItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // Ignore clicks on buttons inside the item if they exist
                if (e.target.tagName === 'BUTTON') return;

                const itemDataStr = item.getAttribute('data-item');
                const itemObj = JSON.parse(decodeURIComponent(itemDataStr));
                const data = getItemData(itemObj.id, this.player);

                //Определяем, что делать с предметом (use или equip)
                let actionType = 'info';
                if (data.type === ITEM_TYPES.CONSUMABLE) {
                    actionType = 'use';
                } else if ([ITEM_TYPES.WEAPON1, ITEM_TYPES.HELMET, ITEM_TYPES.ARMOR, ITEM_TYPES.PANTS, ITEM_TYPES.BOOTS, ITEM_TYPES.ACCESSORY, ITEM_TYPES.ARTIFACT].includes(data.type)) {
                    actionType = 'equip';
                }

                if (this.showDetailsCallback) {
                    this.showDetailsCallback(itemObj, actionType, null);
                }
            });
        });
    }
}
