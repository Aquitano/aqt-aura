interface HomeScreenProps {
    readonly onNavigate: (screen: 'youtube' | 'timelimits') => void;
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
        </div>
    );
}
