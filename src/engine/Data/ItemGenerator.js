import { ITEM_TYPES } from './itemTypes.js';

// ==========================================
//СИСТЕМА РЕДКОСТИ
// ==========================================
export const RARITY_CONFIG = {
    common: {
        label:      { m: 'Обычный', f: 'Обычная', n: 'Обычное' },
        color:      '#aaaaaa',
        multiplier: 1.0,
        priceMult:  1.0,
        glowClass:  ''
    },
    rare: {
        label:      { m: 'Редкий', f: 'Редкая', n: 'Редкое' },
        color:      '#2ecc71',
        multiplier: 1.4,
        priceMult:  3.0,
        glowClass:  ''
    },
    epic: {
        label:      { m: 'Эпический', f: 'Эпическая', n: 'Эпическое' },
        color:      '#9b59b6',
        multiplier: 1.9,
        priceMult:  7.0,
        glowClass:  ''
    },
    legendary: {
        label:      { m: 'Легендарный', f: 'Легендарная', n: 'Легендарное' },
        color:      '#f39c12',
        multiplier: 2.8,
        priceMult:  18.0,
        glowClass:  'legendary-glow'
    }
};

// ==========================================
//БАЗОВЫЕ ШАБЛОНЫ — ТУТ ЗАДАЙТЕ СВОИ ПРЕДМЕТЫ
// ==========================================

//Каждый шаблон: { id_base, name, type, baseAttack?, baseDefense?, baseMaxHp?, baseCritChance?, baseCritDamage?, baseValue }
//Название будет: "[Префикс редкости] [name]" - например "Эпическая винтовка-Е11"

export const BASE_WEAPON1 = [
    { id_base: 'blaster_e11',    name: 'WESTAR-34',          gender: 'm', type: ITEM_TYPES.WEAPON1, baseAttack: 6,  baseValue: 80  },
    { id_base: 'dl44_blaster',   name: 'Бластер DL-44',      gender: 'm', type: ITEM_TYPES.WEAPON1, baseAttack: 5,  baseValue: 60  },
    { id_base: 'verpine_rifle',  name: "Винтовка Верпин",    gender: 'f', type: ITEM_TYPES.WEAPON1, baseAttack: 8,  baseCritChance: 4, baseValue: 100 },
    { id_base: 'dc17_pistol',    name: 'Пистолет DC-17',     gender: 'm', type: ITEM_TYPES.WEAPON1, baseAttack: 4,  baseValue: 50  },
    { id_base: 'vibro_dagger',   name: 'Вибродаггер',        gender: 'm', type: ITEM_TYPES.WEAPON1, baseAttack: 3,  baseCritChance: 3, baseValue: 40  },
    { id_base: 'vibro_blade',    name: 'Вибролезвие',        gender: 'n', type: ITEM_TYPES.WEAPON1, baseAttack: 5,  baseValue: 55  },
    { id_base: 'mando_blade',    name: 'Клинок Мандалорца',  gender: 'm', type: ITEM_TYPES.WEAPON1, baseAttack: 7,  baseCritDamage: 0.2, baseValue: 75 },
];


export const BASE_ARMOR = [
    { id_base: 'cloth_tunic',    name: 'Тканевая туника',      gender: 'f', type: ITEM_TYPES.ARMOR, baseDefense: 2,  baseMaxHp: 10, baseValue: 40  },
    { id_base: 'mesh_vest',      name: 'Бронеплетение',        gender: 'n', type: ITEM_TYPES.ARMOR, baseDefense: 5,  baseMaxHp: 20, baseValue: 80  },
    { id_base: 'durasteel_vest', name: 'Дюрастальный жилет',   gender: 'm', type: ITEM_TYPES.ARMOR, baseDefense: 9,  baseMaxHp: 30, baseValue: 130 },
    { id_base: 'beskar_plate',   name: 'Бескаровая кираса',    gender: 'f', type: ITEM_TYPES.ARMOR, baseDefense: 15, baseMaxHp: 50, baseValue: 250 },
];

export const BASE_HELMET = [
    { id_base: 'scout_goggles',  name: 'Очки разведчика',      type: ITEM_TYPES.HELMET, baseDefense: 1, baseCritChance: 1, baseValue: 30 },
    { id_base: 'combat_helmet',  name: 'Боевой шлем',           type: ITEM_TYPES.HELMET, baseDefense: 4,                    baseValue: 60 },
    { id_base: 'heavy_helm',     name: 'Тяжелый шлем',            type: ITEM_TYPES.HELMET, baseDefense: 7,                    baseValue: 100 },
    { id_base: 'mando_helm',     name: 'Шлем Мондолорца',        type: ITEM_TYPES.HELMET, baseDefense: 10, baseCritChance: 2, baseValue: 160 },
];

