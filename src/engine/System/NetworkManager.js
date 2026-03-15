export class NetworkManager {
    constructor(player) {
        this.player = player || null;
        this.socket = null;
        this.isConnected = false;
        
        // Determine protocol: wss if https, ws if http
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Determine host: use current host (e.g. text-mmorpg.onrender.com or localhost:8081)
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
        if (this.isConnected) {
            this._sendAuth(); // Re-identify if connection was already open
            this.sendMove(this.player.locationId);
        }
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

    send(type, payload = {}) {
        if (!this.isConnected) return;
        const message = { type, ...payload };
        this.socket.send(JSON.stringify(message));
    }

    _sendAuth() {
        if (!this.player) return;
        this.send('auth', { name: this.player.name });
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
                if (message.targetId === this.networkId) { // It's for me
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
            default:
                console.log('Unknown server message:', message);
        }
    }
}
