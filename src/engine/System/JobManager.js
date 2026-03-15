import { JOBS } from "../Data/jobs.js";

export class JobManager {
    constructor(player) {
        this.player = player;
    }

    startJob(jobId, durationMs) {
        let finalDuration = durationMs;
        
        // Эффект Кореллианского эля: сокращаем время до 3 минут (180 000 мс)
        if (this.player.hasBuff('corellian_ale')) {
            finalDuration = Math.min(durationMs, 3 * 60 * 1000);
        }

        this.player.activeJob = jobId;
        this.player.jobEndTime = Date.now() + finalDuration;
        this.player.save();
    }

    completeActiveJob() {
        if (!this.player.activeJob) return null;
        // Check if time has passed (allow 100ms buffer for precision issues)
        if (Date.now() < this.player.jobEndTime - 100) return null;

        const job = JOBS[this.player.activeJob];
        if (!job) {
            // Invalid job, just reset
            this.player.activeJob = null;
            this.player.jobEndTime = 0;
            return null;
        }

        //Награды
        this.player.money += job.rewards.credits;
        this.player.gainXp(job.rewards.xp);
        if (job.rewards.alignment) {
            this.player.modifyAlignment(job.rewards.alignment);
        }

        const result = {
            title: job.title,
            credits: job.rewards.credits,
            xp: job.rewards.xp,
        };

        // Reset state
        this.player.activeJob = null;
        this.player.jobEndTime = 0;
        this.player.jobNotified = false;

        this.player.save();

        return result;
    }
}
