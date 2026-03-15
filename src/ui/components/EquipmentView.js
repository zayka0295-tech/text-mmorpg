import { getItemData, formatStats } from '../../engine/Data/items.js';
import { Notifications } from '../Notifications.js';

export class EquipmentView {
    constructor(player, renderCallback, showDetailsCallback) {
        this.player = player;
        this.renderCallback = renderCallback;
        this.showDetailsCallback = showDetailsCallback;
    }

    render(activeFilter = 'all') {
        let html = `<div class="equipment-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding-bottom: 20px;">`;
        
        let allSlots = [
            { id: 'weapon1', label: 'ОРУЖИЕ 1' },
            { id: 'helmet', label: 'ШЛЕМ' },
            { id: 'armor', label: 'БРОНЯ' },
            { id: 'pants', label: 'ШТАНЫ' },
            { id: 'boots', label: 'ОБУВЬ' },
            { id: 'accessory', label: 'Аксессуар' },
            { id: 'artifact', label: 'АРТЕФАКТ' },
        ];

        if (activeFilter !== 'all') {
            allSlots = allSlots.filter(s => s.id === activeFilter);
            // If filtering to a single slot, maybe display it full width instead of grid
            html = `<div class="equipment-grid" style="display: flex; flex-direction: column; gap: 15px; padding-bottom: 20px;">`;
        }

        const slotsHtml = allSlots.map(s => this._renderEquipmentSlot(s.id, s.label));
        
        html += slotsHtml.join('');
        html += `</div>`;
        return html;
    }

    _renderEquipmentSlot(slot, label) {
        const itemObj = this.player.equipment[slot];
        if (itemObj) {
            const data = getItemData(itemObj.id, this.player);
            if (!data) return this._emptySlot(label, slot);
            
            const statsHtml = formatStats(data) ? `<div class="market-card-stats">${formatStats(data).replace(/<br>/g, ' ')}</div>` : '';
            const strData = encodeURIComponent(JSON.stringify(itemObj));
            const iconName = this.getIconForSlot(slot);
            const rarity = data.rarity || 'common';

            return `
                <div class="market-card equip-slot filled item-slot rarity-border-${rarity}" data-item='${strData}' data-action="unequip" data-slot="${slot}" style="cursor: pointer; box-sizing: border-box; min-width: 0; display: flex; flex-direction: column; align-items: flex-start;">
                    <div style="font-size: 10px; color: #888; text-transform: uppercase; margin-bottom: 5px; border-bottom: 1px solid #333; padding-bottom: 3px; width: 100%; box-sizing: border-box;">${label}</div>
                    <div style="display: flex; width: 100%; box-sizing: border-box; min-width: 0;">
                        <div class="market-card-icon" style="flex-shrink: 0; margin-right: 10px;">
                            <ion-icon name="${iconName}"></ion-icon>
                        </div>
                        <div class="market-card-body" style="padding: 0; min-width: 0; overflow: hidden;">
                            <div class="market-card-name item-rarity-${rarity}" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;">${(data?.name || '')}</div>
                            ${statsHtml}
                        </div>
                    </div>
                </div>
            `;
        } else {
            return this._emptySlot(label, slot);
        }
    }

    getIconForSlot(slot) {
        switch (slot) {
            case 'weapon1': return 'flash';
            case 'helmet': return 'headset';
            case 'armor': return 'shirt';
            case 'pants': return 'walk';
            case 'boots': return 'footsteps';
            case 'accessory': return 'pulse';
            case 'artifact': return 'planet';
            default: return 'cube-outline';
        }
    }

    _emptySlot(label, slot) {
        const iconName = this.getIconForSlot(slot);
        return `
            <div class="market-card equip-slot empty" style="border-left: 3px solid #444; opacity: 0.6; box-sizing: border-box; min-width: 0; display: flex; flex-direction: column; align-items: flex-start;">
                <div style="font-size: 10px; color: #888; text-transform: uppercase; margin-bottom: 5px; border-bottom: 1px solid #333; padding-bottom: 3px; width: 100%; box-sizing: border-box;">${label}</div>
                <div style="display: flex; align-items: center; width: 100%; box-sizing: border-box; min-width: 0;">
                    <div class="market-card-icon" style="flex-shrink: 0; margin-right: 10px; color: #555;">
                        <ion-icon name="${iconName}"></ion-icon>
                    </div>
                    <div class="market-card-body" style="padding: 0; min-width: 0;">
                        <div style="цвет: #666; font-size: 14px; font-weight: bold;">ПУСТО</div>
                    </div>
                </div>
            </div>`;
    }

    attachEventListeners(container) {
        const equipSlots = container.querySelectorAll('.equip-slot.filled');
        equipSlots.forEach(slot => {
            slot.addEventListener('click', () => {
                const itemDataStr = slot.getAttribute('data-item');
                const slotName = slot.getAttribute('data-slot');
                if (this.showDetailsCallback) {
                    this.showDetailsCallback(JSON.parse(decodeURIComponent(itemDataStr)), 'unequip', slotName);
                }
            });
        });
    }

    handleUnequip(slotName) {
        if (!this.player.equipment[slotName]) return;

        const success = this.player.unequipItem(slotName);
        if (success) {
            this.player.save(); // Sync totalAttack/totalDefense for other players
            Notifications.show('Дело снято.', 'info');
            if (this.renderCallback) this.renderCallback();
        }
    }
}
