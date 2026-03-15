import { Notifications } from './Notifications.js';

export class LevelUpModal {
    constructor(player, topBar) {
        this.player = player;
        this.topBar = topBar;
        this.isOpen = false;
        
        // Listen to TopBar clicks on the level hexagon
        if (this.topBar && this.topBar.els.level) {
            this.topBar.els.level.parentElement.addEventListener('click', () => {
                //Открываем всегда, чтобы можно было просто посмотреть собственные базовые статьи.
                this.open();
            });
        }
        
        this.tempStats = { constitution: 0, strength: 0, agility: 0, intellect: 0 };

        this.createDOM();
    }

    createDOM() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'modal-overlay';
        this.overlay.id = 'levelup-modal';

        this.overlay.innerHTML = `<div class="modal-box" style="max-width: 360px;">
                <div class="modal-header">
                    <h2>⭐ ПОВЫШЕНИЕ УРОВНЯ</h2>
                    <button class="modal-close-btn" id="levelup-close">✕</button>
                </div>
                
                <div style="text-align: center; margin-bottom: 15px; color: #51c4c1; font-weight: bold; font-size: 16px;">
                    ДОСТУПНО ОЧЕК: <span id="levelup-points">0</span>
                </div>

                <div class="profile-stats-list" id="levelup-stats-list" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
                    <!-- Заполняется в render() -->
                </div>
                
                <div class="modal-section" style="text-align: center; border-top: none; padding-top: 0;">
                    <button id="levelup-confirm" class="modal-btn save-btn" style="width: 100%; margin: 0;">ПОДТВЕРДИТЬ</button>
                </div>
            </div>`;

        document.body.appendChild(this.overlay);

