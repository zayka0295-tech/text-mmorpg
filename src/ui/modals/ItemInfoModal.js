import { getItemData } from '../../engine/Data/items.js';
import { Notifications } from '../Notifications.js';

export class ItemInfoModal {
    constructor(player, onActionCallback) {
        this.player = player;
        this.onActionCallback = onActionCallback;
        this._pane = null;
        this._content = null;
    }

    renderHTML() {
        return `
            <div id="item-details-pane" class="item-details-pane" style="display: none; position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:1000; align-items:center; justify-content:center;">
                <div class="details-content" id="details-content" style="background:#1a1a1a; border:1px solid #444; padding:20px; border-radius:10px; max-width: 90%; min-width:300px; color:white; overflow-y: auto; max-height: 90%;">
                </div>
            </div>
        `;
    }

    hide() {
        if (this._pane) this._pane.style.display = 'none';
    }

    show(container, itemObj, actionType, slotName = null) {
        this._pane = container.querySelector('#item-details-pane');
        this._content = container.querySelector('#details-content');
        
        if (!this._pane || !this._content) return;

        this._populate(itemObj, actionType, slotName);
        this._pane.style.display = 'flex';
    }

    _populate(itemObj, actionType, slotName) {
        const data = getItemData(itemObj.id, this.player);

        let statsHtml = '';
        if (data.stats) {
            if (data.stats.attack) statsHtml += `<div class="stat-row">⚔️ ${'ущерб'}: <span class="stat-val positive">+${data.stats.attack}</span></div>`;
            if (data.stats.defense) statsHtml += `<div class="stat-row">🛡️ ${'Броня'}: <span class="stat-val positive">+${data.stats.defense}</span></div>`;
            if (data.stats.maxHp) statsHtml += `<div class="stat-row">❤️ Здоровье: <span class="stat-val positive">+${data.stats.maxHp}</span></div>`;
            if (data.stats.critChance) statsHtml += `<div class="stat-row">🎯 ${'Крит'}: <span class="stat-val positive">+${data.stats.critChance}%</span></div>`;
        }

        if (data.heal) {
            statsHtml += `<div class="stat-row">💉 ${'Лечение'}: <span class="stat-val positive">+${data.heal}</span></div>`;
        }

        let alignHtml = '';
        if (data.reqAlignment === 'light') alignHtml = `<div style="color:#2980b9; font-size:10px; font-weight:bold; margin-bottom:5px;">[${'ТРЕБОВАНИЕ: СВЕТЛАЯ СТОРОНА'}]</div>`;
        if (data.reqAlignment === 'dark') alignHtml = `<div style="color:#e74c3c; font-size:10px; font-weight:bold; margin-bottom:5px;">[${'ТРЕБОВАНИЕ: ТЁМНАЯ СТОРОНА'}]</div>`;

        let actionButtonHtml = '';
        if (actionType === 'equip') {
            actionButtonHtml = `<button class="details-btn primary btn-pane-action" style="padding: 10px; background: #27ae60; color: white; border: none; cursor: pointer; width:100%; font-weight:bold;" data-action="equip" data-id="${data.id}" data-index="${itemObj._index}">${'НАДЕТЬ'}</button>`;
        } else if (actionType === 'unequip') {
            actionButtonHtml = `<button class="details-btn sell btn-pane-action" style="padding: 10px; background: #e74c3c; color: white; border: none; cursor: pointer; width:100%; font-weight:bold;" data-action="unequip" data-slot="${slotName}">${'СНЯТ'}</button>`;
        } else if (actionType === 'use') {
            actionButtonHtml = `<button class="details-btn primary btn-pane-action" style="padding: 10px; background: #3498db; color: white; border: none; cursor: pointer; width:100%; font-weight:bold;" data-action="use" data-id="${data.id}" data-index="${itemObj._index}">${'ИСПОЛЬЗОВАТЬ'}</button>`;
            
            // Если это аптечка и у игрока больше 1 штуки, добавляем кнопку "Исцелить полностью"
            if (data.heal && itemObj.amount > 1) {
                actionButtonHtml += `<button class="details-btn btn-full-heal" style="padding: 10px; background: #27ae60; color: white; border: none; cursor: pointer; width:100%; font-weight:bold; margin-top: 10px;" data-id="${data.id}">${'ИСЦЕЛИТЬ ПОЛНОСТЬЮ'} ✨</button>`;
            }
        }

        //Проверка на возможность крафта светового меча
        if (['lightsaber_hilt', 'lightsaber_casing', 'kyber_crystal_green', 'kyber_crystal_blue', 'kyber_crystal_purple', 'kyber_crystal_yellow', 'kyber_crystal_red'].includes(itemObj.id)) {
             const hasHilt = this.player.inventory.some(i => i.id === 'lightsaber_hilt');
             const hasCasing = this.player.inventory.some(i => i.id === 'lightsaber_casing');
             
             const isJediCrafter = ['Юнлинг', 'Падаван', 'Джедай'].includes(this.player.title);
             const isSithCrafter = ['Претендент', 'Аколит', 'Ситх'].includes(this.player.title);
             
             const jediCrystals = this.player.inventory.filter(i => ['kyber_crystal_green', 'kyber_crystal_blue', 'kyber_crystal_purple', 'kyber_crystal_yellow'].includes(i.id));
             const sithCrystals = this.player.inventory.filter(i => i.id === 'kyber_crystal_red');
             
             let hasValidCrystal = false;
             let canCraft = false;
             let reqText = '';
             let reqMet = false;

             if (isSithCrafter) {
                hasValidCrystal = sithCrystals.length > 0;
                canCraft = hasHilt && hasCasing && hasValidCrystal;
                reqText = 'Претендент';
                reqMet = true;
             } else if (isJediCrafter) {
                hasValidCrystal = jediCrystals.length > 0;
                canCraft = hasHilt && hasCasing && hasValidCrystal;
                reqText = 'Юнлинг';
                reqMet = true;
             } else {
                reqText = 'Юнлинг / Претендент';
                reqMet = false;
                hasValidCrystal = jediCrystals.length > 0 || sithCrystals.length > 0;
             }

             actionButtonHtml += `<div style="margin-top: 15px; width: 100%; border-top: 1px solid #333; padding-top: 10px;">
                <div style="font-size: 12px; color: #aaa; margin-bottom: 5px;">${'Создание Светового Меча'}:</div>
                <div style="display: flex; gap: 5px; justify-content: center; margin-bottom: 5px;">
                    <span style="color: ${hasHilt ? '#2ecc71' : '#e74c3c'}">${hasHilt ? '✔' : '✖'}Рукоятка</span>
                    <span style="color:${hasCasing ? '#2ecc71' : '#e74c3c'}">${hasCasing ? '✔' : '✖'}Корпус</span>
                    <span style="color:${hasValidCrystal ? '#2ecc71' : '#e74c3c'}">${hasValidCrystal ? '✔' : '✖'}Кристалл</span>
                </div>
                <div style="font-size: 11px; цвет:${reqMet ? '#3498db' : '#e74c3c'}; margin-bottom: 8px;">${reqMet ? '✔ ' + reqText : '✖ Требуется звание' + reqText}</div>
                <button class="details-btn btn-craft-lightsaber" data-id="${itemObj.id}" style="padding: 10px; background: ${canCraft ? '#f1c40f' : '#555'}; color: ${canCraft ? '#000' : '#888'}; border: none; cursor: ${canCraft ? 'pointer' : 'not-allowed'}; width:100%; font-weight:bold;" ${canCraft ? '' : 'disabled'}>${'СОБРАТЬ МЕЧ'} ⚡</button>
             </div>`;
        }

        //Проверка на возможность создания Холокрона Джедаев
        if (['jedi_holocron_shard_1', 'jedi_holocron_shard_2', 'jedi_holocron_shard_3'].includes(itemObj.id)) {
             const hasShard1 = this.player.inventory.some(i => i.id === 'jedi_holocron_shard_1');
             const hasShard2 = this.player.inventory.some(i => i.id === 'jedi_holocron_shard_2');
             const hasShard3 = this.player.inventory.some(i => i.id === 'jedi_holocron_shard_3');
             const isJedi = ['Джедай'].includes(this.player.title);
             
             const canCraftHolocron = hasShard1 && hasShard2 && hasShard3 && this.player.alignment >= 10 && isJedi;

             actionButtonHtml += `<div style="margin-top: 15px; width: 100%; border-top: 1px solid #333; padding-top: 10px;">
                <div style="font-size: 12px; color: #aaa; margin-bottom: 5px;">${'Создание Холокрона Джедаев <br/>(Требуется: Джедай, Свет > 10, все 3 фрагмента)'}:</div>
                <div style="display: flex; gap: 5px; justify-content: center; margin-bottom: 5px; font-size: 11px;">
                    <span style="color: ${hasShard1 ? '#3498db' : '#e74c3c'}">${hasShard1 ? '✔' : '✖'}Аджунта</span>
                    <span style="color:${hasShard2 ? '#3498db' : '#e74c3c'}">${hasShard2 ? '✔' : '✖'}Хорд</span>
                    <span style="color:${hasShard3 ? '#3498db' : '#e74c3c'}">${hasShard3 ? '✔' : '✖'}Рогнос</span>
                </div>
                <div style="font-size: 11px; цвет:${isJedi ? '#3498db' : '#e74c3c'}; margin-bottom: 8px;">${isJedi ? '✔ Джедай' : '✖ Требуется звание Джедай'}</div>
                <button class="details-btn btn-craft-holocron" style="padding: 10px; background: ${canCraftHolocron ? '#27ae60' : '#555'}; color: ${canCraftHolocron ? 'white' : '#888'}; border: none; cursor: ${canCraftHolocron ? 'pointer' : 'not-allowed'}; width:100%; font-weight:bold;" ${canCraftHolocron ? '' : 'disabled'}>${'СОБРАТЬ ГОЛОКРОН'} 🎛️</button>
             </div>`;
        }

        //Проверка на возможность создания Холокрона Ситхов
        if (['sith_holocron_shard_1', 'sith_holocron_shard_2', 'sith_holocron_shard_3'].includes(itemObj.id)) {
             const hasShard1 = this.player.inventory.some(i => i.id === 'sith_holocron_shard_1');
             const hasShard2 = this.player.inventory.some(i => i.id === 'sith_holocron_shard_2');
             const hasShard3 = this.player.inventory.some(i => i.id === 'sith_holocron_shard_3');
             const isSithCrafter = ['Претендент', 'Аколит', 'Ситх'].includes(this.player.title);
             
             const canCraftSithHolocron = hasShard1 && hasShard2 && hasShard3 && isSithCrafter;

             actionButtonHtml += `<div style="margin-top: 15px; width: 100%; border-top: 1px solid #333; padding-top: 10px;">
                <div style="font-size: 12px; color: #aaa; margin-bottom: 5px;">${'Создание Холокрона Ситхов <br/>(Требуется: Аколит+, все 3 фрагмента)'}:</div>
                <div style="display: flex; gap: 5px; justify-content: center; margin-bottom: 5px; font-size: 11px;">
                    <span style="color: ${hasShard1 ? '#e74c3c' : '#555'}">${hasShard1 ? '✔' : '✖'}Рогнос</span>
                    <span style="color:${hasShard2 ? '#e74c3c' : '#555'}">${hasShard2 ? '✔' : '✖'}Садоу</span>
                    <span style="color:${hasShard3 ? '#e74c3c' : '#555'}">${hasShard3 ? '✔' : '✖'}Кун</span>
                </div>
                <div style="font-size: 11px; цвет:${isSithRank ? '#e74c3c' : '#555'}; margin-bottom: 8px;">${isSithRank ? '✔ Аколит+' : '✖ Требуется звание Аколит или выше'}</div>
                <button class="details-btn btn-craft-sith-holocron" style="padding: 10px; background: ${canCraftSithHolocron ? '#c0392b' : '#555'}; color: ${canCraftSithHolocron ? 'white' : '#888'}; border: none; cursor: ${canCraftSithHolocron ? 'pointer' : 'not-allowed'}; width:100%; font-weight:bold;" ${canCraftSithHolocron ? '' : 'disabled'}>${'СОБРАТЬ ГОЛОКРОН СИТХОВ'} 🎛️</button>
             </div>`;
        }

        this._content.innerHTML = `
            <div class="details-header" style="display:flex; justify-content:space-between; align-items:center;">
                <h3 class="details-name item-rarity-${data.rarity || 'common'}" style="margin:0;">${(data?.name || '')}</h3>
                <button class="details-close btn-close-details" style="background:none; border:none; color:white; font-size:20px; cursor:pointer;">✖</button>
            </div>
            <hr style="border-color:#333; margin: 10px 0;">
            ${alignHtml}
            <div class="details-desc" style="font-style:italic; margin-bottom: 10px; color:#ccc;">"${(data?.description || '') || 'Обычный предмет.'}"</div>
            ${statsHtml ? `<div class="details-stats" style="margin-bottom: 15px;">${statsHtml}</div>` : ''}

            <div class="details-actions" style="display:flex; flex-direction: column; align-items:center; margin-top: 20px;">
                ${actionButtonHtml}
            </div>
        `;

        this._attachListeners();
    }

