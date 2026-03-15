// ==========================================
//MAP SCREEN - тонкий координатор
//Планетарные рендеры: map/planets/*Renderer.js
//Обработчики действий: map/handlers/Handler.js
//Данные: map/mapConstants.js
// ==========================================
import { Monster } from '../engine/Entities/Monster.js';
import { LOCATIONS } from '../engine/Data/locations.js';
import { Notifications } from '../ui/Notifications.js';
import { ZonePlayers } from '../ui/components/ZonePlayers.js';
import { SpaceportModal } from '../ui/modals/SpaceportModal.js';
import { DialogManager } from '../engine/Dialogues/DialogManager.js';
import { SithQuests } from '../engine/Dialogues/SithQuests.js';
import { JediQuests } from '../engine/Dialogues/JediQuests.js';

import { LOCATION_BACKGROUNDS } from './map/mapConstants.js';
import { LocationRenderer } from './map/LocationRenderer.js';
import { KorribanRenderer } from './map/planets/KorribanRenderer.js';
import { DantooineRenderer } from './map/planets/DantooineRenderer.js';
import { CoruscantRenderer } from './map/planets/CoruscantRenderer.js';
import { CrystalHandler } from './map/handlers/CrystalHandler.js';
import { TombHandler } from './map/handlers/TombHandler.js';
import { GarbageHandler } from './map/handlers/GarbageHandler.js';
import { MeditationHandler } from './map/handlers/MeditationHandler.js';
import { HolocronHandler } from './map/handlers/HolocronHandler.js';
import { SithMeditationHandler } from './map/handlers/SithMeditationHandler.js';
import { SithHolocronHandler } from './map/handlers/SithHolocronHandler.js';
import { MapHandlersSystem } from '../engine/System/MapHandlersSystem.js';

export class MapScreen {
    constructor(screenManager, player) {
        this.screenManager = screenManager;
        this.player = player;
        this.container = document.getElementById('maps-screen');

        this.isSearching = false;
        this.currentCombat = null;

        //Наружные UI-компоненты
        this.zonePlayers = new ZonePlayers(this.container, this.player);
        this.spaceportModal = new SpaceportModal(this.container, this.player, () => this.render());

        //Система обробників подій карти
        this.mapHandlers = new MapHandlersSystem(this.player, this.screenManager);

        //Обработчики действий (инжектируем зависимости через конструкторы)
        const onRender     = () => this.render();
        const onCombat     = (mData, cb) => this.startCombat(mData, cb);

        this.crystalHandler   = new CrystalHandler(player, onRender);
        this.tombHandler      = new TombHandler(player, onRender, onCombat);
        this.garbageHandler   = new GarbageHandler(player, onRender);
        this.meditationHandler = new MeditationHandler(player);
        this.sithMeditationHandler = new SithMeditationHandler(player);
        this.holocronHandler  = new HolocronHandler(player, onRender);
        this.sithHolocronHandler = new SithHolocronHandler(player, onRender);
        
        // Sync initial search states from handlers
        this.isSearching = this.crystalHandler.isSearching || this.tombHandler.isSearching || this.garbageHandler.isSearching;

        this._init();
    }

