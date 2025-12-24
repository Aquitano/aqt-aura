
import { ElementManager } from "@/utils/element-manager";
import { STORAGE_KEY } from "@/utils/youtube";

export default defineContentScript({
    matches: ["*://www.youtube.com/*", "*://m.youtube.com/*"],
    async main() {
        console.log("AQT Browser (YouTube Elements) loaded");
        const manager = new ElementManager();
        await manager.initialize();

        manager.applyAllElements();

        // Listen for storage changes
        browser.storage.local.onChanged.addListener((changes) => {
            if (!changes[STORAGE_KEY]) return;
            console.log("New YouTube elements settings received");

            manager.updateElements(changes[STORAGE_KEY].newValue);
        });

        // Listen for navigation
        globalThis.addEventListener("popstate", () => manager.applyAllElements());
        globalThis.addEventListener("yt-navigate-finish", () => manager.applyAllElements());
    },
});
