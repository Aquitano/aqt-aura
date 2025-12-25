import { YoutubeElement } from './youtube';

type HandlerContext = {
    element: YoutubeElement;
    nodes: HTMLElement[];
    active: boolean;
};

type CustomHandler = (ctx: HandlerContext) => void;

const handleSidebar: CustomHandler = ({ active }) => {
    const videoContainer = document.querySelector(
        'ytd-app[guide-persistent-and-visible] ytd-page-manager.ytd-app',
    ) as HTMLElement | null;

    if (videoContainer) {
        videoContainer.style.marginLeft = active ? '0' : '';
    }
};

const handleVideoThumbnail: CustomHandler = ({ element, active }) => {
    const customThumbId = 'video-thumbnail-aqt';
    const existingThumb = document.getElementById(customThumbId);

    if (active && !existingThumb) {
        const items = document.querySelector('ytd-watch-next-secondary-results-renderer div#items');

        const currentVideo = new URL(document.URL);
        const videoId = currentVideo.searchParams.get('v');

        if (items && videoId) {
            const thumbnailSource = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

            const ytImage = document.createElement('ytd-thumbnail');
            const anchorTag = document.createElement('a');
            anchorTag.setAttribute('target', '_blank');
            anchorTag.setAttribute('href', `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);

            const image = document.createElement('img');
            image.id = customThumbId;
            image.src = thumbnailSource;
            image.className = 'yt-core-image--fill-parent-width yt-core-image--loaded';
            image.style.borderRadius = '8px';
            image.style.marginBottom = '8px';

            anchorTag.appendChild(image);
            ytImage.appendChild(anchorTag);
            items.prepend(ytImage);
        }
    } else if (!active && existingThumb) {
        const wrapper = existingThumb.closest('ytd-thumbnail');
        wrapper?.remove();
    }
};

const handleDisabledProp: CustomHandler = ({ nodes, active }) => {
    nodes.forEach((node) => {
        (node as any).disabled = active;
    });
};

const handleTabs: CustomHandler = ({ active }) => {
    const frosted = document.getElementById('frosted-glass');
    if (frosted) {
        frosted.style.height = active ? '56px' : '112px';
    }
};

const handleYouSection: CustomHandler = ({ active }) => {
    const elem = document.querySelector('ytd-guide-collapsible-section-entry-renderer') as HTMLElement | null;
    if (elem) {
        elem.style.borderTop = active ? 'none' : '1px solid var(--yt-spec-10-percent-layer)';
    }
};

const handleMyClips: CustomHandler = ({ active }) => {
    const elem = document.querySelector('ytd-guide-section-renderer') as HTMLElement | null;
    if (elem) {
        elem.style.borderBottom = active ? 'none' : '1px solid var(--yt-spec-10-percent-layer)';
    }
};

const handleChannelTrailer: CustomHandler = ({ nodes, active }) => {
    if (active) {
        nodes.forEach((node) => {
            const video = node.querySelector('video') as HTMLVideoElement | null;
            video?.pause();
        });
    }
};

const handleRedirectShorts: CustomHandler = ({ active }) => {
    if (active && globalThis.location.pathname.startsWith('/shorts/')) {
        const pathParts = globalThis.location.pathname.split('/');
        const videoId = pathParts[2];

        if (videoId) {
            globalThis.location.replace(`/watch?v=${videoId}`);
        }
    }
};

export const SPECIAL_HANDLERS: Record<string, CustomHandler> = {
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
