// ==========================================
//MEDITATION HANDLER - зал медитации Дантуина
// ==========================================
import { Modals } from '../../../ui/Modals.js';

export class MeditationHandler {
    constructor(player) {
        this.player = player;
        this.isMeditating = false;
    }

    handleMeditation() {
        const allowedRanks = ['Падаван', 'Джедай'];
        if (!allowedRanks.includes(this.player.title)) {
            Modals.alert('Медитация', 'Только прошедшие обучение (Падаван или выше) могут использовать техники Силы.');
            return;
        }

        const skills = [
            { id: 'mind_control', name: 'Mind Control', cost: 50, desc: 'Оглушает гуманоидных противников на 1 ход.' },
            { id: 'force_pull',   name: 'Force Pull', cost: 50, desc: 'Притягивает врага. Последующая атака x2 ущерба.' },
            { id: 'force_heal',   name: 'Force Heal', cost: 50, desc: 'Восстанавливает 15% максимального HP.' },
            { id: 'force_speed',  name: 'Force Speed', cost: 50, desc: 'Позволяет сделать два хода подряд.' }
        ];

        const skillsHtml = skills.map(s => {
            const isActive = this.player.activeForceSkill === s.id;
            return `
                <div class="skill-card ${isActive ? 'active' : ''}"
                     onclick="window.gameInstance.mapScreen.selectForceSkill('${s.id}')"
                     style="border:2px solid ${isActive ? '#2ecc71' : '#555'};
                            background:${isActive ? 'rgba(46,204,113,0.1)' : '#222'};
                            padding:10px;margin-bottom:10px;cursor:pointer;border-radius:5px;">
                    <div style="color:#fff;font-weight:bold;">${s.name} <span style="color:#3498db;">(${s.cost} FP)</span></div>
                    <div style="color:#aaa;font-size:12px;">${s.desc}</div>
                </div>
            `;
        }).join('');

        const modalHtml = `
            <div style="text-align:center;">
                <p>${'Восстановите силы и выберите активный навык.'}</p>
                <div style="text-align:left;margin:15px 0;">${skillsHtml}</div>
                <div style="border-top:1px solid #444;padding-top:10px;margin-top:10px;">
                    <div>HP: <span style="color:#e74c3c">${this.player.hp}/${this.player.maxHp}</span></div>
                    <div>Force: <span style="color:#3498db">${this.player.forcePoints}/${this.player.maxForcePoints}</span></div>
                </div>
            </div>
        `;

        Modals.confirm('Медитация', modalHtml, 'Медитировать (10 сек)', 'Закрыть',
            () => this.startMeditationProcess()
        );
    }

    startMeditationProcess() {
        const btn = document.getElementById('btn-meditate');
        const backBtn = document.querySelector('.btn-move--jedi');

        if (!btn) return;
        if (this.isMeditating) return;

        btn.disabled = true;
        if (backBtn) backBtn.disabled = true;
        this.isMeditating = true;

        let timeLeft = 10;
        btn.innerHTML = '🧘 МЕДИТАЦИЯ ({s}с)'.replace('{s}', timeLeft);

        const timer = setInterval(() => {
            if (!document.body.contains(btn)) {
                clearInterval(timer);
                this.isMeditating = false;
                return; // Screen changed or modal closed, abort meditation
            }

            timeLeft--;
            if (timeLeft <= 0) {
                clearInterval(timer);
                this.isMeditating = false;
                btn.disabled = false;
                if (backBtn) backBtn.disabled = false;
                btn.innerHTML = '🧘 МЕДИТАЦИЯ';

                this.player.heal(this.player.maxHp);
                this.player.forcePoints = this.player.maxForcePoints;
                this.player.save();
                Modals.alert('Медитация завершена', 'Вы полностью восстановили здоровье и силу.');
            } else {
                btn.innerHTML = '🧘 МЕДИТАЦИЯ ({s}с)'.replace('{s}', timeLeft);
            }
        }, 1000);
    }

    selectForceSkill(skillId) {
        this.player.activeForceSkill = skillId;
        this.player.save();
        //Переоткрываем модалку, чтобы обновить UI активного скала.
        document.querySelector('.sw-modal-overlay')?.remove();
        this.handleMeditation();
    }
}
