import { LOCATIONS } from '../engine/Data/locations.js';
import { ITEMS } from '../engine/Data/items.js';


export class ProfileScreen {
    constructor(screenManager, player) {
        this.screenManager = screenManager;
        this.player = player;
        this.container = document.getElementById('profile-screen');

        this._init();
    }

    _init() {
        this.screenManager.subscribe('profile-screen', () => {
            this.render();
        });

        // Listen to player changes for live updates if the screen is active
        const updateIfActive = () => {
            if (this.container && this.container.classList.contains('active')) {
                this.render();
            }
        };

        document.addEventListener('player:stats-changed', updateIfActive);
        document.addEventListener('player:level-changed', updateIfActive);
        document.addEventListener('player:alignment-changed', updateIfActive);
        document.addEventListener('player:money-changed', updateIfActive);

        //Лив синх: когда вторая вкладка обновляет наш сейв (напр. голосует репутацию)
        window.addEventListener('storage', (e) => {
            if (e.key === `sw_player_save_${this.player.name}`) {
                try {
                    const data = JSON.parse(e.newValue || '{}');
                    if (data.reputation !== undefined) {
                        this.player.reputation = data.reputation;
                        this.player.reputationVotes = data.reputationVotes || {};
                    }
                    //Если профиль сейчас виден — перерендерим
                    const screen = document.getElementById('profile-screen');
                    if (screen && screen.classList.contains('active')) this.render();
                } catch (err) { /* ignore */ }
            }
        });
    }

