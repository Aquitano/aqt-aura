/**
 * GoodLib Integration - Book search chip functionality
 */

export type SourceKey = 'zlib' | 'anna' | 'gutenberg';

export interface GoodlibSettings {
    readonly zlibEnabled: boolean;
    readonly annaEnabled: boolean;
    readonly gutenbergEnabled: boolean;
    readonly zlibDomain: string;
    readonly annaDomain: string;
}

export interface SourceMeta {
    readonly label: string;
    readonly glyph: string;
}

export interface SiteConfig {
    readonly host: string;
    readonly pathPattern?: RegExp;
    readonly titleSelectors: readonly string[];
    readonly authorSelectors: readonly string[];
    readonly isLightTheme: boolean;
}

export type SiteKey = 'goodreads' | 'hardcover' | 'storygraph';

export const GOODLIB_STORAGE_KEY = 'goodlib_settings' as const;
export const CHIP_ATTR = 'data-goodlib-chip' as const;
export const CHIPS_WRAP_ATTR = 'data-goodlib-chip-wrap' as const;
export const CHIP_CLASS = 'goodlib-chip' as const;

export const SOURCE_KEYS: readonly SourceKey[] = ['zlib', 'anna', 'gutenberg'] as const;

export const DEFAULT_GOODLIB_SETTINGS: Readonly<GoodlibSettings> = Object.freeze({
    zlibEnabled: true,
    annaEnabled: true,
    gutenbergEnabled: true,
    zlibDomain: 'z-lib.gs',
    annaDomain: 'annas-archive.gd',
});

export const SOURCE_META: Readonly<Record<SourceKey, SourceMeta>> = Object.freeze({
    zlib: Object.freeze({ label: 'Z-Lib', glyph: 'Z' }),
    anna: Object.freeze({ label: "Anna's", glyph: 'A' }),
    gutenberg: Object.freeze({ label: 'Gutenberg', glyph: 'PG' }),
});

const SITE_CONFIGS: Readonly<Record<SiteKey, SiteConfig>> = Object.freeze({
    goodreads: Object.freeze({
        host: 'goodreads.com',
        titleSelectors: ["h1[data-testid='bookTitle']", 'h1.Text__title1', 'h1'],
        authorSelectors: [
            "a[data-testid='name']",
            "[data-testid='authorName']",
            '.ContributorLinksList a.ContributorLink',
            'a.ContributorLink',
            'span.ContributorLink__name',
        ],
        isLightTheme: true,
    }),
    hardcover: Object.freeze({
        host: 'hardcover.app',
        titleSelectors: ['main h1', 'h1'],
        authorSelectors: ['a[href^="/authors/"]'],
        isLightTheme: false,
    }),
    storygraph: Object.freeze({
        host: 'thestorygraph.com',
        pathPattern: /\/books\//,
        titleSelectors: ['.book-title-author-and-series h3', 'h3.font-semibold.text-2xl', 'h3'],
        authorSelectors: [".book-title-author-and-series a[href^='/authors/']", "a[href^='/authors/']"],
        isLightTheme: false,
    }),
});

// Pre-computed regex for whitespace normalization
const WHITESPACE_REGEX = /\s+/g;

let cachedSiteKey: SiteKey | null | undefined;

function detectCurrentSite(): SiteKey | null {
    const { hostname, pathname } = window.location;

    for (const [key, config] of Object.entries(SITE_CONFIGS) as [SiteKey, SiteConfig][]) {
        if (!hostname.endsWith(config.host)) continue;
        if (config.pathPattern && !config.pathPattern.test(pathname)) continue;
        return key;
    }

    return null;
}

export function getCurrentSite(): SiteKey | null {
    if (cachedSiteKey === undefined) {
        cachedSiteKey = detectCurrentSite();
    }
    return cachedSiteKey;
}

export function getCurrentSiteConfig(): SiteConfig | null {
    const site = getCurrentSite();
    return site ? SITE_CONFIGS[site] : null;
}

export function isSupportedBookPage(): boolean {
    return getCurrentSite() !== null;
}

export function isLightThemeSite(): boolean {
    return getCurrentSiteConfig()?.isLightTheme ?? false;
}

export function resetSiteCache(): void {
    cachedSiteKey = undefined;
}

export function normalizeText(value: string): string {
    return value.replace(WHITESPACE_REGEX, ' ').trim();
}

export function buildSearchQuery(title: string, author?: string): string {
    if (!author) return title;
    return `${title} ${author}`;
}

const URL_BUILDERS: Readonly<Record<SourceKey, (query: string, settings: GoodlibSettings) => string>> = {
    zlib: (q, s) => `https://${s.zlibDomain}/s/${encodeURIComponent(q)}`,
    anna: (q, s) => `https://${s.annaDomain}/search?q=${encodeURIComponent(q)}`,
    gutenberg: (q) => `https://www.gutenberg.org/ebooks/search/?query=${encodeURIComponent(q)}`,
};

export function buildSourceUrl(source: SourceKey, query: string, settings: GoodlibSettings): string {
    return URL_BUILDERS[source](query, settings);
}

export function findFirstMatch(selectors: readonly string[]): HTMLElement | null {
    for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el instanceof HTMLElement && el.textContent?.trim()) {
            return el;
        }
    }
    return null;
}

export function findFirstMatchText(selectors: readonly string[]): string {
    const el = findFirstMatch(selectors);
    return el ? normalizeText(el.textContent ?? '') : '';
}

export function isAnySourceEnabled(settings: GoodlibSettings): boolean {
    return settings.zlibEnabled || settings.annaEnabled || settings.gutenbergEnabled;
}

export function getEnabledSources(settings: GoodlibSettings): SourceKey[] {
    return SOURCE_KEYS.filter((key) => {
        switch (key) {
            case 'zlib':
                return settings.zlibEnabled;
            case 'anna':
                return settings.annaEnabled;
            case 'gutenberg':
                return settings.gutenbergEnabled;
        }
    });
}

export function mergeSettings(stored: Partial<GoodlibSettings> | undefined): GoodlibSettings {
    if (!stored) return { ...DEFAULT_GOODLIB_SETTINGS };
    return {
        zlibEnabled: stored.zlibEnabled ?? DEFAULT_GOODLIB_SETTINGS.zlibEnabled,
        annaEnabled: stored.annaEnabled ?? DEFAULT_GOODLIB_SETTINGS.annaEnabled,
        gutenbergEnabled: stored.gutenbergEnabled ?? DEFAULT_GOODLIB_SETTINGS.gutenbergEnabled,
        zlibDomain: stored.zlibDomain || DEFAULT_GOODLIB_SETTINGS.zlibDomain,
        annaDomain: stored.annaDomain || DEFAULT_GOODLIB_SETTINGS.annaDomain,
    };
}
