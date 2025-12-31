import { YoutubeElement } from './youtube';

interface StoredElementShape {
    id: string;
    checked?: unknown;
}

function isValidStoredElement(value: unknown): value is StoredElementShape {
    return (
        typeof value === 'object' &&
        value !== null &&
        'id' in value &&
        typeof (value as Record<string, unknown>).id === 'string'
    );
}

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
