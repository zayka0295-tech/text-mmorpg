// ==========================================
//CRYSTAL HANDLER — кристаллы Дантуина и Арены.
// ==========================================
import { Modals } from '../../../ui/Modals.js';

export class CrystalHandler {
    constructor(player, onRender) {
        this.player = player;
        this.onRender = onRender; // callback: () => mapScreen.render()
        
        this._loadState();
    }

    _saveState() {
        const state = {
            isSearching: this.isSearching,
            isSearchingShyrack: this.isSearchingShyrack,
            searchEndTime: this.searchEndTime,
            searchEndTimeShyrack: this.searchEndTimeShyrack
        };
        localStorage.setItem(`sw_search_state_${this.player.name}`, JSON.stringify(state));
    }

    _loadState() {
        const saved = localStorage.getItem(`sw_search_state_${this.player.name}`);
        if (saved) {
            try {
                const state = JSON.parse(saved);
                const now = Date.now();

                if (state.isSearching && state.searchEndTime > now) {
                    this.isSearching = true;
                    this.searchEndTime = state.searchEndTime;
                    this._resumeSearch(state.searchEndTime - now);
                }
                if (state.isSearchingShyrack && state.searchEndTimeShyrack > now) {
                    this.isSearchingShyrack = true;
                    this.searchEndTimeShyrack = state.searchEndTimeShyrack;
                    this._resumeShyrackSearch(state.searchEndTimeShyrack - now);
                }
            } catch (e) { console.error("Error loading search state:", e); }
        }
    }

    _resumeSearch(msLeft) {
        setTimeout(() => {
            this.isSearching = false;
            this.searchEndTime = 0;
            this._saveState();
            this._handleCrystalReward(window._mapScreenRef?.startCombat.bind(window._mapScreenRef));
            this.onRender();
        }, msLeft);
    }

    _resumeShyrackSearch(msLeft) {
        setTimeout(() => {
            this.isSearchingShyrack = false;
            this.searchEndTimeShyrack = 0;
            this._saveState();
            this._handleShyrackCrystalReward(window._mapScreenRef?.startCombat.bind(window._mapScreenRef));
        }, msLeft);
    }

    //--- Поиск кристаллов (Кристаллические Пещеры) ---

    startCrystalSearch(setSearching, startCombatCallback) {
        if (this.isSearching) return;
        this.isSearching = true;
        this.searchEndTime = Date.now() + 10 * 60 * 1000;
        this._saveState();

        setSearching(true);
        this.onRender();

        setTimeout(() => {
            this.isSearching = false;
            this.searchEndTime = 0;
            this._saveState();
            setSearching(false);
            this._handleCrystalReward(startCombatCallback);
            this.onRender();
        }, 10 * 60 * 1000); // 10 минут
    }

    _handleCrystalReward(startCombatCallback) {
        const randEvent = Math.random();

        // 50% шанс на нападение моба
        if (randEvent < 0.50) {
            import('../../../engine/Data/locations.js').then((module) => {
                const locId = this.player.locationId;
                const loc = module.LOCATIONS[locId];
                if (loc && loc.monsters && loc.monsters.length > 0) {
                    const randMonsterIdx = Math.floor(Math.random() * loc.monsters.length);
                    const monsterData = loc.monsters[randMonsterIdx];

                    document.dispatchEvent(new CustomEvent('game:notification', {
                        detail: { msg: 'Ваш поиск привлек внимание местных обитателей!', type: 'error' }
                    }));

                    if (startCombatCallback) {
                        startCombatCallback(monsterData);
                    }
                }
            });
            return;
        }

        const rand = Math.random();
        let item = null;

        if      (rand < 0.30) item = 'kyber_crystal_blue';
        else if (rand < 0.60) item = 'kyber_crystal_green';
        else if (rand < 0.75) item = 'kyber_crystal_yellow';
        else if (rand < 0.80) item = 'kyber_crystal_purple';
        //20% - ничего

        if (item) {
            this.player.addItem(item, 1);
            document.dispatchEvent(new CustomEvent('game:notification', {
                detail: { msg: 'Вы нашли кристалл!', type: 'success' }
            }));
        } else {
            document.dispatchEvent(new CustomEvent('game:notification', {
                detail: { msg: 'Поиск не дал результатов...', type: 'info' }
            }));
        }

        this.player.save();
        this.onRender();
    }

