export interface BlinkistChapter {
    index: number; // 0-based
    title: string;
    paragraphs: string[];
}

export interface BlinkistBookMeta {
    slug: string;
    title: string;
    author: string;
    coverUrl: string;
    chaptersCount: number;
    scrapedChaptersCount: number;
    scrapedAt: number;
}

export interface BlinkistBookContent {
    slug: string;
    title: string;
    author: string;
    coverUrl: string;
    description: string;
    chapters: BlinkistChapter[];
    scrapedAt: number;
}

export const BLINKIST_INDEX_KEY = 'blinkist_books_index' as const;
export const BLINKIST_BOOK_KEY_PREFIX = 'blinkist_book_content:' as const;

export async function getBlinkistBooksIndex(): Promise<BlinkistBookMeta[]> {
    try {
        const stored = await browser.storage.local.get(BLINKIST_INDEX_KEY);
        const index = stored[BLINKIST_INDEX_KEY];
        return Array.isArray(index) ? (index as BlinkistBookMeta[]) : [];
    } catch (e) {
        console.error('[AQT Aura] Failed to get Blinkist index:', e);
        return [];
    }
}

export async function getBlinkistBookContent(slug: string): Promise<BlinkistBookContent | null> {
    try {
        const key = `${BLINKIST_BOOK_KEY_PREFIX}${slug}`;
        const stored = await browser.storage.local.get(key);
        return (stored[key] as BlinkistBookContent) || null;
    } catch (e) {
        console.error(`[AQT Aura] Failed to get Blinkist book content for ${slug}:`, e);
        return null;
    }
}

export async function saveBlinkistBookContent(slug: string, content: BlinkistBookContent): Promise<void> {
    try {
        const key = `${BLINKIST_BOOK_KEY_PREFIX}${slug}`;
        await browser.storage.local.set({ [key]: content });

        // Update the index
        const index = await getBlinkistBooksIndex();
        const existingIndex = index.findIndex((item) => item.slug === slug);

        const metaItem: BlinkistBookMeta = {
            slug: content.slug,
            title: content.title,
            author: content.author,
            coverUrl: content.coverUrl,
            chaptersCount: content.chapters.length,
            scrapedChaptersCount: content.chapters.filter((c) => c.paragraphs.length > 0).length,
            scrapedAt: content.scrapedAt,
        };

        if (existingIndex > -1) {
            index[existingIndex] = metaItem;
        } else {
            index.push(metaItem);
        }

        // Sort by scrapedAt descending
        index.sort((a, b) => b.scrapedAt - a.scrapedAt);

        await browser.storage.local.set({ [BLINKIST_INDEX_KEY]: index });
    } catch (e) {
        console.error(`[AQT Aura] Failed to save Blinkist book content for ${slug}:`, e);
    }
}

export async function deleteBlinkistBook(slug: string): Promise<void> {
    try {
        const key = `${BLINKIST_BOOK_KEY_PREFIX}${slug}`;
        await browser.storage.local.remove(key);

        const index = await getBlinkistBooksIndex();
        const updatedIndex = index.filter((item) => item.slug !== slug);

        await browser.storage.local.set({ [BLINKIST_INDEX_KEY]: updatedIndex });
    } catch (e) {
        console.error(`[AQT Aura] Failed to delete Blinkist book for ${slug}:`, e);
    }
}
