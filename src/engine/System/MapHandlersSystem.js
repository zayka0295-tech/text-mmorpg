export class MapHandlersSystem {
    constructor(player, screenManager) {
        this.player = player;
        this.screenManager = screenManager;
        this.handlers = new Map();
        this.setupHandlers();
    }

    /**
     * Налаштовує всі обробники подій карти
     */
    setupHandlers() {
        // Обробники навігації
        this.handlers.set('navigation', {
            moveToLocation: (targetId) => this.handleMoveToLocation(targetId),
            checkMovementRestrictions: () => this.checkMovementRestrictions(),
            handlePvPLock: () => this.handlePvPLock()
        });

        // Обробники дій локаций
        this.handlers.set('locationActions', {
            openMarket: (locationId) => this.handleOpenMarket(locationId),
            openBank: (locationId) => this.handleOpenBank(locationId),
            openJobs: () => this.handleOpenJobs(),
            openShipMarket: (locationId) => this.handleOpenShipMarket(locationId),
            searchGarbage: (callback) => this.handleSearchGarbage(callback),
            interactWithBartender: () => this.handleInteractWithBartender(),
            searchCrystals: (callback, combatCallback) => this.handleSearchCrystals(callback, combatCallback),
            excavateTomb: (callback) => this.handleExcavateTomb(callback),
            meditate: () => this.handleMeditate(),
            sithMeditate: () => this.handleSithMeditate(),
            useHolocron: () => this.handleUseHolocron(),
            decodeSithHolocron: () => this.handleDecodeSithHolocron(),
            exchangeCrystal: () => this.handleExchangeCrystal()
        });

        // Обробники бойових дій
        this.handlers.set('combat', {
            attackMonster: (monsterData) => this.handleAttackMonster(monsterData),
            startCombat: (monsterData, callback) => this.handleStartCombat(monsterData, callback)
        });

        // Обробники взаємодії з гравцями
        this.handlers.set('playerInteraction', {
            showPlayerCard: (playerName) => this.handleShowPlayerCard(playerName),
            attackPlayer: (playerName) => this.handleAttackPlayer(playerName)
        });
    }

    /**
     * Обробляє переміщення між локаціями
     */
    handleMoveToLocation(targetId) {
        // Перевірка обмежень
        if (!this.checkMovementRestrictions()) {
            return false;
        }

        // Перевірка PvP блокування
        if (this.handlePvPLock()) {
            return false;
        }

        // Перевірка активної роботи
        if (this.player.activeJob && this.player.jobEndTime > Date.now()) {
            Notifications.show('Вы на работе! Дождитесь окончания или разорвите контракт.', 'error');
            return false;
        }

        // Перевірка стану пошуку
        if (this.isSearching() || this.isInCombat()) {
            return false;
        }

        // Перевірка медитації
        if (this.isMeditating()) {
            return false;
        }

        // Виконання переміщення
        this.player.locationId = targetId;
        this.player.save();
        
        // Сповіщення про переміщення
        this.emitLocationChangeEvent(targetId);
        
        return true;
    }

    /**
     * Перевіряє обмеження переміщення
     */
    checkMovementRestrictions() {
        // Блокування під час бою
        if (this.isInCombat()) {
            Notifications.show('Нельзя перемещаться во время боя!', 'error');
            return false;
        }

        // Блокування під час пошуку
        if (this.isSearching()) {
            Notifications.show('Нельзя перемещаться во время поиска!', 'error');
            return false;
        }

        // Блокування під час медитації
        if (this.isMeditating()) {
            Notifications.show('Нельзя перемещаться во время медитации!', 'error');
            return false;
        }

        return true;
    }

    /**
     * Обробляє PvP блокування
     */
    handlePvPLock() {
        const pvpLockKey = `sw_pvp_combat_lock_${this.player.name}`;
        const rawLock = localStorage.getItem(pvpLockKey);
        
        if (rawLock) {
            try {
                const lock = JSON.parse(rawLock);
                const age = Date.now() - (lock.ts || 0);
                
                if (age < 10 * 60 * 1000) { // 10 хвилин
                    Notifications.show(`⚔️ На вас накинув ${lock.attacker || 'игрок'}! Нельзя перемещаться во время боев PvP.`, 'error');
                    return true;
                } else {
                    localStorage.removeItem(pvpLockKey); // Застарілий лок - очищуємо
                }
            } catch { 
                localStorage.removeItem(pvpLockKey); 
            }
        }
        
        return false;
    }

    /**
     * Обробляє відкриття ринку
     */
    handleOpenMarket(locationId) {
        if (window.gameInstance?.marketScreen) {
            window.gameInstance.marketScreen.openMarket(locationId);
        }
    }

    /**
     * Обробляє відкриття банку
     */
    handleOpenBank(locationId) {
        if (window.gameInstance?.bankScreen) {
            window.gameInstance.bankScreen.openBank(locationId);
        }
    }

    /**
     * Обробляє відкриття біржі праці
     */
    handleOpenJobs() {
        if (window.gameInstance?.jobScreen) {
            this.screenManager.showScreen('job-screen');
        }
    }

    /**
     * Обробляє відкриття ринку кораблів
     */
    handleOpenShipMarket(locationId) {
        if (window.gameInstance?.shipMarketScreen) {
            window.gameInstance.shipMarketScreen.openShipMarket(locationId);
        }
    }

    /**
     * Обробляє пошук у смітті
     */
    handleSearchGarbage(callback) {
        if (this.isSearching()) {
            Notifications.show('Вы уже что-то ищете!', 'error');
            return;
        }

        // Викликаємо garbageHandler
        if (window.gameInstance?.mapScreen?.garbageHandler) {
            window.gameInstance.mapScreen.garbageHandler.handleGarbageSearch(callback);
        }
    }

    /**
     * Обробляє взаємодію з барменом
     */
    handleInteractWithBartender() {
        import('../ui/modals/BartenderModal.js').then(module => {
            new module.BartenderModal(this.player, () => {
                if (window.gameInstance?.mapScreen) {
                    window.gameInstance.mapScreen.render();
                }
            }).show();
        });
    }

    /**
     * Обробляє пошук кристалів
     */
    handleSearchCrystals(callback, combatCallback) {
        if (this.isSearching()) {
            Notifications.show('Вы уже что-то ищете!', 'error');
            return;
        }

        if (window.gameInstance?.mapScreen?.crystalHandler) {
            window.gameInstance.mapScreen.crystalHandler.startCrystalSearch(callback, combatCallback);
        }
    }

    /**
     * Обробляє розкопки гробниці
     */
    handleExcavateTomb(callback) {
        if (this.isSearching()) {
            Notifications.show('Вы уже что-то ищете!', 'error');
            return;
        }

        if (window.gameInstance?.mapScreen?.tombHandler) {
            window.gameInstance.mapScreen.tombHandler.startTombExcavation(callback);
        }
    }

    /**
     * Обробляє медитацію
     */
    handleMeditate() {
        if (window.gameInstance?.mapScreen?.meditationHandler) {
            window.gameInstance.mapScreen.meditationHandler.handleMeditation();
        }
    }

    /**
     * Обробляє медитацію Ситха
     */
    handleSithMeditate() {
        if (window.gameInstance?.mapScreen?.sithMeditationHandler) {
            window.gameInstance.mapScreen.sithMeditationHandler.handleMeditation();
        }
    }

    /**
     * Обробляє використання голокрона
     */
    handleUseHolocron() {
        if (window.gameInstance?.mapScreen?.holocronHandler) {
            window.gameInstance.mapScreen.holocronHandler.handleLibraryHolocron();
        }
    }

    /**
     * Обробляє декодування голокрона Ситха
     */
    handleDecodeSithHolocron() {
        if (window.gameInstance?.mapScreen?.sithHolocronHandler) {
            window.gameInstance.mapScreen.sithHolocronHandler.handleLibraryHolocron();
        }
    }

    /**
     * Обробляє обмін кристалів
     */
    handleExchangeCrystal() {
        if (window.gameInstance?.mapScreen?.crystalHandler) {
            window.gameInstance.mapScreen.crystalHandler.handleCrystalExchange();
        }
    }

    /**
     * Обробляє атаку монстра
     */
    handleAttackMonster(monsterData) {
        if (this.isInCombat()) {
            Notifications.show('Вы уже в бою!', 'error');
            return;
        }

        // Перевірка кулдауну
        if (this.isMonsterOnCooldown(monsterData.id)) {
            Notifications.show('Этот монстр еще не возродился!', 'error');
            return;
        }

        // Початок бою
        this.startCombatWithMonster(monsterData);
    }

    /**
     * Обробляє початок бою
     */
    handleStartCombat(monsterData, callback) {
        if (window.gameInstance?.combatScreen) {
            window.gameInstance.combatScreen.startCombat(monsterData, callback);
        }
    }

    /**
     * Обробляє показ картки гравця
     */
    handleShowPlayerCard(playerName) {
        if (window.gameInstance?.playerModal) {
            window.gameInstance.playerModal.showPlayerCard(playerName);
        }
    }

    /**
     * Обробляє атаку гравця
     */
    handleAttackPlayer(playerName) {
        // Логіка PvP атаки
        if (window.gameInstance?.pvpManager) {
            window.gameInstance.pvpManager.initiatePvPCombat(this.player.name, playerName);
        }
    }

    /**
     * Перевіряє, чи гравець в бою
     */
    isInCombat() {
        return window.gameInstance?.combatScreen?.monster || false;
    }

    /**
     * Перевіряє, чи гравець щось шукає
     */
    isSearching() {
        return window.gameInstance?.mapScreen?.isSearching || false;
    }

    /**
     * Перевіряє, чи гравець медитує
     */
    isMeditating() {
        return window.gameInstance?.mapScreen?.meditationHandler?.isMeditating || false;
    }

    /**
     * Перевіряє кулдаун монстра
     */
    isMonsterOnCooldown(monsterId) {
        const cooldownsKey = `sw_monster_cooldowns_${this.player.name}`;
        let cooldowns = {};
        
        try { 
            cooldowns = JSON.parse(localStorage.getItem(cooldownsKey) || '{}'); 
        } catch (e) {}

        const now = Date.now();
        const lastDefeat = cooldowns[monsterId] || 0;
        
        // Налаштування кулдаунів
        const getCooldownMs = (id) => {
            if (id === 'rogue_droid') return 1 * 60 * 1000; // 1 хвилина
            return 5 * 60 * 1000; // 5 хвилин
        };

        const COOLDOWN_MS = getCooldownMs(monsterId);
        return (now - lastDefeat) < COOLDOWN_MS;
    }

    /**
     * Починає бій з монстром
     */
    startCombatWithMonster(monsterData) {
        const monster = typeof monsterData === 'string' 
            ? JSON.parse(monsterData) 
            : monsterData;

        if (window.gameInstance?.combatScreen) {
            window.gameInstance.combatScreen.startCombat(monster, () => {
                // Повернення на карту після бою
                this.screenManager.showScreen('maps-screen');
            });
        }
    }

    /**
     * Викликає подію зміни локації
     */
    emitLocationChangeEvent(targetId) {
        document.dispatchEvent(new CustomEvent('game:location-changed', {
            detail: { 
                from: this.player.locationId, 
                to: targetId,
                player: this.player 
            }
        }));
    }

    /**
     * Отримує обробник за типом
     */
    getHandler(type) {
        return this.handlers.get(type);
    }

    /**
     * Виконує обробник
     */
    executeHandler(type, method, ...args) {
        const handler = this.getHandler(type);
        if (handler && handler[method]) {
            return handler[method](...args);
        }
        return null;
    }

    /**
     * Очищує всі обробники
     */
    clear() {
        this.handlers.clear();
    }
}
