import { LOCATIONS } from '../../engine/Data/locations.js';

export class ZonePlayers {
    constructor(container, player) {
        this.container = container;
        this.player = player;
        this.onlinePlayers = new Map(); // id -> { name, locationId, ... }

        this._initNetworkListeners();
    }

    _findPlayerKey(id, name) {
        if (id && this.onlinePlayers.has(id)) {
            return id;
        }

        if (name) {
            for (const [key, player] of this.onlinePlayers.entries()) {
                if (player.name === name) {
                    return key;
                }
            }
        }

        return null;
    }

    _upsertPlayer(playerData) {
        if (!playerData) return;

        const key = this._findPlayerKey(playerData.id, playerData.name);
        const existing = key ? this.onlinePlayers.get(key) : null;
        const merged = {
            ...(existing || {}),
            ...playerData
        };

        const nextKey = playerData.id || key;
        if (!nextKey) return;

        if (key && key !== nextKey) {
            this.onlinePlayers.delete(key);
        }

        this.onlinePlayers.set(nextKey, merged);
    }

    _initNetworkListeners() {
        document.addEventListener('network:zone_population', (e) => {
            const { players } = e.detail;
            this.onlinePlayers.clear();
            players.forEach(p => {
                // Only add if not self (though server might filter? No, server sends all DB players)
                // We filter self in render, but good to have all data.
                this._upsertPlayer(p);
            });
            this.refreshPlayersInZone();
        });

        document.addEventListener('network:player_joined', (e) => {
            const { id, name, locationId, avatar, title, level, alignment } = e.detail;
            // If they joined in my zone, add them or update status
            if (locationId === this.player.locationId) {
                this._upsertPlayer({ id, name, locationId, avatar, title, level, alignment, isOnline: true });
                this.refreshPlayersInZone();
            }
        });

        document.addEventListener('network:player_left', (e) => {
            const { id, name } = e.detail;
            const key = this._findPlayerKey(id, name);
            const p = key ? this.onlinePlayers.get(key) : null;
            if (p) {
                p.isOnline = false; // Mark offline instead of deleting
                this.refreshPlayersInZone();
            }
        });

        document.addEventListener('network:player_moved', (e) => {
            const { senderId, locationId } = e.detail;
            // If moved INTO my zone
            if (locationId === this.player.locationId) {
                const key = this._findPlayerKey(senderId, e.detail.senderName);
                const p = key ? this.onlinePlayers.get(key) : null;
                if (p) {
                    p.locationId = locationId;
                    p.isOnline = true;
                } else {
                    // We need name. If we don't have it, we might need to fetch it or wait for population update.
                    // Ideally 'move' message should include name for simple clients.
                    // But 'zone_population' is sent on move too by server now! 
                    // So this might be redundant if server sends population on every move.
                    // Server code: await sendZonePopulation(ws, message.locationId);
                    // This sends population TO THE MOVER.
                    // But other people need to know the mover arrived.
                    // Broadcast 'move' doesn't include name currently.
                    // Let's rely on 'move' to just remove if they left.
                    // If they arrived, we might miss name.
                    // But wait, server/index.js line 230: broadcast(message, ws).
                    // message has senderName added in line 47!
                    this._upsertPlayer({ 
                        id: senderId, 
                        name: e.detail.senderName || `Игрок ${senderId.substr(0,4)}`,
                        locationId, 
                        isOnline: true 
                    });
                }
                this.refreshPlayersInZone();
            } 
            // If moved OUT of my zone
            else {
                const key = this._findPlayerKey(senderId, e.detail.senderName);
                if (key && this.onlinePlayers.has(key)) {
                    this.onlinePlayers.delete(key);
                    this.refreshPlayersInZone();
                }
            }
        });

        document.addEventListener('network:combat_result', (e) => {
            const { data } = e.detail;
            this.showPvpNotification(data);
            
            // Also refresh stats if we took damage or lost money
            // This relies on local state being updated elsewhere, or we should update it here?
            // Actually PvPManager updates localStorage for legacy, but for network play, 
            // the attacker sent us the result. We need to apply the damage/theft to OURSELVES here.
            // Wait, we are the defender receiving this message.
            // The attacker calculated the result. We need to trust them (for now) and update our HP/Money.
            
            if (this.player.name !== data.attacker) { // Check if we are the victim (message was sent to us)
                 if (data.stolen > 0) {
                     this.player.money = Math.max(0, this.player.money - data.stolen);
                 }
                 if (data.hpLost > 0) {
                     this.player.hp = Math.max(0, this.player.hp - data.hpLost);
                 }
                 this.player.save();
            }
        });

        document.addEventListener('network:rob_result', (e) => {
            const { data } = e.detail;
            this.showPvpNotification(data);
            
            if (this.player.name !== data.attacker) {
                 if (data.stolen > 0) {
                     this.player.money = Math.max(0, this.player.money - data.stolen);
                 }
                 this.player.save();
            }
        });
        
        // Also listen for my own move to refresh the list (filter by my new location)
        document.addEventListener('player:location-changed', () => {
            this.refreshPlayersInZone();
        });
    }

