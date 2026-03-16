import { Entity } from "./Entity.js";
import { QuestGenerator } from "../System/QuestGenerator.js";

// Helper: fire a UI notification without importing the UI layer (SoC)
const notify = (msg, type) =>
  document.dispatchEvent(
    new CustomEvent("game:notification", { detail: { msg, type } }),
  );

export class Player extends Entity {
   constructor(name, race = null, className = null) {
     // Базовые статы передаем в Entity
     super(name, 10, 10, 10, 10, 2.5, 1.5);
     
     this.isInitialLoading = true; // Блокируем события во время инициализации
 
     this.race = race || "Человек";
     this.className = className || "Контрабандист";
     this.title = this.className; 
     this.avatar = "🧑🚀";
     this._alignment = 0;
     this.activeJob = null;
     this.jobEndTime = 0;
     this.viewingJobBoard = false;
     this.viewingBank = false;
 
     this._level = 1;
     this._xp = 0;
     this.nextLevelXp = 100;
     this._money = 0;
     this.bankBalance = 0;
     this._datarii = 0;
     this._locationId = "tatooine_spaceport";

     this.buffs = {}; 

     // Managers will be injected via injectManagers()
     this.inventoryMgr = null;
     this.jobMgr = null;
     this.buffMgr = null;
     this.forceMgr = null;
     this.questMgr = null;
     this.statsMgr = null;
     this.persistenceMgr = null;
     this.reputationMgr = null;
     this.networkMgr = null;

     this._baseConstitution = 10;
     this._baseStrength = 10;
     this._baseAgility = 10;
     this._baseIntellect = 10;

     this._statPoints = 0;
     this._hp = this.maxHp;

     this.ship = null;
     this._forcePoints = 0;
     this.activeForceSkill = null;
     this.unlockedForceSkills = [];

     this.combatState = null; // { type: 'pvp'|'pve', targetId: '...', startTime: ... }

     this.dailyQuests = QuestGenerator.generateDailyQuests();
     this.quests = {};

     this.reputation = 0;
     this.reputationVotes = {};
     this.isInitialLoading = false;
  }

  injectManagers(managers) {
      this.inventoryMgr = managers.inventory;
      this.jobMgr = managers.job;
      this.buffMgr = managers.buff;
      this.forceMgr = managers.force;
      this.questMgr = managers.quest;
      this.statsMgr = managers.stats;
      this.persistenceMgr = managers.persistence;
      this.reputationMgr = managers.reputation;
      this.networkMgr = managers.network;

      // Apply initial bonuses AFTER managers are available
      this._applyInitialBonuses();
  }

  // --- Getters and Setters for state management ---
  get baseConstitution() { return this._baseConstitution; }
  set baseConstitution(val) {
    this._baseConstitution = val;
    this._emit('stats-changed');
    this._emit('hp-changed'); // maxHp changes
  }

  get baseStrength() { return this._baseStrength; }
  set baseStrength(val) {
    this._baseStrength = val;
    this._emit('stats-changed');
  }

  get baseAgility() { return this._baseAgility; }
  set baseAgility(val) {
    this._baseAgility = val;
    this._emit('stats-changed');
  }

  get baseIntellect() { return this._baseIntellect; }
  set baseIntellect(val) {
    this._baseIntellect = val;
    this._emit('stats-changed');
  }

  get hp() { return this._hp; }
  set hp(val) {
    const old = this._hp;
    this._hp = Math.max(0, Math.min(this.maxHp, val));
    if (old !== this._hp) this._emit('hp-changed');
  }

  get xp() { return this._xp; }
  set xp(val) {
    const old = this._xp;
    this._xp = val;
    if (old !== this._xp) this._emit('xp-changed');
  }

  get money() { return this._money; }
  set money(val) {
    const old = this._money;
    this._money = val;
    if (old !== this._money) this._emit('money-changed');
  }

  get datarii() { return this._datarii; }
  set datarii(val) {
    const old = this._datarii;
    this._datarii = val;
    if (old !== this._datarii) this._emit('money-changed');
  }

  get locationId() { return this._locationId; }
  set locationId(val) {
    const old = this._locationId;
    this._locationId = val;
    if (old !== this._locationId) this._emit('location-changed');
  }

  get level() { return this._level; }
  set level(val) {
    const old = this._level;
    this._level = val;
    if (old !== this._level) this._emit('level-changed');
  }

  get statPoints() { return this._statPoints; }
  set statPoints(val) {
    const old = this._statPoints;
    this._statPoints = val;
    if (old !== this._statPoints) this._emit('stats-changed');
  }

