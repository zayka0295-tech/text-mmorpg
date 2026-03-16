// ==========================================
//DANTOOINE RENDERER — рендер локаций Дантуина
// ==========================================
import { LOCATIONS } from '../../../engine/Data/locations.js';

export class DantooineRenderer {
    static handles(locId) {
        return [
            'dantooine_enclave', 'dantooine_meditation',
            'dantooine_crystal_caves', 'dantooine_knowledge'
        ].includes(locId);
    }

    static render(locId, isSearching, searchTimeLeft) {
        if (locId === 'dantooine_enclave')        return DantooineRenderer._enclave();
        if (locId === 'dantooine_meditation')     return DantooineRenderer._meditation();
        if (locId === 'dantooine_crystal_caves')  return DantooineRenderer._crystalCaves(isSearching, searchTimeLeft);
        if (locId === 'dantooine_knowledge')      return DantooineRenderer._knowledge();
        return '';
    }

    static _enclave() {
        return `<div class="korriban-academy-layout planet-dantooine">
                <div class="npc-box npc-box--jedi" id="npc_vandar">
                    <div class="npc-name npc-name--jedi">Бот: Мастер Вандар Токаре</div>
                </div>

                <div class="academy-middle-row">
                    <div class="location-box academy-hall location-box--jedi" data-location-id="dantooine_knowledge">
                        <div class="location-title location-title--jedi">🌐${(LOCATIONS['dantooine_knowledge']?.name || '')}</div>
                        <div class="location-desc">${LOCATIONS['dantooine_knowledge'].description}</div>
                        <button class="location-action-btn btn-move btn-move--jedi" data-target="dantooine_knowledge">ПЕРЕЙТИ ТУДА 🚶</button>
                    </div>
                    <div class="location-box academy-temple location-box--jedi" data-location-id="dantooine_padawan">
                        <div class="location-title location-title--jedi">🌐${(LOCATIONS['dantooine_padawan']?.name || '')}</div>
                        <div class="location-desc">${LOCATIONS['dantooine_padawan'].description}</div>
                        <button class="location-action-btn btn-move btn-move--jedi" data-target="dantooine_padawan">ПРОЙТИ ТУДА 🚶</button>
                    </div>
                </div>

                <div class="academy-bottom-row academy-bottom-row--jedi">
                    <div class="dantooine-circle-hub">
                        <div class="dantooine-circle-hub__inner">
                            <div class="location-title location-title--jedi-hub">🌐${(LOCATIONS['dantooine_meditation']?.name || '')}</div>
                            <button class="location-action-btn btn-move btn-move--jedi-hub" data-target="dantooine_meditation">ПЕРЕЙТИ В ЗАЛ 🧘</button>
                        </div>
                    </div>
                </div>

                <div class="academy-exit-row">
                    <button class="location-action-btn btn-move btn-exit-dark" data-target="dantooine_courtyard">ВЫЙТИ ВО ВНУТРЕННИЙ ДВОР АНКЛАВА 🚶</button>
                </div>
            </div>`;
    }

    static _meditation() {
        return `<div class="korriban-academy-layout planet-dantooine">
                <div style="text-align:center;margin-top:50px;">
                    <div class="location-title location-title--jedi">🧘 ЗАЛ МЕДИТАЦИИ</div>
                    <div class="location-desc" style="color:#ccc;max-width:400px;margin:10px auto;">
                        Здесь можно восстановить силы и установить свою связь с силой.
                    </div>
                    <button id="btn-meditate" class="location-action-btn" style="background:#8e44ad;color:white;padding:15px 30px;font-size:18px;margin-top:20px;">
                        🧘 МЕДИТАЦИЯ
                    </button>
                    <div style="margin-top:40px;">
                        <button class="location-action-btn btn-move btn-move--jedi" data-target="dantooine_enclave">
                            ВЕРНУТЬСЯ В АНКЛАВ 🚶
                        </button>
                    </div>
                </div>
            </div>`;
    }

    static _crystalCaves(isSearching, searchTimeLeft) {
        const backBtn = isSearching
            ? `<button class="btn-map-back" disabled style="opacity:0.4;cursor:not-allowed;" title="Подождите остановки поиска">← НАЗАД: Внутренний двор анклава</button>`
            : `<button class="btn-map-back btn-move" data-target="dantooine_courtyard">← НАЗАД: Внутренний двор анклава</button>`;

        return `<div class="korriban-academy-layout crystal-caves-layout planet-dantooine">
                <div class="location-box crystal-search-box">
                    <div class="location-title crystal-search-title">💎 ПОИСК КРИСТАЛОВ</div>
                    <div class="location-desc crystal-search-desc">
                        Здесь можно найти редкие кайбер-кристаллы для светового меча.
                    </div>
                    ${isSearching
                        ?`<div class="crystal-searching-state">
                               <ion-icon name="hourglass-outline" class="spin-animation"></ion-icon>
                               <span id="crystal-search-timer">${searchTimeLeft ? '⏱️ ' + searchTimeLeft : 'ПОИСК...'}</span>
                           </div>`
                        : `<button id="btn-search-crystals" class="location-action-btn btn-search-crystals">
                               НАЧАТЬ ПОИСК (10 мин) 🔍
                           </button>`
                    }
                </div>
                <div class="map-back-wrapper">${backBtn}</div>
            </div>
        `;
    }

    static _knowledge() {
        const loc = LOCATIONS['dantooine_knowledge'];
        return `
            <div class="korriban-academy-layout">
                <div class="location-title location-title--jedi">🌐 ${(loc?.name || '')}</div>
                <div class="location-desc" style="margin-bottom:20px;">${loc.description}</div>

                <div class="location-box academy-hall" style="border-color:#3498db;cursor:default;">
                    <div class="location-title" style="color:#3498db;">📚 АРХИВЫ ДЖЕДАЕВ</div>
                    <div class="location-desc">
                        Древние записи и голокроны хранятся здесь. Если у вас есть Холокрон Джедаев, вы можете попытаться постичь его мудрость или покинуть его ордена.
                    </div>
                    <button id="btn-library-holocron" class="location-action-btn" style="background:#2980b9;color:white;margin-top:15px;">
                        ВЗАИМОДЕЙСТВИЕ С АРХИВОМ 🎛️
                    </button>
                </div>

                <div class="map-back-wrapper">
                    <button class="btn-map-back btn-move--jedi" data-target="dantooine_enclave">← НАЗАД: АНКЛАВ ДЖЕДАЕВ</button>
                </div>
            </div>`;
    }
}
