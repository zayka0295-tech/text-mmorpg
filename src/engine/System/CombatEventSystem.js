export class CombatEventSystem {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * Підписується на подію бою
     */
    on(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType).push(callback);
    }

    /**
     * Відписується від події бою
     */
    off(eventType, callback) {
        if (!this.listeners.has(eventType)) return;
        
        const callbacks = this.listeners.get(eventType);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * Викликає подію бою
     */
    emit(eventType, data) {
        if (!this.listeners.has(eventType)) return;
        
        this.listeners.get(eventType).forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in combat event listener for ${eventType}:`, error);
            }
        });
    }

    /**
     * Події бою
     */
    static EVENTS = {
        COMBAT_START: 'combat:start',
        COMBAT_END: 'combat:end',
        TURN_START: 'turn:start',
        TURN_END: 'turn:end',
        ATTACK: 'combat:attack',
        DAMAGE_DEALT: 'combat:damage-dealt',
        HEAL: 'combat:heal',
        FORCE_USED: 'combat:force-used',
        CRITICAL_HIT: 'combat:critical',
        MISS: 'combat:miss',
        DODGE: 'combat:dodge',
        STUN: 'combat:stun',
        BUFF_APPLIED: 'combat:buff-applied',
        BUFF_REMOVED: 'combat:buff-removed',
        LEVEL_UP: 'combat:level-up',
        ITEM_USED: 'combat:item-used',
        FLEE: 'combat:flee',
        VICTORY: 'combat:victory',
        DEFEAT: 'combat:defeat'
    };
}