  get forcePoints() { return this._forcePoints; }
  set forcePoints(val) {
    const old = this._forcePoints;
    this._forcePoints = val;
    if (old !== this._forcePoints) this._emit('force-changed');
  }

  _emit(event) {
    if (this.isInitialLoading) return;
    document.dispatchEvent(new CustomEvent(`player:${event}`, { detail: { player: this } }));
  }

  _applyInitialBonuses() {
    if (this.statsMgr) {
        this.statsMgr.applyInitialBonuses(this.race, this.className);
    }
  }

  //--- Логика Сохранение / Загрузка (LocalStorage) ---

  enforceTitleRestrictions() {
    if (!this.quests) this.quests = {};

    // Removed aggressive reset logic to allow manual/dev overrides
    /*
    const darkTitles = ["Претендент", "Аколит", "Ситх"];
    const lightTitles = ["Юнлинг", "Падаван", "Джедай"];

    if (darkTitles.includes(this.title) && this.alignment > 0) {
      this.title = "Контрабандист";
      //Сбрасываем весь Ситский прогресс
      Object.keys(this.quests).forEach(k => {
          if (k.startsWith('sith_')) delete this.quests[k];
      });
      this.forcePoints = 0;
      this.activeForceSkill = null;
      this.unlockedForceSkills = [];
      notify('Светлая сторона отвергла ваш ситхский титул!', "warning");
    } else if (lightTitles.includes(this.title) && this.alignment < 0) {
      this.title = "Контрабандист";
      //Сбрасываем весь Джедайский прогресс
      Object.keys(this.quests).forEach(k => {
          if (k.startsWith('jedi_')) delete this.quests[k];
      });
      this.forcePoints = 0;
      this.activeForceSkill = null;
      this.unlockedForceSkills = [];
      notify('Гнев и Тьма стёрли ваш титул Джедая!', "warning");
    }
    */

    //Если остались Контрабандистом после проверок, жестко сбрасываем Силу на ноль, если нет квеста
    if (this.title === "Контрабандист") {
      this.forcePoints = 0;
      this.activeForceSkill = null;
      // this.unlockedForceSkills = []; // Don't wipe unlocked skills, just disable access via title

      const hasActiveQuest =
        this.quests &&
        (this.quests.sith_initiation === "active" ||
          this.quests.jedi_initiation === "active");
      
      // Don't wipe alignment for manual edits either
      /*
      if (!hasActiveQuest) {
        this._alignment = 0;
      }
      */
    }
  }

  save() {
    if (this.persistenceMgr) this.persistenceMgr.save();
    if (this.networkMgr) this.networkMgr.saveProfile(this.getFullStats());
  }

  load() {
    if (this.persistenceMgr) this.persistenceMgr.load();
  }

  //--- Гетеры для динамического подсчета полов ---

  getEquipmentStat(statName) {
    if (!this.inventoryMgr) return 0; // Fixes crash during super() constructor
    return this.inventoryMgr.getEquipmentStat(statName);
  }

  get constitution() { 
    if (!this.statsMgr) return this._constitution || 10;
    return this.statsMgr.getFinalStat("constitution", this.baseConstitution); 
  }
  get strength() { 
    if (!this.statsMgr) return this._strength || 10;
    return this.statsMgr.getFinalStat("strength", this.baseStrength); 
  }
  get agility() { 
    if (!this.statsMgr) return this._agility || 10;
    return this.statsMgr.getFinalStat("agility", this.baseAgility); 
  }
  get intellect() { 
    if (!this.statsMgr) return this._intellect || 10;
    return this.statsMgr.getFinalStat("intellect", this.baseIntellect); 
  }

  //Производные пол
  get maxHp() {
    return (this.constitution * 15) + this.getEquipmentStat("maxHp");
  }
  get attack() {
    return this.getEquipmentStat("attack"); //Только из вещей
  }
  get defense() {
    return this.getEquipmentStat("defense"); //Только из вещей
  }
  get critChance() {
    return 2.5 + this.getEquipmentStat("critChance"); //Базово 2.5%
  }
  get critDamage() {
    return 1.5 + this.getEquipmentStat("critDamage"); //Базово 1.5x
  }

