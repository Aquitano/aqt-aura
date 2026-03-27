import {
    buildSearchQuery,
    buildSourceUrl,
    CHIP_ATTR,
    CHIP_CLASS,
    CHIPS_WRAP_ATTR,
    DEFAULT_GOODLIB_SETTINGS,
    findFirstMatch,
    findFirstMatchText,
    getCurrentSite,
    getCurrentSiteConfig,
    getEnabledSources,
    GOODLIB_STORAGE_KEY,
    isAnySourceEnabled,
    isLightThemeSite,
    isSupportedBookPage,
    mergeSettings,
    normalizeText,
    resetSiteCache,
    SOURCE_META,
    type GoodlibSettings,
    type SourceKey,
} from '@/utils/goodreads';
import './style.css';

export default defineContentScript({
    matches: [
        'https://www.goodreads.com/book/*',
        'https://hardcover.app/*',
        'https://app.thestorygraph.com/*',
        'https://www.thestorygraph.com/*',
    ],
    runAt: 'document_idle',

    main() {
        if (!isSupportedBookPage()) return;

        let settings: GoodlibSettings = { ...DEFAULT_GOODLIB_SETTINGS };
        let lastUrl = window.location.href;
        let pendingUpdate: number | null = null;
        let observer: MutationObserver | null = null;
        let cachedTitleElement: WeakRef<HTMLElement> | null = null;
        let cachedSearchQuery: string | null = null;

        function getTitleElement(): HTMLElement | null {
            const cached = cachedTitleElement?.deref();
            if (cached?.isConnected) return cached;

            const config = getCurrentSiteConfig();
            if (!config) return null;

            const site = getCurrentSite();

            // Hardcover: verify title by checking for author link nearby
            if (site === 'hardcover') {
                for (const selector of config.titleSelectors) {
                    const nodes = document.querySelectorAll(selector);
                    for (const node of nodes) {
                        if (!(node instanceof HTMLElement)) continue;
                        if (!node.textContent?.trim()) continue;

                        const authorLink = node.parentElement?.querySelector('a[href^="/authors/"]');
                        if (authorLink) {
                            cachedTitleElement = new WeakRef(node);
                            return node;
                        }
                    }
                }
                return null;
            }

            const el = findFirstMatch(config.titleSelectors);
            if (el) {
                cachedTitleElement = new WeakRef(el);
            }
            return el;
        }

        function getCleanBookTitle(titleEl: HTMLElement): string {
            const wrapper = titleEl.querySelector(`[${CHIPS_WRAP_ATTR}]`);
            if (!wrapper) {
                return normalizeText(titleEl.textContent ?? '');
            }

            const clone = titleEl.cloneNode(true) as HTMLElement;
            clone.querySelector(`[${CHIPS_WRAP_ATTR}]`)?.remove();
            return normalizeText(clone.textContent ?? '');
        }

        function getPrimaryAuthor(): string {
            const config = getCurrentSiteConfig();
            if (!config) return '';

            const site = getCurrentSite();

            if (site === 'hardcover') {
                const titleEl = getTitleElement();
                const parentBlock = titleEl?.parentElement;
                if (parentBlock) {
                    const authorLink = parentBlock.querySelector('a[href^="/authors/"]');
                    if (authorLink instanceof HTMLElement) {
                        return normalizeText(authorLink.textContent ?? '');
                    }
                }
                return '';
            }

            return findFirstMatchText(config.authorSelectors);
        }

        function createChip(source: SourceKey, searchQuery: string): HTMLSpanElement {
            const meta = SOURCE_META[source];
            const isWideGlyph = meta.glyph.length > 1;
            const isLight = isLightThemeSite();

            const chip = document.createElement('span');
            chip.setAttribute(CHIP_ATTR, source);
            chip.className = `${CHIP_CLASS} ${CHIP_CLASS}--${source}`;
            chip.dataset.searchQuery = searchQuery;

            if (isLight) {
                chip.dataset.site = 'light';
            }

            const icon = document.createElement('span');
            icon.className = 'goodlib-chip-icon';

            const glyph = document.createElement('span');
            glyph.className = isWideGlyph ? 'goodlib-chip-glyph goodlib-chip-glyph--wide' : 'goodlib-chip-glyph';
            glyph.textContent = meta.glyph;

            const label = document.createElement('span');
            label.className = 'goodlib-chip-label';
            label.textContent = meta.label;

            icon.appendChild(glyph);
            chip.append(icon, label);

            chip.addEventListener(
                'click',
                () => {
                    const query = chip.dataset.searchQuery ?? searchQuery;
                    window.open(buildSourceUrl(source, query, settings), '_blank', 'noopener,noreferrer');
                },
                { passive: true }
            );

            return chip;
        }

        function removeAllChips(): void {
            const wrapper = document.querySelector(`[${CHIPS_WRAP_ATTR}]`);
            if (wrapper) {
                wrapper.remove();
            }
            document.querySelectorAll(`[${CHIP_ATTR}]`).forEach((el) => el.remove());
            cachedSearchQuery = null;
        }

        function injectChips(): void {
            const titleEl = getTitleElement();
            if (!titleEl) return;

            const enabledSources = getEnabledSources(settings);
            if (enabledSources.length === 0) {
                removeAllChips();
                return;
            }

            const bookTitle = getCleanBookTitle(titleEl);
            if (!bookTitle) return;

            const author = getPrimaryAuthor();
            const searchQuery = buildSearchQuery(bookTitle, author);

            let wrapper = titleEl.querySelector(`[${CHIPS_WRAP_ATTR}]`);
            const wrapperExists = !!wrapper;

            if (!wrapper) {
                wrapper = document.createElement('span');
                wrapper.setAttribute(CHIPS_WRAP_ATTR, 'true');
                wrapper.className = 'goodlib-chip-wrap';
            }

            const existingChips = wrapper.querySelectorAll(`[${CHIP_ATTR}]`);
            const existingSources = Array.from(existingChips).map((el) => el.getAttribute(CHIP_ATTR));
            const needsUpdate =
                cachedSearchQuery !== searchQuery ||
                existingSources.length !== enabledSources.length ||
                !enabledSources.every((s, i) => existingSources[i] === s);

            if (!needsUpdate && wrapperExists) {
                return;
            }

            const fragment = document.createDocumentFragment();
            for (const source of enabledSources) {
                fragment.appendChild(createChip(source, searchQuery));
            }

            wrapper.replaceChildren(fragment);
            cachedSearchQuery = searchQuery;

            if (!wrapperExists) {
                titleEl.appendChild(wrapper);
            }
        }

        function scheduleUpdate(): void {
            if (pendingUpdate !== null) {
                cancelIdleCallback(pendingUpdate);
            }

            pendingUpdate = requestIdleCallback(
                () => {
                    pendingUpdate = null;
                    if (isAnySourceEnabled(settings)) {
                        injectChips();
                    }
                },
                { timeout: 200 }
            );
        }

        function handleUrlChange(): void {
            if (lastUrl === window.location.href) return;

            lastUrl = window.location.href;
            resetSiteCache();
            cachedTitleElement = null;
            cachedSearchQuery = null;
            removeAllChips();

            if (isSupportedBookPage()) {
                scheduleUpdate();
            }
        }

        function setupObserver(): void {
            if (observer) return;

            let titleFound = false;

            observer = new MutationObserver((mutations) => {
                if (titleFound && cachedSearchQuery) {
                    const shouldRecheck = mutations.some((m) => {
                        for (const node of m.removedNodes) {
                            if (node instanceof HTMLElement) {
                                if (node.hasAttribute(CHIPS_WRAP_ATTR) || node.querySelector(`[${CHIPS_WRAP_ATTR}]`)) {
                                    return true;
                                }
                            }
                        }
                        return false;
                    });

                    if (!shouldRecheck) return;
                }

                titleFound = !!getTitleElement();
                scheduleUpdate();
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
            });
        }

        async function loadSettings(): Promise<void> {
            try {
                const stored = await browser.storage.local.get(GOODLIB_STORAGE_KEY);
                settings = mergeSettings(stored[GOODLIB_STORAGE_KEY] as Partial<GoodlibSettings> | undefined);
            } catch (e) {
                console.error('[GoodLib] Failed to load settings:', e);
                settings = { ...DEFAULT_GOODLIB_SETTINGS };
            }

            if (isAnySourceEnabled(settings)) {
                injectChips();
            }
        }

        function handleStorageChange(changes: Record<string, { newValue?: unknown; oldValue?: unknown }>, areaName: string): void {
            if (areaName !== 'local' || !(GOODLIB_STORAGE_KEY in changes)) return;

            const newSettings = changes[GOODLIB_STORAGE_KEY].newValue as Partial<GoodlibSettings> | undefined;
            settings = mergeSettings(newSettings);

            if (isAnySourceEnabled(settings)) {
                injectChips();
            } else {
                removeAllChips();
            }
        }

        function cleanup(): void {
            if (observer) {
                observer.disconnect();
                observer = null;
            }
            if (pendingUpdate !== null) {
                cancelIdleCallback(pendingUpdate);
                pendingUpdate = null;
            }
            window.removeEventListener('popstate', handleUrlChange);
            window.removeEventListener('hashchange', handleUrlChange);
            browser.storage.onChanged.removeListener(handleStorageChange);
        }

        loadSettings();
        setupObserver();
        browser.storage.onChanged.addListener(handleStorageChange);
        window.addEventListener('popstate', handleUrlChange);
        window.addEventListener('hashchange', handleUrlChange);
        window.addEventListener('pagehide', cleanup, { once: true });
    },
});
