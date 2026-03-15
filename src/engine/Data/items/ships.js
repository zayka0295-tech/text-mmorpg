import { ITEM_TYPES } from '../itemTypes.js';

export const SHIPS = {
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
