import { Player } from './Entities/Player.js';
import { SaveManager } from './System/SaveManager.js';
import { AudioManager } from './System/AudioManager.js';
import { ScreenManager } from '../ui/ScreenManager.js';
import { TopBar } from '../ui/TopBar.js';
import { BottomNav } from '../ui/BottomNav.js';
import { MapScreen } from '../locations/MapScreen.js';
import { InventoryScreen } from '../locations/InventoryScreen.js';
import { CombatScreen } from '../locations/CombatScreen.js';
import { MarketScreen } from '../locations/MarketScreen.js';
import { ShipMarketScreen } from '../locations/ShipMarketScreen.js';
import { QuestsScreen } from '../locations/QuestsScreen.js';
import { ChatScreen } from '../locations/ChatScreen.js';
import { ProfileScreen } from '../locations/ProfileScreen.js';
import { BankScreen } from '../locations/BankScreen.js';
import { JobScreen } from '../locations/JobScreen.js';
import { PlayerModal } from '../ui/PlayerModal.js';
import { LevelUpModal } from '../ui/LevelUpModal.js';
import { Notifications } from '../ui/Notifications.js';
import { AuthScreen } from '../ui/AuthScreen.js';
import { ServiceManager } from './System/ServiceManager.js';
import { GameLoopManager } from './System/GameLoopManager.js';
import { PassiveRegenerationSystem } from './System/PassiveRegenerationSystem.js';

// Manager imports for DI
import { InventoryManager } from "./System/InventoryManager.js";
import { JobManager } from "./System/JobManager.js";
import { BuffManager } from "./System/BuffManager.js";
import { ForceManager } from "./System/ForceManager.js";
import { QuestManager } from "./System/QuestManager.js";
import { StatsManager } from "./System/StatsManager.js";
import { PersistenceManager } from "./System/PersistenceManager.js";
import { ReputationManager } from "./System/ReputationManager.js";
import { NetworkManager } from "./System/NetworkManager.js";

export class Game {
    constructor() {
        console.log('Game constructor running...');
        const urlParams = new URLSearchParams(window.location.search);
        const urlUser = urlParams.get('user');

        if (urlUser) {
            console.log('Found user in URL:', urlUser);
            const urlRace = urlParams.get('race');
            const urlClass = urlParams.get('class');
            try {
                this.initGame(urlUser, urlRace, urlClass);
            } catch (err) {
                console.error('Critical error during initGame:', err);
                alert('Произошла критическая ошибка при загрузке игры. Проверьте консоль.');
            }
        } else {
            console.log('No user in URL, showing AuthScreen');
            this.authScreen = new AuthScreen((username, race, className) => {
                let newUrl = `${window.location.origin}${window.location.pathname}?user=${encodeURIComponent(username)}`;
                if (race) newUrl += `&race=${encodeURIComponent(race)}`;
                if (className) newUrl += `&class=${encodeURIComponent(className)}`;
                console.log('Redirecting to:', newUrl);
                window.location.href = newUrl;
            });
        }
    }

