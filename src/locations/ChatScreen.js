// ChatScreen — no PlayerModal import needed, uses window.gameInstance.playerModal


const CHAT_STORAGE_KEY = 'sw_chat_history';
const MAX_MESSAGES = 200;

export class ChatScreen {
    constructor(screenManager, player) {
        this.screenManager = screenManager;
        this.player = player;
        this.container = document.getElementById('chat-screen');
        this.messages = this._loadHistory();
        this._rendered = false;
        //Используем общий PlayerModal с main.js

        this._init();
    }

    _init() {
        // Слушаем сетевые сообщения
        document.addEventListener('network:chat', (e) => {
            this._addMessage(e.detail);
        });

        this.screenManager.subscribe('any', (screenId) => {
            if (screenId === 'chat-screen') {
                if (!this._rendered) {
                    this.render();
                    this._rendered = true;
                }
                this._scrollToBottom();
            }
        });
    }

    render() {
        this.container.innerHTML = `<div class="chat-layout">
                <div class="chat-header">
                    <div class="chat-header-title">
                        <span class="chat-online-dot"></span>
                        ГАЛАКТИЧЕСКИЙ ЧАТ
                    </div>
                    <div class="chat-header-sub">Общий канал • Галактика Звездных войн</div>
                    <button id="chat-clear-btn" class="chat-clear-btn" title="Очистить чат">
                        🗑
                    </button>
                </div>

                <div class="chat-messages" id="chat-messages">${this.messages.length === 0 ? this._renderEmpty() : this.messages.map(m => this._renderMessage(m)).join('')}
                </div>

                <div class="chat-input-area">
                    <div class="chat-input-wrapper">
                        <div class="chat-author-badge">${this._getPlayerInitial()}</div>
                        <input
                            type="text"
                            id="chat-input"
                            class="chat-input"
                            placeholder="Написать сообщение..."
                            maxlength="200"
                            autocomplete="off"
                        />
                        <button id="chat-send-btn" class="chat-send-btn">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>`;

        this._attachListeners();
    }

    _renderEmpty() {
        return `<div class="chat-empty">
            <div class="chat-empty-icon">💬</div>
            <div>Пока тихо в галактике...<br>Напиши первое сообщение!</div>
        </div>`;
    }

