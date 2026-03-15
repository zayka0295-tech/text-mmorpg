// ==========================================
//SITH MEDITATION HANDLER — Зал Церемонии на Коррибане
// ==========================================
import { Modals } from '../../../ui/Modals.js';

export class SithMeditationHandler {
    constructor(player) {
        this.player = player;
        this.isMeditating = false;
    }

    handleMeditation() {
        if (this.player.title === 'Претендент') {
            Modals.alert('Медитационная Камера', 'Вы еще слишком слаб. Медитационная камера сведет вас с ума. Докажите свою ценность и станьте Аколитом.');
            return;
        }

        const allowedRanks = ['Аколит', 'Ситх'];
        if (!allowedRanks.includes(this.player.title)) {
            Modals.alert('Медитационная Камера', 'Только реальные ситхи (аколиты и выше) могут выдержать чёрную ауру этого места.');
            return;
        }

        const skills = [
            { id: 'sith_lightning',   name: 'Молния Силы', cost: 50, desc: 'Наносит 2х крытый урон и оглушает противника на 1 ход.' },
            { id: 'sith_rage',        name: 'Ярость Ситха', cost: 50, desc: 'Теряет 10% HP, но получает +50% к урону на следующие 2 хода.' },
            { id: 'lightsaber_throw', name: 'Бросок светового меча', cost: 50, desc: 'Наносите урон мечом, после чего можно сразу совершить еще один ход.' },
            { id: 'force_choke',      name: 'Удушение Силой', cost: 50, desc: 'Если у врага меньше 25% HP, то есть шанс 30% немедленно добить его.' }
        ];

        const skillsHtml = skills.map(s => {
            const isActive = this.player.activeForceSkill === s.id;
            return `
                <div class="skill-card ${isActive ? 'active' : ''}"
                     onclick="window._mapScreenRef.selectForceSkill('${s.id}')"
                     style="border:2px solid ${isActive ? '#e74c3c' : '#555'};
                            background:${isActive ? 'rgba(231,76,60,0.1)' : '#222'};
                            padding:10px;margin-bottom:10px;cursor:pointer;border-radius:5px;">
                    <div style="color:#fff;font-weight:bold;">${s.name} <span style="color:#e74c3c;">(${s.cost} FP)</span></div>
                    <div style="color:#aaa;font-size:12px;">${s.desc}</div>
                </div>
            `;
        }).join('');

        const modalHtml = `
            <div style="text-align:center;">
                <p>${'Ощутите силу Тёмной Стороны и выберите активный навык.'}</p>
                <div style="text-align:left;margin:15px 0;">${skillsHtml}</div>
                <div style="border-top:1px solid #444;padding-top:10px;margin-top:10px;">
                    <div>HP: <span style="color:#e74c3c">${this.player.hp}/${this.player.maxHp}</span></div>
                    <div>Force: <span style="color:#3498db">${this.player.forcePoints}/${this.player.maxForcePoints}</span></div>
                </div>
            </div>
        `;

        Modals.confirm('Медитационная Камера', modalHtml, 'Медитировать (10 сек)', 'Закрыть',
            () => this.startMeditationProcess()
        );
    }

    startMeditationProcess() {
        const btn = document.getElementById('btn-sith-meditate');
        const backBtn = document.querySelector('.btn-move'); // any back button

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
                return;
            }

            timeLeft--;
            if (timeLeft <= 0) {
                clearInterval(timer);
                this.isMeditating = false;
                btn.disabled = false;
                if (backBtn) backBtn.disabled = false;
                btn.innerHTML = '🧘 МЕДИТАЦИОННАЯ КАМЕРА';

                this.player.heal(this.player.maxHp);
                this.player.forcePoints = this.player.maxForcePoints;
                this.player.save();
                
                Notifications.show('Медитация завершена. Темная сторона наполнила вас!', 'success');
            } else {
                btn.innerHTML = '🧘 МЕДИТАЦИЯ ({s}с)'.replace('{s}', timeLeft);
            }
        }, 1000);
    }

    selectForceSkill(skillId) {
        this.player.activeForceSkill = skillId;
        this.player.save();
        document.querySelector('.sw-modal-overlay')?.remove();
        this.handleMeditation();
    }
}
