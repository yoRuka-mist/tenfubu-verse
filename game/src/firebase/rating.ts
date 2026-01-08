import { ClassType } from '../core/types';

// ランク定義
export type RankType = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'MASTER';

export const RANK_THRESHOLDS: { rank: RankType; min: number; max: number; lossPoints: number }[] = [
    { rank: 'BRONZE', min: 0, max: 2000, lossPoints: 0 },
    { rank: 'SILVER', min: 2001, max: 4000, lossPoints: 20 },
    { rank: 'GOLD', min: 4001, max: 6000, lossPoints: 40 },
    { rank: 'PLATINUM', min: 6001, max: 8000, lossPoints: 60 },
    { rank: 'DIAMOND', min: 8001, max: 10000, lossPoints: 80 },
    { rank: 'MASTER', min: 10001, max: Infinity, lossPoints: 100 },
];

// ランク表示名（日本語）
export const RANK_DISPLAY_NAMES: Record<RankType, string> = {
    BRONZE: 'ブロンズ',
    SILVER: 'シルバー',
    GOLD: 'ゴールド',
    PLATINUM: 'プラチナ',
    DIAMOND: 'ダイヤモンド',
    MASTER: 'マスター',
};

// レートからランクを取得
export const getRankFromRating = (rating: number): RankType => {
    for (const threshold of RANK_THRESHOLDS) {
        if (rating >= threshold.min && rating <= threshold.max) {
            return threshold.rank;
        }
    }
    return 'BRONZE';
};

// ランクのインデックスを取得（格上ボーナス計算用）
export const getRankIndex = (rank: RankType): number => {
    return RANK_THRESHOLDS.findIndex(t => t.rank === rank);
};

// クラス別レーティングデータ
export interface ClassRating {
    rating: number;
    winStreak: number;
    totalMatches: number;
    wins: number;
    losses: number;
}

// プレイヤーデータ
export interface PlayerData {
    userId: string;          // ユーザーID（認証用、変更不可）
    playerName: string;      // プレイヤー名（表示名、変更可能）
    createdAt: number;
    lastMatchAt: number;
    ratings: Partial<Record<ClassType, ClassRating>>;
}

// 初期クラスレーティング（初期値は0）
export const createInitialClassRating = (): ClassRating => ({
    rating: 0,
    winStreak: 0,
    totalMatches: 0,
    wins: 0,
    losses: 0,
});

// レート計算の定数
const BASE_WIN_POINTS = 200;
const MAX_BONUS_PERCENT = 100;
const WIN_STREAK_BONUS_PER_WIN = 10; // 連勝ごとに+10%
const RANK_DIFF_BONUS_PER_RANK = 20; // ランク差ごとに+20%

export interface RatingCalculationResult {
    newRating: number;
    ratingChange: number;
    newWinStreak: number;
    newRank: RankType;
    oldRank: RankType;
    isRankUp: boolean;
    isRankDown: boolean;
    bonusBreakdown: {
        base: number;
        winStreakBonus: number;
        rankDiffBonus: number;
        total: number;
    };
}

// 勝利時のレーティング計算
export const calculateWinRating = (
    currentRating: number,
    currentWinStreak: number,
    opponentRating: number
): RatingCalculationResult => {
    const myRank = getRankFromRating(currentRating);
    const opponentRank = getRankFromRating(opponentRating);
    const oldRankIndex = getRankIndex(myRank);
    const opponentRankIndex = getRankIndex(opponentRank);

    // 連勝ボーナス: (連勝数) × 10%、最大100%
    const newWinStreak = currentWinStreak + 1;
    const winStreakBonusPercent = Math.min((newWinStreak - 1) * WIN_STREAK_BONUS_PER_WIN, MAX_BONUS_PERCENT);

    // 格上ボーナス: ランク差 × 20%、最大100%
    const rankDiff = Math.max(0, opponentRankIndex - oldRankIndex);
    const rankDiffBonusPercent = Math.min(rankDiff * RANK_DIFF_BONUS_PER_RANK, MAX_BONUS_PERCENT);

    // 合計ボーナス
    const totalBonusPercent = 100 + winStreakBonusPercent + rankDiffBonusPercent;
    const ratingChange = Math.floor(BASE_WIN_POINTS * totalBonusPercent / 100);
    const newRating = currentRating + ratingChange;

    const newRank = getRankFromRating(newRating);
    const newRankIndex = getRankIndex(newRank);

    return {
        newRating,
        ratingChange,
        newWinStreak,
        newRank,
        oldRank: myRank,
        isRankUp: newRankIndex > oldRankIndex,
        isRankDown: false,
        bonusBreakdown: {
            base: BASE_WIN_POINTS,
            winStreakBonus: Math.floor(BASE_WIN_POINTS * winStreakBonusPercent / 100),
            rankDiffBonus: Math.floor(BASE_WIN_POINTS * rankDiffBonusPercent / 100),
            total: ratingChange,
        },
    };
};

// 敗北時のレーティング計算
export const calculateLossRating = (
    currentRating: number
): RatingCalculationResult => {
    const myRank = getRankFromRating(currentRating);
    const rankData = RANK_THRESHOLDS.find(t => t.rank === myRank)!;

    const ratingChange = -rankData.lossPoints;
    const newRating = Math.max(0, currentRating + ratingChange);
    const newRank = getRankFromRating(newRating);

    const oldRankIndex = getRankIndex(myRank);
    const newRankIndex = getRankIndex(newRank);

    return {
        newRating,
        ratingChange,
        newWinStreak: 0, // 連勝リセット
        newRank,
        oldRank: myRank,
        isRankUp: false,
        isRankDown: newRankIndex < oldRankIndex,
        bonusBreakdown: {
            base: ratingChange,
            winStreakBonus: 0,
            rankDiffBonus: 0,
            total: ratingChange,
        },
    };
};

// ===== 対戦履歴（Match History）=====

// 対戦参加者の情報
export interface MatchPlayer {
    playerId: string;
    playerName: string;
    playerClass: ClassType;
    ratingBefore: number;
    ratingAfter: number;
    isFirst: boolean;  // 先攻かどうか
}

// 対戦履歴レコード
export interface MatchRecord {
    matchId: string;
    timestamp: number;
    gameMode: 'CASUAL_MATCH' | 'RANKED_MATCH';
    player1: MatchPlayer;
    player2: MatchPlayer;
    winnerId: string;  // 勝者のplayerId
    winnerSide: 'player1' | 'player2';
    duration?: number;  // 試合時間（秒）- オプション
}
