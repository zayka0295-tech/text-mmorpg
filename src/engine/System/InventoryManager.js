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
        const itemData = getItemData(itemId, this.player);
        if (!itemData) return { success: false, error: "Предмет не найден" };

        if (itemData.reqAlignment === "light" && (this.player.alignment || 0) <= 0) {
            return {
                success: false,
                error: "Только Светлые (Джедаи) могут одеть это!",
            };
        }
        if (itemData.reqAlignment === "dark" && (this.player.alignment || 0) >= 0) {
            return {
                success: false,
                error: "Только Темные (Ситхи) могут одеть это!",
            };
        }

        if (itemData.reqTitle) {
            const allowedJediTitles = ['Падаван', 'Джедай'];
            const allowedSithTitles = ['Аколит', 'Ситх'];
            if (itemData.reqTitle === 'Падаван' && !allowedJediTitles.includes(this.player.title)) {
                return {
                    success: false,
                    error: "Нужно звание Падаван (или выше), чтобы носить это!",
                };
            }
        }

        const itemIndex = this.items.findIndex(
            (i) => i.id === itemId && i.amount > 0,
        );
        if (itemIndex === -1) return { success: false, error: "Нет в инвентаре" };

        const slot = itemData.type;

        if (this.equipment[slot]) {
            this.unequipItem(slot);
        }

        const itemObj = JSON.parse(JSON.stringify(this.items[itemIndex]));
        itemObj.amount = 1;

        this.removeItem(itemId, 1);
        this.equipment[slot] = itemObj;

        if (this.player.hp > this.player.maxHp) this.player.hp = this.player.maxHp;
        this.player.save();
        return { success: true };
    }

    unequipItem(slot) {
        if (this.equipment[slot]) {
            const itemObj = this.equipment[slot];
            this.addItem(itemObj.item || itemObj.id, 1);
            this.equipment[slot] = null;
            if (this.player.hp > this.player.maxHp) this.player.hp = this.player.maxHp;
            this.player.save();
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
