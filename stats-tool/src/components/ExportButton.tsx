import { MatchRecord } from '../stats/types';
import { format } from 'date-fns';

interface ExportButtonProps {
    matches: MatchRecord[];
}

export const ExportButton = ({ matches }: ExportButtonProps) => {
    const exportToCSV = () => {
        if (matches.length === 0) {
            alert('エクスポートするデータがありません');
            return;
        }

        // CSVヘッダー
        const headers = [
            'マッチID',
            '日時',
            'ゲームモード',
            'プレイヤー1_ID',
            'プレイヤー1_名前',
            'プレイヤー1_クラス',
            'プレイヤー1_レート前',
            'プレイヤー1_レート後',
            'プレイヤー1_先攻',
            'プレイヤー2_ID',
            'プレイヤー2_名前',
            'プレイヤー2_クラス',
            'プレイヤー2_レート前',
            'プレイヤー2_レート後',
            'プレイヤー2_先攻',
            '勝者ID',
            '勝者サイド',
            '試合時間(秒)',
        ];

        // データ行
        const rows = matches.map((m) => [
            m.matchId,
            format(new Date(m.timestamp), 'yyyy-MM-dd HH:mm:ss'),
            m.gameMode,
            m.player1.playerId,
            m.player1.playerName,
            m.player1.playerClass,
            m.player1.ratingBefore,
            m.player1.ratingAfter,
            m.player1.isFirst ? '1' : '0',
            m.player2.playerId,
            m.player2.playerName,
            m.player2.playerClass,
            m.player2.ratingBefore,
            m.player2.ratingAfter,
            m.player2.isFirst ? '1' : '0',
            m.winnerId,
            m.winnerSide,
            m.duration ?? '',
        ]);

        // CSVテキスト生成（BOM付きUTF-8）
        const csvContent = '\uFEFF' + [headers, ...rows]
            .map((row) => row.map((cell) => `"${cell}"`).join(','))
            .join('\n');

        // ダウンロード
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `match_data_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const exportToJSON = () => {
        if (matches.length === 0) {
            alert('エクスポートするデータがありません');
            return;
        }

        const jsonContent = JSON.stringify(matches, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `match_data_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    return (
        <div className="flex gap-2">
            <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                CSV
            </button>
            <button
                onClick={exportToJSON}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                JSON
            </button>
        </div>
    );
};
