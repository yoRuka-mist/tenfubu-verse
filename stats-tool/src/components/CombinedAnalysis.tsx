import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CombinedStats, CLASS_DISPLAY_NAMES, CLASS_COLORS, ALL_CLASSES } from '../stats/types';

interface CombinedAnalysisProps {
    stats: CombinedStats[];
}

export const CombinedAnalysis = ({ stats }: CombinedAnalysisProps) => {
    // グラフ用データを整形
    const chartData = ALL_CLASSES.map((classType) => {
        const firstStats = stats.find(s => s.class === classType && s.isFirst);
        const secondStats = stats.find(s => s.class === classType && !s.isFirst);

        return {
            name: CLASS_DISPLAY_NAMES[classType],
            class: classType,
            先攻勝率: firstStats?.winRate || 0,
            後攻勝率: secondStats?.winRate || 0,
            先攻試合数: firstStats?.totalMatches || 0,
            後攻試合数: secondStats?.totalMatches || 0,
        };
    });

    const CustomTooltip = ({ active, payload, label }: {
        active?: boolean;
        payload?: { name: string; value: number; payload: typeof chartData[0] }[];
        label?: string;
    }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-slate-700 border border-slate-600 rounded p-3 text-sm">
                    <p className="font-bold text-white mb-2">{label}</p>
                    <div className="space-y-1">
                        <p className="text-cyan-400">
                            先攻: {data.先攻勝率.toFixed(1)}% ({data.先攻試合数}戦)
                        </p>
                        <p className="text-pink-400">
                            後攻: {data.後攻勝率.toFixed(1)}% ({data.後攻試合数}戦)
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    const getWinRateColor = (winRate: number): string => {
        if (winRate >= 55) return 'text-green-400';
        if (winRate >= 45) return 'text-slate-300';
        return 'text-red-400';
    };

    const totalMatches = stats.reduce((sum, s) => sum + s.totalMatches, 0);

    return (
        <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-white">複合分析（デッキ × 先攻/後攻）</h2>

            {totalMatches === 0 ? (
                <div className="text-slate-400 text-center py-8">データがありません</div>
            ) : (
                <>
                    {/* グラフ */}
                    <div className="h-64 mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                                <XAxis dataKey="name" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" domain={[0, 100]} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Bar dataKey="先攻勝率" fill="#22d3ee" name="先攻勝率 (%)" />
                                <Bar dataKey="後攻勝率" fill="#f472b6" name="後攻勝率 (%)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* 詳細テーブル */}
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-slate-400 border-b border-slate-700">
                                <th className="text-left py-2">クラス</th>
                                <th className="text-center py-2">先攻</th>
                                <th className="text-center py-2">後攻</th>
                                <th className="text-center py-2">差分</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ALL_CLASSES.map((classType) => {
                                const firstStats = stats.find(s => s.class === classType && s.isFirst);
                                const secondStats = stats.find(s => s.class === classType && !s.isFirst);
                                const diff = (firstStats?.winRate || 0) - (secondStats?.winRate || 0);

                                return (
                                    <tr key={classType} className="border-b border-slate-700">
                                        <td className="py-3">
                                            <span
                                                className="inline-block w-3 h-3 rounded-full mr-2"
                                                style={{ backgroundColor: CLASS_COLORS[classType] }}
                                            />
                                            {CLASS_DISPLAY_NAMES[classType]}
                                        </td>
                                        <td className="text-center py-3">
                                            <div className={`font-bold ${getWinRateColor(firstStats?.winRate || 0)}`}>
                                                {firstStats?.winRate.toFixed(1) || '-'}%
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {firstStats?.wins || 0}勝{firstStats?.losses || 0}敗
                                            </div>
                                        </td>
                                        <td className="text-center py-3">
                                            <div className={`font-bold ${getWinRateColor(secondStats?.winRate || 0)}`}>
                                                {secondStats?.winRate.toFixed(1) || '-'}%
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {secondStats?.wins || 0}勝{secondStats?.losses || 0}敗
                                            </div>
                                        </td>
                                        <td className="text-center py-3">
                                            <span className={diff > 0 ? 'text-cyan-400' : diff < 0 ? 'text-pink-400' : 'text-slate-400'}>
                                                {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                                            </span>
                                            <div className="text-xs text-slate-500">
                                                {diff > 0 ? '先攻有利' : diff < 0 ? '後攻有利' : '均等'}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </>
            )}
        </div>
    );
};
