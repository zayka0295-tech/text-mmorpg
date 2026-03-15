
import { PvPManager } from '../engine/System/PvPManager.js';
import { LOCATIONS } from '../engine/Data/locations.js';
import { ITEMS } from '../engine/Data/items.js';
import { PlayerStatsSystem } from '../engine/System/PlayerStatsSystem.js';
import { ModalSystem } from './components/ModalSystem.js';
import { PlayerModalRenderer } from './components/PlayerModalRenderer.js';


export class PlayerModal {
    constructor(playerSelf, screenManager) {
        this.playerSelf = playerSelf; //Текущий игрок (наш)
        this.screenManager = screenManager;
        this.currentTarget = null;
        this.waitingForTargetId = null;
        this.waitingForTargetName = null;
        this.profileRequestTimeoutId = null;
        
        // Нові системи
        this.statsSystem = new PlayerStatsSystem(playerSelf);
        this.modalSystem = new ModalSystem();
        this.renderer = new PlayerModalRenderer(this.modalSystem, this.statsSystem);
        
        this._createDOM();
        this._initEvents();
    }

    _normalizeTargetData(target) {
        if (!target) return null;

        const constitution = target.constitution ?? target.totalConstitution ?? target.baseConstitution ?? 10;
        const strength = target.strength ?? target.totalStrength ?? target.baseStrength ?? 10;
        const agility = target.agility ?? target.totalAgility ?? target.baseAgility ?? 10;
        const intellect = target.intellect ?? target.totalIntellect ?? target.baseIntellect ?? 10;
        const hp = target.hp ?? 100;
        const maxHp = target.maxHp ?? target.totalMaxHp ?? target.baseMaxHp ?? hp ?? 100;

        return {
            className: 'Контрабандист',
            title: null,
            level: 1,
            hp,
            maxHp,
            money: 0,
            attack: target.attack ?? target.totalAttack ?? target.baseAttack ?? 0,
            defense: target.defense ?? target.totalDefense ?? target.baseDefense ?? 0,
            strength,
            agility,
            constitution,
            intellect,
            alignment: 0,
            isOnline: false,
            locationId: 'unknown',
            reputation: 0,
            reputationVotes: {},
            ship: null,
            avatar: '🧑🚀',
            ...target
        };
    }

    _initEvents() {
        if (this.screenManager) {
            this.screenManager.subscribe('any', () => {
                this.hide();
            });
        }

        document.addEventListener('network:profile_data', (e) => {
            const { senderId, data } = e.detail;
            // If the modal is waiting for this target (the sender of the data), render it
            if (this.waitingForTargetId === senderId) {
                if (this.profileRequestTimeoutId) {
                    clearTimeout(this.profileRequestTimeoutId);
                    this.profileRequestTimeoutId = null;
                }
                // Merge received data with basic info we might already have
                const target = this._normalizeTargetData({
                    id: senderId,
                    name: data.name,
                    // Use data from network, fallback to defaults
                    ...data,
                    isOnline: data.isOnline ?? false
                });
                this.waitingForTargetId = null;
                this.waitingForTargetName = null;
                this.currentTarget = target;
                this._render(target);
                document.getElementById('player-modal').classList.add('active');
            }
        });

        document.addEventListener('network:reputation_vote_result', (e) => {
            const { ok, targetId, voteType } = e.detail;
            
            // Reset voting state if it was us who voted
            if (this.isVoting) {
                this.isVoting = false;
                this._updateVoteButtonsState(false);
            }

            if (!ok || !this.currentTarget || this.currentTarget.id !== targetId) return;

            const nextVotes = { ...(this.currentTarget.reputationVotes || {}) };
            const prevVote = nextVotes[this.playerSelf.name];
            let nextReputation = this.currentTarget.reputation || 0;

            if (prevVote === voteType) {
                delete nextVotes[this.playerSelf.name];
                nextReputation += (voteType === 'up' ? -1 : 1);
            } else {
                if (prevVote) {
                    nextReputation += (prevVote === 'up' ? -1 : 1);
                }
                nextVotes[this.playerSelf.name] = voteType;
                nextReputation += (voteType === 'up' ? 1 : -1);
            }

            this.currentTarget = {
                ...this.currentTarget,
                reputation: typeof e.detail.newReputation === 'number' ? e.detail.newReputation : nextReputation,
                reputationVotes: nextVotes
            };

            this._render(this.currentTarget);
            this._showResult(voteType === 'up' ? '👍 Репутация повышена' : '👎 Репутация понижена', 'success');
        });
    }

