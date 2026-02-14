import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { FirstTurnStats } from '../stats/types';
import { ClassFirstTurnStats } from '../stats/firstTurn';
import { CLASS_DISPLAY_NAMES, CLASS_COLORS, ClassType } from '../stats/types';

interface FirstTurnChartProps {
    stats: FirstTurnStats;
    classStats?: ClassFirstTurnStats[];
}

export const FirstTurnChart = ({ stats, classStats }: FirstTurnChartProps) => {
    // 全体の先攻後攻データ
    const overallData = [
        {
            name: '先攻',
            勝利: stats.firstWins,
            敗北: stats.firstLosses,
            勝率: stats.firstWinRate,
        },
        {
            name: '後攻',
            勝利: stats.secondWins,
            敗北: stats.secondLosses,
            勝率: stats.secondWinRate,
        },
    ];

    // クラス別データ
    const classData = classStats?.map((cs) => ({
        name: CLASS_DISPLAY_NAMES[cs.class],
        class: cs.class,
        先攻勝率: cs.firstWinRate,
        後攻勝率: cs.secondWinRate,
        試合数: cs.totalMatches,
    })) || [];

    const CustomTooltip = ({ active, payload, label }: {
        active?: boolean;
        payload?: { name: string; value: number }[];
        label?: string;
    }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-700 border border-slate-600 rounded p-2 text-sm">
                    <p className="font-bold text-white">{label}</p>
                    {payload.map((p) => (
                        <p key={p.name} className="text-slate-300">
                            {p.name}: {p.value}{p.name.includes('勝率') ? '%' : ''}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-white">先攻後攻分析</h2>

            {stats.totalMatches === 0 ? (
                <div className="text-slate-400 text-center py-8">データがありません</div>
            ) : (
                <>
                    {/* 全体統計サマリー */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-700 rounded-lg p-4 text-center">
                            <div className="text-3xl font-bold text-cyan-400">{stats.firstWinRate}%</div>
                            <div className="text-slate-400 mt-1">先攻勝率</div>
                            <div className="text-sm text-slate-500">{stats.firstWins}勝 {stats.firstLosses}敗</div>
                        </div>
                        <div className="bg-slate-700 rounded-lg p-4 text-center">
                            <div className="text-3xl font-bold text-pink-400">{stats.secondWinRate}%</div>
                            <div className="text-slate-400 mt-1">後攻勝率</div>
                            <div className="text-sm text-slate-500">{stats.secondWins}勝 {stats.secondLosses}敗</div>
                        </div>
                    </div>

                    {/* 全体グラフ */}
                    <div className="h-48 mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={overallData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                                <XAxis type="number" stroke="#94a3b8" />
                                <YAxis type="category" dataKey="name" stroke="#94a3b8" />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Bar dataKey="勝利" fill="#22c55e" stackId="stack" />
                                <Bar dataKey="敗北" fill="#ef4444" stackId="stack" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* クラス別先攻後攻勝率 */}
                    {classStats && classStats.length > 0 && (
                        <>
                            <h3 className="text-lg font-bold mb-3 text-white">クラス別 先攻/後攻勝率</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={classData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                                        <XAxis dataKey="name" stroke="#94a3b8" />
                                        <YAxis stroke="#94a3b8" domain={[0, 100]} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Bar dataKey="先攻勝率" fill="#22d3ee">
                                            {classData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={CLASS_COLORS[entry.class as ClassType]} fillOpacity={0.8} />
                                            ))}
                                        </Bar>
                                        <Bar dataKey="後攻勝率" fill="#f472b6">
                                            {classData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={CLASS_COLORS[entry.class as ClassType]} fillOpacity={0.5} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
};
