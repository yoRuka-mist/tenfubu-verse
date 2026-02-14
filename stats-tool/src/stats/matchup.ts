import { MatchRecord, MatchupStats, ClassType, ALL_CLASSES } from './types';

/**
 * マッチアップ（デッキ対デッキ）の勝率統計を計算する
 *
 * ミラーマッチ（同クラス同士）は統計対象外。
 */
export const calculateMatchupStats = (matches: MatchRecord[]): MatchupStats[] => {
    // マッチアップごとの勝敗をカウント
    // キー形式: "CLASS1-CLASS2"（アルファベット順）
    const matchupData = new Map<string, { class1: ClassType; class2: ClassType; class1Wins: number; class2Wins: number }>();

    matches.forEach((match) => {
        const class1 = match.player1.playerClass;
        const class2 = match.player2.playerClass;

        // ミラーマッチは除外
        if (class1 === class2) {
            return;
        }

        // キーを生成（アルファベット順で統一）
        const [sortedClass1, sortedClass2] = [class1, class2].sort();
        const key = `${sortedClass1}-${sortedClass2}`;

        if (!matchupData.has(key)) {
            matchupData.set(key, {
                class1: sortedClass1 as ClassType,
                class2: sortedClass2 as ClassType,
                class1Wins: 0,
                class2Wins: 0,
            });
        }

        const data = matchupData.get(key)!;

        // 勝者のクラスを判定
        const winnerClass = match.winnerSide === 'player1'
            ? match.player1.playerClass
            : match.player2.playerClass;

        if (winnerClass === data.class1) {
            data.class1Wins++;
        } else {
            data.class2Wins++;
        }
    });

    // 結果配列を生成
    const result: MatchupStats[] = [];

    matchupData.forEach((data) => {
        const totalMatches = data.class1Wins + data.class2Wins;
        result.push({
            class1: data.class1,
            class2: data.class2,
            class1Wins: data.class1Wins,
            class2Wins: data.class2Wins,
            totalMatches,
            class1WinRate: totalMatches > 0
                ? Math.round((data.class1Wins / totalMatches) * 10000) / 100 // 小数点2桁
                : 0,
        });
    });

    return result;
};

/**
 * マッチアップマトリックスを生成する
 *
 * 3x3のマトリックス形式で各マッチアップの勝率を返す。
 * 自分 vs 相手 の形式で、自分の勝率を表示。
 */
export interface MatchupCell {
    winRate: number;
    totalMatches: number;
    wins: number;
    losses: number;
}

export type MatchupMatrix = Record<ClassType, Record<ClassType, MatchupCell | null>>;

export const getMatchupMatrix = (matches: MatchRecord[]): MatchupMatrix => {
    // 初期化（ALL_CLASSESから動的に生成、クラス追加時も自動対応）
    const matrix = {} as MatchupMatrix;
    ALL_CLASSES.forEach((class1) => {
        matrix[class1] = {} as Record<ClassType, MatchupCell | null>;
        ALL_CLASSES.forEach((class2) => {
            matrix[class1][class2] = null; // ミラーマッチ含め全てnullで初期化
        });
    });

    // マッチアップ統計を取得
    const stats = calculateMatchupStats(matches);

    // マトリックスに値を設定
    stats.forEach((stat) => {
        // class1 vs class2
        matrix[stat.class1][stat.class2] = {
            winRate: stat.class1WinRate,
            totalMatches: stat.totalMatches,
            wins: stat.class1Wins,
            losses: stat.class2Wins,
        };

        // class2 vs class1（逆方向）- 丸め誤差を避けるため直接計算
        matrix[stat.class2][stat.class1] = {
            winRate: stat.totalMatches > 0
                ? Math.round((stat.class2Wins / stat.totalMatches) * 10000) / 100
                : 0,
            totalMatches: stat.totalMatches,
            wins: stat.class2Wins,
            losses: stat.class1Wins,
        };
    });

    return matrix;
};

/**
 * 特定クラスのマッチアップ詳細を取得する
 */
export const getClassMatchupDetails = (
    matches: MatchRecord[],
    targetClass: ClassType
): { opponent: ClassType; winRate: number; totalMatches: number; wins: number; losses: number }[] => {
    const matrix = getMatchupMatrix(matches);
    const result: { opponent: ClassType; winRate: number; totalMatches: number; wins: number; losses: number }[] = [];

    ALL_CLASSES.forEach((opponentClass) => {
        if (opponentClass === targetClass) {
            return; // ミラーマッチはスキップ
        }

        const cell = matrix[targetClass][opponentClass];
        if (cell) {
            result.push({
                opponent: opponentClass,
                winRate: cell.winRate,
                totalMatches: cell.totalMatches,
                wins: cell.wins,
                losses: cell.losses,
            });
        }
    });

    return result;
};
