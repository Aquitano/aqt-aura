export const PLAYBACK_SPEED_KEY = 'youtube_playback_speed';

/** Speed enforcement interval in milliseconds */
const ENFORCEMENT_INTERVAL_MS = 1000;

/** Tolerance for speed comparison to avoid floating point issues */
const SPEED_TOLERANCE = 0.05;

/** Speed bounds */
const MIN_SPEED = 0.25;
const MAX_SPEED = 16;
const DEFAULT_SPEED = 1;

/** Data attribute to mark videos with attached listeners */
const ATTACHED_MARKER = 'data-aqt-speed-attached';

/**
 * Manages video playback speed with persistence and enforcement.
 * Handles YouTube's attempts to reset playback speed.
 */
export class PlaybackManager {
    private currentSpeed = DEFAULT_SPEED;
    private intervalId: ReturnType<typeof setInterval> | undefined;
    private observer: MutationObserver | null = null;
    private isInitialized = false;

    constructor() {
        this.setupVideoObserver();
    }

    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            const storage = await browser.storage.local.get(PLAYBACK_SPEED_KEY);
            const storedSpeed: unknown = storage[PLAYBACK_SPEED_KEY];

            this.currentSpeed = this.validateSpeed(storedSpeed);
            this.applySpeed();
            this.startEnforcement();
            this.isInitialized = true;
        } catch (error) {
            console.error('[AQT] Failed to initialize PlaybackManager:', error);
        }
    }

    setSpeed(speed: number): void {
        const validatedSpeed = this.validateSpeed(speed);
        this.currentSpeed = validatedSpeed;
        this.applySpeed();
    }

    getSpeed(): number {
        return this.currentSpeed;
    }

    /**
     * Re-applies speed settings, useful after navigation.
     */
    reapply(): void {
        const video = this.getVideoElement();
        if (video) {
            this.attachVideoListeners(video);
            this.applySpeed();
        }
    }

    destroy(): void {
        if (this.intervalId !== undefined) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
        this.observer?.disconnect();
        this.observer = null;
        this.isInitialized = false;
    }

    private validateSpeed(value: unknown): number {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            return DEFAULT_SPEED;
        }
        return Math.max(MIN_SPEED, Math.min(MAX_SPEED, Math.round(value * 100) / 100));
    }

    /**
     * Gets the main video element on the page.
     */
    private getVideoElement(): HTMLVideoElement | null {
        return (
            document.querySelector<HTMLVideoElement>('video.html5-main-video') ??
            document.querySelector<HTMLVideoElement>('video')
        );
    }

    private applySpeed(): void {
        const video = this.getVideoElement();
        if (!video) {
            return;
        }

        // Only apply if speed differs significantly to avoid feedback loops
        if (Math.abs(video.playbackRate - this.currentSpeed) > SPEED_TOLERANCE) {
            try {
                video.playbackRate = this.currentSpeed;
            } catch {
                // Some videos may not support speed changes
            }
        }
    }

    /**
     * Starts periodic speed enforcement to counter YouTube resets.
     */
    private startEnforcement(): void {
        if (this.intervalId !== undefined) {
            clearInterval(this.intervalId);
        }

        this.intervalId = setInterval(() => {
            this.applySpeed();
        }, ENFORCEMENT_INTERVAL_MS);
    }

    private setupVideoObserver(): void {
        this.observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length === 0) {
                    continue;
                }

                const video = this.getVideoElement();
                if (video) {
                    this.attachVideoListeners(video);
                    this.applySpeed();
                    break;
                }
            }
        });

        // Start observing once body is available
        if (document.body) {
            this.observer.observe(document.body, {
                childList: true,
                subtree: true,
            });
        }

        // Try initial attach for already-loaded videos
        const video = this.getVideoElement();
        if (video) {
            this.attachVideoListeners(video);
        }
    }

    private attachVideoListeners(video: HTMLVideoElement): void {
        // Prevent duplicate listener attachment
        if (video.hasAttribute(ATTACHED_MARKER)) {
            return;
        }
        video.setAttribute(ATTACHED_MARKER, 'true');

        video.addEventListener('ratechange', () => {
            // Re-enforce speed if YouTube tried to change it
            if (Math.abs(video.playbackRate - this.currentSpeed) > SPEED_TOLERANCE) {
                this.applySpeed();
            }
        });

        this.applySpeed();
    }
}
