import { safeQuerySelector } from './dom';
import { YoutubeElement } from './youtube';

/** Context passed to each custom handler */
export interface HandlerContext {
    readonly element: YoutubeElement;
    readonly nodes: readonly HTMLElement[];
    readonly active: boolean;
}

/** Custom handler function signature */
export type CustomHandler = (ctx: HandlerContext) => void;

/** Constants for reusable style values */
const BORDER_STYLE = '1px solid var(--yt-spec-10-percent-layer)';
const CUSTOM_THUMB_ID = 'video-thumbnail-aqt';

/** Selectors used by handlers */
const SELECTORS = {
    videoContainer: 'ytd-app[guide-persistent-and-visible] ytd-page-manager.ytd-app',
    secondaryResults: 'ytd-watch-next-secondary-results-renderer div#items',
    frostedGlass: '#frosted-glass',
    youSection: 'ytd-guide-collapsible-section-entry-renderer',
    clipsSection: 'ytd-guide-section-renderer',
} as const;

/**
 * Safely extracts video ID from the current URL.
 */
function getVideoIdFromUrl(): string | null {
    try {
        const url = new URL(document.URL);
        return url.searchParams.get('v');
    } catch {
        return null;
    }
}

/**
 * Adjusts the video container margin when sidebar visibility changes.
 */
const handleSidebar: CustomHandler = ({ active }) => {
    const videoContainer = safeQuerySelector<HTMLElement>(SELECTORS.videoContainer);
    if (videoContainer) {
        videoContainer.style.marginLeft = active ? '0' : '';
    }
};

/**
 * Adds or removes a video thumbnail preview in the sidebar.
 */
const handleVideoThumbnail: CustomHandler = ({ active }) => {
    const existingThumb = document.getElementById(CUSTOM_THUMB_ID);

    if (active && !existingThumb) {
        const items = safeQuerySelector(SELECTORS.secondaryResults);
        const videoId = getVideoIdFromUrl();

        if (!items || !videoId) {
            return;
        }

        try {
            const thumbnailSource = `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/mqdefault.jpg`;
            const fullResSource = `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/maxresdefault.jpg`;

            const ytImage = document.createElement('ytd-thumbnail');
            const anchorTag = document.createElement('a');
            anchorTag.target = '_blank';
            anchorTag.href = fullResSource;
            anchorTag.rel = 'noopener noreferrer';

            const image = document.createElement('img');
            image.id = CUSTOM_THUMB_ID;
            image.src = thumbnailSource;
            image.className = 'yt-core-image--fill-parent-width yt-core-image--loaded';
            image.alt = 'Video thumbnail';
            Object.assign(image.style, {
                borderRadius: '8px',
                marginBottom: '8px',
            });

            anchorTag.appendChild(image);
            ytImage.appendChild(anchorTag);
            items.prepend(ytImage);
        } catch {
            // Silently fail if DOM manipulation fails
        }
    } else if (!active && existingThumb) {
        existingThumb.closest('ytd-thumbnail')?.remove();
    }
};

/**
 * Sets the disabled property on nodes (for YouTube custom elements).
 */
const handleDisabledProp: CustomHandler = ({ nodes, active }) => {
    for (const node of nodes) {
        try {
            (node as unknown as { disabled: boolean }).disabled = active;
        } catch {
            // Some elements may not support the disabled property
        }
    }
};

/**
 * Adjusts the frosted glass header height when tabs are hidden.
 */
const handleTabs: CustomHandler = ({ active }) => {
    const frosted = safeQuerySelector<HTMLElement>(SELECTORS.frostedGlass);
    if (frosted) {
        frosted.style.height = active ? '56px' : '112px';
    }
};

/**
 * Adjusts the "You" section border in the sidebar.
 */
const handleYouSection: CustomHandler = ({ active }) => {
    const elem = safeQuerySelector<HTMLElement>(SELECTORS.youSection);
    if (elem) {
        elem.style.borderTop = active ? 'none' : BORDER_STYLE;
    }
};

/**
 * Adjusts the "My Clips" section border in the sidebar.
 */
const handleMyClips: CustomHandler = ({ active }) => {
    const elem = safeQuerySelector<HTMLElement>(SELECTORS.clipsSection);
    if (elem) {
        elem.style.borderBottom = active ? 'none' : BORDER_STYLE;
    }
};

/**
 * Pauses channel trailer videos when the feature is active.
 */
const handleChannelTrailer: CustomHandler = ({ nodes, active }) => {
    if (!active) return;

    for (const node of nodes) {
        const video = node.querySelector('video');
        if (video && !video.paused) {
            try {
                video.pause();
            } catch {
                // Video might be in a state where pause fails
            }
        }
    }
};

/**
 * Redirects YouTube Shorts URLs to the regular video player.
 */
const handleRedirectShorts: CustomHandler = ({ active }) => {
    if (!active) return;

    try {
        const pathname = globalThis.location.pathname;
        if (!pathname.startsWith('/shorts/')) return;

        const pathParts = pathname.split('/');
        const videoId = pathParts[2];

        if (videoId && /^[\w-]+$/.test(videoId)) {
            globalThis.location.replace(`/watch?v=${encodeURIComponent(videoId)}`);
        }
    } catch {
        // Location access or redirect might fail in some contexts
    }
};

/**
 * Registry of special handlers for elements that need custom logic
 * beyond simple CSS property toggling.
 */
export const SPECIAL_HANDLERS: Readonly<Record<string, CustomHandler>> = {
    sidebar: handleSidebar,
    'video-thumbnail': handleVideoThumbnail,
    'home-posts': handleDisabledProp,
    'video-shorts-description': handleDisabledProp,
    'video-views': handleDisabledProp,
    tabs: handleTabs,
    you: handleYouSection,
    'my-clips': handleMyClips,
    'channel-trailer': handleChannelTrailer,
    'redirect-shorts': handleRedirectShorts,
};
