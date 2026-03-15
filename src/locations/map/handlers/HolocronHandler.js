// ==========================================
//HOLOCRON HANDLER - Холокрон Джедаев (Дантуин Архив)
// ==========================================
import { Modals } from '../../../ui/Modals.js';

export class HolocronHandler {
    constructor(player, onRender) {
        this.player = player;
        this.onRender = onRender;
    }

    handleLibraryHolocron() {
        const hasHolocron = this.player.inventory.some(i => i.id === 'jedi_holocron' && i.amount > 0);

        if (!hasHolocron) {
            Modals.alert('Архивы пусты', 'Вы осматриваете пустые полки. Для взаимодействия нужен Холокрон Джедаев. Попытайтесь собрать его из фрагментов.');
            return;
        }

        Modals.confirm(
            'Холокрон Джедаев', 'Вы держите в руках Холокрон Джедаев, мягко светящийся синим светом. Холокрон.</i>',
            '📖 Расшифровать', '✨ Передать в Архив (+150)',
            () => this._consumeForKnowledge(),
            () => this._consumeForLight()
        );
    }

    _consumeForKnowledge() {
        const hasHolocron = this.player.inventory.find(i => i.id === 'jedi_holocron' && i.amount > 0);
        if (!hasHolocron) return; //Предохранитель от двойного клика

        if (!this.player.quests) this.player.quests = {};
        this.player.quests.jedi_code_learned = true;
        this.player.removeItem('jedi_holocron', 1);
        this.player.save();
        this.onRender();

        Modals.alert('✨ Кодекс Джедаев', `
            <div style="font-family:serif;text-align:center;font-size:18px;color:#3498db;line-height:1.8;
                        text-shadow:0 0 5px rgba(52,152,219,0.5);padding:20px;">
                <p>${'Нет эмоций — есть покой.'}</p>
                <p>${'Нет невежества — есть знание.'}</p>
                <p>${'Нет страсти — есть безмятежность.'}</p>
                <p>${'Нет хаоса — есть гармония.'}</p>
                <p>${'Нет смерти — есть Сила.'}</p>
            </div>
        `);
    }

    _consumeForLight() {
        const hasHolocron = this.player.inventory.find(i => i.id === 'jedi_holocron' && i.amount > 0);
        if (!hasHolocron) return; //Предохранитель от двойного клика

        this.player.removeItem('jedi_holocron', 1);
        this.player.modifyAlignment(150);
        this.player.save();
        this.onRender();

        Modals.alert('Приумножение Света',
            `<div style="color:#2ecc71;text-align:center;">${'Вы оставили Холокрон в архивах Ордена. Ваша связь со Светлой Стороной значительно укрепилась (+150 Света).'}</div>`
        );
    }
}
