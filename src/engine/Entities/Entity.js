export class Entity {
    constructor(name, constitution = 10, strength = 10, agility = 10, intellect = 10, critChance = 2.5, critDamage = 1.5) {
        this.name = name;
        
        // Internal state
        this._constitution = constitution; 
        this._strength = strength;
        this._agility = agility;
        this._intellect = intellect;

        this._hp = this.maxHp;

        // Base stats
        this._attack = 0;
        this._defense = 0;
        this._critChance = critChance; // in percent (2.5 = 2.5%)
        this._critDamage = critDamage; // multiplier (1.5 = +50% to damage)
    }

    // --- Basic Getters & Setters ---
    get constitution() { return this._constitution; }
    set constitution(val) { this._constitution = val; }

    get strength() { return this._strength; }
    set strength(val) { this._strength = val; }

    get agility() { return this._agility; }
    set agility(val) { this._agility = val; }

    get intellect() { return this._intellect; }
    set intellect(val) { this._intellect = val; }

    get maxHp() { 
        if (this._maxHp !== undefined) return this._maxHp;
        return this.constitution * 15; 
    }
    set maxHp(val) { this._maxHp = val; }

    get attack() { return this._attack; }
    set attack(val) { this._attack = val; }

    get defense() { return this._defense; }
    set defense(val) { this._defense = val; }

    get critChance() { return this._critChance; }
    set critChance(val) { this._critChance = val; }

    get critDamage() { return this._critDamage; }
    set critDamage(val) { this._critDamage = val; }

    get hp() { return this._hp; }
    set hp(val) { this._hp = Math.max(0, Math.min(this.maxHp, val)); }

    isDead() {
        return this.hp <= 0;
    }

    takeDamage(amount) {
        const actualDamage = Math.max(0, amount); //Вред не может быть отрицательным
        this.hp = Math.max(0, this.hp - actualDamage);
        return actualDamage;
    }

    heal(amount) {
        const oldHp = this.hp;
        this.hp = Math.min(this.maxHp, this.hp + amount);
        return this.hp - oldHp; //Возвращаем, сколько реально вылечили
    }

    getFullStats() {
        return {
            name: this.name,
            hp: this.hp,
            maxHp: this.maxHp,
            attack: this.attack,
            defense: this.defense,
            critChance: this.critChance,
            critDamage: this.critDamage,
            constitution: this.constitution,
            strength: this.strength,
            agility: this.agility,
            intellect: this.intellect
        };
    }
}
