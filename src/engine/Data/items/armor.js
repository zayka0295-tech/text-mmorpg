import { ITEM_TYPES } from '../itemTypes.js';

export const ARMOR = {
    'smuggler_jacket': {
        id: 'smuggler_jacket',
        name: 'Куртка Контрабандиста',
        type: ITEM_TYPES.ARMOR,
        rarity: 'common',
        description: 'Обычная кожаная куртка, немного защищающая от трения ветра.',
        value: 60,
        stats: { defense: 2, maxHp: 10 },
        dropChance: 0.05
    },
    'bounty_hunter_armor': {
        id: 'bounty_hunter_armor',
        name: 'Броня Охотника за головами',
        type: ITEM_TYPES.ARMOR,
        rarity: 'rare',
        description: 'Прочные пластины из дюрастали.',
        value: 200,
        stats: { defense: 10, maxHp: 20 },
        dropChance: 0.01
    },
    'goggles': {
        id: 'goggles',
        name: 'Песчаные очки',
        type: ITEM_TYPES.HELMET,
        rarity: 'common',
        description: 'Защищают глаза от песка Татуина.',
        value: 20,
        stats: { defense: 1 },
        dropChance: 0.1
    },
    'cargo_pants': {
        id: 'cargo_pants',
        name: 'Брюки-карго',
        type: ITEM_TYPES.PANTS,
        rarity: 'common',
        description: 'Много карманов для кредитов.',
        value: 30,
        stats: { defense: 1, maxHp: 5 },
        dropChance: 0.1
    },
    'leather_boots': {
        id: 'leather_boots',
        name: 'Кожаные сапоги',
        type: ITEM_TYPES.BOOTS,
        rarity: 'common',
        description: 'Прочные, для долгих путешествий.',
        value: 35,
        stats: { defense: 1, maxHp: 5 },
        dropChance: 0.08
    },
    'lucky_dice': {
        id: 'lucky_dice',
        name: 'Счастливые кубики',
        type: ITEM_TYPES.ACCESSORY,
        rarity: 'uncommon',
        description: 'Немного удачи еще никому не помешало.',
        value: 500,
        stats: { critChance: 4 },
        dropChance: 0.005
    }
};
