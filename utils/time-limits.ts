export interface TimeLimit {
    id: string;
    domain: string;
    minutes: number;
}

export interface DailyUsage {
    [domain: string]: number;
}

export const TIME_LIMITS_KEY = 'local:time_limits';
export const DAILY_USAGE_KEY = 'local:daily_usage';
export const LAST_RESET_DATE_KEY = 'local:last_reset_date';

/**
 * Normalizes a domain string for reliable matching.
 */
export function normalizeDomain(domain: string): string {
    return domain
        .trim()
        .toLowerCase()
        .replace(/^www\./, '');
}

/**
 * Checks whether a visited hostname matches a configured domain.
 */
export function matchesDomain(visitedDomain: string, limitDomain: string): boolean {
    const normalizedVisited = normalizeDomain(visitedDomain);
    const normalizedLimit = normalizeDomain(limitDomain);

    return normalizedVisited === normalizedLimit || normalizedVisited.endsWith(`.${normalizedLimit}`);
}

export function getDomainFromUrl(url: string): string | null {
    try {
        const u = new URL(url);
        return normalizeDomain(u.hostname);
    } catch {
        return null;
    }
}

export function getTodayDateString(): string {
    return new Date().toLocaleDateString();
}
