
import { YoutubeElement } from "./youtube";

/**
 * Merges the default configuration with stored user preferences.
 * This ensures that users get new defaults if the extension updates,
 * while preserving their toggled choices.
 */
export function mergeWithDefaults(
    defaults: YoutubeElement[],
    stored: unknown
): YoutubeElement[] {
    const storedArray = Array.isArray(stored) ? (stored as YoutubeElement[]) : [];
    const byId = new Map<string, YoutubeElement>();

    for (const el of storedArray) {
        if (el && typeof el.id === "string") byId.set(el.id, el);
    }

    return defaults.map((def) => {
        const found = byId.get(def.id);
        return found ? { ...def, checked: !!found.checked } : def;
    });
}
