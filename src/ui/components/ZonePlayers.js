import { LOCATIONS } from '../../engine/Data/locations.js';

export class ZonePlayers {
    constructor(container, player) {
        this.container = container;
        this.player = player;
    }

    renderPlayersInZone(locationId) {
        const loc = LOCATIONS[locationId];
        const botPlayers = []; // Removed fake bots from the game

        //Добавляем реальных игроков из других вкладок.
        const realPlayers = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith('sw_player_save_')) continue;
            const pName = key.slice('sw_player_save_'.length);
            if (pName === this.player.name) continue; //себя не показываем
            try {
                const data = JSON.parse(localStorage.getItem(key));
                if (data && data.locationId === locationId) {
                    const targetAlign = data.alignment || 0;
                    const isPlayerOnline = (Date.now() - (data.lastOnline || 0)) < 60000;
                    // Always show players in the same zone — PvP eligibility is gated by PvPManager
                    realPlayers.push({
                        id: `real_${pName}`,
                        name: pName,
                        avatar: data.avatar || '🧑🚀',
                        title: data.title || 'Контрабандист',
                        level: data.level || 1,
                        hp: data.hp || 100,
                        maxHp: data.totalMaxHp || data.baseMaxHp || 100,
                        alignment: targetAlign,
                        isOnline: isPlayerOnline,
                        isReal: true
                    });
                }
            } catch (e) { /* ignore */ }
        }
        const playersHere = [...botPlayers, ...realPlayers].sort((a, b) => {
            if (a.isOnline && !b.isOnline) return -1;
            if (!a.isOnline && b.isOnline) return 1;
            return (b.level || 1) - (a.level || 1);
        });
        let html = `<style>
                #players-in-zone::-webkit-scrollbar { display: none; }
            </style>
            <div style="background: #151515; border: 1px solid #333; border-radius: 8px; margin-bottom: 20px;">
                <div style="padding: 10px 15px; border-bottom: 1px solid #333; font-weight: 800; font-size: 13px; цвет: #f1c40f; text-transform: uppercase;">Игроки в этой зоне</div>
                <div id="players-in-zone" style="max-height: 210px; overflow-y: auto; -ms-overflow-style: none; scrollbar-width: none;">`;

        if (playersHere.length === 0) {
            html += `<div style="padding: 15px; text-align: center; color: #666; font-size: 14px;">Никого нет рядом</div>`;
        } else {
            playersHere.forEach(p => {
                const statusColor = p.isOnline ? '#2ecc71' : '#7f8c8d';
                const pAlign = p.alignment || 0;
                const alignPctActual = Math.min(Math.abs(pAlign), 500000) / 500000;
                const alignPct = pAlign === 0 ? 0 : Math.min(1, 0.3 + (0.7 * Math.pow(alignPctActual, 0.3)));
                let nameStyle;
                if (alignPct > 0) {
                    let hue, sat, lit;
                    if (pAlign > 0) {
                        hue = 200 + (alignPctActual * 40);
                        sat = 60 + (alignPctActual * 40);
                        lit = 60 - (alignPctActual * 10);
                    } else {
                        hue = 15 - (alignPctActual * 15);
                        sat = 60 + (alignPctActual * 40);
                        lit = 55 - (alignPctActual * 10);
                    }
                    const hslColor = `hsl(${hue}, ${sat}%, ${lit}%)`;
                    nameStyle = `color: color-mix(in srgb, ${hslColor} ${alignPct * 100}%, #ffffff); text-shadow: 0 0 ${alignPct * 5}px ${hslColor};`;
                } else {
                    nameStyle = 'color: #ffffff;';
                }

                const avatarHtml = (p.avatar && (p.avatar.startsWith('http') || p.avatar.startsWith('data:image')))
                    ? `<img src="${p.avatar}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">`
                    : p.avatar || '🧑🚀';

                html += `
                    <div class="map-player-card" data-playername="${p.name}" style="padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; cursor: pointer; background: transparent; transition: background 0.2s;">
                        <div style="width: 32px; height: 32px; border-radius: 6px; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 20px; margin-right: 12px; flex-shrink: 0;">
                            ${avatarHtml}
                        </div>
                        <div style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                                <div style="font-weight: 800; font-size: 14px; ${nameStyle}">
                                    <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${statusColor}; margin-right:4px; box-shadow: 0 0 5px ${statusColor};"></span>
                                    ${p.name}
                                </div>
                            </div>
                            <div style="color: #999; font-size: 11px; margin-bottom: 0;">${p.title} • Lv${p.level}</div>
                        </div>
                    </div>
                `;
            });
        }

        html += `</div></div>`;
        return html;
    }

    refreshPlayersInZone() {
        const box = this.container.querySelector('#players-in-zone');
        if (!box) return;
        const newHtml = this.renderPlayersInZone(this.player.locationId);
        const tmp = document.createElement('div');
        tmp.innerHTML = newHtml;
        const newBox = tmp.querySelector('#players-in-zone');
        if (newBox) {
            box.replaceWith(newBox);
            this.attachPlayerCardListeners();
        }
    }

    showPvpNotification(data) {
        //Удаляем старое сообщение
        const old = document.getElementById('pvp-attack-notif');
        if (old) old.remove();

        const el = document.createElement('div');
        el.id = 'pvp-attack-notif';
        const isRobbery = data.isRobbery;
        const titleText = isRobbery ? '🎭 Вас ограбили!' : '⚔️ На вас напали!';
        const actionText = isRobbery ? 'обворовал' : 'накал на';

        el.innerHTML = `
            <div style="
                position: fixed; top: 70px; left: 50%; transform: translateX(-50%);
                z-index: 9999; background: #111; border: 2px solid ${isRobbery ? '#f1c40f' : '#e74c3c'};
                color: #fff; padding: 16px 20px; border-radius: 8px; width: 90%; max-width: 360px;
                box-shadow: 0 0 20px rgba(${isRobbery ? '241,196,15' : '231,76,60'},0.4); animation: slideDown 0.3s ease;
            ">
                <div style="color:${isRobbery ? '#f1c40f' : '#e74c3c'};font-size:13px;font-weight:900;margin-bottom:5px;text-transform:uppercase;">${titleText}</div>
                <div style="font-size:14px;">Игрок <b style="color:#f39c12;">${data.attacker}</b> ${actionText}вас!</div>
                ${data.stolen > 0?`<div style="font-size:13px;color:#e74c3c;margin-top:5px;">Втрачено: <b>-${data.stolen.toLocaleString()} кр.</b></div>` : ''}
                ${data.hpLost > 0 ? `<div style="font-size:13px;color:#e74c3c;">Хп: <b>-${data.hpLost} HP</b></div>` : ''}
            </div>
        `;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 7000);
    }

    attachPlayerCardListeners() {
        // Hover is now handled by CSS .map-player-card:hover
        const cards = this.container.querySelectorAll('.map-player-card');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const name = card.getAttribute('data-playername');
                const modal = window.gameInstance?.playerModal;
                if (name && modal) modal.show(name);
            });
        });
    }
}
