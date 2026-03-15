import { Modals } from '../../../ui/Modals.js';

export class SithHolocronHandler {
    constructor(player, onRender) {
        this.player = player;
        this.onRender = onRender;
    }

    handleLibraryHolocron() {
        const hasHolocron = this.player.inventory.some(i => i.id === 'sith_holocron' && i.amount > 0);

        if (!hasHolocron) {
            Modals.alert('Архивы пусты', 'Вы осматриваете старые свитки. Для взаимодействия нужен Холокрон Ситхов. Попытайтесь собрать его из фрагментов в Гробницах.');
            return;
        }

        Modals.confirm(
            'Холокрон Ситхов', 'Вы держите в руках Холокрон Ситхов, пульсирующий тёмной энергией. поглотит артефакт.</i>',
            '📖 Расшифровать', '🌑 Передать в Архив (-150)',
            () => this._consumeForKnowledge(),
            () => this._consumeForDarkness()
        );
    }

    _consumeForKnowledge() {
        const hasHolocron = this.player.inventory.find(i => i.id === 'sith_holocron' && i.amount > 0);
        if (!hasHolocron) return; //Предохранитель от двойного клика

        if (!this.player.quests) this.player.quests = {};
        this.player.quests.sith_code_learned = true;
        this.player.removeItem('sith_holocron', 1);
        this.player.save();
        this.onRender();

        Modals.alert('🔥 Кодекс Ситхов', `
            <div style="font-family:serif;text-align:center;font-size:18px;color:#e74c3c;line-height:1.8;
                        text-shadow:0 0 5px rgba(231,76,60,0.5);padding:20px;">
                <p>${'Покой - это ложь, есть только страсть.'}</p>
                <p>${'Через страсть я обретаю силу.'}</p>
                <p>${'Через силу я обретаю власть.'}</p>
                <p>${'Через власть я обретаю победу.'}</p>
                <p>${'Через победу мои оковы разорвутся.'}</p>
                <p>${'Сила освободит меня.'}</p>
            </div>
        `);
    }

    _consumeForDarkness() {
        const hasHolocron = this.player.inventory.find(i => i.id === 'sith_holocron' && i.amount > 0);
        if (!hasHolocron) return; //Предохранитель от двойного клика

        this.player.removeItem('sith_holocron', 1);
        this.player.modifyAlignment(-150);
        this.player.save();
        this.onRender();

        Modals.alert('Углубление Тьмы',
            `<div style="color:#e74c3c;text-align:center;">${'Вы оставили Холокрон в архивах Академии. Ваша ненависть стала еще сильнее (-150 Тьмы).'}</div>`
        );
    }
}
