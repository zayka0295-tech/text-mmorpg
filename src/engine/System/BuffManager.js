export class BuffManager {
    constructor(player) {
        this.player = player;
    }

    addBuff(buffId, durationMs) {
        this.player.buffs[buffId] = Date.now() + durationMs;
        this.player.save();
    }

    hasBuff(buffId) {
        if (!this.player.buffs[buffId]) return false;
        if (Date.now() > this.player.buffs[buffId]) {
            delete this.player.buffs[buffId];
            this.player.save();
            return false;
        }
        return true;
    }

    getBuffTimeLeft(buffId) {
        if (!this.player.buffs[buffId]) return 0;
        return Math.max(0, this.player.buffs[buffId] - Date.now());
    }
}
