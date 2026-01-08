import { database } from './config';
import { ref, get, set, update, runTransaction, push } from 'firebase/database';
import { ClassType } from '../core/types';
import { PlayerData, ClassRating, createInitialClassRating, RatingCalculationResult, MatchRecord, MatchPlayer, RankType, getRankFromRating } from './rating';

// プレイヤーデータを取得（なければ作成）
export const getOrCreatePlayerData = async (
    playerId: string,
    userId: string,
    playerName: string
): Promise<PlayerData> => {
    const playerRef = ref(database, `players/${playerId}`);
    const snapshot = await get(playerRef);

    if (snapshot.exists()) {
        const data = snapshot.val() as PlayerData;
        // userIdがない場合は追加（マイグレーション用）
        if (!data.userId) {
            await update(playerRef, { userId });
            data.userId = userId;
        }
        return data;
    }

    // 新規作成
    const newPlayerData: PlayerData = {
        userId,
        playerName: playerName || 'プレイヤー',
        createdAt: Date.now(),
        lastMatchAt: Date.now(),
        ratings: {},
    };

    await set(playerRef, newPlayerData);
    return newPlayerData;
};

// クラス別レーティングを取得（なければ初期値を作成）
export const getClassRating = async (
    playerId: string,
    playerClass: ClassType
): Promise<ClassRating> => {
    const ratingRef = ref(database, `players/${playerId}/ratings/${playerClass}`);
    const snapshot = await get(ratingRef);

    if (snapshot.exists()) {
        return snapshot.val() as ClassRating;
    }

    // 初期値を作成
    const initialRating = createInitialClassRating();
    await set(ratingRef, initialRating);
    return initialRating;
};

// 全クラスのレーティングを取得
export const getAllClassRatings = async (
    playerId: string
): Promise<Partial<Record<ClassType, ClassRating>>> => {
    const ratingsRef = ref(database, `players/${playerId}/ratings`);
    const snapshot = await get(ratingsRef);

    if (snapshot.exists()) {
        return snapshot.val() as Partial<Record<ClassType, ClassRating>>;
    }

    return {};
};

// レーティング更新（試合結果反映）
// Firebase Transactionを使用してレース条件を回避
export const updateRatingAfterMatch = async (
    playerId: string,
    playerClass: ClassType,
    result: RatingCalculationResult,
    isWin: boolean
): Promise<void> => {
    const ratingRef = ref(database, `players/${playerId}/ratings/${playerClass}`);
    const playerRef = ref(database, `players/${playerId}`);

    // Transactionで原子的に更新
    await runTransaction(ratingRef, (currentData) => {
        const current = currentData || createInitialClassRating();

        return {
            rating: result.newRating,
            winStreak: result.newWinStreak,
            totalMatches: current.totalMatches + 1,
            wins: current.wins + (isWin ? 1 : 0),
            losses: current.losses + (isWin ? 0 : 1),
        };
    });

    // lastMatchAt の更新
    await update(playerRef, { lastMatchAt: Date.now() });
};

// プレイヤー名を更新
export const updatePlayerName = async (
    playerId: string,
    newPlayerName: string
): Promise<void> => {
    const playerRef = ref(database, `players/${playerId}`);
    await update(playerRef, { playerName: newPlayerName });
};

// ===== 対戦履歴（Match History）=====

// 対戦履歴保存用のパラメータ
export interface SaveMatchRecordParams {
    gameMode: 'CASUAL_MATCH' | 'RANKED_MATCH';
    // 自分（このクライアント）の情報
    myPlayerId: string;
    myPlayerName: string;
    myPlayerClass: ClassType;
    myRatingBefore: number;
    myRatingAfter: number;
    myIsFirst: boolean;
    // 相手の情報
    opponentPlayerId: string;
    opponentPlayerName: string;
    opponentPlayerClass: ClassType;
    opponentRatingBefore: number;
    opponentRatingAfter: number;
    // 勝者
    winnerId: string;
    // 試合時間（秒）- オプション
    duration?: number;
}

