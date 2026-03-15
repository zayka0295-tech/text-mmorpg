import { Notifications } from '../../ui/Notifications.js';

export class ReputationManager {
    constructor(player) {
        this.player = player;
    }

    vote(targetId, voteType, onSuccess, onError) {
        const targetName = targetId.startsWith('real_') ? targetId.slice(5) : targetId;

        if (targetName === this.player.name) {
            Notifications.show('❌ Нельзя голосовать за себя!', 'error');
            if (onError) onError('Нельзя голосовать за себя!');
            return;
        }

        // 1. Network Logic
        if (this.player.networkMgr) {
            this.player.networkMgr.sendReputationVote(targetId, voteType);
            Notifications.show(voteType === 'up' ? '👍 Вы проголосовали ЗА' : '👎 Вы проголосовали ПРОТИВ', 'success');
            // Optimistically update local UI? 
            // We can't easily update the target's data in our UI until they send it back, 
            // but for now we just show success.
            if (onSuccess) onSuccess(targetId);
            return;
        }

        // 2. Legacy LocalStorage Logic
        try {
            const raw = localStorage.getItem(`sw_player_save_${targetName}`);
            if (!raw) {
                if (onError) onError('❌ Игрок не найден.');
                return;
            }
            const pData = JSON.parse(raw);
            if (!pData.reputationVotes) pData.reputationVotes = {};

            const prev = pData.reputationVotes[this.player.name];
            if (prev === voteType) {
                delete pData.reputationVotes[this.player.name];
                pData.reputation = (pData.reputation || 0) + (voteType === 'up' ? -1 : 1);
                Notifications.show('Голос удален', 'info');
            } else {
                if (prev) {
                    pData.reputation = (pData.reputation || 0) + (prev === 'up' ? -1 : 1);
                }
                pData.reputationVotes[this.player.name] = voteType;
                pData.reputation = (pData.reputation || 0) + (voteType === 'up' ? 1 : -1);
                Notifications.show(voteType === 'up' ? '👍 Подняли репутацию' : '👎 Опустили репутацию', 'success');
            }

            localStorage.setItem(`sw_player_save_${targetName}`, JSON.stringify(pData));
            if (onSuccess) onSuccess(targetId);
        } catch (e) {
            if (onError) onError('❌ Ошибка голосования.');
        }
    }
}
