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

        const listener = (changes: Record<string, { newValue?: unknown; oldValue?: unknown }>) => {
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
        <div className="screen-content fade-in">
            <div className="sub-header">
                <button onClick={onBack} className="back-btn" type="button">
                    <span aria-hidden="true" className="back-btn-icon">
                        ←
                    </span>
                    <span>Back</span>
                </button>
                <h2>Time Limits</h2>
            </div>

            <p className="section-description">
                Set daily caps for distracting sites and track how much of the budget is already gone.
            </p>

            <div className="time-limit-shell">
                <form onSubmit={handleAdd} className="add-limit-form">
                    <input
                        type="text"
                        placeholder="Domain (e.g. reddit.com)"
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        className="input-field"
                    />
                    <div className="limit-form-row">
                        <input
                            type="number"
                            placeholder="Limit (mins)"
                            value={newLimit}
                            onChange={(e) => setNewLimit(e.target.value)}
                            className="input-field input-field-compact"
                        />
                        <button type="submit" className="action-button primary">
                            Add Limit
                        </button>
                    </div>
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
                                <button onClick={() => handleDelete(l.id)} className="delete-button" type="button">
                                    ×
                                </button>
                            </div>
                        );
                    })}
                    {limits.length === 0 && <div className="empty-state">No limits set.</div>}
                </div>
            </div>
        </div>
    );
}
