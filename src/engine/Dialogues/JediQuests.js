import { Notifications } from '../../ui/Notifications.js';
import { DialogManager } from './DialogManager.js';

export class JediQuests {
    static interactWithVandar(player) {
        if (!player.quests) player.quests = {};

        //Предохранитель: Если игрок Контрабандист или Джедай, но старый маркер 'sith_initiation'
        if (player.quests.sith_initiation === 'completed' && player.title !== 'Претендент') {
            delete player.quests.sith_initiation;
            player.save();
        }

        //Блокируем, если игрок уже стал Ситхом
        if (player.quests.sith_initiation === 'completed') {
            DialogManager.showNpcModal(
                "Мастер Вандар Токаре",
                "Я чувствую у тебя много гнева и ненависти. Темная сторона полностью овладела тебе. Тебя здесь не место.",
                [{ text: "Уйти прочь", isPrimary: true, onClick: () => { } }],
                'jedi'
            );
            return;
        }

        //1. Квест Юнлинга (initiation)
        const initQuestState = player.quests.jedi_initiation || 'not_started';

        if (initQuestState === 'not_started') {
            DialogManager.showNpcModal(
                "Мастер Вандар Токаре",
                "Поздравляю тебя. Испытываю у тебя большой потенциал, но сила нуждается в равновесии. Найдите 1000 очков Светлой стороны, и я признаю тебя как Юнлинг.",
                [
                    { text: "Меня не интересует Мир", onClick: () => { } },
                    {
                        text: "Я выполню это, Мастер", isPrimary: true, onClick: () => {
                            player.quests.jedi_initiation = 'active';
                            delete player.quests.sith_initiation;
                            player.save();
                            Notifications.show('Получена новая задача: Получить 1000 очков Светлой стороны!', 'success');
                        }
                    }
                ],
                'jedi'
            );
            return;
        } else if (initQuestState === 'active') {
            if (player.alignment >= 1000) {
                DialogManager.showNpcModal(
                    "Мастер Вандар Токаре",
                    "Ты доказал свою преданность Свете. Пусть Сила будет с тобой. Отныне ты - Юнлинг.",
                    [
                        {
                            text: "Спасибо, Мастер", isPrimary: true, onClick: () => {
                                if (player.quests.jedi_initiation === 'completed') return;

                                player.quests.jedi_initiation = 'completed';
                                player.title = 'Юнлинг';
                                player.money += 50000;
                                player.xp += 5000;
                                player.save();
                                Notifications.show('Титул получен: Юнлинг!', 'success');
                            }
                        }
                    ],
                    'jedi'
                );
            } else {
                DialogManager.showNpcModal(
                    "Мастер Вандар Токаре",
                    `Тебе нужно 1000 очков Света. Сейчас у тебя:${player.alignment > 0 ? player.alignment : 0}.`,
                    [{ text: "я понял", isPrimary: true, onClick: () => { } }],
                    'jedi'
                );
            }
            return;
        }

        //2. Квест Падавана (padawan) – Только для Юнглингов
        if (initQuestState === 'completed' && player.title === 'Юнлинг') {
            let padawanQuestState = player.quests.jedi_padawan || 'not_started';

            //Ретроактивный фикс: Если игрок уже был Падаваном, но упал к Контрабандисту,
            //а затем снова стал Юнлингом, его квест "jedi_padawan" мог остаться 'completed'.
            //Это ломало логику, Вандар ничего не делал. Сбрасываем его.
            if (padawanQuestState === 'completed') {
                padawanQuestState = 'not_started';
                delete player.quests.jedi_padawan;
                player.save();
            }

            if (padawanQuestState === 'not_started') {
                DialogManager.showNpcModal(
                    "Мастер Вандар Токаре",
                    "Ты готов продолжить свое обучение, Юнлинг? Следующий шаг - создание собственного светового клинка. Это самый важный момент в жизни джедая.",
                    [
                        { text: "Я еще не готов", onClick: () => { } },
                        {
                            text: "Я готов, Мастер", isPrimary: true, onClick: () => {
                                player.quests.jedi_padawan = 'active';
                                player.save();
                                Notifications.show('Получена задача: Падаван (15000 Света + Меч)', 'success');
                            }
                        }
                    ],
                    'jedi'
                );
            } else if (padawanQuestState === 'active') {
                //Проверка условий: 15000 света и наличие меча в экипировке или инвентаре
                const hasLight = player.alignment >= 15000;
                
                const isCraftedSaber = (id) => id.startsWith('lightsaber_') && !['lightsaber_hilt', 'lightsaber_casing'].includes(id);
                const hasSaber = player.inventory.some(i => isCraftedSaber(i.id)) || 
                                 (player.equipment.weapon1 && isCraftedSaber(player.equipment.weapon1.id));

                if (hasLight && hasSaber) {
                    DialogManager.showNpcModal(
                        "Мастер Вандар Токаре",
                        "Ты сотворил свой меч и укрепил свою связь со Светом. Я горд назвать тебя Подаваном Ордена Джедаев.",
                        [
                            {
                                text: "Служу Ордену", isPrimary: true, onClick: () => {
                                    if (player.quests.jedi_padawan === 'completed') return;

                                    player.quests.jedi_padawan = 'completed';
                                    player.title = 'Падаван';
                                    player.forcePoints = player.maxForcePoints; //Сила возникает при получении титула.
                                    player.money+=100000;
                                    player.xp+=15000;
                                    player.save();
                                    Notifications.show('Титул получен: Падаван!', 'success');
                                }
                            }
                        ],
                        'jedi');
                } else {
                    let msg = "Ты еще не готов.";
                    if (!hasLight) msg += `Тебе нужно 15000 очков Света (сейчас:${player.alignment}). `;
                    if(!hasSaber) msg += "Тебе нужно создать свой первый световой меч.";
                    
                    DialogManager.showNpcModal(
                        "Мастер Вандар Токаре",
                        msg,
                        [{ text: "Я продолжу обучение", isPrimary: true, onClick: () => { } }],'jedi');
                }
            } else {
                DialogManager.showNpcModal(
                    "Мастер Вандар Токаре",
                    "Пусть прибудет с тобой Сила, Падаване.",
                    [{text: "Отойти", isPrimary: true, onClick: () => { } }],'jedi');
            }
        }

        //3. Квест Джедая (jedi_knight) – только для Падаванов
        if (player.quests.jedi_padawan ==='completed' && player.title === 'Падаван') {
            let knightQuestState = player.quests.jedi_knight || 'not_started';

            if (knightQuestState === 'not_started') {
                    DialogManager.showNpcModal(
                        "Мастер Вандар Токаре",
                        "Ты достиг значительного прогресса, Подава. Последнее испытание перед тем, как ты станешь Джедаем, проверит твою преданность Мира и глубокое понимание нашей философии. Тебя нужно достичь 50 000 очков Светлой Стороны. древний Кодекс Джедаев.",

                        [
                            { text:"Я еще не готов", onClick: () => { } },
                            { text: "Я не подведу вас", isPrimary: true, onClick: () => {
                                player.quests.jedi_knight = 'active';
                                player.save();
                                Notifications.show('Получены задания: Испытание Джедая (50000 Света + Кодекс)', 'success');
                            } }
                        ],
                        'jedi'
                    );
                } else if (knightQuestState === 'active') {
                    const hasLight = player.alignment >= 50000;
                    const knowsCode = player.quests.jedi_code_learned === true;

                    if (hasLight && knowsCode) {
                        DialogManager.showNpcModal("Мастер Вандар Токаре",
                            "Я чувствую, что ты готов. Мир мощно течет сквозь тебя, и ты прикоснулся к древней мудрости. Давай проверим, действительно ли ты усвоил Кодекс Джедаев. Готов начать?",
                            [
                                { text: "Я готов, Мастер", isPrimary: true, onClick: () => this.startJediQuiz(player) },
                                { text: "Мне нужно время", onClick: () => {} }
                            ],'jedi');
                    } else {
                        let msg = "Ты еще не готов к окончательному испытанию.";
                        if (!hasLight) msg += `Тебе нужно 50 000 очков Света (сейчас:${Math.max(0, player.alignment)}). `;
                        if (!knowsCode) msg +="Тебя нужно расшифровать Холокрон Джедаев в Библиотеке Дантуина, чтобы изучить Кодекс. Собери фрагменты в гробницах Коррибана.";
                        
                        DialogManager.showNpcModal(
                            "Мастер Вандар Токаре",
                            msg,
                            [{ text: "Я продолжу подготовку", isPrimary: true, onClick: () => { } }],'jedi');
                    }
                } else {
                    DialogManager.showNpcModal(
                        "Мастер Вандар Токаре",
                        "Мир с тобой, Джедай. Ты - надежда Ордена.",
                        [{ text: "Спасибо, Мастер", isPrimary: true, onClick: () => { } }],'jedi');
                }
            }
        }

