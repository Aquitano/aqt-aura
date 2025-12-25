import { PAGE_TYPES, PageType } from './youtube';

/**
 * Debounces a function call.
 */
export function debouncer<T extends (...args: unknown[]) => void>(func: T, wait: number) {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

/**
 * Evaluates an XPath expression and returns an array of HTMLElements.
 * Safe wrapper around document.evaluate.
 */
export function selectByXPath(selector: string, context: Node = document): HTMLElement[] {
    const results: HTMLElement[] = [];
    try {
        const snapshot = document.evaluate(selector, context, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        for (let i = 0; i < snapshot.snapshotLength; i++) {
            const node = snapshot.snapshotItem(i);
            if (node && node instanceof HTMLElement) {
                results.push(node);
            }
        }
    } catch (_) {
        // XPath errors are expected for invalid selectors or compatibility issues
        // We fail silently to avoid console spam
    }
    return results;
}

/**
 * Determines the current YouTube page type based on the URL.
 */
export function getCurrentPageType(): PageType | null {
    const url = globalThis.location.href;
    if (url === 'https://www.youtube.com/' || url.startsWith('https://www.youtube.com/?')) {
        return PAGE_TYPES.HOME;
    } else if (url.includes('/watch')) {
        return PAGE_TYPES.VIDEO;
    } else if (url.includes('/feed/subscriptions')) {
        return PAGE_TYPES.SUBSCRIPTIONS;
    } else if (url.includes('/results?search_query')) {
        return PAGE_TYPES.SEARCH;
    } else if (url.includes('/feed/trending')) {
        return PAGE_TYPES.TRENDING;
    } else if (url.includes('/feed/downloads')) {
        return PAGE_TYPES.DOWNLOADS;
    } else if (url.includes('/@')) {
        return PAGE_TYPES.CHANNEL;
    }
    return null;
}
