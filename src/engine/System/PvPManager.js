
import { Notifications } from '../../ui/Notifications.js';
import { Monster } from '../Entities/Monster.js';
import { LOCATIONS } from '../Data/locations.js';

const SAFE_ZONE_WARN_KEY = 'sw_safezone_warning';

export class PvPManager {
    constructor() {
        //Статический класс-сервис, не требующий хранения состояния, за исключением доступа к текущему игроку в методах
    }

    static resolveTarget(id) {
        //Все цели теперь реальные игроки
        const playerName = id.startsWith('real_') ? id.slice(5) : id;
        try {
            const raw = localStorage.getItem(`sw_player_save_${playerName}`);
            if (raw) {
                const data = JSON.parse(raw);
                // equipment is stored inside inventoryData.equipment per Player.save()
                const equipment = data.inventoryData?.equipment || data.equipment || {};
                return {
                    id,
                    name: playerName,
                    avatar: data.avatar || '🧑🚀',
                    className: 'Контрабандист',
                    title: data.title || null,
                    level: data.level || 1,
                    hp: data.hp || 100,
                    // Use computed totals (with equipment bonuses) if saved, else fall back to base
                    maxHp: data.totalMaxHp || data.baseMaxHp || 100,
                    money: data.money || 0,
                    attack: data.totalAttack || data.baseAttack || 12,
                    defense: data.totalDefense || data.baseDefense || 5,
                    constitution: data.totalConstitution || data.baseConstitution || 10,
                    strength: data.totalStrength || data.baseStrength || 10,
                    agility: data.totalAgility || data.baseAgility || 10,
                    intellect: data.totalIntellect || data.baseIntellect || 10,
                    critChance: data.critChance || 10,
                    critDamage: data.critDamage || 1.5,
                    alignment: data.alignment || 0,
                    isOnline: (Date.now() - (data.lastOnline || 0)) < 60000,
                    locationId: data.locationId || 'unknown',
                    reputation: data.reputation || 0,
                    reputationVotes: data.reputationVotes || {},
                    ship: data.ship || null,
                    equipment,
                    canUseForce: !!(data.activeForceSkill && (data.forcePoints || 0) > 0),
                    activeForceSkill: data.activeForceSkill || null,
                    unlockedForceSkills: data.unlockedForceSkills || [],
                    forcePoints: data.forcePoints || 0
                };
            }
        } catch (e) { /* ignore */ }
        return null;
    }

    static voteReputation(playerSelf, targetId, voteType, onSuccess, onError) {
        playerSelf.reputationMgr.vote(targetId, voteType, onSuccess, onError);
    }

