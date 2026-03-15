// ==========================================
//KORRIBAN RENDERER — рендер локаций Коррибана
// ==========================================
import { LOCATIONS } from '../../../engine/Data/locations.js';
import { BACK_LINKS } from '../mapConstants.js';

export class KorribanRenderer {
    /**
     * Определяет ли эта локация обрабатывается этим рендером*/
    static handles(locId) {
        return [
            'korriban_academy', 'korriban_arena', 'korriban_library',
            'tomb_ajunta_pall', 'tomb_tulak_hord', 'tomb_marka_ragnos',
            'korriban_shyrack', 'korriban_ceremony_hall'
        ].includes(locId);
    }

    /**
     * Возвращает HTML для локации.
     *@param{string}locId
     * @param {boolean} isSearching — идет сейчас поиск/раскопки*/
    static render(locId, isSearching) {
        if (locId === 'korriban_academy') return KorribanRenderer._academy();
        if (locId === 'korriban_arena')   return KorribanRenderer._arena(isSearching);
        if (locId === 'korriban_shyrack') return KorribanRenderer._shyrack(isSearching);
        if (locId === 'korriban_ceremony_hall') return KorribanRenderer._ceremonyHall();
        if (locId === 'korriban_library') return KorribanRenderer._library();
        if (['tomb_ajunta_pall','tomb_tulak_hord','tomb_marka_ragnos'].includes(locId)) {
            return KorribanRenderer._tomb(locId, isSearching);
        }
        return '';
    }

    static _ceremonyHall() {
        const loc = LOCATIONS['korriban_ceremony_hall'];
        return `
            <div class="korriban-academy-layout planet-korriban">
                <div class="location-title" style="color:#e74c3c;font-size:20px;font-weight:bold;">🌐 ${(loc?.name || '')}</div>
                <div class="location-desc" style="margin-bottom:20px;color:#ccc;">${loc.description}</div>

                <div class="location-box academy-hall" style="cursor:default;">
                    <div class="location-title" style="color:#e74c3c;">🧘 МЕДИТАЦИОННАЯ КАМЕРА</div>
                    <div class="location-desc">
                        Сосредоточьте свою ненависть и черпайте силу Темной Стороны.
                    </div>
                    <button id="btn-sith-meditate" class="location-action-btn" style="background:#c0392b;color:white;margin-top:15px;font-size:16px;">
                        🧘 ВОЙТИ В МЕДИТАЦИОННУЮ КАМЕРУ
                    </button>
                </div>

                <div class="map-back-wrapper">
                    <button class="btn-map-back btn-move" data-target="korriban_academy">← НАЗАД: АКАДЕМИЯ СИТХОВ</button>
                </div>
            </div>`;
    }

    static _academy() {
        return `<div class="korriban-academy-layout planet-korriban">
                <div class="npc-box" id="npc_harkun">
                    <div class="npc-name">Бот: Смотритель Харкун</div>
                </div>

                <div class="academy-middle-row">
                    <div class="location-box academy-hall" data-location-id="korriban_ceremony_hall">
                        <div class="location-title">🌐${(LOCATIONS['korriban_ceremony_hall']?.name || '')}</div>
                        <div class="location-desc">${LOCATIONS['korriban_ceremony_hall'].description}</div>
                        <button class="location-action-btn btn-move" data-target="korriban_ceremony_hall">ПЕРЕЙТИ ТУДА 🚶</button>
                    </div>
                    <div class="location-box academy-temple" data-location-id="korriban_sith_temple">
                        <div class="location-title">🌐${(LOCATIONS['korriban_sith_temple']?.name || '')}</div>
                        <div class="location-desc">${LOCATIONS['korriban_sith_temple'].description}</div>
                        <button class="location-action-btn btn-move" data-target="korriban_sith_temple">ПЕРЕЙТИ ТУДА 🚶</button>
                    </div>
                </div>

                <div class="academy-bottom-row">
                    <div class="pentagon-box">
                        <div class="pentagon-content">
                            <button class="pentagon-btn btn-move" data-target="korriban_arena">ПЕРЕЙТИ В АРЕНУ ⚔️</button>
                        </div>
                    </div>
                </div>

                <div class="academy-exit-row">
                    <button class="location-action-btn btn-move btn-exit-dark" data-target="korriban_landing">ВЕРНУТЬСЯ НА ПОСАДОЧНУЮ ПЛОЩАДКУ 🏃</button>
                </div>
            </div>`;
    }

