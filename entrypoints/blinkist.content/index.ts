import {
    saveBlinkistBookContent,
    getBlinkistBookContent,
    type BlinkistBookContent,
    type BlinkistChapter,
} from '@/utils/blinkist';
import './style.css';

export default defineContentScript({
    matches: [
        '*://*.blinkist.com/*/nc/reader/*',
        '*://*.blinkist.com/nc/reader/*',
        '*://*.blinkist.com/*/reader/books/*',
        '*://*.blinkist.com/reader/books/*',
        '*://*.blinkist.com/*/reader/*',
        '*://*.blinkist.com/reader/*',
        '*://*.blinkist.com/*/books/*',
        '*://*.blinkist.com/books/*',
    ],
    runAt: 'document_idle',

    main() {
        const slug = getBookSlug();
        if (!slug) return;

        const isReader = window.location.pathname.includes('/reader/');

        if (isReader) {
            setupReaderScraper(slug);
        } else {
            setupBookPageScraper(slug);
        }
    },
});

function getBookSlug(): string | null {
    const path = window.location.pathname;
    const readerMatch = path.match(/\/nc\/reader\/([^/]+)/);
    if (readerMatch) {
        return readerMatch[1];
    }
    const bookMatch = path.match(/\/books\/([^/]+)/);
    if (bookMatch) {
        return bookMatch[1];
    }
    return null;
}

function getBookInfoFromDocumentTitle(): { title: string; author: string } {
    const docTitle = document.title;
    let title = '';
    let author = '';

    // Strip common prefixes
    let cleaned = docTitle.replace(/^(?:Book Summary:|Summary of|Blink of|Blinkist Summary:)\s*/i, '');

    // Split by | or - to remove the trailing "| Blinkist"
    const parts = cleaned.split(/[-|]/);
    cleaned = parts[0]?.trim() || cleaned;

    // Match "Book Title by Author"
    const byMatch = cleaned.match(/(.*?)\s+by\s+(.*)/i);
    if (byMatch) {
        title = byMatch[1]?.trim() || '';
        author = byMatch[2]?.trim() || '';
    } else {
        title = cleaned.trim();
    }

    if (!title) {
        title = 'Unknown Book';
    }

    return { title, author };
}

function isGenericTitle(title: string): boolean {
    const lower = title.toLowerCase();
    return (
        lower === 'blinkist' ||
        lower === 'blinkist reader' ||
        lower.includes('serving you book insights') ||
        lower.includes('book summaries') ||
        lower === 'unknown book' ||
        lower === ''
    );
}

async function getValidBookInfo(timeoutMs: number = 10000): Promise<{ title: string; author: string }> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const { title, author } = getBookInfoFromDocumentTitle();
        if (title && !isGenericTitle(title)) {
            return { title, author };
        }
        await new Promise(r => setTimeout(r, 500));
    }
    return getBookInfoFromDocumentTitle();
}

function getBookCoverUrl(): string {
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage && ogImage.getAttribute('content')) {
        return ogImage.getAttribute('content') || '';
    }
    const img = document.querySelector('img[src*="cover"]');
    if (img) {
        return img.getAttribute('src') || '';
    }
    const img2 = document.querySelector('img[alt*="cover" i], img[class*="cover" i]');
    if (img2) {
        return img2.getAttribute('src') || '';
    }
    return '';
}

function getBookDescription(): string {
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc && ogDesc.getAttribute('content')) {
        return ogDesc.getAttribute('content') || '';
    }
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && metaDesc.getAttribute('content')) {
        return metaDesc.getAttribute('content') || '';
    }
    return '';
}

function isSidebarOrNav(el: HTMLElement): boolean {
    let curr: HTMLElement | null = el;
    while (curr && curr !== document.body) {
        const className = curr.className ? String(curr.className).toLowerCase() : '';
        const id = curr.id ? String(curr.id).toLowerCase() : '';
        const tagName = curr.tagName.toLowerCase();
        
        if (
            tagName === 'aside' ||
            tagName === 'nav' ||
            className.includes('sidebar') ||
            className.includes('drawer') ||
            className.includes('menu') ||
            className.includes('navigation') ||
            className.includes('settings') ||
            className.includes('modal') ||
            className.includes('sidebar-container') ||
            id.includes('sidebar') ||
            id.includes('drawer') ||
            id.includes('menu') ||
            id.includes('navigation') ||
            curr.getAttribute('role') === 'navigation' ||
            curr.getAttribute('role') === 'dialog'
        ) {
            return true;
        }
        curr = curr.parentElement;
    }
    return false;
}

