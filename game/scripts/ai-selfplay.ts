import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { calculateStateHash, createRNG, gameReducer, initializeGame } from '../src/core/engine.js';
import { getOpponentAwarePolicy } from '../src/ai/opponentPolicy.js';
import type { AbilityEffect, BoardCard, Card, ClassType, GameAction, GameState } from '../src/core/types.js';

type MatchResult = {
  gameIndex: number;
  seed: number;
  p1Class: ClassType;
  p2Class: ClassType;
  firstPlayerId: string;
  winnerId: string;
  winnerClass: ClassType;
  turnCount: number;
  senkaFirstPlayTurnP1?: number;
  senkaFirstPlayTurnP2?: number;
  whiteTsubakiTurns: number[];
  baneBarrierAttempts: number;
  baneBarrierFavorable: number;
  baneBarrierSetupLethal: number;
  keyEvents: string[];
};

type Weights = {
  knucklerBonus: number;
  cannonBonus: number;
  stormBonus: number;
  holdPenaltyAja: number;
  holdPenaltyOther: number;
  whiteBase: number;
  tradeBase: number;
  faceWindowBonus: number;
  badTradePenalty: number;
};

type Args = {
  games: number;
  seed: number;
  outDir: string;
  maxTurns: number;
  verbose: boolean;
  mode: 'selfplay' | 'tune';
  trials: number;
  gamesPerTrial: number;
  p1Class?: ClassType;
  p2Class?: ClassType;
  weights?: Weights;
};

type SummaryMetrics = {
  games: number;
  matchupWinrates: Map<string, { win: number; total: number; turns: number }>;
  senkaTurn8Rate: number;
  senkaTurn8Count: number;
  senkaPlayableCount: number;
  senkaWinAt9or10Rate: number;
  senkaWinAt9or10: number;
  senkaWins: number;
  whiteEarly: number;
  whiteMid: number;
  whiteLate: number;
  whiteTotal: number;
  baneBarrierAttempts: number;
  baneBarrierFavorable: number;
  baneBarrierSetupLethal: number;
  baneBarrierFavorableRate: number;
  senkaVsAjaP1Rate?: number;
};

type TrialResult = {
  trial: number;
  weights: Weights;
  seed: number;
  objective: number;
  senkaVsAjaP1Rate: number;
  senkaTurn8Rate: number;
  senkaWinAt9or10Rate: number;
};

const CLASSES: ClassType[] = ['SENKA', 'AJA', 'YORUKA'];
const MAJOR_EVENT_KEYWORDS = ['盞華', '白ツバキ', '天下布舞・ファイナルキャノン', 'Y', 'あじゃ', '勝利'];
const BURST_SEARCH_TOP_K = 6;
const DEFAULT_WEIGHTS: Weights = {
  knucklerBonus: 148,
  cannonBonus: 218,
  stormBonus: 64,
  holdPenaltyAja: 208,
  holdPenaltyOther: 172,
  whiteBase: 74,
  tradeBase: 44,
  faceWindowBonus: 34,
  badTradePenalty: 22,
};



const YORUKA_BANE_HIGH_PRIORITY_TARGETS = new Set(['c_valkyrie', 'c_white_tsubaki']);

let ACTIVE_WEIGHTS: Weights = { ...DEFAULT_WEIGHTS };

function parseWeights(raw?: string): Weights | undefined {
  if (!raw) return undefined;
  const parsed = JSON.parse(raw) as Partial<Weights>;
  return {
    ...DEFAULT_WEIGHTS,
    ...parsed,
  };
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const get = (name: string, fallback: string) => {
    const i = args.findIndex((a) => a === `--${name}`);
    if (i >= 0 && i + 1 < args.length) return args[i + 1];
    return fallback;
  };
  const getOpt = (name: string): string | undefined => {
    const i = args.findIndex((a) => a === `--${name}`);
    if (i >= 0 && i + 1 < args.length) return args[i + 1];
    return undefined;
  };

  const p1 = getOpt('p1Class') as ClassType | undefined;
  const p2 = getOpt('p2Class') as ClassType | undefined;

  return {
    games: Number(get('games', '1000')),
    seed: Number(get('seed', String(Date.now() % 2147483647))),
    outDir: get('outDir', './selfplay-results'),
    maxTurns: Number(get('maxTurns', '30')),
    verbose: args.includes('--verbose'),
    mode: (get('mode', 'selfplay') as Args['mode']),
    trials: Number(get('trials', '24')),
    gamesPerTrial: Number(get('gamesPerTrial', '2000')),
    p1Class: p1 && CLASSES.includes(p1) ? p1 : undefined,
    p2Class: p2 && CLASSES.includes(p2) ? p2 : undefined,
    weights: parseWeights(getOpt('weights')),
  };
}

function dispatchSafe(state: GameState, action: GameAction): GameState {
  return gameReducer(state, action);
}

function getEnemyPlayerId(playerId: string): string {
  return playerId === 'p1' ? 'p2' : 'p1';
}

function findValidTargetsForEffect(effect: AbilityEffect, state: GameState, playerId: string): string[] {
  const enemy = state.players[getEnemyPlayerId(playerId)];
  const self = state.players[playerId];

  if (effect.targetType === 'SELECT_FOLLOWER') {
    return enemy.board.filter(Boolean).map((c) => c!.instanceId);
  }
  if (effect.targetType === 'SELECT_ALLY_FOLLOWER') {
    return self.board.filter(Boolean).map((c) => c!.instanceId);
  }
  if (effect.targetType === 'SELECT_OTHER_ALLY_FOLLOWER') {
    return self.board.filter(Boolean).map((c) => c!.instanceId);
  }
  return [];
}

