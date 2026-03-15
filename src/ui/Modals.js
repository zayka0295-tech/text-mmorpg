export class Modals {
    static _createOverlay() {
        const existing = document.getElementById('global-modal-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'global-modal-overlay';
        overlay.className = 'global-modal-overlay';
        document.body.appendChild(overlay);
        return overlay;
    }

    static confirm(title, text, confirmBtnText = 'Подтвердить', cancelBtnText = 'Отмена', onConfirm, onCancel) {
        const overlay = this._createOverlay();

        overlay.innerHTML = `
            <div class="global-modal-box">
                <div class="global-modal-title">${title}</div>
                <div class="global-modal-text">${text}</div>
                <div class="global-modal-actions">
                    <button class="global-modal-btn btn-cancel" id="g-modal-cancel">${cancelBtnText}</button>
                    <button class="global-modal-btn btn-confirm" id="g-modal-confirm">${confirmBtnText}</button>
                </div>
            </div>
        `;

        // Small animation
        requestAnimationFrame(() => {
            overlay.querySelector('.global-modal-box').classList.add('show');
        });

        const close = () => {
            const box = overlay.querySelector('.global-modal-box');
            box.classList.remove('show');
            setTimeout(() => overlay.remove(), 250);
        };

        document.getElementById('g-modal-cancel').addEventListener('click', () => {
            close();
            if (onCancel) onCancel();
        });
        document.getElementById('g-modal-confirm').addEventListener('click', () => {
            close();
            if (onConfirm) onConfirm();
        });
    }

    static promptNumber(title, text, defaultValue = 1, confirmBtnText = 'Подтвердить', cancelBtnText = 'Отмена', onConfirm) {
        const overlay = this._createOverlay();

        overlay.innerHTML = `
            <div class="global-modal-box">
                <div class="global-modal-title">${title}</div>
                <div class="global-modal-text">${text}</div>
                <input type="number" id="g-modal-input-number" class="global-modal-input" value="${defaultValue}" min="1" style="width: 100%; padding: 10px; margin-bottom: 20px; background: #222; color: #fff; border: 2px solid #555; border-radius: 4px; font-size: 16px; text-align: center; box-sizing: border-box; font-family: monospace;">
                <div class="global-modal-actions">
                    <button class="global-modal-btn btn-cancel" id="g-modal-cancel">${cancelBtnText}</button>
                    <button class="global-modal-btn btn-confirm" id="g-modal-confirm">${confirmBtnText}</button>
                </div>
            </div>
        `;

        requestAnimationFrame(() => {
            overlay.querySelector('.global-modal-box').classList.add('show');
            const input = document.getElementById('g-modal-input-number');
            input.focus();
            input.select();
        });

        const close = () => {
            const box = overlay.querySelector('.global-modal-box');
            box.classList.remove('show');
            setTimeout(() => overlay.remove(), 250);
        };

        document.getElementById('g-modal-cancel').addEventListener('click', close);
        document.getElementById('g-modal-confirm').addEventListener('click', () => {
            const val = parseInt(document.getElementById('g-modal-input-number').value, 10);
            if (isNaN(val) || val < 1) {
                this.alert('Ошибка', 'Введите корректное количество!');
                return;
            }
            close();
            if (onConfirm) onConfirm(val);
        });
    }

    static alert(title, text, btnText = 'ОК', extraHtml = '', onBtnClick = null) {
        const overlay = this._createOverlay();

        overlay.innerHTML = `
            <div class="global-modal-box">
                <div class="global-modal-title">${title}</div>
                <div class="global-modal-text">${text}</div>
                ${extraHtml}
                <div class="global-modal-actions" style="justify-content: center; margin-top: 20px;">
                    <button class="global-modal-btn btn-confirm" id="g-modal-alert-ok" style="width: 100%;">${btnText}</button>
                </div>
            </div>
        `;

        requestAnimationFrame(() => {
            overlay.querySelector('.global-modal-box').classList.add('show');
        });

        const close = () => {
            const box = overlay.querySelector('.global-modal-box');
            box.classList.remove('show');
            setTimeout(() => overlay.remove(), 250);
        };

        document.getElementById('g-modal-alert-ok').addEventListener('click', () => {
            close();
            if (onBtnClick) onBtnClick();
        });
    }
}
