
import { debouncer, getCurrentPageType, selectByXPath } from "./dom";
import { mergeWithDefaults } from "./storage";
import {
    DEFAULT_ELEMENTS,
    PageType,
    STORAGE_KEY,
    YoutubeElement,
} from "./youtube";
import { SPECIAL_HANDLERS } from "./youtube-handlers";

export class ElementManager {
    private elements: YoutubeElement[] = [];
    private observer: MutationObserver | null = null;
    private cachedPageType: PageType | null = null;
    private elementsByPageType: Map<PageType | 'global', YoutubeElement[]> = new Map();
    private appliedStyles: WeakMap<HTMLElement, string> = new WeakMap();

    async initialize() {
        const storedObj = await browser.storage.local.get(STORAGE_KEY);
        const storedValue = storedObj?.[STORAGE_KEY];

        this.elements = mergeWithDefaults(DEFAULT_ELEMENTS, storedValue);
        this.buildPageTypeLookup();
        this.updatePageType();

        this.applyAllElements();
        this.setupObserver();
    }

    updateElements(newElements: unknown) {
        console.log("Updating elements", newElements);
        this.elements = mergeWithDefaults(DEFAULT_ELEMENTS, newElements);
        this.buildPageTypeLookup();
        this.applyAllElements(true); // Force clean inactive
    }

    updatePageType() {
        this.cachedPageType = getCurrentPageType();
    }

    private buildPageTypeLookup() {
        this.elementsByPageType.clear();

        for (const el of this.elements) {
            if (!el.pageTypes || el.pageTypes.length === 0) {
                // Global elements
                const global = this.elementsByPageType.get('global') || [];
                global.push(el);
                this.elementsByPageType.set('global', global);
            } else {
                // Page-specific elements
                for (const pageType of el.pageTypes) {
                    const list = this.elementsByPageType.get(pageType) || [];
                    list.push(el);
                    this.elementsByPageType.set(pageType, list);
                }
            }
        }
    }

    setupObserver() {
        this.observer?.disconnect();
        this.observer = new MutationObserver(debouncer(() => this.applyAllElements(false), 50));
        this.observer.observe(document.body, { childList: true, subtree: true });
    }

    applyAllElements(cleanInactive = false) {
        // Get relevant elements for current page
        const globalElements = this.elementsByPageType.get('global') || [];
        const pageElements = this.cachedPageType
            ? (this.elementsByPageType.get(this.cachedPageType) || [])
            : [];

        const relevantElements = [...globalElements, ...pageElements];

        for (const el of relevantElements) {
            const shouldBeActive = el.checked;

            // If the element is not active, and we are not forcing a clean-up,
            // we skip the expensive DOM query.
            if (!shouldBeActive && !cleanInactive) {
                continue;
            }

            this.processElement(el, shouldBeActive);
        }
    }

    private processElement(el: YoutubeElement, shouldBeActive: boolean) {
        // 1. Run Special Logic (Strategy Pattern)
        const handler = SPECIAL_HANDLERS[el.id];

        // We select nodes for standard processing, also passed to handler
        const nodes = selectByXPath(el.selector);

        if (handler) {
            // Handler manages its own apply/revert logic based on "shouldBeActive"
            // We pass the nodes we found, but the handler might look up others (e.g. sidebar)
            handler({ element: el, nodes, active: shouldBeActive });
        }

        // 2. Standard CSS Property Toggle
        // For standard processing:
        // If Active: apply style
        // If Inactive: remove style
        const property = el.property || "display";
        const value = el.style || "none";

        nodes.forEach((node) => {
            const styleKey = `${property}:${value}`;
            const currentStyle = this.appliedStyles.get(node);

            if (shouldBeActive) {
                // Only apply if not already applied
                if (currentStyle !== styleKey) {
                    node.style.setProperty(property, value, "important");
                    this.appliedStyles.set(node, styleKey);
                }
            } else if (currentStyle) {
                // Only remove if currently applied
                node.style.removeProperty(property);
                this.appliedStyles.delete(node);
            }
        });
    }
}
