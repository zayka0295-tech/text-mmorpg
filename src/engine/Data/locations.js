import { PLANETS } from './planets.js';
import { MONSTERS } from './monsters.js';

export { PLANETS };

export const LOCATIONS = {
    // === TATOOINE ===
    'tatooine_spaceport': {
        id: 'tatooine_spaceport',
        name: 'Космопорт Мосс Эйсли',
        planet: 'Татуин',
        planetId: 'tatooine',
        description: 'Шумный космопорт, полный контрабандистов, торговцев и охотников за головами. Берегите свои карманы и свой корабль.',
        isSafeZone: true,
        isJobCenter: true,
        monsters: [],
        connections: ['tatooine_cantina', 'tatooine_market', 'jundland_wastes']
    },
    'tatooine_cantina': {
        id: 'tatooine_cantina',
        name: 'Кантина Мосс Эйсли',
        planet: 'Татуин',
        planetId: 'tatooine',
        description: 'Шумное место в пустыне, где можно выпить чего-нибудь крепкого и найти неприятности.',
        isSafeZone: true,
        hasBartender: true,
        monsters: [],
        connections: ['tatooine_spaceport']
    },
    'tatooine_market': {
        id: 'tatooine_market',
        planet: 'Татуин',
        planetId: 'tatooine',
        name: 'Рынок Мосс Эйсли',
        description: 'Местные торговцы предлагают все: от запчастей до дроидов и лекарств. Берегите свои кредиты.',
        isSafeZone: true,
        hasMarket: true,
        hasShipMarket: true,
        monsters: [],
        connections: ['tatooine_spaceport']
    },
    'jundland_wastes': {
        id: 'jundland_wastes',
        planet: 'Татуин',
        planetId: 'tatooine',
        name: 'Пустоши Джандленда',
        description: 'Скалистая и опасная местность. Здесь легко заблудятся или наткнутся на агрессивную фауну и местных рейдеров.',
        isSafeZone: false,
        monsters: [MONSTERS.womp_rat, MONSTERS.tusken_raider],
        connections: ['tatooine_spaceport', 'tatooine_dune_sea']
    },
    'tatooine_dune_sea': {
        id: 'tatooine_dune_sea',
        name: 'Дюнное море',
        planet: 'Татуин',
        planetId: 'tatooine',
        description: 'Бескрайние пески, где царит испепеляющая жара. Только сильнейшие осмеливаются заходить так далеко.',
        isSafeZone: false,
        monsters: [MONSTERS.sandtrooper, MONSTERS.krayt_dragon_hatchling],
        connections: ['jundland_wastes']
    },
    //ПЛАНЕТА: КОРРУСАНТ
    // ==========================================
    'coruscant_spaceport': {
        id: 'coruscant_spaceport',
        name: 'Главный Космопорт Корусанта',
        planet: 'Корусант',
        planetId: 'coruscant',
        description: 'Большой транспортный хаб столицы Галактики. Корабли безостановочно прилетают и улетают.',
        isSafeZone: true,
        isJobCenter: true,
        hasBank: true,
        monsters: [],
        connections: ['coruscant_market', 'coruscant_dexters', 'coruscant_level_1313', 'coruscant_senate', 'coruscant_jedi_temple']
    },
    'coruscant_market': {
        id: 'coruscant_market',
        planet: 'Корусант',
        planetId: 'coruscant',
        name: 'Галактический Рынок Корусанта',
        description: 'Официальные торговые ряды, где можно найти самую современную экипировку республики.',
        isSafeZone: true,
        hasMarket: true,
        hasShipMarket: true,
        monsters: [],
        connections: ['coruscant_spaceport']
    },
    'coruscant_dexters': {
        id: 'coruscant_dexters',
        name: 'Закусочная Декстера',
        planet: 'Корусант',
        planetId: 'coruscant',
        description: 'Уютное место с неоновыми вывесками, где можно выпить джава-сок и отдохнуть от ритма планеты-города.',
        isSafeZone: true,
        monsters: [],
        connections: ['coruscant_spaceport']
    },
    'coruscant_level_1313': {
        id: 'coruscant_level_1313',
        name: 'Уровень 1313',
        planet: 'Корусант',
        planetId: 'coruscant',
        description: 'Бедный квартал города. Преступники и наемники.',
        isSafeZone: false,
        hasGarbage: true,
        monsters: [MONSTERS.street_thug, MONSTERS.bounty_hunter, MONSTERS.sith_acolyte],
        connections: ['coruscant_spaceport']
    },
    'coruscant_senate': {
        id: 'coruscant_senate',
        name: 'Галактический Сенат',
        planet: 'Корусант',
        planetId: 'coruscant',
        description: 'Оживленное политическое сердце Галактики, где решаются судьбы тысяч миров.',
        isSafeZone: true,
        monsters: [],
        connections: ['coruscant_spaceport']
    },
    'coruscant_jedi_temple': {
        id: 'coruscant_jedi_temple',
        name: 'Храм Джедаев',
        planet: 'Корусант',
        planetId: 'coruscant',
        description: 'Величественное здание Ордена Джедаев. Место обучения, медитаций и спокойствия.',
        isSafeZone: true,
        monsters: [],
        connections: ['coruscant_spaceport']
    },
    //ПЛАНЕТА: КОРРИБАН
    // ==========================================
    'korriban_landing': {
        id: 'korriban_landing',
        name: 'Посадочная площадка Коррибана',
        planet: 'Коррибан',
        planetId: 'korriban',
        description: 'Песчаная, продуваемая ветрами равнина, где приземляются корабли. Отсюда ведут пути к главным достопримечательностям планеты.',
        isSafeZone: true,
        monsters: [],
        connections: ['korriban_academy', 'korriban_library', 'korriban_valley', 'korriban_shyrack']
    },
    'korriban_academy': {
        id: 'korriban_academy',
        name: 'Академия Ситхов',
        planet: 'Коррибан',
        planetId: 'korriban',
        description: 'Жестокое место, где выковываются новые аколиты Темной стороны. Более слабые здесь гибнут.',
        isSafeZone: true,
        monsters: [],
        connections: ['korriban_landing', 'korriban_ceremony_hall', 'korriban_sith_temple', 'korriban_arena']
    },
    'korriban_ceremony_hall': {
        id: 'korriban_ceremony_hall',
        name: 'Зал Церемонии',
        planet: 'Коррибан',
        planetId: 'korriban',
        description: 'Место, где аколиты проходят испытания и получают свои первые темные титулы.',
        isSafeZone: true,
        monsters: [],
        connections: ['korriban_academy']
    },
    'korriban_sith_temple': {
        id: 'korriban_sith_temple',
        name: 'Храм Лорда Ситхов',
        planet: 'Коррибан',
        planetId: 'korriban',
        description: 'Святилище Темной стороны. Воздух здесь тяжелый от страха и могущества.',
        isSafeZone: true,
        monsters: [],
        connections: ['korriban_academy']
    },
    'korriban_arena': {
        id: 'korriban_arena',
        name: 'Арена',
        planet: 'Коррибан',
        planetId: 'korriban',
        description: 'Пятиугольная арена, где аколиты сталкиваются в смертельных дуэлях на световых мечах.',
        isSafeZone: false,
        monsters: [MONSTERS.rival_acolyte],
        connections: ['korriban_academy']
    },
    'korriban_library': {
        id: 'korriban_library',
        name: 'Большая Библиотека',
        planet: 'Коррибан',
        planetId: 'korriban',
        description: 'Хранилище старых текстов, голокронов и знаний Темной стороны Силы.',
        isSafeZone: true,
        monsters: [],
        connections: ['korriban_landing']
    },
    'korriban_valley': {
        id: 'korriban_valley',
        name: 'Долина Темных Лордов',
        planet: 'Коррибан',
        planetId: 'korriban',
        description: 'Место покоя величайших Владык Ситхов. Земля пропитана Темной стороной Силы.',
        isSafeZone: false,
        monsters: [MONSTERS.tomb_robber, MONSTERS.tukata],
        connections: ['korriban_landing', 'tomb_ajunta_pall', 'tomb_tulak_hord', 'tomb_marka_ragnos']
    },
    'tomb_ajunta_pall': {
        id: 'tomb_ajunta_pall',
        name: 'Гробница Аджунты Полла',
        planet: 'Коррибан',
        planetId: 'korriban',
        description: 'Последнее пристанище самого первого Темного Лорда Ситхова. Внутри таится древнее зло и ловушки.',
        image: 'public/assets/locations/korriban/ajunta_pall_bg.png',
        isSafeZone: false,
        monsters: [MONSTERS.tomb_guardian, MONSTERS.tukata_alpha],
        connections: ['korriban_valley']
    },
    'tomb_tulak_hord': {
        id: 'tomb_tulak_hord',
        name: 'Гробница Тулака Хорда',
        planet: 'Коррибан',
        planetId: 'korriban',
        description: 'Место покоя легендарного мастера светового меча. Только сильнейшие переживут встречу с его приспешниками.',
        image: 'public/assets/locations/korriban/tulak_hord_bg.png',
        isSafeZone: false,
        monsters: [MONSTERS.sith_assassin, MONSTERS.hord_blademaster],
        connections: ['korriban_valley']
    },
    'tomb_marka_ragnos': {
        id: 'tomb_marka_ragnos',
        name: 'Гробница Марки Рагноса',
        planet: 'Коррибан',
        planetId: 'korriban',
        description: 'Усыпальница правителя Золотого века Ситхов. Здесь скрыты самые могущественные и темные артефакты.',
        image: 'public/assets/locations/korriban/marka_ragnos_bg.png',
        isSafeZone: false,
        monsters: [MONSTERS.dark_jedi, MONSTERS.ragnos_spirit],
        connections: ['korriban_valley']
    },
    'korriban_shyrack': {
        id: 'korriban_shyrack',
        name: 'Пещера Шираков',
        planet: 'Коррибан',
        planetId: 'korriban',
        description: 'Эти темные пещеры кишат опасными крылатыми хищниками, нападающими на любого, кто потревожит их сон.',
        isSafeZone: false,
        monsters: [MONSTERS.shyrack, MONSTERS.alpha_shyrack],
        connections: ['korriban_landing']
    },
    //ПЛАНЕТА: ДАНТУИН
    // ==========================================
    'dantooine_courtyard': {
        id: 'dantooine_courtyard',
        name: 'Внутренний двор Анклава',
        planet: 'Дантуин',
        planetId: 'dantooine',
        description: 'Некогда величественный двор перед входом в Анклав. Сейчас здесь царит тишина, прерываемая только ветром.',
        isSafeZone: true,
        monsters: [],
        connections: ['dantooine_enclave', 'dantooine_farmlands', 'dantooine_crystal_caves']
    },
    'dantooine_enclave': {
        id: 'dantooine_enclave',
        name: 'Анклав Джедаев',
        planet: 'Дантуин',
        planetId: 'dantooine',
        description: 'Руины старого места обучения Джедаеву. Ощущается сильное наличие светлой стороны Силы.',
        isSafeZone: true,
        monsters: [],
        connections: ['dantooine_courtyard', 'dantooine_meditation', 'dantooine_padawan', 'dantooine_knowledge']
    },
    'dantooine_meditation': {
        id: 'dantooine_meditation',
        name: 'Зал медитации',
        planet: 'Дантуин',
        planetId: 'dantooine',
        description: 'Тихое и спокойное место. Джедаи приходят сюда, чтобы медитировать и восстанавливать связь со светлой стороной.',
        isSafeZone: true,
        monsters: [],
        connections: ['dantooine_enclave']
    },
    'dantooine_padawan': {
        id: 'dantooine_padawan',
        name: 'Найти Падавана',
        planet: 'Дантуин',
        planetId: 'dantooine',
        description: 'Пропавший падаван мог оставить следы где-то в этих стенах. Будьте внимательны.',
        isSafeZone: false,
        monsters: [MONSTERS.rogue_droid],
        connections: ['dantooine_enclave']
    },
    'dantooine_knowledge': {
        id: 'dantooine_knowledge',
        name: 'Источник известен',
        planet: 'Дантуин',
        planetId: 'dantooine',
        description: 'Руины старой библиотеки анклава. Некоторые голокроны могли уцелеть.',
        isSafeZone: true,
        monsters: [],
        connections: ['dantooine_enclave']
    },
    'dantooine_crystal_caves': {
        id: 'dantooine_crystal_caves',
        name: 'Кристальные пещеры',
        planet: 'Дантуин',
        planetId: 'dantooine',
        description: 'Таинственные пещеры, где растут кайбер-кристаллы. Здесь водятся опасные создания - кинраты.',
        isSafeZone: false,
        monsters: [MONSTERS.kinrath, MONSTERS.poison_kinrath],
        connections: ['dantooine_courtyard']
    },
    'dantooine_farmlands': {
        id: 'dantooine_farmlands',
        name: 'Фермерские угодья',
        planet: 'Дантуин',
        planetId: 'dantooine',
        description: 'Обширные равнины, где местные фермеры выращивают урожай. Иногда здесь бесчинствуют мандалорские наемники или дикие собаки хаунды.',
        isSafeZone: false,
        monsters: [MONSTERS.kath_hound, MONSTERS.mandalorian_mercenary],
        connections: ['dantooine_courtyard']
    }
};