function getSharedContainer(elements: HTMLElement[]): HTMLElement | null {
    if (elements.length === 0) return null;
    if (elements.length === 1) return elements[0].parentElement;
    
    let ancestor = elements[0].parentElement;
    while (ancestor && ancestor !== document.body) {
        let allContained = true;
        for (const el of elements) {
            if (!ancestor.contains(el)) {
                allContained = false;
                break;
            }
        }
        if (allContained) {
            return ancestor;
        }
        ancestor = ancestor.parentElement;
    }
    return ancestor || document.body;
}

function getContentContainer(): HTMLElement {
    const transcriptionComponents = Array.from(
        document.querySelectorAll('[data-test-id="transcription-component"]')
    ) as HTMLElement[];
    
    if (transcriptionComponents.length > 0) {
        const shared = getSharedContainer(transcriptionComponents);
        if (shared) return shared;
    }
    
    const selectors = [
        '.reader__container__content',
        '.reader__container',
        'article',
        'main',
        '[class*="reader__container"]',
        '[class*="reader-container"]'
    ];
    for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) return el as HTMLElement;
    }
    return document.body;
}

function getChapterDividerSelector(container: HTMLElement): string {
    if (container.querySelector('h4[class*="font-cera-pro"], h4')) {
        return 'h4[class*="font-cera-pro"], h4';
    }
    if (container.querySelector('h3')) {
        return 'h3';
    }
    if (container.querySelector('h1')) {
        return 'h1';
    }
    return 'h2';
}

