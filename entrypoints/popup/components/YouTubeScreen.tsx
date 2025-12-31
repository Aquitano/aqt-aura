import { YoutubeElement } from '@/utils/youtube';
import { useState } from 'react';
import { CollapsibleSection } from './CollapsibleSection';

interface YouTubeScreenProps {
    readonly onBack: () => void;
    readonly elements: YoutubeElement[];
    readonly onToggleItem: (id: string, checked: boolean) => void;
    readonly playbackSpeed: number;
    readonly onSpeedChange: (speed: number) => void;
}

const CATEGORY_ORDER = ['Home', 'Shorts', 'Video Player', 'Header', 'Sidebar', 'General', 'Other'];

export function YouTubeScreen({ onBack, elements, onToggleItem, playbackSpeed, onSpeedChange }: YouTubeScreenProps) {
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

    const grouped = CATEGORY_ORDER.map((cat) => ({
        title: cat,
        items: elements.filter((e) => (e.category || 'Other') === cat),
    })).filter((g) => g.items.length > 0);

    const toggleSection = (title: string) => {
        setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
    };

    return (
        <div className="screen-content fade-in">
            <div className="sub-header">
                <button className="back-btn" onClick={onBack} type="button">
                    ← Back
                </button>
                <h2>YouTube Settings</h2>
            </div>

            <div className="speed-control-section">
                <h3>Default Playback Speed</h3>
                <div className="speed-control-row">
                    <input
                        type="range"
                        min="0.25"
                        max="5"
                        step="0.25"
                        value={playbackSpeed}
                        onChange={(e) => onSpeedChange(Number.parseFloat(e.target.value))}
                        className="speed-slider"
                    />
                    <div className="speed-value">
                        <span>{playbackSpeed}x</span>
                        <button className="reset-speed-btn" onClick={() => onSpeedChange(1)} title="Reset to 1x">
                            ↺
                        </button>
                    </div>
                </div>
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
}