    _createDOM() {
        const existing = document.getElementById('player-modal');
        if (existing) existing.remove();

        const el = document.createElement('div');
        el.id = 'player-modal';
        el.innerHTML = `<div class="pm-box"><div id="pm-content"></div></div>`;
        document.getElementById('game-container').appendChild(el);
    }

    show(playerName, targetId = null, targetPreview = null) {
        //Не открываем свой собственный профиль
        if (playerName === this.playerSelf.name) return;

        // Если это сетевой игрок (targetId передан), запрашиваем профиль
        if ((targetId || playerName) && this.playerSelf.networkMgr) {
            if (targetPreview) {
                const previewTarget = this._normalizeTargetData({
                    ...targetPreview,
                    id: targetId,
                    name: targetPreview.name || playerName,
                    isOnline: !!targetPreview.isOnline
                });
                this.currentTarget = previewTarget;
                this._render(previewTarget);
                document.getElementById('player-modal').classList.add('active');
                this._showResult('⏳ Загружаем полный профиль...', 'success');
            }

            this.waitingForTargetId = targetId;
            this.waitingForTargetName = playerName;
            if (this.profileRequestTimeoutId) {
                clearTimeout(this.profileRequestTimeoutId);
            }
            
            if (targetId) {
                this.playerSelf.networkMgr.requestProfile(targetId);
            } else {
                this.playerSelf.networkMgr.send('request_profile', { targetName: playerName });
            }

            this.profileRequestTimeoutId = setTimeout(() => {
                if (this.waitingForTargetId !== targetId) return;
                const fallbackTarget = this._resolveTarget(targetId, playerName);
                this.waitingForTargetId = null;
                this.waitingForTargetName = null;
                this.profileRequestTimeoutId = null;
                if (fallbackTarget) {
                    this.currentTarget = fallbackTarget;
                    this._render(fallbackTarget);
                    document.getElementById('player-modal').classList.add('active');
                } else {
                    if (this.currentTarget) {
                        document.getElementById('player-modal').classList.add('active');
                        this._showResult('⚠️ Показаны неполные данные игрока.', 'error');
                    } else {
                        this._showResult('❌ Профиль игрока не загрузился.', 'error');
                    }
                }
            }, 1000);
            
            // Show loading state (optional, or just wait)
            // For now, we just wait. If it's fast, it will pop up instantly.
            // But if we want to show existing cache while waiting:
            // ...
            return; 
        }

        //Ищем среди реальных игроков (с других вкладок или сохранений)
        let target = null;
        try {
            const raw = localStorage.getItem(`sw_player_save_${playerName}`);
            if (raw) {
                    const data = JSON.parse(raw);
                    //Формируем объект, совместимый с PlayerModal
                    target = this._normalizeTargetData({
                        id: `real_${playerName}`,
                        name: playerName,
                        avatar: data.avatar ||'🧑🚀',
                        className: 'Контрабандист',
                        title: data.title || null,
                        level: data.level || 1,
                        hp: data.hp !== undefined ? data.hp : 100,
                        maxHp: data.totalMaxHp || data.baseMaxHp || 100,
                        money: data.money || 0,
                        attack: data.totalAttack || data.baseAttack || 0,
                        defense: data.totalDefense || data.baseDefense || 0,
                        strength: data.totalStrength || data.baseStrength || 10,
                        agility: data.totalAgility || data.baseAgility || 10,
                        constitution: data.totalConstitution || data.baseConstitution || 10,
                        intellect: data.totalIntellect || data.baseIntellect || 10,
                        alignment: data.alignment || 0,
                        isOnline: (Date.now() - (data.lastOnline || 0)) < 60000,
                        locationId: data.locationId || 'unknown',
                        reputation: data.reputation || 0,
                        reputationVotes: data.reputationVotes || {},
                        ship: data.ship || null
                    });
                }
        } catch (e) { /* ignore */ }

        if (!target) return;

        this.currentTarget = target;
        this._render(target);
        document.getElementById('player-modal').classList.add('active');
    }

    hide() {
        const modal = document.getElementById('player-modal');
        if (this.profileRequestTimeoutId) {
            clearTimeout(this.profileRequestTimeoutId);
            this.profileRequestTimeoutId = null;
        }
        this.waitingForTargetId = null;
        this.waitingForTargetName = null;
        if (modal) modal.classList.remove('active');
    }