export const BASE_PANTS = [
    { id_base: 'cloth_pants',    name: 'Тканевые брюки',          type: ITEM_TYPES.PANTS, baseDefense: 1, baseMaxHp: 5,  baseValue: 25 },
    { id_base: 'leather_pants',  name: 'Кожаные брюки',           type: ITEM_TYPES.PANTS, baseDefense: 2, baseMaxHp: 10, baseValue: 45 },
    { id_base: 'armored_pants',  name: 'Бронированные штаны',        type: ITEM_TYPES.PANTS, baseDefense: 4, baseMaxHp: 20, baseValue: 75 },
];

export const BASE_BOOTS = [
    { id_base: 'leather_boots',  name: 'Кожаные сапоги',          type: ITEM_TYPES.BOOTS, baseDefense: 1, baseMaxHp: 5,  baseValue: 20 },
    { id_base: 'combat_boots',   name: 'Боевые ботинки',         type: ITEM_TYPES.BOOTS, baseDefense: 2, baseMaxHp: 10, baseValue: 40 },
    { id_base: 'durasteel_boots',name: 'Дюрастальные ботинки',    type: ITEM_TYPES.BOOTS, baseDefense: 3, baseMaxHp: 15, baseValue: 65 },
];

// ==========================================
//Вспомогательные функции
// ==========================================

function getRandElem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/** Шансы: Common 50%, Rare 30%, Epic 15%, Legendary 5%*/
function rollRarity(forceRarity = null) {
    if (forceRarity) return forceRarity;
    const r = Math.random() * 100;
    if (r < 50) return 'common';
    if (r < 80) return 'rare';
    if (r < 95) return 'epic';
    return 'legendary';
}

function generateDescription(rarity) {
    const descs = {
        common:    'Стандартное серийное изделие. Ничего особенного.',
        rare:      'Редкий экземпляр повышенного качества.',
        epic:      'Эпический предмет — редкость галактического масштаба.',
        legendary: 'Легендарный артефакт — сила, не имеющая равных.'
    };
    return descs[rarity] || '';
}

/** Строит финальный item-объект из шаблона и редкости*/
function buildItem(template, rarity, level = 1) {
    const cfg = RARITY_CONFIG[rarity];
    const mult=cfg.multiplier;
    const levelBonus = 1+(level - 1)*0.05; // +5% per level
    const totalMult=mult*levelBonus;

    const stats = {};
    if (template.baseAttack) stats.attack = Math.max(1, Math.floor(template.baseAttack * totalMult));
    if (template.baseDefense) stats.defense = Math.max(1, Math.floor(template.baseDefense * totalMult));
    if (template.baseMaxHp) stats.maxHp = Math.max(1, Math.floor(template.baseMaxHp * totalMult));
    if (template.baseCritChance) stats.critChance = template.baseCritChance; // Crit doesn't scale with rarity
    if (template.baseCritDamage) stats.critDamage = parseFloat((template.baseCritDamage * (1 + (mult - 1) * 0.5)).toFixed(2));

    const value = Math.floor((template.baseValue || 50) * cfg.priceMult * levelBonus);
    const gender = template.gender || 'm'; // Default to masculine
    const prefix = cfg.label[gender] || cfg.label.m;
    const name = `${prefix} ${template.name}`;

    return {
        id: `gen_${template.id_base}_${rarity}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
        baseId: template.id_base,
        name,
        type: template.type,
        rarity,
        level,
        value,
        stats,
        isGenerated: true,
        description: generateDescription(rarity)
    };
}

// ==========================================
//ГЛАВНАЯ ФУНКЦИЯ ГЕНЕРАЦИИ
// ==========================================
export const ItemGenerator = {

    /**
     * @param {number} level Уровень предмета (масштабирует пол)
     * @param {string|null} slot Тип слота: 'weapon1','armor','helmet','pants','boots' или null (random)
     * @param {string|null} forceRarity Принудительная редкость*/
    generateLoot(level = 1, slot = null, forceRarity = null) {
        const rarity = rollRarity(forceRarity);

        let pool;
        switch (slot) {
            case ITEM_TYPES.WEAPON1: pool = BASE_WEAPON1; break;

            case ITEM_TYPES.ARMOR:   pool = BASE_ARMOR;   break;
            case ITEM_TYPES.HELMET:  pool = BASE_HELMET;  break;
            case ITEM_TYPES.PANTS:   pool = BASE_PANTS;   break;
            case ITEM_TYPES.BOOTS:   pool = BASE_BOOTS;   break;
            default: {
                const allPools = [BASE_WEAPON1, BASE_ARMOR, BASE_HELMET, BASE_PANTS, BASE_BOOTS];
                pool = getRandElem(allPools);
            }
        }

        const template = getRandElem(pool);
        return buildItem(template, rarity, level);
    },

    /** Создать конкретный предмет с нужной редкостью*/
    createItem(templateId, rarity = 'common', level = 1) {
        const allPools = [...BASE_WEAPON1, ...BASE_ARMOR, ...BASE_HELMET, ...BASE_PANTS, ...BASE_BOOTS];
        const template = allPools.find(t => t.id_base === templateId);
        if (!template) return null;
        return buildItem(template, rarity, level);
    }
};