    async initGame(playerName, race, className) {
        console.log('initGame started for:', playerName);
        
        // 1. Create Player (without managers initially)
        this.player = new Player(playerName, race, className);

        // 2. Initialize ServiceManager
        this.serviceManager = new ServiceManager();

        // 3. Register Managers as Services
        this.serviceManager.register('inventory', () => new InventoryManager(this.player));
        this.serviceManager.register('job', () => new JobManager(this.player));
        this.serviceManager.register('buff', () => new BuffManager(this.player));
        this.serviceManager.register('force', () => new ForceManager(this.player));
        this.serviceManager.register('quest', () => new QuestManager(this.player));
        this.serviceManager.register('stats', () => new StatsManager(this.player));
        this.serviceManager.register('persistence', () => new PersistenceManager(this.player));
        this.serviceManager.register('reputation', () => new ReputationManager(this.player));
        this.serviceManager.register('network', () => new NetworkManager(this.player));

        // 4. Register System Services (GameLoop, Regeneration)
        this.serviceManager.register('gameLoop', (context) => new GameLoopManager(), 0);
        this.serviceManager.register('passiveRegeneration', (context) => {
            return new PassiveRegenerationSystem(this.player, context.gameLoop);
        }, 1, ['gameLoop']);

        // 5. Initialize ALL Services (creates instances in order)
        await this.serviceManager.initialize({ player: this.player });

        // 6. Inject Managers into Player
        this.player.injectManagers({
            inventory: this.serviceManager.get('inventory'),
            job: this.serviceManager.get('job'),
            buff: this.serviceManager.get('buff'),
            force: this.serviceManager.get('force'),
            quest: this.serviceManager.get('quest'),
            stats: this.serviceManager.get('stats'),
            persistence: this.serviceManager.get('persistence'),
            reputation: this.serviceManager.get('reputation'),
            network: this.serviceManager.get('network')
        });

        console.log('Managers injected into Player');

        // Connect to server
        this.player.networkMgr.connect();

        // 7. Get System Instances
        this.gameLoopManager = this.serviceManager.get('gameLoop');
        this.passiveRegenerationSystem = this.serviceManager.get('passiveRegeneration');
        this.passiveRegenerationSystem.initialize();

        // Скрываем экран авторизации и показываем игру
        const authScreenEl = document.getElementById('auth-screen');
        if (authScreenEl) {
            console.log('Hiding auth screen...');
            authScreenEl.classList.remove('active');
            authScreenEl.classList.add('hidden');
        }
        
        const topBarEl = document.getElementById('top-bar');
        const mainContentEl = document.getElementById('main-content');
        const bottomNavEl = document.getElementById('bottom-nav');

        if (topBarEl) topBarEl.classList.remove('hidden');
        if (mainContentEl) mainContentEl.classList.remove('hidden');
        if (bottomNavEl) bottomNavEl.classList.remove('hidden');

        console.log('UI elements visibility updated');

        //--- Менеджер сохранений ---
        this.saveManager = new SaveManager(
            this.player,
            // onQuestsReset
            () => {
                Notifications.show('Ежедневные задания обновлены! 🎯', 'success');
                if (this.questsScreen) this.questsScreen.render();
            },
            // onSave — UI layer owns the DOM update for save-status (SoC fix)
            (saveDate) => {
                const el = document.getElementById('save-status-text');
                if (el) {
                    const timeStr = saveDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    el.textContent = `Сохранено:${timeStr}`;
                    el.classList.add('save-flash');
                    setTimeout(() => el.classList.remove('save-flash'), 1000);
                }
            }
        );

        // --- UI ---
        this.screenManager = new ScreenManager();
        this.topBar = new TopBar(this.player);

        //Загружаем прогресс (и проверяем сброс квестов)
        this.saveManager.load();

        // --- Аудио ---
        this.audioManager = new AudioManager();

        this.bottomNav = new BottomNav(this.screenManager, this.player);
        this.levelUpModal = new LevelUpModal(this.player, this.topBar);

        //--- Экраны ---
        this.combatScreen = new CombatScreen(this.screenManager, this.player);
        this.mapScreen = new MapScreen(this.screenManager, this.player);
        this.inventoryScreen = new InventoryScreen(this.screenManager, this.player);
        this.marketScreen = new MarketScreen(this.screenManager, this.player);
        this.shipMarketScreen = new ShipMarketScreen(this.screenManager, this.player);
        this.questsScreen = new QuestsScreen(this.screenManager, this.player, this.saveManager);
        this.chatScreen = new ChatScreen(this.screenManager, this.player);
        this.profileScreen = new ProfileScreen(this.screenManager, this.player);
        this.bankScreen = new BankScreen(this.screenManager, this.player);
        this.jobScreen = new JobScreen(this.screenManager, this.player);
        //Один общий PlayerModal для всех экранов
        this.playerModal = new PlayerModal(this.player, this.screenManager);

        //--- Восстановление боя или стартовый экран ---
        const savedCombatJson = localStorage.getItem(`sw_active_combat_${this.player.name}`);
        if (savedCombatJson) {
            try {
                const savedObj = JSON.parse(savedCombatJson);
                //Если это был PvP бой, нужно снять лок и с цели (чтобы цель не повисла в бою)
                //И также выдать наказание беглецу (60 минут бана на бои)
                if (savedObj.combatType === 'pvp') {
                    if (savedObj.monsterId) {
                        const targetName = savedObj.monsterId.startsWith('real_') ? 
                            savedObj.monsterId.slice(5) : savedObj.monsterName;
                        localStorage.removeItem(`sw_pvp_combat_lock_${targetName}`);
                    }
                    try { localStorage.setItem(`sw_pvp_flee_penalty_${this.player.name}`, Date.now().toString()); } catch(e) {}
                }
            } catch (e) {}
        }
        
        //Отменяем бой при F5 и очищаем свой лок
        localStorage.removeItem(`sw_active_combat_${this.player.name}`);
        localStorage.removeItem(`sw_pvp_combat_lock_${this.player.name}`);
        
        this.screenManager.showScreen('maps-screen');

        //Проверяем активное наказание за побег
        const fleePenalty = localStorage.getItem(`sw_pvp_flee_penalty_${this.player.name}`);
        if (fleePenalty) {
            const timeSinceFlee = Date.now() - parseInt(fleePenalty, 10);
            const penaltyDuration = 60 * 60 * 1000; // 60 minutes
            if (timeSinceFlee < penaltyDuration) {
                const minsLeft = Math.ceil((penaltyDuration - timeSinceFlee) / 60000);
                setTimeout(() => {
                    Notifications.show(`🚨 Вы сбежали из PvP боя! Штраф на бои: еще${minsLeft}мин.`, 'error');
                }, 1000);
            } else {
                localStorage.removeItem(`sw_pvp_flee_penalty_${this.player.name}`);
            }
        }

        // --- Запуск систем ---
        this.saveManager.startAutosave(10000); //Автосбережение каждые 10 секунд
        this.saveManager.startQuestTimer();    //Проверка сброса квестов

        //Сохранение при закрытии вкладки
        window.addEventListener('beforeunload', () => {
            this.saveManager.save();
        });

        // Защита от мульти-вкладок (Дюпы предметов и кредитов)
        this.setupMultiTabProtection();

        // --- Engine -> UI event bridge (SoC: engine fires events, UI layer reacts) ---
        this.setupEventBridge();

        //--- Настройка (модальное окно) ---
        this._initSettingsModal();

        // Отслеживание смены планеты для музыки
        this._initMusicTracker();
    }

