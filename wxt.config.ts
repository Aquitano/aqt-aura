import { defineConfig } from 'wxt';

export default defineConfig({
    modules: ['@wxt-dev/module-react'],
    manifest: {
        permissions: ['storage'],
        host_permissions: ['*://www.youtube.com/*', '*://m.youtube.com/*'],
        name: 'AQT Aura',
        description: "AQT Aura - Reclaim your digital space.",
        version: '1.0.0',
    },
});
