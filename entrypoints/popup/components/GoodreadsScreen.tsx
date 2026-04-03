import {
    DEFAULT_GOODLIB_SETTINGS,
    GOODLIB_STORAGE_KEY,
    SOURCE_KEYS,
    SOURCE_META,
    mergeSettings,
    type GoodlibSettings,
    type SourceKey,
} from '@/utils/goodreads';
import { useCallback, useEffect, useRef, useState } from 'react';

interface GoodreadsScreenProps {
    readonly onBack: () => void;
}

interface SourceDisplayConfig {
    readonly key: SourceKey;
    readonly label: string;
    readonly settingKey: keyof GoodlibSettings;
    readonly icon: string;
    readonly color: string;
    readonly textColor: string;
}

// Derive display config from SOURCE_META
const SOURCES: readonly SourceDisplayConfig[] = SOURCE_KEYS.map((key) => {
    let label: string;
    let color: string;

    if (key === 'zlib') {
        label = 'Z-Library';
        color = '#3273dc';
    } else if (key === 'anna') {
        label = "Anna's Archive";
        color = '#00d1b2';
    } else {
        label = 'Project Gutenberg';
        color = '#ffdd57';
    }

    return {
        key,
        label,
        settingKey: `${key}Enabled` as keyof GoodlibSettings,
        icon: SOURCE_META[key].glyph,
        color,
        textColor: key === 'gutenberg' ? '#333' : '#fff',
    };
});

export function GoodreadsScreen({ onBack }: GoodreadsScreenProps) {
    const [settings, setSettings] = useState<GoodlibSettings>(DEFAULT_GOODLIB_SETTINGS);
    const [loading, setLoading] = useState(true);
    const hasLoadedRef = useRef(false);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        let mounted = true;

        async function load() {
            try {
                const stored = await browser.storage.local.get(GOODLIB_STORAGE_KEY);
                if (!mounted) return;

                const storedSettings = stored[GOODLIB_STORAGE_KEY] as Partial<GoodlibSettings> | undefined;
                setSettings(mergeSettings(storedSettings));
            } catch (e) {
                console.error('[GoodLib] Failed to load settings:', e);
            } finally {
                if (mounted) {
                    setLoading(false);
                    hasLoadedRef.current = true;
                }
            }
        }

        load();
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (!hasLoadedRef.current) return;

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            browser.storage.local.set({ [GOODLIB_STORAGE_KEY]: settings }).catch(console.error);
        }, 300);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [settings]);

    const handleToggle = useCallback((key: keyof GoodlibSettings) => {
        setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const handleDomainChange = useCallback((key: 'zlibDomain' | 'annaDomain', value: string) => {
        const sanitized = value
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\//, '')
            .replace(/\/+$/, '');
        setSettings((prev) => ({ ...prev, [key]: sanitized }));
    }, []);

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
                    <h2>Book Search</h2>
                </div>
                <div className="loading">Loading...</div>
            </div>
        );
    }

    return (
        <div className="screen-content fade-in">
            <div className="sub-header">
                <button className="back-btn" onClick={onBack} type="button">
                    <span aria-hidden="true" className="back-btn-icon">
                        ←
                    </span>
                    <span>Back</span>
                </button>
                <h2>Book Search</h2>
            </div>

            <p className="goodreads-description">
                Quick search badges on Goodreads, Hardcover, and StoryGraph book pages.
            </p>

            <div className="category-section">
                <div className="category-header open">
                    <h3>Sources</h3>
                </div>
                <div className="toggles-grid">
                    {SOURCES.map((source) => (
                        <label key={source.key} className="toggle-item">
                            <div className="source-info">
                                <span
                                    className="source-icon"
                                    style={{ background: source.color, color: source.textColor }}
                                >
                                    {source.icon}
                                </span>
                                <span className="toggle-label">{source.label}</span>
                            </div>
                            <span className="switch">
                                <input
                                    type="checkbox"
                                    checked={settings[source.settingKey] as boolean}
                                    onChange={() => handleToggle(source.settingKey)}
                                />
                                <span className="slider" />
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="category-section">
                <div className="category-header open">
                    <h3>Custom Domains</h3>
                </div>
                <div className="domain-settings">
                    <div className="domain-input-group">
                        <label htmlFor="zlib-domain">Z-Library Domain</label>
                        <input
                            id="zlib-domain"
                            type="text"
                            value={settings.zlibDomain}
                            onChange={(e) => handleDomainChange('zlibDomain', e.target.value)}
                            placeholder={DEFAULT_GOODLIB_SETTINGS.zlibDomain}
                            className="domain-input"
                            autoComplete="off"
                            spellCheck={false}
                        />
                    </div>
                    <div className="domain-input-group">
                        <label htmlFor="anna-domain">Anna&apos;s Archive Domain</label>
                        <input
                            id="anna-domain"
                            type="text"
                            value={settings.annaDomain}
                            onChange={(e) => handleDomainChange('annaDomain', e.target.value)}
                            placeholder={DEFAULT_GOODLIB_SETTINGS.annaDomain}
                            className="domain-input"
                            autoComplete="off"
                            spellCheck={false}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
