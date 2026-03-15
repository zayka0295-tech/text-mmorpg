import { Notifications } from '../../ui/Notifications.js';
import { DialogManager } from './DialogManager.js';

export class SithQuests {
    static interactWithHarkun(player) {
        if (!player.quests) player.quests = {};

        //Предохранитель: Если игрок имеет контрабандист или ситх, но имеет старый маркер 'jedi_initiation'
        if (player.quests.jedi_initiation === 'completed' && player.title !== 'Юнлинг') {
            delete player.quests.jedi_initiation;
            player.save();
        }

        //Блокируем, если игрок уже стал Джедаем (прошёл их линию и имеет их титул)
        if (player.quests.jedi_initiation === 'completed') {
            DialogManager.showNpcModal(
                "Наблюдатель Харкун",
                "Ты воняешь Миром, раб джедаев. Убирайся прочь, пока я тебя не уничтожил!",
                [
                    { text: "Уйти прочь", isPrimary: true, onClick: () => { } }
                ]
            );
            return;
        }

        const questState = player.quests.sith_initiation || 'not_started';

        if (questState === 'not_started') {
            DialogManager.showNpcModal(
                "Наблюдатель Харкун",
                "Ты жалкий червь. Но, может быть, у тебя есть искра Темной стороны. Докажи это! Приобрести 1000 очков Темной стороны.",
                [
                    { text: "Я не покину Свет", onClick: () => { } },
                    {
                        text: "Я согласен", isPrimary: true, onClick: () => {
                            player.quests.sith_initiation = 'active';
                            //Удаляем квест второй фракции, если он был, но не выполнен
                            delete player.quests.jedi_initiation;
                            player.save();
                            Notifications.show('Получена новая задача: Получить 1000 баллов Темной стороны!', 'success');
                        }
                    }
                ]
            );
        } else if (questState === 'active') {
            if (player.alignment <= -1000) {
                DialogManager.showNpcModal(
                    "Наблюдатель Харкун",
                    "Ты действительно достоин называться Ситхом. Теперь ты - Претендент!",
                    [
                        {
                            text: "Принять силу", isPrimary: true, onClick: () => {
                                if (player.quests.sith_initiation === 'completed') return;

                                player.quests.sith_initiation = 'completed';
                                player.title = 'Претендент'; //Даем титул
                                player.money += 50000;
                                player.xp += 5000;
                                player.save();

                                Notifications.show('Задание выполнено! Получен титул "Претендент", 50 000 кр. и 5000 XP.', 'success');
                            }
                        }
                    ]
                );
            } else {
                const currentDarkPoints = player.alignment < 0 ? Math.abs(player.alignment) : 0;
                DialogManager.showNpcModal(
                    "Наблюдатель Харкун",
                    `Твое могущество ничтожно! Возвращайся, если у тебя будет хотя бы 1000 очков темной стороны. Сейчас у тебя их только:${currentDarkPoints}.`,
                    [
                        { text: "я понял", isPrimary: true, onClick: () => { } }
                    ]
                );
            }
        } else if (questState === 'completed') {
            const acolyteState = player.quests.sith_acolyte_trials || 'not_started';

            if (acolyteState === 'not_started') {
                DialogManager.showNpcModal(
                    "Наблюдатель Харкун",
                    "Претендент, ты выжил, и это уже что-то. Но чтобы стать настоящим Аколитом, тебе нужно оружие, достойное Ситха. Отправься в Печеру Шираков, раздобудь красный кайбер-кристалл, собери световой меч и докажи свою преданность Темной стороне (15000 очков).",
                    [
                        {
                            text: "Я выполню это, Смотритель", isPrimary: true, onClick: () => {
                                player.quests.sith_acolyte_trials = 'active';
                                player.save();
                                Notifications.show('Получена новая задача: Путь Аколита!', 'success');
                            }
                        },
                        {
                            text: "Я еще не готов", onClick: () => { }
                        }
                    ]
                );
            } else if (acolyteState === 'active') {
                const hasRedSaber = player.inventory.some(i => i.id === 'lightsaber_red') || 
                                    (player.equipment.weapon1 && player.equipment.weapon1.id === 'lightsaber_red');

                if (player.alignment <= -15000 && hasRedSaber) {
                    DialogManager.showNpcModal(
                        "Наблюдатель Харкун",
                        "Прекрасно... Я чувствую темноту, пульсирующую в твоем клине. Ты доказал свое достоинство. Теперь ты - Аколит Ситхов!",
                        [
                            {
                                text: "Моя жизнь принадлежит Ордену", isPrimary: true, onClick: () => {
                                    if (player.quests.sith_acolyte_trials === 'completed') return;

                                    player.quests.sith_acolyte_trials = 'completed';
                                    player.title = 'Аколит';
                                    player.money += 100000;
                                    player.xp += 15000;
                                    player.save();
                                    
                                    Notifications.show('Задание выполнено! Получен титул "Аколит", 100 000 кр. и 15000 XP.', 'success');
                                }
                            }
                        ]
                    );
                } else {
                    const currentDarkPoints = player.alignment < 0 ? Math.abs(player.alignment) : 0;
                    DialogManager.showNpcModal(
                        "Наблюдатель Харкун",
                        `Ты еще не готов!${!hasRedSaber ? 'Где красный твой меч?' : ''}Тебя нужно 15000 очков Темной стороны, а сейчас у тебя только${currentDarkPoints}. Не разочаровывай меня!`,
                        [
                            { text: "Я вернусь позже", isPrimary: true, onClick: () => { } }
                        ]
                    );
                }
            } else if (acolyteState === 'completed') {
                let apprenticeQuestState = player.quests.sith_apprentice || 'not_started';

                if (apprenticeQuestState === 'not_started') {
                    DialogManager.showNpcModal(
                        "Наблюдатель Харкун",
                        "Ты выжил как Аколит, поздравляю. Но это только начало. Чтобы стать настоящим ситхом, ты должен доказать свою абсолютную безжалостность. Приобрести 50,000 очков Темной стороны. Также отправляйся в Большую Библиотеку и расшифруй Голокрон Ситхов. Возвращайся, только когда поймешь наш Кодекс.",
                        [
                            { text: "Я еще не готов", onClick: () => { } },
                            {
                                text: "Я не подведу Орден", isPrimary: true, onClick: () => {
                                    player.quests.sith_apprentice = 'active';
                                    player.save();
                                    Notifications.show('Получены задания: Ситх (50000 Тьмы + Кодекс)', 'success');
                                }
                            }
                        ]
                    );
                } else if (apprenticeQuestState === 'active') {
                    const hasDark = player.alignment <= -50000;
                    const knowsCode = player.quests.sith_code_learned === true;

                    if (hasDark && knowsCode) {
                        DialogManager.showNpcModal(
                            "Наблюдатель Харкун",
                            "Твоя ненависть пылает... я это чувствую. Ты понял слово старых лордов. Но понимаешь ли ты их подлинное значение? Проверим твое знание Кодекса Ситхов. Готов?",
                            [
                                { text: "Готов начать", isPrimary: true, onClick: () => this.startSithQuiz(player) },
                                { text: "Дайте мне еще время", onClick: () => { } }
                            ]
                        );
                    } else {
                        let msg = "Ты еще слаб!";
                        if (!hasDark) msg += `Тебя нужно 50 000 очков Темной стороны (сейчас:${Math.abs(Math.min(0, player.alignment))}). `;
                        if (!knowsCode) msg += "Тебя нужно расшифровать Холокроном Ситховом в Большой Библиотеке. Собери фрагменты из гробниц.";
                        
                        DialogManager.showNpcModal(
                            "Наблюдатель Харкун",
                            msg,
                            [{ text: "Я исправлю это", isPrimary: true, onClick: () => { } }]
                        );
                    }
                } else {
                    DialogManager.showNpcModal(
                        "Наблюдатель Харкун",
                        "Мир принадлежит Ситхам. Уничтожай всех, кто встанет на твоем пути.",
                        [{ text: "Так и будет", isPrimary: true, onClick: () => { } }]
                    );
                }
            }
        }
    }

