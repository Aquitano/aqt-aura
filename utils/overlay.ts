import { safeQuerySelector } from './dom';
import { PlaybackManager } from './playback';

const OVERLAY_ID = 'aqt-speed-overlay';
const MENU_ID = 'aqt-speed-menu';
const SLIDER_CSS_ID = 'aqt-slider-css';

const MIN_SPEED = 0.25;
const MAX_SPEED = 16;
const SLIDER_MAX = 3;
const SPEED_STEP = 0.25;
const DEFAULT_SPEED = 1;

const MENU_HIDE_DELAY_MS = 300;
const MENU_TRANSITION_MS = 200;

const SLIDER_CSS = `
    .aqt-speed-slider {
        -webkit-appearance: none;
        width: 120px;
        height: 4px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        outline: none;
        cursor: pointer;
    }
    .aqt-speed-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        background: #fff;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 0 2px rgba(0,0,0,0.1);
        transition: transform 0.1s;
    }
    .aqt-speed-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
    }
`;

export class OverlayManager {
    private readonly playbackManager: PlaybackManager;
    private container: HTMLElement | null = null;
    private speedText: HTMLElement | null = null;
    private menu: HTMLElement | null = null;
    private sliderElement: HTMLInputElement | null = null;
    private menuTimeout: ReturnType<typeof setTimeout> | undefined;
    private controlsObserver: MutationObserver | null = null;
    private bodyObserver: MutationObserver | null = null;

    constructor(playbackManager: PlaybackManager) {
        this.playbackManager = playbackManager;
    }

    initialize(): void {
        this.injectOverlay();
        this.startObserving();
        this.syncWithVideo();
    }

    destroy(): void {
        this.clearMenuTimeout();
        this.controlsObserver?.disconnect();
        this.bodyObserver?.disconnect();
        this.container?.remove();
        document.getElementById(SLIDER_CSS_ID)?.remove();
    }

    private injectSliderStyles(): void {
        if (document.getElementById(SLIDER_CSS_ID)) {
            return;
        }

        const style = document.createElement('style');
        style.id = SLIDER_CSS_ID;
        style.textContent = SLIDER_CSS;
        document.head.appendChild(style);
    }

    private syncWithVideo(): void {
        const attachVideoListener = (video: HTMLVideoElement) => {
            video.addEventListener('ratechange', () => {
                this.updateDisplay(video.playbackRate);
            });
            this.updateDisplay(video.playbackRate);
        };

        const video = safeQuerySelector<HTMLVideoElement>('video');
        if (video) {
            attachVideoListener(video);
        }

        document.addEventListener('yt-navigate-finish', () => {
            const newVideo = safeQuerySelector<HTMLVideoElement>('video');
            if (newVideo) {
                attachVideoListener(newVideo);
            }
            this.injectOverlay();
        });
    }

    private injectOverlay(): void {
        if (document.getElementById(OVERLAY_ID)) {
            return;
        }

        const rightControls = safeQuerySelector('.ytp-right-controls');
        if (!rightControls) {
            return;
        }

        try {
            this.createContainer();
            this.createSpeedText();
            this.createMenu();
            this.attachInteractionListeners();

            if (this.container) {
                rightControls.prepend(this.container);
            }
        } catch (error) {
            console.error('[AQT] Failed to inject overlay:', error);
        }
    }

    private createContainer(): void {
        this.container = document.createElement('div');
        this.container.id = OVERLAY_ID;
        Object.assign(this.container.style, {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            height: '100%',
            verticalAlign: 'top',
            minWidth: '40px',
            marginRight: '8px',
            zIndex: '6000',
        });
    }

    private createSpeedText(): void {
        this.speedText = document.createElement('span');
        this.speedText.textContent = '1.0x';
        this.speedText.className = 'ytp-button';
        this.speedText.title = 'Click to reset, Scroll to change';
        Object.assign(this.speedText.style, {
            fontSize: '109%',
            fontWeight: 'bold',
            lineHeight: '1',
            cursor: 'pointer',
            textAlign: 'center',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            border: 'none',
            background: 'none',
        });
        this.container?.appendChild(this.speedText);
    }

    private createMenu(): void {
        this.menu = document.createElement('div');
        this.menu.id = MENU_ID;
        Object.assign(this.menu.style, {
            display: 'none',
            position: 'absolute',
            bottom: '49px',
            left: '50%',
            transform: 'translateX(-50%) translateY(8px)',
            backgroundColor: 'rgba(20, 20, 20, 0.9)',
            borderRadius: '24px',
            padding: '8px 16px',
            zIndex: '7000',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            transition: 'opacity 0.2s cubic-bezier(0.2, 0, 0.2, 1), transform 0.2s cubic-bezier(0.2, 0, 0.2, 1)',
            opacity: '0',
            pointerEvents: 'none',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.08)',
            alignItems: 'center',
            gap: '12px',
        });

        const resetBtn = this.createResetButton();
        this.menu.appendChild(resetBtn);

        this.sliderElement = this.createSlider();
        this.menu.appendChild(this.sliderElement);

