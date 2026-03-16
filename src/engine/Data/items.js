import { WEAPONS } from './items/weapons.js';
import { ARMOR } from './items/armor.js';
import { CONSUMABLES } from './items/consumables.js';
import { MATERIALS } from './items/materials.js';
import { SHIPS } from './items/ships.js';
import { ITEM_TYPES } from './itemTypes.js';

export { ITEM_TYPES };

export const ITEMS = {
    ...WEAPONS,
    ...ARMOR,
    ...CONSUMABLES,
    ...MATERIALS,
    ...SHIPS
};

//Функция поиска товара по идентификатору
//ТЕПЕРЬ ПОДДЕРЖИВАЕТ СГЕНЕРИРОВАННЫЕ ПРЕДМЕТЫ (ищет их в инвентаре игрока, если передана ссылка на игрока)
export function getItemData(itemId, player = null) {
    //Если передан готовый объект, который прямо является предметом
    if (itemId && typeof itemId === 'object' && itemId.name) {
        return itemId;
    }

    //Если передан объект инвентаря/экипировки вида { id:'...', amount: 1, item: {...} }
    let searchId = itemId;
    if (itemId && typeof itemId === 'object' && itemId.id) {
        const embeddedItem = itemId.item || itemId.itemData;
        if (embeddedItem && embeddedItem.isGenerated) {
            return embeddedItem;
        }
        searchId = itemId.id;
    }

    //Сначала ищем в статической базе
    if (ITEMS[searchId]) return ITEMS[searchId];

    //Если предмета нет в ITEMS, может быть, это сгенерированный предмет.
    //Сгенерированные предметы хранятся прямо на инвентаре игрока как объекты, либо в экипировке.
    if (player) {
        if (player.inventory) {
            const invItem = player.inventory.find(i => i.id === searchId || (i.item && i.item.id === searchId) || (i.itemData && i.itemData.id === searchId));
            const invItemData = invItem?.item || invItem?.itemData;
            if (invItem && invItemData && invItemData.isGenerated) {
                return invItemData;
            }
        }

        if (player.equipment) {
            for (let slot in player.equipment) {
                const eqItem = player.equipment[slot];
                if (eqItem && (eqItem.id === searchId || (eqItem.item && eqItem.item.id === searchId) || (eqItem.itemData && eqItem.itemData.id === searchId) || eqItem === searchId)) {
                    //Если предмет является кастомным объектом внутри
                    const eqEmbedded = eqItem.item || eqItem.itemData;
                    if (eqEmbedded && eqEmbedded.isGenerated) {
                        return eqEmbedded;
                    }
                    //Если сама запись уже готова сгенерированным предметом (как у ботов)
                    if (eqItem.isGenerated) {
                        return eqItem;
                    }
                }
            }
        }
    }

    return null;
}

//Совместная утилита для отображения полов предмета (укр.)
export function formatStats(stats) {
    if (!stats) return '';
    const parts = [];
    if (stats.attack) parts.push(`Атк:${stats.attack > 0 ? '+' : ''}${stats.attack}`);
    if (stats.defense) parts.push(`Зах:${stats.defense > 0 ? '+' : ''}${stats.defense}`);
    if (stats.maxHp) parts.push(`HP: ${stats.maxHp > 0 ? '+' : ''}${stats.maxHp}`);
    if (stats.critChance) parts.push(`Крит: +${stats.critChance}%`);
    if (stats.critDamage) parts.push(`Крит.x: +${stats.critDamage}`);
    return parts.join(' | ');
}
