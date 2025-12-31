import { YoutubeElement } from '@/utils/youtube';

interface CollapsibleSectionProps {
    readonly title: string;
    readonly items: YoutubeElement[];
    readonly isOpen: boolean;
    readonly onToggleOpen: () => void;
    readonly onToggleItem: (id: string, checked: boolean) => void;
}

export function CollapsibleSection({ title, items, isOpen, onToggleOpen, onToggleItem }: CollapsibleSectionProps) {
    return (
        <div className="category-section">
            <button type="button" className={`category-header ${isOpen ? 'open' : ''}`} onClick={onToggleOpen}>
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
}
