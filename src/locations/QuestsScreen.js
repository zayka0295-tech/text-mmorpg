import { Notifications } from '../ui/Notifications.js';
import { QuestGenerator } from '../engine/System/QuestGenerator.js';

export class QuestsScreen {
    constructor(screenManager, player, saveManager) {
        this.screenManager = screenManager;
        this.player = player;
        this.saveManager = saveManager;
        this.container = document.getElementById('quests-screen');

        this._timerInterval = null;

        this.init();
    }

    init() {
        console.log('QuestsScreen initialized'); // Force update
        this.screenManager.subscribe('any', (screenId) => {
            if (screenId === 'quests-screen') {
                this.render();
                this._startTimer();
            } else {
                this._stopTimer();
            }
        });

        // Listen for quest rewards from server
        document.addEventListener('network:quest_result', (e) => {
            const { ok, error, profile, rewards } = e.detail;
            if (ok && profile) {
                // Update local state
                this.player.money = profile.money;
                this.player.xp = profile.xp;
                if (profile.quests) this.player.quests = profile.quests;
                if (profile.dailyQuests) this.player.dailyQuests = profile.dailyQuests;
                
                this.player._emit('money-changed');
                this.player._emit('xp-changed');
                
                // Re-render
                if (document.getElementById('quests-screen').classList.contains('active')) {
                    this.render();
                }

                if (rewards) {
                    Notifications.show(`Задание выполнено! +${rewards.money} кр., +${rewards.xp} XP`, 'success');
                }
            } else {
                Notifications.show(error || 'Ошибка выполнения задания', 'error');
            }
        });
    }

