import { StatsFilter, GameMode } from '../stats/types';
import { format, subDays, subMonths } from 'date-fns';

interface FilterPanelProps {
    filter: StatsFilter;
    onFilterChange: (filter: StatsFilter) => void;
    totalMatches: number;
    filteredMatches: number;
}

export const FilterPanel = ({ filter, onFilterChange, totalMatches, filteredMatches }: FilterPanelProps) => {
    const handleGameModeChange = (mode: GameMode | 'ALL') => {
        onFilterChange({ ...filter, gameMode: mode });
    };

    const handleDatePreset = (preset: 'all' | 'week' | 'month' | '3months') => {
        const now = new Date();
        let startDate: Date | undefined;

        switch (preset) {
            case 'week':
                startDate = subDays(now, 7);
                break;
            case 'month':
                startDate = subMonths(now, 1);
                break;
            case '3months':
                startDate = subMonths(now, 3);
                break;
            case 'all':
            default:
                startDate = undefined;
                break;
        }

        onFilterChange({
            ...filter,
            startDate,
            endDate: preset === 'all' ? undefined : now,
        });
    };

    const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
        const date = value ? new Date(value) : undefined;
        if (type === 'start') {
            onFilterChange({ ...filter, startDate: date });
        } else {
            onFilterChange({ ...filter, endDate: date });
        }
    };

    return (
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                {/* ゲームモードフィルター */}
                <div>
                    <label className="block text-sm text-slate-400 mb-2">ゲームモード</label>
                    <div className="flex gap-2">
                        {(['ALL', 'RANKED_MATCH', 'CASUAL_MATCH'] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => handleGameModeChange(mode)}
                                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                                    filter.gameMode === mode
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                            >
                                {mode === 'ALL' ? '全て' : mode === 'RANKED_MATCH' ? 'ランク' : 'カジュアル'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 期間プリセット */}
                <div>
                    <label className="block text-sm text-slate-400 mb-2">期間</label>
                    <div className="flex gap-2">
                        {([
                            { key: 'all', label: '全期間' },
                            { key: 'week', label: '1週間' },
                            { key: 'month', label: '1ヶ月' },
                            { key: '3months', label: '3ヶ月' },
                        ] as const).map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => handleDatePreset(key)}
                                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                                    (key === 'all' && !filter.startDate) ||
                                    (key !== 'all' && filter.startDate)
                                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* カスタム日付 */}
                <div className="flex gap-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">開始日</label>
                        <input
                            type="date"
                            value={filter.startDate ? format(filter.startDate, 'yyyy-MM-dd') : ''}
                            onChange={(e) => handleCustomDateChange('start', e.target.value)}
                            className="bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">終了日</label>
                        <input
                            type="date"
                            value={filter.endDate ? format(filter.endDate, 'yyyy-MM-dd') : ''}
                            onChange={(e) => handleCustomDateChange('end', e.target.value)}
                            className="bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white"
                        />
                    </div>
                </div>

                {/* フィルター結果表示 */}
                <div className="text-right">
                    <div className="text-sm text-slate-400">表示中</div>
                    <div className="text-lg font-bold text-white">
                        {filteredMatches.toLocaleString()} / {totalMatches.toLocaleString()} 件
                    </div>
                </div>
            </div>
        </div>
    );
};
