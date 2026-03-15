export const MONSTERS = {
    // === TATOOINE ===
    'womp_rat': {
        id: 'womp_rat',
        name: 'Крыса Вомп',
        hp: 20,
        attack: 4,
        defense: 1,
        xp: 10,
        money: 5,
        loot: [{ id: 'bacta_small', chance: 0.3 }],
        type: 'beast',
        image: 'public/assets/monsters/womp_rat.png'
    },
    'tusken_raider': {
        id: 'tusken_raider',
        name: 'Тускен-рейдер',
        hp: 50,
        attack: 8,
        defense: 3,
        xp: 30,
        money: 15,
        loot: [{ id: 'bacta_small', chance: 0.5 }, { type: 'generate', chance: 0.2 }],
        type: 'humanoid',
        image: 'public/assets/monsters/tusken_raider.png'
    },
    'sandtrooper': {
        id: 'sandtrooper',
        name: 'Песчаный Штурмовик',
        hp: 80,
        attack: 12,
        defense: 6,
        xp: 50,
        money: 30,
        loot: [{ id: 'bacta_medium', chance: 0.3 }],
        type: 'humanoid',
        image: 'public/assets/monsters/sandtrooper.png'
    },
    'krayt_dragon_hatchling': {
        id: 'krayt_dragon_hatchling',
        name: 'Детеныш Крайт-дракона',
        hp: 150,
        attack: 18,
        defense: 10,
        xp: 120,
        money: 70,
        baseLevel: 10,
        loot: [{ type: 'generate', chance: 0.5 }],
        type: 'beast',
        image: 'public/assets/monsters/krayt_dragon_hatchling.png'
    },

    // === CORUSCANT ===
    'street_thug': {
        id: 'street_thug',
        name: 'Уличный бандит',
        hp: 45,
        attack: 7,
        defense: 2,
        xp: 20,
        money: 20,
        loot: [{ id: 'bacta_small', chance: 0.5 }, { type: 'generate', chance: 0.15 }],
        type: 'humanoid',
        image: 'public/assets/monsters/street_thug.png'
    },
    'bounty_hunter': {
        id: 'bounty_hunter',
        name: 'Охотник за головами',
        hp: 120,
        attack: 15,
        defense: 8,
        xp: 100,
        money: 75,
        baseLevel: 5,
        loot: [{ id: 'bacta_medium', chance: 0.6 }, { type: 'generate', chance: 0.35 }],
        type: 'humanoid',
        image: 'public/assets/monsters/bounty_hunter.png'
    },
    'sith_acolyte': {
        id: 'sith_acolyte',
        name: 'Ситх-аколит (Изгнанник)',
        hp: 200,
        attack: 25,
        defense: 12,
        xp: 250,
        money: 150,
        baseLevel: 15,
        loot: [{ type: 'generate', chance: 0.5 }],
        type: 'humanoid',
        image: 'public/assets/monsters/sith_acolyte.png'
    },

    // === KORRIBAN ===
    'rival_acolyte': {
        id: 'rival_acolyte',
        name: 'Аколит-соперник',
        hp: 150,
        attack: 20,
        defense: 8,
        xp: 120,
        money: 50,
        loot: [{ id: 'bacta_medium', chance: 0.5 }],
        type: 'humanoid',
        image: 'public/assets/monsters/rival_acolyte.png'
    },
    'tomb_robber': {
        id: 'tomb_robber',
        name: 'Расхититель гробниц',
        hp: 120,
        attack: 15,
        defense: 6,
        xp: 80,
        money: 40,
        loot: [{ id: 'bacta_medium', chance: 0.2 }],
        type: 'humanoid',
        image: 'public/assets/monsters/tomb_robber.png'
    },
    'tukata': {
        id: 'tukata',
        name: "Тукьято",
        hp: 200,
        attack: 25,
        defense: 10,
        xp: 150,
        money: 0,
        loot: [{ type: 'generate', chance: 0.2 }],
        type: 'beast',
        image: 'public/assets/monsters/tukata.png'
    },
    'tomb_guardian': {
        id: 'tomb_guardian',
        name: 'Страж гробницы',
        hp: 250,
        attack: 30,
        defense: 15,
        xp: 200,
        money: 100,
        loot: [],
        type: 'humanoid',
        image: 'public/assets/monsters/tomb_guardian.png'
    },
    'tukata_alpha': {
        id: 'tukata_alpha',
        name: "Альфа Тук'ата",
        hp: 350,
        attack: 40,
        defense: 12,
        xp: 300,
        money: 0,
        baseLevel: 10,
        loot: [{ id: 'sith_holocron_shard_1', chance: 0.3 }],
        type: 'beast',
        image: 'public/assets/monsters/tukata_alpha.png'
    },
    'sith_assassin': {
        id: 'sith_assassin',
        name: 'Ситх-ассасин',
        hp: 180,
        attack: 35,
        defense: 8,
        xp: 180,
        money: 80,
        loot: [{ id: 'bacta_medium', chance: 0.2 }],
        type: 'humanoid',
        image: 'public/assets/monsters/sith_assassin.png'
    },
    'hord_blademaster': {
        id: 'hord_blademaster',
        name: 'Мастер клинка Хорда',
        hp: 400,
        attack: 50,
        defense: 20,
        xp: 400,
        money: 150,
        baseLevel: 15,
        loot: [],
        type: 'humanoid',
        image: 'public/assets/monsters/hord_blademaster.png'
    },
    'dark_jedi': {
        id: 'dark_jedi',
        name: 'Темный джедай',
        hp: 300,
        attack: 28,
        defense: 15,
        xp: 250,
        money: 120,
        loot: [],
        type: 'humanoid',
        image: 'public/assets/monsters/dark_jedi.png'
    },
    'ragnos_spirit': {
        id: 'ragnos_spirit',
        name: 'Дух Рогноса',
        hp: 800,
        attack: 60,
        defense: 30,
        xp: 1000,
        money: 500,
        baseLevel: 25,
        loot: [],
        type: 'humanoid',
        image: 'public/assets/monsters/ragnos_spirit.png'
    },
    'shyrack': {
        id: 'shyrack',
        name: 'Ширак',
        hp: 80,
        attack: 18,
        defense: 5,
        xp: 70,
        money: 0,
        loot: [],
        type: 'beast',
        image: 'public/assets/monsters/shyrack.png'
    },
    'alpha_shyrack': {
        id: 'alpha_shyrack',
        name: 'Альфа Ширак',
        hp: 180,
        attack: 28,
        defense: 8,
        xp: 180,
        money: 0,
        baseLevel: 8,
        loot: [],
        type: 'beast',
        image: 'public/assets/monsters/alpha_shyrack.png'
    },

    // === DANTOOINE ===
    'rogue_droid': {
        id: 'rogue_droid',
        name: 'Сломанный тренировочный дроид',
        hp: 90,
        attack: 14,
        defense: 6,
        xp: 60,
        money: 20,
        loot: [{ id: 'bacta_medium', chance: 0.2 }],
        type: 'droid',
        image: 'public/assets/monsters/rogue_droid.png'
    },
    'kinrath': {
        id: 'kinrath',
        name: 'Кинрат',
        hp: 70,
        attack: 10,
        defense: 4,
        xp: 45,
        money: 10,
        loot: [{ id: 'bacta_small', chance: 0.4 }],
        type: 'beast',
        image: 'public/assets/monsters/kinrath.png'
    },
    'poison_kinrath': {
        id: 'poison_kinrath',
        name: 'Ядовитый Кинрат',
        hp: 110,
        attack: 15,
        defense: 5,
        xp: 85,
        money: 15,
        loot: [{ id: 'bacta_medium', chance: 0.3 }],
        type: 'beast',
        image: 'public/assets/monsters/poison_kinrath.png'
    },
    'kath_hound': {
        id: 'kath_hound',
        name: 'Палач Хаунд',
        hp: 50,
        attack: 8,
        defense: 3,
        xp: 30,
        money: 5,
        loot: [{ id: 'bacta_small', chance: 0.5 }],
        type: 'beast',
        image: 'public/assets/monsters/kath_hound.png'
    },
    'mandalorian_mercenary': {
        id: 'mandalorian_mercenary',
        name: 'Мандалорский наемник',
        hp: 130,
        attack: 16,
        defense: 8,
        xp: 110,
        money: 60,
        loot: [{ id: 'bacta_medium', chance: 0.5 }],
        image: 'public/assets/monsters/mandalorian_mercenary.png'
    }
};

/**
 * Returns a clone of the monster object to avoid mutating the original data
 */
export function getMonsterData(monsterId) {
    const m = MONSTERS[monsterId];
    if (!m) return null;
    return JSON.parse(JSON.stringify(m));
}