function selectTargetForCard(card: Card, state: GameState, playerId: string): string | undefined {
  const fanfareEffects = card.triggers?.filter((t) => t.trigger === 'FANFARE').flatMap((t) => t.effects) ?? [];
  const required = fanfareEffects.filter((e) =>
    e.targetType === 'SELECT_FOLLOWER' ||
    e.targetType === 'SELECT_ALLY_FOLLOWER' ||
    e.targetType === 'SELECT_OTHER_ALLY_FOLLOWER'
  );

  if (required.length === 0) return undefined;

  const first = required[0];
  const targets = findValidTargetsForEffect(first, state, playerId);
  if (targets.length === 0) return undefined;

  if (first.targetType === 'SELECT_FOLLOWER') {
    const enemy = state.players[getEnemyPlayerId(playerId)];
    const scored = enemy.board
      .map((c) => c as BoardCard | null)
      .filter(Boolean)
      .map((c) => ({ id: c!.instanceId, score: (c!.currentAttack ?? 0) * 2 + (c!.currentHealth ?? 0) }))
      .sort((a, b) => b.score - a.score);
    return scored[0]?.id;
  }

  return targets[0];
}

function resolvePendingEffects(state: GameState): GameState {
  let next = state;
  let guard = 0;
  while (next.pendingEffects.length > 0 && !next.winnerId && guard < 200) {
    guard += 1;
    const current = next.pendingEffects[0];
    const targets = findValidTargetsForEffect(current.effect, next, current.sourcePlayerId);
    const targetId = targets[0];
    next = dispatchSafe(next, {
      type: 'RESOLVE_EFFECT',
      playerId: current.sourcePlayerId,
      payload: { targetId },
    });
  }
  return next;
}

function calculatePotentialDamage(state: GameState, playerId: string): number {
  const player = state.players[playerId];
  const enemy = state.players[getEnemyPlayerId(playerId)];
  const hasWard = enemy.board.some((c) => c?.passiveAbilities?.includes('WARD') && !c?.passiveAbilities?.includes('STEALTH'));
  let damage = 0;
  for (const card of player.board) {
    if (!card?.canAttack) continue;
    const isStorm = card.passiveAbilities?.includes('STORM');
    const canGoFace = isStorm || card.turnPlayed !== state.turnCount;
    if (!canGoFace) continue;
    if (hasWard && !card.passiveAbilities?.includes('STEALTH') && !card.hadStealth) continue;
    damage += card.currentAttack ?? 0;
    if (card.passiveAbilities?.includes('DOUBLE_ATTACK')) damage += card.currentAttack ?? 0;
  }
  return damage;
}

function estimateCardBurst(card: Card, state: GameState, playerId: string): number {
  const player = state.players[playerId];
  const enemy = state.players[getEnemyPlayerId(playerId)];
  let burst = 0;

  if (card.passiveAbilities?.includes('STORM')) {
    burst += (card.attack ?? 0) * (card.passiveAbilities?.includes('DOUBLE_ATTACK') ? 2 : 1);
  }
  if (card.id === 's_final_cannon') {
    burst += Math.max(0, enemy.hp - 1);
  }
  if (card.id === 'c_senka_knuckler') {
    burst += 6;
    if (player.board.some((b) => b?.tags?.includes('Knuckler'))) burst += 2;
  }

  return burst;
}

function estimateBurstForPp(state: GameState, playerId: string, availablePp: number): number {
  const player = state.players[playerId];
  const boardFace = calculatePotentialDamage(state, playerId);
  const scoredHand = player.hand
    .map((card, idx) => ({ idx, card, burst: estimateCardBurst(card, state, playerId) }))
    .filter((x) => x.card.cost <= availablePp)
    .sort((a, b) => b.burst - a.burst)
    .slice(0, BURST_SEARCH_TOP_K);

  let best = 0;
  for (let i = 0; i < scoredHand.length; i++) {
    const c1 = scoredHand[i];
    best = Math.max(best, c1.burst);

    for (let j = i + 1; j < scoredHand.length; j++) {
      const c2 = scoredHand[j];
      if (c1.card.cost + c2.card.cost > availablePp) continue;
      best = Math.max(best, c1.burst + c2.burst);
    }
  }

  return boardFace + best;
}

function estimateFutureWindowBurst(state: GameState, playerId: string): { t9: number; t10: number; best: number } {
  const player = state.players[playerId];
  const pp9 = Math.min(10, player.maxPp + 1);
  const pp10 = Math.min(10, player.maxPp + 2);
  const t9 = estimateBurstForPp(state, playerId, pp9);
  const t10 = estimateBurstForPp(state, playerId, pp10);
  return { t9, t10, best: Math.max(t9, t10) };
}

function estimateNextTurnBoardPressure(state: GameState, playerId: string, excludeInstanceId?: string): number {
  const player = state.players[playerId];
  return player.board
    .filter((c): c is BoardCard => Boolean(c))
    .filter((c) => c.instanceId !== excludeInstanceId)
    .reduce((sum, c) => sum + (c.currentAttack ?? 0), 0);
}

function countStealthFollowers(board: (BoardCard | null)[]): number {
  return board.filter((c) => c?.passiveAbilities?.includes('STEALTH')).length;
}