    startShyrackCrystalSearch(setSearching, startCombatCallback) {
        if (this.isSearchingShyrack) return;
        this.isSearchingShyrack = true;
        this.searchEndTimeShyrack = Date.now() + 10 * 60 * 1000;
        this._saveState();

        setSearching(true);
        this.onRender();

        setTimeout(() => {
            this.isSearchingShyrack = false;
            this.searchEndTimeShyrack = 0;
            this._saveState();
            setSearching(false);
            this._handleShyrackCrystalReward(startCombatCallback);
        }, 10 * 60 * 1000); // 10 минут
    }

    _handleShyrackCrystalReward(startCombatCallback) {
        const randEvent = Math.random();

        // 50% chance for monster attack
        if (randEvent < 0.50) {
            import('../../../engine/Data/locations.js').then((module) => {
                const shyrackCave = module.LOCATIONS['korriban_shyrack'];
                // Select a random monster from the cave
                const randMonsterIdx = Math.floor(Math.random() * shyrackCave.monsters.length);
                const monsterData = shyrackCave.monsters[randMonsterIdx];

                document.dispatchEvent(new CustomEvent('game:notification', {
                    detail: { msg: 'Ваш поиск привлек внимание обитателей пещеры!', type: 'error' }
                }));

                if (startCombatCallback) {
                    startCombatCallback(monsterData);
                }
            });
            return;
        }

        if (randEvent < 0.55) {
            this.player.addItem('kyber_crystal_red', 1);
            document.dispatchEvent(new CustomEvent('game:notification', {
                detail: { msg: 'Вы нашли темный красный кристалл!', type: 'success' }
            }));
        } else {
            document.dispatchEvent(new CustomEvent('game:notification', {
                detail: { msg: 'Поиск не дал результатов. Пещера молчит...', type: 'info' }
            }));
        }

        this.player.save();
        this.onRender();
    }

    //--- Обмен кристаллов (Арена Коррибана) ---

    handleCrystalExchange() {
        const crystalTypes = [
            'kyber_crystal_blue', 'kyber_crystal_green',
            'kyber_crystal_yellow', 'kyber_crystal_purple'
        ];
        const foundCrystalId = crystalTypes.find(id =>
            this.player.inventory.some(i => i.id === id && i.amount > 0)
        );

        if (!foundCrystalId) {
            Modals.alert('Обмен Кристаллов', 'У вас нет кайбер-кристаллов для обмена. Ищите их в Кристальных Пещерах на Дантуине.');
            return;
        }

        Modals.confirm(
            'Обмен Кайбер-кристаллов',
            'Темные торговцы заинтересованы в ваших кристаллах. Что вы просите взамен <span style="color:#f1c40f">1 кристалл</span>?',
            'Кредиты (+1500)',
            'Темная Сторона (-150)',
            () => this._executeCrystalExchange(foundCrystalId, 'credits', 1500),
            () => this._executeCrystalExchange(foundCrystalId, 'dark_side', -150)
        );
    }

    _executeCrystalExchange(crystalId, rewardType, amount) {
        const hasCrystal = this.player.inventory.find(i => i.id === crystalId && i.amount > 0);
        if (!hasCrystal) return; //Предохранитель

        this.player.removeItem(crystalId, 1);

        if (rewardType === 'credits') {
            this.player.money += amount;
            document.dispatchEvent(new CustomEvent('game:notification', {
                detail: { msg: 'Обмен успешен. Вы получили {amount} кр.'.replace('{amount}', amount), type: 'success' }
            }));
        } else {
            this.player.modifyAlignment(amount);
            document.dispatchEvent(new CustomEvent('game:notification', {
                detail: { msg: 'Обмен успешен. Вы погрузились в Темную Сторону (-150).', type: 'success' }
            }));
        }

        this.player.save();
    }
}