    static startSithQuiz(player) {
        DialogManager.showNpcModal("Наблюдатель Харкун",
            "Первая строчка нашего Кодекса. Что есть ложь и что есть на самом деле?",
            [
                { text: "Комната - это ложь, есть только страсть", isPrimary: true, onClick: () => this.sithQuizStep2(player) },
                { text: "Эмоции - это ложь, есть только сила", onClick: () => this.failSithQuiz() }
            ]
        );
    }

    static sithQuizStep2(player) {
        DialogManager.showNpcModal(
            "Наблюдатель Харкун",
            "Верно. Вторая строчка. Что дает нам страсть?",
            [
                { text: "Из-за страсти я получаю могущество", onClick: () => this.failSithQuiz() },
                { text: "Из-за страсти я получаю силу", isPrimary: true, onClick: () => this.sithQuizStep3(player) }
            ]
        );
    }

    static sithQuizStep3(player) {
        DialogManager.showNpcModal(
            "Наблюдатель Харкун",
            "Вот именно. Третья строчка. Что приносит сила?",
            [
                { text: "Через силу я получаю власть", isPrimary: true, onClick: () => this.sithQuizStep4(player) },
                { text: "Через силу я одерживаю победу", onClick: () => this.failSithQuiz() }
            ]
        );
    }

