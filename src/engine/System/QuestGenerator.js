import { PLANETS } from '../Data/planets.js';

export class QuestGenerator {
    static generateDailyQuests() {
        const quests = [];

        //1. Посетить случайную планету
        const planetKeys = Object.keys(PLANETS);
        const randomPlanetKey = planetKeys[Math.floor(Math.random() * planetKeys.length)];
        const planet = PLANETS[randomPlanetKey];

        quests.push({
            id: 'quest_visit_planet',
            type: 'visit_planet',
            descKey: 'quest_visit_planet_desc',
            descParams: { planet: planet.name, planet_en: planet.name_en || planet.name, planet_ru: planet.name_ru || planet.name },
            desc: `Посетить планету:${planet.name}`, // Fallback for legacy saves
            targetId: randomPlanetKey,
            target: 1,
            current: 0,
            reward: { xp: 200, money: 100 },
            isCompleted: false,
            isRewardClaimed: false
        });

        //2. Использовать случайное количество аптечек (от 1 до 20)
        const medkitAmount = Math.floor(Math.random() * 20) + 1;
        quests.push({
            id: 'quest_use_medkits',
            type: 'use_medkit',
            descKey: 'quest_use_medkits_desc',
            descParams: {},
            desc: `Использовать аптечки`, // Fallback for legacy saves
            targetId: null,
            target: medkitAmount,
            current: 0,
            reward: { xp: 50 * medkitAmount, money: 20 * medkitAmount },
            isCompleted: false,
            isRewardClaimed: false
        });

        //3. Убить случайного Босса (Крайт-дракон или Ситх-аколит)
        const bosses = [
            { id: 'krayt_dragon_hatchling', nameKey: 'boss_krayt_hatchling', name: 'Детеныш Крайт-дракона', rewardXp: 1000, rewardMoney: 500 },
            { id: 'sith_acolyte', nameKey: 'boss_sith_acolyte', name: 'Ситх-аколит (Изгнанник)', rewardXp: 1500, rewardMoney: 800 }
        ];

        const randomBoss = bosses[Math.floor(Math.random() * bosses.length)];

        quests.push({
            id: 'quest_kill_boss',
            type: 'kill_monster',
            descKey: 'quest_kill_boss_desc',
            descParams: { bossKey: randomBoss.nameKey, boss: randomBoss.name },
            desc: `Убить Босса:${randomBoss.name}`, // Fallback for legacy saves
            targetId: randomBoss.id,
            target: 1,
            current: 0,
            reward: { xp: randomBoss.rewardXp, money: randomBoss.rewardMoney },
            isCompleted: false,
            isRewardClaimed: false
        });

        return quests;
    }

    /**
     * Get localized description for a quest object.
     * Uses descKey + descParams if present, falls back to legacy desc string.
     */
    static getDesc(quest) {
        if (!quest.descKey || typeof window.t === 'undefined') return quest.desc || '';
        const params = quest.descParams || {};
        const lang = window.i18n?.currentLang || 'uk';

        // For planet quests with tObj-style params
        if (quest.descKey === 'quest_visit_planet_desc') {
            const planetName = params[`planet_${lang}`] || params.planet || '';
            return 'Посетить планету: {planet}'.replace('{planet}', planetName);
        }
        if (quest.descKey === 'quest_kill_boss_desc') {
            const bossName = window.t(params.bossKey) || params.boss || '';
            return 'Убить Босса: {boss}'.replace('{boss}', bossName);
        }
        return window.t(quest.descKey);
    }
}
