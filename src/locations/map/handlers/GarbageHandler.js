// ==========================================
//GARBAGE HANDLER — мусорщик (Корусант)
// ==========================================
import { Modals } from '../../../ui/Modals.js';

export class GarbageHandler {
    constructor(player, onRender) {
        this.player = player;
        this.onRender = onRender;
        this.searchTimeLeft = 0;
        this.timerInterval = null;
        this._checkActiveSearch();
    }

    _checkActiveSearch() {
        const key = `sw_garbage_search_${this.player.name}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            const endTime = parseInt(saved, 10);
            const now = Date.now();
            if (now < endTime) {
                this.isSearching = true;
                this.searchTimeLeft = Math.ceil((endTime - now) / 1000);
                this._startTimer(endTime);
            } else {
                localStorage.removeItem(key);
                this.isSearching = false;
            }
        }
    }

    handleGarbageSearch(setSearching) {
        if (this.isSearching) return;
        
        const durationSec = 60;
        const endTime = Date.now() + durationSec * 1000;
        
        localStorage.setItem(`sw_garbage_search_${this.player.name}`, endTime.toString());
        
        this.isSearching = true;
        this.setSearchingCallback = setSearching; // Store the callback globally
        setSearching(true);
        this.searchTimeLeft = durationSec;
        this.onRender();

        this._startTimer(endTime);
    }

    _startTimer(endTime) {
        if (this.timerInterval) clearInterval(this.timerInterval);

        this.timerInterval = setInterval(() => {
            const now = Date.now();
            const msLeft = endTime - now;

            if (msLeft <= 0) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
                this.isSearching = false;
                this.searchTimeLeft = 0;
                localStorage.removeItem(`sw_garbage_search_${this.player.name}`);
                
                if (this.setSearchingCallback) this.setSearchingCallback(false);
                this._finishGarbageSearch();
            } else {
                this.searchTimeLeft = Math.ceil(msLeft / 1000);
                this.onRender();
            }
        }, 1000);
    }

    _finishGarbageSearch() {
        const roll = Math.random();
        let rewardMsg = '';

        if (roll < 0.75) {
            const subRoll = Math.random();
            if (subRoll < 0.2) {
                this.player.addItem('bacta_small', 1);
                rewardMsg = 'Вы нашли <b>Малую Бакта-аптечку</b>! 💉';
            } else if (subRoll < 0.4) {
                this.player.addItem('ship_repair_kit', 1);
                rewardMsg = 'Вы нашли <b>Ремкомплект Корабля</b>! 🛠️';
            } else if (subRoll < 0.7) {
                const credits = Math.floor(Math.random() * 2491) + 10;
                this.player.money += credits;
                rewardMsg = 'Вы нашли <b>{credits} кр.</b>! 💰'.replace('{credits}', credits);
            } else {
                rewardMsg = 'Вы ничего не нашли, только испачкали руки. 🧼';
            }
        } else {
            const isHilt = Math.random() < 0.5;
            const itemId   = isHilt ? 'lightsaber_hilt'   : 'lightsaber_casing';
            const itemName = isHilt ? 'Рукоять светового меча' : 'Корпус светового меча';
            this.player.addItem(itemId, 1);
            rewardMsg = '<span style="color:#9b59b6;font-weight:bold;">НЕВЕРЕЯТНО!</span> Вы откопали <b>{name}</b>! ✨'.replace('{name}', itemName);
        }

        this.player.save();
        Modals.alert('Результат поиска', rewardMsg);
        this.onRender();
    }
}
