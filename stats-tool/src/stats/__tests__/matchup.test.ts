import { describe, it, expect } from 'vitest';
import { calculateMatchupStats, getMatchupMatrix } from '../matchup';
import { matchupTestData, createMockMatch } from './testData';

describe('calculateMatchupStats', () => {
    it('空の配列では空配列を返す', () => {
        const result = calculateMatchupStats([]);
        expect(result).toHaveLength(0);
    });

    it('各マッチアップの統計を正しく計算する', () => {
        const result = calculateMatchupStats(matchupTestData);

        // SENKA vs AJA: SENKA勝ち2回、AJA勝ち1回 → SENKA勝率 66.67%
        const senkaVsAja = result.find(
            r => (r.class1 === 'SENKA' && r.class2 === 'AJA') || (r.class1 === 'AJA' && r.class2 === 'SENKA')
        );
        expect(senkaVsAja).toBeDefined();
        expect(senkaVsAja!.totalMatches).toBe(3);

        // SENKA vs YORUKA: SENKA勝ち1回、YORUKA勝ち2回 → SENKA勝率 33.33%
        const senkaVsYoruka = result.find(
            r => (r.class1 === 'SENKA' && r.class2 === 'YORUKA') || (r.class1 === 'YORUKA' && r.class2 === 'SENKA')
        );
        expect(senkaVsYoruka).toBeDefined();
        expect(senkaVsYoruka!.totalMatches).toBe(3);

        // AJA vs YORUKA: AJA勝ち2回、YORUKA勝ち2回 → AJA勝率 50%
        const ajaVsYoruka = result.find(
            r => (r.class1 === 'AJA' && r.class2 === 'YORUKA') || (r.class1 === 'YORUKA' && r.class2 === 'AJA')
        );
        expect(ajaVsYoruka).toBeDefined();
        expect(ajaVsYoruka!.totalMatches).toBe(4);
    });

    it('ミラーマッチ（同クラス同士）は含まれない', () => {
        const mirrorMatches = [
            createMockMatch({ player1Class: 'SENKA', player2Class: 'SENKA' }),
        ];

        const result = calculateMatchupStats(mirrorMatches);

        // ミラーマッチは統計に含めない（勝率が意味をなさないため）
        expect(result).toHaveLength(0);
    });
});

describe('getMatchupMatrix', () => {
    it('3x3のマトリックスを返す', () => {
        const result = getMatchupMatrix(matchupTestData);

        expect(result.SENKA).toBeDefined();
        expect(result.AJA).toBeDefined();
        expect(result.YORUKA).toBeDefined();
    });

    it('マトリックスの値が正しい', () => {
        const result = getMatchupMatrix(matchupTestData);

        // SENKA vs AJA: SENKA勝率 66.67%（小数点以下四捨五入）
        expect(result.SENKA.AJA?.winRate).toBeCloseTo(66.67, 0);
        expect(result.SENKA.AJA?.totalMatches).toBe(3);

        // AJA vs SENKA: AJA勝率 33.33%
        expect(result.AJA.SENKA?.winRate).toBeCloseTo(33.33, 0);

        // 対称性: A vs B と B vs A の勝率は足して100%
        expect((result.SENKA.AJA?.winRate ?? 0) + (result.AJA.SENKA?.winRate ?? 0)).toBeCloseTo(100, 0);
    });

    it('対戦データがない組み合わせはnull', () => {
        const limitedMatches = [
            createMockMatch({ player1Class: 'SENKA', player2Class: 'AJA', winner: 'player1' }),
        ];

        const result = getMatchupMatrix(limitedMatches);

        // SENKA vs YORUKA は対戦がないのでnull
        expect(result.SENKA.YORUKA).toBeNull();
    });
});
