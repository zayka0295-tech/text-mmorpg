export class CombatSimulator {
    constructor() {}

    static calculatePlayerDamage(attackerStats, weaponType, monsterDefense, targetAgility = 10) {
        // Dodge check: 0.5% chance per point of target agility, max 50%
        const dodgeChance = Math.min(50, targetAgility * 0.5);
        if (Math.random() * 100 < dodgeChance) {
             return { damage: 0, quality: "💨 Промах! (Уворот)", isCrit: false, isDodge: true };
        }

        //Вычисление Силы Атаки (Attack Power)
        //Если бластер/пистолет –> используется ловкость, иначе (световой меч, кулаки) –> физ. Сила.
        let wType = typeof weaponType === 'string' ? weaponType : (weaponType?.id || '');
        const isRanged = wType && (wType.includes('blaster') || wType.includes('pistol') || wType.includes('rifle'));
        const mainStat = isRanged ? attackerStats.agility : attackerStats.strength;
        
        const attackPower = attackerStats.attack + mainStat; //Атака оружия + атрибут
        
        let baseDmg = attackPower - monsterDefense;
        if (baseDmg < 1) baseDmg = 1;

        // Random ±20% variance
        const variance = 0.8 + Math.random() * 0.4;
        baseDmg = Math.floor(baseDmg * variance);
        if (baseDmg < 1) baseDmg = 1;

        // Crit check
        const isCrit = Math.random() * 100 < attackerStats.critChance;
        const multiplier = isCrit ? attackerStats.critDamage : 1.0;
        const quality = isCrit ? "💥 КРИТИЧЕСКИЙ УДАР!" : (variance > 1.1 ? "Хороший удар!" : "Обычный удар");

        const finalDamage = Math.floor(baseDmg * multiplier);
        return { damage: finalDamage, quality, isCrit, isDodge: false };
    }

    static calculateMonsterDamage(monsterStats, playerDefense, monsterName, targetAgility = 10) {
        // Dodge check
        const dodgeChance = Math.min(50, targetAgility * 0.5);
        if (Math.random() * 100 < dodgeChance) {
             return { damage: 0, quality: "💨 Промах! (Уворот)", isCrit: false, isDodge: true };
        }

        const safeName = (monsterName || monsterStats?.name || '').toLowerCase();
        const isRanged = monsterStats.type === 'droid' || safeName.includes('бластер') || safeName.includes('снайпер');
        const mainStat = isRanged ? monsterStats.agility : monsterStats.strength;
        
        const monsterAttackPower = monsterStats.attack + mainStat;

        let baseDmg = monsterAttackPower - playerDefense;
        if (baseDmg < 1) baseDmg = 1;

        // Random ±20% variance (same as player)
        const variance = 0.8 + Math.random() * 0.4;
        baseDmg = Math.floor(baseDmg * variance);
        if (baseDmg < 1) baseDmg = 1;

        // Crit check (same as player)
        const isCrit = Math.random() * 100 < monsterStats.critChance;
        const multiplier = isCrit ? monsterStats.critDamage : 1.0;
        const quality = isCrit ? "💥 КРИТИЧЕСКИЙ УДАР!" : (variance > 1.1 ? "Хороший удар!" : "Обычный удар");

        const finalDamage = Math.floor(baseDmg * multiplier);
        return { damage: finalDamage, isCrit, quality, isDodge: false };
    }

    static simulateOfflineTurns(player, monster, isPlayerTurn, lastTurnTime, getItemDataFn) {
        const timePassed = Date.now() - lastTurnTime;
        const simulatedTurns = Math.floor(timePassed / 10000);
        
        if (simulatedTurns <= 0 || monster.hp <= 0 || player.hp <= 0) return { simulatedTurns: 0, isPlayerTurn, newTime: lastTurnTime };

        let newTime = lastTurnTime + (simulatedTurns * 10000);
        let turnFlag = isPlayerTurn;
        
        let pDmgBase = player.attack;
        const w1 = player.equipment?.weapon1;
        if (w1) {
            const wData = getItemDataFn(w1.id || w1, player);
            if (wData) pDmgBase = player.attack; 
        }

        let mDmgBase = monster.attack;
        if (monster.equipment && monster.equipment.weapon1) {
            const mWa = getItemDataFn(monster.equipment.weapon1, monster);
            if (mWa) mDmgBase += (mWa.stats?.attack || 5);
        }

        for (let i = 0; i < simulatedTurns; i++) {
            if (turnFlag) {
                let dmg = Math.max(1, pDmgBase - monster.defense);
                monster.hp -= dmg;
                turnFlag = false;
            } else {
                let dmg = Math.max(1, mDmgBase - player.defense);
                player.hp -= dmg;
                turnFlag = true;
            }
            if (monster.hp <= 0 || player.hp <= 0) break;
        }

        return { simulatedTurns, isPlayerTurn: turnFlag, newTime };
    }

    static executeMonsterAI(monster, player, getItemDataFn) {
        if (!monster || !player) return { finalDamage: 0, actionMsg: "Ошибка: Цель потеряна", isCrit: false };
        
        let actionMsg = "";
        let finalDamage = 0;
        let isCrit = false;

        //Обычные монстры без экипировки
        if (!monster.equipment) {
            const mProps = typeof monster.getFullStats === 'function' ? monster.getFullStats() : monster;
            const simResult = CombatSimulator.calculateMonsterDamage(mProps, player.defense, monster.name, player.agility || 10);
            return {
                finalDamage: simResult.damage,
                isCrit: simResult.isCrit,
                actionMsg: simResult.isDodge 
                    ? `${simResult.quality ? ` <b>${simResult.quality}</b><br>` : ""}${monster.name} атакует, но вы мастерски уклоняетесь!`
                    : `${simResult.quality ? ` <b>${simResult.quality}</b><br>` : ""}${simResult.isCrit ? "<b>Осторожно, критический удар!</b><br>" : ""}${monster.name} атакует и наносит ${simResult.damage} урона!`
            };
        }

        //PvP Бот или другой игрок с экипировкой
        let weaponActions = [{ type: 'base', name: 'Кулак', atk: 2 }];
        
        if (monster.equipment.weapon1) {
            const w1Data = getItemDataFn(monster.equipment.weapon1, monster);
            if (w1Data) weaponActions.push({ type: 'weapon', name: w1Data.name, atk: w1Data.stats?.attack || 5 });
        }
        if (monster.equipment.artifact) {
             const aData = getItemDataFn(monster.equipment.artifact, monster);
             if (aData) weaponActions.push({ type: 'weapon', name: aData.name, atk: aData.stats?.attack || 15 });
        }

        if (weaponActions.length > 1) {
            weaponActions = weaponActions.filter(a => a.type !== 'base');
        }

        const chosenWeapon = weaponActions[Math.floor(Math.random() * weaponActions.length)];

        let forceMsg = "";
        const forceCost = 50;
        
        if (monster.canUseForce && monster.activeForceSkill) {
            while ((monster.forcePoints || 0) >= forceCost) {
                let powerActivated = false;
                if (monster.activeForceSkill === 'force_heal' && monster.hp < monster.maxHp) {
                    const healAmt = Math.floor(monster.maxHp * 0.15);
                    monster.hp = Math.min(monster.maxHp, monster.hp + healAmt);
                    forceMsg += `<span style="color: #2ecc71;">${monster.name} использует Force Heal!</span> Восстановлено ${healAmt} HP.<br>`;
                    powerActivated = true;
                } else if (monster.activeForceSkill === 'force_pull' && !player.vulnerable) {
                    player.vulnerable = true;
                    forceMsg += `<span style="color: #3498db;">${monster.name} использует Force Pull!</span> Ваша уязвимость увеличена!<br>`;
                    powerActivated = true;
                } else if (monster.activeForceSkill === 'mind_control' && !player.stunned) {
                    player.stunned = true;
                    forceMsg += `<span style="color: #9b59b6;">${monster.name} использует Mind Control!</span> Вы пропускаете следующий ход!<br>`;
                    powerActivated = true;
                } else if (monster.activeForceSkill === 'force_speed' && !monster.hasSpeed) {
                    monster.hasSpeed = true;
                    forceMsg += `<span style="color: #f1c40f;">${monster.name} использует Force Speed!</span> Будет еще одна атака!<br>`;
                    powerActivated = true;
                }

                if (powerActivated) monster.forcePoints -= forceCost;
                else break; 
            }
        }

        const mProps = monster.getFullStats();
        mProps.attack = monster.attack + chosenWeapon.atk; 

        const simResult = CombatSimulator.calculateMonsterDamage(mProps, player.defense, monster.name, player.agility || 10);
        finalDamage = simResult.damage;
        isCrit = simResult.isCrit;
        let qualityMsg = simResult.quality ? `<b>${simResult.quality}</b> ` : "";

        if (player.vulnerable && !simResult.isDodge) {
            finalDamage *= 2;
            player.vulnerable = false;
            qualityMsg += `<span style="color: #e74c3c;">(Уязвимость x2!)</span>`;
        }

        if (simResult.isDodge) {
            actionMsg = `${forceMsg}${qualityMsg}<br>${monster.name} бьет (${chosenWeapon.name}), но вы избегаете удара!`;
        } else {
            actionMsg = `${forceMsg}${qualityMsg}<br>${monster.name} бьет (${chosenWeapon.name}) на ${finalDamage} урона!`;
        }
        
        return { finalDamage, isCrit, actionMsg, forceMsg };
    }

    static executeForceSkill(skillId, cost, player, monster) {
        player.forcePoints -= cost;
        let msg = '';
        let floatingDmg = 0;
        let isCrit = false;

        if (skillId === 'mind_control') {
            if (monster.type === 'humanoid') {
                monster.stunned = true;
                msg = `<span style="color: #9b59b6;">Mind Control!</span> ${monster.name} is stunned!`;
            } else {
                msg = `<span style="color: #e74c3c;">Failed!</span> Mind Control only works on Humanoids.`;
            }
        } else if (skillId === 'force_pull') {
            monster.vulnerable = true;
            msg = `<span style="color: #3498db;">Force Pull!</span> Enemy is vulnerable (x2 Dmg next hit).`;
        } else if (skillId === 'force_heal') {
            const healAmt = Math.floor(player.maxHp * 0.15);
            player.heal(healAmt);
            msg = `<span style="color: #2ecc71;">Force Heal!</span> Restored ${healAmt} HP.`;
        } else if (skillId === 'force_speed') {
            player.hasSpeed = true;
            msg = `<span style="color: #f1c40f;">Force Speed!</span> You act twice this turn.`;
        } else if (skillId === 'sith_lightning') {
            monster.stunned = true;
            const baseDmg = (player.attack + player.intellect) - monster.defense > 0 
                            ? (player.attack + player.intellect) - monster.defense 
                            : 1;
            let dmg = Math.floor(baseDmg * 2 * (player.critDamage || 1.5));
            if (player.rageTurns > 0) dmg = Math.floor(dmg * 1.5);
            
            dmg = Math.floor(dmg * (0.8 + Math.random() * 0.4));
            if (dmg < 1) dmg = 1;

            monster.takeDamage(dmg);
            msg = `<span style="color: #9b59b6;">Молния Силы!</span> Враг оглушен и получил ${dmg} урона!`;
            floatingDmg = dmg;
            isCrit = true;
        } else if (skillId === 'sith_rage') {
            const costHp = Math.floor(player.maxHp * 0.1);
            player.takeDamage(costHp);
            player.rageTurns = 2;
            msg = `<span style="color: #e74c3c;">Ярость Ситха!</span> Вы потеряли ${costHp} HP, но ваша атака растет на 2 хода!`;
        } else if (skillId === 'lightsaber_throw') {
            const w1 = player.equipment?.weapon1 || 'base';
            let simResult = CombatSimulator.calculatePlayerDamage(player.getFullStats(), w1, monster.defense, monster.agility);
            let dmg = simResult.damage;
            if (player.rageTurns > 0) dmg = Math.floor(dmg * 1.5);
            monster.takeDamage(dmg);
            player.hasSpeed = true;
            msg = `<span style="color: #e74c3c;">Бросок светового меча!</span> Нанесен ${dmg} урона и вы получаете дополнительный ход!`;
            if (!simResult.isDodge) {
                floatingDmg = dmg;
                isCrit = simResult.isCrit;
            }
        } else if (skillId === 'force_choke') {
            if (monster.hp < monster.maxHp * 0.25 && Math.random() < 0.3) {
                const dmg = monster.hp;
                monster.takeDamage(dmg);
                msg = `<span style="color: #8e44ad;">Удушение Силой!</span> Вы безжалостно задушили врага!`;
                floatingDmg = dmg;
                isCrit = true;
            } else {
                msg = `<span style="color: #8e44ad;">Удушение Силой!</span> Врагу удалось вырваться...`;
            }
        }

        return { msg, floatingDmg, isCrit };
    }

    static simulateInstantFinish(player, monster, isPlayerTurn) {
        let turn = isPlayerTurn;
        const pStats = player.getFullStats();
        
        while (player.hp > 0 && monster.hp > 0) {
            const mStats = monster.getFullStats ? monster.getFullStats() : monster;
            if (turn) {
                const dmg = Math.max(1, (pStats.attack + pStats.strength) - mStats.defense);
                monster.hp -= Math.floor(dmg * (0.8 + Math.random() * 0.4));
                turn = false;
            } else {
                const dmg = Math.max(1, (mStats.attack + mStats.strength) - pStats.defense);
                player.hp -= Math.floor(dmg * (0.8 + Math.random() * 0.4));
                turn = true;
            }
        }
        return { playerHp: player.hp, monsterHp: monster.hp };
    }
}
