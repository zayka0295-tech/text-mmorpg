export class ScreenManager {
    constructor() {
        this.screens = {
            'maps-screen': document.getElementById('maps-screen'),
            'combat-screen': document.getElementById('combat-screen'),
            'inventory-screen': document.getElementById('inventory-screen'),
            'quests-screen': document.getElementById('quests-screen'),
            'chat-screen': document.getElementById('chat-screen'),
            'profile-screen': document.getElementById('profile-screen'),
            'bank-screen': document.getElementById('bank-screen'),
            'market-screen': document.getElementById('market-screen'),
            'ship-market-screen': document.getElementById('ship-market-screen'),
            'job-screen': document.getElementById('job-screen')
        };
        this.activeScreenId = 'maps-screen';

        //Паттерн Observer: храним колбеки для каждого экрана
        this.listeners = {};
    }

    //Метод для подписки на открытие определенного экрана
    subscribe(screenId, callback) {
        if (!this.listeners[screenId]) {
            this.listeners[screenId] = [];
        }
        this.listeners[screenId].push(callback);
    }

    showScreen(screenId) {
        if (!this.screens[screenId]) {
            console.error(`Screen ${screenId} not found.`);
            return;
        }

        // Hide current screen
        if (this.activeScreenId && this.screens[this.activeScreenId]) {
            this.screens[this.activeScreenId].classList.remove('active');
            this.screens[this.activeScreenId].classList.add('hidden');
        }

        // Show new screen
        this.screens[screenId].classList.remove('hidden');
        this.screens[screenId].classList.add('active');
        this.activeScreenId = screenId;

        //Сообщаем всем слушателям, что экран открыт
        if (this.listeners[screenId]) {
            this.listeners[screenId].forEach(callback => callback());
        }

        //Общий слушатель для всех экранов
        if (this.listeners['any']) {
            this.listeners['any'].forEach(callback => callback(screenId));
        }

        //Синхронизируем активное состояние кнопки нижнего меню
        const navBtns = document.querySelectorAll('#bottom-nav .nav-btn');
        navBtns.forEach(btn => {
            if (btn.getAttribute('data-target') === screenId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
}
