import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DailyStats } from '../stats/types';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

interface DailyMatchChartProps {
    stats: DailyStats[];
}

export const DailyMatchChart = ({ stats }: DailyMatchChartProps) => {
    // 最新30日分のデータのみ表示
    const recentStats = stats.slice(-30);

    const chartData = recentStats.map((s) => ({
        date: s.date,
        displayDate: format(parseISO(s.date), 'M/d', { locale: ja }),
        総マッチ数: s.totalMatches,
        ランクマッチ: s.rankedMatches,
        カジュアル: s.casualMatches,
    }));

    const CustomTooltip = ({ active, payload, label }: {
        active?: boolean;
        payload?: { name: string; value: number; color: string }[];
        label?: string;
    }) => {
        if (active && payload && payload.length) {
            const dateStr = chartData.find(d => d.displayDate === label)?.date;
            const formattedDate = dateStr
                ? format(parseISO(dateStr), 'yyyy年M月d日', { locale: ja })
                : label;

            return (
                <div className="bg-slate-700 border border-slate-600 rounded p-3 text-sm">
                    <p className="font-bold text-white mb-2">{formattedDate}</p>
                    {payload.map((p) => (
                        <p key={p.name} style={{ color: p.color }}>
                            {p.name}: {p.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-white">日別マッチ数推移</h2>

            {stats.length === 0 ? (
                <div className="text-slate-400 text-center py-8">データがありません</div>
            ) : (
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                            <XAxis
                                dataKey="displayDate"
                                stroke="#94a3b8"
                                tick={{ fontSize: 12 }}
                                interval="preserveStartEnd"
                            />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="総マッチ数"
                                stroke="#60a5fa"
                                strokeWidth={2}
                                dot={{ fill: '#60a5fa', strokeWidth: 2, r: 3 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="ランクマッチ"
                                stroke="#fbbf24"
                                strokeWidth={2}
                                dot={{ fill: '#fbbf24', strokeWidth: 2, r: 3 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="カジュアル"
                                stroke="#34d399"
                                strokeWidth={2}
                                dot={{ fill: '#34d399', strokeWidth: 2, r: 3 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};
