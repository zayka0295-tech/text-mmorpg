export const JOBS = {
    'spice_miner': {
        id: 'spice_miner',
        title: 'Шахтер спайса',
        title_uk: 'Шахтер спайса',
        title_ru: 'Шахтер спайса',
        title_en: 'Spice Miner',
        desc: 'Опасный труд в подземных приисках. Хорошо оплачивается, но оставляет след на душе.',
        desc_uk: 'Опасный труд в подземных приисках. Хорошо оплачивается, но оставляет след на душе.',
        desc_ru: 'Опасная работа в подземных шахтах. Хорошо оплачивается, но оставляет след в душе.',
        desc_en: 'Dangerous work in the underground mines. Well paid, but leaves a mark on the soul.',
        timeMs: 15 * 60 * 1000,
        timeText: '15 мин',
        bgImage: '/public/assets/jobs/spice_miner_bg.png',
        rewards: {
            credits: 2500,
            xp: 1000,
            alignment: -250
        },
        planet: 'coruscant'
    },
    'scavenger': {
        id: 'scavenger',
        title: 'Мусорщик / Сборщик лома',
        title_uk: 'Мусорщик / Сборщик лома',
        title_ru: 'Мусорщик / Сборщик металлолома',
        title_en: 'Scavenger / Scrap Collector',
        desc: 'Безопасная, но грязная работа по сбору лома на нижних уровнях.',
        desc_uk: 'Безопасная, но грязная работа по сбору лома на нижних уровнях.',
        desc_ru: 'Безопасная, но грязная работа по сбору лома на нижних уровнях.',
        desc_en: 'Safe, but dirty work collecting scrap on the lower levels.',
        timeMs: 15 * 60 * 1000,
        timeText: '15 мин',
        bgImage: '/public/assets/jobs/scavenger_bg.png',
        rewards: {
            credits: 500,
            xp: 100,
            alignment: 0
        },
        planet: 'coruscant'
    },
    'moisture_farmer': {
        id: 'moisture_farmer',
        title: 'Фермер-влагодобытчик',
        title_uk: 'Фермер-влагодобытчик',
        title_ru: 'Влагодобытчик',
        title_en: 'Moisture Farmer',
        desc: 'Классический монотонный труд на специальных гидрофермах. Долго, но надежно.',
        desc_uk: 'Классический монотонный труд на специальных гидрофермах. Долго, но надежно.',
        desc_ru: 'Классический монотонный труд на гидрофермах. Долго, но надежно.',
        desc_en: 'Classic monotonous work on specialized hydro-farms. Long, but reliable.',
        timeMs: 15 * 60 * 1000,
        timeText: '15 мин',
        rewards: {
            credits: 5000,
            xp: 250,
            alignment: 0
        },
        planet: 'tatooine'
    },
    'medic': {
        id: 'medic',
        title: 'Медик',
        title_uk: 'Медик',
        title_ru: 'Медик',
        title_en: 'Medic',
        desc: 'Помощь раненым гражданам в клиниках для бедноты. Благородное дело.',
        desc_uk: 'Помощь раненым гражданам в клиниках для бедноты. Благородное дело.',
        desc_ru: 'Помощь раненым гражданам в клиниках для бедняков. Благородное дело.',
        desc_en: 'Helping wounded citizens in clinics for the poor. A noble cause.',
        timeMs: 15 * 60 * 1000,
        timeText: '15 мин',
        bgImage: '/public/assets/jobs/medic_bg.png',
        rewards: {
            credits: 100,
            xp: 500,
            alignment: 250
        },
        planet: 'coruscant'
    },
    // === TATOOINE JOBS ===
    'tatooine_smuggler': {
        id: 'tatooine_smuggler',
        title: 'Контрабандист Джабби',
        title_uk: 'Контрабандист Джабби',
        title_ru: 'Контрабандист Джаббы',
        title_en: 'Jabba\'s Smuggler',
        desc: 'Доставка нелегального груза мимо патрулей Республики. Рискованно и не совсем честно.',
        desc_uk: 'Доставка нелегального груза мимо патрулей Республики. Рискованно и не совсем честно.',
        desc_ru: 'Доставка нелегального груза мимо патрулей Республики. Рискованно и не совсем честно.',
        desc_en: 'Delivering illegal cargo past Republic patrols. Risky and not entirely honest.',
        timeMs: 15 * 60 * 1000,
        timeText: '15 мин',
        rewards: {
            credits: 5000,
            xp: 750,
            alignment: -150 //Темная сторона
        },
        planet: 'tatooine'
    },
    'tatooine_escort': {
        id: 'tatooine_escort',
        title: 'Охранник каравана',
        title_uk: 'Охранник каравана',
        title_ru: 'Охранник каравана',
        title_en: 'Caravan Guard',
        desc: 'Защита торговцев от нападений Тускенских рейдеров при переходе через Дюнне Море.',
        desc_uk: 'Защита торговцев от нападений Тускенских рейдеров при переходе через Дюнне Море.',
        desc_ru: 'Защита торговцев от нападений тускенских рейдеров при переходе через Дюнное Море.',
        desc_en: 'Protecting merchants from Tusken Raider attacks while crossing the Dune Sea.',
        timeMs: 15 * 60 * 1000,
        timeText: '15 мин',
        rewards: {
            credits: 1500,
            xp: 1500,
            alignment: 150 //Светлая сторона
        },
        planet: 'tatooine'
    },
    'tatooine_moisture_farmer': {
        id: 'tatooine_moisture_farmer',
        title: 'Помощник на влагоферме',
        title_uk: 'Помощник на влагоферме',
        title_ru: 'Помощник на влагоферме',
        title_en: 'Moisture Farm Assistant',
        desc: 'Ремонт испарителей воды под палящим двойным солнцем. Трудный, но безопасный труд.',
        desc_uk: 'Ремонт испарителей воды под палящим двойным солнцем. Трудный, но безопасный труд.',
        desc_ru: 'Ремонт влагоиспарителей под палящим двойным солнцем. Тяжелый, но безопасный труд.',
        desc_en: 'Repairing moisture vaporators under the scorching twin suns. Hard but safe work.',
        timeMs: 15 * 60 * 1000,
        timeText: '15 мин',
        rewards: {
            credits: 2000,
            xp: 500,
            alignment: 0
        },
        planet: 'tatooine'
    },
    'tatooine_mechanic': {
        id: 'tatooine_mechanic',
        title: 'Механик подрейсеров',
        title_uk: 'Механик подрейсеров',
        title_ru: 'Механик подов',
        title_en: 'Podracer Mechanic',
        desc: 'Настройка опасных гоночных машин. Требует точности, в противном случае пилот может погибнуть.',
        desc_uk: 'Настройка опасных гоночных машин. Требует точности, в противном случае пилот может погибнуть.',
        desc_ru: 'Настройка опасных гоночных машин. Требует точности, иначе пилот может погибнуть.',
        desc_en: 'Tuning dangerous racing machines. Requires precision, or the pilot could die.',
        timeMs: 15 * 60 * 1000,
        timeText: '15 мин',
        rewards: {
            credits: 3500,
            xp: 800,
            alignment: 0
        },
        planet: 'tatooine'
    },
    'tatooine_junk_collector': {
        id: 'tatooine_junk_collector',
        title: 'Собиратель металлолома',
        title_uk: 'Собиратель металлолома',
        title_ru: 'Сборщик металлолома',
        title_en: 'Junk Collector',
        desc: 'Поиск уцелевших деталей в разбитых кораблях среди пустырей. Осторожно, там водятся полый вомп.',
        desc_uk: 'Поиск уцелевших деталей в разбитых кораблях среди пустырей. Осторожно, там водятся полый вомп.',
        desc_ru: 'Поиск уцелевших деталей в разбитых кораблях посреди Пустошей. Осторожно, там водятся полый вомп.',
        desc_en: 'Searching for intact parts in crashed ships in the Wastes. Careful, womp rats live there.',
        timeMs: 15 * 60 * 1000,
        timeText: '15 мин',
        rewards: {
            credits: 1000,
            xp: 1200,
            alignment: 0
        },
        planet: 'tatooine'
    }
};
