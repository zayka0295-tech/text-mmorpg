import { ITEM_TYPES } from '../itemTypes.js';

export const WEAPONS = {
    'blaster_pistol': {
        id: 'blaster_pistol',
        name: 'Старый Бластер серии DL',
        type: ITEM_TYPES.WEAPON1,
        rarity: 'common',
        description: 'Надежный, но старый пистолет. Стреляет через один раз.',
        value: 50,
        stats: { attack: 4 },
        dropChance: 0.05
    },
    'heavy_blaster': {
        id: 'heavy_blaster',
        name: 'Тяжелый Бластер',
        type: ITEM_TYPES.WEAPON1,
        rarity: 'rare',
        description: 'Мощное оружие наемников.',
        value: 150,
        stats: { attack: 12, critDamage: 0.2 },
        dropChance: 0.02
    },
    'vibro_knife': {
        id: 'vibro_knife',
        name: 'Вибронож',
        type: ITEM_TYPES.WEAPON1,
        rarity: 'uncommon',
        description: 'Идеально для ближнего боя в Кантине.',
        value: 40,
        stats: { attack: 4, critChance: 2 },
        dropChance: 0.1
    },
    'lightsaber_green': {
        id: 'lightsaber_green',
        name: 'Зеленый световой меч Подано',
        type: ITEM_TYPES.WEAPON1,
        rarity: 'epic',
        description: 'Элегантное оружие для более цивилизованных времен. Символ мира и правосудия.',
        value: 5000,
        reqAlignment: 'light',
        reqTitle: 'Юнлинг',
        stats: { attack: 20, defense: 0, critChance: 0.25, critDamage: 2.0 },
        icon: 'flash'
    },
    'lightsaber_purple': {
        id: 'lightsaber_purple',
        name: 'Фиолетовый световой меч',
        type: ITEM_TYPES.WEAPON1,
        rarity: 'epic',
        description: 'Редкий цвет меча, символизирующий баланс между светом и тьмой.',
        value: 5000,
        reqAlignment: 'light',
        reqTitle: 'Юнлинг',
        stats: { attack: 20, defense: 0, critChance: 0.25, critDamage: 2.0 },
        icon: 'flash'
    },
    'lightsaber_blue': {
        id: 'lightsaber_blue',
        name: 'Синий световой меч Падана',
        type: ITEM_TYPES.WEAPON1,
        rarity: 'epic',
        description: 'Классический цвет меча Джеда-защитника.',
        value: 5000,
        reqAlignment: 'light',
        reqTitle: 'Юнлинг',
        stats: { attack: 20, defense: 0, critChance: 0.25, critDamage: 2.0 },
        icon: 'flash'
    },
    'lightsaber_yellow': {
        id: 'lightsaber_yellow',
        name: 'Желтый световой меч Падавана',
        type: ITEM_TYPES.WEAPON1,
        rarity: 'epic',
        description: 'Цвет Стражей Джедаев, охраняющих покой.',
        value: 5000,
        reqAlignment: 'light',
        reqTitle: 'Юнлинг',
        stats: { attack: 20, defense: 0, critChance: 0.25, critDamage: 2.0 },
        icon: 'flash'
    },
    'lightsaber_red': {
        id: 'lightsaber_red',
        name: 'Красный световой меч Ситха',
        type: ITEM_TYPES.WEAPON1,
        rarity: 'legendary',
        description: 'Созданный с помощью темных ритуалов этот меч пульсирует гневом.',
        value: 8000,
        reqAlignment: 'dark',
        reqTitle: 'Аколит',
        stats: { attack: 25, defense: 0, critChance: 0.30, critDamage: 2.5 },
        icon: 'flash'
    }
};
