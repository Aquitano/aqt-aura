import { DAILY_USAGE_KEY, TIME_LIMITS_KEY, TimeLimit, getDomainFromUrl, normalizeDomain } from '@/utils/time-limits';
import { useEffect, useState } from 'react';

interface TimeLimitScreenProps {
    onBack: () => void;
}

export function TimeLimitScreen({ onBack }: TimeLimitScreenProps) {
    const [limits, setLimits] = useState<TimeLimit[]>([]);
    const [usage, setUsage] = useState<Record<string, number>>({});
    const [newDomain, setNewDomain] = useState('');
    const [newLimit, setNewLimit] = useState('');

    useEffect(() => {
        const load = async () => {
            const stored = await browser.storage.local.get([TIME_LIMITS_KEY, DAILY_USAGE_KEY]);
            setLimits((stored[TIME_LIMITS_KEY] as TimeLimit[] | undefined) ?? []);
            setUsage((stored[DAILY_USAGE_KEY] as Record<string, number> | undefined) ?? {});
        };
        load();

        const listener = (changes: any) => {
            if (changes[DAILY_USAGE_KEY]) {
                setUsage((changes[DAILY_USAGE_KEY].newValue as Record<string, number> | undefined) ?? {});
            }
        };
        browser.storage.local.onChanged.addListener(listener);
        return () => browser.storage.local.onChanged.removeListener(listener);
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDomain || !newLimit) return;

        const mins = Number.parseInt(newLimit, 10);
        if (Number.isNaN(mins) || mins <= 0) return;

        let domain = normalizeDomain(newDomain);
        if (domain.includes('://')) {
            const extracted = getDomainFromUrl(domain);
            if (extracted) domain = extracted;
        }

        const newItem: TimeLimit = {
            id: Date.now().toString(),
            domain,
            minutes: mins,
        };

        const updated = [...limits, newItem];
        setLimits(updated);
        await browser.storage.local.set({ [TIME_LIMITS_KEY]: updated });
        setNewDomain('');
        setNewLimit('');
    };

    const handleDelete = async (id: string) => {
        const updated = limits.filter((l) => l.id !== id);
        setLimits(updated);
        await browser.storage.local.set({ [TIME_LIMITS_KEY]: updated });
    };

    return (
        <div className="screen">
            <header className="screen-header">
                <button onClick={onBack} className="back-button">
                    ←
                </button>
                <h2>Time Limits</h2>
            </header>

            <div className="content">
                <form onSubmit={handleAdd} className="add-limit-form">
                    <input
                        type="text"
                        placeholder="Domain (e.g. reddit.com)"
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        className="input-field"
                    />
                    <input
                        type="number"
                        placeholder="Limit (mins)"
                        value={newLimit}
                        onChange={(e) => setNewLimit(e.target.value)}
                        className="input-field"
                        style={{ width: '80px' }}
                    />
                    <button type="submit" className="action-button primary">
                        Add
                    </button>
                </form>

                <div className="limits-list">
                    {limits.map((l) => {
                        const used = usage[l.domain] || 0;
                        const pct = Math.min(100, (used / l.minutes) * 100);

                        return (
                            <div key={l.id} className="limit-item">
                                <div className="limit-info">
                                    <div className="limit-domain">{l.domain}</div>
                                    <div className="limit-progress-bar">
                                        <div
                                            className="limit-progress-fill"
                                            style={{
                                                width: `${pct}%`,
                                                backgroundColor: pct >= 100 ? '#ff4444' : '#4CAF50',
                                            }}
                                        />
                                    </div>
                                    <div className="limit-stats">
                                        {Math.floor(used)} / {l.minutes} mins
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(l.id)} className="delete-button">
                                    ×
                                </button>
                            </div>
                        );
                    })}
                    {limits.length === 0 && <div className="empty-state">No limits set.</div>}
                </div>
            </div>

            <style>{`
                .screen-header {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                }
                .back-button {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 5px;
                }
                .add-limit-form {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                }
                .input-field {
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    padding: 8px 12px;
                    border-radius: 6px;
                    color: white;
                    flex: 1;
                }
                .action-button.primary {
                    background: #4A90E2;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 8px 16px;
                    cursor: pointer;
                    font-weight: 500;
                }
                .limit-item {
                    background: rgba(255,255,255,0.05);
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 10px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .limit-info {
                    flex: 1;
                }
                .limit-domain {
                    font-weight: 500;
                    margin-bottom: 4px;
                }
                .limit-progress-bar {
                    height: 4px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 2px;
                    margin-bottom: 4px;
                    overflow: hidden;
                }
                .limit-progress-fill {
                    height: 100%;
                    transition: width 0.3s ease;
                }
                .limit-stats {
                    font-size: 11px;
                    color: #aaa;
                }
                .delete-button {
                    background: none;
                    border: none;
                    color: #666;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 5px;
                }
                .delete-button:hover {
                    color: #ff4444;
                }
                .empty-state {
                    text-align: center;
                    color: #666;
                    margin-top: 30px;
                }
            `}</style>
        </div>
    );
}
