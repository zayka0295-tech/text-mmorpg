import { QuestGenerator } from './QuestGenerator.js';

export class QuestManager {
    constructor(player) {
        this.player = player;
    }

    updateQuestProgress(type, targetId = null, amount = 1) {
        if (!this.player.dailyQuests) return;

        let updated = false;

        this.player.dailyQuests.forEach((quest) => {
            if (quest.isCompleted) return;

            if (quest.type === type) {
                //Проверяем совпадает targetId (если он нужен для этого квеста)
                if (quest.targetId !== null && quest.targetId !== targetId) return;

                quest.current += amount;

                if (quest.current >= quest.target) {
                    quest.current = quest.target;
                    quest.isCompleted = true;
                    this._notify('Задание выполнено: {desc}'.replace('{desc}', QuestGenerator.getDesc(quest)), "success");
                }

                updated = true;
            }
        });

        // Notify UI layer to re-render quests if the screen is open (no direct coupling to window.gameInstance)
        if (updated) {
            document.dispatchEvent(new CustomEvent("game:quest-updated"));
            this.player.save();
        }
    }

    _notify(msg, type) {
        document.dispatchEvent(
            new CustomEvent("game:notification", { detail: { msg, type } }),
        );
    }
}
