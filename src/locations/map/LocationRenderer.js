// ==========================================
//LOCATION RENDERER - стандартный рендер сети
// ==========================================
import { LOCATIONS } from '../../engine/Data/locations.js';
import { BACK_LINKS } from './mapConstants.js';

export class LocationRenderer {
    /**
     * Рендер стандартной сетки локаций для любого места
     * не имеющий кастомного дизайна.*/
    static render(loc, isSearching) {
        const locId = loc.id;
        let html = '';
        let backTargetId = null;
        let backTargetLoc = null;

        html += `<div class="locations-grid">`;

        if (loc.connections && Array.isArray(loc.connections)) {
            loc.connections.forEach(targetId => {
                const targetLoc = LOCATIONS[targetId];
                if (!targetLoc) return;

                //Если эта ссылка "Назад" - не рисуем в сеть, храним отдельно
                if (BACK_LINKS[locId] === targetId) {
                    backTargetId = targetId;
                    backTargetLoc = targetLoc;
                    return;
                }

                html += `
                    <div class="location-box" data-location-id="${targetId}">
                        <div class="location-title">🌐 ${targetLoc.name}</div>
                        <div class="location-desc">${targetLoc.description}</div>
                        <button class="location-action-btn btn-move" data-target="${targetId}">
                            ПЕРЕЙТИ ТУДА 🚶
                        </button>
                    </div>`;
            });
        }

        html += `</div>`; //конец сетки

        //Кнопка "Назад" под сеткой
        if (backTargetId && !isSearching) {
            html += `
                <div class="map-back-wrapper">
                    <button class="btn-map-back btn-move" data-target="${backTargetId}">
                        ← НАЗАД:${backTargetLoc.name}
                    </button>
                </div>
            `;
        }

        return html;
    }
}