function isYorukaEmergencyRemovalWindow(state: GameState, playerId: string): boolean {
  const enemy = state.players[getEnemyPlayerId(playerId)];
  const enemyFollowers = enemy.board.filter((c): c is BoardCard => Boolean(c));
  const enemyAtk = enemyFollowers.reduce((sum, c) => sum + (c.currentAttack ?? 0), 0);
  const ownHp = state.players[playerId].hp;
  const hasBarrierThreat = enemyFollowers.some((c) => c.hasBarrier && (YORUKA_BANE_HIGH_PRIORITY_TARGETS.has(c.id) || (c.currentAttack ?? 0) >= 4));
  return enemyFollowers.length >= 3 || enemyAtk >= Math.max(8, ownHp - 3) || hasBarrierThreat;
}

function scoreCardForPlaying(card: Card, state: GameState, playerId: string): number {
  const player = state.players[playerId];
  const enemy = state.players[getEnemyPlayerId(playerId)];
  const policy = getOpponentAwarePolicy(player.class, enemy.class);
  const enemyBoard = enemy.board.filter((c): c is BoardCard => Boolean(c));
  const turnCount = state.turnCount;
  const currentDamage = calculatePotentialDamage(state, playerId);
  let score = card.cost * 10;

  if (card.passiveAbilities?.includes('STORM')) {
    const cardDamage = card.attack ?? 0;
    if (currentDamage + cardDamage >= enemy.hp) score += 500;
    else if (enemy.hp <= 10) score += 100;
    else score += 30;
  }

  if (turnCount >= 8 && turnCount <= 10) {
    const needDamage = Math.max(0, enemy.hp - currentDamage);
    const ajaAggroCoef = enemy.class === 'AJA' ? 1.34 : 1.0;
    const boardPenaltyCoef = player.board.filter(Boolean).length >= 4 ? 0.75 : 1.0;
    const pressureCoef = enemy.hp <= 12 ? 1.12 : 1.0;
    const facePlanCoef = ajaAggroCoef * boardPenaltyCoef * pressureCoef;

    if (card.id === 'c_senka_knuckler') score += Math.round(ACTIVE_WEIGHTS.knucklerBonus * facePlanCoef * policy.faceBias);
    if (card.id === 's_final_cannon') score += Math.round(ACTIVE_WEIGHTS.cannonBonus * facePlanCoef * policy.faceBias);
    if (card.passiveAbilities?.includes('STORM')) score += Math.round(ACTIVE_WEIGHTS.stormBonus * facePlanCoef * policy.faceBias);
    const faceDamage = (card.attack ?? 0) * (card.passiveAbilities?.includes('DOUBLE_ATTACK') ? 2 : 1);
    if (needDamage <= faceDamage) score += Math.round(170 * facePlanCoef * policy.faceBias);
  }

  if (card.id === 'c_senka_knuckler' && turnCount === 8) {
    const nowPotential = currentDamage + (card.attack ?? 0) * 2;
    const nowLethal = nowPotential >= enemy.hp;
    const futureWindow = estimateFutureWindowBurst(state, playerId);
    const holdIsBetter = !nowLethal && futureWindow.best >= enemy.hp && (futureWindow.best - nowPotential >= 2);
    if (holdIsBetter) score -= enemy.class === 'AJA' ? ACTIVE_WEIGHTS.holdPenaltyAja : ACTIVE_WEIGHTS.holdPenaltyOther;
  }

  if (card.id === 'c_white_tsubaki') {
    const enemyHand = enemy.hand.length;
    const turnBandCoef = turnCount <= 4 ? 1.2 : turnCount <= 8 ? 1.0 : 0.55;
    const classCoef = enemy.class === 'AJA' ? 1.18 : enemy.class === 'YORUKA' ? 0.95 : 0.88;
    const handCoef = Math.min(1.35, 0.85 + enemyHand * 0.06);
    const removalPressure = turnBandCoef * classCoef * handCoef;
    score += Math.round(ACTIVE_WEIGHTS.whiteBase * removalPressure * policy.whiteTsubakiPriority);
    if (enemyBoard.length > 0) score += Math.round(24 * removalPressure * policy.whiteTsubakiPriority);
  }

  if (player.class === 'YORUKA') {
    const ownBoard = player.board.filter((c): c is BoardCard => Boolean(c));
    const enemyStealthCount = countStealthFollowers(enemy.board);
    const emergencyRemoval = isYorukaEmergencyRemovalWindow(state, playerId);
    const hasHarukaOnBoard = ownBoard.some((c) => c.id === 'c_haruka');
    const hasHarukaInHand = player.hand.some((h) => h.id === 'c_haruka');
    const harukaPlayedThisTurn = ownBoard.some((c) => c.id === 'c_haruka' && c.turnPlayed === turnCount);
    const harukaSurvived = ownBoard.some((c) => c.id === 'c_haruka' && c.turnPlayed < turnCount);

    if (card.id === 'c_haruka') {
      score += 72;
      if (turnCount >= 7 && !emergencyRemoval) score += 24;
      if (player.hand.some((h) => h.id === 's_hayakikoto')) score += 18;
      if (player.board.some((c) => c?.id === 'c_yoruka')) score += 22; // YORUKA先置き→遙後置き
    }

    // PP5分岐: 除去は悠霞、展開はぶっちー
    if (player.pp >= 5 && card.cost === 5 && (card.id === 'c_yuka' || card.id === 'c_bucchi')) {
      const enemyCount = enemyBoard.length;
      const canBucchiTradeCleanly = enemyCount === 1 && (enemyBoard[0]?.currentHealth ?? 99) <= 5;
      const removePreferred = enemyCount >= 3 || enemyStealthCount > 0;
      if (card.id === 'c_yuka') {
        if (removePreferred) score += 70;
        else score -= 12;
      }
      if (card.id === 'c_bucchi') {
        if (canBucchiTradeCleanly || (!removePreferred && enemyCount <= 2)) score += 56;
        else score -= 20;
      }
    }

    if (card.id === 's_hayakikoto') {
      if (harukaSurvived) score += 76; // 次T「疾きこと風の如く→遙超進化」ライン
      if (hasHarukaOnBoard) score += 20;
      if (player.board.filter(Boolean).length >= 4) score -= 10;
    }

    // 4-6Tの進化温存方針を補助: 中盤は安易な盤面吐きを抑える
    if (turnCount >= 4 && turnCount <= 6 && card.id === 's_hayakikoto' && !emergencyRemoval) {
      score -= 18;
    }

    // 遙着地ターンに悠霞進化へ寄せるため、同ターンの追加5コスト展開をやや抑制
    if (harukaPlayedThisTurn && card.id === 'c_bucchi') {
      score -= 14;
    }

    if (card.id === 'c_setsuna') {
      const hasHighBarrier = enemyBoard.some((c) => c.hasBarrier && YORUKA_BANE_HIGH_PRIORITY_TARGETS.has(c.id));
      if (!hasHighBarrier && enemyBoard.length <= 1 && enemy.hp > 8) {
        score -= 16; // 無駄切り抑制
      }
    }

    if (hasHarukaInHand && card.id === 'c_yoruka' && turnCount >= 7 && turnCount <= 9) {
      score += 28; // YORUKA先置き→遙後置き代替ルート
    }
  }

  if (card.type === 'FOLLOWER' && player.board.filter(Boolean).length >= 5) score -= 200;
  return score;
}

