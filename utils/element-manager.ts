import { debounce, getCurrentPageType, selectByXPath } from './dom';
import { mergeWithDefaults } from './storage';
import { DEFAULT_ELEMENTS, PageType, STORAGE_KEY, YoutubeElement } from './youtube';
import { SPECIAL_HANDLERS } from './youtube-handlers';

/** Default debounce delay for mutation observer callbacks */
const OBSERVER_DEBOUNCE_MS = 50;

/** Default CSS property and value for hiding elements */
const DEFAULT_PROPERTY = 'display';
const DEFAULT_STYLE = 'none';

/**
 * Manages YouTube page elements visibility and custom behaviors.
 * Handles element selection, style application, and special element handlers.
 */
export class ElementManager {
    private elements: YoutubeElement[] = [];
    private observer: MutationObserver | null = null;
    private cachedPageType: PageType | null = null;
    private isInitialized = false;

    private readonly elementsByPageType = new Map<PageType | 'global', YoutubeElement[]>();

    private readonly appliedStyles = new WeakMap<HTMLElement, string>();

    /**
     * Initializes the element manager by loading stored preferences
     * and setting up the mutation observer.
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            const storedObj = await browser.storage.local.get(STORAGE_KEY);
            const storedValue: unknown = storedObj?.[STORAGE_KEY];

            this.elements = mergeWithDefaults(DEFAULT_ELEMENTS, storedValue);
            this.buildPageTypeLookup();
            this.updatePageType();

            this.applyAllElements();
            this.setupObserver();
            this.isInitialized = true;
        } catch (error) {
            console.error('[AQT] Failed to initialize ElementManager:', error);
        }
    }

    /**
     * Updates elements with new configuration from storage.
     * Forces a cleanup of inactive elements.
     */
    updateElements(newElements: unknown): void {
        this.elements = mergeWithDefaults(DEFAULT_ELEMENTS, newElements);
        this.buildPageTypeLookup();
        this.applyAllElements(true);
    }

    /**
     * Updates the cached page type based on current URL.
     */
    updatePageType(): void {
        this.cachedPageType = getCurrentPageType();
    }

    /**
     * Applies all relevant elements for the current page.
     * @param cleanInactive - When true, also removes styles from inactive elements
     */
    applyAllElements(cleanInactive = false): void {
        const relevantElements = this.getRelevantElements();

        for (const element of relevantElements) {
            const shouldBeActive = element.checked;

            // Skip inactive elements unless we're cleaning up
            if (!shouldBeActive && !cleanInactive) {
                continue;
            }

            this.processElement(element, shouldBeActive);
        }
    }

    destroy(): void {
        this.observer?.disconnect();
        this.observer = null;
        this.elementsByPageType.clear();
        this.isInitialized = false;
    }

    /**
     * Builds a lookup map of elements indexed by page type for filtering.
     */
    private buildPageTypeLookup(): void {
        this.elementsByPageType.clear();

        for (const element of this.elements) {
            const pageTypes = element.pageTypes;

            if (!pageTypes || pageTypes.length === 0) {
                // Global elements apply to all pages
                this.addToPageTypeLookup('global', element);
            } else {
                // Page-specific elements
                for (const pageType of pageTypes) {
                    this.addToPageTypeLookup(pageType, element);
                }
            }
        }
    }

    private addToPageTypeLookup(key: PageType | 'global', element: YoutubeElement): void {
        const existing = this.elementsByPageType.get(key);
        if (existing) {
            existing.push(element);
        } else {
            this.elementsByPageType.set(key, [element]);
        }
    }

    /**
     * Gets elements relevant to the current page type.
     */
    private getRelevantElements(): YoutubeElement[] {
        const globalElements = this.elementsByPageType.get('global') ?? [];
        const pageElements = this.cachedPageType
            ? (this.elementsByPageType.get(this.cachedPageType) ?? [])
            : [];

        return [...globalElements, ...pageElements];
    }

    private setupObserver(): void {
        this.observer?.disconnect();

        const debouncedApply = debounce(() => this.applyAllElements(false), OBSERVER_DEBOUNCE_MS);

        this.observer = new MutationObserver(debouncedApply);

        if (document.body) {
            this.observer.observe(document.body, {
                childList: true,
                subtree: true,
            });
        }
    }

    /**
     * Processes a single element: runs special handlers and applies/removes styles.
     */
    private processElement(element: YoutubeElement, shouldBeActive: boolean): void {
        const nodes = selectByXPath(element.selector);

        // Run special handler if one exists for this element
        const handler = SPECIAL_HANDLERS[element.id];
        if (handler) {
            try {
                handler({
                    element,
                    nodes,
                    active: shouldBeActive,
                });
            } catch (error) {
                console.error(`[AQT] Handler error for ${element.id}:`, error);
            }
        }

        this.applyStyles(nodes, element, shouldBeActive);
    }

    /**
     * Applies or removes CSS styles from nodes based on the active state.
     */
    private applyStyles(
        nodes: readonly HTMLElement[],
        element: YoutubeElement,
        shouldBeActive: boolean,
    ): void {
        const property = element.property ?? DEFAULT_PROPERTY;
        const value = element.style ?? DEFAULT_STYLE;
        const styleKey = `${property}:${value}`;

        for (const node of nodes) {
            const currentStyle = this.appliedStyles.get(node);

            if (shouldBeActive) {
                // Only apply if not already applied with same style
                if (currentStyle !== styleKey) {
                    try {
                        node.style.setProperty(property, value, 'important');
                        this.appliedStyles.set(node, styleKey);
                    } catch {
                        // Style application might fail for some edge cases
                    }
                }
            } else if (currentStyle) {
                // Only remove if we previously applied a style
                try {
                    node.style.removeProperty(property);
                    this.appliedStyles.delete(node);
                } catch {
                    // Style removal might fail for some edge cases
                }
            }
        }
    }
}
