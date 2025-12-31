import { PAGE_TYPES, PageType } from './youtube';

/** Timeout handle type for cross-platform compatibility */
type TimeoutHandle = ReturnType<typeof setTimeout>;

/**
 * Creates a debounced version of the provided function.
 * The debounced function delays invoking `func` until after `wait` milliseconds
 * have elapsed since the last time the debounced function was invoked.
 */
export function debounce<T extends (...args: unknown[]) => void>(
    func: T,
    wait: number,
): (...args: Parameters<T>) => void {
    let timeout: TimeoutHandle | undefined;

    return (...args: Parameters<T>) => {
        if (timeout !== undefined) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            timeout = undefined;
            func(...args);
        }, wait);
    };
}

/**
 * Evaluates an XPath expression and returns an array of matching HTMLElements.
 * Provides a safe wrapper around document.evaluate with proper error handling.
 *
 * @param selector - The XPath expression to evaluate
 * @param context - The context node for the XPath evaluation (defaults to document)
 * @returns An array of matching HTMLElements (empty array if none found or on error)
 */
export function selectByXPath(selector: string, context: Node = document): HTMLElement[] {
    if (!selector) {
        return [];
    }

    const results: HTMLElement[] = [];

    try {
        const snapshot = document.evaluate(
            selector,
            context,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null,
        );

        for (let i = 0; i < snapshot.snapshotLength; i++) {
            const node = snapshot.snapshotItem(i);
            if (node instanceof HTMLElement) {
                results.push(node);
            }
        }
    } catch {
        // XPath errors are expected for invalid selectors or compatibility issues.
        // We fail silently to avoid console spam in production.
    }

    return results;
}

export function safeQuerySelector<T extends HTMLElement = HTMLElement>(
    selector: string,
    context: Document | HTMLElement = document,
): T | null {
    try {
        return context.querySelector<T>(selector);
    } catch {
        return null;
    }
}

/** URL pattern matchers for YouTube page types */
const PAGE_TYPE_MATCHERS: ReadonlyArray<{ pattern: (url: string) => boolean; type: PageType }> = [
    {
        pattern: (url) => url === 'https://www.youtube.com/' || url.startsWith('https://www.youtube.com/?'),
        type: PAGE_TYPES.HOME,
    },
    { pattern: (url) => url.includes('/watch'), type: PAGE_TYPES.VIDEO },
    { pattern: (url) => url.includes('/feed/subscriptions'), type: PAGE_TYPES.SUBSCRIPTIONS },
    { pattern: (url) => url.includes('/results?search_query'), type: PAGE_TYPES.SEARCH },
    { pattern: (url) => url.includes('/feed/trending'), type: PAGE_TYPES.TRENDING },
    { pattern: (url) => url.includes('/feed/downloads'), type: PAGE_TYPES.DOWNLOADS },
    { pattern: (url) => url.includes('/@'), type: PAGE_TYPES.CHANNEL },
];

/**
 * Determines the current YouTube page type based on the URL.
 *
 * @returns The detected page type or null if unknown
 */
export function getCurrentPageType(): PageType | null {
    try {
        const url = globalThis.location.href;

        for (const { pattern, type } of PAGE_TYPE_MATCHERS) {
            if (pattern(url)) {
                return type;
            }
        }
    } catch {
        // Handle edge cases where location might not be accessible
    }

    return null;
}