    _attachListeners() {
        const pane = this._pane;

        // Close on background click or close button
        pane.onclick = (e) => {
            if (e.target === pane || e.target.classList.contains('btn-close-details')) {
                this.hide();
            }
        };

        const craftBtn = pane.querySelector('.btn-craft-lightsaber');
        if (craftBtn) {
            craftBtn.addEventListener('click', () => {
                this._craftLightsaber(craftBtn.dataset.id);
            });
        }

        const holocronCraftBtn = pane.querySelector('.btn-craft-holocron');
        if (holocronCraftBtn) {
            holocronCraftBtn.addEventListener('click', () => {
                this._craftJediHolocron();
            });
        }

        const sithHolocronCraftBtn = pane.querySelector('.btn-craft-sith-holocron');
        if (sithHolocronCraftBtn) {
            sithHolocronCraftBtn.addEventListener('click', () => {
                this._craftSithHolocron();
            });
        }

        const actionBtn = pane.querySelector('.btn-pane-action');
        if (actionBtn) {
            actionBtn.addEventListener('click', (e) => {
                const action = e.target.getAttribute('data-action');

                if (action === 'equip') {
                    const itemId = e.target.getAttribute('data-id');
                    const equipResult = this.player.equipItem(itemId);
                    if (equipResult.success) {
                        this.player.save();
                        Notifications.show('Надето!', 'info');
                        this.hide();
                        if (this.onActionCallback) this.onActionCallback();
                    } else {
                        Notifications.show('Не удалось надеть', 'error');
                    }
                } else if (action === 'unequip') {
                    const slot = e.target.getAttribute('data-slot');
                    if (this.player.unequipItem(slot)) {
                        this.player.save();
                        Notifications.show('Предмет снят', 'info');
                        this.hide();
                        if (this.onActionCallback) this.onActionCallback();
                    }
                } else if (action === 'use') {
                    const itemId = e.target.getAttribute('data-id');
                    const itemDataObj = getItemData(itemId, this.player);

                    if (itemDataObj.isRepairKit) {
                         if (!this.player.ship) {
                             Notifications.show('У вас нет корабля для ремонта!', 'error');
                             return;
                         }
                         const shipData = getItemData(this.player.ship.id, this.player);
                         const maxHp = shipData?.stats?.maxHp || 100;
                         
                         if (this.player.ship.hp >= maxHp) {
                             Notifications.show('Корабль и так в идеальном состоянии!', 'warning');
                             return;
                         }

                         const invIndex = this.player.inventory.findIndex(i => i.id === itemId);
                         if (invIndex !== -1) {
                             if (this.player.inventory[invIndex].amount > 1) {
                                 this.player.inventory[invIndex].amount--;
                             } else {
                                 this.player.inventory.splice(invIndex, 1);
                             }
                         }

                         const repairAmt = Math.floor(maxHp * 0.5);
                         this.player.ship.hp = Math.min(maxHp, (this.player.ship.hp || 0) + repairAmt);
                         
                         const hpPercent = Math.round((this.player.ship.hp / maxHp) * 100);
                         Notifications.show(`Корабль отремонтирован на 50%. Состояние: ${this.player.ship.hp} / ${maxHp} (${hpPercent}%)`, 'success');

                         this.hide();
                         this.player.save();
                         if (this.onActionCallback) this.onActionCallback();
                         return;
                    }

                    if (this.player.hp >= this.player.maxHp) {
                        Notifications.show('Здоровье и так полно!', 'warning');
                        return;
                    }

                    const invIndex = this.player.inventory.findIndex(i => i.id === itemId);
                    if (invIndex !== -1) {
                        if (this.player.inventory[invIndex].amount > 1) {
                            this.player.inventory[invIndex].amount--;
                        } else {
                            this.player.inventory.splice(invIndex, 1);
                        }
                    }

                    const amountToHeal = itemDataObj.heal || 0;
                    let healed = 0;
                    if (amountToHeal === 'full') {
                        healed = this.player.maxHp - this.player.hp;
                        this.player.hp = this.player.maxHp;
                    } else {
                        healed = this.player.heal(amountToHeal);
                    }

                    // Если у предмета есть бафф, применяем его
                    if (itemDataObj.buff) {
                        this.player.addBuff(itemDataObj.buff.id, itemDataObj.buff.duration);
                    }

                    this.player.updateQuestProgress('use_medkit', null, 1);
                    Notifications.show(itemDataObj.buff ? `Вы использовали ${itemDataObj.name}!` : 'Восстановлен {hp} HP.'.replace("{hp}", healed), 'success');

                    this.hide();
                    this.player.save();
                    if (this.onActionCallback) this.onActionCallback();
                }
            });
        }

        const fullHealBtn = pane.querySelector('.btn-full-heal');
        if (fullHealBtn) {
            fullHealBtn.addEventListener('click', (e) => {
                const itemId = e.target.getAttribute('data-id');
                this._handleFullHeal(itemId);
            });
        }
    }

