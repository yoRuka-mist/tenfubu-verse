// クラス（デッキ）タイプ
export type ClassType = 'SENKA' | 'AJA' | 'YORUKA';

// ゲームモード
export type GameMode = 'CASUAL_MATCH' | 'RANKED_MATCH';

// 対戦参加者の情報
export interface MatchPlayer {
    playerId: string;
    playerName: string;
    playerClass: ClassType;
    ratingBefore: number;
    ratingAfter: number;
    isFirst: boolean;  // 先攻かどうか
}

// 対戦履歴レコード（Firebaseから取得する形式）
export interface MatchRecord {
    matchId: string;
    timestamp: number;
    gameMode: GameMode;
    player1: MatchPlayer;
    player2: MatchPlayer;
    winnerId: string;  // 勝者のplayerId
    winnerSide: 'player1' | 'player2';
    duration?: number;  // 試合時間（秒）
}

// ===== 統計結果の型定義 =====

// デッキ使用率
export interface DeckUsageStats {
    class: ClassType;
    count: number;
    percentage: number;
}

// 先攻後攻統計
export interface FirstTurnStats {
    firstWins: number;
    firstLosses: number;
    secondWins: number;
    secondLosses: number;
    firstWinRate: number;  // 0-100
    secondWinRate: number; // 0-100
    totalMatches: number;
}

// マッチアップ統計
export interface MatchupStats {
    class1: ClassType;
    class2: ClassType;
    class1Wins: number;
    class2Wins: number;
    totalMatches: number;
    class1WinRate: number;  // 0-100
}

// 複合分析（デッキ + 先攻/後攻）
export interface CombinedStats {
    class: ClassType;
    isFirst: boolean;
    wins: number;
    losses: number;
    totalMatches: number;
    winRate: number;  // 0-100
}

// 日別統計
export interface DailyStats {
    date: string;  // YYYY-MM-DD
    totalMatches: number;
    rankedMatches: number;
    casualMatches: number;
}

// 概要統計
export interface OverviewStats {
    totalMatches: number;
    rankedMatches: number;
    casualMatches: number;
    uniquePlayers: number;
    averageDuration: number;  // 秒
}

// フィルター条件
export interface StatsFilter {
    startDate?: Date;
    endDate?: Date;
    gameMode?: GameMode | 'ALL';
    minRating?: number;
    maxRating?: number;
}

// クラス名の表示用マッピング
export const CLASS_DISPLAY_NAMES: Record<ClassType, string> = {
    SENKA: '戦華',
    AJA: 'アジャ',
    YORUKA: '夜華',
};

// クラスの色マッピング（グラフ用）
export const CLASS_COLORS: Record<ClassType, string> = {
    SENKA: '#ef4444',   // 赤
    AJA: '#22c55e',     // 緑
    YORUKA: '#3b82f6',  // 青
};

// 全クラスリスト
export const ALL_CLASSES: ClassType[] = ['SENKA', 'AJA', 'YORUKA'];
