import {
    DEFAULT_PLAYBACK_SPEED,
    formatPlaybackSpeed,
    MAX_PLAYBACK_SPEED,
    MIN_PLAYBACK_SPEED,
    PLAYBACK_SPEED_STEP,
} from '@/utils/playback';
import { YoutubeElement } from '@/utils/youtube';
import { useMemo, useState } from 'react';
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

    const grouped = useMemo(
        () =>
            CATEGORY_ORDER.map((cat) => ({
                title: cat,
                items: elements.filter((e) => (e.category || 'Other') === cat),
            })).filter((g) => g.items.length > 0),
        [elements]
    );

    const toggleSection = (title: string) => {
        setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
    };

    return (
        <div className="screen-content fade-in">
            <div className="sub-header">
                <button className="back-btn" onClick={onBack} type="button">
                    <span aria-hidden="true" className="back-btn-icon">
                        ←
                    </span>
                    <span>Back</span>
                </button>
                <h2>YouTube Settings</h2>
            </div>

            <div className="speed-control-section">
                <h3>Default Playback Speed</h3>
                <div className="speed-control-row">
                    <input
                        type="range"
                        min={String(MIN_PLAYBACK_SPEED)}
                        max={String(MAX_PLAYBACK_SPEED)}
                        step={String(PLAYBACK_SPEED_STEP)}
                        value={playbackSpeed}
                        onChange={(e) => onSpeedChange(Number.parseFloat(e.target.value))}
                        className="speed-slider"
                    />
                    <div className="speed-value">
                        <span>{formatPlaybackSpeed(playbackSpeed)}</span>
                        <button
                            className="reset-speed-btn"
                            onClick={() => onSpeedChange(DEFAULT_PLAYBACK_SPEED)}
                            title="Reset to 1x"
                        >
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
