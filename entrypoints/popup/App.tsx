
import { mergeWithDefaults } from "@/utils/storage";
import { DEFAULT_ELEMENTS, STORAGE_KEY, YoutubeElement } from "@/utils/youtube";
import { useEffect, useRef, useState } from "react";
import "./App.css";

// --- Types ---
type Screen = "home" | "youtube";

interface CollapsibleSectionProps {
    title: string;
    items: YoutubeElement[];
    isOpen: boolean;
    onToggleOpen: () => void;
    onToggleItem: (id: string, checked: boolean) => void;
}

// --- Components ---
const CollapsibleSection = ({
    title,
    items,
    isOpen,
    onToggleOpen,
    onToggleItem,
}: CollapsibleSectionProps) => (
    <div className="category-section">
        <button
            type="button"
            className={`category-header ${isOpen ? "open" : ""}`}
            onClick={onToggleOpen}
        >
            <h3>{title}</h3>
            <span className="chevron" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                        d="M6 9L12 15L18 9"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </span>
        </button>

        {isOpen && (
            <div className="toggles-grid">
                {items.map((el) => (
                    <label key={el.id} className="toggle-item">
                        <span className="toggle-label">{el.label || el.id}</span>
                        <span className="switch">
                            <input
                                type="checkbox"
                                checked={!!el.checked}
                                onChange={(e) => onToggleItem(el.id, e.target.checked)}
                            />
                            <span className="slider" />
                        </span>
                    </label>
                ))}
            </div>
        )}
    </div>
);

const HomeScreen = ({ onNavigate }: { onNavigate: () => void }) => (
    <div className="screen-content">
        <button className="nav-card" onClick={onNavigate} type="button">
            <div className="nav-card-icon yt-icon">
                {/* Simple Play Icon */}
                <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M8 5v14l11-7z" />
                </svg>
            </div>
            <div className="nav-card-info">
                <h3>YouTube</h3>
                <p>Customize focus & appearance</p>
            </div>
            <div className="nav-arrow">→</div>
        </button>

        <button className="nav-card disabled" type="button" disabled>
            <div className="nav-card-icon generic-icon">
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    width="24"
                    height="24"
                >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
            </div>
            <div className="nav-card-info">
                <h3>More Coming Soon</h3>
                <p>Support for other sites</p>
            </div>
        </button>
    </div>
);

const YouTubeScreen = ({
    onBack,
    elements,
    onToggleItem,
}: {
    onBack: () => void;
    elements: YoutubeElement[];
    onToggleItem: (id: string, checked: boolean) => void;
}) => {
    // Local state for section expansion
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

    // Grouping logic inside the component (simple enough)
    const categoryOrder = ["Home", "Shorts", "Video Player", "Header", "Sidebar", "General", "Other"];
    const grouped = categoryOrder.map(cat => ({
        title: cat,
        items: elements.filter(e => (e.category || "Other") === cat)
    })).filter(g => g.items.length > 0);

    const toggleSection = (title: string) => {
        setOpenSections(prev => ({ ...prev, [title]: !prev[title] }));
    };

    return (
        <div className="screen-content fade-in">
            <div className="sub-header">
                <button className="back-btn" onClick={onBack} type="button">
                    ← Back
                </button>
                <h2>YouTube Settings</h2>
            </div>

            <div className="settings-list">
                {grouped.map((group) => (
                    <CollapsibleSection
                        key={group.title}
                        title={group.title}
                        items={group.items}
                        isOpen={!!openSections[group.title]}
                        onToggleOpen={() => toggleSection(group.title)}
                        onToggleItem={onToggleItem}
                    />
                ))}
            </div>
        </div>
    );
};

// --- Main App ---
export default function App() {
    const [screen, setScreen] = useState<Screen>("home");
    const [elements, setElements] = useState<YoutubeElement[]>(DEFAULT_ELEMENTS);
    const [loading, setLoading] = useState(true);
    const hasLoadedRef = useRef(false);

    // Initial Load
    useEffect(() => {
        async function load() {
            try {
                const storedObj = await browser.storage.local.get(STORAGE_KEY);
                const merged = mergeWithDefaults(DEFAULT_ELEMENTS, storedObj?.[STORAGE_KEY]);
                setElements(merged);
            } catch (e) {
                console.error("Failed to load settings", e);
            } finally {
                setLoading(false);
                hasLoadedRef.current = true;
            }
        }
        load();
    }, []);

    // Save on Change
    useEffect(() => {
        if (!hasLoadedRef.current) return;
        browser.storage.local.set({ [STORAGE_KEY]: elements }).catch(console.error);
    }, [elements]);

    const handleToggle = (id: string, checked: boolean) => {
        setElements(prev => prev.map(el => el.id === id ? { ...el, checked } : el));
    };

    if (loading) return <div className="loading">Loading...</div>;

    return (
        <div className="container">
            <header className="main-header">
                <div className="header-brand">
                    <div className="logo-placeholder">AQT</div>
                    <h1>AQT Browser</h1>
                </div>
            </header>

            <main>
                {screen === "home" ? (
                    <HomeScreen onNavigate={() => setScreen("youtube")} />
                ) : (
                    <YouTubeScreen
                        onBack={() => setScreen("home")}
                        elements={elements}
                        onToggleItem={handleToggle}
                    />
                )}
            </main>
        </div>
    );
}
