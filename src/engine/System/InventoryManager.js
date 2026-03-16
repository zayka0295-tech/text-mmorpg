import { getItemData } from "../Data/items.js";
import { ITEM_TYPES } from "../Data/itemTypes.js";

export class InventoryManager {
    constructor(player) {
        this.player = player; // Reference back to the player object to check alignment/title/stats
        this.items = []; //Формат: {id: 'bacta_small', amount: 5, item: {} }
        this.equipment = {
            [ITEM_TYPES.WEAPON1]: null,
            [ITEM_TYPES.HELMET]: null,
            [ITEM_TYPES.ARMOR]: null,
            [ITEM_TYPES.PANTS]: null,
            [ITEM_TYPES.BOOTS]: null,
            [ITEM_TYPES.ACCESSORY]: null,
            [ITEM_TYPES.ARTIFACT]: null,
        };
        this._initListeners();
    }

    _initListeners() {
        document.addEventListener('network:inventory_result', (e) => {
            const { ok, operation, error, profile, itemId, slot } = e.detail;
            if (ok && profile) {
                // Sync state from server
                if (profile.inventoryData) {
                    this.load(profile.inventoryData.inventory, profile.inventoryData.equipment);
                }
                this.player._emit('inventory-changed');
                this.player._emit('stats-changed');
                this.player._emit('hp-changed');

                if (operation === 'equip') {
                    // Optional: show notification or sound
                }
            } else {
                // Show error in UI (e.g. via notification)
                const msg = error || 'Ошибка инвентаря';
                document.dispatchEvent(new CustomEvent("game:notification", { detail: { msg, type: 'error' } }));
            }
        });
    }

    load(inventoryData, equipmentData) {
        this.items = inventoryData || [];
        this.equipment = equipmentData || this.equipment;

        //Миграция старых сохранений: Конвертируем срочные ID в объекты
        if (this.equipment) {
            for (let slot in this.equipment) {
                if (typeof this.equipment[slot] === "string") {
                    const itemId = this.equipment[slot];
                    //Конвертируем в объект
                    this.equipment[slot] = { id: itemId, amount: 1 };
                }
            }
        }
    }

    getExportData() {
        return {
            inventory: this.items,
            equipment: this.equipment
        };
    }

    addItem(itemOrId, amount = 1) {
        // Only for local simulation or non-critical items. 
        // Critical items should be added by server sync via market/jobs/loot.
        // For now, keep as helper for client-side predictions or legacy calls.
        if (isNaN(amount) || amount <= 0) return false;

        const isObject = typeof itemOrId === "object" && itemOrId !== null;
        const itemId = isObject ? itemOrId.id : itemOrId;

        const existing = this.items.find((i) => i.id === itemId);

        if (existing) {
            existing.amount += amount;
        } else {
            this.items.push({
                id: itemId,
                amount: amount,
                item: isObject ? itemOrId : null,
            });
        }
        return true;
    }

    removeItem(itemId, amount = 1) {
        // Client-side helper, mostly superseded by server state sync
        if (isNaN(amount) || amount <= 0) return false;

        const index = this.items.findIndex((i) => i.id === itemId);
        if (index !== -1) {
            if (this.items[index].amount < amount) return false;
            this.items[index].amount -= amount;
            if (this.items[index].amount <= 0) {
                this.items.splice(index, 1);
            }
            return true;
        }
        return false;
    }

    findItem(predicate) {
        return this.items.find(predicate);
    }

    equipItem(itemId) {
        // Check basic requirements locally for immediate feedback (optional)
        // But main logic is network call.
        if (this.player.networkMgr) {
            this.player.networkMgr.send('inventory_equip', { itemId });
            return { success: true, pending: true };
        }
        return { success: false, error: "Нет сети" };
    }

    unequipItem(slot) {
        if (this.player.networkMgr) {
            this.player.networkMgr.send('inventory_unequip', { slot });
            return true;
        }
        return false;
    }

    getEquipmentStat(statName) {
        let total = 0;
        for (const slot in this.equipment) {
            const itemObj = this.equipment[slot];
            if (itemObj) {
                const itemData = getItemData(itemObj.id, this.player);
                if (itemData && itemData.stats && itemData.stats[statName]) {
                    total += itemData.stats[statName];
                }
            }
        }
        return total;
    }
}
