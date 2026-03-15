export class BottomNav {
    constructor(screenManager, player) {
        this.screenManager = screenManager;
        this.player = player;
        this.navButtons = document.querySelectorAll('.nav-btn');
        this.bindEvents();
    }

    bindEvents() {
        this.navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetBtn = e.currentTarget;
                const targetScreenId = targetBtn.getAttribute('data-target');

                //Если переходим ко второму экрану - сбрасываем persistent UI состояния
                if (this.player) {
                    this.player.viewingJobBoard = false;
                    this.player.viewingBank = false;
                    this.player.save();
                }

                // Update active css class on nav
                this.navButtons.forEach(b => b.classList.remove('active'));
                targetBtn.classList.add('active');

                // Switch the main screen views
                this.screenManager.showScreen(targetScreenId);
            });
        });
    }
}
