// ==========================================
//TOMB HANDLER — раскопки гробниц Коррибана
// ==========================================
import { LOCATIONS } from '../../../engine/Data/locations.js';
import { Modals } from '../../../ui/Modals.js';
import { Notifications } from '../../../ui/Notifications.js';

export class TombHandler {
    constructor(player, onRender, onStartCombat) {
        this.player = player;
        this.onRender = onRender;
        this.onStartCombat = onStartCombat; // (mData, callback) => void
        this.isSearching = false;
        
        this._loadState();
    }

    _saveState() {
        const state = {
            isSearching: this.isSearching,
            searchEndTime: this.searchEndTime
        };
        localStorage.setItem(`sw_tomb_search_state_${this.player.name}`, JSON.stringify(state));
    }

    _loadState() {
        const saved = localStorage.getItem(`sw_tomb_search_state_${this.player.name}`);
        if (saved) {
            try {
                const state = JSON.parse(saved);
                const now = Date.now();

                if (state.isSearching && state.searchEndTime > now) {
                    this.isSearching = true;
                    this.searchEndTime = state.searchEndTime;
                    this._resumeSearch(state.searchEndTime - now);
                }
            } catch (e) { console.error("Error loading tomb state:", e); }
        }
    }

    _resumeSearch(msLeft) {
        setTimeout(() => {
            this.isSearching = false;
            this.searchEndTime = 0;
            this._saveState();
            this._finishTombExcavation();
            this.onRender();
        }, msLeft);
    }

    startTombExcavation(setSearching) {
        if (this.isSearching) return; //Предохранитель от двойного клика
        this.isSearching = true;
        this.searchEndTime = Date.now() + 25 * 60 * 1000;
        this._saveState();

        setSearching(true);
        this.onRender();

        setTimeout(() => {
            this.isSearching = false;
            this.searchEndTime = 0;
            this._saveState();
            setSearching(false);
            this._finishTombExcavation();
            this.onRender();
        }, 25 * 60 * 1000); // 25 минут
    }

    _finishTombExcavation() {
        const roll = Math.random();
        
        // 50% шанс на нападение моба (как у кристаллов)
        if (roll < 0.50) {
            import('../../../engine/Data/locations.js').then((module) => {
                const locId = this.player.locationId;
                const loc = module.LOCATIONS[locId];
                if (loc && loc.monsters && loc.monsters.length > 0) {
                    const randMonsterIdx = Math.floor(Math.random() * loc.monsters.length);
                    const monsterData = loc.monsters[randMonsterIdx];

                    document.dispatchEvent(new CustomEvent('game:notification', {
                        detail: { msg: 'Ваши раскопки потревожили древнее зло!', type: 'error' }
                    }));

                    // Мы не можем напрямую вызвать startCombat здесь, так как у нас нет доступа к MapScreen.
                    // Но мы можем отправить событие.
                    document.dispatchEvent(new CustomEvent('game:start-combat', {
                        detail: { monster: monsterData }
                    }));
                }
            });
            return;
        }

        this._giveTombReward(this.player.locationId);
    }

    _giveTombReward(tombId) {
        const lootRoll = Math.random();

        //10% шанс на конкретный фрагмент
        if (lootRoll < 0.10) {
            let shard = null;
            let isSithShard = false;

            if (Math.random() < 0.5) {
                // Sith Shard
                const sithShards = {
                    'tomb_ajunta_pall':   { id: 'sith_holocron_shard_1', name: 'Лорд Марка Рогнос' },
                    'tomb_tulak_hord':    { id: 'sith_holocron_shard_2', name: 'Лорд Нага Садоу' },
                    'tomb_marka_ragnos':  { id: 'sith_holocron_shard_3', name: 'Лорд Экзор Кун' },
                };
                shard = sithShards[tombId];
                isSithShard = true;
            } else {
                // Jedi Shard
                const jediShards = {
                    'tomb_ajunta_pall':   { id: 'jedi_holocron_shard_1', name: 'Аджунта Полл' },
                    'tomb_tulak_hord':    { id: 'jedi_holocron_shard_2', name: 'Тулак Хорд' },
                    'tomb_marka_ragnos':  { id: 'jedi_holocron_shard_3', name: 'Марка Рогнос' },
                };
                shard = jediShards[tombId];
            }

            if (shard) {
                this.player.addItem(shard.id, 1);
                const color = isSithShard ? '#e74c3c' : '#3498db';
                const typeName = isSithShard ? 'Ситхов' : 'Джедая';
                Modals.alert(
                    'Невероятная находка!',
                    `<span style="color:${color};font-weight:bold;">${'✨ Вы нашли Осколок Холокрона {type} ({name})!'.replace('{type}', typeName).replace('{name}', shard.name)}</span>`
                );
                this.player.save();
                return;
            }
        }

        //Мелкий лут
        const junkRoll = Math.random();
        if (junkRoll < 0.4) {
            const credits = Math.floor(Math.random() * 50) + 10;
            this.player.money += credits;
            Notifications.show('Под слоем пыли вы обнаружили {credits} кр.'.replace('{credits}', credits), 'info');
        } else if (junkRoll < 0.7) {
            this.player.addItem('bacta_small', 1);
            Notifications.show('Вы нашли старые бинты и малую бакто-аптечку.', 'info');
        } else {
            Notifications.show('Только пыль и старые кости...', 'info');
        }
        this.player.save();
    }
}