    static startJediQuiz(player) {
        DialogManager.showNpcModal("Мастер Вандар Токаре",
            "Первая строчка кодекса. Что мы ставим против эмоций?",
            [
                { text: "Не эмоции, а спокойствие", isPrimary: true, onClick: () => this.jediQuizStep2(player) },
                { text: "Не эмоции, а сила", onClick: () => this.failJediQuiz() }
            ],'jedi');
    }

    static jediQuizStep2(player) {
        DialogManager.showNpcModal(
            "Мастер Вандар Токаре",
            "Верно. Вторая строчка. Что заменяет неведение?",
            [
                { text: "Не незнание, а страсть", onClick: () => this.failJediQuiz() },
                { text: "Не незнание, а знание", isPrimary: true, onClick: () => this.jediQuizStep3(player) }
            ],'jedi');
    }

    static jediQuizStep3(player) {
        DialogManager.showNpcModal(
            "Мастер Вандар Токаре",
            "Хорошо. Третья строчка. Что является противоположностью страсти?",
            [
                { text: "Не страсть, а беззаботность", isPrimary: true, onClick: () => this.jediQuizStep4(player) },
                { text: "Не страсть, а контроль", onClick: () => this.failJediQuiz() }
            ],'jedi');
    }

    static jediQuizStep4(player) {
        DialogManager.showNpcModal(
            "Мастер Вандар Токаре",
            "Да. Четвертая строчка касается хаоса. Какой правильный ответ?",
            [
                { text: "Не хаос, а порядок", onClick: () => this.failJediQuiz() },
                { text: "Не хаос, а гармония", isPrimary: true, onClick: () => this.jediQuizStep5(player) }
            ],'jedi');
    }

