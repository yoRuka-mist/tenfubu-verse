import { describe, it, expect } from 'vitest';
import { calculateFirstTurnStats, calculateFirstTurnStatsByClass } from '../firstTurn';
import { firstTurnTestData, createMockMatch } from './testData';

describe('calculateFirstTurnStats', () => {
    it('空の配列では全て0を返す', () => {
        const result = calculateFirstTurnStats([]);

        expect(result.firstWins).toBe(0);
        expect(result.firstLosses).toBe(0);
        expect(result.secondWins).toBe(0);
        expect(result.secondLosses).toBe(0);
        expect(result.firstWinRate).toBe(0);
        expect(result.secondWinRate).toBe(0);
        expect(result.totalMatches).toBe(0);
    });

    it('先攻後攻の勝敗を正しくカウントする', () => {
        const result = calculateFirstTurnStats(firstTurnTestData);

        // 期待値: 先攻勝ち=3, 先攻負け=2, 後攻勝ち=2, 後攻負け=3
        expect(result.firstWins).toBe(3);
        expect(result.firstLosses).toBe(2);
        expect(result.secondWins).toBe(2);
        expect(result.secondLosses).toBe(3);
        expect(result.totalMatches).toBe(5);
    });

    it('勝率を正しく計算する', () => {
        const result = calculateFirstTurnStats(firstTurnTestData);

        // 先攻勝率: 3/(3+2) = 60%
        // 後攻勝率: 2/(2+3) = 40%
        expect(result.firstWinRate).toBe(60);
        expect(result.secondWinRate).toBe(40);
    });

    it('全て先攻勝ちの場合は100%', () => {
        const allFirstWins = [
            createMockMatch({ player1IsFirst: true, winner: 'player1' }),
            createMockMatch({ player1IsFirst: false, winner: 'player2' }),
        ];

        const result = calculateFirstTurnStats(allFirstWins);

        expect(result.firstWinRate).toBe(100);
        expect(result.secondWinRate).toBe(0);
    });
});

describe('calculateFirstTurnStatsByClass', () => {
    it('各クラスごとの先攻後攻統計を返す', () => {
        const matches = [
            // SENKA先攻勝ち
            createMockMatch({ player1Class: 'SENKA', player2Class: 'AJA', player1IsFirst: true, winner: 'player1' }),
            // SENKA後攻勝ち
            createMockMatch({ player1Class: 'AJA', player2Class: 'SENKA', player1IsFirst: true, winner: 'player2' }),
            // SENKA先攻負け
            createMockMatch({ player1Class: 'SENKA', player2Class: 'AJA', player1IsFirst: true, winner: 'player2' }),
        ];

        const result = calculateFirstTurnStatsByClass(matches);

        const senkaStats = result.find(r => r.class === 'SENKA');
        expect(senkaStats).toBeDefined();
        expect(senkaStats!.firstWins).toBe(1);
        expect(senkaStats!.firstLosses).toBe(1);
        expect(senkaStats!.secondWins).toBe(1);
        expect(senkaStats!.secondLosses).toBe(0);
    });
});
