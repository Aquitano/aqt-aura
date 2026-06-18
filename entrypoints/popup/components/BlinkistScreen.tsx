import { useEffect, useState, useMemo } from 'react';
import {
    getBlinkistBooksIndex,
    getBlinkistBookContent,
    deleteBlinkistBook,
    type BlinkistBookMeta,
    type BlinkistBookContent,
} from '@/utils/blinkist';

interface BlinkistScreenProps {
    readonly onBack: () => void;
}

type ReaderLayout = 'chapters' | 'continuous';
type FontTheme = 'sans' | 'serif';

export function BlinkistScreen({ onBack }: BlinkistScreenProps) {
    const [books, setBooks] = useState<BlinkistBookMeta[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedBookSlug, setSelectedBookSlug] = useState<string | null>(null);
    const [bookContent, setBookContent] = useState<BlinkistBookContent | null>(null);
    const [activeChapterIndex, setActiveChapterIndex] = useState(0);

    // Reader Customization State
    const [readerLayout, setReaderLayout] = useState<ReaderLayout>('chapters');
    const [fontTheme, setFontTheme] = useState<FontTheme>('sans');
    const [fontSize, setFontSize] = useState<number>(16);

    const loadBooks = async () => {
        setLoading(true);
        const index = await getBlinkistBooksIndex();
        setBooks(index);
        setLoading(false);
    };

    useEffect(() => {
        loadBooks();
    }, []);

    // Load full book content when selected
    useEffect(() => {
        if (!selectedBookSlug) {
            setBookContent(null);
            return;
        }

        async function loadContent() {
            const content = await getBlinkistBookContent(selectedBookSlug!);
            if (content) {
                // Sort chapters by index to ensure correct ordering
                content.chapters.sort((a, b) => a.index - b.index);
                setBookContent(content);
                setActiveChapterIndex(0);
            }
        }

        loadContent();
    }, [selectedBookSlug]);

    const handleDelete = async (slug: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Avoid triggering card click
        if (confirm('Are you sure you want to delete this book summary?')) {
            await deleteBlinkistBook(slug);
            await loadBooks();
            if (selectedBookSlug === slug) {
                setSelectedBookSlug(null);
            }
        }
    };

    const filteredBooks = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return books;
        return books.filter((b) => b.title.toLowerCase().includes(query) || b.author.toLowerCase().includes(query));
    }, [books, searchQuery]);

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="screen-content">
                <div className="sub-header">
                    <button className="back-btn" onClick={onBack} type="button">
                        <span aria-hidden="true" className="back-btn-icon">
                            ←
                        </span>
                        <span>Back</span>
                    </button>
                    <h2>Blinkist Library</h2>
                </div>
                <div className="loading">Loading library...</div>
            </div>
        );
    }

    // --- Reader Mode ---
    if (selectedBookSlug && bookContent) {
        const activeChapter = bookContent.chapters[activeChapterIndex];

        return (
            <div className="screen-content fade-in blinkist-reader-mode">
                <div className="sub-header blinkist-reader-header">
                    <button className="back-btn" onClick={() => setSelectedBookSlug(null)} type="button">
                        <span aria-hidden="true" className="back-btn-icon">
                            ←
                        </span>
                        <span>Library</span>
                    </button>
                    <div className="reader-settings-bar">
                        <button
                            className={`settings-toggle-btn ${fontTheme === 'serif' ? 'active' : ''}`}
                            onClick={() => setFontTheme(fontTheme === 'sans' ? 'serif' : 'sans')}
                            title="Toggle Serif/Sans-Serif Font"
                            type="button"
                        >
                            {fontTheme === 'sans' ? 'Serif' : 'Sans'}
                        </button>
                        <div className="size-controls">
                            <button
                                onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                                disabled={fontSize <= 12}
                                type="button"
                            >
                                A-
                            </button>
                            <span className="font-size-indicator">{fontSize}px</span>
                            <button
                                onClick={() => setFontSize(Math.min(24, fontSize + 2))}
                                disabled={fontSize >= 24}
                                type="button"
                            >
                                A+
                            </button>
                        </div>
                        <button
                            className={`settings-toggle-btn ${readerLayout === 'continuous' ? 'active' : ''}`}
                            onClick={() => setReaderLayout(readerLayout === 'chapters' ? 'continuous' : 'chapters')}
                            title="Toggle Layout"
                            type="button"
                        >
                            {readerLayout === 'chapters' ? 'All Blinks' : 'One Blink'}
                        </button>
                    </div>
                </div>

                <div className="blinkist-reader-metadata">
                    <h1 className="reader-book-title">{bookContent.title}</h1>
                    <p className="reader-book-author">by {bookContent.author}</p>
                </div>

                {readerLayout === 'chapters' ? (
                    // --- Paginated Chapter Mode ---
                    <div className="blinkist-reader-content">
                        {bookContent.chapters.length > 0 ? (
                            <>
                                <div className="chapter-nav-dropdown-container">
                                    <label htmlFor="chapter-select" className="sr-only">
                                        Select Blink
                                    </label>
                                    <select
                                        id="chapter-select"
                                        className="chapter-select"
                                        value={activeChapterIndex}
                                        onChange={(e) => setActiveChapterIndex(Number(e.target.value))}
                                    >
                                        {bookContent.chapters.map((ch, idx) => (
                                            <option key={ch.index} value={idx}>
                                                Blink {idx + 1}: {ch.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {activeChapter ? (
                                    <article
                                        className={`reader-body font-${fontTheme}`}
                                        style={{ fontSize: `${fontSize}px` }}
                                    >
                                        <h2 className="reader-chapter-title">
                                            {activeChapterIndex + 1}. {activeChapter.title}
                                        </h2>
                                        <div className="reader-paragraphs">
                                            {activeChapter.paragraphs.map((p, pIdx) => (
                                                <p key={pIdx}>{p}</p>
                                            ))}
                                        </div>
                                    </article>
                                ) : (
                                    <div className="empty-chapter">Blink content not loaded.</div>
                                )}

                                <div className="reader-navigation-footer">
                                    <button
                                        className="nav-btn"
                                        disabled={activeChapterIndex === 0}
                                        onClick={() => setActiveChapterIndex(activeChapterIndex - 1)}
                                        type="button"
                                    >
                                        ◀ Prev
                                    </button>
                                    <span className="chapter-progress-label">
                                        Blink {activeChapterIndex + 1} of {bookContent.chapters.length}
                                    </span>
                                    <button
                                        className="nav-btn"
                                        disabled={activeChapterIndex === bookContent.chapters.length - 1}
                                        onClick={() => setActiveChapterIndex(activeChapterIndex + 1)}
                                        type="button"
                                    >
                                        Next ▶
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="empty-book">
                                No blinks extracted yet. Open the book in the web reader to scrape chapters.
                            </div>
                        )}
                    </div>
                ) : (
                    // --- Continuous Single Page Scroll Mode ---
                    <div className="blinkist-reader-content scrollable">
                        <div className="continuous-view">
                            {bookContent.chapters.map((ch, idx) => (
                                <article
                                    key={ch.index}
                                    className={`reader-body font-${fontTheme} continuous-chapter-item`}
                                    style={{ fontSize: `${fontSize}px` }}
                                >
                                    <h2 className="reader-chapter-title">
                                        {idx + 1}. {ch.title}
                                    </h2>
                                    <div className="reader-paragraphs">
                                        {ch.paragraphs.map((p, pIdx) => (
                                            <p key={pIdx}>{p}</p>
                                        ))}
                                    </div>
                                    {idx < bookContent.chapters.length - 1 && <hr className="chapter-divider" />}
                                </article>
                            ))}
                            {bookContent.chapters.length === 0 && (
                                <div className="empty-book">No blinks extracted yet.</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // --- Library Dashboard Mode ---
    return (
        <div className="screen-content fade-in">
            <div className="sub-header">
                <button className="back-btn" onClick={onBack} type="button">
                    <span aria-hidden="true" className="back-btn-icon">
                        ←
                    </span>
                    <span>Back</span>
                </button>
                <h2>Blinkist Library</h2>
            </div>

            <p className="goodreads-description">
                Access your offline library of saved book summaries scraped from Blinkist.
            </p>

            <div className="search-bar-container">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title or author..."
                    className="library-search-input"
                    autoComplete="off"
                    spellCheck={false}
                />
                {searchQuery && (
                    <button className="clear-search-btn" onClick={() => setSearchQuery('')} type="button">
                        ×
                    </button>
                )}
            </div>

            <div className="blinkist-books-list">
                {filteredBooks.length > 0 ? (
                    filteredBooks.map((book) => (
                        <button
                            key={book.slug}
                            className="blinkist-book-card"
                            onClick={() => setSelectedBookSlug(book.slug)}
                            type="button"
                        >
                            <div className="book-card-cover-container">
                                {book.coverUrl ? (
                                    <img
                                        src={book.coverUrl}
                                        alt={`${book.title} cover`}
                                        className="book-card-cover"
                                        onError={(e) => {
                                            // Fallback on load error
                                            (e.target as HTMLElement).style.display = 'none';
                                        }}
                                    />
                                ) : null}
                                <div className="book-card-cover-fallback">
                                    <span>📚</span>
                                </div>
                            </div>
                            <div className="book-card-info">
                                <h3 className="book-card-title" title={book.title}>
                                    {book.title}
                                </h3>
                                <p className="book-card-author">by {book.author}</p>
                                <div className="book-card-stats">
                                    <span className="chapters-tag">
                                        {book.scrapedChaptersCount}/{book.chaptersCount} Blinks
                                    </span>
                                    <span className="date-tag">{formatDate(book.scrapedAt)}</span>
                                </div>
                            </div>
                            <div className="book-card-actions">
                                <button
                                    className="delete-book-btn"
                                    onClick={(e) => handleDelete(book.slug, e)}
                                    title="Delete Summary"
                                    aria-label={`Delete summary for ${book.title}`}
                                    type="button"
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        width="16"
                                        height="16"
                                    >
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        <line x1="10" y1="11" x2="10" y2="17" />
                                        <line x1="14" y1="11" x2="14" y2="17" />
                                    </svg>
                                </button>
                            </div>
                        </button>
                    ))
                ) : (
                    <div className="empty-library">
                        {searchQuery ? 'No summaries match your search.' : 'Your library is empty.'}
                        <p className="library-help-text">
                            Open a summary on{' '}
                            <a href="https://www.blinkist.com" target="_blank" rel="noopener noreferrer">
                                Blinkist
                            </a>{' '}
                            and use the scraper overlay to add books to your library.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