function extractChaptersFromPage(): BlinkistChapter[] {
    const container = getContentContainer();
    
    // Find all start time markers
    const startTimeElements = Array.from(
        container.querySelectorAll('[data-test-id="chapter-start-time"]')
    ) as HTMLElement[];
    
    // If we have start time elements, we can extract chapters based on their wrappers
    if (startTimeElements.length > 0) {
        const chapters: BlinkistChapter[] = [];
        let chapterIndex = 0;
        
        for (const startTimeEl of startTimeElements) {
            // Find the closest ancestor that contains transcription components
            let wrapper: HTMLElement | null = startTimeEl.parentElement;
            while (wrapper && wrapper !== container && wrapper !== document.body) {
                if (wrapper.querySelector('[data-test-id="transcription-component"], p')) {
                    break;
                }
                wrapper = wrapper.parentElement;
            }
            if (!wrapper) wrapper = startTimeEl.parentElement || container;
            
            // Ignore if the wrapper itself is inside a sidebar/nav
            if (isSidebarOrNav(wrapper)) {
                continue;
            }
            
            // Extract the chapter title:
            // Often there's an h4 (e.g. "Chapter 1 of 5") and/or an h2 (e.g. "Takeaway title")
            const h4s = Array.from(wrapper.querySelectorAll('h4')).filter(el => !isSidebarOrNav(el));
            const h2s = Array.from(wrapper.querySelectorAll('h2')).filter(el => !isSidebarOrNav(el));
            
            const h4Text = h4s.map(el => el.textContent?.trim()).filter(Boolean).join(' ');
            const h2Text = h2s.map(el => el.textContent?.trim()).filter(Boolean).join(' ');
            
            let titleText = '';
            if (h4Text && h2Text) {
                if (h4Text.toLowerCase() === h2Text.toLowerCase()) {
                    titleText = h4Text;
                } else {
                    titleText = `${h4Text}: ${h2Text}`;
                }
            } else {
                titleText = h4Text || h2Text || `Chapter ${chapterIndex + 1}`;
            }
            
            // Extract paragraphs: elements with data-test-id="transcription-component" or p tags
            const paragraphElements = Array.from(
                wrapper.querySelectorAll('[data-test-id="transcription-component"], p')
            ) as HTMLElement[];
            
            // Filter paragraphs that are not children of another paragraph element
            const filteredParagraphs = paragraphElements.filter((el, index) => {
                return !paragraphElements.some((otherEl, otherIdx) => otherIdx !== index && otherEl.contains(el));
            });
            
            const paragraphs: string[] = [];
            for (const el of filteredParagraphs) {
                if (isSidebarOrNav(el)) continue;
                
                const text = el.textContent?.trim();
                if (text && text.length > 0) {
                    // Skip short buttons or indicators
                    if (text.length < 15) {
                        if (/^\d+\s*(of||\/)\s*\d+$/i.test(text)) continue;
                        if (/audio/i.test(text)) continue;
                    }
                    // Avoid duplicating title in paragraphs if it matches exactly
                    if (text === h4Text || text === h2Text || text === titleText) {
                        continue;
                    }
                    if (!paragraphs.includes(text)) {
                        paragraphs.push(text);
                    }
                }
            }
            
            chapters.push({
                index: chapterIndex++,
                title: titleText,
                paragraphs
            });
        }
        
        if (chapters.length > 0) {
            return chapters;
        }
    }
    
    // Fallback: If no chapter-start-time markers, run a safer version of the selector-based scraper
    const dividerSelector = getChapterDividerSelector(container);
    
    const elements = Array.from(container.querySelectorAll(
        `${dividerSelector}, h2, [data-test-id="transcription-component"], p`
    ));
    
    const filteredElements = elements.filter((el, index) => {
        if (isSidebarOrNav(el as HTMLElement)) return false;
        return !elements.some((otherEl, otherIdx) => otherIdx !== index && otherEl.contains(el));
    }) as HTMLElement[];
    
    const chapters: BlinkistChapter[] = [];
    let currentChapter: BlinkistChapter | null = null;
    let chapterIndex = 0;
    
    const isDivider = (el: HTMLElement): boolean => {
        return el.matches(dividerSelector);
    };
    
    for (const el of filteredElements) {
        if (isDivider(el)) {
            const titleText = el.textContent?.trim() || `Chapter ${chapterIndex + 1}`;
            currentChapter = {
                index: chapterIndex++,
                title: titleText,
                paragraphs: []
            };
            chapters.push(currentChapter);
        } else {
            const text = el.textContent?.trim();
            if (text && text.length > 0) {
                if (text.length < 15) {
                    if (/^\d+\s*(of||\/)\s*\d+$/i.test(text)) continue;
                    if (/audio/i.test(text)) continue;
                }
                
                if (!currentChapter) {
                    currentChapter = {
                        index: chapterIndex++,
                        title: 'Introduction',
                        paragraphs: []
                    };
                    chapters.push(currentChapter);
                }
                
                if (!currentChapter.paragraphs.includes(text)) {
                    currentChapter.paragraphs.push(text);
                }
            }
        }
    }
    
    return chapters;
}

function getChapterProgress(): { current: number; total: number } | null {
    // 1. Look in progress/counter elements
    const progressSelectors = [
        '[class*="progress"]', '[class*="Progress"]',
        '[class*="counter"]', '[class*="Counter"]',
        '[class*="pagination"]', '[class*="Pagination"]',
        '[data-test-id*="progress"]', '[data-test-id*="counter"]',
        '[data-test-id*="pagination"]'
    ];
    for (const sel of progressSelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent) {
            const match = el.textContent.match(/(\d+)\s*(?:of|\/)\s*(\d+)/i);
            if (match) {
                const current = parseInt(match[1], 10);
                const total = parseInt(match[2], 10);
                if (current > 0 && total > 0 && current <= total && total < 40) {
                    return { current, total };
                }
            }
        }
    }

    // 2. Scan text nodes in document
    const textNodes = document.createNodeIterator(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = textNodes.nextNode())) {
        const text = node.textContent?.trim() || '';
        const match = text.match(/^(\d+)\s*(?:of|\/)\s*(\d+)$/i);
        if (match) {
            const current = parseInt(match[1], 10);
            const total = parseInt(match[2], 10);
            if (current > 0 && total > 0 && current <= total && total < 40) {
                return { current, total };
            }
        }
    }

    return null;
}

