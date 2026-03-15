export class ForceManager {
    constructor(player) {
        this.player = player;
    }

    get canUseForce() {
        const forceTitles = ["Падаван", "Аколит", "Джедай", "Ситх"];
        return forceTitles.includes(this.player.title);
    }

    get maxForcePoints() {
        if (!this.canUseForce) return 0;
        
        // 1 points of intellect = 5 force points
        let points = this.player.intellect * 5;
        
        //Базовые бонусы от титулов
        if (this.player.title === "Джедай" || this.player.title === "Ситх") points += 100;
        else if (this.player.title === "Падаван" || this.player.title === "Аколит") points += 50;
        
        return points;
    }

    unlockSkill(skillId) {
        if (!this.player.unlockedForceSkills.includes(skillId)) {
            this.player.unlockedForceSkills.push(skillId);
            this.player.save();
            return true;
        }
        return false;
    }

    setActiveSkill(skillId) {
        if (this.player.unlockedForceSkills.includes(skillId)) {
            this.player.activeForceSkill = skillId;
            this.player.save();
            return true;
        }
        return false;
    }
}
