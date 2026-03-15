import { Notifications } from './Notifications.js';

const USERS_STORAGE_KEY = 'sw_registered_users';

export class AuthScreen {
    constructor(onAuthSuccess) {
        console.log('AuthScreen initializing...');
        this.onAuthSuccess = onAuthSuccess;
        this.container = document.getElementById('auth-screen');
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        
        this.loginUsername = document.getElementById('login-username');
        this.loginPassword = document.getElementById('login-password');
        this.registerUsername = document.getElementById('register-username');
        this.registerPassword = document.getElementById('register-password');
        
        this.btnLogin = document.getElementById('btn-login');
        this.btnRegister = document.getElementById('btn-register');
        
        this.toRegisterLink = document.getElementById('to-register');
        this.toLoginLink = document.getElementById('to-login');

        // Race Selector
        this.raceTrack = document.getElementById('race-track');
        this.racePrev = document.getElementById('race-prev');
        this.raceNext = document.getElementById('race-next');
        this.raceNameDisplay = document.getElementById('selected-race-name');
        
        this.races = [
            'Люди', 'Чиссы', 'Вуки', "Тви'леки", 'Тогруты', 
            'Забраки', 'Хатты', 'Раса Йоды', 'Каминоанцы', 'Мон-каламари'
        ];
        this.currentRaceIndex = 0;

        // Class Selector
        this.classTrack = document.getElementById('class-track');
        this.classPrev = document.getElementById('class-prev');
        this.classNext = document.getElementById('class-next');
        this.classNameDisplay = document.getElementById('selected-class-name');

        // Accounts List
        this.accountsList = document.getElementById('existing-accounts-list');

        this.classes = [
            'Контрабандист', 'Наемник', 'Солдат'
        ];
        this.currentClassIndex = 0;
        
        this.currentStep = 1;
        this.regSteps = document.querySelectorAll('.reg-step');
        
        // Safety check: verify all critical elements exist
        const criticalElements = [
            'container', 'loginForm', 'registerForm', 'loginUsername', 'loginPassword',
            'registerUsername', 'registerPassword', 'btnLogin', 'btnRegister', 'toRegisterLink', 'toLoginLink'
        ];
        const missing = criticalElements.filter(key => !this[key]);
        if (missing.length > 0) {
            console.error('AuthScreen: Missing critical elements:', missing);
            return;
        }

        this._init();
    }