    static sithQuizStep4(player) {
        DialogManager.showNpcModal(
            "Наблюдатель Харкун",
            "Да. Четвертая строчка. К чему ведет власть?",
            [
                { text: "Через власть я получаю контроль", onClick: () => this.failSithQuiz() },
                { text: "Через власть я одерживаю победу", isPrimary: true, onClick: () => this.sithQuizStep5(player) }
            ]
        );
    }

    static sithQuizStep5(player) {
        DialogManager.showNpcModal(
            "Наблюдатель Харкун",
            "И последнее... пятая строчка. Что происходит из-за победы?",
            [
                { text: "Из-за победы мои оковы разорвутся", isPrimary: true, onClick: () => this.sithQuizStep6(player) },
                { text: "Из-за победы я уничтожу слабых", onClick: () => this.failSithQuiz() }
            ]
        );
    }

    static sithQuizStep6(player) {
        DialogManager.showNpcModal(
            "Наблюдатель Харкун",
            "И как кончается Кодекс?",
            [
                { text: "Сила уволит меня.", isPrimary: true, onClick: () => this.finishSithQuiz(player) },
                { text: "Темная Сторона освободит меня.", onClick: () => this.failSithQuiz() }
            ]
        );
    }

    static finishSithQuiz(player) {
        DialogManager.showNpcModal(
            "Наблюдатель Харкун",
            "Ты доказал свою безжалостность и понимание истинного пути Ситхов. Теперь ты - Ситх.",
            [
                {
                    text: "Мои оковы разорваны.", isPrimary: true, onClick: () => {
                        if (player.quests.sith_apprentice ==='completed') return;

                        player.quests.sith_apprentice = 'completed';
                        player.title='Ситх';
                        player.money+=250000;
                        player.xp+=50000;
                        player.save();
                        
                        Notifications.show('Титул получен: Ситх! Вы получили 250 000 кр. и 50 000 XP.', 'success');
                    }
                }
            ]
        );
    }

    static failSithQuiz() {
        DialogManager.showNpcModal("Наблюдатель Харкун",
            "Жаль! Ты не понимаешь нашу природу. Слабость не прощается. Уходи, пока я тебя не уничтожил, и возвращайся, когда изучишь Кодекс!",
            [{ text: "Я не подведу вас в следующий раз", isPrimary: true, onClick: () => { } }]
        );
    }
}
