import { Modals } from '../ui/Modals.js';
import { JOBS } from '../engine/Data/jobs.js';

export class JobScreen {
    constructor(screenManager, player) {
        this.screenManager = screenManager;
        this.player = player;
        this.container = document.getElementById('job-screen');

        this.ticker = null;

        this._init();
    }

    _init() {
        this.screenManager.subscribe('job-screen', () => {
            this.render();
            this._startTicker();
            this._updateBackground(this.player.activeJob || null);
        });

        // Clear ticker when leaving screen
        this.screenManager.subscribe('any', (screenName) => {
            if (screenName !== 'job-screen') {
                this._stopTicker();
            }
        });
    }

    _updateBackground(jobId) {
        // Priority: use the job's own bgImage if it has one
        const job = jobId ? JOBS[jobId] : null;
        const bgUrl = (job && job.bgImage)
            ? job.bgImage
            : `/public/assets/locations/${this.player.locationId.split('_')[0]}/job_bg.png`;

        this.container.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.55),rgba(0,0,0,0.65)), url('${bgUrl}')`;
        this.container.style.backgroundSize = 'cover';
        this.container.style.backgroundPosition = 'center';
        this.container.style.backgroundAttachment = 'local';
    }

    _startTicker() {
        this._stopTicker();
        const jobEnd = Number(this.player.jobEndTime) || 0;
        if (this.player.activeJob && jobEnd > Date.now()) {
            this._updateTimerDisplays(); // Immediate update
            this.ticker = setInterval(() => {
                if (document.getElementById('active-job-timer') || document.querySelector('.job-timer-inline')) {
                    this._updateTimerDisplays();
                }
            }, 1000);
        }
    }

    _stopTicker() {
        if (this.ticker) {
            clearInterval(this.ticker);
            this.ticker = null;
        }
    }

    render() {
        // Set persistence state
        if (!this.player.viewingJobBoard) {
            this.player.viewingJobBoard = true;
            this.player.save();
        }

        // Check if we have an expired active job that needs claiming immediately upon viewing
        // Convert to Number to be safe
        const jobEnd = Number(this.player.jobEndTime) || 0;
        if (this.player.activeJob && jobEnd > 0 && Date.now() >= jobEnd) {
            const result = this.player.completeActiveJob();
            if (result) {
                Modals.alert('Работа завершена', `Вы отлично поработали на должности "${result.title}" и получили ${result.credits} кр. и ${result.xp} XP!`);
            }
            //Всегда если результат является null (invalid job), completeActiveJob reset state, с теми, что непрерывно rendering
        }

        this.container.innerHTML = this._renderJobList();
        this._attachJobSelectEvents();
        
        // If there is antive job, start the ticker to update the UI
        const jobEnd2 = Number(this.player.jobEndTime) || 0;
        if (this.player.activeJob && jobEnd2 > Date.now()) {
            this._startTicker();
        }
    }

    _renderJobList() {
        //Получаем текущую планету игрока
        const currentPlanet = this.player.locationId.split('_')[0]; 

        let jobsHtml = '';
        for (const job of Object.values(JOBS)) {
            //Фильтруем работы по планете
            if (job.planet && job.planet !== currentPlanet) continue;

            let alignBadge ='';
            if (job.rewards.alignment > 0) {
                alignBadge = `<span class="job-reward-badge reward-light">+${job.rewards.alignment} Свет</span>`;
            } else if (job.rewards.alignment < 0) {
                alignBadge = `<span class="job-reward-badge reward-dark">${job.rewards.alignment} Тьма</span>`;
            }

            const isActive = (this.player.activeJob === job.id);
            const isWorking = (this.player.activeJob !== null); // Working on *any* job

            let actionBtnHtml ='';
            
            if(isActive) {
                // Active Job State - Show Timer
                actionBtnHtml = `
                    <div class="job-status-row">
                        <span class="job-timer-inline" id="job-timer-${job.id}">Завершение...</span>
                        <button class="cancel-job-btn-small" data-id="${job.id}">✖</button>
                    </div>
                `;
            } else {
                // Inactive State
                if (isWorking) {
                    //Разрешена работа с трудом
                    actionBtnHtml = `<button class="job-action-btn disabled" disabled>Занят</button>`;
                } else {
                    // Available
                    actionBtnHtml = `<button class="job-action-btn select-job-btn" data-id="${job.id}">Устроится</button>`;
                }
            }

            jobsHtml +=`
                <div class="job-card ${isActive ?'active' : ''} ${isWorking && !isActive ? 'disabled' : ''}">
                    <div class="job-card-top">
                        <div class="job-title">${(job?.title || '')}</div>
                        <div class="job-time">⏱️ ${job.timeText}</div>
                    </div>
                    <div class="job-desc">${(job?.desc || '')}</div>
                    <div class="job-rewards">
                        <span class="job-reward-badge reward-credits">💰 ${job.rewards.credits}</span>
                        <span class="job-reward-badge reward-xp">✨ ${job.rewards.xp}</span>
                        ${alignBadge}
                    </div>
                    ${actionBtnHtml}
                </div>
            `;
        }

        return `<div class="job-layout">
                <div class="job-header-card">
                    <div class="job-header-title">Центр трудоустройства</div>
                    <div class="job-header-desc">Выберите контракт. Путешествия заблокированы во время работы.</div>
                </div>
                <div class="job-list">${jobsHtml}</div>
                <button id="btn-job-back" class="job-action-btn" style="margin-top:20px; width:100%; padding:15px; font-size:14px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff;">ВЕРНУТЬСЯ НА КАРТУ</button>
            </div>`;
    }

    _updateTimerDisplays() {
        if (!this.player.activeJob) {
            this._stopTicker();
            return;
        }
        
        const timerEl = document.getElementById(`job-timer-${this.player.activeJob}`);
        if(!timerEl) return;

        const jobEnd = Number(this.player.jobEndTime) || 0;
        const leftMs = jobEnd - Date.now();
        if (leftMs <= 0) {
            // Main.js handles the actual completion logic globally
            // We just stop updating the UI until it refreshes
            this._stopTicker();
            timerEl.textContent = "✅ Готово!";
            return;
        }

        const m = Math.floor(leftMs/60000);
        const s = Math.floor((leftMs % 60000) / 1000);
        timerEl.textContent = `⏱️ ${m.toString().padStart(2,'0')}:${s.toString().padStart(2, '0')}`;
    }

    _attachJobSelectEvents() {
        // ... (binding logic active job cancel button)
        const cancelBtns = this.container.querySelectorAll('.cancel-job-btn-small');
        cancelBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                Modals.confirm(
                    'Расторжение', 
                    'Отменить работу? Награды не будет.', 
                    'Да', 'Нет', 
                    () => {
                        this.player.activeJob = null;
                        this.player.jobEndTime = 0;
                        this.player.save();
                        this._stopTicker();
                        this.render();
                        
                        const event = new CustomEvent('game:notification', { 
                            detail: { msg: `Контракт отменен.`, type:'info' } 
                        });
                        document.dispatchEvent(event);
                    }
                );
            });
        });

        const btns = this.container.querySelectorAll('.select-job-btn');
        btns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const jobId = e.target.dataset.id;
                const job = JOBS[jobId];
                if (!job) return;

                // Immediate start, no confirmation modal to make it snappy like crystal search
                // Or maybe keep confirmation? User said "pressed on job, and timer went". Implies immediate.
                
                if (this.player.activeJob) return; // Prevent overwriting jobs via fast clicking

                e.target.disabled = true; // Block UI multi-click

                this.player.activeJob = jobId;
                this.player.jobEndTime = Date.now() + job.timeMs;
                this.player.jobNotified = false;
                this.player.save();
                this._updateBackground(jobId);

                this.render();
                this._startTicker();
            });
        });

        const backBtn = this.container.querySelector('#btn-job-back');
        if (backBtn) {
            backBtn.addEventListener('click', () => this._goBack());
        }

        //Клик по фону или пустому месту - возвращает на карту
        //Удаляем старый слушатель, чтобы не накапливалось
        if (this._bgClickListener) {
            this.container.removeEventListener('click', this._bgClickListener);
        }
        this._bgClickListener = (e) => {
            //Если клик не попал ни на один интерактивный элемент — идем назад
            const isInteractive = e.target.closest('.job-card, .job-action-btn, .cancel-job-btn-small, #btn-job-back, .job-header-card, .job-header-title, .job-header-desc'
            );
            if (!isInteractive) {
                this._goBack();
            }
        };
        this.container.addEventListener('click', this._bgClickListener);
    }

    _goBack() {
        this.player.viewingJobBoard = false;
        this.player.save();

        this.screenManager.showScreen('maps-screen');
        const navBtns = document.querySelectorAll('#bottom-nav .nav-btn');
        navBtns.forEach(b => b.classList.remove('active'));
        const mapBtn = document.querySelector('#bottom-nav .nav-btn[data-target="maps-screen"]');
        if (mapBtn) mapBtn.classList.add('active');
    }
}