    _render(target) {
        this.currentTarget = target;
        const isRealPlayer = true; // All targets are now real players
        const canRob = target.money > 0;
        const robCooldown = '';

        // Resolve location name
        const locData = LOCATIONS[target.locationId];
        const locationName = target.locationName || (locData ? `${(locData?.planet || '')} — ${(locData?.name || '')}` : target.locationId || 'Неизвестно');

        //--- Изменения для фракционного PvP в безопасных зонах ---
        const myAlign=this.playerSelf.alignment || 0;
        const targetAlign=target.alignment || 0;
        const planetId = locData? locData.planetId :'unknown';

        let isValidFactionPvP = false;
        const isEnemyFaction = (myAlign > 0 && targetAlign < 0) || (myAlign < 0 && targetAlign > 0);
        if ((planetId === 'dantooine' || planetId === 'korriban') && isEnemyFaction) {
            isValidFactionPvP = true;
        }

        const notSameZone = this.playerSelf.locationId !== target.locationId;
        const isSafeZone = locData && locData.isSafeZone;

        const myLockRaw = localStorage.getItem(`sw_pvp_combat_lock_${this.playerSelf.name}`);
        let myLockActive = false;
        if (myLockRaw) {
            try {
                const lock = JSON.parse(myLockRaw);
                if (Date.now() - (lock.ts || 0) < 10 * 60 * 1000) myLockActive = true;
                else localStorage.removeItem(`sw_pvp_combat_lock_${this.playerSelf.name}`);
            } catch(e) {}
        }

        const targetBotName = target.id && target.id.startsWith('real_') ? target.id.slice(5) : target.name;
        const targetLockRaw = localStorage.getItem(`sw_pvp_combat_lock_${targetBotName}`);
        let targetLockActive = false;
        if (targetLockRaw) {
            try {
                const lock = JSON.parse(targetLockRaw);
                if (Date.now() - (lock.ts || 0) < 10 * 60 * 1000) targetLockActive = true;
                else localStorage.removeItem(`sw_pvp_combat_lock_${targetBotName}`);
            } catch(e) {}
        }

        const myHpPct = (this.playerSelf.hp / this.playerSelf.maxHp) * 100;
        let attackDisabled = target.hp <= 0 || notSameZone || (isSafeZone && !isValidFactionPvP) || myHpPct < 50 || myLockActive || targetLockActive;
        let attackLabel = 'Пошаговое сражение до 100к кр.';

        if (myLockActive) attackLabel = 'вы уже в бою';
        else if (targetLockActive) attackLabel = 'цель уже в бою';
        else if (target.hp <= 0) attackLabel = 'без сознания';
        else if (myHpPct < 50) attackLabel = 'мало HP (<50%)';
        else if (notSameZone) attackLabel = 'вторая зона';
        else if (isSafeZone && !isValidFactionPvP) attackLabel = 'безопасная зона';
        else if (isValidFactionPvP && isSafeZone) attackLabel = 'Фракционный приступ (Безопасность игнорируется)';
        let robDisabled = !canRob;
        let robLabel = canRob ? '35% шанс • до 45% от банка' : `⏳ ${robCooldown}`;
        if (isRealPlayer && target.money > 0) {
            const cooldownKey = `sw_rob_cooldown_real_${target.name}_by_${this.playerSelf.name}`;
            const lastRob = parseInt(localStorage.getItem(cooldownKey) || '0', 10);
            const msLeft = (12*3600000) - (Date.now() - lastRob);
            if (msLeft > 0) {
                robDisabled=true;
                const hLeft = Math.floor(msLeft/3600000);
                const mLeft = Math.floor((msLeft % 3600000) / 60000);
                robLabel = `⏳ ${hLeft}ч ${mLeft}мин`;
            } else {
                robDisabled=false;
                robLabel ='35% шанс • до 45% от банка';
            }
        }

        const onlineLabel = target.isOnline
            ? `<span class="pm-status online"><span class="pm-status-dot"></span>Онлайн</span>`
            : `<span class="pm-status offline"><span class="pm-status-dot"></span>Оффлайн</span>`;

        const alignVal=target.alignment || 0;
        const alignPctActual = Math.min(Math.abs(alignVal), 500000) / 500000;
        const alignPct = alignVal === 0 ? 0 : Math.min(1, 0.3 + (0.7 * Math.pow(alignPctActual, 0.3)));

        // Multi-stage color progression (same logic as ProfileScreen)
        let hue, sat, lit;
        if (alignVal > 0) {
            hue=200+ (alignPctActual*40);
            sat=60+ (alignPctActual*40);
            lit = 60 - (alignPctActual*30);
        } else {
            hue = 15 - (alignPctActual *15);
            sat=60+ (alignPctActual*40);
            lit = 55 - (alignPctActual*30);
        }

        const hslColor = `hsl(${hue}, ${sat}%, ${lit}%)`;
        const bgStyle = alignPct > 0? `background: radial-gradient( circle at top right, ${hslColor} 0%, transparent ${60 + alignPctActual * 40}%), #1a1a1a;` :'';


        document.getElementById('pm-content').innerHTML = `<!-- ВЕРХНЯЯ ПАНЕЛЬ: Аватар + Инфо (Стиль ProfileScreen) -->
            <div class="profile-layout" style="padding: 10px 14px 20px; position: relative;${bgStyle}">
                <!-- Close button -->
                <button id="pm-close-btn" style="
                    position: absolute; top: 10px; right: 10px; z-index: 10;
                    background: rgba(0,0,0,0.35); border: none; color: #fff;
                    width: 30px; height: 30px; border-radius: 50%;
                    font-size: 16px; cursor: pointer; line-height: 1;
                    display: flex; align-items: center; justify-content: center;
                ">✕</button>
                <div class="profile-top">
                    <!-- Левая колонка: Инфо -->
                    <div class="profile-info-col">
                        <div class="profile-info-card">
                            <span class="profile-info-label">Никнейм</span>
                            <span class="profile-info-val" style="color:${alignPct !== 0 ? hslColor :'#fff'};">${target.name}</span>
                        </div>
                        <div class="profile-info-card rank-card" style="border: 1px solid ${alignPct !== 0 ? hslColor : '#333'}; background: #151515;">
                            <span class="profile-info-label">Звание</span>
                            <span class="profile-info-val" style="color:${alignPct > 0 ? hslColor :'#eee'};font-weight:900;">${target.title || 'Контрабандист'}</span>
                        </div>
                        <div class="profile-info-card">
                            <span class="profile-info-label">Уровень</span>
                            <span class="profile-info-val">${target.level} LVL</span>
                        </div>
                        ${(() => {
                const LOCATION_BACKGROUNDS = {'korriban_landing': '/public/assets/locations/korriban/landing_bg.png',
                    'korriban_academy': '/public/assets/locations/korriban/academy_bg.png',
                    'korriban_valley': '/public/assets/locations/korriban/valley_bg.png',
                    'korriban_library': '/public/assets/locations/korriban/library_bg.png',
                    'korriban_shyrack': '/public/assets/locations/korriban/shyrack_bg.png',
                    'korriban_ceremony_hall': '/public/assets/locations/korriban/ceremony_bg.png',
                    'korriban_sith_temple': '/public/assets/locations/korriban/temple_bg.png',
                    'korriban_arena': '/public/assets/locations/korriban/arena_bg.png',
                    'tomb_ajunta_pall': '/public/assets/locations/korriban/ajunta_pall_bg.png',
                    'tomb_tulak_hord': '/public/assets/locations/korriban/tulak_hord_bg.png',
                    'tomb_marka_ragnos': '/public/assets/locations/korriban/marka_ragnos_bg.png',
                    'tatooine_spaceport': '/public/assets/locations/tatooine/spaceport_bg.png',
                    'tatooine_cantina': '/public/assets/locations/tatooine/cantina_bg.png',
                    'tatooine_market': '/public/assets/locations/tatooine/market_bg.png',
                    'tatooine_job_center': '/public/assets/locations/tatooine/job_bg.png',
                    'jundland_wastes': '/public/assets/locations/tatooine/wastes_bg.png',
                    'tatooine_dune_sea': '/public/assets/locations/tatooine/dune_bg.png',
                    'coruscant_spaceport': '/public/assets/locations/coruscant/spaceport_bg.png',
                    'coruscant_bank': '/public/assets/locations/coruscant/bank_bg.png',
                    'coruscant_dexters': '/public/assets/locations/coruscant/dexters_bg.png',
                    'coruscant_level_1313': '/public/assets/locations/coruscant/level1313_bg.png',
                    'coruscant_senate': '/public/assets/locations/coruscant/senate_bg.png',
                    'coruscant_jedi_temple': '/public/assets/locations/coruscant/temple_bg.png',
                    'dantooine_courtyard': '/public/assets/locations/dantooine/courtyard_bg.png',
                    'dantooine_enclave': '/public/assets/locations/dantooine/enclave_bg.png',
                    'dantooine_meditation': '/public/assets/locations/dantooine/meditation_bg.png',
                    'dantooine_padawan': '/public/assets/locations/dantooine/padawan_bg.png',
                    'dantooine_knowledge': '/public/assets/locations/dantooine/knowledge_bg.png',
                    'dantooine_crystal_caves': '/public/assets/locations/dantooine/caves_bg.png',
                };
                const bgUrl = LOCATION_BACKGROUNDS[target.locationId || 'tatooine_spaceport'];
                if (bgUrl) {
                    return `
                            <div class="profile-location-hero" style="background-image: url('${bgUrl}');">
                                <span class="profile-info-label" style="color:#ccc;">Где находится</span>
                                <span class="profile-location-name">${locationName}</span>
                            </div>`;
                } else {
                    return`
                            <div class="profile-info-card">
                                <span class="profile-info-label">Где находится</span>
                                <span class="profile-info-val loc-val">${locationName}</span>
                            </div>`;
                }
            })()}
                        <div class="profile-info-card online-card">
                            <span class="profile-info-label">Статус</span>
                            <span class="profile-info-val" style="padding: 0; background: transparent; border: none;">${onlineLabel}</span>
                        </div>
                    </div>

                    <!-- Правая колонка: Аватар + Репутация -->
                    <div class="profile-avatar-col">
                        <div class="profile-avatar-box">
                            ${target.avatar && (target.avatar.startsWith('data:image') || target.avatar.startsWith('http'))
                ?`<img src="${target.avatar}" style="width:100%; height:100%; object-fit:cover;">`
                : `<div class="profile-avatar-inner" style="font-size: 90px; justify-content: center; line-height: 1;">${target.avatar || '👤'}</div>`
            }
                        </div>
                        <div class="profile-side-bar">
                            <div class="profile-side-item ${(target.alignment || 0) > 0 ? 'light' : (target.alignment || 0) < 0 ? 'dark' : 'neutral'}">
                                ${(target.alignment || 0) > 0
                ? `<span class="profile-side-icon" style="color:#f1c40f;">🌟</span><span style="color: #27ae60;font-size:12px;">Светлая сторона<br><b>${target.alignment}</b> очков</span>`
                : (target.alignment ||0) < 0
                    ? `<span class="profile-side-icon" style="color:#e74c3c;">🔴</span><span style="color: #c0392b;font-size:12px;">Темная сторона<br><b>${Math.abs(target.alignment)}</b> очков</span>`
                    : `<span class="profile-side-icon">⚖️</span><span>Нейтральный<br><b>0</b> очков</span>`}
                            </div>
                            <div class="profile-side-item" style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
                                <div style="display: flex; align-items: center; gap: 4px;">
                                    <span class="profile-side-icon">⭐</span>
                                    <span>Репутация: <b style="font-size: 14px;">${target.reputation || 0}</b></span>
                                </div>
                                <div style="display: flex; gap: 8px; margin-top: 4px;">
                                    <button id="pm-rep-up" class="pm-rep-btn ${target.reputationVotes?.[this.playerSelf.name] ==='up' ? 'active-up' : ''}">👍</button>
                                    <button id="pm-rep-down" class="pm-rep-btn ${target.reputationVotes?.[this.playerSelf.name] === 'down' ? 'active-down' : ''}">👎</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- СТАТИСТИКА -->
                <div class="profile-section">
                    <div class="profile-section-title">СТАТИСТИКА</div>
                    <div class="profile-stats-grid">
                        <div class="profile-stat-item">
                            <div class="profile-stat-icon">🛡️</div>
                            <div class="profile-stat-label">Статутура</div>
                            <div class="profile-stat-val">${target.constitution}</div>
                        </div>
                        <div class="profile-stat-item">
                            <div class="profile-stat-icon">💪</div>
                            <div class="profile-stat-label">Физ. сила</div>
                            <div class="profile-stat-val">${target.strength}</div>
                        </div>
                        <div class="profile-stat-item">
                            <div class="profile-stat-icon">💨</div>
                            <div class="profile-stat-label">Ловкость</div>
                            <div class="profile-stat-val">${target.agility}</div>
                        </div>
                        <div class="profile-stat-item">
                            <div class="profile-stat-icon">🧠</div>
                            <div class="profile-stat-label">Интеллект</div>
                            <div class="profile-stat-val">${target.intellect}</div>
                        </div>
                        <div class="profile-stat-item">
                            <div class="profile-stat-icon">⚔️</div>
                            <div class="profile-stat-label">Атака (Броня)</div>
                            <div class="profile-stat-val">${target.attack}</div>
                        </div>
                        <div class="profile-stat-item">
                            <div class="profile-stat-icon">🛡️</div>
                            <div class="profile-stat-label">Защита (Броня)</div>
                            <div class="profile-stat-val">${target.defense}</div>
                        </div>
                    </div>
                </div>

                <!-- ДЕЙСТВИЯ (Атака/Грабёж) -->
                <div id="pm-result" class="pm-result" style="margin-bottom: 10px; font-weight: 700; font-size: 13px; text-align: center; border-radius: 6px; padding: 10px;"></div>
                <div class="profile-section" style="border-radius: 6px; padding: 10px 0; background: transparent; border: none;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <button class="pm-btn pm-attack-btn" id="pm-attack-btn" style="
                            background:${attackDisabled ?'#444' : 'linear-gradient(135deg, #c0392b, #e74c3c)'}; color: ${attackDisabled ? '#999' : '#fff'};
                            border: 2px solid ${attackDisabled ? '#333' : '#a93226'}; border-radius: 10px; padding: 14px 10px;
                            font-weight: 900; font-size: 15px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px;
                        ">
                            ⚔️ Атаковать
                            <small style="font-size: 10px; font-weight: 500; opacity: 0.8;">${attackLabel}</small>
                        </button>
                        
                        <button class="pm-btn pm-rob-btn" id="pm-rob-btn" style="
                            background: ${robDisabled ?'#444' : 'linear-gradient(135deg, #6c3483, #9b59b6)'}; color: ${robDisabled ? '#999' : '#fff'};
                            border: 2px solid ${robDisabled ? '#333' : '#5b2c6f'}; border-radius: 10px; padding: 14px 10px;
                            font-weight: 900; font-size: 15px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px;
                        ">
                            🎭 Ограбит
                            <small style="font-size: 10px; font-weight: 500; opacity: 0.8;">${robLabel}</small>
                        </button>
                    </div>
                </div>

                <!-- ИМУЩЕСТВО -->
                <div class="profile-section profile-section-last" style="margin-bottom: 20px;">
                    <div class="profile-section-title">ИМУЩЕСТВО</div>
                    ${target.ship && target.ship.id && ITEMS[target.ship.id] ? (() => {
                        const shipItem = ITEMS[target.ship.id];

                        return`
                        <div class="profile-ship-card">
                            <div class="ship-icon" style="background-image:url('/public/assets/ships/${{ 'ship_ebon_hawk': 'ebon_hawk', 'ship_fury_interceptor': 'sith_fury', 'ship_phantom': 'phantom', 'ship_defender': 'defender' }[target.ship.id] || 'ebon_hawk'}.png');background-size:cover;background-position:center;border-radius:8px;"></div>
                            <div class="ship-info">
                                <div class="ship-name">${shipItem.name}</div>
                                <div class="ship-desc">${shipItem.description}</div>
                            </div>
                        </div>
                        `;
                    })() : `
                    <div class="profile-property-empty">
                        <span>🏠</span>
                        <span>Имущество отсутствует</span>
                    </div>
                    `}
                </div>

            </div>
        `;

        document.getElementById('pm-close-btn').addEventListener('click', () => this.hide());
        document.getElementById('pm-attack-btn')?.addEventListener('click', () => this._doAttack(target));
        document.getElementById('pm-rob-btn')?.addEventListener('click', () => this._doRob(target));

        document.getElementById('pm-rep-up')?.addEventListener('click', () => this._voteReputation(target.id, 'up'));
        document.getElementById('pm-rep-down')?.addEventListener('click', () => this._voteReputation(target.id, 'down'));
    }

