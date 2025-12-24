import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['storage'],
    host_permissions: ['*://www.youtube.com/*', '*://m.youtube.com/*'],
    name: 'AQT Browser',
    description: "AQT Browser - Customize your web experience.",
    version: '2.0.0',
  },
});
