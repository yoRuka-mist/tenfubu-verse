import { describe, it, expect } from 'vitest';
import { calculateDeckUsage } from '../deckUsage';
import { deckUsageTestData, createMockMatch } from './testData';

describe('calculateDeckUsage', () => {
    it('空の配列では全クラス0件を返す', () => {
        const result = calculateDeckUsage([]);

        expect(result).toHaveLength(3);
        expect(result.find(r => r.class === 'SENKA')?.count).toBe(0);
        expect(result.find(r => r.class === 'AJA')?.count).toBe(0);
        expect(result.find(r => r.class === 'YORUKA')?.count).toBe(0);
    });

    it('各クラスの使用回数を正しくカウントする', () => {
        const result = calculateDeckUsage(deckUsageTestData);

        // SENKA=4, AJA=3, YORUKA=3
        expect(result.find(r => r.class === 'SENKA')?.count).toBe(4);
        expect(result.find(r => r.class === 'AJA')?.count).toBe(3);
        expect(result.find(r => r.class === 'YORUKA')?.count).toBe(3);
    });

    it('使用率を正しく計算する（パーセンテージ）', () => {
        const result = calculateDeckUsage(deckUsageTestData);

        // 合計10回: SENKA=40%, AJA=30%, YORUKA=30%
        expect(result.find(r => r.class === 'SENKA')?.percentage).toBe(40);
        expect(result.find(r => r.class === 'AJA')?.percentage).toBe(30);
        expect(result.find(r => r.class === 'YORUKA')?.percentage).toBe(30);
    });

    it('同じクラス同士の対戦も正しくカウントする', () => {
        const mirrorMatches = [
            createMockMatch({ player1Class: 'SENKA', player2Class: 'SENKA' }),
            createMockMatch({ player1Class: 'SENKA', player2Class: 'SENKA' }),
        ];

        const result = calculateDeckUsage(mirrorMatches);

        // SENKA 4回（2試合×2人）
        expect(result.find(r => r.class === 'SENKA')?.count).toBe(4);
        expect(result.find(r => r.class === 'SENKA')?.percentage).toBe(100);
    });

    it('使用回数順にソートされている', () => {
        const result = calculateDeckUsage(deckUsageTestData);

        // countの降順
        expect(result[0].count).toBeGreaterThanOrEqual(result[1].count);
        expect(result[1].count).toBeGreaterThanOrEqual(result[2].count);
    });
});