    _voteReputation(targetId, voteType) {
        if (this.isVoting) return;
        this.isVoting = true;
        this._updateVoteButtonsState(true);

        PvPManager.voteReputation(
            this.playerSelf,
            targetId,
            voteType,
            (newTargetId) => {
                // Success is handled by network event, but we can ensure cleanup here too if needed
            },
            (errorMsg) => {
                this.isVoting = false;
                this._updateVoteButtonsState(false);
                this._showResult(errorMsg, 'error');
            }
        );
        
        // Safety timeout
        setTimeout(() => {
            if (this.isVoting) {
                this.isVoting = false;
                this._updateVoteButtonsState(false);
            }
        }, 5000);
    }

    _updateVoteButtonsState(disabled) {
        const upBtn = document.getElementById('pm-rep-up');
        const downBtn = document.getElementById('pm-rep-down');
        if (upBtn) {
            upBtn.disabled = disabled;
            upBtn.style.opacity = disabled ? '0.5' : '1';
            upBtn.style.cursor = disabled ? 'not-allowed' : 'pointer';
        }
        if (downBtn) {
            downBtn.disabled = disabled;
            downBtn.style.opacity = disabled ? '0.5' : '1';
            downBtn.style.cursor = disabled ? 'not-allowed' : 'pointer';
        }
    }