function choosePlayableCardIndex(state: GameState, playerId: string): number {
  const player = state.players[playerId];
  const candidates = player.hand
    .map((card, idx) => ({ card, idx }))
    .filter(({ card }) => card.cost <= player.pp)
    .filter(({ card }) => card.type !== 'FOLLOWER' || player.board.filter(Boolean).length < 5)
    .sort((a, b) => scoreCardForPlaying(b.card, state, playerId) - scoreCardForPlaying(a.card, state, playerId));

  for (const c of candidates) {
    const target = selectTargetForCard(c.card, state, playerId);
    const hasSelect = (c.card.triggers?.some((t) => t.trigger === 'FANFARE' && t.effects.some((e) =>
      e.targetType === 'SELECT_FOLLOWER' || e.targetType === 'SELECT_ALLY_FOLLOWER' || e.targetType === 'SELECT_OTHER_ALLY_FOLLOWER'
    )) ?? false);
    if (!hasSelect || target) return c.idx;
  }

  return -1;
}

function wouldDieAttacking(attacker: BoardCard, target: BoardCard): boolean {
  const targetAttack = target.currentAttack ?? 0;
  const targetDealsDamage = targetAttack > 0;

  if (targetDealsDamage && target.passiveAbilities?.includes('BANE') && !attacker.hasBarrier) {
    return true;
  }

  if (attacker.hasBarrier) return false;

  return targetAttack >= (attacker.currentHealth ?? 0);
}

function canKillTarget(attacker: BoardCard, target: BoardCard): boolean {
  const attackerAttack = attacker.currentAttack ?? 0;
  const attackerDealsDamage = attackerAttack > 0;
  if (!attackerDealsDamage) return false;

  if (attacker.passiveAbilities?.includes('BANE')) {
    return !target.hasBarrier;
  }

  if (target.hasBarrier) return false;

  return attackerAttack >= (target.currentHealth ?? 0);
}

