// ==========================================
//CORUSCANT RENDERER - рендер локаций Корусанта
// ==========================================
import { LOCATIONS } from '../../../engine/Data/locations.js';

export class CoruscantRenderer {
    static handles(locId) {
        return locId === 'coruscant_spaceport';
    }

    static render(locId) {
        if (locId === 'coruscant_spaceport') return CoruscantRenderer._spaceport();
        return '';
    }

    static _spaceport() {
        return `
            <div class="korriban-academy-layout planet-coruscant">
                <!-- Row 1: Market + Dexters -->
                <div class="academy-middle-row" style="margin-bottom:20px;">
                    <div class="location-box academy-hall" data-location-id="coruscant_market">
                        <div class="location-title">🌐 ${(LOCATIONS['coruscant_market']?.name || '')}</div>
                        <div class="location-desc">${(LOCATIONS['coruscant_market']?.description || '')}</div>
                        <button class="location-action-btn btn-move" data-target="coruscant_market">${'ПЕРЕЙТИ ТУДА'} 🚶</button>
                    </div>
                    <div class="location-box academy-temple" data-location-id="coruscant_dexters">
                        <div class="location-title">🌐 ${(LOCATIONS['coruscant_dexters']?.name || '')}</div>
                        <div class="location-desc">${(LOCATIONS['coruscant_dexters']?.description || '')}</div>
                        <button class="location-action-btn btn-move" data-target="coruscant_dexters">${'ПЕРЕЙТИ ТУДА'} 🚶</button>
                    </div>
                </div>

                <!-- Row 2: Senate + Jedi Temple -->
                <div class="academy-middle-row" style="margin-bottom:20px;">
                    <div class="location-box academy-hall" data-location-id="coruscant_senate">
                        <div class="location-title">🌐 ${(LOCATIONS['coruscant_senate']?.name || '')}</div>
                        <div class="location-desc">${(LOCATIONS['coruscant_senate']?.description || '')}</div>
                        <button class="location-action-btn btn-move" data-target="coruscant_senate" style="background:#3498db;color:#fff;">${'ВОЙТИ В СЕНАТ'} 🏛️</button>
                    </div>
                    <div class="location-box academy-hall" data-location-id="coruscant_jedi_temple">
                        <div class="location-title">🌐 ${(LOCATIONS['coruscant_jedi_temple']?.name || '')}</div>
                        <div class="location-desc">${(LOCATIONS['coruscant_jedi_temple']?.description || '')}</div>
                        <button class="location-action-btn btn-move" data-target="coruscant_jedi_temple" style="background:#f39c12;color:#fff;">${'ВОЙТИ В ХРАМ'} ⚔️</button>
                    </div>
                </div>

                <!-- Row 3: Level 1313 (wide) -->
                <div class="academy-middle-row">
                    <div class="location-box academy-hall" data-location-id="coruscant_level_1313" style="grid-column:span 2;border-color:#c0392b;">
                        <div class="location-title" style="color:#c0392b;">⚠️ ${(LOCATIONS['coruscant_level_1313']?.name || '')}</div>
                        <div class="location-desc">${(LOCATIONS['coruscant_level_1313']?.description || '')}</div>
                        <button class="location-action-btn btn-move" data-target="coruscant_level_1313" style="background:#c0392b;color:#fff;">${'ПЕРЕЙТИ В ТРУЩОБЫ'} 🚶</button>
                    </div>
                </div>
            </div>
        `;
    }
}
