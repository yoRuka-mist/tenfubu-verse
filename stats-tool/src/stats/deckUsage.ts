import { MatchRecord, DeckUsageStats, ClassType, ALL_CLASSES } from './types';

/**
 * デッキ（クラス）使用率を計算する
 *
 * 各マッチで使用されたクラスをカウントし、使用率を算出。
 * 1マッチで2人分カウントされる（player1とplayer2）。
 */
export const calculateDeckUsage = (matches: MatchRecord[]): DeckUsageStats[] => {
    // クラス別使用回数をカウント
    const classCount: Record<ClassType, number> = {
        SENKA: 0,
        AJA: 0,
        YORUKA: 0,
    };

    matches.forEach((match) => {
        classCount[match.player1.playerClass]++;
        classCount[match.player2.playerClass]++;
    });

    // 合計使用回数
    const totalUsage = Object.values(classCount).reduce((sum, count) => sum + count, 0);

    // 結果配列を生成
    const result: DeckUsageStats[] = ALL_CLASSES.map((classType) => ({
        class: classType,
        count: classCount[classType],
        percentage: totalUsage > 0
            ? Math.round((classCount[classType] / totalUsage) * 100)
            : 0,
    }));

    // 使用回数の降順でソート
    result.sort((a, b) => b.count - a.count);

    return result;
};

/**
 * 期間別のデッキ使用率推移を計算する
 */
export const calculateDeckUsageByPeriod = (
    matches: MatchRecord[],
    periodDays: number = 7
): { period: string; stats: DeckUsageStats[] }[] => {
    if (matches.length === 0) {
        return [];
    }

    // 日付でグループ化
    const periodGroups = new Map<string, MatchRecord[]>();

    matches.forEach((match) => {
        const date = new Date(match.timestamp);
        // 期間の開始日を計算（例: 7日間ごと）
        const periodStart = new Date(date);
        periodStart.setDate(Math.floor(periodStart.getDate() / periodDays) * periodDays);
        const periodKey = periodStart.toISOString().split('T')[0];

        if (!periodGroups.has(periodKey)) {
            periodGroups.set(periodKey, []);
        }
        periodGroups.get(periodKey)!.push(match);
    });

    // 各期間のデッキ使用率を計算
    const result: { period: string; stats: DeckUsageStats[] }[] = [];

    periodGroups.forEach((periodMatches, periodKey) => {
        result.push({
            period: periodKey,
            stats: calculateDeckUsage(periodMatches),
        });
    });

    // 日付順にソート
    result.sort((a, b) => a.period.localeCompare(b.period));

    return result;
};

/**
 * ゲームモード別のデッキ使用率を計算する
 */
export const calculateDeckUsageByGameMode = (
    matches: MatchRecord[]
): { ranked: DeckUsageStats[]; casual: DeckUsageStats[] } => {
    const rankedMatches = matches.filter(m => m.gameMode === 'RANKED_MATCH');
    const casualMatches = matches.filter(m => m.gameMode === 'CASUAL_MATCH');

    return {
        ranked: calculateDeckUsage(rankedMatches),
        casual: calculateDeckUsage(casualMatches),
    };
};