    _handleFullHeal(itemId) {
        const itemData = getItemData(itemId, this.player);
        if (!itemData || !itemData.heal) return;

        if (this.player.hp >= this.player.maxHp) {
            Notifications.show('Здоровье и так полно!', 'warning');
            return;
        }

        const invItem = this.player.inventory.find(i => i.id === itemId);
        if (!invItem) return;

        let totalHealed = 0;
        let usedCount = 0;

        while (this.player.hp < this.player.maxHp && invItem.amount > 0) {
            let healed = 0;
            if (itemData.heal === 'full') {
                healed = this.player.maxHp - this.player.hp;
                this.player.hp = this.player.maxHp;
            } else {
                healed = this.player.heal(itemData.heal);
            }
            totalHealed += healed;
            usedCount++;
            invItem.amount--;
            
            // Если у предмета есть бафф, применяем его при каждом использовании (хотя для full heal обычно 1 хватит)
            if (itemData.buff) {
                this.player.addBuff(itemData.buff.id, itemData.buff.duration);
            }

            if (invItem.amount === 0) {
                const idx = this.player.inventory.indexOf(invItem);
                this.player.inventory.splice(idx, 1);
            }
        }

        this.player.updateQuestProgress('use_medkit', null, usedCount);
        Notifications.show(itemData.buff ? `Использовано ${usedCount} шт. Эффект активирован!` : `Использовано ${usedCount} шт. Восстановлено ${totalHealed} HP. ✨`, 'success');
        
        this.hide();
        this.player.save();
        if (this.onActionCallback) this.onActionCallback();
    }