    render() {
        const loc = LOCATIONS[this.player.locationId];
        const locationName = loc ? `${(loc?.planet || '')} — ${(loc?.name || '')}` : 'Неизвестно';

        //Звание: по умолчанию 'Контрабандист' может измениться историей
        const currentTitle = this.player.title || 'Контрабандист';

        const alignVal = this.player.alignment || 0;
        const alignPctActual = Math.min(Math.abs(alignVal), 500000) / 500000;
        const alignPct = alignVal === 0 ? 0 : Math.min(1, 0.3 + (0.7 * Math.pow(alignPctActual, 0.3)));

        // Multi-stage color progression:
        // Light: starts pale sky blue, moves to vibrant blue, ends in deep dark blue
        // Dark: starts pale orange/red, moves to bright blood red, ends in dark crimson
        let hue, sat, lit;
        if (alignVal > 0) {
            hue = 200 + (alignPctActual * 40); // 200 (sky blue) -> 240 (pure blue)
            sat = 60 + (alignPctActual * 40);  // 60% -> 100%
            lit = 60 - (alignPctActual * 30);  // 60% (bright) -> 30% (deep/dark)
        } else {
            hue = 15 - (alignPctActual * 15);  // 15 (orange-red) -> 0 (pure red)
            sat = 60 + (alignPctActual * 40);  // 60% -> 100%
            lit = 55 - (alignPctActual * 30);  // 55% (bright) -> 25% (very deep red)
        }

        const hslColor = `hsl(${hue}, ${sat}%, ${lit}%)`;
        const bgStyle = alignPct > 0 ? `background: radial-gradient(circle at top right, ${hslColor} 0%, transparent ${60 + alignPctActual * 40}%), #1a1a1a;` : '';

        this.container.innerHTML = `
            <div class="profile-layout" style="padding-top: 10px; ${bgStyle}">
                <link rel="stylesheet" href="src/styles/profile_ship.css">

                <!-- ВЕРХНЯЯ ПАНЕЛЬ: Аватар + Инфо -->
                <div class="profile-top">

                    <div class="profile-info-col">
                        <div class="profile-info-card">
                            <span class="profile-info-label">Никнейм</span>
                            <span class="profile-info-val" style="color:${alignPct !== 0 ? hslColor : '#fff'};">${this.player.name}</span>
                        </div>
                        <div class="profile-info-card rank-card" style="border: 1px solid ${alignPct !== 0 ? hslColor : '#333'}; background: #151515;">
                            <span class="profile-info-label">Звание</span>
                            <span class="profile-info-val" style="color:${alignPct > 0 ? hslColor : '#eee'}; font-weight: 900;">${currentTitle}</span>
                        </div>
                        <div class="profile-info-card">
                            <span class="profile-info-label">Уровень</span>
                            <span class="profile-info-val">${this.player.level} LVL</span>
                        </div>
                        ${(() => {
                const LOCATION_BACKGROUNDS = {
                    'korriban_landing': '/public/assets/locations/korriban/landing_bg.png',
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
                    'coruscant_market': '/public/assets/locations/coruscant/market_bg.png',
                    'coruscant_bank': '/public/assets/locations/coruscant/bank_bg.png',
                    'coruscant_dexters': '/public/assets/locations/coruscant/dexters_bg.png',
                    'coruscant_job_center': '/public/assets/locations/coruscant/job_bg.png',
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
                const bgUrl = LOCATION_BACKGROUNDS[this.player.locationId];
                if (bgUrl) {
                    return `
                                    <div class="profile-location-hero" style="background-image: url('${bgUrl}');">
                                        <span class="profile-info-label" style="color:#ccc;">Где находится</span>
                                        <span class="profile-location-name">${locationName}</span>
                                    </div>`;
                } else {
                    return `
                                    <div class="profile-info-card">
                                        <span class="profile-info-label">Где находится</span>
                                        <span class="profile-info-val loc-val">${locationName}</span>
                                    </div>`;
                }
            })()}
                        <div class="profile-info-card online-card">
                            <span class="profile-info-label">Статус</span>
                            <span class="profile-info-val" style="padding: 0; background: transparent; border: none;">
                                <span class="pm-status online" style="margin:0;"><span class="pm-status-dot"></span>Онлайн</span>
                            </span>
                        </div>
                    </div>

                    <!-- Правая колонка: Аватар + Репутация -->
                    <div class="profile-avatar-col">
                        <div class="profile-avatar-box" id="avatar-upload-btn" style="cursor: pointer; position: relative;">
                            ${this.player.avatar.startsWith('data:image') || this.player.avatar.startsWith('http')
                ?`<img src="${this.player.avatar}" style="width:100%; height:100%; object-fit:cover;">`
                : `<div class="profile-avatar-inner" style="font-size: 90px; justify-content: center; line-height: 1;">${this.player.avatar}</div>`}
                            <div class="avatar-upload-overlay">ИЗМЕНИТЬ</div>
                        </div>
                        <input type="file" id="avatar-file-input" accept="image/*" style="display:none">
                        <div class="profile-side-bar">
                            <div class="profile-side-item${this.player.alignment > 0 ? ' light' : this.player.alignment < 0 ? ' dark' : ' neutral'}" style="flex-direction:column; align-items:center; gap:2px; text-align:center;">
                                ${this.player.alignment > 0
                ? `<div style="display:flex;align-items:center;gap:4px;"><span style="color:#f1c40f;">🌟</span><span style="color:#27ae60;font-size:11px;font-weight:700;">Светлая сторона</span></div><div style="color:#27ae60;font-size:13px;font-weight:900;">${this.player.alignment} очков</div>`
                : this.player.alignment < 0
                    ? `<div style="display:flex;align-items:center;gap:4px;"><span style="color:#e74c3c;">🔴</span><span style="color:#c0392b;font-size:11px;font-weight:700;">Темная сторона</span></div><div style="color:#c0392b;font-size:13px;font-weight:900;">${Math.abs(this.player.alignment)} очков</div>`
                    : `<div style="display:flex;align-items:center;gap:4px;"><span>⚖️</span><span style="font-size:11px;font-weight:700;">Нейтральный</span></div><div style="font-size:13px;font-weight:900;">0 очков</div>`}
                            </div>
                            <div class="profile-side-item">
                                <span class="profile-side-icon">⭐</span>
                                <span>Репутация: <b>${this.player.reputation || 0}</b></span>
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
                            <div class="profile-stat-label">Телосложение</div>
                            <div class="profile-stat-val">${this.player.constitution}</div>
                        </div>
                        <div class="profile-stat-item">
                            <div class="profile-stat-icon">💪</div>
                            <div class="profile-stat-label">Физ. сила</div>
                            <div class="profile-stat-val">${this.player.strength}</div>
                        </div>
                        <div class="profile-stat-item">
                            <div class="profile-stat-icon">💨</div>
                            <div class="profile-stat-label">Ловкость</div>
                            <div class="profile-stat-val">${this.player.agility}</div>
                        </div>
                        <div class="profile-stat-item">
                            <div class="profile-stat-icon">🧠</div>
                            <div class="profile-stat-label">Интеллект</div>
                            <div class="profile-stat-val">${this.player.intellect}</div>
                        </div>
                        <div class="profile-stat-item">
                            <div class="profile-stat-icon">⚔️</div>
                            <div class="profile-stat-label">Атака (Броня)</div>
                            <div class="profile-stat-val">${this.player.attack}</div>
                        </div>
                        <div class="profile-stat-item">
                            <div class="profile-stat-icon">🛡️</div>
                            <div class="profile-stat-label">Защита (Броня)</div>
                            <div class="profile-stat-val">${this.player.defense}</div>
                        </div>
                    </div>
                </div>

                <!-- ИМУЩЕСТВО -->
                <div class="profile-section profile-section-last">
                    <div class="profile-section-title">ИМУЩЕСТВО</div>
                    ${this.player.ship && this.player.ship.id && ITEMS[this.player.ship.id] ? (() => {
                        const shipItem = ITEMS[this.player.ship.id];

                        const maxHp = shipItem.stats?.maxHp || 100;
                        const hpPercent = Math.round((this.player.ship.hp / maxHp) * 100);

                        let hpColor = '#27ae60';
                        if (hpPercent < 70) hpColor = '#f1c40f';
                        if (hpPercent < 30) hpColor = '#e74c3c';

                        return`
                        <div class="profile-ship-card">
                            <div class="ship-icon" style="background-image:url('/public/assets/ships/${{ 'ship_ebon_hawk': 'ebon_hawk', 'ship_fury_interceptor': 'sith_fury', 'ship_phantom': 'phantom', 'ship_defender': 'defender' }[this.player.ship.id] || 'ebon_hawk'}.png');background-size:cover;background-position:center;border-radius:8px;"></div>
                            <div class="ship-info">
                                <div class="ship-name">${(shipItem?.name || '')}</div>
                                <div class="ship-desc">${shipItem.description}</div>
                                <div class="ship-status">
                                    <span>Состояние корпуса:</span>
                                    <div class="ship-hp-bar">
                                        <div class="ship-hp-fill" style="width: ${hpPercent}%; background: ${hpColor};"></div>
                                    </div>
                                    <span style="color: ${hpColor}; font-weight: bold; margin-left: 5px;">${this.player.ship.hp} / ${maxHp} (${hpPercent}%)</span>
                                </div>
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

        this.attachEventListeners();
    }

    _handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Image = e.target.result;
            
            // Basic validation for image size (optional, e.g. < 2MB)
            if (base64Image.length > 2 * 1024 * 1024 * 1.37) { // ~2MB
                alert("Файл слишком велик! Выберите изображение менее 2МБ.");
                return;
            }

            this.player.avatar = base64Image;
            this.player.save();
            this.render(); // Re-render profile with new image
        };
        reader.readAsDataURL(file);
    }

    attachEventListeners() {
         const upBtn = this.container.querySelector('#avatar-upload-btn');
         const fileInp = this.container.querySelector('#avatar-file-input');
         if (upBtn && fileInp) {
             upBtn.addEventListener('click', () => fileInp.click());
             fileInp.addEventListener('change', (e) => this._handleAvatarUpload(e));
         }
    }

    _fmt(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    update() { }
}
