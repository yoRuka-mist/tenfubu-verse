import { MatchRecord, CombinedStats, OverviewStats, DailyStats, ALL_CLASSES } from './types';
import { getUniquePlayers } from '../services/matchDataService';

/**
 * 複合分析: クラス別・先攻後攻別の勝率を計算する
 */
export const calculateCombinedStats = (matches: MatchRecord[]): CombinedStats[] => {
    // クラス × 先攻/後攻 の組み合わせで統計を初期化
    const stats: Record<string, { wins: number; losses: number }> = {};

    ALL_CLASSES.forEach((classType) => {
        stats[`${classType}-first`] = { wins: 0, losses: 0 };
        stats[`${classType}-second`] = { wins: 0, losses: 0 };
    });

    // 各マッチを処理
    matches.forEach((match) => {
        // player1の処理
        const p1Key = `${match.player1.playerClass}-${match.player1.isFirst ? 'first' : 'second'}`;
        const p1IsWinner = match.winnerId === match.player1.playerId;
        if (p1IsWinner) {
            stats[p1Key].wins++;
        } else {
            stats[p1Key].losses++;
        }

        // player2の処理
        const p2Key = `${match.player2.playerClass}-${match.player2.isFirst ? 'first' : 'second'}`;
        const p2IsWinner = match.winnerId === match.player2.playerId;
        if (p2IsWinner) {
            stats[p2Key].wins++;
        } else {
            stats[p2Key].losses++;
        }
    });

    // 結果配列を生成
    const result: CombinedStats[] = [];

    ALL_CLASSES.forEach((classType) => {
        // 先攻
        const firstStats = stats[`${classType}-first`];
        const firstTotal = firstStats.wins + firstStats.losses;
        result.push({
            class: classType,
            isFirst: true,
            wins: firstStats.wins,
            losses: firstStats.losses,
            totalMatches: firstTotal,
            winRate: firstTotal > 0
                ? Math.round((firstStats.wins / firstTotal) * 10000) / 100
                : 0,
        });

        // 後攻
        const secondStats = stats[`${classType}-second`];
        const secondTotal = secondStats.wins + secondStats.losses;
        result.push({
            class: classType,
            isFirst: false,
            wins: secondStats.wins,
            losses: secondStats.losses,
            totalMatches: secondTotal,
            winRate: secondTotal > 0
                ? Math.round((secondStats.wins / secondTotal) * 10000) / 100
                : 0,
        });
    });

    return result;
};

/**
 * 概要統計を計算する
 */
export const calculateOverviewStats = (matches: MatchRecord[]): OverviewStats => {
    if (matches.length === 0) {
        return {
            totalMatches: 0,
            rankedMatches: 0,
            casualMatches: 0,
            uniquePlayers: 0,
            averageDuration: 0,
        };
    }

    const rankedMatches = matches.filter(m => m.gameMode === 'RANKED_MATCH').length;
    const casualMatches = matches.filter(m => m.gameMode === 'CASUAL_MATCH').length;
    const uniquePlayers = getUniquePlayers(matches).size;

    // 平均試合時間（durationがあるマッチのみ）
    const matchesWithDuration = matches.filter(m => m.duration !== undefined);
    const averageDuration = matchesWithDuration.length > 0
        ? Math.round(matchesWithDuration.reduce((sum, m) => sum + m.duration!, 0) / matchesWithDuration.length)
        : 0;

    return {
        totalMatches: matches.length,
        rankedMatches,
        casualMatches,
        uniquePlayers,
        averageDuration,
    };
};

/**
 * 日別統計を計算する
 */
export const calculateDailyStats = (matches: MatchRecord[]): DailyStats[] => {
    const dailyMap = new Map<string, { total: number; ranked: number; casual: number }>();

    matches.forEach((match) => {
        const date = new Date(match.timestamp).toISOString().split('T')[0];

        if (!dailyMap.has(date)) {
            dailyMap.set(date, { total: 0, ranked: 0, casual: 0 });
        }

        const dayStats = dailyMap.get(date)!;
        dayStats.total++;

        if (match.gameMode === 'RANKED_MATCH') {
            dayStats.ranked++;
        } else {
            dayStats.casual++;
        }
    });

    // 結果配列を生成（日付順）
    const result: DailyStats[] = [];

    dailyMap.forEach((stats, date) => {
        result.push({
            date,
            totalMatches: stats.total,
            rankedMatches: stats.ranked,
            casualMatches: stats.casual,
        });
    });

    result.sort((a, b) => a.date.localeCompare(b.date));

    return result;
};

/**
 * レート帯別の統計を計算する
 */
export interface RatingTierStats {
    tier: string;
    minRating: number;
    maxRating: number;
    totalMatches: number;
    firstWinRate: number;
}

export const calculateStatsByRatingTier = (matches: MatchRecord[]): RatingTierStats[] => {
    const tiers = [
        { tier: 'ブロンズ', minRating: 0, maxRating: 2000 },
        { tier: 'シルバー', minRating: 2001, maxRating: 4000 },
        { tier: 'ゴールド', minRating: 4001, maxRating: 6000 },
        { tier: 'プラチナ', minRating: 6001, maxRating: 8000 },
        { tier: 'ダイヤモンド', minRating: 8001, maxRating: 10000 },
        { tier: 'マスター', minRating: 10001, maxRating: Infinity },
    ];

    return tiers.map((tier) => {
        // このレート帯のマッチを抽出（両プレイヤーがこのレート帯）
        const tierMatches = matches.filter((m) => {
            const p1Rating = m.player1.ratingBefore;
            const p2Rating = m.player2.ratingBefore;
            return (
                (p1Rating >= tier.minRating && p1Rating <= tier.maxRating) &&
                (p2Rating >= tier.minRating && p2Rating <= tier.maxRating)
            );
        });

        // 先攻勝率を計算
        let firstWins = 0;
        tierMatches.forEach((m) => {
            const winner = m.winnerSide === 'player1' ? m.player1 : m.player2;
            if (winner.isFirst) {
                firstWins++;
            }
        });

        return {
            tier: tier.tier,
            minRating: tier.minRating,
            maxRating: tier.maxRating,
            totalMatches: tierMatches.length,
            firstWinRate: tierMatches.length > 0
                ? Math.round((firstWins / tierMatches.length) * 100)
                : 0,
        };
    });
};

/**
 * 試合時間の分布を計算する
 */
export interface DurationDistribution {
    range: string;
    count: number;
    percentage: number;
}

export const calculateDurationDistribution = (matches: MatchRecord[]): DurationDistribution[] => {
    const ranges = [
        { range: '0-2分', min: 0, max: 120 },
        { range: '2-5分', min: 121, max: 300 },
        { range: '5-10分', min: 301, max: 600 },
        { range: '10-15分', min: 601, max: 900 },
        { range: '15分以上', min: 901, max: Infinity },
    ];

    const matchesWithDuration = matches.filter(m => m.duration !== undefined);
    const total = matchesWithDuration.length;

    return ranges.map((range) => {
        const count = matchesWithDuration.filter(
            m => m.duration! >= range.min && m.duration! <= range.max
        ).length;

        return {
            range: range.range,
            count,
            percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        };
    });
};
