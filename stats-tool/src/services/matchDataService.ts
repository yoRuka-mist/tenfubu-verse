import { database } from '../firebase/config';
import { ref, get, query, orderByChild, startAt, endAt } from 'firebase/database';
import { MatchRecord, StatsFilter } from '../stats/types';

// Firebaseから全マッチデータを取得
export const fetchAllMatches = async (): Promise<MatchRecord[]> => {
    const matchesRef = ref(database, 'matches');
    const snapshot = await get(matchesRef);

    if (!snapshot.exists()) {
        return [];
    }

    const matches: MatchRecord[] = [];
    snapshot.forEach((childSnapshot) => {
        const match = childSnapshot.val() as MatchRecord;
        matches.push(match);
    });

    // タイムスタンプ降順でソート（新しい順）
    matches.sort((a, b) => b.timestamp - a.timestamp);

    return matches;
};

// 期間指定でマッチデータを取得
export const fetchMatchesByDateRange = async (
    startDate: Date,
    endDate: Date
): Promise<MatchRecord[]> => {
    const matchesRef = ref(database, 'matches');
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();

    const matchesQuery = query(
        matchesRef,
        orderByChild('timestamp'),
        startAt(startTimestamp),
        endAt(endTimestamp)
    );

    const snapshot = await get(matchesQuery);

    if (!snapshot.exists()) {
        return [];
    }

    const matches: MatchRecord[] = [];
    snapshot.forEach((childSnapshot) => {
        const match = childSnapshot.val() as MatchRecord;
        matches.push(match);
    });

    // タイムスタンプ降順でソート
    matches.sort((a, b) => b.timestamp - a.timestamp);

    return matches;
};

// フィルター条件でマッチデータをフィルタリング
export const filterMatches = (
    matches: MatchRecord[],
    filter: StatsFilter
): MatchRecord[] => {
    return matches.filter((match) => {
        // 日付フィルター
        if (filter.startDate && match.timestamp < filter.startDate.getTime()) {
            return false;
        }
        if (filter.endDate && match.timestamp > filter.endDate.getTime()) {
            return false;
        }

        // ゲームモードフィルター
        if (filter.gameMode && filter.gameMode !== 'ALL' && match.gameMode !== filter.gameMode) {
            return false;
        }

        // レートフィルター
        // 仕様: 「少なくとも一方のプレイヤーがminRating以上」かつ「少なくとも一方のプレイヤーがmaxRating以下」
        // 例: minRating=2000の場合、どちらかのプレイヤーがシルバー以上なら含まれる
        // 例: maxRating=4000の場合、どちらかのプレイヤーがシルバー以下なら含まれる
        if (filter.minRating !== undefined) {
            const maxRating = Math.max(match.player1.ratingBefore, match.player2.ratingBefore);
            if (maxRating < filter.minRating) {
                return false;
            }
        }
        if (filter.maxRating !== undefined) {
            const minRating = Math.min(match.player1.ratingBefore, match.player2.ratingBefore);
            if (minRating > filter.maxRating) {
                return false;
            }
        }

        return true;
    });
};

// ユニークプレイヤー数を取得
export const getUniquePlayers = (matches: MatchRecord[]): Set<string> => {
    const playerIds = new Set<string>();
    matches.forEach((match) => {
        playerIds.add(match.player1.playerId);
        playerIds.add(match.player2.playerId);
    });
    return playerIds;
};

// 直近N件のマッチを取得
export const getRecentMatches = (matches: MatchRecord[], limit: number): MatchRecord[] => {
    return matches.slice(0, limit);
};