    renderPlayersInZone(locationId) {
        const playersHere = [];
        
        for (const p of this.onlinePlayers.values()) {
            if (p.locationId === locationId && p.id !== `real_${this.player.name}` && p.id !== this.player.id && p.name !== this.player.name) {
                playersHere.push(p);
            }
        }

        // Sort: Online first, then by name
        playersHere.sort((a, b) => {
            if (a.isOnline === b.isOnline) return a.name.localeCompare(b.name);
            return b.isOnline ? 1 : -1;
        });

        let html = `<style>
                #players-in-zone::-webkit-scrollbar { display: none; }
            </style>
            <div style="background: #151515; border: 1px solid #333; border-radius: 8px; margin-bottom: 20px;">
                <div style="padding: 10px 15px; border-bottom: 1px solid #333; font-weight: 800; font-size: 13px; color: #f1c40f; text-transform: uppercase;">
                    Игроки рядом (${playersHere.length})
                </div>
                <div id="players-in-zone" style="max-height: 210px; overflow-y: auto; -ms-overflow-style: none; scrollbar-width: none;">`;

        if (playersHere.length === 0) {
            html += `<div style="padding: 15px; text-align: center; color: #666; font-size: 14px;">Никого нет рядом</div>`;
        } else {
            playersHere.forEach(p => {
                const isOnline = p.isOnline;
                const statusColor = isOnline ? '#2ecc71' : '#7f8c8d';
                const statusText = isOnline ? 'Онлайн' : 'Оффлайн';
                const opacity = isOnline ? '1' : '0.6';
                
                // Use avatar if available
                let avatarHtml = '🧑🚀';
                if (p.avatar && (p.avatar.startsWith('data:') || p.avatar.startsWith('http'))) {
                    avatarHtml = `<img src="${p.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">`;
                } else if (p.avatar) {
                    avatarHtml = p.avatar;
                }

                html += `
                    <div class="map-player-card" data-playername="${p.name}" data-playerid="${p.id}" style="
                        padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.05); 
                        display: flex; align-items: center; cursor: pointer; 
                        background: transparent; transition: background 0.2s; opacity: ${opacity};
                    ">
                        <div style="width: 32px; height: 32px; border-radius: 6px; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 20px; margin-right: 12px; flex-shrink: 0; overflow: hidden;">
                            ${avatarHtml}
                        </div>
                        <div style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                                <div style="font-weight: 800; font-size: 14px; color: #fff;">
                                    <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${statusColor}; margin-right:4px; box-shadow: 0 0 5px ${statusColor};"></span>
                                    ${p.name}
                                </div>
                            </div>
                            <div style="color: #999; font-size: 11px; margin-bottom: 0;">${statusText} ${p.level ? `• ${p.level} ур.` : ''}</div>
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
        if (box) {
             const newHtml = this.renderPlayersInZone(this.player.locationId);
             
             // We need to find the DOM element corresponding to the whole widget.
             // It has "background: #151515...".
             const widget = box.parentElement; 
             if (widget) {
                 widget.outerHTML = newHtml;
                 // Re-find the new elements to attach listeners
                 this.attachPlayerCardListeners();
             }
        }
    }

    showPvpNotification(data) {
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
        const cards = this.container.querySelectorAll('.map-player-card');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const name = card.getAttribute('data-playername');
                const id = card.getAttribute('data-playerid');
                const modal = window.gameInstance?.playerModal;
                const preview = id ? this.onlinePlayers.get(id) || null : null;
                if (name && modal) modal.show(name, id, preview);
            });
        });
    }
}