function navigateNext() {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', keyCode: 39, bubbles: true }));

    const nextButtons = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
    const nextBtn = nextButtons.find(el => {
        const text = el.textContent?.toLowerCase() || '';
        const label = el.getAttribute('aria-label')?.toLowerCase() || '';
        return text.includes('next') || label.includes('next') || text === '→' || text === '>';
    }) as HTMLElement | undefined;

    if (nextBtn) {
        nextBtn.click();
    }
}

let isScraping = false;

function setupReaderScraper(slug: string) {
    // Create UI Panel
    const container = document.createElement('div');
    container.id = 'aqt-aura-blinkist-panel';
    container.className = 'aqt-panel expanded';

    const header = document.createElement('div');
    header.className = 'aqt-panel-header';
    header.innerHTML = `
        <span class="aqt-panel-title">AQT Aura Scraper</span>
        <button class="aqt-toggle-btn" type="button">▼</button>
    `;

    const body = document.createElement('div');
    body.className = 'aqt-panel-body';
    body.innerHTML = `
        <div class="aqt-status-text">Ready to extract summary.</div>
        <div class="aqt-progress-container" style="display: none;">
            <div class="aqt-progress-bar">
                <div class="aqt-progress-fill" style="width: 0%;"></div>
            </div>
            <div class="aqt-progress-label">0%</div>
        </div>
        <div class="aqt-button-group">
            <button class="aqt-action-btn aqt-scrape-btn" type="button">Auto-Scrape Book</button>
            <button class="aqt-action-btn aqt-single-btn" type="button">Save Current Page</button>
        </div>
        <label class="aqt-checkbox-label">
            <input type="checkbox" class="aqt-autosave-checkbox">
            Auto-save on load (10s delay)
        </label>
    `;

    container.appendChild(header);
    container.appendChild(body);
    document.body.appendChild(container);

    const toggleBtn = header.querySelector('.aqt-toggle-btn') as HTMLButtonElement;
    toggleBtn.addEventListener('click', () => {
        if (container.classList.contains('expanded')) {
            container.classList.remove('expanded');
            container.classList.add('collapsed');
            toggleBtn.textContent = '▲';
        } else {
            container.classList.remove('collapsed');
            container.classList.add('expanded');
            toggleBtn.textContent = '▼';
        }
    });

    const scrapeBtn = body.querySelector('.aqt-scrape-btn') as HTMLButtonElement;
    const singleBtn = body.querySelector('.aqt-single-btn') as HTMLButtonElement;
    const statusText = body.querySelector('.aqt-status-text') as HTMLDivElement;
    const progressContainer = body.querySelector('.aqt-progress-container') as HTMLDivElement;
    const progressFill = body.querySelector('.aqt-progress-fill') as HTMLDivElement;
    const progressLabel = body.querySelector('.aqt-progress-label') as HTMLDivElement;

    const autosaveCheckbox = body.querySelector('.aqt-autosave-checkbox') as HTMLInputElement;

    const setStatus = (msg: string) => {
        statusText.textContent = msg;
    };

    const updateProgress = (current: number, total: number) => {
        progressContainer.style.display = 'block';
        const percent = Math.round((current / total) * 100);
        progressFill.style.width = `${percent}%`;
        progressLabel.textContent = `${current} of ${total} (${percent}%)`;
    };

    const savePage = async () => {
        try {
            const pageContainer = getContentContainer();
            const progress = getChapterProgress();
            const h4Count = pageContainer.querySelectorAll('h4[class*="font-cera-pro"], h4').length;
            const isSinglePage = !progress || progress.total <= 1 || h4Count > 1;

            const chapters = extractChaptersFromPage();

            if (chapters.length === 0) {
                setStatus('No content found on current page.');
                return;
            }

            const existingBook = await getBlinkistBookContent(slug);
            const { title, author } = await getValidBookInfo(10000);
            const coverUrl = getBookCoverUrl();
            const description = getBookDescription();

            const bookContent: BlinkistBookContent = existingBook || {
                slug,
                title,
                author,
                coverUrl,
                description,
                chapters: [],
                scrapedAt: Date.now()
            };

            bookContent.title = bookContent.title || title;
            bookContent.author = bookContent.author || author;
            bookContent.coverUrl = bookContent.coverUrl || coverUrl;
            bookContent.description = bookContent.description || description;

            if (isSinglePage) {
                bookContent.chapters = chapters;
            } else if (progress && progress.total > 1 && chapters.length === 1) {
                const currentIdx = progress.current - 1;
                chapters[0].index = currentIdx;

                const existingChIndex = bookContent.chapters.findIndex(c => c.index === currentIdx);
                if (existingChIndex > -1) {
                    bookContent.chapters[existingChIndex] = chapters[0];
                } else {
                    bookContent.chapters.push(chapters[0]);
                }
            } else {
                for (const newCh of chapters) {
                    const existingChIndex = bookContent.chapters.findIndex(c => c.index === newCh.index);
                    if (existingChIndex > -1) {
                        bookContent.chapters[existingChIndex] = newCh;
                    } else {
                        bookContent.chapters.push(newCh);
                    }
                }
            }

            bookContent.chapters.sort((a, b) => a.index - b.index);

            bookContent.scrapedAt = Date.now();
            await saveBlinkistBookContent(slug, bookContent);

            if (isSinglePage) {
                setStatus(`Saved ${chapters.length} chapters.`);
                updateProgress(bookContent.chapters.length, bookContent.chapters.length);
            } else if (progress) {
                setStatus(`Saved: "${chapters[0].title}"`);
                updateProgress(bookContent.chapters.length, progress.total);
            } else {
                setStatus(`Saved: "${chapters[0].title}"`);
                updateProgress(bookContent.chapters.length, bookContent.chapters.length);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setStatus(`Error saving: ${msg}`);
        }
    };

    singleBtn.addEventListener('click', () => {
        void savePage();
    });

    const runAutoScrape = async () => {
        if (isScraping) {
            isScraping = false;
            scrapeBtn.textContent = 'Auto-Scrape Book';
            setStatus('Scraping stopped.');
            return;
        }

        isScraping = true;
        scrapeBtn.textContent = 'Stop Scraping';
        scrapeBtn.style.backgroundColor = '#d93838';
        singleBtn.disabled = true;

        try {
            const pageContainer = getContentContainer();
            const progress = getChapterProgress();
            const h4Count = pageContainer.querySelectorAll('h4[class*="font-cera-pro"], h4').length;
            const isSinglePage = !progress || progress.total <= 1 || h4Count > 1;

            if (isSinglePage) {
                setStatus('Extracting continuous/single-page layout...');
                await new Promise(r => setTimeout(r, 500));
                await savePage();
                setStatus('Success! Full summary stored.');
            } else {
                const existingBook = await getBlinkistBookContent(slug);
                const { title, author } = await getValidBookInfo(10000);
                const coverUrl = getBookCoverUrl();
                const description = getBookDescription();

                const bookContent: BlinkistBookContent = existingBook || {
                    slug,
                    title,
                    author,
                    coverUrl,
                    description,
                    chapters: [],
                    scrapedAt: Date.now()
                };

                bookContent.title = bookContent.title || title;
                bookContent.author = bookContent.author || author;
                bookContent.coverUrl = bookContent.coverUrl || coverUrl;
                bookContent.description = bookContent.description || description;

                let consecutiveErrors = 0;

                while (isScraping) {
                    const currentProgress = getChapterProgress();
                    const chapters = extractChaptersFromPage();

                    if (!currentProgress || chapters.length === 0) {
                        consecutiveErrors++;
                        if (consecutiveErrors > 10) {
                            throw new Error('Reader content not loading. Are you logged in?');
                        }
                        setStatus(`Waiting for content... (${consecutiveErrors}/10)`);
                        await new Promise(r => setTimeout(r, 400));
                        continue;
                    }
                    consecutiveErrors = 0;

                    const currentIdx = currentProgress.current - 1;
                    const totalChapters = currentProgress.total;

                    const currentChapter = chapters[0];
                    currentChapter.index = currentIdx;

                    const existingChIndex = bookContent.chapters.findIndex(c => c.index === currentIdx);
                    if (existingChIndex > -1) {
                        bookContent.chapters[existingChIndex] = currentChapter;
                    } else {
                        bookContent.chapters.push(currentChapter);
                    }

                    bookContent.scrapedAt = Date.now();
                    await saveBlinkistBookContent(slug, bookContent);

                    updateProgress(bookContent.chapters.length, totalChapters);
                    setStatus(`Scraped blink ${currentProgress.current} of ${totalChapters}`);

                    const isFinished = bookContent.chapters.length >= totalChapters &&
                                       bookContent.chapters.every(c => c.paragraphs.length > 0);

                    if (isFinished || currentProgress.current === totalChapters) {
                        setStatus('Success! Full summary stored.');
                        break;
                    }

                    // Navigate Next
                    navigateNext();

                    // Wait for DOM to load next chapter
                    let changed = false;
                    for (let i = 0; i < 25; i++) {
                        await new Promise(r => setTimeout(r, 150));
                        if (!isScraping) break;
                        const newProgress = getChapterProgress();
                        const newChapters = extractChaptersFromPage();
                        if (newProgress && (newProgress.current !== currentProgress.current || 
                            (newChapters.length > 0 && newChapters[0].title !== currentChapter.title))) {
                            changed = true;
                            break;
                        }
                    }

                    if (!changed && isScraping) {
                        navigateNext();
                    }
                }
            }
        } catch (err) {
            console.error('[AQT Scraper] Error:', err);
            const msg = err instanceof Error ? err.message : String(err);
            setStatus(`Failed: ${msg}`);
        } finally {
            isScraping = false;
            scrapeBtn.textContent = 'Auto-Scrape Book';
            scrapeBtn.style.backgroundColor = '';
            singleBtn.disabled = false;
        }
    };

    scrapeBtn.addEventListener('click', () => {
        void runAutoScrape();
    });

    // Check storage and handle autosave preferences on load
    setTimeout(async () => {
        try {
            const stored = await browser.storage.local.get('blinkist_autosave_enabled');
            const autosaveEnabled = stored.blinkist_autosave_enabled === true;
            if (autosaveCheckbox) {
                autosaveCheckbox.checked = autosaveEnabled;
            }

            // Listen for checkbox changes
            autosaveCheckbox.addEventListener('change', async () => {
                await browser.storage.local.set({ blinkist_autosave_enabled: autosaveCheckbox.checked });
            });

            const existingBook = await getBlinkistBookContent(slug);
            if (existingBook && existingBook.chapters && existingBook.chapters.length > 0) {
                setStatus(`Saved summary loaded (${existingBook.chapters.length} blinks).`);
            } else {
                setStatus('Ready to save summary.');
            }

            // If auto-save is enabled and the book is not saved yet, trigger save after delay (e.g. 10 seconds total)
            if (autosaveEnabled) {
                const hasExisting = existingBook && existingBook.chapters && existingBook.chapters.length > 0;
                if (!hasExisting) {
                    setStatus('Auto-save active. Waiting 10s for reader metadata to settle...');
                    setTimeout(async () => {
                        setStatus('Auto-saving summary...');
                        await savePage();
                    }, 8500); // 1.5s already passed, wait another 8.5s to make it 10s total
                }
            }
        } catch (e) {
            console.error('[AQT Scraper] Error checking library status:', e);
            setStatus('Ready to save summary.');
        }
    }, 1500);
}

function setupBookPageScraper(slug: string) {
    // Optionally save book detail page metadata
    setTimeout(async () => {
        try {
            const stored = await browser.storage.local.get('blinkist_autosave_enabled');
            const autosaveEnabled = stored.blinkist_autosave_enabled === true;
            if (!autosaveEnabled) return;

            const { title, author } = await getValidBookInfo(5000);
            if (!title || isGenericTitle(title)) return;

            const coverUrl = getBookCoverUrl();
            const description = getBookDescription();

            const existingBook = await getBlinkistBookContent(slug);
            const bookContent: BlinkistBookContent = existingBook || {
                slug,
                title,
                author,
                coverUrl,
                description,
                chapters: [],
                scrapedAt: Date.now()
            };

            bookContent.title = bookContent.title || title;
            bookContent.author = bookContent.author || author;
            bookContent.coverUrl = bookContent.coverUrl || coverUrl;
            bookContent.description = bookContent.description || description;

            await saveBlinkistBookContent(slug, bookContent);
            console.log(`[AQT Scraper] Pre-saved book metadata for ${title}`);
        } catch (e) {
            console.error('[AQT Scraper] Failed to save metadata:', e);
        }
    }, 2000);
}