    _craftLightsaber(targetCrystalId) {
        const isJediCrafter = ['Юнлинг', 'Падаван', 'Джедай'].includes(this.player.title);
        const isSithCrafter = ['Претендент', 'Аколит', 'Ситх'].includes(this.player.title);

        if (!isJediCrafter && !isSithCrafter) {
            Notifications.show('Только Юнлинг/Претендент или выше может собрать световой меч!', 'error');
            return;
        }
        const hasHilt = this.player.inventory.some(i => i.id === 'lightsaber_hilt');
        const hasCasing = this.player.inventory.some(i => i.id === 'lightsaber_casing');
        
        let crystalToUse = null;
        if (targetCrystalId && targetCrystalId.startsWith('kyber_crystal_')) {
            crystalToUse = this.player.inventory.find(i => i.id === targetCrystalId);
        }

        if (!crystalToUse) {
            const jediCrystals = this.player.inventory.filter(i => ['kyber_crystal_green', 'kyber_crystal_blue', 'kyber_crystal_purple', 'kyber_crystal_yellow'].includes(i.id));
            const sithCrystals = this.player.inventory.filter(i => i.id === 'kyber_crystal_red');

            let crystals = [];
            if (isSithCrafter) {
                crystals = sithCrystals;
                if(sithCrystals.length === 0 && isJediCrafter) crystals = jediCrystals;
            } else if (isJediCrafter) {
                crystals = jediCrystals;
            }
            if (crystals.length > 0) {
                crystalToUse = crystals[0];
            }
        }

        if (!hasHilt || !hasCasing || !crystalToUse) {
            Notifications.show('Не хватает компонентов или правильного кристалла!', 'error');
            return;
        }
        
        const isRed = (crystalToUse.id === 'kyber_crystal_red');
        if (isRed && !isSithCrafter) {
            Notifications.show('Красный кристалл требует знания Темной Стороны (Претендент+)', 'error');
            return;
        }
        if (!isRed && !isJediCrafter) {
            Notifications.show('Этот цвет кристалла требует знания Светлой Стороны (Юнлинг+)', 'error');
            return;
        }

        const crystal = crystalToUse;
        let saberId = '';
        if (crystal.id === 'kyber_crystal_green') saberId = 'lightsaber_green';
        else if (crystal.id === 'kyber_crystal_blue') saberId = 'lightsaber_blue';
        else if (crystal.id === 'kyber_crystal_purple') saberId = 'lightsaber_purple';
        else if (crystal.id === 'kyber_crystal_yellow') saberId = 'lightsaber_yellow';
        else if (crystal.id === 'kyber_crystal_red') saberId = 'lightsaber_red';

        if (!saberId) {
            Notifications.show('Неизвестный тип кристалла!', 'error');
            return;
        }
        
        this.player.removeItem('lightsaber_hilt', 1);
        this.player.removeItem('lightsaber_casing', 1);
        this.player.removeItem(crystal.id, 1);

        this.player.addItem(saberId, 1);
        this.player.save();
        
        Notifications.show('Успех! Создан {name}!'.replace("{name}", getItemData(saberId, this.player).name), 'success');
        
        this.hide();
        if (this.onActionCallback) this.onActionCallback();
    }