    _init() {
        //Просыпаем ссылку в window.gameInstance для onclick в медитационной модалке
        //Это устанавливается здесь, потому что в момент конструктора gameInstance еще не существует
        if (!window._mapScreenRef) window._mapScreenRef = this;
        //Также после инициализации gameInstance - main.js присваивает his.mapScreen автоматически

        this.render();

        this.screenManager.subscribe('maps-screen', () => this.render());

        window.addEventListener('storage', (e) => {
            if (e.key && (e.key.startsWith('sw_player_save_') || e.key === 'sw_fake_players')) {
                this.zonePlayers.refreshPlayersInZone();
            }
            if (e.key === `sw_pvp_notify_${this.player.name}`) {
                try {
                    const data = JSON.parse(e.newValue);
                    if (data) {
                        this.zonePlayers.showPvpNotification(data);
                        const savedRaw = localStorage.getItem(`sw_player_save_${this.player.name}`);
                        if (savedRaw) {
                            const d = JSON.parse(savedRaw);
                            if (d.hp !== undefined) this.player.hp = d.hp;
                            if (d.money !== undefined) this.player.money = d.money;
                            if (d.forcePoints !== undefined) this.player.forcePoints = d.forcePoints;
                        }
                    }
                } catch (_) {}
            }
        });

        //Интервал для обновления таймеров.
        setInterval(() => {
            if (this.screenManager.activeScreenId === 'maps-screen') {
                this._updateCooldownTimers();
            }
        }, 1000);
    }

    update() {
        this.zonePlayers.refreshPlayersInZone();
    }

    // ===========================
    //  RENDER
    // ===========================

    render() {
        // Persistent UI redirects
        if (this.player.viewingJobBoard) {
            setTimeout(() => this.screenManager.showScreen('job-screen'), 0);
            return;
        }
        if (this.player.viewingBank && window.gameInstance?.bankScreen) {
            setTimeout(() => window.gameInstance.bankScreen.openBank(this.player.locationId), 0);
            return;
        }

        const loc = LOCATIONS[this.player.locationId];
        if (!loc) {
            this.container.innerHTML = `<h1>ПОМИЛКА ЛОКАЦИИ</h1><p>Локация не найдена.</p>`;
            return;
        }

        this._applyBackground();

        const planetIdForBg = this._getPlanetId(loc);
        const headerBgImage = `/public/assets/locations/planet_${planetIdForBg}.png`;

        let html = `
            <div class="locations-list">
                <div class="planet-top-row">
                    <div class="planet-header-box" style="background-image:linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.7)),url('${headerBgImage}');background-size:cover;background-position:center;">
                        <ion-icon name="planet-outline" class="planet-header-icon"></ion-icon>
                        <span class="planet-header-name">Планета:${loc.planet}</span>
                    </div>
                    <button id="btn-open-spaceport" class="spaceport-btn" style="background-image:linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.65)),url('/public/assets/ui/map_button_bg.png');background-size:cover;background-position:center;">
                        <ion-icon name="rocket-outline" class="rocket-icon"></ion-icon> Карта Галактики
                    </button>
                </div>

                <div class="map-location-status-row">
                    <div>Вы Здесь: <span class="loc-name">${(loc?.name || '')}</span></div>
                    <div class="${loc.isSafeZone ? 'map-zone-safe' : 'map-zone-danger'}">${loc.isSafeZone ? 'Безопасная зона' : 'Опасная зона'}</div>
                </div>
        `;

        html += this._renderActionsBox(loc);
        html += this._renderLocationContent(loc);
        html += this.zonePlayers.renderPlayersInZone(this.player.locationId);
        html += `</div>`;
        html += this.spaceportModal.renderSpaceportModal(loc.planetId);

        this.container.innerHTML = html;
        this._attachEventListeners();
        this.spaceportModal.attachEventListeners();
    }

    // ===========================
    //  PRIVATE — RENDER HELPERS
    // ===========================

    _applyBackground() {
        const bgUrl = LOCATION_BACKGROUNDS[this.player.locationId];
        if (bgUrl) {
            this.container.style.backgroundImage = `url('${bgUrl}')`;
            this.container.style.backgroundSize = 'cover';
            this.container.style.backgroundPosition = 'center';
            this.container.style.backgroundAttachment = 'local';
            this.container.dataset.hasBg = 'true';
        } else {
            this.container.style.backgroundImage = '';
            this.container.style.backgroundSize = '';
            this.container.style.backgroundPosition = '';
            delete this.container.dataset.hasBg;
        }
    }

