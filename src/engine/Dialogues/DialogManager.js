export class DialogManager {
    /**
     * Shows a modal with NPC dialogue.
     * @param {string} title - The title of the modal (NPC name).
     * @param {string} text - The text of the dialogue.
     * @param {Array} buttons - Array of button objects: { text, isPrimary, onClick }.
     * @param {string} theme - 'sith' or 'jedi' for styling.
     */
    static showNpcModal(title, text, buttons, theme = 'sith') {
        //Удаляем старый, если есть
        const oldModal = document.getElementById('npc-dialogue-modal');
        if (oldModal) oldModal.remove();

        const overlay = document.createElement('div');
        overlay.id = 'npc-dialogue-modal';
        overlay.className = 'npc-modal-overlay';

        const isJedi = theme === 'jedi';
        const borderColor = isJedi ? '#2980b9' : '#e74c3c';
        const titleColor = isJedi ? '#2980b9' : '#e74c3c';
        const titleIcon = isJedi ? '🌟' : '🗡️';

        let btnsHtml = '';
        buttons.forEach((btn, index) => {
            const btnClass = btn.isPrimary ? (isJedi ? 'npc-btn btn-jedi' : 'npc-btn btn-sith') : 'npc-btn';
            btnsHtml += `<button class="${btnClass}" id="npc-btn-${index}">${btn.text}</button>`;
        });

        overlay.innerHTML = `
            <style>
                .btn-jedi { background: #2980b9 !important; color: #fff !important; border-color: #1a5276 !important; }
                .btn-jedi:hover { background: #3498db !important; }
            </style>
            <div class="npc-modal-box" style="border: 2px solid ${borderColor}; box-shadow: 0 0 20px rgba(${isJedi ? '41,128,185' : '231,76,60'}, 0.4);">
                <div class="npc-modal-title" style="color: ${titleColor};">${titleIcon} ${title}</div>
                <div class="npc-modal-text">${text}</div>
                <div class="npc-modal-buttons">
                    ${btnsHtml}
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        //Прикрепляем события для кнопок
        buttons.forEach((btn, index) => {
            document.getElementById(`npc-btn-${index}`).addEventListener('click', () => {
                overlay.remove();
                if (btn.onClick) btn.onClick();
            });
        });
    }
}
