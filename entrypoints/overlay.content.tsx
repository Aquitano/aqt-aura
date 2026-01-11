import { BlockOverlay } from '@/components/BlockOverlay';
import ReactDOM from 'react-dom/client';
import { ContentScriptContext } from 'wxt/client';

export default defineContentScript({
    matches: ['*://*/*'],
    cssInjectionMode: 'ui',

    async main(ctx) {
        let ui: any = null;

        const mountOverlay = async () => {
            if (ui) return;

            ui = await createShadowRootUi(ctx, {
                name: 'aqt-overlay',
                position: 'modal',
                zIndex: 2147483647,
                onMount: (container) => {
                    const root = ReactDOM.createRoot(container);
                    root.render(<BlockOverlay />);
                    return root;
                },
                onRemove: (root) => {
                    root?.unmount();
                }
            });
            ui.mount();
        };

        const removeOverlay = () => {
            if (ui) {
                ui.remove();
                ui = null;
            }
        };

        browser.runtime.onMessage.addListener((message) => {
            if (message.type === 'SHOW_BLOCK_OVERLAY') {
                mountOverlay();
            } else if (message.type === 'HIDE_BLOCK_OVERLAY') {
                removeOverlay();
            }
        });
    },
});
