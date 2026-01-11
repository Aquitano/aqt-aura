export const BlockOverlay = ({ onUnblock }: { onUnblock?: () => void }) => {
    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(0, 0, 0, 0.95)',
                zIndex: 2147483647, // Max z-index
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontFamily: 'Inter, system-ui, sans-serif',
                pointerEvents: 'all',
            }}
        >
            <div
                style={{
                    backgroundColor: '#1a1a1a',
                    padding: '2rem',
                    borderRadius: '16px',
                    textAlign: 'center',
                    border: '1px solid #333',
                    maxWidth: '400px',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                }}
            >
                <h1 style={{ margin: '0 0 1rem 0', fontSize: '24px', fontWeight: 600 }}>
                    Time Limit Exceeded
                </h1>
                <p style={{ margin: '0 0 2rem 0', color: '#888', lineHeight: 1.5 }}>
                    You've reached your daily limit for this website.
                    Time to get back to what matters.
                </p>
                <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                    <button
                        onClick={() => {
                            globalThis.history.back();
                            setTimeout(() => globalThis.close(), 100);
                        }}
                        style={{
                            backgroundColor: '#fff',
                            color: '#000',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'opacity 0.2s',
                        }}
                    >
                        Go Back / Close
                    </button>
                    {onUnblock && (
                        <button
                            onClick={onUnblock}
                            style={{
                                backgroundColor: 'transparent',
                                color: '#666',
                                border: '1px solid #333',
                                padding: '10px 20px',
                                borderRadius: '8px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                fontSize: '14px',
                            }}
                        >
                            Ignore (1m)
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