// 対戦履歴を保存（HOST側のみが呼び出す）
export const saveMatchRecord = async (params: SaveMatchRecordParams): Promise<string> => {
    const matchesRef = ref(database, 'matches');
    const newMatchRef = push(matchesRef);
    const matchId = newMatchRef.key!;

    // HOSTがplayer1、JOINがplayer2
    const player1: MatchPlayer = {
        playerId: params.myPlayerId,
        playerName: params.myPlayerName,
        playerClass: params.myPlayerClass,
        ratingBefore: params.myRatingBefore,
        ratingAfter: params.myRatingAfter,
        isFirst: params.myIsFirst,
    };

    const player2: MatchPlayer = {
        playerId: params.opponentPlayerId,
        playerName: params.opponentPlayerName,
        playerClass: params.opponentPlayerClass,
        ratingBefore: params.opponentRatingBefore,
        ratingAfter: params.opponentRatingAfter,
        isFirst: !params.myIsFirst,
    };

    const matchRecord: MatchRecord = {
        matchId,
        timestamp: Date.now(),
        gameMode: params.gameMode,
        player1,
        player2,
        winnerId: params.winnerId,
        winnerSide: params.winnerId === params.myPlayerId ? 'player1' : 'player2',
        duration: params.duration,
    };

    await set(newMatchRef, matchRecord);
    console.log('[MatchHistory] Saved match record:', matchId, matchRecord);

    return matchId;
};

// ===== ランキング機能 =====

// ランキングエントリ
export interface RankingEntry {
    playerId: string;
    playerName: string;
    rating: number;
    rank: RankType;
    totalMatches: number;
    wins: number;
    losses: number;
}

// クラス別ランキングを取得（トップN件）
export const getClassRanking = async (
    playerClass: ClassType,
    limit: number = 5
): Promise<RankingEntry[]> => {
    const playersRef = ref(database, 'players');
    const snapshot = await get(playersRef);

    if (!snapshot.exists()) {
        return [];
    }

    const rankings: RankingEntry[] = [];

    snapshot.forEach((childSnapshot) => {
        const playerId = childSnapshot.key!;
        const playerData = childSnapshot.val() as PlayerData;
        const classRating = playerData.ratings?.[playerClass];

        // このクラスでプレイしたことがあるプレイヤーのみ
        if (classRating && classRating.totalMatches > 0) {
            rankings.push({
                playerId,
                playerName: playerData.playerName || 'プレイヤー',
                rating: classRating.rating,
                rank: getRankFromRating(classRating.rating),
                totalMatches: classRating.totalMatches,
                wins: classRating.wins,
                losses: classRating.losses,
            });
        }
    });

    // レート順に降順ソート
    rankings.sort((a, b) => b.rating - a.rating);

    // 上位N件を返す
    return rankings.slice(0, limit);
};

// 全クラスのランキングを一括取得
export const getAllClassRankings = async (
    limit: number = 5
): Promise<Record<ClassType, RankingEntry[]>> => {
    const classes: ClassType[] = ['SENKA', 'AJA', 'YORUKA'];
    const result: Record<ClassType, RankingEntry[]> = {
        SENKA: [],
        AJA: [],
        YORUKA: [],
    };

    // 一度だけ全プレイヤーデータを取得
    const playersRef = ref(database, 'players');
    const snapshot = await get(playersRef);

    if (!snapshot.exists()) {
        return result;
    }

    // 各クラスのランキングを構築
    for (const playerClass of classes) {
        const rankings: RankingEntry[] = [];

        snapshot.forEach((childSnapshot) => {
            const playerId = childSnapshot.key!;
            const playerData = childSnapshot.val() as PlayerData;
            const classRating = playerData.ratings?.[playerClass];

            if (classRating && classRating.totalMatches > 0) {
                rankings.push({
                    playerId,
                    playerName: playerData.playerName || 'プレイヤー',
                    rating: classRating.rating,
                    rank: getRankFromRating(classRating.rating),
                    totalMatches: classRating.totalMatches,
                    wins: classRating.wins,
                    losses: classRating.losses,
                });
            }
        });

        rankings.sort((a, b) => b.rating - a.rating);
        result[playerClass] = rankings.slice(0, limit);
    }

    return result;
};