    _renderMessage(msg) {
        const isPlayer = msg.isPlayer;
        const time = new Date(msg.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        if (msg.isSystem) {
            return `
                <div class="chat-system-msg">
                    <span>${msg.text}</span>
                    <span class="chat-msg-time">${time}</span>
                </div>
            `;
        }

        let authorAlign = 0;
        let avatarUrl = null;
        if (isPlayer) {
            // First try to use the alignment stored in the message payload
            if (msg.alignment !== undefined) {
                authorAlign = msg.alignment;
            } else if (msg.author === this.player.name) {
                authorAlign = this.player.alignment || 0;
            } else {
                try {
                    const raw = localStorage.getItem(`sw_player_save_${msg.author}`);
                    if (raw) {
                        const data = JSON.parse(raw);
                        authorAlign = data.alignment || 0;
                        avatarUrl = data.avatarUrl || data.avatar || null;
                    }
                } catch(e) {}
            }
            
            // If msg has avatarUrl stored, use it
            if (msg.avatarUrl) avatarUrl = msg.avatarUrl;
        }

        const alignPctActual = Math.min(Math.abs(authorAlign), 500000) / 500000;
        const alignPct = authorAlign === 0 ? 0 : Math.min(1, 0.3 + (0.7 * Math.pow(alignPctActual, 0.3)));

        let hue, sat, lit;
        if (authorAlign > 0) {
            hue = 200 + (alignPctActual * 40);
            sat = 60 + (alignPctActual * 40);
            lit = 60 - (alignPctActual * 10); // Less dark for text readability
        } else {
            hue = 15 - (alignPctActual * 15);
            sat = 60 + (alignPctActual * 40);
            lit = 55 - (alignPctActual * 10);
        }

        const hslColor = `hsl(${hue}, ${sat}%, ${lit}%)`;

        //Смешиваем с белоснежным (#ffffff) заместо золотого (#f1c40f) для нейтральной стороны.
        const nameStyle = alignPct > 0 ? `color: color-mix(in srgb, ${hslColor} ${alignPct * 100}%, #ffffff); text-shadow: 0 0 ${alignPct * 5}px ${hslColor};` : 'color: #ffffff;';

        const avatarContent = avatarUrl 
            ? `<img src="${avatarUrl}" class="chat-msg-avatar-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">` 
            : '';
        const fallbackAvatar = `<div class="chat-msg-avatar-fallback">${msg.author.charAt(0).toUpperCase()}</div>`;

        return `
            <div class="chat-message ${isPlayer ? 'chat-msg-player' : 'chat-msg-npc'}">
                <div class="chat-msg-avatar chat-clickable-avatar" data-playername="${this._escapeHtml(msg.author)}" data-playerid="${msg.senderId || ''}">
                    ${avatarContent}
                    ${fallbackAvatar}
                </div>
                <div class="chat-msg-body">
                    <div class="chat-msg-header">
                        <span class="chat-msg-author ${isPlayer ? 'author-player' : 'author-npc'} chat-clickable-author" data-playername="${this._escapeHtml(msg.author)}" data-playerid="${msg.senderId || ''}" style="${nameStyle}">${msg.author}</span>
                        <span class="chat-msg-time">${time}</span>
                    </div>
                    <div class="chat-msg-text">${this._escapeHtml(msg.text)}</div>
                </div>
            </div>
        `;
    }

    _attachListeners() {
        const input = document.getElementById('chat-input');
        const sendBtn = document.getElementById('chat-send-btn');
        const clearBtn = document.getElementById('chat-clear-btn');
        const messagesEl = document.getElementById('chat-messages');

        sendBtn?.addEventListener('click', () => this._sendMessage());
        input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this._sendMessage();
            }
        });
        clearBtn?.addEventListener('click', () => {
            if (confirm('Очистите всю историю чата?')) {
                this.messages = [];
                this._saveHistory();
                if (messagesEl) messagesEl.innerHTML = this._renderEmpty();
            }
        });

        //Клик на никнейм персонажа или аватарку
        messagesEl?.addEventListener('click', (e) => {
            const clickable = e.target.closest('.chat-clickable-author, .chat-clickable-avatar');
            if (clickable) {
                const name = clickable.getAttribute('data-playername');
                const id = clickable.getAttribute('data-playerid');
                const modal = window.gameInstance?.playerModal;
                if (name && modal) modal.show(name, id);
            }
        });

    }

    _sendMessage() {
        const input = document.getElementById('chat-input');
        if (!input) return;

        const text = input.value.trim();
        if (!text) return;

        input.value = '';

        if (this.player.networkMgr) {
            this.player.networkMgr.send('chat', {
                author: this.player.name,
                avatarUrl: this.player.avatarUrl || this.player.avatar || null,
                text,
                isPlayer: true,
                alignment: this.player.alignment || 0,
                ts: Date.now()
            });
        }
    }

    _addMessage(msg) {
        this.messages.push(msg);
        if (this.messages.length > MAX_MESSAGES) {
            this.messages.shift(); //Удаляем самое старое
        }
        this._saveHistory();
        this._appendMessageToDOM(msg);
        this._scrollToBottom();
    }

    _appendMessageToDOM(msg) {
        const messagesEl = document.getElementById('chat-messages');
        if (!messagesEl) return;

        //Удаляем плейсхолдер, если есть
        const empty = messagesEl.querySelector('.chat-empty');
        if (empty) empty.remove();

        const div = document.createElement('div');
        div.innerHTML = this._renderMessage(msg);
        messagesEl.appendChild(div.firstElementChild);
    }

    _scrollToBottom() {
        const messagesEl = document.getElementById('chat-messages');
        if (messagesEl) {
            setTimeout(() => {
                messagesEl.scrollTop = messagesEl.scrollHeight;
            }, 50);
        }
    }

    _loadHistory() {
        try {
            const raw = localStorage.getItem(CHAT_STORAGE_KEY);
            return raw ? JSON.parse(raw) : this._getWelcomeMessages();
        } catch {
            return this._getWelcomeMessages();
        }
    }

    _saveHistory() {
        try {
            localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(this.messages));
        } catch (e) {
            console.warn('[CHAT] Не удалось сохранить чат:', e);
        }
    }

    _getWelcomeMessages() {
        return [
            {
                isSystem: true,
                text: '📡 Добро пожаловать в Галактический Чат! Будьте вежливы.',
                ts: Date.now() - 60000
            }
        ];
    }

    _getPlayerInitial() {
        return this.player.name ? this.player.name.charAt(0).toUpperCase() : '?';
    }

    _escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    update() { }
}
