interface HomeScreenProps {
    readonly onNavigate: (screen: 'youtube' | 'timelimits' | 'goodreads' | 'blinkist') => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
    return (
        <div className="screen-content">
            <button className="nav-card" onClick={() => onNavigate('youtube')} type="button">
                <div className="nav-card-icon yt-icon">
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

            <button className="nav-card" onClick={() => onNavigate('timelimits')} type="button">
                <div className="nav-card-icon generic-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                </div>
                <div className="nav-card-info">
                    <h3>Time Limits</h3>
                    <p>Set daily usage limits</p>
                </div>
                <div className="nav-arrow">→</div>
            </button>

            <button className="nav-card" onClick={() => onNavigate('goodreads')} type="button">
                <div
                    className="nav-card-icon generic-icon"
                    style={{ background: 'rgba(0, 209, 178, 0.1)', color: '#00d1b2' }}
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                        <path d="M6 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6zm5 2h2v7h-2V6zm0 8h2v2h-2v-2z" />
                    </svg>
                </div>
                <div className="nav-card-info">
                    <h3>Book Search</h3>
                    <p>Quick links on Goodreads & more</p>
                </div>
                <div className="nav-arrow">→</div>
            </button>

            <button className="nav-card" onClick={() => onNavigate('blinkist')} type="button">
                <div
                    className="nav-card-icon generic-icon"
                    style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#c084fc' }}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" />
                    </svg>
                </div>
                <div className="nav-card-info">
                    <h3>Blinkist Library</h3>
                    <p>Read saved book summaries offline</p>
                </div>
                <div className="nav-arrow">→</div>
            </button>
        </div>
    );
}
