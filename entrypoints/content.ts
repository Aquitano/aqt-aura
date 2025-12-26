import { ElementManager } from '@/utils/element-manager';
import { OverlayManager } from '@/utils/overlay';
import { PLAYBACK_SPEED_KEY, PlaybackManager } from '@/utils/playback';
import { STORAGE_KEY } from '@/utils/youtube';

export default defineContentScript({
    matches: ['*://www.youtube.com/*', '*://m.youtube.com/*'],
    async main() {
        console.log('AQT Browser (YouTube Elements) loaded');
        const manager = new ElementManager();
        await manager.initialize();

        const playbackManager = new PlaybackManager();
        await playbackManager.initialize();

        const overlayManager = new OverlayManager(playbackManager);
        overlayManager.initialize();

        manager.applyAllElements();

        // Listen for storage changes
        browser.storage.local.onChanged.addListener((changes) => {
            if (!changes[STORAGE_KEY]) return;
            console.log('New YouTube elements settings received');

            manager.updateElements(changes[STORAGE_KEY].newValue);
        });

        browser.storage.local.onChanged.addListener((changes) => {
            if (changes[PLAYBACK_SPEED_KEY]) {
                const newSpeed = changes[PLAYBACK_SPEED_KEY].newValue;
                if (typeof newSpeed === 'number') {
                    playbackManager.setSpeed(newSpeed);
                }
            }
        });

        // Listen for navigation
        globalThis.addEventListener('popstate', () => {
            manager.updatePageType();
            manager.applyAllElements();
        });
        globalThis.addEventListener('yt-navigate-finish', () => {
            manager.updatePageType();
            manager.applyAllElements();
            playbackManager.reapply();
        });
    },
});