    // Решает цель по ID - это может быть бот или реальный игрок с другой вкладки
    _resolveTarget(id, fallbackName = null) {
        let pvpTarget = PvPManager.resolveTarget(id);
        if (!pvpTarget) {
            const playerName = typeof id === 'string' && id.startsWith('real_') ? id.replace('real_', '') : (fallbackName || id);
            try {
                const raw = localStorage.getItem(`sw_player_save_${playerName}`);
                if (raw) {
                    const data = JSON.parse(raw);
                    pvpTarget = this._normalizeTargetData({
                        id: id || `real_${playerName}`,
                        name: playerName,
                        avatar: data.avatar || '🧑🚀',
                        className: 'Контрабандист',
                        title: data.title || null,
                        level: data.level || 1,
                        hp: data.hp !== undefined ? data.hp : 100,
                        maxHp: data.totalMaxHp || data.baseMaxHp || 100,
                        money: data.money || 0,
                        attack: data.totalAttack || data.baseAttack || 0,
                        defense: data.totalDefense || data.baseDefense || 0,
                        strength: data.totalStrength || data.baseStrength || 10,
                        agility: data.totalAgility || data.baseAgility || 10,
                        constitution: data.totalConstitution || data.baseConstitution || 10,
                        intellect: data.totalIntellect || data.baseIntellect || 10,
                        alignment: data.alignment || 0,
                        isOnline: (Date.now() - (data.lastOnline || 0)) < 60000,
                        locationId: data.locationId || 'unknown',
                        reputation: data.reputation || 0,
                        reputationVotes: data.reputationVotes || {},
                        ship: data.ship || null
                    });
                }
            } catch(e) {}
        }
        return pvpTarget;
    }

