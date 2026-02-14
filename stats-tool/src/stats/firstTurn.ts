import { MatchRecord, FirstTurnStats, ClassType, ALL_CLASSES } from './types';

/**
 * 先攻後攻の勝敗統計を計算する
 *
 * 各マッチで先攻プレイヤーが勝ったか、後攻プレイヤーが勝ったかを集計。
 */
export const calculateFirstTurnStats = (matches: MatchRecord[]): FirstTurnStats => {
    let firstWins = 0;
    let firstLosses = 0;
    let secondWins = 0;
    let secondLosses = 0;

    matches.forEach((match) => {
        // 勝者が先攻かどうかを判定
        const winner = match.winnerSide === 'player1' ? match.player1 : match.player2;

        if (winner.isFirst) {
            // 先攻が勝った
            firstWins++;
            secondLosses++;
        } else {
            // 後攻が勝った
            secondWins++;
            firstLosses++;
        }
    });

    const totalFirstGames = firstWins + firstLosses;
    const totalSecondGames = secondWins + secondLosses;

    return {
        firstWins,
        firstLosses,
        secondWins,
        secondLosses,
        firstWinRate: totalFirstGames > 0
            ? Math.round((firstWins / totalFirstGames) * 100)
            : 0,
        secondWinRate: totalSecondGames > 0
            ? Math.round((secondWins / totalSecondGames) * 100)
            : 0,
        totalMatches: matches.length,
    };
};

/**
 * クラス別の先攻後攻統計を計算する
 */
export interface ClassFirstTurnStats extends FirstTurnStats {
    class: ClassType;
}

export const calculateFirstTurnStatsByClass = (
    matches: MatchRecord[]
): ClassFirstTurnStats[] => {
    // クラス別の統計を初期化
    const classStats: Record<ClassType, {
        firstWins: number;
        firstLosses: number;
        secondWins: number;
        secondLosses: number;
    }> = {
        SENKA: { firstWins: 0, firstLosses: 0, secondWins: 0, secondLosses: 0 },
        AJA: { firstWins: 0, firstLosses: 0, secondWins: 0, secondLosses: 0 },
        YORUKA: { firstWins: 0, firstLosses: 0, secondWins: 0, secondLosses: 0 },
    };

    matches.forEach((match) => {
        // 各プレイヤーについて処理
        [match.player1, match.player2].forEach((player) => {
            const playerClass = player.playerClass;
            const isWinner = match.winnerId === player.playerId;

            if (player.isFirst) {
                // このプレイヤーは先攻だった
                if (isWinner) {
                    classStats[playerClass].firstWins++;
                } else {
                    classStats[playerClass].firstLosses++;
                }
            } else {
                // このプレイヤーは後攻だった
                if (isWinner) {
                    classStats[playerClass].secondWins++;
                } else {
                    classStats[playerClass].secondLosses++;
                }
            }
        });
    });

    // 結果配列を生成
    return ALL_CLASSES.map((classType) => {
        const stats = classStats[classType];
        const totalFirst = stats.firstWins + stats.firstLosses;
        const totalSecond = stats.secondWins + stats.secondLosses;

        return {
            class: classType,
            firstWins: stats.firstWins,
            firstLosses: stats.firstLosses,
            secondWins: stats.secondWins,
            secondLosses: stats.secondLosses,
            firstWinRate: totalFirst > 0
                ? Math.round((stats.firstWins / totalFirst) * 100)
                : 0,
            secondWinRate: totalSecond > 0
                ? Math.round((stats.secondWins / totalSecond) * 100)
                : 0,
            totalMatches: totalFirst + totalSecond,
        };
    });
};

/**
 * 先攻後攻勝率の時系列推移を計算する
 */
export const calculateFirstTurnTrend = (
    matches: MatchRecord[],
    _periodDays: number = 7
): { period: string; firstWinRate: number; secondWinRate: number; totalMatches: number }[] => {
    if (matches.length === 0) {
        return [];
    }

    // 日付でグループ化
    const periodGroups = new Map<string, MatchRecord[]>();

    matches.forEach((match) => {
        const date = new Date(match.timestamp);
        const periodKey = date.toISOString().split('T')[0]; // 日単位

        if (!periodGroups.has(periodKey)) {
            periodGroups.set(periodKey, []);
        }
        periodGroups.get(periodKey)!.push(match);
    });

    // 各期間の統計を計算
    const result: { period: string; firstWinRate: number; secondWinRate: number; totalMatches: number }[] = [];

    periodGroups.forEach((periodMatches, periodKey) => {
        const stats = calculateFirstTurnStats(periodMatches);
        result.push({
            period: periodKey,
            firstWinRate: stats.firstWinRate,
            secondWinRate: stats.secondWinRate,
            totalMatches: stats.totalMatches,
        });
    });

    // 日付順にソート
    result.sort((a, b) => a.period.localeCompare(b.period));

    return result;
};
