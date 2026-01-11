import {
    DAILY_USAGE_KEY,
    getDomainFromUrl,
    getTodayDateString,
    LAST_RESET_DATE_KEY,
    matchesDomain,
    TIME_LIMITS_KEY,
    type DailyUsage,
    type TimeLimit,
} from '@/utils/time-limits';

const TRACKING_INTERVAL_MS = 30000;
const SAVE_INTERVAL_MS = 60000;
const MS_PER_MINUTE = 60000;

interface TrackingState {
    timeLimits: TimeLimit[];
    dailyUsage: DailyUsage;
    lastResetDate: string;
    savePending: boolean;
    lastTrackedAt: number | null;
    lastTrackedDomain: string | null;
}

export default defineBackground(() => {
    const state: TrackingState = {
        timeLimits: [],
        dailyUsage: {},
        lastResetDate: '',
        savePending: false,
        lastTrackedAt: null,
        lastTrackedDomain: null,
    };

    const loadState = async (): Promise<void> => {
        const stored = await browser.storage.local.get([TIME_LIMITS_KEY, DAILY_USAGE_KEY, LAST_RESET_DATE_KEY]);

        state.timeLimits = (stored[TIME_LIMITS_KEY] as TimeLimit[] | undefined) ?? [];
        state.dailyUsage = (stored[DAILY_USAGE_KEY] as DailyUsage | undefined) ?? {};
        state.lastResetDate = (stored[LAST_RESET_DATE_KEY] as string | undefined) ?? getTodayDateString();
    };

    const checkDateReset = async (): Promise<void> => {
        const today = getTodayDateString();
        if (state.lastResetDate !== today) {
            state.dailyUsage = {};
            state.lastResetDate = today;
            await browser.storage.local.set({
                [DAILY_USAGE_KEY]: state.dailyUsage,
                [LAST_RESET_DATE_KEY]: state.lastResetDate,
            });
            state.savePending = false;
        }
    };

    const getActiveTab = async (): Promise<{ id: number; url: string } | null> => {
        const focusedWindow = await browser.windows.getLastFocused();
        if (!focusedWindow.focused || focusedWindow.id === undefined) return null;

        const tabs = await browser.tabs.query({ active: true, windowId: focusedWindow.id });
        const activeTab = tabs[0];

        if (!activeTab?.id || !activeTab.url) return null;

        return { id: activeTab.id, url: activeTab.url };
    };

    const sendOverlayMessage = (tabId: number, show: boolean): void => {
        const messageType = show ? 'SHOW_BLOCK_OVERLAY' : 'HIDE_BLOCK_OVERLAY';
        browser.tabs.sendMessage(tabId, { type: messageType }).catch(() => {});
    };

    /**
     * Keeps time accounting accurate even when timers drift.
     */
    const getElapsedMinutes = (now: number, lastTrackedAt: number | null): number => {
        if (lastTrackedAt === null) return 0;
        return Math.max(0, (now - lastTrackedAt) / MS_PER_MINUTE);
    };

    /**
     * Accumulates elapsed time once per tick to reduce work.
     */
    const applyElapsedUsage = (domain: string | null, elapsedMinutes: number): void => {
        if (!domain || elapsedMinutes <= 0) return;
        state.dailyUsage[domain] = (state.dailyUsage[domain] ?? 0) + elapsedMinutes;
        state.savePending = true;
    };

    /**
     * Centralizes domain matching so it stays consistent.
     */
    const findLimitConfig = (domain: string): TimeLimit | null =>
        state.timeLimits.find((limit) => matchesDomain(domain, limit.domain)) ?? null;

    /**
     * Stores usage under the configured domain for stable reporting.
     */
    const ensureUsageKey = (domain: string, usageKey: string): void => {
        if (usageKey === domain || state.dailyUsage[domain] === undefined) return;

        state.dailyUsage[usageKey] = (state.dailyUsage[usageKey] ?? 0) + state.dailyUsage[domain];
        delete state.dailyUsage[domain];
        state.savePending = true;
    };

    /**
     * Tracks the cursor needed to compute the next delta.
     */
    const setTrackingCursor = (now: number, domain: string | null): void => {
        state.lastTrackedAt = now;
        state.lastTrackedDomain = domain;
    };

    const trackActiveTab = async (): Promise<void> => {
        try {
            await checkDateReset();

            const now = Date.now();
            const elapsedMinutes = getElapsedMinutes(now, state.lastTrackedAt);
            applyElapsedUsage(state.lastTrackedDomain, elapsedMinutes);

            const activeTab = await getActiveTab();
            if (!activeTab) {
                setTrackingCursor(now, null);
                return;
            }

            const domain = getDomainFromUrl(activeTab.url);
            if (!domain) {
                setTrackingCursor(now, null);
                return;
            }

            const limitConfig = findLimitConfig(domain);
            if (!limitConfig) {
                sendOverlayMessage(activeTab.id, false);
                setTrackingCursor(now, null);
                return;
            }

            ensureUsageKey(domain, limitConfig.domain);
            const usageKey = limitConfig.domain;
            const limitExceeded = (state.dailyUsage[usageKey] ?? 0) >= limitConfig.minutes;
            sendOverlayMessage(activeTab.id, limitExceeded);

            setTrackingCursor(now, usageKey);
        } catch (error) {
            console.error('[AQT] Time tracking error:', error);
        }
    };

    let trackingInFlight = false;
    let trackingScheduled: ReturnType<typeof setTimeout> | null = null;

    const runTracking = async (): Promise<void> => {
        if (trackingInFlight) return;
        trackingInFlight = true;
        try {
            await trackActiveTab();
        } finally {
            trackingInFlight = false;
        }
    };

    const scheduleTracking = (): void => {
        if (trackingScheduled) return;
        trackingScheduled = setTimeout(() => {
            trackingScheduled = null;
            void runTracking();
        }, 250);
    };

    const savePendingData = async (): Promise<void> => {
        if (state.savePending) {
            await browser.storage.local.set({ [DAILY_USAGE_KEY]: state.dailyUsage });
            state.savePending = false;
        }
    };

    browser.storage.local.onChanged.addListener((changes) => {
        if (changes[TIME_LIMITS_KEY]) {
            state.timeLimits = (changes[TIME_LIMITS_KEY].newValue as TimeLimit[] | undefined) ?? [];
        }
        if (changes[DAILY_USAGE_KEY] && !state.savePending) {
            state.dailyUsage = (changes[DAILY_USAGE_KEY].newValue as DailyUsage | undefined) ?? {};
        }
    });

    browser.tabs.onActivated.addListener(() => scheduleTracking());
    browser.tabs.onUpdated.addListener((_tabId, changeInfo) => {
        if (changeInfo.status === 'complete' || changeInfo.url) {
            scheduleTracking();
        }
    });
    browser.windows.onFocusChanged.addListener(() => scheduleTracking());

    loadState().then(() => {
        void runTracking();
        setInterval(runTracking, TRACKING_INTERVAL_MS);

        setInterval(savePendingData, SAVE_INTERVAL_MS);
    });
});
