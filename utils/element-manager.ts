import { debounce, getCurrentPageType, selectByXPath } from './dom';
import { mergeWithDefaults } from './storage';
import { DEFAULT_ELEMENTS, PageType, STORAGE_KEY, YoutubeElement } from './youtube';
import { SPECIAL_HANDLERS } from './youtube-handlers';

const OBSERVER_DEBOUNCE_MS = 50;

/** Default CSS property and value for hiding elements */
const DEFAULT_PROPERTY = 'display';
const DEFAULT_STYLE = 'none';

export class ElementManager {
    private elements: YoutubeElement[] = [];
    private observer: MutationObserver | null = null;
    private cachedPageType: PageType | null = null;
    private isInitialized = false;

    private readonly elementsByPageType = new Map<PageType | 'global', YoutubeElement[]>();

    private readonly appliedStyles = new WeakMap<HTMLElement, string>();

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

    updateElements(newElements: unknown): void {
        this.elements = mergeWithDefaults(DEFAULT_ELEMENTS, newElements);
        this.buildPageTypeLookup();
        this.applyAllElements(true);
    }

    updatePageType(): void {
        this.cachedPageType = getCurrentPageType();
    }

    applyAllElements(cleanInactive = false): void {
        const relevantElements = this.getRelevantElements();

        for (const element of relevantElements) {
            const shouldBeActive = element.checked;

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

    private getRelevantElements(): YoutubeElement[] {
        const globalElements = this.elementsByPageType.get('global') ?? [];
        const pageElements = this.cachedPageType ? (this.elementsByPageType.get(this.cachedPageType) ?? []) : [];

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

    private processElement(element: YoutubeElement, shouldBeActive: boolean): void {
        const nodes = selectByXPath(element.selector);

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

    private applyStyles(nodes: readonly HTMLElement[], element: YoutubeElement, shouldBeActive: boolean): void {
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
