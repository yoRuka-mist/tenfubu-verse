import { useState, useEffect, useCallback } from 'react';
import { MatchRecord, StatsFilter } from '../stats/types';
import { fetchAllMatches, filterMatches } from '../services/matchDataService';

interface UseMatchDataResult {
    matches: MatchRecord[];
    filteredMatches: MatchRecord[];
    loading: boolean;
    error: string | null;
    filter: StatsFilter;
    setFilter: (filter: StatsFilter) => void;
    refresh: () => Promise<void>;
}

export const useMatchData = (): UseMatchDataResult => {
    const [matches, setMatches] = useState<MatchRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<StatsFilter>({ gameMode: 'ALL' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await fetchAllMatches();
            setMatches(data);
        } catch (err) {
            console.error('Failed to fetch matches:', err);
            setError('データの取得に失敗しました');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredMatches = filterMatches(matches, filter);

    return {
        matches,
        filteredMatches,
        loading,
        error,
        filter,
        setFilter,
        refresh: fetchData,
    };
};
