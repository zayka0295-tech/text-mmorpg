import { Notifications } from '../ui/Notifications.js';

export class BankScreen {
    constructor(screenManager, player) {
        this.screenManager = screenManager;
        this.player = player;
        this.container = document.getElementById('bank-screen');
    }

    openBank(locationId) {
        this.currentLocationId = locationId;
        this.player.viewingBank = true;
        this.player.save();
        this.screenManager.showScreen('bank-screen');
        this.render();
    }

    render() {
        let html = `<div class="bank-layout">
                <div class="bank-header">
                    <h2>МЕЖГАЛАКТИЧЕСКИЙ БАНКОВСКИЙ КЛАН</h2>
                    <button id="btn-bank-close" class="btn-close-bank">✕</button>
                </div>

                <div class="bank-balances">
                    <div class="bank-card">
                        <div class="bank-card-title">Наличные (Небезопасная зона)</div>
                        <div class="bank-card-value" style="color: #e74c3c;">${this.player.money.toLocaleString()}<small>кр.</small>
                        </div>
                        <div class="bank-card-desc">Может быть украдена при нападении или поражении.</div>
                    </div>
                    <div class="bank-card">
                        <div class="bank-card-title">Банковский Счёт (Безопасная зона)</div>
                        <div class="bank-card-value" style="color: #27ae60;">${this.player.bankBalance.toLocaleString()}<small>кр.</small>
                        </div>
                        <div class="bank-card-desc">100% защита депозитов Галактическим Законом.</div>
                    </div>
                </div>

                <div class="bank-actions">
                    <div class="bank-action-box">
                        <h3>ПОЛОЖИТЬ НА СЧЁТ</h3>
                        <input type="number" id="bank-deposit-input" placeholder="Сумма..." min="1" max="${this.player.money}">
                        <div class="bank-quick-btns">
                            <button class="btn-quick" data-action="deposit" data-pct="25">25%</button>
                            <button class="btn-quick" data-action="deposit" data-pct="50">50%</button>
                            <button class="btn-quick" data-action="deposit" data-pct="100">MAX</button>
                        </div>
                        <button id="btn-bank-deposit" class="btn-bank btn-deposit">ПОЛОЖИТЬ В БАНК</button>
                    </div>

                    <div class="bank-action-box">
                        <h3>СНЯТЬ НАЛИЧНЫЕ</h3>
                        <input type="number" id="bank-withdraw-input" placeholder="Сумма..." min="1" max="${this.player.bankBalance}">
                        <div class="bank-quick-btns">
                            <button class="btn-quick" data-action="withdraw" data-pct="25">25%</button>
                            <button class="btn-quick" data-action="withdraw" data-pct="50">50%</button>
                            <button class="btn-quick" data-action="withdraw" data-pct="100">MAX</button>
                        </div>
                        <button id="btn-bank-withdraw" class="btn-bank btn-withdraw">СНЯТЬ СО СЧЁТА</button>
                    </div>
                </div>
                
                <button id="btn-bank-back-wide" style="margin-top:20px; width:100%; padding:12px; background:#fff; border:2px solid #000; border-radius:6px; font-weight:900; font-size:13px; cursor:pointer; text-transform:uppercase;">← НАЗАД НА КАРТУ</button>
            </div>`;

        this.container.innerHTML = html;
        this.attachEventListeners();
    }

    attachEventListeners() {
        const closeBank = () => {
            this.player.viewingBank = false;
            this.player.save();
            this.screenManager.showScreen('maps-screen');
            // Sync bottom nav
            const navBtns = document.querySelectorAll('#bottom-nav .nav-btn');
            navBtns.forEach(b => b.classList.remove('active'));
            const mapBtn = document.querySelector('#bottom-nav .nav-btn[data-target="maps-screen"]');
            if (mapBtn) mapBtn.classList.add('active');
        };

        const btnClose = this.container.querySelector('#btn-bank-close');
        if (btnClose) {
            btnClose.addEventListener('click', closeBank);
        }
        
        const btnBackWide = this.container.querySelector('#btn-bank-back-wide');
        if (btnBackWide) {
            btnBackWide.addEventListener('click', closeBank);
        }

        const depositInput = this.container.querySelector('#bank-deposit-input');
        const withdrawInput = this.container.querySelector('#bank-withdraw-input');

        // Quick buttons (25%, 50%, 100%)
        const quickBtns = this.container.querySelectorAll('.btn-quick');
        quickBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.getAttribute('data-action');
                const pct = parseInt(e.target.getAttribute('data-pct')) / 100;

                if (action === 'deposit') {
                    depositInput.value = Math.floor(this.player.money * pct);
                } else if (action === 'withdraw') {
                    withdrawInput.value = Math.floor(this.player.bankBalance * pct);
                }
            });
        });

        const btnDeposit = this.container.querySelector('#btn-bank-deposit');
        if (btnDeposit) {
            btnDeposit.addEventListener('click', () => {
                const amount = parseInt(depositInput.value);
                if (Number.isNaN(amount) || amount <= 0) {
                    Notifications.show('Введите корректную сумму!', 'error');
                    return;
                }
                if (amount > this.player.money) {
                    Notifications.show('У вас нет столько денег!', 'error');
                    return;
                }

                this.player.money -= amount;
                this.player.bankBalance += amount;
                this.player.save();
                this.render();
                Notifications.show(`Вы внесли ${amount.toLocaleString()} кр. на счет.`, 'success');
            });
        }

        const btnWithdraw = this.container.querySelector('#btn-bank-withdraw');
        if (btnWithdraw) {
            btnWithdraw.addEventListener('click', () => {
                const amount = parseInt(withdrawInput.value);
                if (Number.isNaN(amount) || amount <= 0) {
                    Notifications.show('Введите корректную сумму!', 'error');
                    return;
                }
                if (amount > this.player.bankBalance) {
                    Notifications.show('У вас нет столько денег на счете!', 'error');
                    return;
                }

                this.player.bankBalance -= amount;
                this.player.money += amount;
                this.player.save();
                this.render();
                Notifications.show(`Вы сняли ${amount.toLocaleString()} кр. со счета.`, 'success');
            });
        }
    }

    update() { }
}
