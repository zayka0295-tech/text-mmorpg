export class ModalSystem {
    constructor() {
        this.activeModals = new Map();
        this.modalQueue = [];
        this.isProcessing = false;
        this.defaultOptions = {
            closeOnEscape: true,
            closeOnOverlay: true,
            showCloseButton: true,
            animationDuration: 300,
            zIndex: 1000
        };
    }

    /**
     * Показує модальне вікно
     */
    show(modalId, content, options = {}) {
        const config = { ...this.defaultOptions, ...options };
        
        // Якщо модальне вікно вже активне, додаємо в чергу
        if (this.activeModals.has(modalId)) {
            this.modalQueue.push({ modalId, content, options });
            return;
        }

        this.createModal(modalId, content, config);
    }

    /**
     * Створює модальне вікно
     */
    createModal(modalId, content, config) {
        // Створюємо overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = `modal-overlay-${modalId}`;
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: ${config.zIndex};
            opacity: 0;
            transition: opacity ${config.animationDuration}ms ease;
        `;

        // Створюємо модальне вікно
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = `modal-${modalId}`;
        modal.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 20px;
            max-width: 90%;
            max-height: 90%;
            overflow: auto;
            transform: scale(0.8);
            transition: transform ${config.animationDuration}ms ease;
            position: relative;
        `;

        // Додаємо контент
        if (typeof content === 'string') {
            modal.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            modal.appendChild(content);
        }

        // Додаємо кнопку закриття
        if (config.showCloseButton) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'modal-close-btn';
            closeBtn.innerHTML = '✕';
            closeBtn.style.cssText = `
                position: absolute;
                top: 10px;
                right: 10px;
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #666;
                padding: 5px;
            `;
            closeBtn.addEventListener('click', () => this.close(modalId));
            modal.appendChild(closeBtn);
        }

        // Додаємо в DOM
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Зберігаємо посилання
        this.activeModals.set(modalId, {
            overlay,
            modal,
            config,
            createdAt: Date.now()
        });

        // Налаштовуємо події
        this.setupModalEvents(modalId, config);

        // Показуємо анімацією
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            modal.style.transform = 'scale(1)';
        });

        // Сповіщаємо про відкриття
        this.emitModalEvent('modal:opened', modalId, { overlay, modal, config });
    }

    /**
     * Налаштовує події модального вікна
     */
    setupModalEvents(modalId, config) {
        const modalData = this.activeModals.get(modalId);
        if (!modalData) return;

        const { overlay, modal } = modalData;

        // Закриття по кліку на overlay
        if (config.closeOnOverlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.close(modalId);
                }
            });
        }

        // Закриття по Escape
        if (config.closeOnEscape) {
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    this.close(modalId);
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
        }

        // Запобігання закриттю при кліку всередині модального вікна
        modal.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    /**
     * Закриває модальне вікно
     */
    close(modalId) {
        const modalData = this.activeModals.get(modalId);
        if (!modalData) return;

        const { overlay, modal, config } = modalData;

        // Анімація закриття
        overlay.style.opacity = '0';
        modal.style.transform = 'scale(0.8)';

        setTimeout(() => {
            // Видаляємо з DOM
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }

            // Видаляємо з активних
            this.activeModals.delete(modalId);

            // Сповіщаємо про закриття
            this.emitModalEvent('modal:closed', modalId, null);

            // Обробляємо чергу
            this.processQueue();
        }, config.animationDuration);
    }

    /**
     * Закриває всі модальні вікна
     */
    closeAll() {
        const modalIds = Array.from(this.activeModals.keys());
        modalIds.forEach(id => this.close(id));
        this.modalQueue = [];
    }

    /**
     * Обробляє чергу модальних вікон
     */
    processQueue() {
        if (this.modalQueue.length === 0 || this.isProcessing) return;

        this.isProcessing = true;
        const next = this.modalQueue.shift();
        
        setTimeout(() => {
            this.show(next.modalId, next.content, next.options);
            this.isProcessing = false;
        }, 100);
    }

    /**
     * Перевіряє, чи відкрите модальне вікно
     */
    isOpen(modalId) {
        return this.activeModals.has(modalId);
    }

    /**
     * Отримує активне модальне вікно
     */
    getModal(modalId) {
        return this.activeModals.get(modalId);
    }

    /**
     * Оновлює контент модального вікна
     */
    updateContent(modalId, content) {
        const modalData = this.activeModals.get(modalId);
        if (!modalData) return;

        const { modal } = modalData;

        // Очищуємо старий контент (крім кнопки закриття)
        const closeBtn = modal.querySelector('.modal-close-btn');
        modal.innerHTML = '';

        // Додаємо новий контент
        if (typeof content === 'string') {
            modal.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            modal.appendChild(content);
        }

        // Повертаємо кнопку закриття
        if (closeBtn) {
            modal.appendChild(closeBtn);
        }

        // Сповіщаємо про оновлення
        this.emitModalEvent('modal:updated', modalId, { content });
    }

    /**
     * Показує confirm діалог
     */
    confirm(message, options = {}) {
        return new Promise((resolve) => {
            const content = `
                <div class="confirm-dialog">
                    <h3>Підтвердження</h3>
                    <p>${message}</p>
                    <div class="confirm-buttons">
                        <button class="btn btn-cancel" data-action="cancel">Скасувати</button>
                        <button class="btn btn-confirm" data-action="confirm">Підтвердити</button>
                    </div>
                </div>
            `;

            const modalId = `confirm-${Date.now()}`;
            
            this.show(modalId, content, {
                ...options,
                closeOnOverlay: false,
                closeOnEscape: false
            });

            // Налаштовуємо обробники кнопок
            setTimeout(() => {
                const modal = this.getModal(modalId);
                if (modal) {
                    modal.modal.addEventListener('click', (e) => {
                        const action = e.target.getAttribute('data-action');
                        if (action === 'confirm') {
                            this.close(modalId);
                            resolve(true);
                        } else if (action === 'cancel') {
                            this.close(modalId);
                            resolve(false);
                        }
                    });
                }
            }, 100);
        });
    }

    /**
     * Показує alert діалог
     */
    alert(message, options = {}) {
        return new Promise((resolve) => {
            const content = `
                <div class="alert-dialog">
                    <h3>Повідомлення</h3>
                    <p>${message}</p>
                    <div class="alert-buttons">
                        <button class="btn btn-ok" data-action="ok">OK</button>
                    </div>
                </div>
            `;

            const modalId = `alert-${Date.now()}`;
            
            this.show(modalId, content, options);

            // Налаштовуємо обробник кнопки
            setTimeout(() => {
                const modal = this.getModal(modalId);
                if (modal) {
                    modal.modal.addEventListener('click', (e) => {
                        if (e.target.getAttribute('data-action') === 'ok') {
                            this.close(modalId);
                            resolve();
                        }
                    });
                }
            }, 100);
        });
    }

    /**
     * Показує prompt діалог
     */
    prompt(message, defaultValue = '', options = {}) {
        return new Promise((resolve) => {
            const content = `
                <div class="prompt-dialog">
                    <h3>Ввід</h3>
                    <p>${message}</p>
                    <input type="text" class="prompt-input" value="${defaultValue}" placeholder="Введіть значення...">
                    <div class="prompt-buttons">
                        <button class="btn btn-cancel" data-action="cancel">Скасувати</button>
                        <button class="btn btn-confirm" data-action="confirm">Підтвердити</button>
                    </div>
                </div>
            `;

            const modalId = `prompt-${Date.now()}`;
            
            this.show(modalId, content, {
                ...options,
                closeOnOverlay: false,
                closeOnEscape: false
            });

            // Налаштовуємо обробники
            setTimeout(() => {
                const modal = this.getModal(modalId);
                if (modal) {
                    const input = modal.modal.querySelector('.prompt-input');
                    
                    modal.modal.addEventListener('click', (e) => {
                        const action = e.target.getAttribute('data-action');
                        if (action === 'confirm') {
                            this.close(modalId);
                            resolve(input.value);
                        } else if (action === 'cancel') {
                            this.close(modalId);
                            resolve(null);
                        }
                    });

                    // Фокус на інпут
                    input.focus();
                    input.select();
                }
            }, 100);
        });
    }

    /**
     * Сповіщає про події модального вікна
     */
    emitModalEvent(eventType, modalId, data) {
        document.dispatchEvent(new CustomEvent(eventType, {
            detail: { modalId, data }
        }));
    }

    /**
     * Отримує статистику модальних вікон
     */
    getStats() {
        return {
            activeModals: this.activeModals.size,
            queuedModals: this.modalQueue.length,
            isProcessing: this.isProcessing,
            modalList: Array.from(this.activeModals.keys())
        };
    }

    /**
     * Очищує всі модальні вікна
     */
    destroy() {
        this.closeAll();
        this.activeModals.clear();
        this.modalQueue = [];
    }
}
