import { OverviewStats } from '../stats/types';

interface OverviewPanelProps {
    stats: OverviewStats;
}

export const OverviewPanel = ({ stats }: OverviewPanelProps) => {
    const formatDuration = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}分${secs}秒`;
    };

    const items = [
        { label: '総マッチ数', value: stats.totalMatches.toLocaleString(), color: 'text-blue-400' },
        { label: 'ランクマッチ', value: stats.rankedMatches.toLocaleString(), color: 'text-yellow-400' },
        { label: 'カジュアル', value: stats.casualMatches.toLocaleString(), color: 'text-green-400' },
        { label: 'ユニークプレイヤー', value: stats.uniquePlayers.toLocaleString(), color: 'text-purple-400' },
        { label: '平均試合時間', value: formatDuration(stats.averageDuration), color: 'text-orange-400' },
    ];

    return (
        <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-white">概要</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {items.map((item) => (
                    <div key={item.label} className="bg-slate-700 rounded-lg p-4 text-center">
                        <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
                        <div className="text-sm text-slate-400 mt-1">{item.label}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};
