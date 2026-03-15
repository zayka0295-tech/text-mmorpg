import { Notifications } from '../../ui/Notifications.js';

export class ReputationManager {
    constructor(player) {
        this.player = player;
        this.pendingVotes = new Map();

        document.addEventListener('network:reputation_vote_result', (e) => {
            const { targetId, voteType, ok, error } = e.detail;
            const key = `${targetId}:${voteType}`;
            const pending = this.pendingVotes.get(key);

            if (!pending) return;

            clearTimeout(pending.timeoutId);
            this.pendingVotes.delete(key);

            if (ok) {
                Notifications.show(voteType === 'up' ? '👍 Голос ЗА принят сервером' : '👎 Голос ПРОТИВ принят сервером', 'success');
                if (pending.onSuccess) pending.onSuccess(targetId);
            } else {
                console.error('[ReputationManager.voteResult]', { targetId, voteType, error });
                const errorMsg = error || '❌ Сервер не смог обработать голосование.';
                Notifications.show(errorMsg, 'error');
                if (pending.onError) pending.onError(errorMsg);
            }
        });
    }

    vote(targetId, voteType, onSuccess, onError) {
        const targetName = typeof targetId === 'string' && targetId.startsWith('real_') ? targetId.slice(5) : targetId;

        if (targetName === this.player.name) {
            Notifications.show('❌ Нельзя голосовать за себя!', 'error');
            if (onError) onError('Нельзя голосовать за себя!');
            return;
        }

        // 1. Network Logic
        if (this.player.networkMgr) {
            try {
                const key = `${targetId}:${voteType}`;
                const sent = this.player.networkMgr.sendReputationVote(targetId, voteType);

                if (!sent) {
                    const errorMsg = '❌ Не удалось отправить голос на сервер.';
                    console.error('[ReputationManager.vote]', {
                        error: errorMsg,
                        targetId,
                        voteType,
                        playerName: this.player.name
                    });
                    Notifications.show(errorMsg, 'error');
                    if (onError) onError(errorMsg);
                    return;
                }

                const timeoutId = setTimeout(() => {
                    const pending = this.pendingVotes.get(key);
                    if (!pending) return;

                    this.pendingVotes.delete(key);
                    const errorMsg = '❌ Сервер не подтвердил голосование. Проверьте Render logs.';
                    console.error('[ReputationManager.voteTimeout]', {
                        targetId,
                        voteType,
                        playerName: this.player.name
                    });
                    Notifications.show(errorMsg, 'error');
                    if (pending.onError) pending.onError(errorMsg);
                }, 10000);

                this.pendingVotes.set(key, { onSuccess, onError, timeoutId });
                Notifications.show('⏳ Отправляем голос на сервер...', 'info');
            } catch (e) {
                console.error('[ReputationManager.vote.network]', {
                    message: e?.message,
                    stack: e?.stack,
                    targetId,
                    voteType,
                    playerName: this.player.name
                });
                const errorMsg = '❌ Ошибка отправки голосования.';
                Notifications.show(errorMsg, 'error');
                if (onError) onError(errorMsg);
            }
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
            console.error('[ReputationManager.vote.local]', {
                message: e?.message,
                stack: e?.stack,
                targetId,
                voteType,
                playerName: this.player.name
            });
            if (onError) onError('❌ Ошибка голосования.');
        }
    }
}
