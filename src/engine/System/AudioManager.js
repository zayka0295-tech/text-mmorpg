export class AudioManager {
    constructor() {
        this.bgMusic = new Audio();
        this.bgMusic.loop = true;
        this.bgMusic.volume = 0.4;
        this.isEnabled = localStorage.getItem('sw_audio_enabled') !== 'false';
        
        this.planetTracks = {
            'tatooine': '/public/assets/audio/tatooine_theme.mp3',
            'coruscant': '/public/assets/audio/coruscant_theme.mp3',
            'dantooine': '/public/assets/audio/dantooine_theme.mp3',
            'korriban': '/public/assets/audio/korriban_theme.mp3'
        };
        
        this.currentPlanet = null;
    }

    toggle() {
        this.isEnabled = !this.isEnabled;
        localStorage.setItem('sw_audio_enabled', this.isEnabled);
        
        if (this.isEnabled) {
            if (this.currentPlanet) {
                const trackUrl = this.planetTracks[this.currentPlanet];
                if (trackUrl) {
                    this.bgMusic.src = trackUrl;
                    this.bgMusic.play().catch(e => {});
                }
            }
        } else {
            this.bgMusic.pause();
        }
        return this.isEnabled;
    }

    playPlanetMusic(planetId) {
        if (!this.isEnabled) {
            this.currentPlanet = planetId;
            return;
        }

        if (this.currentPlanet === planetId && !this.bgMusic.paused) return;

        const trackUrl = this.planetTracks[planetId];
        if (!trackUrl) {
            this.bgMusic.pause();
            this.currentPlanet = planetId;
            return;
        }
        
        // Если трек тот же самый, ничего не делаем
        if (this.bgMusic.src.includes(trackUrl) && !this.bgMusic.paused) {
            this.currentPlanet = planetId;
            return;
        }

        this.bgMusic.src = trackUrl;
        this.bgMusic.play().catch(e => {
            console.log("Автовоспроизведение заблокировано браузером.");
        });
        
        this.currentPlanet = planetId;
    }

    playSfx(url, volume = 0.5) {
        if (!this.isEnabled) return;
        const sfx = new Audio(url);
        sfx.volume = volume;
        sfx.play().catch(e => {});
    }
}