    _doAttack(target) {
        PvPManager.doAttack(
            this.playerSelf,
            target,
            (errorMsg) => this._showResult(errorMsg, 'error'),
            () => this.hide()
        );
    }

    _doRob(target) {
        PvPManager.doRob(
            this.playerSelf,
            target,
            (successMsg, newTargetId) => {
                this._showResult(successMsg, 'success');
                // We might need to refresh the target data if we want to show updated money
                // But usually we just show the result.
                // If we want to refresh, we'd need to request profile again or manually update local copy.
                // For now, let's just leave it or manually deduct for UI update?
                // The target object is a local copy in _render logic.
                if (target.money) target.money = Math.max(0, target.money - (target._lastStolen || 0));
                // But we don't know exact stolen amount here easily unless passed back.
                
                // Just refresh if ID available?
                // const p = this._resolveTarget(newTargetId);
                // if(p) setTimeout(() => this._render(p), 300);
            },
            (errorMsg, cooldown) => {
                this._showResult(errorMsg, 'error');
                if (cooldown) {
                    const btn = document.getElementById('pm-rob-btn');
                    if(btn){
                        btn.querySelector('small').textContent = `⏳ ${cooldown}`;
                        btn.style.background = '#444';
                        btn.style.color = '#999';
                        btn.style.border = '2px solid #333';
                    }
                }
            }
        );
    }

    _getSafeZoneWarnData() {
        return PvPManager.getSafeZoneWarnData();
    }

    _showResult(msg, type) {
        const el = document.getElementById('pm-result');
        if(el) {
            el.textContent = msg;
            el.className = `pm-result pm-result-${type}`;
        }
    }
}
