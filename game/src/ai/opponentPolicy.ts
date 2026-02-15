import type { ClassType } from '../core/types';

export type ClassPolicy = {
  faceBias: number;
  tradeBias: number;
  whiteTsubakiPriority: number;
  whiteTsubakiAnswer: number;
  baneBarrierStripValue: number;
  baneSetupLethalValue: number;
};

type OpponentAwarePolicy = {
  base: ClassPolicy;
  vs: Record<ClassType, Partial<ClassPolicy>>;
};

const POLICY_PROFILES: Record<ClassType, OpponentAwarePolicy> = {
  SENKA: {
    base: {
      faceBias: 1.2,
      tradeBias: 0.95,
      whiteTsubakiPriority: 1.25,
      whiteTsubakiAnswer: 1.25,
      baneBarrierStripValue: 24,
      baneSetupLethalValue: 22,
    },
    vs: {
      SENKA: { faceBias: 1.08, tradeBias: 1.02, whiteTsubakiPriority: 1.18, whiteTsubakiAnswer: 1.35 },
      AJA: { faceBias: 1.3, tradeBias: 0.88, whiteTsubakiPriority: 1.4, whiteTsubakiAnswer: 1.15 },
      YORUKA: { faceBias: 1.12, tradeBias: 1.06, whiteTsubakiPriority: 1.08, whiteTsubakiAnswer: 1.48, baneBarrierStripValue: 30, baneSetupLethalValue: 28 },
    },
  },
  AJA: {
    base: {
      faceBias: 0.92,
      tradeBias: 1.16,
      whiteTsubakiPriority: 0.9,
      whiteTsubakiAnswer: 1.1,
      baneBarrierStripValue: 30,
      baneSetupLethalValue: 26,
    },
    vs: {
      SENKA: { faceBias: 0.86, tradeBias: 1.24, whiteTsubakiPriority: 0.95, whiteTsubakiAnswer: 1.2 },
      AJA: { faceBias: 0.9, tradeBias: 1.18, whiteTsubakiPriority: 0.82, whiteTsubakiAnswer: 1.06 },
      YORUKA: { faceBias: 0.98, tradeBias: 1.1, whiteTsubakiPriority: 0.88, whiteTsubakiAnswer: 1.28, baneBarrierStripValue: 34, baneSetupLethalValue: 30 },
    },
  },
  YORUKA: {
    base: {
      faceBias: 1.0,
      tradeBias: 1.08,
      whiteTsubakiPriority: 0.95,
      whiteTsubakiAnswer: 1.4,
      baneBarrierStripValue: 42,
      baneSetupLethalValue: 40,
    },
    vs: {
      SENKA: { faceBias: 0.96, tradeBias: 1.18, whiteTsubakiPriority: 0.9, whiteTsubakiAnswer: 1.58, baneBarrierStripValue: 48, baneSetupLethalValue: 44 },
      AJA: { faceBias: 1.08, tradeBias: 1.0, whiteTsubakiPriority: 1.02, whiteTsubakiAnswer: 1.26, baneBarrierStripValue: 38, baneSetupLethalValue: 36 },
      YORUKA: { faceBias: 1.0, tradeBias: 1.12, whiteTsubakiPriority: 0.92, whiteTsubakiAnswer: 1.46, baneBarrierStripValue: 44, baneSetupLethalValue: 42 },
    },
  },
};

export function getOpponentAwarePolicy(selfClass: ClassType, enemyClass: ClassType): ClassPolicy {
  const profile = POLICY_PROFILES[selfClass] ?? POLICY_PROFILES.SENKA;
  const vs = profile.vs[enemyClass] ?? {};
  return { ...profile.base, ...vs };
}

export const OPPONENT_AWARE_POLICY_PROFILES = POLICY_PROFILES;