    /**
     * Налаштовує захист від мульти-вкладок
     */
    setupMultiTabProtection() {
        window.addEventListener('storage', (e) => {
            if (e.key === `sw_player_save_${this.player.name}`) {
                console.warn("Save file modified in another tab! Reloading to prevent data corruption.");
                alert("⚠️ Обнаружено локальное сохранение в другой вкладке! Страница будет перезагружена во избежание потери или дюпа предметов.");
                window.location.reload();
            }
        });
    }

    /**
     * Налаштовує подійний міст між Engine та UI
     */
    setupEventBridge() {
        document.addEventListener('game:quest-updated', () => {
            if (this.questsScreen) this.questsScreen.render();
        });

        document.addEventListener('game:job-completed', (result) => {
            // If we are on the JobScreen, refresh it to show "Apply" buttons again
            if (this.screenManager.activeScreenId === 'job-screen' && this.jobScreen) {
                this.jobScreen.render();
            }
        });
    }

    _initMusicTracker() {
        // При загрузке игры
        if (this.player.locationId) {
            import('./Data/locations.js').then(module => {
                const loc = module.LOCATIONS[this.player.locationId];
                if (loc) this.audioManager.playPlanetMusic(loc.planetId);
            });
        }

        // При перемещениях (через Proxy или setInterval проверку)
        let lastPlanetId = null;
        setInterval(() => {
            import('./Data/locations.js').then(module => {
                const loc = module.LOCATIONS[this.player.locationId];
                if (loc && loc.planetId !== lastPlanetId) {
                    lastPlanetId = loc.planetId;
                    this.audioManager.playPlanetMusic(loc.planetId);
                }
            });
        }, 2000);
    }