function chooseAttackTarget(state: GameState, playerId: string, attacker: BoardCard): { targetIndex: number; targetIsLeader: boolean } {
  const player = state.players[playerId];
  const enemy = state.players[getEnemyPlayerId(playerId)];
  const policy = getOpponentAwarePolicy(player.class, enemy.class);
  const canAttackLeader = attacker.passiveAbilities?.includes('STORM') || attacker.turnPlayed !== state.turnCount;
  const faceWindow = state.turnCount >= 9 && state.turnCount <= 10;

  const enemies = enemy.board
    .map((c, i) => ({ c, i }))
    .filter((x): x is { c: BoardCard; i: number } => Boolean(x.c));

  const ward = enemies.find((x) => x.c.passiveAbilities?.includes('WARD'));
  if (ward) {
    return { targetIndex: ward.i, targetIsLeader: false };
  }

  let best: { index: number; score: number } = { index: -1, score: -9999 };
  for (const { c: target, i } of enemies) {
    const willDie = wouldDieAttacking(attacker, target);
    let score = 0;

    if (canKillTarget(attacker, target)) {
      score += Math.round((ACTIVE_WEIGHTS.tradeBase + (target.currentAttack ?? 0) * 5) * policy.tradeBias);
      if (!willDie) score += 26;
      if (attacker.hasBarrier && target.hasBarrier) score += 12; // バリア有利トレード維持
      if (target.passiveAbilities?.includes('BANE') && willDie) score -= 34;
      if (target.passiveAbilities?.includes('BANE') && !willDie) score += 40;
    } else {
      if (willDie) score -= 48 + ACTIVE_WEIGHTS.badTradePenalty;
      else if ((attacker.currentAttack ?? 0) >= (target.currentHealth ?? 0) / 2) score += 4;
      else score -= 8;
    }

    if (attacker.passiveAbilities?.includes('BANE') && target.hasBarrier) {
      score += policy.baneBarrierStripValue;
      if (!wouldDieAttacking(attacker, target)) score += 8;
      const nextTurnPressure = estimateNextTurnBoardPressure(state, playerId, attacker.instanceId) + (attacker.currentAttack ?? 0);
      if (nextTurnPressure >= (target.currentHealth ?? 0)) {
        score += policy.baneSetupLethalValue;
      }
    }

    if (target.id === 'c_white_tsubaki') {
      score += Math.round(28 * policy.whiteTsubakiAnswer);
    }

    if (state.players[playerId].class === 'YORUKA' && attacker.id === 'c_setsuna') {
      const highPriority = YORUKA_BANE_HIGH_PRIORITY_TARGETS.has(target.id);
      if (highPriority) score += 56;
      if (target.hasBarrier && highPriority) score += 32;
      if (!highPriority && !target.hasBarrier && canAttackLeader && enemy.hp > 6) score -= 24;
    }

    if (faceWindow && canAttackLeader) {
      score -= Math.round(ACTIVE_WEIGHTS.faceWindowBonus * policy.faceBias);
      if (enemy.hp <= 8) score -= 10;
    }

    if (score > best.score) best = { index: i, score };
  }

  if (canAttackLeader) {
    const lethalLike = enemy.hp <= (attacker.currentAttack ?? 0) * (attacker.passiveAbilities?.includes('DOUBLE_ATTACK') ? 2 : 1) + 2;
    if (state.players[playerId].class === 'YORUKA' && attacker.id === 'c_setsuna') {
      const hasHighPriorityBarrier = enemies.some((x) => x.c.hasBarrier && YORUKA_BANE_HIGH_PRIORITY_TARGETS.has(x.c.id));
      if (!hasHighPriorityBarrier && enemy.hp > 4) {
        return { targetIndex: -1, targetIsLeader: true };
      }
    }
    if (faceWindow || lethalLike) {
      if (best.index < 0 || best.score <= ACTIVE_WEIGHTS.faceWindowBonus) {
        return { targetIndex: -1, targetIsLeader: true };
      }
    }
  }

  if (best.index >= 0 && best.score > 8) return { targetIndex: best.index, targetIsLeader: false };
  if (canAttackLeader) return { targetIndex: -1, targetIsLeader: true };
  if (best.index >= 0) return { targetIndex: best.index, targetIsLeader: false };
  return { targetIndex: -1, targetIsLeader: false };
}

type BaneBarrierTelemetry = {
  attempts: number;
  favorable: number;
  setupLethal: number;
};

function chooseEvolutionPlan(state: GameState, playerId: string): { followerIndex: number; useSep: boolean; targetId?: string } | null {
  const player = state.players[playerId];
  const enemy = state.players[getEnemyPlayerId(playerId)];
  const evolvable = player.board
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c && !c.hasEvolved)
    .sort((a, b) => (b.c!.currentAttack ?? 0) - (a.c!.currentAttack ?? 0));

  if (evolvable.length === 0) return null;

  const firstPlayer = playerId === state.firstPlayerId;
  const canNormalEvolve = state.turnCount >= (firstPlayer ? 5 : 4) && player.evolutionsUsed < 2 && player.canEvolveThisTurn;
  const canSuperEvolve = state.turnCount >= 6 && player.sep > 0 && player.canEvolveThisTurn;
  if (!canNormalEvolve && !canSuperEvolve) return null;

  const enemyFollowers = enemy.board.filter((c): c is BoardCard => Boolean(c));
  const emergencyRemoval = isYorukaEmergencyRemovalWindow(state, playerId);

  if (player.class === 'YORUKA') {
    const yukaLanding = player.board
      .map((c, i) => ({ c, i }))
      .find((x) => x.c?.id === 'c_yuka' && x.c.turnPlayed === state.turnCount && !x.c.hasEvolved);
    const harukaSurvived = player.board
      .map((c, i) => ({ c, i }))
      .find((x) => x.c?.id === 'c_haruka' && x.c.turnPlayed < state.turnCount && !x.c.hasEvolved);
    const harukaJustPlayed = player.board
      .map((c, i) => ({ c, i }))
      .find((x) => x.c?.id === 'c_haruka' && x.c.turnPlayed === state.turnCount && !x.c.hasEvolved);
    const hasHayakikotoInHand = player.hand.some((h) => h.id === 's_hayakikoto');

    // 2) 遙着地T: 悠霞進化を最優先
    if (canNormalEvolve && yukaLanding && harukaJustPlayed) {
      return { followerIndex: yukaLanding.i, useSep: false, targetId: enemyFollowers[0]?.instanceId };
    }

    // 2) 遙生存→次T爆発: 超進化を主軸化
    if (canSuperEvolve && harukaSurvived && (hasHayakikotoInHand || enemyFollowers.length >= 2 || enemy.hp <= 14)) {
      return { followerIndex: harukaSurvived.i, useSep: true, targetId: enemyFollowers[0]?.instanceId };
    }

    // 1) 7T遙即超進化はサブプラン（緊急除去時のみ）
    if (canSuperEvolve && harukaJustPlayed && state.turnCount === 7 && emergencyRemoval) {
      return { followerIndex: harukaJustPlayed.i, useSep: true, targetId: enemyFollowers[0]?.instanceId };
    }

    // 2) 4-6Tは進化温存寄り
    if (state.turnCount >= 4 && state.turnCount <= 6 && !emergencyRemoval) {
      return null;
    }
  }

  const fallback = evolvable[0];
  if (!fallback) return null;
  return { followerIndex: fallback.i, useSep: false, targetId: enemyFollowers[0]?.instanceId };
}