    static jediQuizStep5(player) {
        DialogManager.showNpcModal(
            "Мастер Вандар Токаре",
            "И последняя, самая важная срока. Что мы признаем перед лицом смерти?",
            [
                { text: "Не смерть, а Сила", isPrimary: true, onClick: () => this.finishJediQuiz(player) },
                { text: "Не смерть, а вечность", onClick: () => this.failJediQuiz() }
            ],'jedi');
    }

    static failJediQuiz() {
        DialogManager.showNpcModal(
            "Мастер Вандар Токаре",
            "Ты ошибся. Твой разум затуманен. Возвращайся к медитациям и попробуй снова, когда успокоишь свои мысли.",
            [{ text: "Я понял", isPrimary: true, onClick: () => { } }],'jedi');
    }

    static finishJediQuiz(player) {
        if (player.quests.jedi_knight ==='completed') return; 

        player.quests.jedi_knight = 'completed';
        player.title = 'Джедай';
        player.forcePoints = player.maxForcePoints; 
        player.money+=250000;
        player.xp+=50000;
        player.save();
        Notifications.show('Титул получен: Джедай! Ваш н\'связь с Силой усилился!', 'success');

        DialogManager.showNpcModal("Мастер Вандар Токаре",
            "Твои ответы безупречны. Ты не просто прочел слова, ты понял их суть. Отныне ты - Джедай. Защищай Республику и неси Мир в самые темные уголки галактики.",
            [{ text: "Пусть прибудет с вами Сила, Мастер", isPrimary: true, onClick: () => {} }],
            'jedi'
        );
    }
}
