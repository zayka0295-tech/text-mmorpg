const ITEM_TYPES = require('./itemTypes');

const ITEMS = {
    // CONSUMABLES
    'bacta_small': {
        id: 'bacta_small',
        name: 'Малая Бакта-аптечка',
        type: ITEM_TYPES.CONSUMABLE,
        rarity: 'common',
        description: 'Восстанавливает 30 HP. Стандартное средство первой помощи.',
        value: 10,
        heal: 30,
        dropChance: 0.3
    },
    'bacta_medium': {
        id: 'bacta_medium',
        name: 'Средняя Бакта-аптечка',
        type: ITEM_TYPES.CONSUMABLE,
        rarity: 'uncommon',
        description: 'Восстанавливает 75 HP.',
        value: 30,
        heal: 75,
        dropChance: 0.1
    },
    'ship_repair_kit': {
        id: 'ship_repair_kit',
        name: 'Ремкомплект Корабля',
        type: ITEM_TYPES.CONSUMABLE,
        rarity: 'uncommon',
        description: 'Восстанавливает 50% целостности корпуса корабля.',
        value: 500,
        heal: 0,
        isRepairKit: true,
        dropChance: 0.05
    },
    'blue_milk': {
        id: 'blue_milk',
        name: 'Голубое молоко',
        type: ITEM_TYPES.CONSUMABLE,
        rarity: 'common',
        description: 'Свежее молоко с ферм Татуина. Мгновенно восстанавливает всё здоровье.',
        value: 1500,
        heal: 'full'
    },
    'juma_juice': {
        id: 'juma_juice',
        name: 'Сок джумы',
        type: ITEM_TYPES.CONSUMABLE,
        rarity: 'uncommon',
        description: 'Тонизирующий напиток. Ускоряет регенерацию HP и Силы в 5 раз на 5 минут!',
        value: 50000,
        buff: { id: 'juma_juice', duration: 5 * 60 * 1000 }
    },
    'corellian_ale': {
        id: 'corellian_ale',
        name: 'Кореллианский эль',
        type: ITEM_TYPES.CONSUMABLE,
        rarity: 'rare',
        description: 'Легендарный эль. Уменьшает время всех работ до 3 минут. Действует 30 минут.',
        value: 1,
        isPremium: true,
        buff: { id: 'corellian_ale', duration: 30 * 60 * 1000 }
    },
    'jedi_holocron': {
        id: 'jedi_holocron',
        name: 'Холокрон Джедаев',
        type: ITEM_TYPES.CONSUMABLE,
        reqAlignment: 'light',
        rarity: 'legendary',
        description: 'Хранилище известен Орденом Джедаевым. Излучает глубокую покой и мудрость. Можно расшифровать в Библиотеке Дантуина.',
        value: 1500
    },
    'sith_holocron': {
        id: 'sith_holocron',
        name: 'Холокрон Ситхов',
        type: ITEM_TYPES.CONSUMABLE,
        reqAlignment: 'dark',
        reqTitle: 'Аколит',
        rarity: 'legendary',
        description: 'Хранилище черных знаний Ордена Ситхов. Можно расшифровать в Зале Церемоний на Коррибане.',
        value: 1500
    },

    // SHIPS
    'ship_ebon_hawk': {
        id: 'ship_ebon_hawk',
        name: 'Черный Ястреб',
        type: ITEM_TYPES.SHIP,
        rarity: 'rare',
        description: 'Легендарный легкий грузовой корабль. Быстрый и маневренный.',
        value: 100000,
        stats: { speed: 10, maxHp: 1000 }
    },
    'ship_fury_interceptor': {
        id: 'ship_fury_interceptor',
        name: 'Имперский перехватчик',
        type: 'ship',
        rarity: 'epic',
        description: 'Тяжелый истребитель Империи Ситхов. Смертоносный в бою.',
        value: 275000,
        stats: { speed: 12, maxHp: 1500 }
    },
    'ship_phantom': {
        id: 'ship_phantom',
        name: 'Фантом X-70B',
        type: 'ship',
        rarity: 'epic',
        description: 'Прототип разведки Империи. Гладкий, незаметный и роскошный.',
        value: 375000,
        stats: { speed: 14, maxHp: 1200 }
    },
    'ship_defender': {
        id: 'ship_defender',
        name: 'Корвет класса Защитник',
        type: 'ship',
        rarity: 'legendary',
        description: 'Корвет Ордена Джедаев. Мощные щиты и вооружение.',
        value: 2500000,
        stats: { speed: 15, maxHp: 5000 }
    }
};

module.exports = ITEMS;
