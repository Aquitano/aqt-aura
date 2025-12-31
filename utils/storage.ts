import { YoutubeElement } from './youtube';

/** Minimal shape required for a stored element to be valid */
interface StoredElementShape {
    id: string;
    checked?: unknown;
}

/**
 * Type guard to check if an object has the minimal stored element shape.
 */
function isValidStoredElement(value: unknown): value is StoredElementShape {
    return (
        typeof value === 'object' &&
        value !== null &&
        'id' in value &&
        typeof (value as Record<string, unknown>).id === 'string'
    );
}

/**
 * Safely parses stored data into an array of elements.
 */
function parseStoredElements(stored: unknown): Map<string, StoredElementShape> {
    const byId = new Map<string, StoredElementShape>();

    if (!Array.isArray(stored)) {
        return byId;
    }

    for (const item of stored) {
        if (isValidStoredElement(item)) {
            byId.set(item.id, item);
        }
    }

    return byId;
}

/**
 * Merges the default configuration with stored user preferences.
 * This ensures that users get new defaults if the extension updates,
 * while preserving their toggled choices.
 */
export function mergeWithDefaults(defaults: readonly YoutubeElement[], stored: unknown): YoutubeElement[] {
    const storedElements = parseStoredElements(stored);

    return defaults.map((defaultElement) => {
        const storedElement = storedElements.get(defaultElement.id);

        if (storedElement) {
            return {
                ...defaultElement,
                checked: Boolean(storedElement.checked),
            };
        }

        return { ...defaultElement };
    });
}