function performTurn(state: GameState, playerId: string, telemetry: BaneBarrierTelemetry): GameState {
  let next = resolvePendingEffects(state);
  if (next.winnerId) return next;

  const player = next.players[playerId];
  if (!player) return next;

  let safety = 0;
  while (safety < 20) {
    safety += 1;
    const idx = choosePlayableCardIndex(next, playerId);
    if (idx < 0) break;

    const card = next.players[playerId].hand[idx];
    const targetId = selectTargetForCard(card, next, playerId);
    const before = calculateStateHash(next);
    next = dispatchSafe(next, {
      type: 'PLAY_CARD',
      playerId,
      payload: { cardIndex: idx, targetId, instanceId: card.instanceId },
    });
    next = resolvePendingEffects(next);
    if (next.winnerId) return next;
    if (calculateStateHash(next) === before) break;
  }

  const evoPlan = chooseEvolutionPlan(next, playerId);
  if (evoPlan) {
    next = dispatchSafe(next, {
      type: 'EVOLVE',
      playerId,
      payload: { followerIndex: evoPlan.followerIndex, targetId: evoPlan.targetId, useSep: evoPlan.useSep },
    });
    next = resolvePendingEffects(next);
    if (next.winnerId) return next;
  }

  for (let i = 0; i < next.players[playerId].board.length; i++) {
    let loop = 0;
    while (loop < 2) {
      loop += 1;
      const attacker = next.players[playerId].board[i];
      if (!attacker?.canAttack) break;

      const decision = chooseAttackTarget(next, playerId, attacker);
      if (!decision.targetIsLeader && decision.targetIndex < 0) break;

      const enemyId = getEnemyPlayerId(playerId);
      const preTarget = !decision.targetIsLeader && decision.targetIndex >= 0
        ? next.players[enemyId].board[decision.targetIndex]
        : null;
      const isBaneBarrierAttempt = Boolean(preTarget && attacker.passiveAbilities?.includes('BANE') && preTarget.hasBarrier);
      if (isBaneBarrierAttempt) {
        telemetry.attempts += 1;
      }

      const before = calculateStateHash(next);
      next = dispatchSafe(next, {
        type: 'ATTACK',
        playerId,
        payload: {
          attackerIndex: i,
          targetIndex: decision.targetIndex,
          targetIsLeader: decision.targetIsLeader,
        },
      });
      next = resolvePendingEffects(next);

      if (isBaneBarrierAttempt && preTarget) {
        const attackerAfter = next.players[playerId].board.find((c) => c?.instanceId === attacker.instanceId);
        const targetAfter = next.players[enemyId].board.find((c) => c?.instanceId === preTarget.instanceId);
        const stripped = Boolean(targetAfter && !targetAfter.hasBarrier);
        if ((attackerAfter && stripped) || (!targetAfter && attackerAfter)) {
          telemetry.favorable += 1;
        }
        if (targetAfter && stripped) {
          const nextTurnPressure = estimateNextTurnBoardPressure(next, playerId, attacker.instanceId) + (attackerAfter?.currentAttack ?? 0);
          if (nextTurnPressure >= (targetAfter.currentHealth ?? 0)) {
            telemetry.setupLethal += 1;
          }
        }
      }

      if (next.winnerId) return next;
      if (calculateStateHash(next) === before) break;
    }
  }

  next = dispatchSafe(next, { type: 'END_TURN', playerId });
  next = resolvePendingEffects(next);
  return next;
}

function runSingleGame(gameIndex: number, seed: number, p1Class: ClassType, p2Class: ClassType, p1GoingFirst: boolean, maxTurns: number): MatchResult {
  let state = initializeGame('CPU-1', p1Class, 'CPU-2', p2Class, seed, p1GoingFirst);

  let senkaFirstPlayTurnP1: number | undefined;
  let senkaFirstPlayTurnP2: number | undefined;
  const whiteTsubakiTurns: number[] = [];

  let previousLogLength = 0;
  const baneBarrierTelemetry: BaneBarrierTelemetry = { attempts: 0, favorable: 0, setupLethal: 0 };

  for (let turnGuard = 0; turnGuard < maxTurns * 2; turnGuard++) {
    if (state.winnerId) break;
    if (state.turnCount > maxTurns) break;

    state = performTurn(state, state.activePlayerId, baneBarrierTelemetry);

    const newLogs = state.logs.slice(previousLogLength);
    previousLogLength = state.logs.length;

    for (const line of newLogs) {
      if (line.includes('盞華 をプレイしました')) {
        if (line.startsWith('CPU-1') && senkaFirstPlayTurnP1 === undefined) senkaFirstPlayTurnP1 = state.turnCount;
        if (line.startsWith('CPU-2') && senkaFirstPlayTurnP2 === undefined) senkaFirstPlayTurnP2 = state.turnCount;
      }
      if (line.includes('白ツバキ をプレイしました')) {
        whiteTsubakiTurns.push(state.turnCount);
      }
    }
  }

  if (!state.winnerId) {
    const p1Hp = state.players.p1.hp;
    const p2Hp = state.players.p2.hp;
    state.winnerId = p1Hp === p2Hp ? 'p1' : p1Hp > p2Hp ? 'p1' : 'p2';
  }

  const winnerClass = state.winnerId === 'p1' ? p1Class : p2Class;
  const keyEvents = state.logs.filter((log) => MAJOR_EVENT_KEYWORDS.some((k) => log.includes(k))).slice(-12);

  return {
    gameIndex,
    seed,
    p1Class,
    p2Class,
    firstPlayerId: state.firstPlayerId,
    winnerId: state.winnerId,
    winnerClass,
    turnCount: state.turnCount,
    senkaFirstPlayTurnP1,
    senkaFirstPlayTurnP2,
    whiteTsubakiTurns,
    baneBarrierAttempts: baneBarrierTelemetry.attempts,
    baneBarrierFavorable: baneBarrierTelemetry.favorable,
    baneBarrierSetupLethal: baneBarrierTelemetry.setupLethal,
    keyEvents,
  };
}