    _initSettingsModal() {
        const modal = document.getElementById('settings-modal');
        const settingsBtn = document.querySelector('.settings-btn');
        const closeBtn = document.getElementById('settings-close');
        const resetBtn = document.getElementById('btn-reset-save');
        const manualSaveBtn = document.getElementById('btn-manual-save');

        if (!modal || !settingsBtn) return;

        //Открыть/закрыть
        settingsBtn.addEventListener('click', () => {
            this._updateSettingsModal();
            modal.classList.add('active');
        });

        closeBtn?.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });

        //Ручное сохранение
         manualSaveBtn?.addEventListener('click', () => {
            this.saveManager.save();
            Notifications.show('Игра сохранена! 💾', 'success');
        });

        //Управление звуком в настройках
        const audioBtn = document.getElementById('btn-toggle-audio');
        const audioIcon = document.getElementById('audio-icon');
        const audioText = document.getElementById('audio-btn-text');

        const updateAudioBtnUI = () => {
            if (!audioBtn || !audioIcon || !audioText) return;
            const isEnabled = this.audioManager.isEnabled;
            audioIcon.setAttribute('name', isEnabled ? 'volume-medium-outline' : 'volume-mute-outline');
            audioText.textContent = isEnabled ? 'Выключить звук' : 'Включить звук';
            audioBtn.style.background = isEnabled ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)';
        };

        audioBtn?.addEventListener('click', () => {
            this.audioManager.toggle();
            updateAudioBtnUI();
        });

        // Вызываем при открытии модалки
        settingsBtn.addEventListener('click', () => {
            this._updateSettingsModal();
            updateAudioBtnUI(); // Синхронизируем UI кнопки звука
            modal.classList.add('active');
        });

        //Сброс сохранений
        resetBtn?.addEventListener('click', () => {
            const confirmed = confirm('⚠️ ВНИМАНИЕ! Все данные будут удалены безвозвратно. Продолжить?');
            if (confirmed) {
                this.saveManager.deleteSave();
                Notifications.show('Сохранение удалено. Перезагрузка...', 'error');
                setTimeout(() => location.reload(), 1500);
            }
        });

        //Полноэкранный режим
        const fullscreenBtn = document.getElementById('btn-fullscreen');
        const updateFullscreenBtn = () => {
            if (!fullscreenBtn) return;
            if (document.fullscreenElement) {
                fullscreenBtn.innerHTML = '<ion-icon name="contract-outline"></ion-icon> Выйти из полного экрана';
            } else {
                fullscreenBtn.innerHTML = '<ion-icon name="expand-outline"></ion-icon> Играть на весь экран';
            }
        };
        document.addEventListener('fullscreenchange', updateFullscreenBtn);
        fullscreenBtn?.addEventListener('click', async () => {
            try {
                if (!document.fullscreenElement) {
                    await document.documentElement.requestFullscreen();
                } else {
                    await document.exitFullscreen();
                }
            } catch (e) {
                Notifications.show('Полноэкранный режим недоступен в вашем браузере.', 'error');
            }
        });

        //🛠️ DEV MODE
        const devInputLevel = document.getElementById('dev-input-level');
        const devBtnLevel = document.getElementById('btn-dev-level');
        const devInputCredits = document.getElementById('dev-input-credits');
        const devBtnCredits = document.getElementById('btn-dev-credits');
        const devInputTitle = document.getElementById('dev-input-title');
        const devBtnTitle = document.getElementById('btn-dev-title');
        const devInputItem = document.getElementById('dev-input-item');
        const devBtnItem = document.getElementById('btn-dev-item');

        //Заполняем список предметов
        import('./Data/items.js').then(module => {
            if (!devInputItem) return;
            const ITEMS = module.ITEMS;
            let optionsHtml = '';
            for (const key in ITEMS) {
                optionsHtml += `<option value="${key}">${ITEMS[key].name}</option>`;
            }
            devInputItem.innerHTML = optionsHtml;
        });

        const forceSaveAndUiUpdate = (msg) => {
            this.saveManager.save();
            Notifications.show(msg, 'success');
        };

        //Установить уровень
        devBtnLevel?.addEventListener('click', () => {
            const p = this.player;
            let targetLevel = parseInt(devInputLevel.value, 10);
            if (isNaN(targetLevel) || targetLevel < 1) return;
            if (targetLevel > 100) targetLevel = 100;

            p.level = targetLevel;
            p.xp = 0;
            p.nextLevelXp = Math.floor(100 * Math.pow(1.5, targetLevel - 1));
            if (targetLevel === 100) p.nextLevelXp = 9999999;
            
            p.baseMaxHp = 100 + (targetLevel - 1) * 15;
            p.baseAttack = 12 + (targetLevel - 1) * 3;
            p.baseDefense = 5 + (targetLevel - 1) * 1;
            p.hp = p.maxHp;
            
            // Начисляем очки характеристик принудительно (например, 5 за уровень)
            p.statPoints = (targetLevel - 1) * 5;

            forceSaveAndUiUpdate(`🛠️ Уровень установлен: ${targetLevel}`);
        });

        //Установить кредиты
        devBtnCredits?.addEventListener('click', () => {
            let credits = parseInt(devInputCredits.value, 10);
            if (isNaN(credits) || credits < 0) return;
            this.player.money = credits;
            forceSaveAndUiUpdate(`🛠️ Кредиты установлены:${credits}`);
        });

        //Установить титул
        devBtnTitle?.addEventListener('click', () => {
            const newTitle = devInputTitle.value;
            this.player.title = newTitle;
            
            //Если сила раньше не использовалась, а титул Форс-юзера
            if (this.player.canUseForce && this.player.forcePoints === 0) {
                this.player.forcePoints = this.player.maxForcePoints;
            }
            forceSaveAndUiUpdate(`🛠️ Звание изменено на:${newTitle}`);
        });

        //Добавить предмет
        devBtnItem?.addEventListener('click', () => {
            const itemId = devInputItem.value;
            if (itemId) {
                this.player.inventoryMgr.addItem(itemId, 1);
                forceSaveAndUiUpdate(`🛠️ Получен предмет:${itemId}`);
            }
        });

        //Выравнивание — светлая сторона
        document.getElementById('btn-dev-light')?.addEventListener('click', () => {
            const amount = parseInt(document.getElementById('dev-input-alignment').value, 10) || 100;
            this.player.alignment = (this.player.alignment || 0) + amount;
            forceSaveAndUiUpdate(`🌟 +${amount} к Светлой стороне (total:${this.player.alignment})`);
        });

        //Выравнивание - темная сторона
        document.getElementById('btn-dev-dark')?.addEventListener('click', () => {
            const amount = parseInt(document.getElementById('dev-input-alignment').value, 10) || 100;
            this.player.alignment = (this.player.alignment || 0) - amount;
            forceSaveAndUiUpdate(`🔴 -${amount} к Темной стороне (total:${this.player.alignment})`);
        });

        //Снять PvP бан побега
        document.getElementById('btn-dev-remove-ban')?.addEventListener('click', () => {
            localStorage.removeItem(`sw_pvp_flee_penalty_${this.player.name}`);
            Notifications.show('✅ PvP бан побега снят!', 'success');
        });

        // --- Secure Dev Mode ---
        window.enableDevMode = async (password) => {
            const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            if (hashHex === '0b8bc5a20023e43aeffe845a03ab1a5dbe0aaa7efc953be6d707bbc6d9b0c7b5') {
                document.getElementById('dev-panel-section').style.display = 'block';
                Notifications.show('🔓 Режим разработчика активирован', 'success');
                console.log('Dev mode unlocked.');
            } else {
                console.warn('Access denied.');
                Notifications.show('⛔ Доступ запрещен', 'error');
            }
        };
        
        console.log('Dev panel is hidden. Use window.enableDevMode(password) to unlock.');
    }

    _updateSettingsModal() {
        const lastSaveEl = document.getElementById('settings-last-save');
        const questTimerEl = document.getElementById('settings-quest-timer');

        if (lastSaveEl) {
            const lastSave = this.saveManager.getLastSaveTime();
            lastSaveEl.textContent = lastSave
                ? lastSave.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : 'Пока не сохранено';
        }

        if (questTimerEl) {
            const timeLeft = this.saveManager.getTimeUntilQuestReset();
            if (timeLeft) {
                questTimerEl.textContent = `${String(timeLeft.h).padStart(2, '0')}:${String(timeLeft.m).padStart(2, '0')}:${String(timeLeft.s).padStart(2, '0')}`;
            } else {
                questTimerEl.textContent = 'Неизвестно';
            }
        }
    }
}
