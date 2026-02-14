import { describe, it, expect } from 'vitest';
import { calculateCombinedStats, calculateOverviewStats } from '../combined';
import { combinedTestData, createMockMatch } from './testData';
import { MatchRecord } from '../types';

describe('calculateCombinedStats', () => {
    it('空の配列では全て0を返す', () => {
        const result = calculateCombinedStats([]);

        expect(result).toHaveLength(6); // 3クラス × 2（先攻/後攻）
        result.forEach(stat => {
            expect(stat.wins).toBe(0);
            expect(stat.losses).toBe(0);
            expect(stat.winRate).toBe(0);
        });
    });

    it('クラス別・先攻後攻別の勝率を正しく計算する', () => {
        const result = calculateCombinedStats(combinedTestData);

        // SENKA先攻: 勝ち2、負け1 → 勝率 66.67%
        const senkaFirst = result.find(r => r.class === 'SENKA' && r.isFirst === true);
        expect(senkaFirst).toBeDefined();
        expect(senkaFirst!.wins).toBe(2);
        expect(senkaFirst!.losses).toBe(1);
        expect(senkaFirst!.winRate).toBeCloseTo(66.67, 0);

        // SENKA後攻: 勝ち1、負け2 → 勝率 33.33%
        const senkaSecond = result.find(r => r.class === 'SENKA' && r.isFirst === false);
        expect(senkaSecond).toBeDefined();
        expect(senkaSecond!.wins).toBe(1);
        expect(senkaSecond!.losses).toBe(2);
        expect(senkaSecond!.winRate).toBeCloseTo(33.33, 0);
    });
});

describe('calculateOverviewStats', () => {
    it('空の配列では全て0を返す', () => {
        const result = calculateOverviewStats([]);

        expect(result.totalMatches).toBe(0);
        expect(result.rankedMatches).toBe(0);
        expect(result.casualMatches).toBe(0);
        expect(result.uniquePlayers).toBe(0);
        expect(result.averageDuration).toBe(0);
    });

    it('基本統計を正しく計算する', () => {
        const matches: MatchRecord[] = [
            createMockMatch({ gameMode: 'RANKED_MATCH', duration: 300 }),
            createMockMatch({ gameMode: 'RANKED_MATCH', duration: 400 }),
            createMockMatch({ gameMode: 'CASUAL_MATCH', duration: 200 }),
        ];

        const result = calculateOverviewStats(matches);

        expect(result.totalMatches).toBe(3);
        expect(result.rankedMatches).toBe(2);
        expect(result.casualMatches).toBe(1);
        expect(result.averageDuration).toBe(300); // (300+400+200)/3
    });

    it('ユニークプレイヤー数を正しくカウントする', () => {
        // デフォルトのモックデータは player1-id と player2-id を使用
        const matches: MatchRecord[] = [
            createMockMatch({}),
            createMockMatch({}),
            createMockMatch({}),
        ];

        const result = calculateOverviewStats(matches);

        // 同じ2人が3回対戦
        expect(result.uniquePlayers).toBe(2);
    });

    it('durationがないマッチは平均計算から除外', () => {
        const matches: MatchRecord[] = [
            { ...createMockMatch({ duration: 300 }), duration: 300 },
            { ...createMockMatch({}), duration: undefined },
        ];

        const result = calculateOverviewStats(matches);

        expect(result.averageDuration).toBe(300);
    });
});
