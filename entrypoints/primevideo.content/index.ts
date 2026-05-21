import './style.css';

export default defineContentScript({
    matches: [
        '*://*.amazon.com/*',
        '*://*.amazon.de/*',
        '*://*.primevideo.com/*',
    ],
    runAt: 'document_idle',

    main() {
        console.log('[AQT] Prime Video script injected');
    },
});