  //Контроль кармы: Контрабандист всегда нейтрален, за исключением случаев, когда он проходит инициацию
  get alignment() {
    return this._alignment || 0;
  }
  set alignment(val) {
    const old = this._alignment;
    this._alignment = val; 
    
    // Aggressive reset disabled to allow dev mode and persistent alignment
    /*
    if (this.title === "Контрабандист") {
      const hasActiveQuest =
        this.quests &&
        (this.quests.sith_initiation === "active" ||
          this.quests.jedi_initiation === "active");
      if (hasActiveQuest) {
        this._alignment = val; //Разрешаем накапливать карму для квеста
      } else {
        this._alignment = 0; //Контрабандист без квестов не подвержен никуда
      }
    } else {
      this._alignment = val;
    }
    */
    
    if (old !== this._alignment) this._emit('alignment-changed');
  }

  //Может игрок использовать Силу?
  get canUseForce() { return this.forceMgr ? this.forceMgr.canUseForce : false; }

  //Сколько Силы доступно в зависимости от Интеллекта
  get maxForcePoints() { return this.forceMgr ? this.forceMgr.maxForcePoints : 0; }

  // --- Logic Level ---

  gainXp(amount) {
    if (this.statsMgr) this.statsMgr.gainXp(amount);
  }

  levelUp() {
    if (this.statsMgr) this.statsMgr.levelUp();
  }

  //--- Логика Инвентарью пассивно перенаправляет в Менеджер ---
  
  get inventory() { return this.inventoryMgr ? this.inventoryMgr.items : []; }
  get equipment() { return this.inventoryMgr ? this.inventoryMgr.equipment : {}; }

  addItem(itemOrId, amount = 1) { if (this.inventoryMgr) this.inventoryMgr.addItem(itemOrId, amount); }
  removeItem(itemId, amount = 1) { return this.inventoryMgr ? this.inventoryMgr.removeItem(itemId, amount) : false; }
  equipItem(itemId) { return this.inventoryMgr ? this.inventoryMgr.equipItem(itemId) : false; }
  unequipItem(slot) { return this.inventoryMgr ? this.inventoryMgr.unequipItem(slot) : false; }

  getFullStats() {
    const inventoryData = this.inventoryMgr
      ? {
          inventory: this.inventoryMgr.items,
          equipment: this.inventoryMgr.equipment
        }
      : undefined;

    return {
      id: this.id, // Critical for DB upsert
      name: this.name,
      avatar: this.avatar,
      hp: this.hp,
      maxHp: this.maxHp,
      attack: this.attack,
      defense: this.defense,
      critChance: this.critChance,
      critDamage: this.critDamage,
      constitution: this.constitution,
      strength: this.strength,
      agility: this.agility,
      intellect: this.intellect,
      baseConstitution: this.baseConstitution,
      baseStrength: this.baseStrength,
      baseAgility: this.baseAgility,
      baseIntellect: this.baseIntellect,
      statPoints: this.statPoints,
      className: this.className,
      race: this.race,
      title: this.title,
      level: this.level,
      xp: this.xp,
      nextLevelXp: this.nextLevelXp,
      money: this.money,
      bankBalance: this.bankBalance,
      datarii: this.datarii,
      alignment: this.alignment,
      reputation: this.reputation,
      reputationVotes: this.reputationVotes,
      locationId: this.locationId,
      inventoryData: inventoryData,
      quests: this.quests,
      dailyQuests: this.dailyQuests,
      ship: this.ship,
      activeJob: this.activeJob,
      jobEndTime: this.jobEndTime,
      jobNotified: this.jobNotified,
      viewingJobBoard: this.viewingJobBoard,
      forcePoints: this.forcePoints,
      combatState: this.combatState,
      activeForceSkill: this.activeForceSkill,
      unlockedForceSkills: this.unlockedForceSkills,
      buffs: this.buffs
    };
  }

  //--- Логика Работ (Jobs) ---
  startJob(jobId, durationMs) { if (this.jobMgr) this.jobMgr.startJob(jobId, durationMs); }
  completeActiveJob() { return this.jobMgr ? this.jobMgr.completeActiveJob() : null; }

  //--- Логика Изменения Стороны Силы ---
  modifyAlignment(amount) {
    if (!amount) return;
    this.alignment += amount;
  }

  //--- Система Баффов ---
  addBuff(buffId, durationMs) { if (this.buffMgr) this.buffMgr.addBuff(buffId, durationMs); }
  hasBuff(buffId) { return this.buffMgr ? this.buffMgr.hasBuff(buffId) : false; }
  getBuffTimeLeft(buffId) { return this.buffMgr ? this.buffMgr.getBuffTimeLeft(buffId) : 0; }

  //--- Логика Квестов ---
  updateQuestProgress(type, targetId = null, amount = 1) {
    if (this.questMgr) this.questMgr.updateQuestProgress(type, targetId, amount);
  }
}
