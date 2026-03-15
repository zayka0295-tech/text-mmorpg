export class NetworkManager {
    constructor(player) {
        this.player = player || null;
        this.playerId = player?.id || null;
        this.socket = null;
        this.isConnected = false;
        
        // Determine protocol: wss if https, ws if http
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Determine host from the current runtime environment
        // If we are on port 8080 (dev client), assume server is on 8081
        // If we are on production (port 8081 or 443), use same host
        let host = window.location.host;
        if (host.includes(':8080')) {
            host = host.replace(':8080', ':8081');
        }
        
        this.serverUrl = `${protocol}//${host}`;
        this.reconnectInterval = 5000;
    }

    connect() {
        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            return;
        }

        console.log(`Connecting to server at ${this.serverUrl}...`);
        this.socket = new WebSocket(this.serverUrl);

        this.socket.onopen = () => {
            console.log('Connected to game server!');
            this.isConnected = true;
            document.dispatchEvent(new CustomEvent('network:connected'));
            if (this.player) {
                this._sendAuth();
                // Send initial location
                this.sendMove(this.player.locationId);
            }
        };

        // Listen for local player movement
        document.addEventListener('player:location-changed', (e) => {
            if (this.isConnected && this.player && e.detail.player === this.player) {
                this.sendMove(this.player.locationId);
            }
        });

        this.socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this._handleMessage(message);
            } catch (e) {
                console.error('Error parsing server message:', e);
            }
        };

        this.socket.onclose = () => {
            console.log('Disconnected from server.');
            this.isConnected = false;
            // Auto-reconnect
            setTimeout(() => this.connect(), this.reconnectInterval);
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    setPlayer(player) {
        this.player = player;
        this.playerId = player?.id || null;
    }

    login(username, password) {
        this.send('login', { username, password });
    }

    loginWithToken(token) {
        this.send('login_token', { token });
    }

    register(username, password) {
        this.send('register', { username, password });
    }

    sendReputationVote(targetId, voteType) {
        try {
            if (!targetId) throw new Error('targetId is required');
            if (!voteType) throw new Error('voteType is required');
            return this.send('reputation_vote', { targetId, voteType });
        } catch (error) {
            console.error('[NetworkManager.sendReputationVote]', {
                message: error?.message,
                targetId,
                voteType,
                isConnected: this.isConnected,
                readyState: this.socket?.readyState
            });
            return false;
        }
    }

    send(type, payload = {}) {
        if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.error('[NetworkManager.send] Socket is not ready', {
                type,
                isConnected: this.isConnected,
                readyState: this.socket?.readyState
            });
            return false;
        }

        try {
            const message = { type, ...payload };
            this.socket.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('[NetworkManager.send] Failed to send message', {
                type,
                message: error?.message,
                payload
            });
            return false;
        }
    }

    _sendAuth() {
        if (!this.player) return;
        this.send('auth', {
            name: this.player.name,
            playerId: this.player.id,
            locationId: this.player.locationId,
            avatar: this.player.avatar,
            title: this.player.title,
            level: this.player.level,
            alignment: this.player.alignment
        });
    }

    sendMove(locationId) {
        this.send('move', { locationId });
    }

    requestProfile(targetId) {
        this.send('request_profile', { targetId });
    }

    sendCombatResult(targetId, resultData) {
        this.send('combat_result', { targetId, data: resultData });
    }

    sendRobResult(targetId, resultData) {
        this.send('rob_result', { targetId, data: resultData });
    }

    saveProfile(data) {
        this.send('save_profile', { data });
    }

    _handleMessage(message) {
        switch (message.type) {
            case 'welcome':
                console.log(`Server welcomed us. ID: ${message.id}`);
                this.networkId = message.id; // Store session ID
                break;
            case 'login_success':
            case 'register_success':
                this.playerId = message.profile?.id || this.playerId;
                document.dispatchEvent(new CustomEvent('network:auth_success', { detail: message }));
                break;
            case 'login_error':
            case 'register_error':
                document.dispatchEvent(new CustomEvent('network:auth_error', { detail: message }));
                break;
            case 'chat':
                // Пока просто логируем, позже подключим к ChatScreen
                console.log(`Chat [${message.senderId}]: ${message.text}`);
                document.dispatchEvent(new CustomEvent('network:chat', { detail: message }));
                break;
            case 'player_joined':
                console.log(`Player joined: ${message.name}`);
                document.dispatchEvent(new CustomEvent('network:player_joined', { detail: message }));
                break;
            case 'player_left':
                console.log(`Player left: ${message.id}`);
                document.dispatchEvent(new CustomEvent('network:player_left', { detail: message }));
                break;
            case 'move':
                document.dispatchEvent(new CustomEvent('network:player_moved', { detail: message }));
                break;
            case 'update_state':
                // Тут будем обновлять позиции других игроков
                document.dispatchEvent(new CustomEvent('network:update_state', { detail: message }));
                break;
            case 'request_profile':
                if (message.targetId === this.networkId || message.targetId === this.player?.id || message.targetId === this.playerId) {
                    const myData = this.player.getFullStats();
                    this.send('profile_data', { 
                        targetId: message.senderId, // Send back to requester
                        data: myData 
                    });
                }
                break;
            case 'profile_data':
                document.dispatchEvent(new CustomEvent('network:profile_data', { detail: message }));
                break;
            case 'combat_result':
                document.dispatchEvent(new CustomEvent('network:combat_result', { detail: message }));
                break;
            case 'rob_result':
                document.dispatchEvent(new CustomEvent('network:rob_result', { detail: message }));
                break;
            case 'zone_population':
                document.dispatchEvent(new CustomEvent('network:zone_population', { detail: message }));
                break;
            case 'reputation_vote_result':
                document.dispatchEvent(new CustomEvent('network:reputation_vote_result', { detail: message }));
                break;
            case 'reputation_update':
            case 'reputation_vote':
                // Someone voted for us
                if (this.player) {
                    const { voteType, senderName } = message; // senderName might need to be added by server or client
                    // Actually server passes whatever we sent. 
                    // We need to know who voted? Client A sent { targetId, voteType }.
                    // Server forwards it. Server adds senderId? 
                    // Server `handleMessage` adds `senderId`, `senderName` to message object!
                    // So we have `message.senderName`.
                    
                    if (typeof message.newReputation === 'number') {
                        this.player.reputation = message.newReputation;
                    } else {
                        const change = voteType === 'up' ? 1 : -1;
                        this.player.reputation = (this.player.reputation || 0) + change;
                    }
                    // Save the change
                    this.saveProfile(this.player.getFullStats());
                    
                    const notifType = voteType === 'up' ? 'success' : 'warning';
                    const notifMsg = voteType === 'up' 
                        ? `👍 ${message.senderName || 'Кто-то'} поднял вам репутацию!` 
                        : `👎 ${message.senderName || 'Кто-то'} опустил вам репутацию!`;
                    
                    document.dispatchEvent(new CustomEvent('game:notification', { detail: { msg: notifMsg, type: notifType } }));
                }
                break;
            default:
                console.log('Unknown server message:', message);
        }
    }
}