        this.container?.appendChild(this.menu);
    }

    private createResetButton(): HTMLElement {
        const resetBtn = document.createElement('div');
        resetBtn.textContent = '↺';
        resetBtn.title = 'Reset to 1.0x';
        Object.assign(resetBtn.style, {
            cursor: 'pointer',
            fontSize: '16px',
            color: '#aaa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s',
        });

        resetBtn.addEventListener('mouseenter', () => {
            resetBtn.style.color = '#fff';
        });
        resetBtn.addEventListener('mouseleave', () => {
            resetBtn.style.color = '#aaa';
        });
        resetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.playbackManager.setSpeed(DEFAULT_SPEED);
        });

        return resetBtn;
    }

    private createSlider(): HTMLInputElement {
        this.injectSliderStyles();

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = String(MIN_SPEED);
        slider.max = String(SLIDER_MAX);
        slider.step = '0.05';
        slider.value = String(DEFAULT_SPEED);
        slider.className = 'aqt-speed-slider';

        slider.addEventListener('input', (e) => {
            e.stopPropagation();
            const target = e.target as HTMLInputElement;
            const value = Number.parseFloat(target.value);
            if (Number.isFinite(value)) {
                this.playbackManager.setSpeed(value);
                this.showMenu();
            }
        });

        return slider;
    }

    private attachInteractionListeners(): void {
        if (!this.container || !this.speedText) {
            return;
        }

        this.container.addEventListener('mouseenter', () => this.showMenu());
        this.container.addEventListener('mouseleave', () => this.scheduleHideMenu());

        this.speedText.addEventListener('click', (e) => {
            e.stopPropagation();
            this.playbackManager.setSpeed(DEFAULT_SPEED);
        });

        this.container.addEventListener(
            'wheel',
            (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleWheelEvent(e);
            },
            { passive: false },
        );
    }

    private handleWheelEvent(e: WheelEvent): void {
        const video = safeQuerySelector<HTMLVideoElement>('video');
        if (!video) {
            return;
        }

        const current = video.playbackRate;
        const direction = e.deltaY > 0 ? -1 : 1;
        let newSpeed = current + direction * SPEED_STEP;
        newSpeed = Math.max(MIN_SPEED, Math.min(newSpeed, MAX_SPEED));
        newSpeed = Math.round(newSpeed * 100) / 100;

        this.playbackManager.setSpeed(newSpeed);
    }

    private showMenu(): void {
        this.clearMenuTimeout();

        if (!this.menu) {
            return;
        }

        const isHidden = this.menu.style.display === 'none' || this.menu.style.display === '';

        if (isHidden) {
            this.menu.style.display = 'flex';
            this.menu.style.pointerEvents = 'auto';
            requestAnimationFrame(() => {
                if (this.menu) {
                    this.menu.style.opacity = '1';
                    this.menu.style.transform = 'translateX(-50%) translateY(0)';
                }
            });
        } else {
            this.menu.style.opacity = '1';
        }
    }

    private scheduleHideMenu(): void {
        this.menuTimeout = setTimeout(() => {
            this.hideMenu();
        }, MENU_HIDE_DELAY_MS);
    }

    private hideMenu(): void {
        if (!this.menu) {
            return;
        }

        this.menu.style.opacity = '0';
        this.menu.style.transform = 'translateX(-50%) translateY(8px)';
        this.menu.style.pointerEvents = 'none';

        setTimeout(() => {
            if (this.menu?.style.opacity === '0') {
                this.menu.style.display = 'none';
            }
        }, MENU_TRANSITION_MS);
    }

    private clearMenuTimeout(): void {
        if (this.menuTimeout !== undefined) {
            clearTimeout(this.menuTimeout);
            this.menuTimeout = undefined;
        }
    }

    private updateDisplay(speed: number): void {
        if (this.speedText) {
            const displayText = speed % 1 === 0 ? speed.toFixed(0) : speed.toFixed(2);
            this.speedText.textContent = `${displayText}x`;
        }

        if (this.sliderElement && document.activeElement !== this.sliderElement) {
            this.sliderElement.value = speed.toString();
        }
    }

    private startObserving(): void {
        this.controlsObserver = new MutationObserver(() => {
            this.injectOverlay();
        });

        const controls = safeQuerySelector('.ytp-right-controls');
        if (controls) {
            const parent = controls.parentElement ?? document.body;
            this.controlsObserver.observe(parent, { childList: true, subtree: true });
        } else {
            this.bodyObserver = new MutationObserver(() => {
                const foundControls = safeQuerySelector('.ytp-right-controls');
                if (foundControls && this.controlsObserver) {
                    this.injectOverlay();
                    const parent = foundControls.parentElement ?? document.body;
                    this.controlsObserver.observe(parent, { childList: true, subtree: true });
                    this.bodyObserver?.disconnect();
                    this.bodyObserver = null;
                }
            });

            if (document.body) {
                this.bodyObserver.observe(document.body, { childList: true, subtree: true });
            }
        }
    }
}