function computeSummaryMetrics(results: MatchResult[]): SummaryMetrics {
  const total = results.length;
  const matchupWins = new Map<string, { win: number; total: number; turns: number }>();

  let senkaPlayableCount = 0;
  let senkaTurn8Count = 0;
  let senkaWinAt9or10 = 0;
  let senkaWins = 0;
  let whiteTsubakiEarly = 0;
  let whiteTsubakiMid = 0;
  let whiteTsubakiLate = 0;
  let baneBarrierAttempts = 0;
  let baneBarrierFavorable = 0;
  let baneBarrierSetupLethal = 0;

  for (const r of results) {
    const key = `${r.p1Class} vs ${r.p2Class}`;
    const rec = matchupWins.get(key) ?? { win: 0, total: 0, turns: 0 };
    rec.total += 1;
    rec.turns += r.turnCount;
    if (r.winnerId === 'p1') rec.win += 1;
    matchupWins.set(key, rec);

    const senkaTurns = [r.senkaFirstPlayTurnP1, r.senkaFirstPlayTurnP2].filter((v): v is number => v !== undefined);
    for (const t of senkaTurns) {
      senkaPlayableCount += 1;
      if (t === 8) senkaTurn8Count += 1;
    }

    if (r.winnerClass === 'SENKA') {
      senkaWins += 1;
      if (r.turnCount === 9 || r.turnCount === 10) senkaWinAt9or10 += 1;
    }

    for (const t of r.whiteTsubakiTurns) {
      if (t <= 4) whiteTsubakiEarly += 1;
      else if (t <= 8) whiteTsubakiMid += 1;
      else whiteTsubakiLate += 1;
    }

    baneBarrierAttempts += r.baneBarrierAttempts;
    baneBarrierFavorable += r.baneBarrierFavorable;
    baneBarrierSetupLethal += r.baneBarrierSetupLethal;
  }

  const senkaVsAja = matchupWins.get('SENKA vs AJA');

  return {
    games: total,
    matchupWinrates: matchupWins,
    senkaTurn8Rate: senkaPlayableCount > 0 ? (senkaTurn8Count / senkaPlayableCount) * 100 : 0,
    senkaTurn8Count,
    senkaPlayableCount,
    senkaWinAt9or10Rate: senkaWins > 0 ? (senkaWinAt9or10 / senkaWins) * 100 : 0,
    senkaWinAt9or10,
    senkaWins,
    whiteEarly: whiteTsubakiEarly,
    whiteMid: whiteTsubakiMid,
    whiteLate: whiteTsubakiLate,
    whiteTotal: whiteTsubakiEarly + whiteTsubakiMid + whiteTsubakiLate,
    baneBarrierAttempts,
    baneBarrierFavorable,
    baneBarrierSetupLethal,
    baneBarrierFavorableRate: baneBarrierAttempts > 0 ? (baneBarrierFavorable / baneBarrierAttempts) * 100 : 0,
    senkaVsAjaP1Rate: senkaVsAja ? (senkaVsAja.win / senkaVsAja.total) * 100 : undefined,
  };
}

function summarize(results: MatchResult[]): string {
  const m = computeSummaryMetrics(results);
  const lines: string[] = [];
  lines.push(`games=${m.games}`);
  lines.push('--- winrate table (p1 perspective) ---');
  for (const [key, v] of m.matchupWinrates.entries()) {
    lines.push(`${key}: winRate=${((v.win / v.total) * 100).toFixed(1)}% avgTurn=${(v.turns / v.total).toFixed(2)} n=${v.total}`);
  }
  lines.push('--- senka metrics ---');
  lines.push(`8T盞華先切り率=${m.senkaTurn8Rate.toFixed(2)}% (${m.senkaTurn8Count}/${m.senkaPlayableCount})`);
  lines.push(`9T/10Tリーサル到達率(盞華勝利時)=${m.senkaWinAt9or10Rate.toFixed(2)}% (${m.senkaWinAt9or10}/${m.senkaWins})`);
  lines.push(`白ツバキ使用ターン帯: 1-4T=${m.whiteEarly}, 5-8T=${m.whiteMid}, 9T+=${m.whiteLate}, total=${m.whiteTotal}`);
  lines.push(`BANE→BARRIER剥がし: favorableRate=${m.baneBarrierFavorableRate.toFixed(2)}% (${m.baneBarrierFavorable}/${m.baneBarrierAttempts}), setupLethal=${m.baneBarrierSetupLethal}`);
  return lines.join('\n');
}

function toCsvRow(r: MatchResult): string {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [
    r.gameIndex,
    r.seed,
    r.p1Class,
    r.p2Class,
    r.firstPlayerId,
    r.winnerId,
    r.winnerClass,
    r.turnCount,
    r.senkaFirstPlayTurnP1 ?? '',
    r.senkaFirstPlayTurnP2 ?? '',
    r.whiteTsubakiTurns.join('|'),
    r.baneBarrierAttempts,
    r.baneBarrierFavorable,
    r.baneBarrierSetupLethal,
    r.keyEvents.join(' / '),
  ].map(esc).join(',');
}

