import { ElementManager } from '@/utils/element-manager';
import { OverlayManager } from '@/utils/overlay';
import { PLAYBACK_SPEED_KEY, PlaybackManager } from '@/utils/playback';
import { STORAGE_KEY } from '@/utils/youtube';

export default defineContentScript({
    matches: ['*://www.youtube.com/*', '*://m.youtube.com/*'],

    async main() {
        try {
            const elementManager = new ElementManager();
            const playbackManager = new PlaybackManager();

            await Promise.all([elementManager.initialize(), playbackManager.initialize()]);

            const overlayManager = new OverlayManager(playbackManager);
            overlayManager.initialize();

            elementManager.applyAllElements();
            setupStorageListeners(elementManager, playbackManager);
            setupNavigationListeners(elementManager, playbackManager);
        } catch (error) {
            console.error('[AQT] Failed to initialize content script:', error);
        }
    },
});

/**
 * Sets up listeners for storage changes to react to settings updates.
 */
function setupStorageListeners(elementManager: ElementManager, playbackManager: PlaybackManager): void {
    browser.storage.local.onChanged.addListener((changes) => {
        try {
            if (changes[STORAGE_KEY]?.newValue !== undefined) {
                elementManager.updateElements(changes[STORAGE_KEY].newValue);
            }

            if (changes[PLAYBACK_SPEED_KEY]?.newValue !== undefined) {
                const newSpeed: unknown = changes[PLAYBACK_SPEED_KEY].newValue;
                if (typeof newSpeed === 'number' && Number.isFinite(newSpeed)) {
                    playbackManager.setSpeed(newSpeed);
                }
            }
        } catch (error) {
            console.error('[AQT] Error handling storage change:', error);
        }
    });
}

function setupNavigationListeners(elementManager: ElementManager, playbackManager: PlaybackManager): void {
    const handleNavigation = () => {
        try {
            elementManager.updatePageType();
            elementManager.applyAllElements();
            playbackManager.reapply();
        } catch (error) {
            console.error('[AQT] Error handling navigation:', error);
        }
    };

    // Browser back/forward navigation
    globalThis.addEventListener('popstate', handleNavigation);

    // YouTube's custom navigation event
    globalThis.addEventListener('yt-navigate-finish', handleNavigation);
}
