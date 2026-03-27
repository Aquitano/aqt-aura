import { defineConfig } from 'wxt';

export default defineConfig({
    modules: ['@wxt-dev/module-react'],
    manifest: {
        permissions: ['storage', 'tabs'],
        host_permissions: [
            '*://www.youtube.com/*',
            '*://m.youtube.com/*',
            '*://*/*',
            '*://www.goodreads.com/book/*',
            '*://hardcover.app/*',
            '*://app.thestorygraph.com/*',
            '*://www.thestorygraph.com/*',
        ],
        name: 'AQT Aura',
        description: 'AQT Aura - Reclaim your digital space.',
        version: '1.0.0',
    },
});
