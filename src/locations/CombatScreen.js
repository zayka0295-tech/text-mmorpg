import { getItemData } from '../engine/Data/items.js';
import { ITEM_TYPES } from '../engine/Data/itemTypes.js';
import { CombatSimulator } from '../engine/System/CombatSimulator.js';
import { CombatUI } from '../ui/components/CombatUI.js';
import { CombatLogic } from '../engine/System/CombatLogic.js';
import { CombatAnimationSystem } from '../ui/components/CombatAnimationSystem.js';
import { CombatEventSystem } from '../engine/System/CombatEventSystem.js';

export class CombatScreen {
    constructor(screenManager, player) {
        this.screenManager = screenManager;
        this.player = player;
        this.container = document.getElementById('combat-screen');

        this.monster = null;
        this.onCombatEnd = null; //колбек для возврата на карту

        // Components
        this.ui = new CombatUI(this.container);
        this.logic = null; // Will be initialized in startCombat
        this.animations = new CombatAnimationSystem(this.container);
        this.events = new CombatEventSystem();

        this.currentAttackDamage = 0; //Базовый ущерб от выбранного оружия
        this.isPlayerTurn = true;
        this.isProcessingAttack = false; //Защита от двойного клика
        this._afkTimer = null; // AFK auto-attack timer
        this.lastTurnTime = Date.now();

        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Налаштовує слухачі подій бою
     */
    setupEventListeners() {
        // Слухачі для анімацій
        this.events.on(CombatEventSystem.EVENTS.DAMAGE_DEALT, (data) => {
            this.animations.showDamage(data.target, data.damage, data.isCrit, data.damageType);
        });

        this.events.on(CombatEventSystem.EVENTS.HEAL, (data) => {
            this.animations.showHeal(data.target, data.amount);
        });

        this.events.on(CombatEventSystem.EVENTS.FORCE_USED, (data) => {
            this.animations.showForceAnimation(data.skillId, data.caster, data.target);
        });

        this.events.on(CombatEventSystem.EVENTS.CRITICAL_HIT, (data) => {
            this.animations.showImpact(data.target, 'critical');
        });

        this.events.on(CombatEventSystem.EVENTS.TURN_START, (data) => {
            this.animations.showTurnIndicator(data.isPlayerTurn);
        });

        // Слухачі для логіки
        this.events.on(CombatEventSystem.EVENTS.VICTORY, (data) => {
            this.animations.showCombatResult(true, data.rewards);
        });

        this.events.on(CombatEventSystem.EVENTS.DEFEAT, () => {
            this.animations.showCombatResult(false);
        });
    }

    startCombat(monster, onCombatEnd, combatType = 'pve') {
        this.monster = monster;
        this.onCombatEnd = onCombatEnd;
        this.combatType = combatType;

        //Сбрасываем состояние сражения по умолчанию (может быть перезаписан при загрузке сохранения)
        //Кто имеет большую ловкость — тот бъявляется первым (если равен, первым бьет игрок)
        this.isPlayerTurn = (this.player.agility >= this.monster.agility);
        this.isProcessingAttack = false;

        // Initialize combat logic
        this.logic = new CombatLogic(this.player, this.monster);
        this.logic.isPlayerTurn = this.isPlayerTurn;

        // Emit combat start event
        this.events.emit(CombatEventSystem.EVENTS.COMBAT_START, {
            player: this.player,
            monster: this.monster,
            combatType: this.combatType
        });

        // Auto-progression for resumed combats
        const savedStateJson = localStorage.getItem(`sw_active_combat_${this.player.name}`);
        if (savedStateJson) {
            try {
                const saved = JSON.parse(savedStateJson);
                // Only fast-forward if it's the SAME monster ID
                if (saved.monsterId === this.monster.id) {
                    this.player.hp = saved.playerHp || this.player.hp;
                    this.monster.hp = saved.monsterHp || this.monster.hp;
                    this.isPlayerTurn = saved.isPlayerTurn !== undefined ? saved.isPlayerTurn: true;
                    this.lastTurnTime = saved.lastTurnTime || Date.now();
                    
                    const simResult = CombatSimulator.simulateOfflineTurns(this.player, this.monster, this.isPlayerTurn, this.lastTurnTime, (id, entity) => getItemData(id, entity));
                    if (simResult.simulatedTurns > 0) {
                        this.lastTurnTime = simResult.newTime;
                        this.isPlayerTurn = simResult.isPlayerTurn;
                        this.saveCombatState();
                        this.player.save();
                    }
                }
            } catch(e) {
                console.error("Error parsing saved combat state:", e);
            }
        }

        //Скрываем нижнее меню во время боя, чтобы игрок не убежал.
        document.getElementById('bottom-nav').style.display = 'none';

        this.saveCombatState();
        this.render();
        this.screenManager.showScreen('combat-screen');
        
        // If simulation killed someone instantly, trigger end logic immediately
        if (this.monster && this.monster.hp <= 0) {
            // Need a slight delay to ensure the DOM is painted and container exists
            setTimeout(() => this.processVictory(), 200);
        } else if (this.player.hp <= 0) {
            setTimeout(() => this.processDefeat(), 200);
        } else if (!this.isPlayerTurn) {
            // It's the monster's turn (loaded from save)
            this.ui.logMessage(`${this.monster.name}готовится к удару...`);
            setTimeout(() => this.executeMonsterAttack(), 1500);
        }
    }

    endCombat(result, rewards) {
        localStorage.removeItem(`sw_active_combat_${this.player.name}`);
        //ВАЖНО: Всегда снимаем PvP замок при завершении любого боя (на всякий случай)
        localStorage.removeItem(`sw_pvp_combat_lock_${this.player.name}`);
        
        // Clear server-side combat state
        this.player.combatState = null;
        this.player.save();
        
        //Если это был пвп бой - снять замок и цели, если мы знаем ее имя.
        if (this.combatType === 'pvp' && this.monster) {
            const targetName = this.monster.id && this.monster.id.startsWith('real_') ? this.monster.id.slice(5) : this.monster.name;
            localStorage.removeItem(`sw_pvp_combat_lock_${targetName}`);
        }

        if (this.qte) this.qte.stop(); // legacy guard
        this._clearAfkTimer();

        //Показываем меню вспять
        document.getElementById('bottom-nav').style.display = 'flex';

        if (this.onCombatEnd) {
            this.onCombatEnd(result, rewards);
        }
        
        //Очищаем цель, чтобы регенерация HP (main.js) снова запустилась
        this.monster = null;
    }

    _clearAfkTimer() {
        if (this._afkTimer) {
            clearTimeout(this._afkTimer);
            this._afkTimer = null;
        }
    }

    saveCombatState() {
        if (!this.monster || this.monster.hp <= 0 || this.player.hp <= 0) {
            localStorage.removeItem(`sw_active_combat_${this.player.name}`);
            this.player.combatState = null;
            this.player.save();
            return;
        }
        
        const state = {
            combatType: this.combatType,
            monsterId: this.monster.id,
            monsterName: this.monster.name,
            monsterMaxHp: this.monster.maxHp,
            monsterHp: this.monster.hp,
            monsterAttack: this.monster.attack,
            monsterDefense: this.monster.defense,
            monsterXpTarget: this.monster.xpReward,
            monsterMoneyTarget: this.monster.moneyReward,
            monsterLootTarget: this.monster.lootTable,
            monsterLevel: this.monster.level,
            monsterEquipment: this.monster.equipment || null,
            monsterCanUseForce: this.monster.canUseForce || false,
            monsterActiveForceSkill: this.monster.activeForceSkill || null,
            monsterForcePoints: this.monster.forcePoints || 0,
            monsterAlignMsg: this.monster.alignmentShiftMsg || "",
            monsterCalcShift: this.monster._calculatedShift || 0,
            monsterAgility: this.monster.agility,
            playerHp: this.player.hp,
            isPlayerTurn: this.isPlayerTurn,
            lastTurnTime: this.lastTurnTime
        };
        try { localStorage.setItem(`sw_active_combat_${this.player.name}`, JSON.stringify(state)); } catch(e) {}
        
        // Persist to server
        this.player.combatState = state;
        this.player.save();
    }

    restoreCombat(state) {
        if (!state) return false;

        // Reconstruct monster-like object
        const monster = {
            id: state.monsterId,
            name: state.monsterName,
            maxHp: state.monsterMaxHp,
            hp: state.monsterHp,
            attack: state.monsterAttack,
            defense: state.monsterDefense,
            xpReward: state.monsterXpTarget,
            moneyReward: state.monsterMoneyTarget,
            lootTable: state.monsterLootTarget,
            level: state.monsterLevel,
            equipment: state.monsterEquipment,
            canUseForce: state.monsterCanUseForce,
            activeForceSkill: state.monsterActiveForceSkill,
            forcePoints: state.monsterForcePoints,
            alignmentShiftMsg: state.monsterAlignMsg,
            _calculatedShift: state.monsterCalcShift,
            agility: state.monsterAgility,
            isDead: function() { return this.hp <= 0; },
            takeDamage: function(amount) {
                this.hp = Math.max(0, this.hp - amount);
                return amount;
            },
            getRewards: function() {
                return {
                    xp: this.xpReward,
                    money: this.moneyReward,
                    items: this.lootTable, // Simplified logic, looting usually happens on kill generation
                    alignmentShiftMsg: this.alignmentShiftMsg
                };
            }
        };

        // We need to inject `onCombatEndImmediate` dummy if needed, or handle it in processVictory
        
        this.startCombat(monster, (result, rewards) => {
            // Default onCombatEnd callback
            this.screenManager.showScreen('maps-screen');
            if (window.gameInstance) window.gameInstance.mapScreen.render();
        }, state.combatType);

        // Force state update from saved data (startCombat might reset some things or use LS)
        // Since startCombat reads LS, we should ensure LS is populated or we manually override
        // But if we are restoring from DB, LS might be empty.
        // Let's manually override the logic state to match `state`
        this.isPlayerTurn = state.isPlayerTurn;
        this.lastTurnTime = state.lastTurnTime || Date.now();
        this.player.hp = state.playerHp;
        
        // Trigger render to show correct state
        this.render();
        return true;
    }

    render() {
        if (!this.monster) return;

        const w1 = this.player.equipment[ITEM_TYPES.WEAPON1];
        const force = this.player.equipment[ITEM_TYPES.ARTIFACT];

        let weaponData = null;
        if (w1) {
            weaponData = getItemData(w1.id || w1, this.player);
        }

        let forceData = null;
        let skillData = null;
        if (force) {
            forceData = getItemData(force.id || force, this.player);
        } else if (this.player.canUseForce && this.player.activeForceSkill) {
            const skillId = this.player.activeForceSkill;
            const skillsData = {
                'mind_control': { id: skillId, name: 'Mind Control', cost: 50 },
                'force_pull': { id: skillId, name: 'Force Pull', cost: 50 },
                'force_heal': { id: skillId, name: 'Force Heal', cost: 50 },
                'force_speed': { id: skillId, name: 'Force Speed', cost: 50 },
                'sith_lightning': { id: skillId, name: 'Молния Силы', cost: 50 },
                'sith_rage': { id: skillId, name: 'Ярость Ситха', cost: 50 },
                'lightsaber_throw': { id: skillId, name: 'Бросок светового меча', cost: 50 },
                'force_choke': { id: skillId, name: 'Удушение Силой', cost: 50 }
            };
            skillData = skillsData[skillId];
        }

        const medkit = this.player.inventory.find(i => i.id === 'bacta_medium') || this.player.inventory.find(i => i.id === 'bacta_small');
        let medkitData = null;
        if (medkit) {
            const item = getItemData(medkit.id, this.player);
            if (item) {
                medkitData = {
                    id: medkit.id,
                    name: item.name,
                    heal: item.heal,
                    amount: medkit.amount,
                    rarity: item.rarity
                };
            }
        }

        this.ui.renderFullCombat(this.player, this.monster, weaponData, forceData, skillData, medkitData);
        this.attachEventListeners();

        //Если ход монстра - показываем сообщение
        if (!this.isPlayerTurn) {
            const actionLog = this.container.querySelector('#combat-action-log');
            if (actionLog) {
                actionLog.innerHTML = `${this.monster.name} более быстрый и готовится к удару...`;
            }
        }
    }

    attachEventListeners() {
        // Start AFK timer
        this._clearAfkTimer();
        if (this.isPlayerTurn) {
            this._afkTimer = setTimeout(() => {
                if (this.isPlayerTurn && !this.isProcessingAttack) {
                    this.ui.logMessage('⏱️ Авто-атака! (10 секунд без действия)');
                    const w1Btn = this.container.querySelector('.btn-weapon');
                    if (w1Btn && !w1Btn.disabled) w1Btn.click();
                }
            }, 10000);
        }

        const weaponBtns = this.container.querySelectorAll('.btn-weapon');
        weaponBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!this.isPlayerTurn || this.isProcessingAttack) return;
                this._clearAfkTimer();
                this.isProcessingAttack = true;
                this.ui.disableButtons();
                this.currentWeaponName = e.target.innerText.replace('👊 ', '').trim();
                // player.attack already includes all equipment bonuses via getEquipmentStat()
                this.currentAttackDamage = this.player.attack;
                this.executePlayerAttack();
            });
        });

        const forceBtn = this.container.querySelector('.btn-force');
        if (forceBtn) {
            forceBtn.addEventListener('click', (e) => {
                if (!this.isPlayerTurn || this.isProcessingAttack) return;
                this._clearAfkTimer();
                
                const skillId = e.currentTarget.getAttribute('data-skill');
                const cost = parseInt(e.currentTarget.getAttribute('data-cost'));
                
                if (this.player.forcePoints < cost) return;

                this.isProcessingAttack = true;
                this.ui.disableButtons();
                this.executeForceSkill(skillId, cost);
            });
        }

        const healBtn = this.container.querySelector('.btn-heal');
        if (healBtn) {
            healBtn.addEventListener('click', (e) => {
                if (!this.isPlayerTurn || this.player.hp >= this.player.maxHp || this.isProcessingAttack) return;
                this._clearAfkTimer();
                this.isProcessingAttack = true;
                this.ui.disableButtons();

                const healAmt = parseInt(e.target.getAttribute('data-heal'));
                const itemId = e.target.getAttribute('data-id');

                const healed = this.player.heal(healAmt);
                this.player.removeItem(itemId, 1);

                this.player.updateQuestProgress('use_medkit', null, 1);

                this.ui.logMessage(`Вы использовали аптечку и восстановили ${healed} HP!`);

                this.endPlayerTurn();
            });
        }

        // --- INSTANT FINISH (Double Click on Image) ---
        const monsterImg = this.container.querySelector('.combat-bg-image');
        if (monsterImg) {
            monsterImg.addEventListener('dblclick', () => {
                if (this.isProcessingAttack || !this.monster) return;
                this.instantFinishCombat();
            });
        }
    }

    instantFinishCombat() {
        this._clearAfkTimer();
        this.isProcessingAttack = true;
        this.ui.disableButtons();
        this.ui.logMessage('⚡ <b>Мгновенное завершение боя!</b>');

        const result = CombatSimulator.simulateInstantFinish(this.player, this.monster, this.isPlayerTurn);
        this.player.hp = result.playerHp;
        this.monster.hp = result.monsterHp;

        // Finalize
        this.ui.updateHpBars(this.player.hp, this.player.maxHp, this.monster.hp, this.monster.maxHp);
        this.lastTurnTime = Date.now();
        this.saveCombatState();

        if (this.monster.hp <= 0) {
            this.processVictory();
        } else {
            this.processDefeat();
        }
    }

    executeForceSkill(skillId, cost) {
        const result = CombatSimulator.executeForceSkill(skillId, cost, this.player, this.monster);
        
        if (result.floatingDmg > 0) {
            this.ui.showFloatingDamage(result.floatingDmg, result.isCrit);
        }

        this.ui.logMessage(result.msg);
        this.ui.updateHpBars(this.player.hp, this.player.maxHp, this.monster.hp, this.monster.maxHp);
        this.lastTurnTime = Date.now();
        this.saveCombatState();

        // If monster died from force skill — end combat immediately
        if (this.monster.hp <= 0) {
            setTimeout(() => this.processVictory(), 1000);
            return;
        }

        //Сила - free action. Возвращаем игроку ход и даем атаковать дальше.
        setTimeout(() => {
            this.isProcessingAttack = false;
            this.isPlayerTurn = true;
            this.render();
        }, 1000);
    }

    executePlayerAttack() {
        if (!this.monster) return;

        //Получаем тип оружия (чтобы симулятор знал Сила это или Ловкость)
        const weaponId = this.player.equipment?.weapon1 || 'base';

        const simResult = CombatSimulator.calculatePlayerDamage(
            this.player.getFullStats(),
            weaponId,
            this.monster.defense,
            this.monster.agility || 10
        );

        // Force Pull Vulnerability Check
        let damage = simResult.damage;
        if (this.monster.vulnerable) {
            damage *= 2;
            this.monster.vulnerable = false; // Consume mark
            simResult.quality += " (VULNERABLE x2)";
        }
        
        // Sith Rage Check
        if (this.player.rageTurns > 0) {
            damage = Math.floor(damage * 1.5);
            this.player.rageTurns--;
            simResult.quality += " (RAGE x1.5)";
        }

        // Show floating damage FIRST before DOM updates
        const isCrit = simResult.isCrit;
        
        let actualDamage = 0;
        if (!simResult.isDodge) {
            actualDamage = this.monster.takeDamage(damage);
            this.ui.showFloatingDamage(actualDamage, isCrit);
        }

        const weaponText = this.currentWeaponName ? `(${this.currentWeaponName})` : "";
        
        if (simResult.isDodge) {
            this.ui.logMessage(`<b>${simResult.quality}</b><br>Вы бьете${weaponText}, но враг уклоняется!`);
        } else {
            this.ui.logMessage(`<b>${simResult.quality}</b><br>Вы бьете${weaponText}и наносите${actualDamage}урона!`);
        }
        
        this.ui.updateHpBars(this.player.hp, this.player.maxHp, this.monster.hp, this.monster.maxHp); //Обновляем только бары, не уничтожая плавающие повреждения
        this.lastTurnTime = Date.now();
        this.saveCombatState();

        if (this.monster.isDead()) {
            setTimeout(() => this.processVictory(), 1000);
        } else {
            // Check for Force Speed (extra turn)
            if (this.player.hasSpeed) {
                this.player.hasSpeed = false; // Consume speed
                this.ui.logMessage(`<b>Force Speed!</b> Вы делаете еще один удар!`);
                setTimeout(() => {
                    this.isProcessingAttack = false;
                }, 1000);
            } else {
                this.endPlayerTurn();
            }
        }
    }

    endPlayerTurn() {
        this.isPlayerTurn = false;
        //Деактивируем кнопки без перестройки DOM (чтобы floating damage оставалось)
        this.ui.disableButtons();
        
        // Save state precisely here so F5 will remember it is the monster's turn!
        this.lastTurnTime = Date.now();
        this.saveCombatState();

        setTimeout(() => {
            if (!this.monster) return; // Бой уже завершен

            if (this.monster.stunned) {
                this.monster.stunned = false;
                this.ui.logMessage(`${this.monster.name} is stunned and skips turn!`);
                setTimeout(() => {
                    this.isPlayerTurn = true;
                    this.isProcessingAttack = false;
                    this.ui.logMessage(`Ваш ход! Выберите действие.`);
                    this.render();
                }, 1500);
            } else {
                this.executeMonsterAttack();
            }
        }, 1500);
    }

    executeMonsterAttack() {
        if (!this.monster || this.player.isDead()) return;

        const aiResult = CombatSimulator.executeMonsterAI(this.monster, this.player, (id, entity) => getItemData(id, entity));
        const finalDamage = aiResult.finalDamage;
        const actionMsg = aiResult.actionMsg;

        this.ui.logMessage(actionMsg);
        
        if (finalDamage > 0) {
            this.player.takeDamage(finalDamage);
        }

        this.ui.updateHpBars(this.player.hp, this.player.maxHp, this.monster.hp, this.monster.maxHp); //Обновляем бары HP
        this.lastTurnTime = Date.now();
        this.saveCombatState();

        if (this.player.isDead()) {
            setTimeout(() => this.processDefeat(), 1500);
        } else {
            // Check for Force Speed
            if (this.monster.hasSpeed) {
                this.monster.hasSpeed = false;
                setTimeout(() => {
                    this.executeMonsterAttack();
                }, 1500);
            } else {
                //Снова наш ход
                setTimeout(() => {
                    if (!this.monster) return; // Бой уже завершен

                    if (this.player.stunned) {
                        this.player.stunned = false;
                        this.ui.logMessage(`Вы были оглушены и пропускаете ход!`);
                        setTimeout(() => this.executeMonsterAttack(), 1500);
                        return;
                    }
                    this.isPlayerTurn = true;
                    this.isProcessingAttack = false;

                    this.ui.logMessage(`Ваш ход! Выберите действие.`);
                    this.render();
                }, 1500);
            }
        }
    }

    processVictory() {
        if (!this.monster) return; // Защита от повторного вызова
        
        if (this.monster.onCombatEndImmediate) {
            const damageTaken = Math.max(0, this.monster.maxHp - this.monster.hp);
            this.monster.onCombatEndImmediate('victory', damageTaken);
        }

        //Обновляем прогресс квеста
        this.player.updateQuestProgress('kill_monster', this.monster.id);

        const rewards = this.monster.getRewards();
        this.player.gainXp(rewards.xp);
        this.player.money += rewards.money;

        // --- ВАЖНО: Очищаем монстра ПЕРЕД показом модалки, чтобы предотвратить баги ---
        const currentMonster = this.monster;
        this.monster = null;

        let lootHtml ='';
        if (rewards.items && rewards.items.length > 0) {
            lootHtml += '<div class="combat-result-item" style="color: #00bcd4; margin-top: 10px;">ПОЛУЧЕННЫЙ ЛУТ:</div>';
            const jediPickupTitles = ['Падаван', 'Джедай'];

            rewards.items.forEach(lootItem => {
                let iData = null;
                if (typeof lootItem === 'string') {
                    iData = getItemData(lootItem, this.player);
                } else if (typeof lootItem === 'object') {
                    iData = lootItem;
                }

                if (iData && iData.reqTitle === 'Падаван' && !jediPickupTitles.includes(this.player.title)) {
                    lootHtml += `<div class="combat-result-item" style="color:#888;">🚫 <span class="item-rarity-${iData.rarity || 'common'}">${iData.name}</span> <small>(Требуется: Падаван)</small></div>`;
                    return;
                }

                this.player.addItem(lootItem, 1);

                if(iData) {
                    lootHtml += `<div class="combat-result-item">🎁 <span class="item-rarity-${iData.rarity ||'common'}">${iData.name}</span></div>`;
                }
            });
        } else {
            lootHtml += '<div class="combat-result-item" style="color: #e74c3c; margin-top: 10px;">Змея не выпала 😕</div>';
        }

        this.player.save();

        const cooldownsKey = `sw_monster_cooldowns_${this.player.name}`;
        let cooldowns={};
        try { cooldowns = JSON.parse(localStorage.getItem(cooldownsKey) ||'{}'); } catch (e) {}
        cooldowns[currentMonster.id] = Date.now();
        try { localStorage.setItem(cooldownsKey, JSON.stringify(cooldowns)); } catch(e) {}

        let alignmentHtml = '';
        if (rewards.alignmentShiftMsg) {
            alignmentHtml = `<div class="combat-result-item" style="margin-top: 5px;">${rewards.alignmentShiftMsg}</div>`;
        }

        this.ui.showVictoryModal(rewards, alignmentHtml, lootHtml, () => {
            this.endCombat('victory', rewards);
        });
    }

    processDefeat() {
        if (!this.monster) return; // Защита от повторного вызова

        if (this.monster.onCombatEndImmediate) {
            const damageTaken = Math.max(0, this.monster.maxHp - this.monster.hp);
            this.monster.onCombatEndImmediate('defeat', damageTaken);
        }

        // --- ВАЖНО: Очищаем монстра ПЕРЕД показом модалки ---
        this.monster = null;

        this.player = this.player; // force update (legacy guard)
        this.player.save();

        this.ui.showDefeatModal(() => {
            this.endCombat('defeat', null);
        });
    }
}
