import { MatchRecord } from '../types';

// テスト用のモックデータ生成ヘルパー
export const createMockMatch = (
    overrides: Partial<MatchRecord> & {
        player1Class?: 'SENKA' | 'AJA' | 'YORUKA';
        player2Class?: 'SENKA' | 'AJA' | 'YORUKA';
        player1IsFirst?: boolean;
        winner?: 'player1' | 'player2';
    } = {}
): MatchRecord => {
    const player1IsFirst = overrides.player1IsFirst ?? true;
    const winner = overrides.winner ?? 'player1';

    return {
        matchId: overrides.matchId ?? `match-${Math.random().toString(36).substring(7)}`,
        timestamp: overrides.timestamp ?? Date.now(),
        gameMode: overrides.gameMode ?? 'RANKED_MATCH',
        player1: {
            playerId: 'player1-id',
            playerName: 'Player 1',
            playerClass: overrides.player1Class ?? 'SENKA',
            ratingBefore: 1000,
            ratingAfter: winner === 'player1' ? 1200 : 980,
            isFirst: player1IsFirst,
        },
        player2: {
            playerId: 'player2-id',
            playerName: 'Player 2',
            playerClass: overrides.player2Class ?? 'AJA',
            ratingBefore: 1000,
            ratingAfter: winner === 'player2' ? 1200 : 980,
            isFirst: !player1IsFirst,
        },
        winnerId: winner === 'player1' ? 'player1-id' : 'player2-id',
        winnerSide: winner,
        duration: overrides.duration ?? 300,
    };
};

// デッキ使用率テスト用データ
export const deckUsageTestData: MatchRecord[] = [
    // SENKA vs AJA: SENKAが2回、AJAが2回
    createMockMatch({ player1Class: 'SENKA', player2Class: 'AJA' }),
    createMockMatch({ player1Class: 'SENKA', player2Class: 'AJA' }),
    // YORUKA vs SENKA: YORUKAが2回、SENKAが2回（計4回）
    createMockMatch({ player1Class: 'YORUKA', player2Class: 'SENKA' }),
    createMockMatch({ player1Class: 'YORUKA', player2Class: 'SENKA' }),
    // AJA vs YORUKA: AJAが1回（計3回）、YORUKAが1回（計3回）
    createMockMatch({ player1Class: 'AJA', player2Class: 'YORUKA' }),
    // 期待値: SENKA=4, AJA=3, YORUKA=3 → 合計10回
];

// 先攻後攻テスト用データ
export const firstTurnTestData: MatchRecord[] = [
    // 先攻勝ち: 3回
    createMockMatch({ player1IsFirst: true, winner: 'player1' }),
    createMockMatch({ player1IsFirst: false, winner: 'player2' }),
    createMockMatch({ player1IsFirst: true, winner: 'player1' }),
    // 後攻勝ち: 2回
    createMockMatch({ player1IsFirst: true, winner: 'player2' }),
    createMockMatch({ player1IsFirst: false, winner: 'player1' }),
    // 期待値: 先攻勝ち=3, 先攻負け=2, 後攻勝ち=2, 後攻負け=3
];

// マッチアップテスト用データ
export const matchupTestData: MatchRecord[] = [
    // SENKA vs AJA: SENKA勝ち2回、AJA勝ち1回
    createMockMatch({ player1Class: 'SENKA', player2Class: 'AJA', winner: 'player1' }),
    createMockMatch({ player1Class: 'SENKA', player2Class: 'AJA', winner: 'player1' }),
    createMockMatch({ player1Class: 'AJA', player2Class: 'SENKA', winner: 'player1' }), // AJA勝ち
    // SENKA vs YORUKA: SENKA勝ち1回、YORUKA勝ち2回
    createMockMatch({ player1Class: 'SENKA', player2Class: 'YORUKA', winner: 'player1' }),
    createMockMatch({ player1Class: 'YORUKA', player2Class: 'SENKA', winner: 'player1' }), // YORUKA勝ち
    createMockMatch({ player1Class: 'YORUKA', player2Class: 'SENKA', winner: 'player1' }), // YORUKA勝ち
    // AJA vs YORUKA: AJA勝ち2回、YORUKA勝ち2回
    createMockMatch({ player1Class: 'AJA', player2Class: 'YORUKA', winner: 'player1' }),
    createMockMatch({ player1Class: 'AJA', player2Class: 'YORUKA', winner: 'player1' }),
    createMockMatch({ player1Class: 'YORUKA', player2Class: 'AJA', winner: 'player1' }), // YORUKA勝ち
    createMockMatch({ player1Class: 'YORUKA', player2Class: 'AJA', winner: 'player1' }), // YORUKA勝ち
];

// 複合分析テスト用データ
export const combinedTestData: MatchRecord[] = [
    // SENKA先攻: 勝ち2、負け1
    createMockMatch({ player1Class: 'SENKA', player2Class: 'AJA', player1IsFirst: true, winner: 'player1' }),
    createMockMatch({ player1Class: 'SENKA', player2Class: 'AJA', player1IsFirst: true, winner: 'player1' }),
    createMockMatch({ player1Class: 'SENKA', player2Class: 'AJA', player1IsFirst: true, winner: 'player2' }),
    // SENKA後攻: 勝ち1、負け2
    createMockMatch({ player1Class: 'AJA', player2Class: 'SENKA', player1IsFirst: true, winner: 'player2' }), // SENKA後攻勝ち
    createMockMatch({ player1Class: 'AJA', player2Class: 'SENKA', player1IsFirst: true, winner: 'player1' }), // SENKA後攻負け
    createMockMatch({ player1Class: 'AJA', player2Class: 'SENKA', player1IsFirst: true, winner: 'player1' }), // SENKA後攻負け
];
