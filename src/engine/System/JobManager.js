import { JOBS } from "../Data/jobs.js";

export class JobManager {
    constructor(player) {
        this.player = player;
        this._initListeners();
    }

    startJob(jobId, durationMs) {
        // Optimistic check (server will validate)
        if (this.player.activeJob) return;

        if (this.player.networkMgr) {
            this.player.networkMgr.send('job_start', { jobId });
        }
    }

    completeActiveJob() {
        if (!this.player.activeJob) return null;
        // Check if time has passed (allow 100ms buffer for precision issues)
        // This is just a client-side check to prevent spamming the server if obviously not done
        if (Date.now() < this.player.jobEndTime - 100) return null;

        if (this.player.networkMgr) {
            this.player.networkMgr.send('job_complete', {});
        }
        return null; // Async result handling via event
    }

    _initListeners() {
        document.addEventListener('network:job_result', (e) => {
            const { ok, operation, error, profile, rewards } = e.detail;
            
            if (!ok) {
                console.error('Job operation failed:', error);
                // Maybe show notification?
                return;
            }

            if (profile) {
                // Sync player state
                this.player.activeJob = profile.job_data?.activeJob || null;
                this.player.jobEndTime = profile.job_data?.jobEndTime || 0;
                this.player.jobNotified = !!profile.job_data?.jobNotified;
                
                this.player.money = profile.money;
                this.player.xp = profile.xp;
                this.player.level = profile.level;
                this.player.alignment = profile.alignment;
                
                if (profile.stats) {
                    this.player.statPoints = profile.stats.statPoints;
                }

                this.player._emit('money-changed');
                this.player._emit('xp-changed');
                this.player._emit('level-changed');
                this.player._emit('stats-changed');
            }

            if (operation === 'complete' && rewards) {
                // Emit event for UI to show reward modal
                document.dispatchEvent(new CustomEvent('job:completed', { 
                    detail: { 
                        title: rewards.title,
                        credits: rewards.credits, 
                        xp: rewards.xp 
                    } 
                }));
            }
        });
    }
}