function runSimulation(args: Args, forcedWeights?: Weights): MatchResult[] {
  ACTIVE_WEIGHTS = { ...DEFAULT_WEIGHTS, ...(args.weights ?? {}), ...(forcedWeights ?? {}) };
  const rng = createRNG(args.seed);
  const results: MatchResult[] = [];

  for (let i = 0; i < args.games; i++) {
    const p1Class = args.p1Class ?? CLASSES[Math.floor(rng() * CLASSES.length)];
    const p2Class = args.p2Class ?? CLASSES[Math.floor(rng() * CLASSES.length)];
    const p1GoingFirst = rng() < 0.5;
    const result = runSingleGame(i + 1, args.seed + i, p1Class, p2Class, p1GoingFirst, args.maxTurns);
    results.push(result);

    if ((i + 1) % 100 === 0 || i + 1 === args.games) {
      console.log(`[ai-selfplay] ${i + 1}/${args.games}`);
    }
  }
  return results;
}

function objectiveFromMetrics(m: SummaryMetrics): number {
  const wr = m.senkaVsAjaP1Rate ?? 0;
  return wr + 0.35 * m.senkaWinAt9or10Rate - 0.20 * m.senkaTurn8Rate;
}

function generateCandidateWeights(rng: () => number): Weights {
  const pick = (arr: number[]) => arr[Math.floor(rng() * arr.length)];
  return {
    knucklerBonus: pick([132, 148, 164, 180]),
    cannonBonus: pick([198, 218, 238, 252]),
    stormBonus: pick([52, 64, 76]),
    holdPenaltyAja: pick([180, 208, 236, 260]),
    holdPenaltyOther: pick([156, 172, 196]),
    whiteBase: pick([66, 74, 86]),
    tradeBase: pick([38, 44, 50]),
    faceWindowBonus: pick([28, 34, 40]),
    badTradePenalty: pick([16, 22, 28]),
  };
}

function runTune(args: Args): { best: TrialResult; trials: TrialResult[] } {
  const tuneRng = createRNG(args.seed + 99173);
  const trials: TrialResult[] = [];

  for (let i = 0; i < args.trials; i++) {
    const weights = generateCandidateWeights(tuneRng);
    const trialArgs: Args = {
      ...args,
      games: args.gamesPerTrial,
      p1Class: 'SENKA',
      p2Class: 'AJA',
      // 全trialで同一seed系列を使い、重み差分のみを比較
      seed: args.seed,
    };
    const results = runSimulation(trialArgs, weights);
    const metrics = computeSummaryMetrics(results);

    trials.push({
      trial: i + 1,
      weights,
      seed: trialArgs.seed,
      objective: objectiveFromMetrics(metrics),
      senkaVsAjaP1Rate: metrics.senkaVsAjaP1Rate ?? 0,
      senkaTurn8Rate: metrics.senkaTurn8Rate,
      senkaWinAt9or10Rate: metrics.senkaWinAt9or10Rate,
    });

    console.log(`[tune] trial=${i + 1}/${args.trials} score=${trials[i].objective.toFixed(3)} wr=${trials[i].senkaVsAjaP1Rate.toFixed(2)} 8T=${trials[i].senkaTurn8Rate.toFixed(2)} 9/10=${trials[i].senkaWinAt9or10Rate.toFixed(2)}`);
  }

  trials.sort((a, b) => b.objective - a.objective);
  return { best: trials[0], trials };
}

function writeOutputs(args: Args, results: MatchResult[], suffix = '') {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const prefix = suffix ? `${suffix}-` : '';
  const jsonlPath = join(args.outDir, `${prefix}selfplay-${stamp}.jsonl`);
  const csvPath = join(args.outDir, `${prefix}selfplay-${stamp}.csv`);
  const summaryPath = join(args.outDir, `${prefix}summary-${stamp}.txt`);

  writeFileSync(jsonlPath, results.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');

  const header = [
    'gameIndex', 'seed', 'p1Class', 'p2Class', 'firstPlayerId', 'winnerId', 'winnerClass', 'turnCount',
    'senkaFirstPlayTurnP1', 'senkaFirstPlayTurnP2', 'whiteTsubakiTurns', 'baneBarrierAttempts', 'baneBarrierFavorable', 'baneBarrierSetupLethal', 'keyEvents'
  ].join(',');
  writeFileSync(csvPath, `${header}\n${results.map(toCsvRow).join('\n')}\n`, 'utf8');

  const summary = summarize(results);
  writeFileSync(summaryPath, `${summary}\n`, 'utf8');

  console.log(summary);
  console.log(`JSONL: ${jsonlPath}`);
  console.log(`CSV:   ${csvPath}`);
  console.log(`SUMMARY: ${summaryPath}`);
}

function main() {
  const args = parseArgs();

  if (!args.verbose) {
    const originalLog = console.log.bind(console);
    console.log = (...a: unknown[]) => {
      const msg = String(a[0] ?? '');
      if (msg.startsWith('[Engine') || msg.startsWith('[Reducer')) return;
      originalLog(...a);
    };
  }

  mkdirSync(args.outDir, { recursive: true });

  if (args.mode === 'tune') {
    const tuned = runTune(args);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const tuneSummaryPath = join(args.outDir, `tune-summary-${stamp}.json`);
    writeFileSync(tuneSummaryPath, JSON.stringify(tuned, null, 2), 'utf8');
    console.log(`[tune] best trial=${tuned.best.trial} objective=${tuned.best.objective.toFixed(3)} weights=${JSON.stringify(tuned.best.weights)}`);
    console.log(`[tune] summary=${tuneSummaryPath}`);
    return;
  }

  const results = runSimulation(args, args.weights);
  writeOutputs(args, results);
}

main();
