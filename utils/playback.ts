export const PLAYBACK_SPEED_KEY = 'youtube_playback_speed';

export class PlaybackManager {
    private currentSpeed: number = 1;
    private intervalId: number | undefined;

    constructor() {
        this.observeVideo();
    }

    public async initialize() {
        // Load initial speed
        const storage = await browser.storage.local.get(PLAYBACK_SPEED_KEY);
        this.currentSpeed = (storage[PLAYBACK_SPEED_KEY] as number) || 1;
        console.log('[AQT] PlaybackManager initialized with speed:', this.currentSpeed);
        this.applySpeed();

        // Start a fallback interval to enforce speed periodically
        // This helps when YouTube resets the player state internally without DOM changes
        this.startEnforcement();
    }

    public setSpeed(speed: number) {
        console.log('[AQT] Setting speed to:', speed);
        this.currentSpeed = speed;
        this.applySpeed();
    }

    private getVideoElement(): HTMLVideoElement | null {
        return document.querySelector('video.html5-main-video') || document.querySelector('video');
    }

    private applySpeed() {
        const video = this.getVideoElement();
        if (video) {
            // Only apply if different to avoid spamming / fighting loops
            if (Math.abs(video.playbackRate - this.currentSpeed) > 0.05) {
                console.log(`[AQT] Applying speed ${this.currentSpeed}x to`, video);
                video.playbackRate = this.currentSpeed;
            }
        } else {
            console.log('[AQT] No video element found to apply speed');
        }
    }

    private startEnforcement() {
        if (this.intervalId) globalThis.clearInterval(this.intervalId);

        this.intervalId = globalThis.setInterval(() => {
            this.applySpeed();
        }, 1000) as unknown as number; // Check every second
    }

    private observeVideo() {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length) {
                    const video = this.getVideoElement();
                    if (video) {
                        this.attachVideoListeners(video);

                        this.applySpeed();
                    }
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Try initial attach
        const video = this.getVideoElement();
        if (video) this.attachVideoListeners(video);
    }

    private attachVideoListeners(video: HTMLVideoElement) {
        if (!video) return;

        // Ensure we don't attach duplicate listeners if we call this multiple times
        if (video.dataset.aqtSpeedAttached) return;
        video.dataset.aqtSpeedAttached = 'true';
        console.log('[AQT] Attached listeners to video element');

        video.addEventListener('ratechange', () => {
            if (Math.abs(video.playbackRate - this.currentSpeed) > 0.1) {
                console.log(`[AQT] Detected rate change to ${video.playbackRate}, re-enforcing ${this.currentSpeed}`);
                this.applySpeed();
            }
        });

        this.applySpeed();
    }

    public reapply() {
        console.log('[AQT] Re-applying speed logic manually');
        const video = this.getVideoElement();
        if (video) {
            this.attachVideoListeners(video);
            this.applySpeed();
        }
    }
}
