interface HomeScreenProps {
    readonly onNavigate: () => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
    return (
        <div className="screen-content">
            <button className="nav-card" onClick={onNavigate} type="button">
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

            <button className="nav-card disabled" type="button" disabled>
                <div className="nav-card-icon generic-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
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
}
