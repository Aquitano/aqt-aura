import { PlaybackManager } from './playback';

export class OverlayManager {
    private playbackManager: PlaybackManager;
    private container: HTMLElement | null = null;
    private speedText: HTMLElement | null = null;
    private observer: MutationObserver | null = null;
    private menu: HTMLElement | null = null;
    private menuTimeout: number | undefined;

    private sliderElement: HTMLInputElement | null = null;

    constructor(playbackManager: PlaybackManager) {
        this.playbackManager = playbackManager;
    }

    public initialize() {
        this.injectOverlay();
        this.startObserving();
        this.syncWithVideo();
    }

    // ... (existing methods)

    private injectSliderStyles() {
        if (document.getElementById('aqt-slider-css')) return;
        const style = document.createElement('style');
        style.id = 'aqt-slider-css';
        style.innerHTML = `
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
        document.head.appendChild(style);
    }

    private syncWithVideo() {
        const video = document.querySelector('video');
        if (video) {
            video.addEventListener('ratechange', () => {
                this.updateDisplay(video.playbackRate);
            });
            this.updateDisplay(video.playbackRate);
        }

        // Also watch for new videos
        document.addEventListener('yt-navigate-finish', () => {
            const v = document.querySelector('video');
            if (v) {
                this.updateDisplay(v.playbackRate);
                v.addEventListener('ratechange', () => this.updateDisplay(v.playbackRate));
            }
            this.injectOverlay(); // Re-inject if lost
        });
    }

    private injectOverlay() {
        if (document.getElementById('aqt-speed-overlay')) return;

        const rightControls = document.querySelector('.ytp-right-controls');
        if (!rightControls) return;

        // Create Container
        this.container = document.createElement('div');
        this.container.id = 'aqt-speed-overlay';
        // Do NOT use ytp-button class on the container as it likely has overflow: hidden
        Object.assign(this.container.style, {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            height: '100%',
            verticalAlign: 'top',
            minWidth: '40px',
            marginRight: '8px', // Spacing from other controls
            zIndex: '6000', // High z-index to sit above potential overlays?
        });

        // Text Button (The visible part)
        this.speedText = document.createElement('span');
        this.speedText.innerText = '1.0x';
        this.speedText.className = 'ytp-button'; // Apply styling here if needed, or manual style
        Object.assign(this.speedText.style, {
            fontSize: '109%',
            fontWeight: 'bold',
            lineHeight: '1',
            cursor: 'pointer',
            textAlign: 'center',
            color: '#fff', // Ensure visible
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            border: 'none',
            background: 'none',
        });
        this.speedText.title = 'Click to reset, Scroll to change';
        this.container.appendChild(this.speedText);

        // --- Menu (Horizontal Slider) ---
        this.menu = document.createElement('div');
        this.menu.id = 'aqt-speed-menu';
        Object.assign(this.menu.style, {
            display: 'none',
            position: 'absolute',
            bottom: '49px',
            left: '50%',
            transform: 'translateX(-50%) translateY(8px)', // Start slightly lower for pop up effect
            backgroundColor: 'rgba(20, 20, 20, 0.9)',
            borderRadius: '24px', // Pill shape
            padding: '8px 16px',
            zIndex: '7000',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            transition: 'opacity 0.2s cubic-bezier(0.2, 0, 0.2, 1), transform 0.2s cubic-bezier(0.2, 0, 0.2, 1)',
            opacity: '0',
            pointerEvents: 'none',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.08)',
            // display: 'flex', // Handled by showMenu toggling from none to flex
            alignItems: 'center',
            gap: '12px',
        });

        // 1. Reset Button (Icon)
        const resetBtn = document.createElement('div');
        resetBtn.innerHTML = '↺'; // Or SVG icon
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
        resetBtn.addEventListener('mouseenter', () => (resetBtn.style.color = '#fff'));
        resetBtn.addEventListener('mouseleave', () => (resetBtn.style.color = '#aaa'));
        resetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.playbackManager.setSpeed(1);
        });
        this.menu.appendChild(resetBtn);

        // 2. Slider Input
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0.25';
        slider.max = '3'; // Logical range for a slider. 5x is too long? Let's go to 3, maybe extend if needed.
        slider.step = '0.05';
        slider.value = '1';

        // Custom styling for slider is tricky in JS, usually needs CSS classes.
        // We'll apply basic inline styles and use a style tag for pseudo-elements if needed,
        // or just rely on basic appearance for now, refining later.
        // Let's inject a specialized style block for this slider into the head to make it beautiful.
        this.injectSliderStyles();

        slider.className = 'aqt-speed-slider';

        // Sync slider -> playback
        slider.addEventListener('input', (e) => {
            e.stopPropagation();
            const val = parseFloat((e.target as HTMLInputElement).value);
            this.playbackManager.setSpeed(val);
            // Keep menu open while dragging
            this.showMenu(true);
        });

        // Sync playback -> slider
        // This is handled via syncWithVideo updateDisplay, we need to update slider value too.
        // We'll attach specific listeners later or in the main loop.
        // Let's attach a property to this instance so we can update it.
        this.sliderElement = slider;

        this.menu.appendChild(slider);

        this.container.appendChild(this.menu);

        // --- Interaction Listeners ---

        // Hover to show menu
        this.container.addEventListener('mouseenter', () => this.showMenu());
        this.container.addEventListener('mouseleave', () => this.scheduleHideMenu());

        // Click Text to Reset
        this.speedText.addEventListener('click', (e) => {
            e.stopPropagation(); // Don't want bubbling to weird places
            this.playbackManager.setSpeed(1);
        });

        // Scroll to Change
        this.container.addEventListener(
            'wheel',
            (e) => {
                e.preventDefault();
                e.stopPropagation();

                const video = document.querySelector('video');
                if (!video) return;

                let current = video.playbackRate;
                const direction = e.deltaY > 0 ? -1 : 1;
                const step = 0.25;
                let newSpeed = current + direction * step;
                newSpeed = Math.max(0.25, Math.min(newSpeed, 16));
                newSpeed = Math.round(newSpeed * 100) / 100;

                this.playbackManager.setSpeed(newSpeed);
            },
            { passive: false },
        );

        rightControls.prepend(this.container);
    }

    private showMenu(keepOpen = false) {
        if (this.menuTimeout) globalThis.clearTimeout(this.menuTimeout);
        if (this.menu) {
            if (this.menu.style.display !== 'flex') {
                this.menu.style.display = 'flex';
                this.menu.style.pointerEvents = 'auto';
                // Slight delay to allow display:block to apply before opacity transition
                requestAnimationFrame(() => {
                    if (this.menu) {
                        this.menu.style.opacity = '1';
                        this.menu.style.transform = 'translateX(-50%) translateY(0)';
                    }
                });
            } else {
                if (this.menu) this.menu.style.opacity = '1'; // Ensure visible overrides any hide
            }
        }
    }

    private scheduleHideMenu() {
        this.menuTimeout = globalThis.setTimeout(() => {
            this.hideMenu();
        }, 300) as unknown as number;
    }

    private hideMenu() {
        if (this.menu) {
            this.menu.style.opacity = '0';
            this.menu.style.transform = 'translateX(-50%) translateY(8px)'; // Slide down slightly
            this.menu.style.pointerEvents = 'none';
            // Wait for transition
            setTimeout(() => {
                if (this.menu && this.menu.style.opacity === '0') {
                    this.menu.style.display = 'none';
                }
            }, 200);
        }
    }

    private updateDisplay(speed: number) {
        if (this.speedText) {
            this.speedText.innerText = speed.toFixed(speed % 1 === 0 ? 0 : 2) + 'x';
        }
        const slider = (this as any).sliderElement as HTMLInputElement;
        if (slider) {
            // Only update if not currently being dragged?
            // Actually standard inputs handle this well usually, or we can check focus.
            // If the user is dragging, the 'input' event fires and sets speed.
            // If the user uses controls (e.g. keybinds), we want the slider to move.
            // If the value is close, don't update to avoid jitter during drag loop?
            if (document.activeElement !== slider) {
                slider.value = speed.toString();
            }
        }
    }

    private startObserving() {
        // Observe control bar to re-inject if cleared
        const observer = new MutationObserver(() => {
            this.injectOverlay();
        });

        const controls = document.querySelector('.ytp-right-controls');
        if (controls) {
            observer.observe(controls.parentElement || document.body, { childList: true, subtree: true });
        } else {
            // If controls not found yet, observe body until found
            const bodyObserver = new MutationObserver(() => {
                const c = document.querySelector('.ytp-right-controls');
                if (c) {
                    this.injectOverlay();
                    observer.observe(c.parentElement || document.body, { childList: true, subtree: true });
                    bodyObserver.disconnect();
                }
            });
            bodyObserver.observe(document.body, { childList: true, subtree: true });
        }
    }
}
