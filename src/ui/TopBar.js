export class TopBar {
    constructor(player) {
        this.player = player;

        // Cache DOM elements
        this.els = {
            level: document.getElementById('player-level'),
            currentXp: document.getElementById('current-xp'),
            maxXp: document.getElementById('max-xp'),
            xpBar: document.getElementById('xp-bar'),
            hpBar: document.getElementById('hp-bar'),
            forceBarContainer: document.getElementById('force-bar-container'),
            forceBar: document.getElementById('force-bar'),
            btcAmount: document.getElementById('btc-amount'),
            datariiAmount: document.getElementById('datarii-amount')
        };

        this.render();
        this.attachEventListeners();
    }

    render() {
        // Format numbers with spaces as thousands separators based on screenshot
        const formatNum = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

        this.els.level.textContent = this.player.level;
        this.els.currentXp.textContent = formatNum(this.player.xp);
        this.els.maxXp.textContent = formatNum(this.player.nextLevelXp);

        // Update bar (XP now)
        const xpPercent = (this.player.xp / this.player.nextLevelXp) * 100;
        this.els.xpBar.style.width = `${Math.min(100, Math.max(0, xpPercent))}%`;

        // Update bar (HP now)
        const hpPercent = (this.player.hp / this.player.maxHp) * 100;
        if (this.els.hpBar) {
            this.els.hpBar.style.width = `${Math.min(100, Math.max(0, hpPercent))}%`;
        }

        // Update bar (Force now) - only show if player can use force
        if (this.els.forceBarContainer && this.els.forceBar) {
            if (this.player.canUseForce) {
                this.els.forceBarContainer.style.display = 'block';
                const forcePercent = (this.player.forcePoints / this.player.maxForcePoints) * 100;
                this.els.forceBar.style.width = `${Math.min(100, Math.max(0, forcePercent))}%`;
            } else {
                this.els.forceBarContainer.style.display = 'none';
            }
        }

        // Update Sub-currencies
        if (this.els.btcAmount) this.els.btcAmount.textContent = formatNum(this.player.money);
        if (this.els.datariiAmount) this.els.datariiAmount.textContent = formatNum(this.player.datarii || 0);

        // Level up points UI indicator
        const levelHex = this.els.level.closest('.level-hexagon');
        if (this.player.statPoints > 0) {
            levelHex?.classList.add('can-level-up');
        } else {
            levelHex?.classList.remove('can-level-up');
        }


    }

    attachEventListeners() {
        document.addEventListener('player:hp-changed', () => this.update());
        document.addEventListener('player:xp-changed', () => this.update());
        document.addEventListener('player:money-changed', () => this.update());
        document.addEventListener('player:level-changed', () => this.update());
        document.addEventListener('player:stats-changed', () => this.update());
        document.addEventListener('player:force-changed', () => this.update());
        document.addEventListener('player:alignment-changed', () => this.update());
    }

    // Method to call when player state changes
    update() {
        this.render();
    }
}