    render() {
        let html = `<div class="quests-layout" style="padding-bottom: 80px;">`;

        //--- Заголовок с таймером ---
        html += `
            <div style="text-align: center; margin-bottom: 20px; border-bottom: 3px solid #f1c40f; padding-bottom: 12px;">
                <h2 style="color: #f1c40f; font-size: 22px; text-transform: uppercase; margin: 0 0 8px 0;">
                    ${'ЕЖЕДНЕВНЫЕ ЗАДАНИЯ'}
                </h2>
                <div style="display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; color: #aaa;">
                    <span>🔄 ${'Обновление через:'}</span>
                    <span id="quest-reset-timer" style="
                        font-family: monospace; font-size: 14px; font-weight: 900;
                        color: #f1c40f; background: rgba(241,196,15,0.12);
                        padding: 2px 8px; border-radius: 4px;
                        border: 1px solid rgba(241,196,15,0.3); letter-spacing: 1px;
                    ">--:--:--</span>
                </div>
            </div>
        `;

        //--- Ежедневные квесты ---
        if (!this.player.dailyQuests || this.player.dailyQuests.length === 0) {
            html += `<div style="text-align: center; color: #aaa; margin-top: 50px;">${'Нет активных заданий...'}</div>`;
        } else {
            this.player.dailyQuests.forEach(quest => {
                const isDone = quest.isCompleted;
                const isClaimed = quest.isRewardClaimed;
                const progressPct = Math.min(100, Math.floor((quest.current / quest.target) * 100));

                let statusColor = '#e74c3c';
                if (isDone && !isClaimed) statusColor = '#f1c40f';
                if (isClaimed) statusColor = '#27ae60';

                html += `
                    <div class="quest-card" style="background: #fff; border: 4px solid #000; padding: 15px; margin-bottom: 15px; position: relative; overflow: hidden;">
                        <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 8px; background: ${statusColor};"></div>
                        <div style="padding-left: 15px;">
                            <h3 style="margin: 0 0 10px 0; font-size: 18px; color: #000; display: flex; justify-content: space-between; align-items: center;">
                                <span>${QuestGenerator.getDesc(quest)}</span>
                                <span style="font-size: 14px; font-weight: bold; color: ${statusColor};">${quest.current} / ${quest.target}</span>
                            </h3>
                            <div class="quest-progress-bg" style="width: 100%; height: 10px; background: #ddd; border: 1px solid #000; margin-bottom: 15px;">
                                <div class="quest-progress-fill" style="width: ${progressPct}%; height: 100%; background: ${statusColor}; transition: width 0.3s;"></div>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div class="quest-rewards" style="font-size: 12px; font-weight: bold; color: #2980b9;">
                                    ${'НАГРАДА:'} ${quest.reward.xp} XP | ${quest.reward.money}кр.
                                </div>
                `;

                if (isClaimed) {
                    html += `<div style="color: #27ae60; font-weight: 900; font-size: 14px;">${'ЗАВЕРШЕН'} ✅</div>`;
                } else if (isDone) {
                    html += `<button class="btn-claim-quest" data-id="${quest.id}" style="background: #f1c40f; color: #000; border: 2px solid #000; font-weight: bold; padding: 6px 12px; cursor: pointer; transition: 0.2s;">${'ПОЛУЧИТЬ НАГРАДУ'}</button>`;
                } else {
                    html += `<div style="color: #e74c3c; font-weight: bold; font-size: 12px;">${'В ПРОЦЕССЕ'} ⏳</div>`;
                }

                html += `
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        //--- Сторы-квесты ---
        const storyQuests = this.player.quests || {};
        const storyDefs = {
            sith_initiation: {
                title: 'Инициация Ситхов',
                desc: 'Надзиратель Харкун попросил тебя заработать 1000 очков Темной стороны.',
                giver: 'Наблюдатель Харкун',
                reward: 'Титул "Претендент" + 50000 кр. + 5 000 XP',
                progLabel: 'Темная сторона',
                getProgress: (player) => {
                    const pts = player.alignment < 0 ? Math.abs(player.alignment) : 0;
                    return { current: Math.min(pts, 1000), target: 1000 };
                }
            },
            sith_acolyte_trials: {
                title: 'Путь Аколита',
                desc: 'Собери свой первый красный световой меч и докажи свою преданность, заработай 15000 очков Темной стороны.',
                giver: 'Наблюдатель Харкун',
                reward: 'Титул "Аколит" + 100 000 кр. + 15 000 XP',
                progLabel: 'Темная сторона',
                getProgress: (player) => {
                    const pts = player.alignment < 0 ? Math.abs(player.alignment) : 0;
                    return { current: Math.min(pts, 15000), target: 15000 };
                },
                extraCondition: (player) => {
                    const hasRedSaber = player.inventory.some(i => i.id === 'lightsaber_red') || 
                                        (player.equipment.weapon1 && player.equipment.weapon1.id === 'lightsaber_red');
                    return hasRedSaber ? 'Меч создан' + ' ✅' : 'Нужен красный световой меч' + ' ❌';
                }
            },
            sith_apprentice: {
                title: 'Испытание Ситха',
                desc: 'Достигни 50000 очков Темной стороны и расшифруй Голокрон Ситхов в Большой Библиотеке.',
                giver: 'Наблюдатель Харкун',
                reward: 'Титул "Ситх" + 250 000 кр. + 50 000 XP',
                progLabel: 'Темная сторона',
                getProgress: (player) => {
                    const pts = player.alignment < 0 ? Math.abs(player.alignment) : 0;
                    return { current: Math.min(pts, 50000), target: 50000 };
                },
                extraCondition: (player) => {
                    return player.quests.sith_code_learned ? 'Кодекс Ситхов изучен' + ' ✅' : 'Расшифровать Холокрон' + ' ❌';
                }
            },
            jedi_initiation: {
                title: 'Путь к Свету',
                desc: 'Мастер Вандар Токаре попросил тебя заработать 1000 очков Светлой стороны.',
                giver: 'Мастер Вандар Токаре',
                reward: 'Титул "Юнлинг" + 50 000 кр. + 5 000 XP',
                progLabel: 'Светлая сторона',
                getProgress: (player) => {
                    const pts = player.alignment > 0 ? player.alignment : 0;
                    return { current: Math.min(pts, 1000), target: 1000 };
                }
            },
            jedi_padawan: {
                title: 'Путь Подаваемая',
                desc: 'Собери свой первый световой меч и достигни 15000 очков Светлой стороны.',
                giver: 'Мастер Вандар Токаре',
                reward: 'Титул "Падаван" + 100 000 кр. + 15 000 XP',
                progLabel: 'Светлая сторона',
                getProgress: (player) => {
                    const pts = player.alignment > 0 ? player.alignment : 0;
                    return { current: Math.min(pts, 15000), target: 15000 };
                },
                extraCondition: (player) => {
                    const hasSaber = player.inventory.some(i => i.id.startsWith('lightsaber_')) || 
                                     (player.equipment.weapon1 && player.equipment.weapon1.id.startsWith('lightsaber_'));
                    return hasSaber ? 'Меч создан' + ' ✅' : 'Нужен световой меч' + ' ❌';
                }
            },
            jedi_knight: {
                title: 'Испытание Джедая',
                desc: 'Достигни 50000 очков Светлой стороны, собери фрагменты Голокрона на Коррибане и расшифруй Кодекс в Библиотеке.',
                giver: 'Мастер Вандар Токаре',
                reward: 'Титул "Джедай" + 250 000 кр. + 50 000 XP',
                progLabel: 'Светлая сторона',
                getProgress: (player) => {
                    const pts = player.alignment > 0 ? player.alignment : 0;
                    return { current: Math.min(pts, 50000), target: 50000 };
                },
                extraCondition: (player) => {
                    return player.quests.jedi_code_learned ? 'Кодекс Джедаев изучен' + ' ✅' : 'Расшифровать Холокрон' + ' ❌';
                }
            }
        };

        //Фильтруем квесты: показываем активные или только что завершенные (до перезагрузки или специального действия)
        //Но пользователь просил скрыть исполненные. Потом показываем только 'active'.
        //ИЛИ показываем completed, но даем кнопку "Скрыть"?
        //Согласно запросу: "когда мы выполнили этот квест, чтобы он исчезал из списка" -> следовательно фильтруем 'completed'
        
        //Но есть нюанс: если мы просто скроем completed, игрок может не понять, что произошло.
        //Обычно квест висит как "Завершено" пока его не "сдадут" NPC.
        //У нас логика такова: NPC дает награду и ставит статус 'completed'.
        //То есть если статус «завершен», то награда уже получена. Ты можешь скрыться.

        const activeStory = Object.entries(storyQuests)
            .filter(([, state]) => state === 'active' || state === 'completed') //Показываем активные и готовые к сдаче
            .map(([id, state]) => {
                return { id, state, def: storyDefs[id] };
            })
            .filter(item => item.def); //Убираем неизвестные квесты

        if (activeStory.length > 0) {
            html += `
                <div style="margin-top: 28px; border-top: 3px solid #9b59b6; padding-top: 16px;">
                    <h2 style="color: #9b59b6; font-size: 22px; text-transform: uppercase; margin: 0 0 16px 0;
                               text-align: center; letter-spacing: 1px;">${'✨ СЮЖЕТНЫЕ ЗАДАНИЯ'}</h2>
            `;

            activeStory.forEach(({ state, def }) => {
                const prog = def.getProgress ? def.getProgress(this.player) : null;
                const progressPct = prog
                    ? Math.min(100, Math.floor((prog.current / prog.target) * 100))
                    : 0;
                
                const extraCond = def.extraCondition ? def.extraCondition(this.player) : null;

                html += `
                    <div class="quest-card" style="background:#fff;border:4px solid #9b59b6;padding:15px;margin-bottom:15px;position:relative;overflow:hidden;">
                        <div style="position:absolute;left:0;top:0;bottom:0;width:8px;background:#9b59b6;"></div>
                        <div style="padding-left:15px;">
                            <div style="font-size:11px;color:#9b59b6;font-weight:700;letter-spacing:1px;margin-bottom:4px;">${'СЮЖЕТНЫЙ КВЕСТ •'} ${def.giver}</div>
                            <h3 style="margin:0 0 6px 0;font-size:17px;color:#000;">${def.title}</h3>
                            <p style="margin:0 0 10px 0;font-size:13px;color:#555;">${def.desc}</p>
                            ${prog ? `
                            <div style="margin-bottom:10px;">
                                <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-bottom:4px;">
                                    <span>${'Прогресс'}</span>
                                    <span style="color:#9b59b6;">${prog.current} / ${prog.target}</span>
                                </div>
                                <div style="background:#eee;border:1px solid #000;height:10px;border-radius:3px;">
                                    <div style="background:#9b59b6;width:${progressPct}%;height:100%;border-radius:3px;transition:width 0.3s;"></div>
                                </div>
                            </div>` : ''}
                            
                            ${extraCond ? `<div style="font-size:12px;font-weight:bold;margin-bottom:10px;color:#333;">${'Дополнительно:'} ${extraCond}</div>` : ''}

                            <div style="display:flex;justify-content:space-between;align-items:center;">
                                <div style="font-size:12px;font-weight:700;color:#9b59b6;">${'НАГРАДА:'} ${def.reward}</div>
                                ${state === 'completed' 
                                    ? `<div style="color:#27ae60;font-weight:900;font-size:12px;">${'ГОТОВ К СДАЧЕ'} ✅</div>`
                                    : `<div style="color:#9b59b6;font-weight:900;font-size:12px;">${'В ПРОЦЕССЕ'} ⏳</div>`
                                }
                            </div>
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
        }

        html += `</div>`;
        this.container.innerHTML = html;
        this.attachEventListeners();
        this._tickTimer();
    }

_startTimer() {
    this._stopTimer();
    this._timerInterval = setInterval(() => this._tickTimer(), 1000);
}

_stopTimer() {
    if (this._timerInterval) {
        clearInterval(this._timerInterval);
        this._timerInterval = null;
    }
}

_tickTimer() {
    const el = document.getElementById('quest-reset-timer');
    if (!el) return;

    if (!this.saveManager) { el.textContent = '--:--:--'; return; }

    const timeLeft = this.saveManager.getTimeUntilQuestReset();
    if (!timeLeft) { el.textContent = '--:--:--'; return; }

    const h = String(timeLeft.h).padStart(2, '0');
    const m = String(timeLeft.m).padStart(2, '0');
    const s = String(timeLeft.s).padStart(2, '0');
    el.textContent = h + ':' + m + ':' + s;

    if (timeLeft.h === 0 && timeLeft.m < 60) {
        el.style.color = timeLeft.m < 10 ? '#e74c3c' : '#f39c12';
    } else {
        el.style.color = '#f1c40f';
    }
}

update() { }
}
// Force update and ensure syntax fixes are deployed.
