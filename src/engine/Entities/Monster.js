import { Entity } from './Entity.js';
import { ItemGenerator } from '../Data/ItemGenerator.js';

export class Monster extends Entity {
    constructor(id, name, level = 1, type = 'humanoid', xpReward, moneyReward, lootTable = []) {
        //Базовые полы монстра.
        const constitution = 5 + Math.floor(level * 1.5);
        const strength = 5 + Math.floor(level * 1.5);
        const agility = 5 + Math.floor(level * 1.5);
        const intellect = 5 + Math.floor(level * 1.5);

        //Монстры обычно имеют базовый шанс крота 2.5% и 1.5x урон.
        super(name, constitution, strength, agility, intellect, 2.5, 1.5);

        this.id = id;                   //Уникальный ID для треккинга квестов
        this.xpReward = xpReward;       //Опыт за убийство
        this.moneyReward = moneyReward; //BTC за убийство
        this.lootTable = lootTable;     //Формат: [{ id: 'bacta_small', chance: 0.3 }]
        this.level = level;             //Уровень для генератора лута и полов
        this.type = type;               //Тип: 'humanoid', 'droid', 'beast'
        this.alignmentShiftMsg = "";    //Для PvP кормы
        
        //ВАЖНО: Поскольку мы сменили конструктор, нам надо переназначить атаки и деф старые, ранее передававшиеся напрямую
        //Мы сделаем это через кастомный тюнинг или оставим их 0 (чисто от атрибутов)
        //Для упрощения мы рассчитаем Атаку и Защиту от уровня
        this.attack = Math.floor(level * 2); 
        this.defense = Math.floor(level * 0.5);
    }

    getRewards() {
        const droppedItems = [];

        //Генерируем лут на основе шансов
        if (this.lootTable && this.lootTable.length > 0) {
            this.lootTable.forEach(loot => {
                if (Math.random() <= loot.chance) {
                    //Если лут имеет 'type', а не 'id', то это запрос на генерацию!
                    if (loot.type === 'generate') {
                        //'slot' может быть undefined (тогда любой)
                        const genItem = ItemGenerator.generateLoot(this.level || 1, loot.slot, loot.forceRarity);
                        droppedItems.push(genItem);
                    } else if (loot.id) {
                        //Старый формат статических вещей
                        droppedItems.push(loot.id);
                    }
                }
            });
        }

        return {
            xp: this.xpReward,
            money: this.moneyReward,
            items: droppedItems,
            alignmentShiftMsg: this.alignmentShiftMsg
        };
    }
}