    static getSafeZoneWarnData() {
        try {
            const raw = localStorage.getItem(SAFE_ZONE_WARN_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    static doAttack(playerSelf, targetOrId, onError, onHideModal) {
        let target;
        let targetId;

        if (typeof targetOrId === 'object') {
            target = targetOrId;
            targetId = target.id;
        } else {
            targetId = targetOrId;
            target = this.resolveTarget(targetId);
        }

        if (!target) {
            onError('❌ Игрок не найден.');
            return;
        }

        if (target.name === playerSelf.name) {
            onError('❌ Вы не можете напасть на самого себя!');
            return;
        }

        const now = Date.now();
        const targetBotName = targetId.startsWith('real_') ? targetId.slice(5) : target.name;
        
        //Проверка, не имеет ли игрок штрафа за побег из PvP
        const fleePenalty = localStorage.getItem(`sw_pvp_flee_penalty_${playerSelf.name}`);
        if (fleePenalty) {
            const timeSinceFlee = Date.now() - parseInt(fleePenalty, 10);
            const penaltyDuration = 60 * 60 * 1000;
            if (timeSinceFlee < penaltyDuration) {
                const minsLeft = Math.ceil((penaltyDuration - timeSinceFlee) / 60000);
                onError(`🚨 У вас действует штраф за побег из боя! Осталось${minsLeft}мин.`);
                return;
            } else {
                localStorage.removeItem(`sw_pvp_flee_penalty_${playerSelf.name}`);
            }
        }

        //Проверка, не сами ли мы в бою
        const myLockRaw = localStorage.getItem(`sw_pvp_combat_lock_${playerSelf.name}`);
        if (myLockRaw) {
            try {
                const lock = JSON.parse(myLockRaw);
                if (now - (lock.ts || 0) < 10 * 60 * 1000) {
                    onError('❌ Вы уже участвуете в бою!');
                    return;
                } else {
                    localStorage.removeItem(`sw_pvp_combat_lock_${playerSelf.name}`);
                }
            } catch (e) { localStorage.removeItem(`sw_pvp_combat_lock_${playerSelf.name}`); }
        }

        //Проверка цели на участие в бою
        const targetLockRaw = localStorage.getItem(`sw_pvp_combat_lock_${targetBotName}`);
        if (targetLockRaw) {
            try {
                const lock = JSON.parse(targetLockRaw);
                if (now - (lock.ts || 0) < 10 * 60 * 1000) {
                    onError(`❌ ${target.name}уже участвует в бою!`);
                    return;
                } else {
                    localStorage.removeItem(`sw_pvp_combat_lock_${targetBotName}`);
                }
            } catch (e) { localStorage.removeItem(`sw_pvp_combat_lock_${targetBotName}`); }
        }

        const myLocId = playerSelf.locationId;
        const targetLocId = target.locationId;

        if (myLocId !== targetLocId) {
            onError(`⚠️ Вы слишком далеко! Игрок нет в вашей текущей зоне.`);
            return;
        }

        const myLoc = LOCATIONS[myLocId];
        const targetLoc = LOCATIONS[targetLocId];

        const attackerAlign = playerSelf.alignment || 0;
        const defenderAlign = target.alignment || 0;
        const planetId = targetLoc?.planetId || 'tatooine';

        let isValidFactionPvP = false;
        const isEnemyFaction = (attackerAlign > 0 && defenderAlign < 0) || (attackerAlign < 0 && defenderAlign > 0);
        if ((planetId === 'dantooine' || planetId === 'korriban') && isEnemyFaction) {
            isValidFactionPvP = true;
        }

        if (!isValidFactionPvP && (!targetLoc || targetLoc.isSafeZone || !myLoc || myLoc.isSafeZone)) {
            const warnData = this.getSafeZoneWarnData();
            const now = Date.now();
            const COOLDOWN = 15 * 60 * 1000;

            const factionNames = {
                'coruscant': 'Полиция Корусанта',
                'tatooine': 'Картель Хаттов',
                'dantooine': 'Сили Самообороны Дантуина',
                'korriban': 'Гвардейцы Ситхов'
            };
            const currentFaction = factionNames[planetId] || 'Местные власти';

            if (warnData && (now - warnData.ts) < COOLDOWN) {
                const fineAmount = 1500;
                const actualFine = Math.min(fineAmount, playerSelf.money);
                playerSelf.money = Math.max(0, playerSelf.money - actualFine);
                if (playerSelf.save) playerSelf.save();

                localStorage.removeItem(SAFE_ZONE_WARN_KEY);

                onError(`👮 ${currentFaction} выписала штраф ${actualFine.toLocaleString()} кр. за использование оружия в безопасной зоне!`);
            } else {
                try { localStorage.setItem(SAFE_ZONE_WARN_KEY, JSON.stringify({ ts: now, planet: planetId })); } catch(e) {}
                onError(`⚠️ Нападение запрещено! Вы или цель в безопасной зоне. В следующий раз ${currentFaction} (1 500 кр.) выпишет штраф!`);
            }
            return;
        }

        const hpPercent = (target.hp / target.maxHp) * 100;
        if (hpPercent < 70) {
            onError(`🩸 ${target.name}уже ранен (${Math.round(hpPercent)}% HP). Нападать на раненого - нечестно!`);
            return;
        }

        const myHpPercent = (playerSelf.hp / playerSelf.maxHp) * 100;
        if (myHpPercent < 50) {
            onError(`🩸 Вы слишком ранены для нападения (<50% HP)! Восстановите силы.`);
            return;
        }

        if (target.hp <= 0) {
            onError(`${target.name}уже без сознания!`);
            return;
        }

        const combatScreen = window.gameInstance?.combatScreen;
        if (!combatScreen) {
            onError('Боевая система недоступна');
            return;
        }

        if (onHideModal) onHideModal(); // Callback to hide modal

        const stolenAmount = Math.min(
            Math.floor(Math.random() * 100000) + 1,
            target.money
        );
        const pvpXp = Math.floor(target.level * 10 * 0.05);

        // PvP monster is a fake representation of the player
        const pvpMonster = new Monster(
            target.id,
            target.name,
            target.level || 1,
            'humanoid',
            pvpXp,
            0, //Ставим 0, чтобы CombatScreen не начислял деньги (начислим в resolveCombatEnd)
            []
        );
        // Overwrite the level-generated stats with the actual target stats
        pvpMonster.maxHp = target.maxHp;
        pvpMonster.hp = target.hp; // start with their current hurt HP
        pvpMonster.attack = target.attack;
        pvpMonster.defense = target.defense;
        pvpMonster.constitution = target.constitution || 10;
        pvpMonster.strength = target.strength || 10;
        pvpMonster.agility = target.agility || 10;
        pvpMonster.intellect = target.intellect || 10;
        pvpMonster.critChance = target.critChance || 2.5;
        pvpMonster.critDamage = target.critDamage || 1.5;
        pvpMonster.equipment = target.equipment || null;
        pvpMonster.canUseForce = target.canUseForce || false;
        pvpMonster.activeForceSkill = target.activeForceSkill || null;
        pvpMonster.forcePoints = target.forcePoints || 0;

        let alignmentShiftMsg = "";
        const myFinalAlign = playerSelf.alignment || 0;
        const targetFinalAlign = target.alignment || 0;
        const shiftAmount = Math.max(1, Math.floor(Math.abs(targetFinalAlign) * 0.01));

        if (myFinalAlign >= 0 && targetFinalAlign < 0) {
            alignmentShiftMsg = `<span style="color:#27ae60;">🌟 +${shiftAmount}к Светлой стороне!</span>`;
        } else if (myFinalAlign >= 0 && targetFinalAlign >= 0) {
            alignmentShiftMsg = `<span style="color:#e74c3c;">🔴 ${-shiftAmount}к Темной стороне! (Нападение на своих/мирных)</span>`;
        } else if (myFinalAlign < 0 && targetFinalAlign >= 0) {
            alignmentShiftMsg = `<span style="color:#e74c3c;">🔴 ${-shiftAmount}к Темной стороне!</span>`;
        } else if (myFinalAlign < 0 && targetFinalAlign < 0) {
            alignmentShiftMsg = `<span style="color:#e74c3c;">🔴 ${-shiftAmount}к Темной стороне! (Путь Ситха)</span>`;
        }

        pvpMonster.alignmentShiftMsg = alignmentShiftMsg;
        pvpMonster._calculatedShift = shiftAmount;

        // Write combat lock for both attacker and defender
        const lockObj = JSON.stringify({ attacker: playerSelf.name, defender: targetBotName, ts: Date.now() });
        try {
            localStorage.setItem(`sw_pvp_combat_lock_${playerSelf.name}`, lockObj);
            localStorage.setItem(`sw_pvp_combat_lock_${targetBotName}`, lockObj);
        } catch(e) {}

        pvpMonster.onCombatEndImmediate = (result, damageTakenByDefender) => {
            this.resolveCombatEnd(playerSelf, targetId, result, damageTakenByDefender, stolenAmount, pvpMonster);
        };

        combatScreen.startCombat(pvpMonster, () => {
            if (window.gameInstance) {
                window.gameInstance.screenManager.showScreen('maps-screen');
                window.gameInstance.mapScreen.render();
            }
        }, 'pvp');
    }

    static resolveCombatEnd(playerSelf, targetId, result, damageTakenByDefender, stolenAmount, pvpMonster) {
        const targetBotName = targetId.startsWith('real_') ? targetId.slice(5) : (pvpMonster ? pvpMonster.name : '');

        // Remove combat locks
        localStorage.removeItem(`sw_pvp_combat_lock_${playerSelf.name}`);
        if (targetBotName) {
            localStorage.removeItem(`sw_pvp_combat_lock_${targetBotName}`);
        }

        if (window.gameInstance && result === 'victory' && pvpMonster) {
            const shift = pvpMonster._calculatedShift || 0;
            if (pvpMonster.alignmentShiftMsg && pvpMonster.alignmentShiftMsg.includes('Светлой')) {
                playerSelf.modifyAlignment(shift);
            } else if (pvpMonster.alignmentShiftMsg && pvpMonster.alignmentShiftMsg.includes('Темной')) {
                playerSelf.modifyAlignment(-shift);
            }
        }

        // --- Network PvP Result Handling ---
        // If we have a network manager and the target is a real player (has UUID in ID or special flag)
        // We assume IDs starting with 'real_' but containing a UUID-like string are network players.
        // Actually, PlayerModal passes the full ID (UUID) for network players.
        // Let's assume if playerSelf.networkMgr exists, we try to send.
        
        if (playerSelf.networkMgr) {
             const resultData = {
                 attacker: playerSelf.name,
                 result: result === 'victory' ? 'defeat' : 'victory', // If I won, they lost
                 stolen: result === 'victory' ? stolenAmount : 0,
                 hpLost: damageTakenByDefender,
                 message: result === 'victory' 
                    ? `⚔️ На вас напал ${playerSelf.name} и победил! Вы потеряли ${damageTakenByDefender} HP.` 
                    : `🛡️ Вы отбили нападение ${playerSelf.name}! Вы потеряли ${damageTakenByDefender} HP.`,
                 ts: Date.now()
             };
             // Send to the target's ID (which is targetId passed from PlayerModal)
             playerSelf.networkMgr.sendCombatResult(targetId, resultData);
        }

        if (result === 'victory') {
            let actualStolen = stolenAmount;
            // Legacy LocalStorage Logic (for multi-tab testing without server)
            if (targetId.startsWith('real_') && !playerSelf.networkMgr) {
                try {
                    const pName = targetId.slice(5);
                    const raw = localStorage.getItem(`sw_player_save_${pName}`);
                    if (raw) {
                        const pData = JSON.parse(raw);
                        actualStolen = Math.min(stolenAmount, pData.money || 0);
                        pData.money = Math.max(0, (pData.money || 0) - actualStolen);
                        // Subtract damage taken during combat from current HP (to preserve background regen)
                        pData.hp = Math.max(0, (pData.hp || 100) - damageTakenByDefender);
                        //Сохраняем израсходованную Силу
                        if (pvpMonster && pvpMonster.canUseForce) {
                            pData.forcePoints = Math.max(0, pvpMonster.forcePoints);
                        }
                        localStorage.setItem(`sw_player_save_${pName}`, JSON.stringify(pData));

                        localStorage.setItem(`sw_pvp_notify_${pName}`, JSON.stringify({
                            attacker: playerSelf.name,
                            stolen: actualStolen,
                            hpLost: damageTakenByDefender,
                            message: `⚔️ На вас напал ${playerSelf.name} и победил! Вы потеряли ${actualStolen.toLocaleString()} кр. и ${damageTakenByDefender} HP.`,
                            ts: Date.now()
                        }));
                        setTimeout(() => localStorage.removeItem(`sw_pvp_notify_${pName}`), 3000);
                    }
                } catch (e) { /* ignore */ }
            }

            //Начисляем действительную сумму игроку после окончательного расчета!
            if (actualStolen > 0) {
                playerSelf.money += actualStolen;
            }
            if (playerSelf.save) playerSelf.save();
            if (playerSelf.updateQuestProgress) playerSelf.updateQuestProgress('pvp_win', null, 1);

            const shiftMsg = (pvpMonster && pvpMonster.alignmentShiftMsg) ? ' ' + pvpMonster.alignmentShiftMsg.replace('<br>', ' ') : '';
            Notifications.show(`⚔️ PvP Победа! Украдено ${actualStolen.toLocaleString()} кр.${shiftMsg}`, 'success');
        } else if (result === 'defeat') {
            // Defender won
            // Legacy LocalStorage Logic
            if (targetId.startsWith('real_') && !playerSelf.networkMgr) {
                try {
                    const pName = targetId.slice(5);
                    const raw = localStorage.getItem(`sw_player_save_${pName}`);
                    if (raw) {
                        const pData = JSON.parse(raw);
                        pData.hp = Math.max(0, (pData.hp || 100) - damageTakenByDefender);
                        if (pvpMonster && pvpMonster.canUseForce) {
                            pData.forcePoints = pvpMonster.forcePoints;
                        }
                        localStorage.setItem(`sw_player_save_${pName}`, JSON.stringify(pData));

                        localStorage.setItem(`sw_pvp_notify_${pName}`, JSON.stringify({
                            attacker: playerSelf.name,
                            stolen: 0,
                            hpLost: damageTakenByDefender,
                            message: `🛡️ Вы отбили нападение${playerSelf.name}! Вы потеряли${damageTakenByDefender}HP в бою.`,
                            ts: Date.now()
                        }));
                        setTimeout(() => localStorage.removeItem(`sw_pvp_notify_${pName}`), 3000);
                    }
                } catch (e) { /* ignore */ }
            }
        }
    }

    static doRob(playerSelf, targetId, onSuccess, onError) {
        const pName = targetId.startsWith('real_') ? targetId.slice(5) : targetId;
        
        if (pName === playerSelf.name) {
            if(onError) onError('❌ Вы не можете ограбить самого себя!');
            return;
        }

        const cooldownKey = `sw_rob_cooldown_real_${pName}_by_${playerSelf.name}`;
            const lastRob = parseInt(localStorage.getItem(cooldownKey) || '0', 10);
            const cooldownMs = 12 * 60 * 60 * 1000;
            const now = Date.now();

            if (now - lastRob < cooldownMs) {
                const msLeft = cooldownMs - (now - lastRob);
                const hLeft = Math.floor(msLeft / 3600000);
                const mLeft = Math.floor((msLeft % 3600000) / 60000);
                if(onError) onError(`⏳ Кулдаун! Можно повторить через${hLeft}год${mLeft}мин.`);
                return;
            }

            const raw = localStorage.getItem(`sw_player_save_${pName}`);
            if (!raw) {
                if(onError) onError('❌ Игрок не найден.');
                return;
            }

            const pData = JSON.parse(raw);

            if (pData.locationId && playerSelf.locationId && pData.locationId !== playerSelf.locationId) {
                if(onError) onError('⚠️ Вы слишком далеко! Игрок нет в вашей текущей зоне.');
                return;
            }

            if (pData.hp !== undefined && pData.hp <= 0) {
                if(onError) onError('❌ Игрок уже без сознания, там нечего брать.');
                return;
            }

            // Set cooldown BEFORE random chance or money check, to prevent spamming
            try { localStorage.setItem(cooldownKey, String(now)); } catch(e) {}

            if (Math.random() > 0.35) {
                if(onError) onError(`👀 Неудача!${pName}заметил вашу руку.`);
                return;
            }

            try {
                if (!pData.money || pData.money <= 0) {
                    if(onError) onError(`❌ У игрока ${pName} пустые карманы!`);
                    return;
                }

                const stolen = Math.floor(pData.money * 0.45);
                
                if (stolen <= 0) {
                    if(onError) onError(`❌ У игрока ${pName} слишком мало кредитов для кражи!`);
                    return;
                }

                pData.money = Math.max(0, pData.money - stolen);
                localStorage.setItem(`sw_player_save_${pName}`, JSON.stringify(pData));

                localStorage.setItem(`sw_pvp_notify_${pName}`, JSON.stringify({
                    attacker: playerSelf.name,
                    stolen: stolen,
                    hpLost: 0,
                    isRobbery: true,
                    ts: Date.now()
                }));
                setTimeout(() => localStorage.removeItem(`sw_pvp_notify_${pName}`), 3000);

                playerSelf.money += stolen;
                if (typeof playerSelf.save === 'function') playerSelf.save();
                
                Notifications.show(`Ограбление! +${stolen.toLocaleString()} кр.`, 'success');
                if(onSuccess) onSuccess(`🎭 УСПЕХ! украдено ${stolen.toLocaleString()} кр. у ${pName}!`, targetId);
            } catch (e) {
                if(onError) onError('❌ Ошибка при грабеже.');
            }
    }
}