    static _arena(isSearching) {
        const backId = BACK_LINKS['korriban_arena'];
        const backLoc = LOCATIONS[backId];
        return `<div class="korriban-academy-layout planet-korriban">
                <div class="location-box crystal-search-box">
                    <div class="location-title crystal-search-title" style="color:#e74c3c;">🔴 ОБМЕН КРИСТАЛОВ</div>
                    <div class="location-desc crystal-search-desc" style="color:#ccc;">
                        На Арене часто ломаются световые мечи. Местные торговцы дорого скупят ваши кайбер-кристаллы в обмен на кредиты или знание темной стороны.
                    </div>
                    <button id="btn-exchange-crystal" class="location-action-btn" style="background:#c0392b;color:white;">
                        СДАТЬ КАЙБЕР-КРИСТАЛЛ 💎
                    </button>
                </div>
                ${!isSearching && backLoc ?`
                    <div class="map-back-wrapper">
                        <button class="btn-map-back btn-move" data-target="${backId}">← НАЗАД: ${(backLoc?.name || '')}</button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    static _tomb(locId, isSearching) {
        const backId = BACK_LINKS[locId];
        const backLoc = LOCATIONS[backId];
        return `<div class="korriban-academy-layout planet-korriban">
                <div class="location-box crystal-search-box">
                    <div class="location-title crystal-search-title">⛏️ РАСКОПКИ ГРАБНИЦЫ</div>
                    <div class="location-desc crystal-search-desc">
                        Исследуйте древние реликвии. Есть небольшой шанс найти обломок Холокрона Джедаев. Осторожно: раскопки могут привлечь внимание к охране гробницы.
                    </div>
                    ${isSearching
                        ?`<div class="crystal-searching-state" style="color:#e67e22;">
                               <ion-icon name="hammer-outline" class="spin-animation"></ion-icon> ИДУТ РАСКОПКИ...
                           </div>`
                        : `<button id="btn-excavate-tomb" class="location-action-btn btn-search-crystals" style="background:#d35400;">
                               НАЧАТЬ РАСКОПКИ (25 мин) ⛏️
                           </button>`
                    }
                </div>
                ${!isSearching && backLoc ? `
                    <div class="map-back-wrapper">
                        <button class="btn-map-back btn-move" data-target="${backId}">← НАЗАД: ${(backLoc?.name || '')}</button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    static _shyrack(isSearching) {
        const backId = BACK_LINKS['korriban_shyrack'];
        const backLoc = LOCATIONS[backId];
        return `<div class="korriban-academy-layout planet-korriban">
                <div class="location-box crystal-search-box">
                    <div class="location-title crystal-search-title">💎 ПОИСК КРИСТАЛОВ</div>
                    <div class="location-desc crystal-search-desc">
                        Исследуйте глубины пещеры в поисках редких красных кайбер-кристаллов. Но будьте осторожны: шум поиска может привлечь внимание опасных местных жителей.
                    </div>
                    ${isSearching
                        ?`<div class="crystal-searching-state" style="color:#e74c3c;">
                               <ion-icon name="search-outline" class="spin-animation"></ion-icon> ИДЕТ ПОИСК...
                           </div>`
                        : `<button id="btn-search-shyrack-crystals" class="location-action-btn btn-search-crystals" style="background:#c0392b;">
                               ИСКАТЬ КРИСТАЛЛЫ (10 мин) 🔍
                           </button>`
                    }
                </div>
                ${!isSearching && backLoc ? `
                    <div class="map-back-wrapper">
                        <button class="btn-map-back btn-move" data-target="${backId}">← НАЗАД: ${(backLoc?.name || '')}</button>
                    </div>
                ` : ''}
            </div>
        `;
    }
    static _library() {
        const locId = 'korriban_library';
        const loc = LOCATIONS[locId];
        const backId = 'korriban_landing'; // Hardcoded fallback OR use BACK_LINKS
        const backLoc = LOCATIONS[backId];
        return `
            <div class="korriban-academy-layout planet-korriban">
                <div class="location-title" style="color:#e74c3c;font-size:20px;font-weight:bold;">📚 ${(loc?.name || '')}</div>
                <div class="location-desc" style="margin-bottom:20px;color:#ccc;">${loc.description}</div>

                <div class="location-box academy-hall" style="cursor:default;">
                    <div class="location-title" style="color:#8e44ad;">Хранилище ГОЛОКРОНОВ</div>
                    <div class="location-desc">
                        Здесь хранятся записи древних ситхов. Если у вас есть холокрон ситхов, то вы можете его расшифровать.
                    </div>
                    <button id="btn-decode-sith-holocron" class="location-action-btn" style="background:#8e44ad;color:white;margin-top:15px;font-size:16px;">
                        🔮 РАСШИФРОВАТЬ ГОЛОКРОН СИТХОВ
                    </button>
                </div>

                <div class="map-back-wrapper">
                    <button class="btn-map-back btn-move" data-target="${backId}">← НАЗАД:${(backLoc?.name || '')}</button>
                </div>
            </div>
        `;
    }
}
