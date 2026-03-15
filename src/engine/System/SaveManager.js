import { QuestGenerator } from './QuestGenerator.js';

const SAVE_META_KEY = 'sw_save_meta';

export class SaveManager {
    /**
     * @param {import('../Entities/Player.js').Player} player
     * @param {Function} onQuestsReset - callback fired when daily quests are reset
     * @param {Function} [onSave]      - callback fired after every save (receives Date); used by UI to update save-status display
     */
    constructor(player, onQuestsReset, onSave = null) {
        this.player = player;
        this.onQuestsReset = onQuestsReset;
        this.onSave = onSave;
        this.autosaveInterval = null;
        this.questTimerInterval = null;
    }

    //--- Сохранение / Загрузка ---

    save() {
        this.player.save();
        const meta = {
            lastSaveTime: Date.now(),
            questsResetAt: this._getMeta().questsResetAt || Date.now()
        };
        try { localStorage.setItem(SAVE_META_KEY, JSON.stringify(meta)); } catch(e) { console.warn('Save failed', e); }
        // Notify UI layer about the save (SoC: engine must not touch the DOM directly)
        if (this.onSave) this.onSave(new Date());
    }

    load() {
        this.player.load();
        this._checkQuestReset();
    }

    deleteSave() {
        localStorage.removeItem(`sw_player_save_${this.player.name}`);
        localStorage.removeItem(SAVE_META_KEY);
    }

    hasSave() {
        return !!localStorage.getItem(`sw_player_save_${this.player.name}`);
    }

    getLastSaveTime() {
        const meta = this._getMeta();
        return meta.lastSaveTime ? new Date(meta.lastSaveTime) : null;
    }

    //--- Автосохранение ---

    startAutosave(intervalMs = 10000) {
        this.stopAutosave();
        this.autosaveInterval = setInterval(() => {
            this.save();
        }, intervalMs);
    }

    stopAutosave() {
        if (this.autosaveInterval) {
            clearInterval(this.autosaveInterval);
            this.autosaveInterval = null;
        }
    }

    //--- Таймер ежедневных квестов ---

    startQuestTimer() {
        this.stopQuestTimer();
        //Проверяем каждую минуту
        this.questTimerInterval = setInterval(() => {
            this._checkQuestReset();
        }, 60 * 1000);
    }

    stopQuestTimer() {
        if (this.questTimerInterval) {
            clearInterval(this.questTimerInterval);
            this.questTimerInterval = null;
        }
    }

    getTimeUntilQuestReset() {
        const meta = this._getMeta();
        if (!meta.questsResetAt) return null;

        const resetAt = meta.questsResetAt;
        const nextReset = resetAt + 24 * 60 * 60 * 1000;
        const msLeft = nextReset - Date.now();

        if (msLeft <= 0) return { h: 0, m: 0, s: 0 };

        const h = Math.floor(msLeft / (1000 * 60 * 60));
        const m = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((msLeft % (1000 * 60)) / 1000);

        return { h, m, s };
    }

    //--- Частные методы ---

    _getMeta() {
        try {
            const raw = localStorage.getItem(SAVE_META_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    }

    _checkQuestReset() {
        const meta = this._getMeta();

        if (!meta.questsResetAt) {
            //Первый раз - ставим время сейчас
            this._setQuestsResetAt(Date.now());
            return;
        }

        const elapsed = Date.now() - meta.questsResetAt;
        const oneDayMs = 24 * 60 * 60 * 1000;

        if (elapsed >= oneDayMs) {
            this._resetDailyQuests();
        }
    }

    _resetDailyQuests() {
        this.player.dailyQuests = QuestGenerator.generateDailyQuests();
        this._setQuestsResetAt(Date.now());
        this.save();

        if (this.onQuestsReset) {
            this.onQuestsReset();
        }
    }

    _setQuestsResetAt(timestamp) {
        const meta = this._getMeta();
        meta.questsResetAt = timestamp;
        try { localStorage.setItem(SAVE_META_KEY, JSON.stringify(meta)); } catch(e) {}
    }

}