    _craftJediHolocron() {
        const jediMasterTitles = ['Джедай'];
        if (!jediMasterTitles.includes(this.player.title)) {
            Notifications.show('Только Джедай может собрать Холокрон! Сначала получите звание Джедая.', 'error');
            return;
        }

        if (this.player.alignment < 10) {
            Notifications.show('Светлая Сторона должна быть >10!', 'error');
            return;
        }

        const hasShard1 = this.player.inventory.some(i => i.id === 'jedi_holocron_shard_1' && i.amount > 0);
        const hasShard2 = this.player.inventory.some(i => i.id === 'jedi_holocron_shard_2' && i.amount > 0);
        const hasShard3 = this.player.inventory.some(i => i.id === 'jedi_holocron_shard_3' && i.amount > 0);

        if (!hasShard1 || !hasShard2 || !hasShard3) {
            Notifications.show('Не хватает фрагментов!', 'error');
            return;
        }

        this.player.removeItem('jedi_holocron_shard_1', 1);
        this.player.removeItem('jedi_holocron_shard_2', 1);
        this.player.removeItem('jedi_holocron_shard_3', 1);
        
        this.player.addItem('jedi_holocron', 1);
        this.player.save();
        
        Notifications.show('✨ Вы успешно восстановили голокрон Джеда!', 'success');
        
        this.hide();
        if (this.onActionCallback) this.onActionCallback();
    }

    _craftSithHolocron() {
        const sithTitles = ['Ситх'];
        if (!sithTitles.includes(this.player.title)) {
            Notifications.show('Только истинный Ситх (Аколит+) может собрать этот холокрон.', 'error');
            return;
        }

        const hasShard1 = this.player.inventory.some(i => i.id === 'sith_holocron_shard_1' && i.amount > 0);
        const hasShard2 = this.player.inventory.some(i => i.id === 'sith_holocron_shard_2' && i.amount > 0);
        const hasShard3 = this.player.inventory.some(i => i.id === 'sith_holocron_shard_3' && i.amount > 0);

        if (!hasShard1 || !hasShard2 || !hasShard3) {
            Notifications.show('Не хватает фрагментов!', 'error');
            return;
        }

        this.player.removeItem('sith_holocron_shard_1', 1);
        this.player.removeItem('sith_holocron_shard_2', 1);
        this.player.removeItem('sith_holocron_shard_3', 1);
        
        this.player.addItem('sith_holocron', 1);
        this.player.save();
        
        Notifications.show('🔥 Вы восстановили мощный Холокрон Ситхов!', 'success');
        
        this.hide();
        if (this.onActionCallback) this.onActionCallback();
    }
}
