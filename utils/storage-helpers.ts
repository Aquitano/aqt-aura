export function getStorageValue<T>(
    stored: Record<string, unknown>,
    key: string,
    defaultValue: T,
    validator?: (value: unknown) => value is T,
): T {
    const value = stored[key];

    if (value === undefined || value === null) {
        return defaultValue;
    }

    if (validator && !validator(value)) {
        return defaultValue;
    }

    return value as T;
}

export function isTimeLimitArray(value: unknown): value is Array<{ id: string; domain: string; minutes: number }> {
    if (!Array.isArray(value)) return false;
    return value.every(
        (item) =>
            typeof item === 'object' &&
            item !== null &&
            'id' in item &&
            'domain' in item &&
            'minutes' in item &&
            typeof item.id === 'string' &&
            typeof item.domain === 'string' &&
            typeof item.minutes === 'number',
    );
}

export function isDailyUsage(value: unknown): value is Record<string, number> {
    if (typeof value !== 'object' || value === null) return false;
    return Object.values(value).every((v) => typeof v === 'number');
}

export function isNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

export function isStringRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
