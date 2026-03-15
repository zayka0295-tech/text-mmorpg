export class NetworkManager {
    constructor(player) {
        this.player = player;
        this.socket = null;
        this.isConnected = false;
        this.serverUrl = 'ws://localhost:8081';
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
            this._sendAuth();
        };

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

    send(type, payload = {}) {
        if (!this.isConnected) return;
        const message = { type, ...payload };
        this.socket.send(JSON.stringify(message));
    }

    _sendAuth() {
        this.send('auth', { name: this.player.name });
    }

    _handleMessage(message) {
        switch (message.type) {
            case 'welcome':
                console.log(`Server welcomed us. ID: ${message.id}`);
                // Можно сохранить ID сессии, если нужно
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
            case 'update_state':
                // Тут будем обновлять позиции других игроков
                document.dispatchEvent(new CustomEvent('network:update_state', { detail: message }));
                break;
            default:
                console.log('Unknown server message:', message);
        }
    }
}
