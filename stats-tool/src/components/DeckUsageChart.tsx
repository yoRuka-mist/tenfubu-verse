import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { DeckUsageStats, CLASS_COLORS, CLASS_DISPLAY_NAMES } from '../stats/types';

interface DeckUsageChartProps {
    stats: DeckUsageStats[];
}

export const DeckUsageChart = ({ stats }: DeckUsageChartProps) => {
    const data = stats.map((s) => ({
        name: CLASS_DISPLAY_NAMES[s.class],
        value: s.count,
        percentage: s.percentage,
        color: CLASS_COLORS[s.class],
    }));

    const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: typeof data[0] }[] }) => {
        if (active && payload && payload.length) {
            const item = payload[0].payload;
            return (
                <div className="bg-slate-700 border border-slate-600 rounded p-2 text-sm">
                    <p className="font-bold" style={{ color: item.color }}>{item.name}</p>
                    <p className="text-slate-300">使用回数: {item.value}</p>
                    <p className="text-slate-300">使用率: {item.percentage}%</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-white">デッキ使用率</h2>
            {stats.reduce((sum, s) => sum + s.count, 0) === 0 ? (
                <div className="text-slate-400 text-center py-8">データがありません</div>
            ) : (
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percentage }) => `${name}: ${percentage}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* テーブル形式の詳細 */}
            <div className="mt-4">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-slate-400 border-b border-slate-700">
                            <th className="text-left py-2">クラス</th>
                            <th className="text-right py-2">使用回数</th>
                            <th className="text-right py-2">使用率</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map((s) => (
                            <tr key={s.class} className="border-b border-slate-700">
                                <td className="py-2">
                                    <span
                                        className="inline-block w-3 h-3 rounded-full mr-2"
                                        style={{ backgroundColor: CLASS_COLORS[s.class] }}
                                    />
                                    {CLASS_DISPLAY_NAMES[s.class]}
                                </td>
                                <td className="text-right py-2">{s.count.toLocaleString()}</td>
                                <td className="text-right py-2">{s.percentage}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
