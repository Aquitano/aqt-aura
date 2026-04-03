export const PLAYBACK_SPEED_KEY = 'youtube_playback_speed';
export const MIN_PLAYBACK_SPEED = 0.25;
export const MAX_PLAYBACK_SPEED = 5;
export const PLAYBACK_SPEED_STEP = 0.25;
export const DEFAULT_PLAYBACK_SPEED = 1;

const ENFORCEMENT_INTERVAL_MS = 1000;
const SPEED_TOLERANCE = 0.05;
const ATTACHED_MARKER = 'data-aqt-speed-attached';

export function normalizePlaybackSpeed(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return DEFAULT_PLAYBACK_SPEED;
    }

    return Math.max(
        MIN_PLAYBACK_SPEED,
        Math.min(MAX_PLAYBACK_SPEED, Math.round(value * 100) / 100),
    );
}

export function formatPlaybackSpeed(value: number): string {
    const normalized = normalizePlaybackSpeed(value);
    return `${Number.isInteger(normalized) ? normalized.toFixed(0) : normalized.toString()}x`;
}

export class PlaybackManager {
    private currentSpeed = DEFAULT_PLAYBACK_SPEED;
    private intervalId: ReturnType<typeof setInterval> | undefined;
    private observer: MutationObserver | null = null;
    private isInitialized = false;
    private videoCheckTimeout: ReturnType<typeof setTimeout> | null = null;
    private manualMusicOverride = false;
    private lastNavigationUrl = '';

    constructor() {
        this.setupVideoObserver();
    }

    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            const storage = await browser.storage.local.get(PLAYBACK_SPEED_KEY);
            const storedSpeed: unknown = storage[PLAYBACK_SPEED_KEY];
            this.currentSpeed = normalizePlaybackSpeed(storedSpeed);
            this.lastNavigationUrl = this.getNavigationUrl();

            if (this.shouldEnforcePlayback()) {
                this.applySpeed();
            }

            this.startEnforcement();
            this.isInitialized = true;
        } catch (error) {
            console.error('[AQT] Failed to initialize PlaybackManager:', error);
        }
    }

    setSpeed(speed: number): void {
        const validatedSpeed = normalizePlaybackSpeed(speed);
        this.currentSpeed = validatedSpeed;
        this.manualMusicOverride = this.isMusicVideo();
        this.applySpeed({ force: true });
    }

    getSpeed(): number {
        return this.currentSpeed;
    }

    reapply(): void {
        this.resetManualMusicOverrideIfNavigated();

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

        if (this.videoCheckTimeout) {
            clearTimeout(this.videoCheckTimeout);
            this.videoCheckTimeout = null;
        }

        this.observer?.disconnect();
        this.observer = null;
        this.isInitialized = false;
    }

    private getVideoElement(): HTMLVideoElement | null {
        return (
            document.querySelector<HTMLVideoElement>('video.html5-main-video') ??
            document.querySelector<HTMLVideoElement>('video')
        );
    }

    private isMusicVideo(): boolean {
        const officialArtistBadge = document.querySelector(
            'badge-shape[aria-label="Official Artist Channel"], [aria-label="Official Artist Channel"]',
        );
        if (officialArtistBadge) {
            return true;
        }

        const channelName = document.querySelector('#owner-name a')?.textContent?.trim();
        if (channelName?.endsWith(' - Topic')) {
            return true;
        }

        return false;
    }

    private shouldEnforcePlayback(): boolean {
        return !this.isMusicVideo() || this.manualMusicOverride;
    }

    private getNavigationUrl(): string {
        return globalThis.location.href;
    }

    private resetManualMusicOverrideIfNavigated(): void {
        const currentUrl = this.getNavigationUrl();
        if (currentUrl === this.lastNavigationUrl) {
            return;
        }

        this.lastNavigationUrl = currentUrl;
        this.manualMusicOverride = false;
    }

    private applySpeed(options?: { force?: boolean }): void {
        const video = this.getVideoElement();
        if (!video) return;

        if (!options?.force && !this.shouldEnforcePlayback()) return;

        if (Math.abs(video.playbackRate - this.currentSpeed) > SPEED_TOLERANCE) {
            try {
                video.playbackRate = this.currentSpeed;
            } catch {
                // Ignore
            }
        }
    }

    private startEnforcement(): void {
        if (this.intervalId !== undefined) {
            clearInterval(this.intervalId);
        }

        this.intervalId = setInterval(() => {
            if (this.shouldEnforcePlayback()) {
                this.applySpeed();
            }
        }, ENFORCEMENT_INTERVAL_MS);
    }

    private setupVideoObserver(): void {
        this.observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length === 0) continue;

                if (this.videoCheckTimeout) {
                    clearTimeout(this.videoCheckTimeout);
                }

                this.videoCheckTimeout = setTimeout(() => {
                    const video = this.getVideoElement();
                    if (video) {
                        this.attachVideoListeners(video);
                        this.applySpeed();
                    }
                    this.videoCheckTimeout = null;
                }, 100);
                break;
            }
        });

        if (document.body) {
            this.observer.observe(document.body, {
                childList: true,
                subtree: true,
            });
        }

        const video = this.getVideoElement();
        if (video) {
            this.attachVideoListeners(video);
        }
    }

    private attachVideoListeners(video: HTMLVideoElement): void {
        if (video.hasAttribute(ATTACHED_MARKER)) return;
        video.setAttribute(ATTACHED_MARKER, 'true');

        video.addEventListener('ratechange', () => {
            if (!this.shouldEnforcePlayback()) return;

            if (Math.abs(video.playbackRate - this.currentSpeed) > SPEED_TOLERANCE) {
                this.applySpeed();
            }
        });

        this.applySpeed();
    }
}
