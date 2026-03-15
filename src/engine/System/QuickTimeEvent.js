export class QuickTimeEvent {
    constructor(markerElement, speed = 1.5) {
        this.markerElement = markerElement;
        this.active = false;
        this.position = 0; // 0 to 100
        this.direction = 1; // 1 (right) or -1 (left)
        this.speed = speed; //Скорость бегунья
        this.animationFrameId = null;
    }

    start() {
        this.stop();
        this.active = true;
        this.position = 0;
        this.direction = 1;

        if (this.markerElement) this.markerElement.style.display = 'block';

        const tick = () => {
            if (!this.active) return;

            this.position += this.speed * this.direction;

            if (this.position >= 100) {
                this.position = 100;
                this.direction = -1;
            } else if (this.position <= 0) {
                this.position = 0;
                this.direction = 1;
            }

            if (this.markerElement) {
                this.markerElement.style.left = `${this.position}%`;
            }

            this.animationFrameId = requestAnimationFrame(tick);
        };

        this.animationFrameId = requestAnimationFrame(tick);
    }

    stop() {
        this.active = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    setSpeed(newSpeed) {
        this.speed = newSpeed;
    }

    getPosition() {
        return this.position;
    }
}
