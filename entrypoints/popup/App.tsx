import { PLAYBACK_SPEED_KEY } from '@/utils/playback';
import { mergeWithDefaults } from '@/utils/storage';
import { DEFAULT_ELEMENTS, STORAGE_KEY, YoutubeElement } from '@/utils/youtube';
import { useEffect, useRef, useState } from 'react';
import './App.css';
import { HomeScreen } from './components/HomeScreen';
import { YouTubeScreen } from './components/YouTubeScreen';

import { TimeLimitScreen } from './components/TimeLimitScreen';

type Screen = 'home' | 'youtube' | 'timelimits';

export default function App() {
    const [screen, setScreen] = useState<Screen>('home');
    const [elements, setElements] = useState<YoutubeElement[]>(DEFAULT_ELEMENTS);
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
    const [loading, setLoading] = useState(true);
    const hasLoadedRef = useRef(false);

    useEffect(() => {
        async function load() {
            try {
                const storedObj = await browser.storage.local.get(STORAGE_KEY);
                const merged = mergeWithDefaults(DEFAULT_ELEMENTS, storedObj?.[STORAGE_KEY]);
                setElements(merged);

                const storedSpeed = await browser.storage.local.get(PLAYBACK_SPEED_KEY);
                setPlaybackSpeed((storedSpeed?.[PLAYBACK_SPEED_KEY] as number) || 1);
            } catch (e) {
                console.error('Failed to load settings', e);
            } finally {
                setLoading(false);
                hasLoadedRef.current = true;
            }
        }
        load();
    }, []);

    useEffect(() => {
        if (!hasLoadedRef.current) return;
        browser.storage.local.set({ [STORAGE_KEY]: elements }).catch(console.error);
    }, [elements]);

    useEffect(() => {
        if (!hasLoadedRef.current) return;
        browser.storage.local.set({ [PLAYBACK_SPEED_KEY]: playbackSpeed }).catch(console.error);
    }, [playbackSpeed]);

    const handleToggle = (id: string, checked: boolean) => {
        setElements((prev) => prev.map((el) => (el.id === id ? { ...el, checked } : el)));
    };

    if (loading) return <div className="loading">Loading...</div>;

    return (
        <div className="container">
            <header className="main-header">
                <div className="header-brand">
                    <div className="logo-placeholder">AQT</div>
                    <h1>AQT Aura</h1>
                </div>
            </header>

            <main>
                {screen === 'home' && (
                    <HomeScreen onNavigate={(s) => setScreen(s)} />
                )}
                {screen === 'youtube' && (
                    <YouTubeScreen
                        onBack={() => setScreen('home')}
                        elements={elements}
                        onToggleItem={handleToggle}
                        playbackSpeed={playbackSpeed}
                        onSpeedChange={setPlaybackSpeed}
                    />
                )}
                {screen === 'timelimits' && (
                    <TimeLimitScreen onBack={() => setScreen('home')} />
                )}
            </main>
        </div>
    );
}
