import { MatchupMatrix as MatchupMatrixType, MatchupCell } from '../stats/matchup';
import { CLASS_DISPLAY_NAMES, CLASS_COLORS, ALL_CLASSES, ClassType } from '../stats/types';

interface MatchupMatrixProps {
    matrix: MatchupMatrixType;
}

export const MatchupMatrix = ({ matrix }: MatchupMatrixProps) => {
    const getWinRateColor = (winRate: number): string => {
        if (winRate >= 60) return 'text-green-400';
        if (winRate >= 55) return 'text-green-300';
        if (winRate >= 45) return 'text-slate-300';
        if (winRate >= 40) return 'text-red-300';
        return 'text-red-400';
    };

    const getWinRateBg = (winRate: number): string => {
        if (winRate >= 60) return 'bg-green-900/50';
        if (winRate >= 55) return 'bg-green-900/30';
        if (winRate >= 45) return 'bg-slate-700';
        if (winRate >= 40) return 'bg-red-900/30';
        return 'bg-red-900/50';
    };

    const renderCell = (myClass: ClassType, opponentClass: ClassType): JSX.Element => {
        if (myClass === opponentClass) {
            return (
                <td key={opponentClass} className="p-2 text-center bg-slate-900 text-slate-600">
                    -
                </td>
            );
        }

        const cell: MatchupCell | null = matrix[myClass][opponentClass];

        if (!cell || cell.totalMatches === 0) {
            return (
                <td key={opponentClass} className="p-2 text-center bg-slate-800 text-slate-500">
                    N/A
                </td>
            );
        }

        return (
            <td
                key={opponentClass}
                className={`p-2 text-center ${getWinRateBg(cell.winRate)}`}
            >
                <div className={`text-lg font-bold ${getWinRateColor(cell.winRate)}`}>
                    {cell.winRate.toFixed(1)}%
                </div>
                <div className="text-xs text-slate-400">
                    {cell.wins}勝{cell.losses}敗
                </div>
                <div className="text-xs text-slate-500">
                    ({cell.totalMatches}戦)
                </div>
            </td>
        );
    };

    return (
        <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-white">マッチアップ勝率</h2>
            <p className="text-sm text-slate-400 mb-4">
                縦軸（自分のクラス）vs 横軸（相手のクラス）の勝率
            </p>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr>
                            <th className="p-2 text-left bg-slate-900 rounded-tl-lg">
                                <span className="text-slate-500">自分 ＼ 相手</span>
                            </th>
                            {ALL_CLASSES.map((classType) => (
                                <th
                                    key={classType}
                                    className="p-2 text-center bg-slate-900"
                                    style={{ borderTop: `3px solid ${CLASS_COLORS[classType]}` }}
                                >
                                    <span style={{ color: CLASS_COLORS[classType] }}>
                                        {CLASS_DISPLAY_NAMES[classType]}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {ALL_CLASSES.map((myClass) => (
                            <tr key={myClass}>
                                <th
                                    className="p-2 text-left bg-slate-900"
                                    style={{ borderLeft: `3px solid ${CLASS_COLORS[myClass]}` }}
                                >
                                    <span style={{ color: CLASS_COLORS[myClass] }}>
                                        {CLASS_DISPLAY_NAMES[myClass]}
                                    </span>
                                </th>
                                {ALL_CLASSES.map((opponentClass) => renderCell(myClass, opponentClass))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 凡例 */}
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-green-900/50"></div>
                    <span>有利 (60%+)</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-green-900/30"></div>
                    <span>やや有利 (55-60%)</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-slate-700"></div>
                    <span>互角 (45-55%)</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-red-900/30"></div>
                    <span>やや不利 (40-45%)</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-red-900/50"></div>
                    <span>不利 (40%-)</span>
                </div>
            </div>
        </div>
    );
};
