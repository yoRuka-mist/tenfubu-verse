import { database } from './config';
import { ref, get, set, update, runTransaction } from 'firebase/database';
import { ClassType } from '../core/types';
import { PlayerData, ClassRating, createInitialClassRating, RatingCalculationResult } from './rating';

// プレイヤーデータを取得（なければ作成）
export const getOrCreatePlayerData = async (
    playerId: string,
    playerName: string
): Promise<PlayerData> => {
    const playerRef = ref(database, `players/${playerId}`);
    const snapshot = await get(playerRef);

    if (snapshot.exists()) {
        const data = snapshot.val() as PlayerData;
        // 名前が変わっていたら更新
        if (data.playerName !== playerName) {
            await update(playerRef, { playerName });
            data.playerName = playerName;
        }
        return data;
    }

    // 新規作成
    const newPlayerData: PlayerData = {
        playerName,
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
