import { useMemo } from 'react';
import { useMatchData } from './hooks/useMatchData';
import { OverviewPanel } from './components/OverviewPanel';
import { DeckUsageChart } from './components/DeckUsageChart';
import { FirstTurnChart } from './components/FirstTurnChart';
import { MatchupMatrix } from './components/MatchupMatrix';
import { CombinedAnalysis } from './components/CombinedAnalysis';
import { DailyMatchChart } from './components/DailyMatchChart';
import { FilterPanel } from './components/FilterPanel';
import { ExportButton } from './components/ExportButton';
import {
    calculateDeckUsage,
    calculateFirstTurnStats,
    calculateFirstTurnStatsByClass,
    getMatchupMatrix,
    calculateCombinedStats,
    calculateOverviewStats,
    calculateDailyStats,
} from './stats';

function App() {
    const {
        matches,
        filteredMatches,
        loading,
        error,
        filter,
        setFilter,
        refresh,
    } = useMatchData();

    // 統計計算（useMemoで最適化: filteredMatchesが変更されたときのみ再計算）
    const overviewStats = useMemo(() => calculateOverviewStats(filteredMatches), [filteredMatches]);
    const deckUsageStats = useMemo(() => calculateDeckUsage(filteredMatches), [filteredMatches]);
    const firstTurnStats = useMemo(() => calculateFirstTurnStats(filteredMatches), [filteredMatches]);
    const firstTurnStatsByClass = useMemo(() => calculateFirstTurnStatsByClass(filteredMatches), [filteredMatches]);
    const matchupMatrix = useMemo(() => getMatchupMatrix(filteredMatches), [filteredMatches]);
    const combinedStats = useMemo(() => calculateCombinedStats(filteredMatches), [filteredMatches]);
    const dailyStats = useMemo(() => calculateDailyStats(filteredMatches), [filteredMatches]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-slate-400">データを読み込んでいます...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-400 text-xl mb-4">{error}</div>
                    <button
                        onClick={refresh}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                        再試行
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900">
            {/* ヘッダー */}
            <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-white">統計分析ダッシュボード</h1>
                            <p className="text-sm text-slate-400">デジタルカードゲーム 開発者用ツール</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <ExportButton matches={filteredMatches} />
                            <button
                                onClick={refresh}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                更新
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* メインコンテンツ */}
            <main className="max-w-7xl mx-auto px-4 py-6">
                {/* フィルターパネル */}
                <FilterPanel
                    filter={filter}
                    onFilterChange={setFilter}
                    totalMatches={matches.length}
                    filteredMatches={filteredMatches.length}
                />

                {/* 概要パネル */}
                <div className="mb-6">
                    <OverviewPanel stats={overviewStats} />
                </div>

                {/* 日別マッチ数 */}
                <div className="mb-6">
                    <DailyMatchChart stats={dailyStats} />
                </div>

                {/* デッキ使用率 & 先攻後攻 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <DeckUsageChart stats={deckUsageStats} />
                    <FirstTurnChart stats={firstTurnStats} classStats={firstTurnStatsByClass} />
                </div>

                {/* マッチアップマトリックス */}
                <div className="mb-6">
                    <MatchupMatrix matrix={matchupMatrix} />
                </div>

                {/* 複合分析 */}
                <div className="mb-6">
                    <CombinedAnalysis stats={combinedStats} />
                </div>
            </main>

            {/* フッター */}
            <footer className="bg-slate-800 border-t border-slate-700 py-4">
                <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-500">
                    デジタルカードゲーム 統計分析ツール v1.0.0
                </div>
            </footer>
        </div>
    );
}

export default App;