    _init() {
        console.log('AuthScreen _init running...');
        this._renderRaces();
        this._renderClasses();
        this._renderAccounts();

        this.toRegisterLink.addEventListener('click', (e) => {
            console.log('To Register clicked');
            e.preventDefault();
            this.showRegister();
        });

        this.toLoginLink.addEventListener('click', (e) => {
            console.log('To Login clicked');
            e.preventDefault();
            this.showLogin();
        });

        this.btnLogin.addEventListener('click', () => {
            console.log('Login clicked');
            this._handleLogin();
        });

        this.btnRegister.addEventListener('click', () => {
            console.log('Register clicked');
            this._handleRegister();
        });

        // Step Navigation
        document.querySelectorAll('.btn-next-step').forEach(btn => {
            btn.addEventListener('click', () => {
                const next = parseInt(btn.getAttribute('data-next'));
                console.log('Next step clicked:', next);
                if (next === 2) {
                    // Validate nickname before moving to step 2
                    const username = this.registerUsername.value.trim();
                    if (!username) {
                        Notifications.show('Пожалуйста, введите имя!', 'error');
                        return;
                    }
                    if (username.length < 3) {
                        Notifications.show('Имя должно быть не менее 3 символов!', 'error');
                        return;
                    }
                    const users = this._getUsers();
                    const exists = users.some(u => (typeof u === 'string' ? u : u.name) === username);
                    if (exists) {
                        Notifications.show('Это имя уже занято!', 'error');
                        return;
                    }
                }
                this.goToStep(next);
            });
        });

        document.querySelectorAll('.btn-prev-step').forEach(btn => {
            btn.addEventListener('click', () => {
                const prev = parseInt(btn.getAttribute('data-prev'));
                console.log('Prev step clicked:', prev);
                this.goToStep(prev);
            });
        });

        // Race Navigation
        if (this.racePrev) this.racePrev.addEventListener('click', () => this._moveRace(-1));
        if (this.raceNext) this.raceNext.addEventListener('click', () => this._moveRace(1));

        // Class Navigation
        if (this.classPrev) this.classPrev.addEventListener('click', () => this._moveClass(-1));
        if (this.classNext) this.classNext.addEventListener('click', () => this._moveClass(1));

        // Swipe support for race selector
        this._initSwipe();

        // Swipe support for class selector
        this._initClassSwipe();

        // Allow Enter key to submit
        [this.loginUsername, this.registerUsername].forEach(input => {
            if (!input) return;
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    if (this.loginForm.classList.contains('hidden')) {
                        if (this.currentStep === 1) {
                            const nextBtn = document.querySelector('#reg-step-1 .btn-next-step');
                            nextBtn?.click();
                        } else if (this.currentStep === 3) {
                            this._handleRegister();
                        }
                    } else {
                        this._handleLogin();
                    }
                }
            });
        });
        console.log('AuthScreen _init completed');
    }

    _renderAccounts() {
        if (!this.accountsList) return;
        const users = this._getUsers();
        
        if (users.length === 0) {
            this.accountsList.classList.add('hidden');
            return;
        }

        this.accountsList.classList.remove('hidden');
        this.accountsList.innerHTML = users.map(user => {
            const name = typeof user === 'string' ? user : user.name;
            const race = typeof user === 'object' ? user.race : 'Человек';
            const className = typeof user === 'object' ? user.className : 'Контрабандист';
            
            return `
                <div class="account-item" data-username="${name}">
                    <div class="account-info">
                        <span class="account-name">${name}</span>
                        <span class="account-meta">${race} • ${className}</span>
                    </div>
                    <ion-icon name="chevron-forward-outline" class="account-icon"></ion-icon>
                </div>
            `;
        }).join('');

        this.accountsList.querySelectorAll('.account-item').forEach(item => {
            item.addEventListener('click', () => {
                const username = item.getAttribute('data-username');
                this.loginUsername.value = username;
                this._handleLogin();
            });
        });
    }

    _renderRaces() {
        if (!this.raceTrack) return;
        this.raceTrack.innerHTML = this.races.map(race => `
            <div class="race-card">
                <div class="race-card-placeholder">?</div>
                <div class="race-card-name">${race}</div>
            </div>
        `).join('');
        this._updateRaceDisplay();
    }

    _moveRace(dir) {
        this.currentRaceIndex += dir;
        if (this.currentRaceIndex < 0) this.currentRaceIndex = this.races.length - 1;
        if (this.currentRaceIndex >= this.races.length) this.currentRaceIndex = 0;
        this._updateRaceDisplay();
    }

    _updateRaceDisplay() {
        if (!this.raceTrack) return;
        const offset = this.currentRaceIndex * -100;
        this.raceTrack.style.transform = `translateX(${offset}%)`;
        this.raceNameDisplay.textContent = this.races[this.currentRaceIndex];
    }

    _renderClasses() {
        if (!this.classTrack) return;
        this.classTrack.innerHTML = this.classes.map(cls => `
            <div class="race-card">
                <div class="race-card-placeholder">⚔️</div>
                <div class="race-card-name">${cls}</div>
            </div>
        `).join('');
        this._updateClassDisplay();
    }

    _moveClass(dir) {
        this.currentClassIndex += dir;
        if (this.currentClassIndex < 0) this.currentClassIndex = this.classes.length - 1;
        if (this.currentClassIndex >= this.classes.length) this.currentClassIndex = 0;
        this._updateClassDisplay();
    }

    _updateClassDisplay() {
        if (!this.classTrack) return;
        const offset = this.currentClassIndex * -100;
        this.classTrack.style.transform = `translateX(${offset}%)`;
        this.classNameDisplay.textContent = this.classes[this.currentClassIndex];
    }

    _initSwipe() {
        let touchStartX = 0;
        let touchEndX = 0;
        const slider = document.getElementById('race-slider');
        if (!slider) return;

        slider.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        slider.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this._handleSwipeGesture(touchStartX, touchEndX, (dir) => this._moveRace(dir));
        }, { passive: true });
    }

    _initClassSwipe() {
        let touchStartX = 0;
        let touchEndX = 0;
        const slider = document.getElementById('class-slider');
        if (!slider) return;

        slider.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        slider.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this._handleSwipeGesture(touchStartX, touchEndX, (dir) => this._moveClass(dir));
        }, { passive: true });
    }

    _handleSwipeGesture(start, end, callback) {
        const threshold = 50;
        if (start - end > threshold) {
            callback(1); // Swipe left -> Next
        } else if (end - start > threshold) {
            callback(-1); // Swipe right -> Prev
        }
    }

    goToStep(step) {
        this.currentStep = step;
        this.regSteps.forEach((el, idx) => {
            if (idx + 1 === step) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
    }

    showLogin() {
        this.loginForm.classList.remove('hidden');
        this.registerForm.classList.add('hidden');
    }

    showRegister() {
        this.loginForm.classList.add('hidden');
        this.registerForm.classList.remove('hidden');
        this.goToStep(1); // Always start from step 1
    }

    hide() {
        this.container.classList.add('hidden');
        document.getElementById('top-bar').classList.remove('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        document.getElementById('bottom-nav').classList.remove('hidden');
    }

    _handleLogin() {
        const username = this.loginUsername.value.trim();
        const password = this.loginPassword.value.trim();

        if (!username) {
            Notifications.show('Пожалуйста, введите имя!', 'error');
            return;
        }
        if (!password) {
            Notifications.show('Пожалуйста, введите пароль!', 'error');
            return;
        }

        // Pass to Game.js for network auth
        this.onAuthSuccess(username, password, null, null, 'login');
    }

    _handleRegister() {
        console.log('--- _handleRegister START ---');
        const username = this.registerUsername.value.trim();
        const password = this.registerPassword.value.trim();
        
        console.log('Username:', username);
        if (!username) {
            console.warn('Registration failed: Username empty');
            Notifications.show('Пожалуйста, введите имя!', 'error');
            return;
        }
        if (!password) {
            console.warn('Registration failed: Password empty');
            Notifications.show('Пожалуйста, введите пароль!', 'error');
            return;
        }

        if (username.length < 3) {
            console.warn('Registration failed: Username too short');
            Notifications.show('Имя должно быть не менее 3 символов!', 'error');
            return;
        }
        if (password.length < 4) {
            Notifications.show('Пароль слишком короткий (мин. 4 символа)!', 'error');
            return;
        }

        const selectedRace = this.races[this.currentRaceIndex];
        const selectedClass = this.classes[this.currentClassIndex];
        console.log('Selected Race:', selectedRace, 'Selected Class:', selectedClass);

        // Pass to Game.js for network auth
        this.onAuthSuccess(username, password, selectedRace, selectedClass, 'register');
        console.log('--- _handleRegister END ---');
    }

    _getUsers() {
        try {
            return JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    _saveUsers(users) {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }
}
