export class GameLoopManager {
    constructor() {
        this.loops = new Map();
        this.isRunning = false;
        this.mainLoopId = null;
        this.lastFrameTime = 0;
        this.targetFPS = 60;
        this.frameInterval = 1000 / this.targetFPS;
    }

    /**
     * Додає новий цикл з певним інтервалом
     * @param {string} id - унікальний ідентифікатор циклу
     * @param {Function} callback - функція для виконання
     * @param {number} intervalMs - інтервал в мілісекундах
     */
    addLoop(id, callback, intervalMs) {
        if (this.loops.has(id)) {
            console.warn(`Loop ${id} already exists. Removing old one.`);
            this.removeLoop(id);
        }

        this.loops.set(id, {
            callback,
            intervalMs,
            lastExecution: 0,
            enabled: true
        });

        if (!this.isRunning) {
            this.start();
        }
    }

    /**
     * Видаляє цикл
     * @param {string} id - ідентифікатор циклу
     */
    removeLoop(id) {
        this.loops.delete(id);
        if (this.loops.size === 0 && this.isRunning) {
            this.stop();
        }
    }

    /**
     * Вмикає/вимикає цикл
     * @param {string} id - ідентифікатор циклу
     * @param {boolean} enabled - стан циклу
     */
    toggleLoop(id, enabled) {
        const loop = this.loops.get(id);
        if (loop) {
            loop.enabled = enabled;
        }
    }

    /**
     * Запускає головний цикл
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.run();
    }

    /**
     * Зупиняє головний цикл
     */
    stop() {
        if (this.mainLoopId) {
            cancelAnimationFrame(this.mainLoopId);
            this.mainLoopId = null;
        }
        this.isRunning = false;
    }

    /**
     * Головний цикл, що виконує всі додані цикли
     */
    run() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;

        // Виконуємо всі цикли, які готові до виконання
        for (const [id, loop] of this.loops) {
            if (!loop.enabled) continue;

            if (currentTime - loop.lastExecution >= loop.intervalMs) {
                try {
                    loop.callback(currentTime, deltaTime);
                    loop.lastExecution = currentTime;
                } catch (error) {
                    console.error(`Error in loop ${id}:`, error);
                }
            }
        }

        this.lastFrameTime = currentTime;
        this.mainLoopId = requestAnimationFrame(() => this.run());
    }

    /**
     * Отримує статистику циклів
     */
    getStats() {
        const stats = {
            totalLoops: this.loops.size,
            enabledLoops: 0,
            isRunning: this.isRunning,
            loops: []
        };

        for (const [id, loop] of this.loops) {
            if (loop.enabled) stats.enabledLoops++;
            
            stats.loops.push({
                id,
                intervalMs: loop.intervalMs,
                enabled: loop.enabled,
                lastExecution: loop.lastExecution,
                timeSinceLastExecution: loop.lastExecution ? performance.now() - loop.lastExecution : 0
            });
        }

        return stats;
    }

    /**
     * Очищує всі цикли
     */
    clear() {
        this.stop();
        this.loops.clear();
    }
}