    _getPlanetId(loc) {
        const planetKeys = Object.keys(LOCATIONS).filter(k => LOCATIONS[k].planet === loc.planet);
        if (planetKeys.length > 0 && LOCATIONS[planetKeys[0]].planetId) {
            return LOCATIONS[planetKeys[0]].planetId;
        }
        const map = {
            'Корусант': 'coruscant', 'Коррибан': 'korriban',
            'Дантуин':  'dantooine', 'Нар Шаддао': 'nar_shaddaa', 'Тайтон': 'tython'
        };
        return map[loc.planet] || 'tatooine';
    }

    _renderActionsBox(loc) {
        let actionsHtml = '';

        if (loc.hasMarket)    actionsHtml += `<button id="btn-open-market" class="btn-map-action btn-map-action--market">🛒 ОТКРЫТЬ РЫНОК</button>`;
        if (loc.hasShipMarket) actionsHtml += `<button id="btn-open-ships" class="btn-map-action btn-map-action--ship">🚀 КУПИТЬ КОРАБЛЬ</button>`;
        if (loc.hasBank)      actionsHtml += `<button id="btn-open-bank" class="btn-map-action btn-map-action--bank">🏦 ПОСЕТИТЬ БАНК</button>`;
        if (loc.isJobCenter)  actionsHtml += `<button id="btn-open-jobs" class="btn-map-action btn-map-action--jobs">💼 ОТКРЫТЬ БИРЖУ ТРУДА</button>`;

        if (loc.hasGarbage) {
            actionsHtml += this.garbageHandler.isSearching
                ? `<button class="btn-map-action btn-map-action--garbage" disabled style="background:#7f8c8d;cursor:wait;">
                       <ion-icon name="hourglass-outline" class="spin-animation"></ion-icon> ПОРПАНИЕ... (${this.garbageHandler.searchTimeLeft}с)
                   </button>`
                : `<button id="btn-search-garbage" class="btn-map-action btn-map-action--garbage" style="background:#95a5a6;color:#fff;">
                       🗑️ КОВЫРЯТЬСЯ В МУСОРЕ
                   </button>`;
        }

        if (loc.hasBartender) {
            actionsHtml += `<button id="btn-bartender-counter" class="btn-map-action" style="background: linear-gradient(135deg, #d35400, #e67e22); color: #fff;">
                       🍻 ПОДОЙТИ К СТОЙКЕ БАРМЕНА
                   </button>`;
        }

        if (!loc.isSafeZone && loc.monsters?.length > 0) {
            const cooldownsKey = `sw_monster_cooldowns_${this.player.name}`;
            let cooldowns = {};
            try { cooldowns = JSON.parse(localStorage.getItem(cooldownsKey) || '{}'); } catch (e) {}
            
            // Настройка кулдаунов по ID монстров
            const getCooldownMs = (monsterId) => {
                if (monsterId === 'rogue_droid') return 1 * 60 * 1000; // 1 минута для Сломанного тренировочного дроида
                return 5 * 60 * 1000; // 5 минут для остальных
            };

            const now = Date.now();

            loc.monsters.forEach(m => {
                const COOLDOWN_MS = getCooldownMs(m.id);
                const lastDefeat = cooldowns[m.id] || 0;
                const msLeft = COOLDOWN_MS - (now - lastDefeat);
                // Escape quotes so names like Tuk'ata or JSON quotes don't break the HTML attribute
                const safeJson = JSON.stringify(m).replace(/'/g, "&#39;");

                if (msLeft > 0) {
                    const mLeft = Math.floor(msLeft / 60000);
                    const sLeft = Math.floor((msLeft % 60000) / 1000);
                    const nameAttr = (m?.name || '').replace(/'/g, "&#39;");
                    actionsHtml += `<button class="location-action-btn cd-timer-btn" disabled style="background:#444; color:#999; cursor:not-allowed;" data-cooldown-end="${lastDefeat + COOLDOWN_MS}" data-m-name="${nameAttr}" data-m-json='${safeJson}'>Возрождение:${(m?.name || '')} (${mLeft}мин${sLeft}с ⏳)</button>`;
                } else {
                    actionsHtml += `<button class="location-action-btn btn-attack" data-monster='${safeJson}'>Атаковать:${(m?.name || '')} ⚔️</button>`;
                }
            });
        }

        if (!actionsHtml) return '';

        return `
            <div class="location-box current">
                <div id="combat-log" style="height:120px;display:none;overflow-y:auto;background:#fff;padding:10px;margin-bottom:15px;border:3px solid #000;font-family:monospace;font-size:13px;color:#000;"></div>
                <div id="actions-container">${actionsHtml}</div>
            </div>
        `;
    }

    _renderLocationContent(loc) {
        if (!loc.connections || loc.connections.length === 0) return '';

        const locId = loc.id;

        //Специальные рендеры планет
        if (KorribanRenderer.handles(locId))  return KorribanRenderer.render(locId, this.isSearching);
        if (DantooineRenderer.handles(locId)) return DantooineRenderer.render(locId, this.isSearching);
        if (CoruscantRenderer.handles(locId)) return CoruscantRenderer.render(locId);

        //Стандартная сеть
        return LocationRenderer.render(loc, this.isSearching);
    }

    _updateCooldownTimers() {
        if (!this.container) return;
        const btns = this.container.querySelectorAll('.cd-timer-btn');
        if (btns.length === 0) return;

        let needsFullRender = false;
        
        btns.forEach(btn => {
            const endTs = parseInt(btn.getAttribute('data-cooldown-end'), 10);
            const msLeft = endTs - Date.now();
            if (msLeft <= 0) {
                needsFullRender = true;
            } else {
                const mLeft = Math.floor(msLeft / 60000);
                const sLeft = Math.floor((msLeft % 60000) / 1000);
                const name = btn.getAttribute('data-m-name');
                btn.innerHTML = `Возрождение:${name} (${mLeft}мин${sLeft}с ⏳)`;
            }
        });
        
        if (needsFullRender) {
            this.render();
        }
    }

    // ===========================
    //  EVENTS
    // ===========================

    _attachEventListeners() {
        const q = (id) => this.container.querySelector(id);

        //=== Навигация на экраны ===
        q('#btn-open-market')?.addEventListener('click', () =>
            window.gameInstance?.marketScreen?.openMarket(this.player.locationId));

        q('#btn-open-ships')?.addEventListener('click', () =>
            window.gameInstance?.shipMarketScreen?.openShipMarket(this.player.locationId));

        q('#btn-open-bank')?.addEventListener('click', () =>
            window.gameInstance?.bankScreen?.openBank(this.player.locationId));

        q('#btn-open-jobs')?.addEventListener('click', () => {
            if (window.gameInstance?.jobScreen) this.screenManager.showScreen('job-screen');
        });

        //=== Действия локаций ===
        q('#btn-search-garbage')?.addEventListener('click', () => {
            this.garbageHandler.handleGarbageSearch(v => { 
                this.isSearching = v; 
                this.render(); // Force re-render to update the button state immediately
            });
        });

        q('#btn-bartender-counter')?.addEventListener('click', () => {
            import('../ui/modals/BartenderModal.js').then(module => {
                new module.BartenderModal(this.player, () => this.render()).show();
            });
        });

        q('#btn-search-crystals')?.addEventListener('click', () => {
            if (!this.isSearching)
                this.crystalHandler.startCrystalSearch(v => { this.isSearching = v; }, (monsterData) => this.startCombat(monsterData));
        });

        q('#btn-search-shyrack-crystals')?.addEventListener('click', () => {
            if (!this.isSearching) {
                this.crystalHandler.startShyrackCrystalSearch(
                    v => { this.isSearching = v; },
                    (monsterData) => this.startCombat(monsterData)
                );
            }
        });

        q('#btn-excavate-tomb')?.addEventListener('click', () => {
            if (!this.isSearching)
                this.tombHandler.startTombExcavation(v => { this.isSearching = v; });
        });

        q('#btn-meditate')?.addEventListener('click', () =>
            this.meditationHandler.handleMeditation());

        q('#btn-sith-meditate')?.addEventListener('click', () =>
            this.sithMeditationHandler.handleMeditation());

        q('#btn-library-holocron')?.addEventListener('click', () =>
            this.holocronHandler.handleLibraryHolocron());

        q('#btn-decode-sith-holocron')?.addEventListener('click', () =>
            this.sithHolocronHandler.handleLibraryHolocron());

        q('#btn-exchange-crystal')?.addEventListener('click', () =>
            this.crystalHandler.handleCrystalExchange());

        // === Событие для начала боя из обработчиков (кристаллы, раскопки) ===
        document.addEventListener('game:start-combat', (e) => {
            if (e.detail && e.detail.monster) {
                this.startCombat(e.detail.monster);
            }
        });

        // === NPC ===
        this.container.addEventListener('click', (e) => {
            if (e.target.closest('#npc_harkun')) SithQuests.interactWithHarkun(this.player);
            if (e.target.closest('#npc_vandar')) JediQuests.interactWithVandar(this.player);
        });

        //=== Перемещение между локациями ===
        this.container.querySelectorAll('.btn-move').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (this.currentCombat || this.isSearching || this.meditationHandler.isMeditating) return;

                // Check PvP combat lock — blocked if currently being attacked
                const pvpLockKey = `sw_pvp_combat_lock_${this.player.name}`;
                const rawLock = localStorage.getItem(pvpLockKey);
                if (rawLock) {
                    try {
                        const lock = JSON.parse(rawLock);
                        const age = Date.now() - (lock.ts || 0);
                        if (age < 10 * 60 * 1000) {
                            Notifications.show(`⚔️ На вас накинув ${lock.attacker || 'игрок'}! Нельзя перемещаться во время боев PvP.`, 'error');
                            return;
                        } else {
                            localStorage.removeItem(pvpLockKey); // Stale lock — clear
                        }
                    } catch { localStorage.removeItem(pvpLockKey); }
                }

                if (this.player.activeJob && this.player.jobEndTime > Date.now()) {
                    Notifications.show('Вы на работе! Дождитесь окончания или разорвите контракт.', 'error');
                    return;
                }

                const hpPercent = (this.player.hp / this.player.maxHp) * 100;
                if (hpPercent < 50) {
                    Notifications.show('Вы слишком ранены для перемещения! (HP <50%). Используйте аптечку.', 'error');
                    return;
                }

                const targetId = e.target.getAttribute('data-target');

                if (targetId === 'coruscant_senate' || targetId === 'coruscant_jedi_temple') {
                    Notifications.show('Эта локация в настоящее время в разработке! Ожидайте в предстоящих обновлениях.', 'warning');
                    return;
                }

                //Ограничение фракций
                const isJedi = this.player.alignment > 0;
                const isSith = this.player.alignment < 0;
                if (targetId === 'korriban_academy' && isJedi && this.player.quests?.jedi_initiation !== undefined) {
                    Notifications.show('Мир не имеет власти здесь. Вам запрещен вход в Академию Ситхов.', 'error');
                    return;
                }
                if (targetId === 'dantooine_enclave' && isSith && this.player.quests?.sith_initiation !== undefined) {
                    Notifications.show('Темноте здесь не рады. Вам запрещен вход Анклав Джедаев.', 'error');
                    return;
                }

                // Внутренние локации Академии Ситхов (Претендент и выше)
                const sithSubLocations = ['korriban_ceremony_hall', 'korriban_sith_temple', 'korriban_arena'];
                const sithRanks = ['Претендент', 'Аколит', 'Ситх'];
                if (sithSubLocations.includes(targetId) && !sithRanks.includes(this.player.title)) {
                    Notifications.show('Доступ в эти покои разрешен только Претендентам и полноценным Ситхам!', 'error');
                    return;
                }

                // Внутренние локации Анклава Джедаев (Юнлинг и выше)
                const jediSubLocations = ['dantooine_meditation', 'dantooine_padawan', 'dantooine_knowledge'];
                const jediRanks = ['Юнлинг', 'Падаван', 'Джедай'];
                if (jediSubLocations.includes(targetId) && !jediRanks.includes(this.player.title)) {
                    Notifications.show('Только Юнлинги и выше могут проходить во внутренние залы Анклава!', 'error');
                    return;
                }

                this.player.locationId = targetId;
                this.player.save();
                this.render();
            });
        });


        //=== Атака на монстров ===
        this.container.querySelectorAll('.btn-attack').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (this.currentCombat) return;
                if (this.isSearching) {
                    Notifications.show('Вы заняты! Сначала закончите текущее действие.', 'error');
                    return;
                }

                // Check PvP combat lock
                const pvpLockKey = `sw_pvp_combat_lock_${this.player.name}`;
                const rawLock = localStorage.getItem(pvpLockKey);
                if (rawLock) {
                    try {
                        const lock = JSON.parse(rawLock);
                        if (Date.now() - (lock.ts || 0) < 10 * 60 * 1000) {
                            Notifications.show(`⚔️ Вы сейчас в PvP бою! Сначала закончите его.`, 'error');
                            return;
                        }
                    } catch {}
                }

                // Check PvP escape penalty
                const fleePenalty = localStorage.getItem(`sw_pvp_flee_penalty_${this.player.name}`);
                if (fleePenalty) {
                    const timeSinceFlee = Date.now() - parseInt(fleePenalty, 10);
                    const penaltyDuration = 60 * 60 * 1000; // 60 minutes
                    if (timeSinceFlee < penaltyDuration) {
                        const minsLeft = Math.ceil((penaltyDuration - timeSinceFlee) / 60000);
                        Notifications.show(`🚨 Штраф за побег действует еще${minsLeft}мин.`, 'error');
                        return;
                    } else {
                        localStorage.removeItem(`sw_pvp_flee_penalty_${this.player.name}`);
                    }
                }

                const hpPercent = (this.player.hp / this.player.maxHp) * 100;
                if (hpPercent < 50) {
                    Notifications.show('Вы слишком ранены для бою! (HP <50%). Используйте аптечку.', 'error');
                    return;
                }

                const mData = JSON.parse(e.target.getAttribute('data-monster'));
                this.startCombat(mData);
            });
        });

        //=== Карточки игроков ===
        this.zonePlayers.attachPlayerCardListeners();
    }

    // ===========================
    //  COMBAT
    // ===========================

    startCombat(mData, onFinishCallback) {
        if (!window.gameInstance?.combatScreen) {
            console.error('CombatScreen not initialized!');
            return;
        }

        const monster = new Monster(
            mData.id, 
            (mData?.name || ''), 
            mData.baseLevel || 1,
            mData.type || 'humanoid',
            mData.xp, 
            mData.money, 
            mData.loot
        );

        window.gameInstance.combatScreen.startCombat(monster, (result, rewards) => {
            this.currentCombat = null;
            this.screenManager.showScreen('maps-screen');
            if (onFinishCallback) onFinishCallback(result, rewards);
            else this.render();
        });
    }

    //Публичный proxy для MeditationHandler.
    selectForceSkill(skillId) {
        if (['sith_lightning', 'sith_rage', 'lightsaber_throw', 'force_choke'].includes(skillId)) {
            this.sithMeditationHandler.selectForceSkill(skillId);
        } else {
            this.meditationHandler.selectForceSkill(skillId);
        }
    }
}