        // Events
        this.overlay.querySelector('#levelup-close').addEventListener('click', () => this.close());
        this.overlay.querySelector('#levelup-confirm').addEventListener('click', () => this.confirm());
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });
    }

    open() {
        this.isOpen = true;
        this.tempStats = { constitution: 0, strength: 0, agility: 0, intellect: 0 };
        this.render();
        this.overlay.classList.add('active');
    }

    close() {
        this.isOpen = false;
        this.overlay.classList.remove('active');
    }

    getAvailablePoints() {
        const spent = this.tempStats.constitution + this.tempStats.strength + this.tempStats.agility + this.tempStats.intellect;
        return this.player.statPoints - spent;
    }

    addStat(stat) {
        if (this.getAvailablePoints() <= 0) {
            Notifications.show("У вас нет очков характеристик!", "error");
            return;
        }

        this.tempStats[stat]++;
        this.updateValues();
    }

    confirm() {
        const spent = this.tempStats.constitution + this.tempStats.strength + this.tempStats.agility + this.tempStats.intellect;
        
        if (spent > 0) {
            this.player.statPoints -= spent;
            this.player.baseConstitution += this.tempStats.constitution;
            this.player.baseStrength += this.tempStats.strength;
            this.player.baseAgility += this.tempStats.agility;
            this.player.baseIntellect += this.tempStats.intellect;

            if (this.tempStats.constitution > 0) {
                //Добавляем ХП за уставуру (1 уставура = 15 ХП)
                //maxHp уже учтет новую уставуру через get maxHp()
                this.player.hp = Math.min(this.player.hp + (15 * this.tempStats.constitution), this.player.maxHp);
            }

            this.player.save();
            this.close();
            Notifications.show("Характеристики успешно распределены!", "success");
        } else {
            this.close();
        }
    }

    updateValues() {
        if (!this.isOpen) return;

        // Update points
        const available = this.getAvailablePoints();
        const pointsEl = this.overlay.querySelector('#levelup-points');
        if (pointsEl) pointsEl.textContent = available;

        // Update values and buttons
        const list = this.overlay.querySelector('#levelup-stats-list');
        if (!list) return;

        const vals = list.querySelectorAll('.profile-stat-val');
        if (vals.length >= 4) {
            vals[0].innerHTML = this.tempStats.constitution > 0 ? `${this.player.baseConstitution} <span style="color:#2ecc71;">+${this.tempStats.constitution}</span>` : this.player.baseConstitution;
            vals[1].innerHTML = this.tempStats.strength > 0 ? `${this.player.baseStrength} <span style="color:#2ecc71;">+${this.tempStats.strength}</span>` : this.player.baseStrength;
            vals[2].innerHTML = this.tempStats.agility > 0 ? `${this.player.baseAgility} <span style="color:#2ecc71;">+${this.tempStats.agility}</span>` : this.player.baseAgility;
            vals[3].innerHTML = this.tempStats.intellect > 0 ? `${this.player.baseIntellect} <span style="color:#2ecc71;">+${this.tempStats.intellect}</span>` : this.player.baseIntellect;
        }

        const canAdd = available > 0;
        const btns = list.querySelectorAll('.level-add-btn');
        btns.forEach(btn => {
            if (canAdd) {
                btn.removeAttribute('disabled');
                btn.style.background = '#3498db';
                btn.style.cursor = 'pointer';
            } else {
                btn.setAttribute('disabled', 'true');
                btn.style.background = '#333';
                btn.style.cursor = 'not-allowed';
            }
        });
    }

    render() {
        if (!this.isOpen) return;
        
        const list = this.overlay.querySelector('#levelup-stats-list');
        
        //Если уже существуют элементы, мы не перестраиваем весь HTML (чтобы не потерять события кнопок)
        if (list.children.length > 0) {
            this.updateValues();
            return;
        }
        // Update points initially text
        this.overlay.querySelector('#levelup-points').textContent = this.getAvailablePoints();

        const createRow = (icon, label, value, statKey) => {
            const canAdd = this.getAvailablePoints() > 0;
            return `
                <div class="profile-stat-item" style="display: flex; flex-direction: row; align-items: center; justify-content: space-between; padding: 12px 15px; background: #1a1a1a; border-radius: 8px; border: 1px solid #333;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div class="profile-stat-icon" style="font-size: 24px;">${icon}</div>
                        <div class="profile-stat-label" style="font-size: 16px; font-weight: bold; color: #eee;">${label}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div class="profile-stat-val" style="font-size: 18px; font-weight: bold; color: #fff; min-width: 30px; text-align: right;">${value}</div>
                        <button class="level-add-btn" data-stat="${statKey}" ${canAdd ? '' : 'disabled'} 
                            style="width: 36px; height: 36px; border-radius: 50%; background: ${canAdd ? '#3498db' : '#333'}; color: white; border: none; font-size: 24px; line-height: 1; cursor: ${canAdd ? 'pointer' : 'not-allowed'}; display: flex; align-items: center; justify-content: center; transition: all 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">
                            +
                        </button>
                    </div>
                </div>
            `;
        };

        list.innerHTML += createRow('🛡️', 'Статутура', this.player.baseConstitution, 'constitution');
        list.innerHTML += createRow('💪', 'Физ. сила', this.player.baseStrength, 'strength');
        list.innerHTML += createRow('💨', 'Ловкость', this.player.baseAgility, 'agility');
        list.innerHTML += createRow('🧠', 'Интеллект', this.player.baseIntellect, 'intellect');

        // Add event listeners for rapid stat adding (hold to add)
        const btns = list.querySelectorAll('.level-add-btn');
        let holdInterval = null;
        let holdTimeout = null;
        let currentDelay = 300; //Начальная задержка
        let minDelay = 30;      //Минимальная задержка (быстрее всего)
        let acceleration = 0.8; //Множитель ускорения
        let isHolding = false;

        const clearHold = () => {
             isHolding = false;
             clearTimeout(holdTimeout);
             clearInterval(holdInterval);
             currentDelay = 300;
        };

        const executeAdd = (statKey) => {
             if (this.getAvailablePoints() <= 0) {
                 clearHold();
                 return;
             }
             this.addStat(statKey);
        };

        const startHold = (statKey) => {
             if (this.getAvailablePoints() <= 0) return;
             isHolding = true;
             executeAdd(statKey); //Первый клик сразу

             const loopAdd = () => {
                  if (!isHolding) return;
                  executeAdd(statKey);
                  //Ускоряем
                  if (currentDelay > minDelay) {
                       currentDelay = Math.max(minDelay, currentDelay * acceleration);
                  }
                  if (isHolding && this.getAvailablePoints() > 0) {
                       holdTimeout = setTimeout(loopAdd, currentDelay);
                  } else {
                       clearHold();
                  }
             };

             //Задержка перед тем, как начнется зажим (чтобы отличить обычный клик)
             holdTimeout = setTimeout(loopAdd, 400); 
        };

        btns.forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                //Только левый клик
                if (e.button !== 0) return;
                const statKey = e.currentTarget.getAttribute('data-stat');
                startHold(statKey);
            });

            //Для мобильных устройств
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault(); //Предотвращаем двойное срабатывание mousedown на мобильных.
                const statKey = e.currentTarget.getAttribute('data-stat');
                startHold(statKey);
            }, {passive: false});

            btn.addEventListener('mouseup', clearHold);
            btn.addEventListener('mouseleave', clearHold);
            btn.addEventListener('touchend', clearHold);
            btn.addEventListener('touchcancel', clearHold);
        });
    }
}
