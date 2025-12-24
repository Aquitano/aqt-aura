
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

    async initialize() {
        const storedObj = await browser.storage.local.get(STORAGE_KEY);
        const storedValue = storedObj?.[STORAGE_KEY];

        this.elements = mergeWithDefaults(DEFAULT_ELEMENTS, storedValue);

        this.applyAllElements();
        this.setupObserver();
    }

    updateElements(newElements: unknown) {
        console.log("Updating elements", newElements);
        this.elements = mergeWithDefaults(DEFAULT_ELEMENTS, newElements);
        this.applyAllElements();
    }

    setupObserver() {
        this.observer?.disconnect();
        this.observer = new MutationObserver(debouncer(() => this.applyAllElements(), 50));
        this.observer.observe(document.body, { childList: true, subtree: true });
    }

    applyAllElements() {
        const pageType = getCurrentPageType();
        for (const el of this.elements) {
            this.processElement(el, pageType);
        }
    }

    private isApplicableOnPage(el: YoutubeElement, pageType: PageType | null) {
        // If no pageTypes, treat as globally applicable
        if (!el.pageTypes || el.pageTypes.length === 0) return true;

        // If we can't detect page type, be conservative: apply globally
        if (!pageType) return true;

        return el.pageTypes.includes(pageType);
    }

    private processElement(el: YoutubeElement, pageType: PageType | null) {
        const applicable = this.isApplicableOnPage(el, pageType);

        // Determine if the element should be "active" (checked by user AND applicable on this page)
        // If it's not applicable, we treat it as inactive (revert changes)
        // If it is applicable, we respect the user's checked state
        const shouldBeActive = applicable && el.checked;

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
            if (shouldBeActive) {
                node.style.setProperty(property, value, "important");
            } else {
                node.style.removeProperty(property);
            }
        });
    }
}
