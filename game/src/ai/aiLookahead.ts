/**
 * AI先読み機能（Lookahead System）
 * Phase 1: データ構造とユーティリティ
 *
 * このモジュールは、AIがリーサル判定のために行動をシミュレーションするための
 * 軽量なデータ構造とユーティリティ関数を提供します。
 */

import { GameState, Player, Card, BoardCard, PassiveAbility, AbilityEffect, TriggerDefinition } from '../core/types';
import { MOCK_CARDS } from '../core/engine';
import { canEvolve, canSuperEvolve } from '../core/abilities';

// ============================================================================
// インターフェース定義
// ============================================================================

/**
 * シミュレーション用の軽量なゲーム状態
 * フルのGameStateをコピーせず、必要最小限の情報のみを保持
 */
export interface SimulatedGameState {
    /** AI側の手札（超進化で追加されるカードも含む） */
    aiHand: SimulatedCard[];
    /** AI側の盤面（最大5体） */
    aiBoard: SimulatedCard[];
    /** プレイヤー側の盤面 */
    playerBoard: SimulatedCard[];
    /** プレイヤーのHP */
    playerHp: number;
    /** AIのHP */
    aiHp: number;
    /** AIの残りPP（消費: カードコスト、回復: なし） */
    aiPp: number;
    /** AIの残りEP（消費: 通常進化1、回復: なし） */
    aiEp: number;
    /** AIの残りSEP（消費: 超進化1、回復: なし） */
    aiSep: number;
    /** このターンに進化権が残っているか */
    aiCanEvolveThisTurn: boolean;
    /** このターンの進化回数（上限: 2回/ターン） */
    aiEvolveCount: number;
    /** 墓場カード数（ネクロマンス用） */
    aiGraveyard: number;
    /** プレイヤー側の次ダメージ無効シールド */
    playerLeaderDamageShield: boolean;
}

/**
 * シミュレーション用カード
 * 軽量化のため、シミュレーションに必要な情報のみを保持
 */
export interface SimulatedCard {
    /** カード定義ID（例: 'c_senka_knuckler'） */
    id: string;
    /** 一意のインスタンスID（ターゲット指定に使用） */
    instanceId: string;
    /** カード名 */
    name: string;
    /** コスト */
    cost: number;
    /** カードタイプ */
    type: 'FOLLOWER' | 'SPELL';
    /** 現在の攻撃力 */
    currentAttack: number;
    /** 現在の体力 */
    currentHealth: number;
    /** 攻撃可能か（召喚酔い、疾走考慮） */
    canAttack: boolean;
    /** 進化可能か（EP/SEP、進化回数考慮） */
    canEvolve: boolean;
    /** 進化済みか */
    hasEvolved: boolean;
    /** このターンに攻撃済み回数（DOUBLE_ATTACK対応） */
    attacksMade: number;
    /** パッシブ能力（WARD, STEALTH, BANE, STORM, DOUBLE_ATTACK, AURA等） */
    passiveAbilities: PassiveAbility[];
    /** バリア状態（1回ダメージ無効） */
    hasBarrier: boolean;
    /** オーラ状態（対象不可だが攻撃可能） */
    hasAura: boolean;
    /** 過去にSTEALTHを持っていたか（守護無視の永続判定用） */
    hadStealth: boolean;
    /** 進化で発動する効果 */
    evolveEffects?: SimulatedEffect[];
    /** 超進化で発動する効果 */
    superEvolveEffects?: SimulatedEffect[];
    /** 超進化で手札に加わるカードID配列 */
    superEvolveGeneratesCards?: string[];
    /** ネクロマンス条件（条件を満たす場合のみ効果発動） */
    necromanceRequired?: number;
    /** タグ（Knucklerなど） */
    tags?: string[];
}

/**
 * シミュレーション用効果定義
 * リーサル計算に関連する効果タイプのみをサポート
 */
export interface SimulatedEffect {
    /** 効果タイプ */
    type: 'DAMAGE' | 'DAMAGE_LEADER' | 'DESTROY' | 'AOE_DAMAGE' | 'HEAL_LEADER' | 'SUMMON' | 'GENERATE_CARD' | 'BUFF_STATS';
    /** 効果の値（ダメージ量、回復量など） */
    value?: number;
    /** 第2の値（バフの体力値など） */
    value2?: number;
    /** ターゲットタイプ */
    targetType?: string;
    /** ターゲットカードID（SUMMON, GENERATE_CARD用） */
    targetCardId?: string;
    /** ネクロマンス条件 */
    necromance?: number;
}

/**
 * アクションの種類（targetは全てinstanceIdで統一）
 */
export type ActionType =
    | { type: 'PLAY_CARD'; cardInstanceId: string; targetInstanceId?: string }
    | { type: 'EVOLVE'; cardInstanceId: string; useSuperEvolve: boolean; targetInstanceId?: string }
    | { type: 'ATTACK'; attackerInstanceId: string; targetInstanceId: string | 'LEADER' }
    | { type: 'USE_SPELL'; cardInstanceId: string; targetInstanceId?: string }
    | { type: 'END_TURN' };

/**
 * アクション計画
 * 各アクションの優先度と期待される結果を含む
 */
export interface ActionPlan {
    /** 実行するアクション */
    action: ActionType;
    /** 優先度（高いほど先に検討） */
    priority: number;
    /** アクションの理由（デバッグ用） */
    reason: string;
    /** 期待される結果 */
    expectedOutcome: {
        /** プレイヤーへのダメージ */
        damageToPlayer?: number;
        /** 除去されるカードのinstanceId */
        cardsRemoved?: string[];
        /** 獲得するカードのID */
        cardsGained?: string[];
        /** リーサル達成するか */
        lethalAchieved?: boolean;
    };
}

/**
 * リーサル情報
 * リーサル可能性と必要なアクション列を含む
 */
export interface LethalInfo {
    /** リーサル可能か */
    canLethal: boolean;
    /** 必要なアクション列 */
    requiredActions: ActionPlan[];
    /** 総ダメージ */
    totalDamage: number;
    /** 突破が必要な守護カード */
    wardsToRemove: SimulatedCard[];
    /** ダメージの内訳 */
    damageBreakdown: {
        /** 盤面フォロワーからのダメージ */
        boardDamage: number;
        /** 手札スペルからのダメージ */
        spellDamage: number;
        /** 進化効果による直接ダメージ */
        evolveDamage: number;
        /** 疾走フォロワーからのダメージ */
        stormDamage: number;
    };
    /** リソース使用量 */
    resourceUsage: {
        ppUsed: number;
        epUsed: number;
        sepUsed: number;
        necromanceUsed: number;
    };
}

/**
 * 探索状態（枝刈り用）
 */
export interface SearchState {
    /** 現在の探索深度 */
    depth: number;
    /** 最大探索深度（6） */
    maxDepth: number;
    /** 訪問済み状態のハッシュセット */
    visitedStates: Set<string>;
    /** 現時点で見つかった最善のリーサルパス */
    bestLethalPath: ActionPlan[] | null;
    /** 最善パスでの総ダメージ */
    bestLethalDamage: number;
    /** 探索したノード数 */
    nodeCount: number;
}

// ============================================================================
// ユーティリティ関数
// ============================================================================

/**
 * ゲーム状態から軽量なシミュレーション用状態を作成
 *
 * @param gameState - 現在のゲーム状態
 * @param aiPlayerId - AIのプレイヤーID
 * @param playerPlayerId - 人間プレイヤーのID
 * @returns シミュレーション用状態
 */
export function createSimulatedState(
    gameState: GameState,
    aiPlayerId: string,
    playerPlayerId: string
): SimulatedGameState {
    const aiPlayer = gameState.players[aiPlayerId];
    const playerPlayer = gameState.players[playerPlayerId];

    if (!aiPlayer || !playerPlayer) {
        throw new Error('[AI Lookahead] Invalid player IDs');
    }

    // AI側の手札をシミュレーション用カードに変換
    const aiHand: SimulatedCard[] = aiPlayer.hand.map(card =>
        createSimulatedCardFromCard(card, card.instanceId || generateInstanceId())
    );

    // AI側の盤面をシミュレーション用カードに変換
    const aiBoard: SimulatedCard[] = aiPlayer.board
        .filter((card): card is BoardCard => card !== null)
        .map(boardCard => createSimulatedCardFromBoardCard(boardCard, aiPlayer));

    // プレイヤー側の盤面をシミュレーション用カードに変換
    const playerBoard: SimulatedCard[] = playerPlayer.board
        .filter((card): card is BoardCard => card !== null)
        .map(boardCard => createSimulatedCardFromBoardCard(boardCard, playerPlayer));

    const isAiFirstPlayer = aiPlayerId === gameState.firstPlayerId;
    const canUseNormalEvolve = canEvolve(aiPlayer, gameState.turnCount, isAiFirstPlayer);
    const canUseSuperEvolve = canSuperEvolve(aiPlayer, gameState.turnCount, isAiFirstPlayer);

    return {
        aiHand,
        aiBoard,
        playerBoard,
        playerHp: playerPlayer.hp,
        aiHp: aiPlayer.hp,
        aiPp: aiPlayer.pp,
        aiEp: canUseNormalEvolve ? 1 : 0,
        aiSep: canUseSuperEvolve ? aiPlayer.sep : 0,
        aiCanEvolveThisTurn: aiPlayer.canEvolveThisTurn,
        aiEvolveCount: aiPlayer.evolutionsUsed,
        aiGraveyard: aiPlayer.graveyard.length,
        playerLeaderDamageShield: !!playerPlayer.leaderDamageShield,
    };
}

/**
 * 状態のディープコピー（immutableな操作のため）
 *
 * @param state - コピー元の状態
 * @returns ディープコピーされた状態
 */
export function deepCopySimulatedState(state: SimulatedGameState): SimulatedGameState {
    return {
        aiHand: state.aiHand.map(card => ({ ...card, passiveAbilities: [...card.passiveAbilities] })),
        aiBoard: state.aiBoard.map(card => ({ ...card, passiveAbilities: [...card.passiveAbilities] })),
        playerBoard: state.playerBoard.map(card => ({ ...card, passiveAbilities: [...card.passiveAbilities] })),
        playerHp: state.playerHp,
        aiHp: state.aiHp,
        aiPp: state.aiPp,
        aiEp: state.aiEp,
        aiSep: state.aiSep,
        aiCanEvolveThisTurn: state.aiCanEvolveThisTurn,
        aiEvolveCount: state.aiEvolveCount,
        aiGraveyard: state.aiGraveyard,
        playerLeaderDamageShield: state.playerLeaderDamageShield,
    };
}

/**
 * カード定義IDからシミュレーション用カードを作成
 *
 * @param cardId - カード定義ID
 * @param instanceId - インスタンスID
 * @returns シミュレーション用カード
 */
export function createSimulatedCard(cardId: string, instanceId: string): SimulatedCard {
    const cardDef = MOCK_CARDS.find(c => c.id === cardId);

    if (!cardDef) {
        console.warn(`[AI Lookahead] Card not found: ${cardId}`);
        // フォールバック: 最小限のカード
        return {
            id: cardId,
            instanceId,
            name: cardId,
            cost: 0,
            type: 'FOLLOWER',
            currentAttack: 0,
            currentHealth: 1,
            canAttack: false,
            canEvolve: false,
            hasEvolved: false,
            attacksMade: 0,
            passiveAbilities: [],
            hasBarrier: false,
            hasAura: false,
            hadStealth: false,
        };
    }

    const passiveAbilities: PassiveAbility[] = cardDef.passiveAbilities ? [...cardDef.passiveAbilities] : [];
    const hasStorm = passiveAbilities.includes('STORM');
    const hasBarrier = passiveAbilities.includes('BARRIER');
    const hasAura = passiveAbilities.includes('AURA');
    const hadStealth = passiveAbilities.includes('STEALTH');

    // 超進化効果の解析
    const superEvolveEffects = extractSimulatedEffects(cardDef.triggers, 'SUPER_EVOLVE');
    const evolveEffects = extractSimulatedEffects(cardDef.triggers, 'EVOLVE');

    // 超進化で生成されるカードIDを抽出
    const superEvolveGeneratesCards = extractGeneratedCardIds(cardDef.triggers, 'SUPER_EVOLVE');

    return {
        id: cardId,
        instanceId,
        name: cardDef.name,
        cost: cardDef.cost,
        type: cardDef.type,
        currentAttack: cardDef.attack || 0,
        currentHealth: cardDef.health || 1,
        canAttack: hasStorm, // 疾走持ちは即座に攻撃可能
        canEvolve: cardDef.type === 'FOLLOWER' && !hasBarrier, // フォロワーで未進化なら進化可能（詳細は状態依存）
        hasEvolved: false,
        attacksMade: 0,
        passiveAbilities,
        hasBarrier,
        hasAura,
        hadStealth,
        evolveEffects: evolveEffects.length > 0 ? evolveEffects : undefined,
        superEvolveEffects: superEvolveEffects.length > 0 ? superEvolveEffects : undefined,
        superEvolveGeneratesCards: superEvolveGeneratesCards.length > 0 ? superEvolveGeneratesCards : undefined,
        tags: cardDef.tags,
    };
}

/**
 * 状態のハッシュ計算（重複排除用）
 * 盤面、HP、リソースを元にハッシュを生成
 *
 * @param state - シミュレーション状態
 * @returns ハッシュ文字列
 */
export function computeStateHash(state: SimulatedGameState): string {
    // 盤面のカードIDをソートして結合
    const aiBoardHash = state.aiBoard
        .map(c => `${c.id}:${c.currentAttack}:${c.currentHealth}:${c.canAttack ? 1 : 0}:${c.hasEvolved ? 1 : 0}:${c.hasBarrier ? 1 : 0}:${c.attacksMade || 0}:${c.hadStealth ? 1 : 0}`)
        .sort()
        .join('|');

    const playerBoardHash = state.playerBoard
        .map(c => `${c.id}:${c.currentAttack}:${c.currentHealth}:${c.hasBarrier ? 1 : 0}`)
        .sort()
        .join('|');

    // 手札のカードIDをソートして結合
    const handHash = state.aiHand
        .map(c => c.id)
        .sort()
        .join(',');

    // リソース状態
    const resourceHash = `${state.playerHp}:${state.aiHp}:${state.aiPp}:${state.aiEp}:${state.aiSep}:${state.aiEvolveCount}:${state.aiGraveyard}`;

    const flagHash = `${state.aiCanEvolveThisTurn ? 1 : 0}:${state.playerLeaderDamageShield ? 1 : 0}`;
    return `${aiBoardHash}||${playerBoardHash}||${handHash}||${resourceHash}||${flagHash}`;
}

// ============================================================================
// 内部ヘルパー関数
// ============================================================================

/**
 * 一意のインスタンスIDを生成
 */
function generateInstanceId(): string {
    return `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Cardオブジェクトからシミュレーション用カードを作成
 */
function createSimulatedCardFromCard(card: Card, instanceId: string): SimulatedCard {
    const passiveAbilities: PassiveAbility[] = card.passiveAbilities ? [...card.passiveAbilities] : [];
    const hasStorm = passiveAbilities.includes('STORM');
    const hasBarrier = passiveAbilities.includes('BARRIER');
    const hasAura = passiveAbilities.includes('AURA');
    const hadStealth = passiveAbilities.includes('STEALTH');

    // 超進化効果の解析
    const superEvolveEffects = extractSimulatedEffects(card.triggers, 'SUPER_EVOLVE');
    const evolveEffects = extractSimulatedEffects(card.triggers, 'EVOLVE');
    const superEvolveGeneratesCards = extractGeneratedCardIds(card.triggers, 'SUPER_EVOLVE');

    return {
        id: card.id,
        instanceId,
        name: card.name,
        cost: card.cost,
        type: card.type,
        currentAttack: card.attack || 0,
        currentHealth: card.health || 1,
        canAttack: hasStorm,
        canEvolve: card.type === 'FOLLOWER',
        hasEvolved: false,
        attacksMade: 0,
        passiveAbilities,
        hasBarrier,
        hasAura,
        hadStealth,
        evolveEffects: evolveEffects.length > 0 ? evolveEffects : undefined,
        superEvolveEffects: superEvolveEffects.length > 0 ? superEvolveEffects : undefined,
        superEvolveGeneratesCards: superEvolveGeneratesCards.length > 0 ? superEvolveGeneratesCards : undefined,
        tags: card.tags,
    };
}

/**
 * BoardCardオブジェクトからシミュレーション用カードを作成
 */
function createSimulatedCardFromBoardCard(boardCard: BoardCard, player: Player): SimulatedCard {
    const passiveAbilities: PassiveAbility[] = boardCard.passiveAbilities ? [...boardCard.passiveAbilities] : [];
    // RUSH（突進）は召喚ターンのみフォロワー攻撃可能だが、リーサル計算では canAttack で判断
    // const hasRush = passiveAbilities.includes('RUSH');
    const hasBarrier = boardCard.hasBarrier || false;
    const hasAura = passiveAbilities.includes('AURA');

    // カード定義から進化効果を取得
    const cardDef = MOCK_CARDS.find(c => c.id === boardCard.id);
    const superEvolveEffects = cardDef ? extractSimulatedEffects(cardDef.triggers, 'SUPER_EVOLVE') : [];
    const evolveEffects = cardDef ? extractSimulatedEffects(cardDef.triggers, 'EVOLVE') : [];
    const superEvolveGeneratesCards = cardDef ? extractGeneratedCardIds(cardDef.triggers, 'SUPER_EVOLVE') : [];

    // 攻撃可能判定
    // - 召喚酔いでない（canAttack = true）
    // - または疾走持ち
    // - 突進は召喚ターンでもフォロワーにのみ攻撃可能（ここでは canAttack で判断）
    const canAttack = boardCard.canAttack;

    // 進化可能判定
    // - 未進化
    // - プレイヤーの進化回数が2未満
    // - EP または SEP が残っている
    const canEvolve = !boardCard.hasEvolved && player.evolutionsUsed < 2;

    return {
        id: boardCard.id,
        instanceId: boardCard.instanceId,
        name: boardCard.name,
        cost: boardCard.cost,
        type: boardCard.type,
        currentAttack: boardCard.currentAttack,
        currentHealth: boardCard.currentHealth,
        canAttack,
        canEvolve,
        hasEvolved: boardCard.hasEvolved || false,
        attacksMade: boardCard.attacksMade || 0,
        passiveAbilities,
        hasBarrier,
        hasAura,
        hadStealth: boardCard.hadStealth || passiveAbilities.includes('STEALTH'),
        evolveEffects: evolveEffects.length > 0 ? evolveEffects : undefined,
        superEvolveEffects: superEvolveEffects.length > 0 ? superEvolveEffects : undefined,
        superEvolveGeneratesCards: superEvolveGeneratesCards.length > 0 ? superEvolveGeneratesCards : undefined,
        tags: cardDef?.tags,
    };
}

/**
 * トリガー定義からシミュレーション用効果を抽出
 */
function extractSimulatedEffects(
    triggers: TriggerDefinition[] | undefined,
    triggerType: 'EVOLVE' | 'SUPER_EVOLVE'
): SimulatedEffect[] {
    if (!triggers) return [];

    const trigger = triggers.find(t => t.trigger === triggerType);
    if (!trigger) return [];

    return trigger.effects
        .filter(effect => isSimulatableEffect(effect))
        .map(effect => ({
            type: mapEffectType(effect.type),
            value: effect.value,
            value2: effect.value2,
            targetType: effect.targetType,
            targetCardId: effect.targetCardId,
            necromance: effect.necromance,
        }));
}

/**
 * トリガー定義からGENERATE_CARDで生成されるカードIDを抽出
 */
function extractGeneratedCardIds(
    triggers: TriggerDefinition[] | undefined,
    triggerType: 'EVOLVE' | 'SUPER_EVOLVE'
): string[] {
    if (!triggers) return [];

    const trigger = triggers.find(t => t.trigger === triggerType);
    if (!trigger) return [];

    return trigger.effects
        .filter(effect => effect.type === 'GENERATE_CARD' && effect.targetCardId)
        .map(effect => effect.targetCardId!);
}

/**
 * 効果がシミュレーション可能か判定
 */
function isSimulatableEffect(effect: AbilityEffect): boolean {
    const simulatableTypes = [
        'DAMAGE', 'SELECT_DAMAGE', 'RANDOM_DAMAGE', 'AOE_DAMAGE', 'DAMAGE_LEADER',
        'DESTROY', 'RANDOM_DESTROY',
        'HEAL_LEADER',
        'SUMMON', 'SUMMON_CARD', 'SUMMON_CARD_RUSH', 'SUMMON_CARD_BUFFED', 'SUMMON_CARD_FILL_BOARD',
        'GENERATE_CARD',
        'BUFF_STATS',
    ];
    return simulatableTypes.includes(effect.type);
}

/**
 * EffectTypeをSimulatedEffectのtypeにマッピング
 */
function mapEffectType(effectType: string): SimulatedEffect['type'] {
    switch (effectType) {
        case 'DAMAGE':
        case 'SELECT_DAMAGE':
        case 'RANDOM_DAMAGE':
            return 'DAMAGE';
        case 'DAMAGE_LEADER':
            return 'DAMAGE_LEADER';
        case 'AOE_DAMAGE':
            return 'AOE_DAMAGE';
        case 'DESTROY':
        case 'RANDOM_DESTROY':
            return 'DESTROY';
        case 'HEAL_LEADER':
            return 'HEAL_LEADER';
        case 'SUMMON':
        case 'SUMMON_CARD':
        case 'SUMMON_CARD_RUSH':
        case 'SUMMON_CARD_BUFFED':
        case 'SUMMON_CARD_FILL_BOARD':
            return 'SUMMON';
        case 'GENERATE_CARD':
            return 'GENERATE_CARD';
        case 'BUFF_STATS':
            return 'BUFF_STATS';
        default:
            return 'DAMAGE'; // フォールバック
    }
}

// ============================================================================
// 探索状態の初期化
// ============================================================================

/**
 * 探索状態を初期化
 * 
 * @param maxDepth - 最大探索深度（オプション、動的計算される）
 */
export function createSearchState(maxDepth: number = BASE_MAX_DEPTH): SearchState {
    return {
        depth: 0,
        maxDepth,
        visitedStates: new Set(),
        bestLethalPath: null,
        bestLethalDamage: 0,
        nodeCount: 0,
    };
}

/**
 * 空のリーサル情報を作成
 */
export function createEmptyLethalInfo(): LethalInfo {
    return {
        canLethal: false,
        requiredActions: [],
        totalDamage: 0,
        wardsToRemove: [],
        damageBreakdown: {
            boardDamage: 0,
            spellDamage: 0,
            evolveDamage: 0,
            stormDamage: 0,
        },
        resourceUsage: {
            ppUsed: 0,
            epUsed: 0,
            sepUsed: 0,
            necromanceUsed: 0,
        },
    };
}

// ============================================================================
// Phase 2: リーサル計算（簡易版）
// ============================================================================

/**
 * スペルIDから直接ダメージ値を取得
 * リーサル計算用に使用（対象指定スペルのダメージ量）
 *
 * @param spellId - スペルのカードID
 * @returns ダメージ値（ダメージスペルでない場合は0）
 */
export function getSpellDirectDamage(spellId: string): number {
    const cardDef = MOCK_CARDS.find(c => c.id === spellId);
    if (!cardDef || cardDef.type !== 'SPELL') return 0;

    // FANFAREトリガーからDAMAGE効果を探す
    const fanfareTrigger = cardDef.triggers?.find(t => t.trigger === 'FANFARE');
    if (!fanfareTrigger) return 0;

    // 単体ダメージ効果を探す
    const damageEffect = fanfareTrigger.effects.find(e =>
        e.type === 'DAMAGE' ||
        e.type === 'SELECT_DAMAGE' ||
        e.type === 'DAMAGE_LEADER'
    );

    if (damageEffect && damageEffect.value) {
        return damageEffect.value;
    }

    return 0;
}

/**
 * スペルIDからAOEダメージ値を取得
 *
 * @param spellId - スペルのカードID
 * @returns AOEダメージ値（AOEスペルでない場合は0）
 */
export function getSpellAoeDamage(spellId: string): number {
    const cardDef = MOCK_CARDS.find(c => c.id === spellId);
    if (!cardDef || cardDef.type !== 'SPELL') return 0;

    const fanfareTrigger = cardDef.triggers?.find(t => t.trigger === 'FANFARE');
    if (!fanfareTrigger) return 0;

    const aoeEffect = fanfareTrigger.effects.find(e => e.type === 'AOE_DAMAGE');
    if (aoeEffect && aoeEffect.value) {
        return aoeEffect.value;
    }

    return 0;
}

/**
 * 盤面フォロワーからの総ダメージを計算
 * - 進化ボーナス（+2ATK）を含む
 * - DOUBLE_ATTACK持ちは2倍
 * - STORM持ちは召喚酔いなしで攻撃可能
 * - 守護がいる場合は顔面に行けないフォロワーを除外しない（守護処理後のダメージを計算）
 *
 * @param state - シミュレーション状態
 * @param includeEvolveBonus - 進化ボーナスを含めるか（デフォルト: true）
 * @returns 総ダメージ量
 */
export function calculateBoardDamage(
    state: SimulatedGameState,
    includeEvolveBonus: boolean = true
): number {
    let totalDamage = 0;

    for (const card of state.aiBoard) {
        if (!card.canAttack) continue;

        const maxAttacks = card.passiveAbilities.includes('DOUBLE_ATTACK') ? 2 : 1;
        const attacksRemaining = Math.max(0, maxAttacks - (card.attacksMade || 0));
        if (attacksRemaining <= 0) continue;

        // 基本攻撃力
        let attackPower = card.currentAttack;

        // 進化ボーナス（未進化で進化可能な場合）
        if (includeEvolveBonus && state.aiCanEvolveThisTurn && card.canEvolve && !card.hasEvolved) {
            // 進化リソースがあるかチェック
            if (state.aiSep > 0) {
                attackPower += 3;
            } else if (state.aiEp > 0) {
                attackPower += 2;
            }
        }

        totalDamage += attackPower * attacksRemaining;
    }

    return totalDamage;
}

/**
 * 手札スペルからのダメージを計算
 * - コストが払えるスペルのみ
 * - DAMAGE効果を持つスペルを対象（リーダーに打てるスペルのみ）
 *
 * @param state - シミュレーション状態
 * @param remainingPpArg - 利用可能PP（指定時はこの値を使用）
 * @param excludedSpellInstanceIds - 既に別用途で使用済みのスペルinstanceId
 * @returns スペルダメージの合計
 */
export function calculateSpellDamage(
    state: SimulatedGameState,
    remainingPpArg?: number,
    excludedSpellInstanceIds?: Set<string>
): number {
    let totalDamage = 0;
    let remainingPp = remainingPpArg ?? state.aiPp;
    let shieldActive = state.playerLeaderDamageShield;
    const hasLeaderDamageCap = hasPlayerLeaderDamageCap(state);

    // コストの低い順にソートして、使えるスペルを最大化
    const spells = state.aiHand
        .filter(card => card.type === 'SPELL' && !excludedSpellInstanceIds?.has(card.instanceId))
        .sort((a, b) => a.cost - b.cost);

    for (const spell of spells) {
        if (spell.cost <= remainingPp) {
            // リーダーに打てるダメージスペルを探す
            const cardDef = MOCK_CARDS.find(c => c.id === spell.id);
            if (cardDef?.triggers) {
                const fanfareTrigger = cardDef.triggers.find(t => t.trigger === 'FANFARE');
                if (fanfareTrigger) {
                    for (const effect of fanfareTrigger.effects) {
                        // リーダーダメージ効果
                        if (effect.type === 'DAMAGE_LEADER' && effect.value) {
                            let damage = effect.value;
                            if (shieldActive) {
                                damage = 0;
                                shieldActive = false;
                            } else if (hasLeaderDamageCap) {
                                damage = Math.min(damage, 1);
                            }
                            totalDamage += damage;
                            remainingPp -= spell.cost;
                            break;
                        }
                        // 対象選択不要の全体ダメージ（リーダーには入らないので除外）
                        // フォロワー対象のダメージスペル（リーサル時は守護処理に使用）
                    }
                }
            }
        }
    }

    return totalDamage;
}

/**
 * 有効な攻撃対象を列挙
 * - 守護チェック（STEALTHでない守護のみ有効）
 * - 守護がいれば守護のみ攻撃可能
 * - リーダー攻撃の優先度設定
 *
 * @param attacker - 攻撃者（null可：汎用的な対象列挙）
 * @param playerBoard - プレイヤーの盤面
 * @param playerHp - プレイヤーのHP
 * @returns 有効な攻撃対象リスト（優先度付き）
 */
export function getValidAttackTargets(
    attacker: SimulatedCard | null,
    playerBoard: SimulatedCard[],
    _playerHp: number
): Array<{ instanceId: string | 'LEADER'; priority: number }> {
    const targets: Array<{ instanceId: string | 'LEADER'; priority: number }> = [];
    const attackerIgnoresWard = !!attacker && (
        attacker.passiveAbilities.includes('STEALTH') || attacker.hadStealth
    );

    // 1. 守護チェック（STEALTHでない守護のみ）
    const activeWards = playerBoard.filter(c =>
        c.passiveAbilities.includes('WARD') &&
        !c.passiveAbilities.includes('STEALTH')
    );

    // 2. 守護がいる場合は守護のみ攻撃可能（隠密/hadStealthは守護無視）
    if (activeWards.length > 0 && !attackerIgnoresWard) {
        for (const ward of activeWards) {
            // バリア持ちは優先度を下げる（必殺で処理したい）
            const priority = ward.hasBarrier ? 80 : 100;
            targets.push({ instanceId: ward.instanceId, priority });
        }
        return targets;
    }

    // 3. 守護がいない場合
    // 3.1 リーダー攻撃可能（リーサル狙いなら最優先）
    targets.push({ instanceId: 'LEADER', priority: 150 });

    // 3.2 STEALTH以外のフォロワー攻撃可能
    for (const card of playerBoard) {
        if (!card.passiveAbilities.includes('STEALTH')) {
            targets.push({ instanceId: card.instanceId, priority: 30 });
        }
    }

    return targets;
}

/**
 * ダメージ適用（バリア考慮）
 * - バリアがあればダメージ0、バリア消費
 * - 通常ダメージ適用
 *
 * @param target - ダメージを受けるカード（ミュータブル）
 * @param damage - ダメージ量
 * @returns ダメージ適用結果
 */
export function applyDamageToCard(
    target: SimulatedCard,
    damage: number
): { actualDamage: number; barrierConsumed: boolean; destroyed: boolean } {
    // バリアがあればダメージ0、バリア消費
    if (target.hasBarrier && damage > 0) {
        target.hasBarrier = false;
        return { actualDamage: 0, barrierConsumed: true, destroyed: false };
    }

    // 通常ダメージ
    target.currentHealth -= damage;
    const destroyed = target.currentHealth <= 0;
    return { actualDamage: damage, barrierConsumed: false, destroyed };
}

function hasPlayerLeaderDamageCap(state: SimulatedGameState): boolean {
    return state.playerBoard.some(c => c.passiveAbilities.includes('LEADER_DAMAGE_CAP'));
}

function applyDamageToPlayerLeader(state: SimulatedGameState, rawDamage: number): number {
    if (rawDamage <= 0) return 0;

    if (state.playerLeaderDamageShield) {
        state.playerLeaderDamageShield = false;
        return 0;
    }

    const actualDamage = hasPlayerLeaderDamageCap(state) ? Math.min(rawDamage, 1) : rawDamage;
    state.playerHp -= actualDamage;
    return actualDamage;
}

/**
 * 戦闘解決（必殺考慮）
 * - 必殺（BANE）はバリアを貫通して即破壊
 * - 双方がダメージを与え合う
 *
 * @param attacker - 攻撃者（ミュータブル）
 * @param defender - 防御者（ミュータブル）
 * @returns 戦闘結果
 */
export function resolveCombat(
    attacker: SimulatedCard,
    defender: SimulatedCard
): { attackerDestroyed: boolean; defenderDestroyed: boolean } {
    // 必殺持ちはバリアを貫通して即破壊
    const attackerHasBane = attacker.passiveAbilities.includes('BANE');
    const defenderHasBane = defender.passiveAbilities.includes('BANE');

    // ダメージ適用（バリア処理含む）
    const attackerDamageResult = applyDamageToCard(attacker, defender.currentAttack);
    const defenderDamageResult = applyDamageToCard(defender, attacker.currentAttack);

    // 破壊判定（必殺はバリアを貫通する）
    // 必殺持ちが攻撃した場合、防御者は即破壊（バリアがあっても）
    const attackerDestroyed = attackerDamageResult.destroyed || defenderHasBane;
    const defenderDestroyed = defenderDamageResult.destroyed || attackerHasBane;

    return { attackerDestroyed, defenderDestroyed };
}

/**
 * 守護突破手段を列挙
 * - 必殺（BANE）はバリアを貫通して即破壊
 * - ダメージスペルで守護破壊
 * - 攻撃で守護破壊
 *
 * @param state - シミュレーション状態
 * @returns 守護突破のためのアクション計画リスト
 */
export function findWardRemovalOptions(state: SimulatedGameState): ActionPlan[] {
    const plans: ActionPlan[] = [];

    // 守護フォロワーを取得（STEALTHでないもの）
    const wards = state.playerBoard.filter(c =>
        c.passiveAbilities.includes('WARD') &&
        !c.passiveAbilities.includes('STEALTH')
    );

    if (wards.length === 0) {
        return plans;
    }

    // 攻撃可能なフォロワーを分類
    const attackers = state.aiBoard.filter(c => c.canAttack);
    const baneAttackers = attackers.filter(c => c.passiveAbilities.includes('BANE'));
    const normalAttackers = attackers.filter(c => !c.passiveAbilities.includes('BANE'));

    // 使用可能なリソースを追跡
    const usedAttackers = new Set<string>();
    const usedSpells = new Set<string>();
    let remainingPp = state.aiPp;

    for (const ward of wards) {
        // === オプション1: 必殺持ちでバリア守護を突破 ===
        if (ward.hasBarrier) {
            const availableBane = baneAttackers.find(b => !usedAttackers.has(b.instanceId));
            if (availableBane) {
                plans.push({
                    action: {
                        type: 'ATTACK',
                        attackerInstanceId: availableBane.instanceId,
                        targetInstanceId: ward.instanceId
                    },
                    priority: 200,
                    reason: `必殺でバリア守護「${ward.name}」を貫通破壊`,
                    expectedOutcome: { cardsRemoved: [ward.instanceId] }
                });
                usedAttackers.add(availableBane.instanceId);
                continue;
            }
        }

        // === オプション2: ダメージスペルで守護破壊 ===
        const damageSpells = state.aiHand.filter(c =>
            c.type === 'SPELL' &&
            c.cost <= remainingPp &&
            !usedSpells.has(c.instanceId) &&
            getSpellDirectDamage(c.id) > 0
        );

        // バリア持ちの場合、まずバリアを剥がす必要がある
        if (ward.hasBarrier && damageSpells.length > 0) {
            // 最も低コストのスペルでバリアを剥がす
            const cheapestSpell = damageSpells.sort((a, b) => a.cost - b.cost)[0];
            plans.push({
                action: {
                    type: 'USE_SPELL',
                    cardInstanceId: cheapestSpell.instanceId,
                    targetInstanceId: ward.instanceId
                },
                priority: 180,
                reason: `スペル「${cheapestSpell.name}」でバリア剥がし`,
                expectedOutcome: {}
            });
            remainingPp -= cheapestSpell.cost;
            usedSpells.add(cheapestSpell.instanceId);
        }

        // スペルで倒せるか計算
        const effectiveHp = ward.hasBarrier ? ward.currentHealth : ward.currentHealth; // バリア剥がし後のHP
        for (const spell of damageSpells) {
            const spellDamage = getSpellDirectDamage(spell.id);
            if (spellDamage >= effectiveHp && spell.cost <= remainingPp) {
                plans.push({
                    action: {
                        type: 'USE_SPELL',
                        cardInstanceId: spell.instanceId,
                        targetInstanceId: ward.instanceId
                    },
                    priority: 150,
                    reason: `スペル「${spell.name}」で守護「${ward.name}」破壊`,
                    expectedOutcome: { cardsRemoved: [ward.instanceId] }
                });
                remainingPp -= spell.cost;
                usedSpells.add(spell.instanceId);
                break;
            }
        }

        // === オプション3: 攻撃で守護破壊 ===
        // バリア持ちの場合、2体必要
        if (ward.hasBarrier) {
            const available = normalAttackers.filter(a => !usedAttackers.has(a.instanceId));
            if (available.length >= 2) {
                // 最初の1体でバリア消費
                plans.push({
                    action: {
                        type: 'ATTACK',
                        attackerInstanceId: available[0].instanceId,
                        targetInstanceId: ward.instanceId
                    },
                    priority: 120,
                    reason: `攻撃でバリア消費`,
                    expectedOutcome: {}
                });
                usedAttackers.add(available[0].instanceId);

                // 2体目で破壊（ATKが十分な者を選ぶ）
                const killer = available.slice(1).find(a =>
                    !usedAttackers.has(a.instanceId) && a.currentAttack >= ward.currentHealth
                ) || available[1];

                if (killer && !usedAttackers.has(killer.instanceId)) {
                    plans.push({
                        action: {
                            type: 'ATTACK',
                            attackerInstanceId: killer.instanceId,
                            targetInstanceId: ward.instanceId
                        },
                        priority: 110,
                        reason: `攻撃で守護「${ward.name}」破壊`,
                        expectedOutcome: { cardsRemoved: [ward.instanceId] }
                    });
                    usedAttackers.add(killer.instanceId);
                }
            }
        } else {
            // バリアなし守護: ATKが十分なフォロワーで攻撃
            const killer = normalAttackers.find(a =>
                !usedAttackers.has(a.instanceId) && a.currentAttack >= ward.currentHealth
            );

            if (killer) {
                plans.push({
                    action: {
                        type: 'ATTACK',
                        attackerInstanceId: killer.instanceId,
                        targetInstanceId: ward.instanceId
                    },
                    priority: 100,
                    reason: `攻撃で守護「${ward.name}」破壊`,
                    expectedOutcome: { cardsRemoved: [ward.instanceId] }
                });
                usedAttackers.add(killer.instanceId);
            } else {
                // ATKが足りない場合、必殺で処理
                const availableBane = baneAttackers.find(b => !usedAttackers.has(b.instanceId));
                if (availableBane) {
                    plans.push({
                        action: {
                            type: 'ATTACK',
                            attackerInstanceId: availableBane.instanceId,
                            targetInstanceId: ward.instanceId
                        },
                        priority: 90,
                        reason: `必殺で守護「${ward.name}」破壊`,
                        expectedOutcome: { cardsRemoved: [ward.instanceId] }
                    });
                    usedAttackers.add(availableBane.instanceId);
                }
            }
        }
    }

    return plans;
}

/**
 * リーサル判定を統合
 * - 守護の有無を確認
 * - 守護突破手段を列挙
 * - 総ダメージを計算
 * - リーサル可能なアクション順序を返す
 *
 * @param state - シミュレーション状態
 * @returns リーサル情報
 */
export function calculateLethalPotential(state: SimulatedGameState): LethalInfo {
    const lethalInfo = createEmptyLethalInfo();

    // 1. 守護の有無を確認
    const wards = state.playerBoard.filter(c =>
        c.passiveAbilities.includes('WARD') &&
        !c.passiveAbilities.includes('STEALTH')
    );
    lethalInfo.wardsToRemove = [...wards];

    // 2. 盤面からのダメージを計算
    const boardDamage = calculateBoardDamage(state);
    lethalInfo.damageBreakdown.boardDamage = boardDamage;

    // 4. 疾走フォロワーからのダメージを分けて計算
    let stormDamage = 0;
    for (const card of state.aiBoard) {
        if (card.passiveAbilities.includes('STORM') && card.canAttack) {
            const maxAttacks = card.passiveAbilities.includes('DOUBLE_ATTACK') ? 2 : 1;
            const attacksRemaining = Math.max(0, maxAttacks - (card.attacksMade || 0));
            stormDamage += card.currentAttack * attacksRemaining;
        }
    }
    lethalInfo.damageBreakdown.stormDamage = stormDamage;

    // 5. 守護がいる場合、守護突破手段を列挙
    let wardRemovalPlans: ActionPlan[] = [];
    let attackersUsedForWards = 0;
    let damageUsedForWards = 0;
    let ppUsedForWards = 0;
    const usedSpellIdsForWards = new Set<string>();

    if (wards.length > 0) {
        wardRemovalPlans = findWardRemovalOptions(state);

        // 守護処理に使用するリソースを計算
        for (const plan of wardRemovalPlans) {
            const action = plan.action;
            if (action.type === 'ATTACK') {
                attackersUsedForWards++;
                const attackerCard = state.aiBoard.find(
                    c => c.instanceId === action.attackerInstanceId
                );
                if (attackerCard) {
                    // この攻撃アクション1回分は顔面に行かない
                    damageUsedForWards += attackerCard.currentAttack;
                }
            } else if (action.type === 'USE_SPELL') {
                const spellCard = state.aiHand.find(c => c.instanceId === action.cardInstanceId);
                if (spellCard) {
                    ppUsedForWards += spellCard.cost;
                    usedSpellIdsForWards.add(spellCard.instanceId);
                }
            }
        }
    }

    // 3. 手札スペルからのダメージを計算（守護突破で使用済みのPP/スペルを除外）
    const remainingPpForFace = Math.max(0, state.aiPp - ppUsedForWards);
    const spellDamage = calculateSpellDamage(state, remainingPpForFace, usedSpellIdsForWards);
    lethalInfo.damageBreakdown.spellDamage = spellDamage;

    // 6. 顔面に行けるダメージを計算
    const effectiveBoardDamage = Math.max(0, boardDamage - damageUsedForWards);
    const totalDamage = effectiveBoardDamage + spellDamage;
    lethalInfo.totalDamage = totalDamage;

    // 7. リーサル判定
    if (totalDamage >= state.playerHp) {
        lethalInfo.canLethal = true;

        // 8. アクション順序を構築
        // 8.1 守護突破アクション（優先度順）
        wardRemovalPlans.sort((a, b) => b.priority - a.priority);
        for (const plan of wardRemovalPlans) {
            lethalInfo.requiredActions.push(plan);
        }

        // 8.2 残りの攻撃者でリーダー攻撃
        const usedAttackerIds = new Set(
            wardRemovalPlans
                .filter(p => p.action.type === 'ATTACK')
                .map(p => (p.action as { attackerInstanceId: string }).attackerInstanceId)
        );

        for (const card of state.aiBoard) {
            if (usedAttackerIds.has(card.instanceId)) continue;
            if (!card.canAttack) continue;

            const maxAttacks = card.passiveAbilities.includes('DOUBLE_ATTACK') ? 2 : 1;
            const attacksRemaining = Math.max(0, maxAttacks - (card.attacksMade || 0));
            for (let i = 0; i < attacksRemaining; i++) {
                lethalInfo.requiredActions.push({
                    action: {
                        type: 'ATTACK',
                        attackerInstanceId: card.instanceId,
                        targetInstanceId: 'LEADER'
                    },
                    priority: 50,
                    reason: `リーダー攻撃（${card.name}: ${card.currentAttack}ダメージ）`,
                    expectedOutcome: {
                        damageToPlayer: card.currentAttack,
                        lethalAchieved: true
                    }
                });
            }
        }

        // 8.3 リーダーダメージスペル
        let remainingPpForSpellActions = remainingPpForFace;
        for (const spell of state.aiHand) {
            if (spell.type !== 'SPELL') continue;
            if (usedSpellIdsForWards.has(spell.instanceId)) continue;
            const cardDef = MOCK_CARDS.find(c => c.id === spell.id);
            const fanfareTrigger = cardDef?.triggers?.find(t => t.trigger === 'FANFARE');
            const leaderDamageEffect = fanfareTrigger?.effects.find(e => e.type === 'DAMAGE_LEADER');

            if (leaderDamageEffect && leaderDamageEffect.value && spell.cost <= remainingPpForSpellActions) {
                lethalInfo.requiredActions.push({
                    action: {
                        type: 'USE_SPELL',
                        cardInstanceId: spell.instanceId
                    },
                    priority: 60,
                    reason: `リーダーダメージスペル（${spell.name}: ${leaderDamageEffect.value}ダメージ）`,
                    expectedOutcome: {
                        damageToPlayer: leaderDamageEffect.value,
                        lethalAchieved: true
                    }
                });
                remainingPpForSpellActions -= spell.cost;
            }
        }
    }

    // 9. リソース使用量を計算
    let ppUsed = 0;
    let epUsed = 0;
    let sepUsed = 0;

    for (const plan of lethalInfo.requiredActions) {
        const action = plan.action;
        if (action.type === 'USE_SPELL') {
            const spell = state.aiHand.find(c => c.instanceId === action.cardInstanceId);
            if (spell) ppUsed += spell.cost;
        } else if (action.type === 'EVOLVE') {
            if (action.useSuperEvolve) {
                sepUsed++;
            } else {
                epUsed++;
            }
        }
    }

    lethalInfo.resourceUsage = {
        ppUsed,
        epUsed,
        sepUsed,
        necromanceUsed: 0 // v1では未対応
    };

    return lethalInfo;
}

// ============================================================================
// Phase 3: シミュレーション関数（コア）
// ============================================================================

/** 盤面の最大サイズ */
const MAX_BOARD_SIZE = 5;

/**
 * 指定されたinstanceIdを持つカードを手札から検索
 *
 * @param state - シミュレーション状態
 * @param instanceId - カードのインスタンスID
 * @returns カードまたはundefined
 */
function findCardInHand(state: SimulatedGameState, instanceId: string): SimulatedCard | undefined {
    return state.aiHand.find(c => c.instanceId === instanceId);
}

/**
 * 指定されたinstanceIdを持つカードを盤面から検索
 *
 * @param state - シミュレーション状態
 * @param instanceId - カードのインスタンスID
 * @returns カードまたはundefined
 */
function findCardOnBoard(state: SimulatedGameState, instanceId: string): SimulatedCard | undefined {
    return state.aiBoard.find(c => c.instanceId === instanceId);
}

/**
 * 指定されたinstanceIdを持つカードを相手の盤面から検索
 *
 * @param state - シミュレーション状態
 * @param instanceId - カードのインスタンスID
 * @returns カードまたはundefined
 */
function findCardOnPlayerBoard(state: SimulatedGameState, instanceId: string): SimulatedCard | undefined {
    return state.playerBoard.find(c => c.instanceId === instanceId);
}

/**
 * 一意のインスタンスIDを生成（Phase 3用）
 */
function generateSimInstanceId(): string {
    return `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * カードプレイをシミュレーション
 * - PPを減らす
 * - フォロワーなら盤面に追加
 * - ファンファーレ効果を適用（DAMAGE, SUMMON等）
 * - 盤面が満杯（5体）なら失敗
 *
 * @param state - シミュレーション状態
 * @param cardInstanceId - プレイするカードのインスタンスID
 * @param targetInstanceId - ターゲットのインスタンスID（オプション）
 * @returns 新しい状態、または失敗時はnull
 */
export function simulatePlayCard(
    state: SimulatedGameState,
    cardInstanceId: string,
    targetInstanceId?: string
): SimulatedGameState | null {
    const card = findCardInHand(state, cardInstanceId);
    if (!card) {
        console.warn('[AI Lookahead] Card not found in hand:', cardInstanceId);
        return null;
    }

    // PPチェック
    if (card.cost > state.aiPp) {
        console.warn('[AI Lookahead] Not enough PP to play card:', card.name);
        return null;
    }

    // フォロワーの場合、盤面に空きがあるかチェック
    if (card.type === 'FOLLOWER' && state.aiBoard.length >= MAX_BOARD_SIZE) {
        console.warn('[AI Lookahead] Board is full, cannot play follower:', card.name);
        return null;
    }

    // 状態をディープコピー
    const newState = deepCopySimulatedState(state);

    // PPを消費
    newState.aiPp -= card.cost;

    // 手札からカードを除去
    const cardIndex = newState.aiHand.findIndex(c => c.instanceId === cardInstanceId);
    if (cardIndex !== -1) {
        newState.aiHand.splice(cardIndex, 1);
    }

    if (card.type === 'FOLLOWER') {
        // フォロワーを盤面に追加
        const newFollower: SimulatedCard = {
            ...card,
            passiveAbilities: [...card.passiveAbilities],
            canAttack: card.passiveAbilities.includes('STORM'), // 疾走持ちは即座に攻撃可能
            canEvolve: true, // 新しく場に出たフォロワーは進化可能
            hasEvolved: false,
        };
        newState.aiBoard.push(newFollower);

        // ファンファーレ効果を適用
        const cardDef = MOCK_CARDS.find(c => c.id === card.id);
        const fanfareTrigger = cardDef?.triggers?.find(t => t.trigger === 'FANFARE');
        if (fanfareTrigger) {
            applyEffectsToState(newState, fanfareTrigger.effects, targetInstanceId);
        }
    } else {
        // スペルの場合はsimulateSpellEffectに委譲するため、ここでは処理しない
        // （PLAY_CARDはフォロワープレイ専用、スペルはUSE_SPELL）
        console.warn('[AI Lookahead] Spell should use USE_SPELL action, not PLAY_CARD');
        return null;
    }

    return newState;
}

/**
 * 進化/超進化をシミュレーション
 * - EP/SEPを減らす
 * - 進化回数をインクリメント（上限2回チェック）
 * - ステータス上昇（+2/+2）
 * - 進化効果を適用
 * - 超進化なら手札にカードを追加（superEvolveGeneratesCards）
 *
 * @param state - シミュレーション状態
 * @param cardInstanceId - 進化するカードのインスタンスID
 * @param useSuperEvolve - 超進化を使用するか
 * @param targetInstanceId - ターゲットのインスタンスID（オプション）
 * @returns 新しい状態、または失敗時はnull
 */
export function simulateEvolve(
    state: SimulatedGameState,
    cardInstanceId: string,
    useSuperEvolve: boolean,
    targetInstanceId?: string
): SimulatedGameState | null {
    const cardIndex = state.aiBoard.findIndex(c => c.instanceId === cardInstanceId);
    if (cardIndex === -1) {
        console.warn('[AI Lookahead] Card not found on board:', cardInstanceId);
        return null;
    }

    const card = state.aiBoard[cardIndex];

    // 進化済みチェック
    if (card.hasEvolved) {
        console.warn('[AI Lookahead] Card already evolved:', card.name);
        return null;
    }

    // 進化回数上限チェック（2回/ターン）
    if (state.aiEvolveCount >= 2) {
        console.warn('[AI Lookahead] Evolution limit reached');
        return null;
    }
    if (!state.aiCanEvolveThisTurn) {
        console.warn('[AI Lookahead] Evolution already used this turn');
        return null;
    }

    // EP/SEPチェック
    if (useSuperEvolve) {
        if (state.aiSep < 1) {
            console.warn('[AI Lookahead] Not enough SEP for super evolution');
            return null;
        }
    } else {
        if (state.aiEp < 1) {
            console.warn('[AI Lookahead] Not enough EP for evolution');
            return null;
        }
    }

    // 状態をディープコピー
    const newState = deepCopySimulatedState(state);
    const evolvedCard = newState.aiBoard[cardIndex];

    // リソースを消費
    if (useSuperEvolve) {
        newState.aiSep -= 1;
    } else {
        newState.aiEp -= 1;
    }
    newState.aiCanEvolveThisTurn = false;
    newState.aiEvolveCount += 1;

    // ステータス上昇（進化:+2/+2、超進化:+3/+3）
    const statBoost = useSuperEvolve ? 3 : 2;
    evolvedCard.currentAttack += statBoost;
    evolvedCard.currentHealth += statBoost;
    evolvedCard.hasEvolved = true;
    evolvedCard.canAttack = true; // 進化で攻撃可能になる

    // 進化効果を適用
    const effects = useSuperEvolve ? evolvedCard.superEvolveEffects : evolvedCard.evolveEffects;
    if (effects && effects.length > 0) {
        applySimulatedEffectsToState(newState, effects, targetInstanceId);
    }

    // 超進化で手札にカードを追加
    if (useSuperEvolve && evolvedCard.superEvolveGeneratesCards) {
        for (const cardId of evolvedCard.superEvolveGeneratesCards) {
            const generatedCard = createSimulatedCard(cardId, generateSimInstanceId());
            newState.aiHand.push(generatedCard);
        }
    }

    return newState;
}

/**
 * 攻撃をシミュレーション
 * - 攻撃対象が'LEADER'ならリーダーダメージ
 * - フォロワー攻撃なら戦闘解決（resolveCombat使用）
 * - 死亡処理（墓場カウント増加）
 * - 攻撃後はcanAttackをfalseに
 *
 * @param state - シミュレーション状態
 * @param attackerInstanceId - 攻撃者のインスタンスID
 * @param targetInstanceId - ターゲットのインスタンスID（'LEADER'またはフォロワーのinstanceId）
 * @returns 新しい状態、または失敗時はnull
 */
export function simulateAttack(
    state: SimulatedGameState,
    attackerInstanceId: string,
    targetInstanceId: string | 'LEADER'
): SimulatedGameState | null {
    const attackerIndex = state.aiBoard.findIndex(c => c.instanceId === attackerInstanceId);
    if (attackerIndex === -1) {
        console.warn('[AI Lookahead] Attacker not found on board:', attackerInstanceId);
        return null;
    }

    const attacker = state.aiBoard[attackerIndex];

    // 攻撃可能チェック
    if (!attacker.canAttack) {
        console.warn('[AI Lookahead] Attacker cannot attack:', attacker.name);
        return null;
    }
    const attackerIgnoresWard = attacker.passiveAbilities.includes('STEALTH') || attacker.hadStealth;

    // 守護チェック
    const wards = state.playerBoard.filter(c =>
        c.passiveAbilities.includes('WARD') &&
        !c.passiveAbilities.includes('STEALTH')
    );

    // 守護がいる場合、守護以外を攻撃できない
    if (wards.length > 0 && targetInstanceId !== 'LEADER' && !attackerIgnoresWard) {
        const isAttackingWard = wards.some(w => w.instanceId === targetInstanceId);
        if (!isAttackingWard) {
            console.warn('[AI Lookahead] Must attack ward first');
            return null;
        }
    }

    // 守護がいる場合、リーダーを攻撃できない
    if (wards.length > 0 && targetInstanceId === 'LEADER' && !attackerIgnoresWard) {
        console.warn('[AI Lookahead] Cannot attack leader while wards exist');
        return null;
    }

    // 状態をディープコピー
    const newState = deepCopySimulatedState(state);
    const attackerCard = newState.aiBoard[attackerIndex];
    attackerCard.attacksMade = (attackerCard.attacksMade || 0) + 1;

    if (targetInstanceId === 'LEADER') {
        // リーダーへのダメージ（1回分）
        applyDamageToPlayerLeader(newState, attackerCard.currentAttack);
    } else {
        // フォロワーへの攻撃
        const defenderIndex = newState.playerBoard.findIndex(c => c.instanceId === targetInstanceId);
        if (defenderIndex === -1) {
            console.warn('[AI Lookahead] Defender not found on player board:', targetInstanceId);
            return null;
        }

        const defender = newState.playerBoard[defenderIndex];

        // 戦闘解決
        const combatResult = resolveCombat(attackerCard, defender);

        // 死亡処理
        if (combatResult.attackerDestroyed) {
            newState.aiBoard.splice(attackerIndex, 1);
            newState.aiGraveyard += 1; // 墓場カウント増加
        }

        if (combatResult.defenderDestroyed) {
            newState.playerBoard.splice(defenderIndex, 1);
            // 相手の墓場は追跡しない（v1）
        }

    }

    // 攻撃後の攻撃可能状態を更新（DOUBLE_ATTACK対応）
    const survivingAttacker = newState.aiBoard.find(c => c.instanceId === attackerInstanceId);
    if (survivingAttacker) {
        const maxAttacks = survivingAttacker.passiveAbilities.includes('DOUBLE_ATTACK') ? 2 : 1;
        survivingAttacker.canAttack = (survivingAttacker.attacksMade || 0) < maxAttacks;
    }

    return newState;
}

/**
 * スペル効果をシミュレーション
 * - PPを減らす
 * - 手札からスペルを除去
 * - 効果を適用（DAMAGE, AOE_DAMAGE, DESTROY等）
 *
 * @param state - シミュレーション状態
 * @param cardInstanceId - スペルカードのインスタンスID
 * @param targetInstanceId - ターゲットのインスタンスID（オプション）
 * @returns 新しい状態、または失敗時はnull
 */
export function simulateSpellEffect(
    state: SimulatedGameState,
    cardInstanceId: string,
    targetInstanceId?: string
): SimulatedGameState | null {
    const card = findCardInHand(state, cardInstanceId);
    if (!card) {
        console.warn('[AI Lookahead] Spell not found in hand:', cardInstanceId);
        return null;
    }

    if (card.type !== 'SPELL') {
        console.warn('[AI Lookahead] Card is not a spell:', card.name);
        return null;
    }

    // PPチェック
    if (card.cost > state.aiPp) {
        console.warn('[AI Lookahead] Not enough PP to use spell:', card.name);
        return null;
    }

    // 状態をディープコピー
    const newState = deepCopySimulatedState(state);

    // PPを消費
    newState.aiPp -= card.cost;

    // 手札からスペルを除去
    const cardIndex = newState.aiHand.findIndex(c => c.instanceId === cardInstanceId);
    if (cardIndex !== -1) {
        newState.aiHand.splice(cardIndex, 1);
    }

    // スペル効果を適用
    const cardDef = MOCK_CARDS.find(c => c.id === card.id);
    const fanfareTrigger = cardDef?.triggers?.find(t => t.trigger === 'FANFARE');
    if (fanfareTrigger) {
        applyEffectsToState(newState, fanfareTrigger.effects, targetInstanceId);
    }

    return newState;
}

/**
 * ActionTypeに応じて適切なシミュレーション関数を呼び出す統合関数
 * PLAY_CARD, EVOLVE, ATTACK, USE_SPELL, END_TURNを処理
 *
 * @param state - シミュレーション状態
 * @param action - 実行するアクション
 * @returns 新しい状態、または失敗時はnull
 */
export function simulateAction(
    state: SimulatedGameState,
    action: ActionType
): SimulatedGameState | null {
    switch (action.type) {
        case 'PLAY_CARD':
            return simulatePlayCard(state, action.cardInstanceId, action.targetInstanceId);

        case 'EVOLVE':
            return simulateEvolve(state, action.cardInstanceId, action.useSuperEvolve, action.targetInstanceId);

        case 'ATTACK':
            return simulateAttack(state, action.attackerInstanceId, action.targetInstanceId);

        case 'USE_SPELL':
            return simulateSpellEffect(state, action.cardInstanceId, action.targetInstanceId);

        case 'END_TURN':
            // ターン終了は状態を変更しない（探索の終端）
            return deepCopySimulatedState(state);

        default:
            console.warn('[AI Lookahead] Unknown action type:', action);
            return null;
    }
}

/**
 * アクションが実行可能か事前検証
 * PP/EP/SEP、進化回数上限、攻撃可能フォロワー等をチェック
 *
 * @param state - シミュレーション状態
 * @param action - 検証するアクション
 * @returns 実行可能ならtrue
 */
export function canPerformAction(state: SimulatedGameState, action: ActionType): boolean {
    switch (action.type) {
        case 'PLAY_CARD': {
            const card = findCardInHand(state, action.cardInstanceId);
            if (!card) return false;
            if (card.cost > state.aiPp) return false;
            if (card.type === 'FOLLOWER' && state.aiBoard.length >= MAX_BOARD_SIZE) return false;
            return true;
        }

        case 'EVOLVE': {
            const card = findCardOnBoard(state, action.cardInstanceId);
            if (!card) return false;
            if (card.hasEvolved) return false;
            if (state.aiEvolveCount >= 2) return false;
            if (!state.aiCanEvolveThisTurn) return false;
            if (action.useSuperEvolve) {
                return state.aiSep >= 1;
            } else {
                return state.aiEp >= 1;
            }
        }

        case 'ATTACK': {
            const attacker = findCardOnBoard(state, action.attackerInstanceId);
            if (!attacker) return false;
            if (!attacker.canAttack) return false;
            const attackerIgnoresWard = attacker.passiveAbilities.includes('STEALTH') || attacker.hadStealth;

            // 守護チェック
            const wards = state.playerBoard.filter(c =>
                c.passiveAbilities.includes('WARD') &&
                !c.passiveAbilities.includes('STEALTH')
            );

            if (wards.length > 0 && !attackerIgnoresWard) {
                if (action.targetInstanceId === 'LEADER') return false;
                const isAttackingWard = wards.some(w => w.instanceId === action.targetInstanceId);
                if (!isAttackingWard) return false;
            }

            // ターゲット検証（リーダーまたは有効なフォロワー）
            if (action.targetInstanceId !== 'LEADER') {
                const target = findCardOnPlayerBoard(state, action.targetInstanceId);
                if (!target) return false;
                // STEALTHフォロワーは攻撃不可
                if (target.passiveAbilities.includes('STEALTH')) return false;
            }

            return true;
        }

        case 'USE_SPELL': {
            const spell = findCardInHand(state, action.cardInstanceId);
            if (!spell) return false;
            if (spell.type !== 'SPELL') return false;
            if (spell.cost > state.aiPp) return false;
            return true;
        }

        case 'END_TURN':
            return true;

        default:
            return false;
    }
}

// ============================================================================
// Phase 3: 内部ヘルパー関数
// ============================================================================

/**
 * AbilityEffect配列を状態に適用
 * v1ではリーサル計算に必要な効果のみをサポート
 *
 * @param state - シミュレーション状態（ミュータブル）
 * @param effects - 適用する効果配列
 * @param targetInstanceId - ターゲットのインスタンスID（オプション）
 */
function applyEffectsToState(
    state: SimulatedGameState,
    effects: AbilityEffect[],
    targetInstanceId?: string
): void {
    for (const effect of effects) {
        switch (effect.type) {
            case 'DAMAGE':
            case 'SELECT_DAMAGE':
                // 単体ダメージ
                if (targetInstanceId) {
                    const target = state.playerBoard.find(c => c.instanceId === targetInstanceId);
                    if (target && effect.value) {
                        const result = applyDamageToCard(target, effect.value);
                        if (result.destroyed) {
                            const targetIndex = state.playerBoard.findIndex(c => c.instanceId === targetInstanceId);
                            if (targetIndex !== -1) {
                                state.playerBoard.splice(targetIndex, 1);
                            }
                        }
                    }
                }
                break;

            case 'DAMAGE_LEADER':
                // リーダーダメージ
                if (effect.value) {
                    applyDamageToPlayerLeader(state, effect.value);
                }
                break;

            case 'AOE_DAMAGE':
                // 全体ダメージ
                if (effect.value) {
                    const deadIndices: number[] = [];
                    for (let i = 0; i < state.playerBoard.length; i++) {
                        const target = state.playerBoard[i];
                        const result = applyDamageToCard(target, effect.value);
                        if (result.destroyed) {
                            deadIndices.push(i);
                        }
                    }
                    // 逆順で削除（インデックスずれ防止）
                    for (let i = deadIndices.length - 1; i >= 0; i--) {
                        state.playerBoard.splice(deadIndices[i], 1);
                    }
                }
                break;

            case 'DESTROY':
                // 単体破壊
                if (targetInstanceId) {
                    const targetIndex = state.playerBoard.findIndex(c => c.instanceId === targetInstanceId);
                    if (targetIndex !== -1) {
                        state.playerBoard.splice(targetIndex, 1);
                    }
                }
                break;

            case 'HEAL_LEADER':
                // リーダー回復（AIの場合）
                if (effect.value && effect.targetType === 'SELF') {
                    state.aiHp = Math.min(20, state.aiHp + effect.value);
                }
                break;

            case 'SUMMON':
            case 'SUMMON_CARD':
            case 'SUMMON_CARD_RUSH':
            case 'SUMMON_CARD_BUFFED':
                // 召喚
                if (effect.targetCardId && state.aiBoard.length < MAX_BOARD_SIZE) {
                    const summonedCard = createSimulatedCard(effect.targetCardId, generateSimInstanceId());
                    // RUSHの場合は即座に攻撃可能（フォロワーのみ）
                    if (effect.type === 'SUMMON_CARD_RUSH') {
                        summonedCard.canAttack = true;
                    }
                    // BUFFEDの場合はバフ適用
                    if (effect.type === 'SUMMON_CARD_BUFFED' && effect.value && effect.value2) {
                        summonedCard.currentAttack += effect.value;
                        summonedCard.currentHealth += effect.value2;
                    }
                    state.aiBoard.push(summonedCard);
                }
                break;

            case 'GENERATE_CARD':
                // カード生成（手札に追加）
                if (effect.targetCardId) {
                    const generatedCard = createSimulatedCard(effect.targetCardId, generateSimInstanceId());
                    state.aiHand.push(generatedCard);
                }
                break;

            case 'BUFF_STATS':
                // バフ（v1では自分のフォロワーへのバフのみサポート）
                if (effect.value && targetInstanceId) {
                    const target = state.aiBoard.find(c => c.instanceId === targetInstanceId);
                    if (target) {
                        target.currentAttack += effect.value;
                        if (effect.value2) {
                            target.currentHealth += effect.value2;
                        }
                    }
                }
                break;

            case 'DRAW':
                // ドローは手札追加をシミュレーションしない（デッキ情報がないため）
                // v1では無視
                break;

            default:
                // その他の効果はv1では無視
                break;
        }
    }
}

/**
 * SimulatedEffect配列を状態に適用
 * 進化効果などのシミュレーション用効果を適用
 *
 * @param state - シミュレーション状態（ミュータブル）
 * @param effects - 適用するシミュレーション用効果配列
 * @param targetInstanceId - ターゲットのインスタンスID（オプション）
 */
function applySimulatedEffectsToState(
    state: SimulatedGameState,
    effects: SimulatedEffect[],
    targetInstanceId?: string
): void {
    for (const effect of effects) {
        // ネクロマンス条件チェック
        if (effect.necromance && state.aiGraveyard < effect.necromance) {
            continue; // ネクロマンス条件を満たさない場合はスキップ
        }

        switch (effect.type) {
            case 'DAMAGE':
                // 単体ダメージ
                if (targetInstanceId && effect.value) {
                    const target = state.playerBoard.find(c => c.instanceId === targetInstanceId);
                    if (target) {
                        const result = applyDamageToCard(target, effect.value);
                        if (result.destroyed) {
                            const targetIndex = state.playerBoard.findIndex(c => c.instanceId === targetInstanceId);
                            if (targetIndex !== -1) {
                                state.playerBoard.splice(targetIndex, 1);
                            }
                        }
                    }
                }
                break;

            case 'DAMAGE_LEADER':
                if (effect.value) {
                    applyDamageToPlayerLeader(state, effect.value);
                }
                break;

            case 'AOE_DAMAGE':
                // 全体ダメージ
                if (effect.value) {
                    const deadIndices: number[] = [];
                    for (let i = 0; i < state.playerBoard.length; i++) {
                        const target = state.playerBoard[i];
                        const result = applyDamageToCard(target, effect.value);
                        if (result.destroyed) {
                            deadIndices.push(i);
                        }
                    }
                    for (let i = deadIndices.length - 1; i >= 0; i--) {
                        state.playerBoard.splice(deadIndices[i], 1);
                    }
                }
                break;

            case 'DESTROY':
                // 単体破壊
                if (targetInstanceId) {
                    const targetIndex = state.playerBoard.findIndex(c => c.instanceId === targetInstanceId);
                    if (targetIndex !== -1) {
                        state.playerBoard.splice(targetIndex, 1);
                    }
                }
                break;

            case 'HEAL_LEADER':
                // リーダー回復
                if (effect.value) {
                    state.aiHp = Math.min(20, state.aiHp + effect.value);
                }
                break;

            case 'SUMMON':
                // 召喚
                if (effect.targetCardId && state.aiBoard.length < MAX_BOARD_SIZE) {
                    const summonedCard = createSimulatedCard(effect.targetCardId, generateSimInstanceId());
                    state.aiBoard.push(summonedCard);
                }
                break;

            case 'GENERATE_CARD':
                // カード生成
                if (effect.targetCardId) {
                    const generatedCard = createSimulatedCard(effect.targetCardId, generateSimInstanceId());
                    state.aiHand.push(generatedCard);
                }
                break;

            case 'BUFF_STATS':
                // バフ
                if (effect.value && targetInstanceId) {
                    const target = state.aiBoard.find(c => c.instanceId === targetInstanceId);
                    if (target) {
                        target.currentAttack += effect.value;
                        if (effect.value2) {
                            target.currentHealth += effect.value2;
                        }
                    }
                }
                break;
        }

        // ネクロマンス消費
        if (effect.necromance) {
            state.aiGraveyard -= effect.necromance;
        }
    }
}

// ============================================================================
// Phase 4: 探索最適化
// ============================================================================

/** ノード数上限（基本値） */
const BASE_MAX_NODES = 5000;

/** 時間制限（ミリ秒）（基本値） */
const BASE_TIME_LIMIT_MS = 100;

/** 最大深度（基本値） */
const BASE_MAX_DEPTH = 6;

/**
 * 動的探索制限を計算
 * 状況に応じて探索深度/ノード数/時間を調整
 *
 * @param state - シミュレーション状態
 * @returns 探索制限パラメータ
 */
export function calculateDynamicSearchLimits(state: SimulatedGameState): {
    maxNodes: number;
    timeLimitMs: number;
    maxDepth: number;
} {
    // 基本値
    let maxNodes = BASE_MAX_NODES;
    let timeLimitMs = BASE_TIME_LIMIT_MS;
    let maxDepth = BASE_MAX_DEPTH;

    // プレイヤーHPが低い場合（10以下）、探索を深くする
    if (state.playerHp <= 10) {
        maxDepth = Math.min(8, maxDepth + 2);
        maxNodes = Math.floor(maxNodes * 1.5);
        timeLimitMs = Math.floor(timeLimitMs * 1.5);
    }

    // 手札が多い場合（7枚以上）、探索ノード数を増やす
    if (state.aiHand.length >= 7) {
        maxNodes = Math.floor(maxNodes * 1.3);
    }

    // 盤面が複雑な場合（双方合計8体以上）、探索を浅くする（時間節約）
    const totalBoardSize = state.aiBoard.length + state.playerBoard.length;
    if (totalBoardSize >= 8) {
        maxDepth = Math.max(4, maxDepth - 1);
        timeLimitMs = Math.floor(timeLimitMs * 0.9);
    }

    // リソースが豊富な場合（PP 7以上）、探索を深くする
    if (state.aiPp >= 7) {
        maxDepth = Math.min(7, maxDepth + 1);
    }

    return { maxNodes, timeLimitMs, maxDepth };
}

/**
 * 可能なアクションを優先度順に列挙
 * 優先度: 超進化(300) > スペル(250) > 必殺→バリア守護(220) > 通常攻撃(80-100)
 * 
 * 動的優先度調整:
 * - リーサルに近い場合、リーダー攻撃の優先度を上げる
 * - 守護が複数いる場合、守護突破の優先度を上げる
 *
 * @param state - シミュレーション状態
 * @returns 優先度順にソートされたアクション計画配列
 */
export function enumerateActions(state: SimulatedGameState): ActionPlan[] {
    const actions: ActionPlan[] = [];

    // 守護の有無をチェック
    const activeWards = state.playerBoard.filter(c =>
        c.passiveAbilities.includes('WARD') &&
        !c.passiveAbilities.includes('STEALTH')
    );
    const hasWards = activeWards.length > 0;
    const barrierWards = activeWards.filter(c => c.hasBarrier);
    const hasBarrierWards = barrierWards.length > 0;

    // 動的優先度調整: リーサルに近い場合のボーナス
    const isNearLethal = state.playerHp <= 15;
    const lethalBonus = isNearLethal ? 50 : 0;
    
    // 動的優先度調整: 守護が複数いる場合のボーナス
    const wardRemovalBonus = activeWards.length >= 2 ? 30 : 0;

    // === 優先度1: 超進化（カード生成のため） ===
    // 盤面のフォロワーで超進化可能なものを探す
    for (const card of state.aiBoard) {
        if (state.aiCanEvolveThisTurn && card.canEvolve && !card.hasEvolved && state.aiSep >= 1 && state.aiEvolveCount < 2) {
            // 超進化でカードを生成するカードは最優先
            if (card.superEvolveGeneratesCards && card.superEvolveGeneratesCards.length > 0) {
                actions.push({
                    action: {
                        type: 'EVOLVE',
                        cardInstanceId: card.instanceId,
                        useSuperEvolve: true
                    },
                    priority: 300,
                    reason: `超進化でカード生成（${card.name}）`,
                    expectedOutcome: { cardsGained: card.superEvolveGeneratesCards }
                });
            } else {
                // 通常の超進化（ステータス+2/+2、効果発動）
                actions.push({
                    action: {
                        type: 'EVOLVE',
                        cardInstanceId: card.instanceId,
                        useSuperEvolve: true
                    },
                    priority: 280,
                    reason: `超進化（${card.name}）`,
                    expectedOutcome: {}
                });
            }
        }
    }

    // === 優先度2: 通常進化（EPがある場合） ===
    for (const card of state.aiBoard) {
        if (state.aiCanEvolveThisTurn && card.canEvolve && !card.hasEvolved && state.aiEp >= 1 && state.aiEvolveCount < 2) {
            actions.push({
                action: {
                    type: 'EVOLVE',
                    cardInstanceId: card.instanceId,
                    useSuperEvolve: false
                },
                priority: 260,
                reason: `通常進化（${card.name}）`,
                expectedOutcome: {}
            });
        }
    }

    // === 優先度3: 守護突破用スペル ===
    for (const spell of state.aiHand) {
        if (spell.type === 'SPELL' && spell.cost <= state.aiPp) {
            const dmg = getSpellDirectDamage(spell.id);
            const aoeDmg = getSpellAoeDamage(spell.id);

            if (dmg > 0) {
                // 単体ダメージスペル
                if (hasWards) {
                    // 守護がいる場合、守護をターゲット
                    // 動的優先度: 守護が複数いる場合、優先度を上げる
                    for (const ward of activeWards) {
                        actions.push({
                            action: {
                                type: 'USE_SPELL',
                                cardInstanceId: spell.instanceId,
                                targetInstanceId: ward.instanceId
                            },
                            priority: 250 + wardRemovalBonus,
                            reason: `スペル「${spell.name}」で守護「${ward.name}」攻撃`,
                            expectedOutcome: { damageToPlayer: dmg }
                        });
                    }
                } else {
                    // 守護がいない場合、リーダーダメージスペルなら優先
                    const cardDef = MOCK_CARDS.find(c => c.id === spell.id);
                    const fanfareTrigger = cardDef?.triggers?.find(t => t.trigger === 'FANFARE');
                    const hasLeaderDamage = fanfareTrigger?.effects.some(e => e.type === 'DAMAGE_LEADER');

                    if (hasLeaderDamage) {
                        // 動的優先度: リーサルに近い場合、優先度を上げる
                        actions.push({
                            action: {
                                type: 'USE_SPELL',
                                cardInstanceId: spell.instanceId
                            },
                            priority: 200 + lethalBonus,
                            reason: `スペル「${spell.name}」でリーダーダメージ`,
                            expectedOutcome: { damageToPlayer: dmg }
                        });
                    }
                }
            }

            if (aoeDmg > 0 && hasWards) {
                // AOEスペルで守護を処理
                actions.push({
                    action: {
                        type: 'USE_SPELL',
                        cardInstanceId: spell.instanceId
                    },
                    priority: 240,
                    reason: `AOEスペル「${spell.name}」で守護処理`,
                    expectedOutcome: {}
                });
            }
        }
    }

    // === 優先度4: 必殺持ちでバリア守護攻撃 ===
    if (hasBarrierWards) {
        const baneAttackers = state.aiBoard.filter(c =>
            c.canAttack &&
            c.passiveAbilities.includes('BANE')
        );

        for (const bane of baneAttackers) {
            for (const ward of barrierWards) {
                actions.push({
                    action: {
                        type: 'ATTACK',
                        attackerInstanceId: bane.instanceId,
                        targetInstanceId: ward.instanceId
                    },
                    priority: 220,
                    reason: `必殺「${bane.name}」でバリア守護「${ward.name}」貫通`,
                    expectedOutcome: { cardsRemoved: [ward.instanceId] }
                });
            }
        }
    }

    // === 優先度5: 通常攻撃 ===
    const attackers = state.aiBoard.filter(c => c.canAttack);

    for (const attacker of attackers) {
        const attackerIgnoresWard = attacker.passiveAbilities.includes('STEALTH') || attacker.hadStealth;
        // 守護の有無で攻撃対象を決定
        if (hasWards && !attackerIgnoresWard) {
            // 守護がいる場合は守護のみ攻撃可能
            for (const ward of activeWards) {
                // 必殺持ちでバリア守護を攻撃する場合は既に追加済み
                if (attacker.passiveAbilities.includes('BANE') && ward.hasBarrier) {
                    continue;
                }

                actions.push({
                    action: {
                        type: 'ATTACK',
                        attackerInstanceId: attacker.instanceId,
                        targetInstanceId: ward.instanceId
                    },
                    priority: 80,
                    reason: `「${attacker.name}」で守護「${ward.name}」攻撃`,
                    expectedOutcome: {}
                });
            }
        } else {
            // 守護がいない場合はリーダー攻撃が最優先
            // 動的優先度: リーサルに近い場合、優先度を上げる
            const basePriority = 100;
            const dynamicPriority = basePriority + lethalBonus;
            actions.push({
                action: {
                    type: 'ATTACK',
                    attackerInstanceId: attacker.instanceId,
                    targetInstanceId: 'LEADER'
                },
                priority: dynamicPriority,
                reason: `「${attacker.name}」でリーダー攻撃`,
                expectedOutcome: {
                    damageToPlayer: attacker.currentAttack,
                    lethalAchieved: state.playerHp <= attacker.currentAttack
                }
            });

            // フォロワー攻撃は低優先度
            for (const target of state.playerBoard) {
                if (!target.passiveAbilities.includes('STEALTH')) {
                    actions.push({
                        action: {
                            type: 'ATTACK',
                            attackerInstanceId: attacker.instanceId,
                            targetInstanceId: target.instanceId
                        },
                        priority: 30,
                        reason: `「${attacker.name}」でフォロワー「${target.name}」攻撃`,
                        expectedOutcome: {}
                    });
                }
            }
        }
    }

    // === 優先度6: フォロワーカードをプレイ（疾走持ち優先） ===
    for (const card of state.aiHand) {
        if (card.type === 'FOLLOWER' && card.cost <= state.aiPp && state.aiBoard.length < MAX_BOARD_SIZE) {
            const hasStorm = card.passiveAbilities.includes('STORM');
            actions.push({
                action: {
                    type: 'PLAY_CARD',
                    cardInstanceId: card.instanceId
                },
                priority: hasStorm ? 150 : 50, // 疾走持ちは優先
                reason: `フォロワー「${card.name}」をプレイ`,
                expectedOutcome: {}
            });
        }
    }

    // 優先度順にソート（降順）
    return actions.sort((a, b) => b.priority - a.priority);
}

/**
 * 枝刈り判定（強化版）
 * 最大期待ダメージがtargetHpに届かない場合はtrue
 * より厳密な判定を追加
 *
 * @param state - シミュレーション状態
 * @param targetHp - ターゲットのHP（通常はプレイヤーHP）
 * @param currentDepth - 現在の探索深度（オプション）
 * @returns 枝刈りすべきならtrue
 */
export function shouldPrune(state: SimulatedGameState, targetHp: number, currentDepth: number = 0): boolean {
    // 最大期待ダメージを計算
    const maxDamage = calculateMaxPossibleDamage(state);

    // リーサルに届かない場合は枝刈り
    if (maxDamage < targetHp) {
        return true;
    }

    // 強化: 深度が深い場合、より厳密に判定
    // 深度3以上で、ダメージがHP+2未満の場合は枝刈り（余裕がない）
    if (currentDepth >= 3 && maxDamage < targetHp + 2) {
        return true;
    }

    // 強化: リソースが不足している場合（PP 2以下、EP/SEP 0）、
    // かつダメージがHP+1未満の場合は枝刈り
    if (state.aiPp <= 2 && state.aiEp === 0 && state.aiSep === 0 && maxDamage < targetHp + 1) {
        return true;
    }

    return false;
}

/**
 * 最大期待ダメージを計算
 * 盤面フォロワーの攻撃力（進化ボーナス込み）+ 手札スペルのダメージ
 *
 * @param state - シミュレーション状態
 * @returns 最大期待ダメージ
 */
export function calculateMaxPossibleDamage(state: SimulatedGameState): number {
    let damage = 0;

    // 盤面フォロワーの攻撃力合計（進化ボーナス込み）
    for (const card of state.aiBoard) {
        if (!card.canAttack) continue;

        const maxAttacks = card.passiveAbilities.includes('DOUBLE_ATTACK') ? 2 : 1;
        const attacksRemaining = Math.max(0, maxAttacks - (card.attacksMade || 0));
        if (attacksRemaining <= 0) continue;

        // 基本攻撃力
        let attackPower = card.currentAttack;

        // 進化ボーナス（未進化で進化可能な場合）
        if (state.aiCanEvolveThisTurn && card.canEvolve && !card.hasEvolved) {
            if (state.aiSep > 0) {
                attackPower += 3;
            } else if (state.aiEp > 0) {
                attackPower += 2;
            }
        }

        damage += attackPower * attacksRemaining;
    }

    // 手札スペルのダメージ合計（PPが払えるもの）
    let remainingPp = state.aiPp;
    const spells = state.aiHand
        .filter(c => c.type === 'SPELL')
        .sort((a, b) => {
            // コスト効率（ダメージ/コスト）が高い順
            const dmgA = getSpellDirectDamage(a.id);
            const dmgB = getSpellDirectDamage(b.id);
            return (dmgB / (b.cost || 1)) - (dmgA / (a.cost || 1));
        });

    for (const spell of spells) {
        if (spell.cost <= remainingPp) {
            const dmg = getSpellDirectDamage(spell.id);
            // リーダーに打てるダメージスペルを探す
            const cardDef = MOCK_CARDS.find(c => c.id === spell.id);
            const fanfareTrigger = cardDef?.triggers?.find(t => t.trigger === 'FANFARE');
            const hasLeaderDamage = fanfareTrigger?.effects.some(e => e.type === 'DAMAGE_LEADER');

            if (hasLeaderDamage && dmg > 0) {
                damage += dmg;
                remainingPp -= spell.cost;
            }
        }
    }

    // 手札の疾走フォロワー（出せるもの）
    for (const card of state.aiHand) {
        if (card.type === 'FOLLOWER' &&
            card.cost <= remainingPp &&
            card.passiveAbilities.includes('STORM') &&
            state.aiBoard.length < MAX_BOARD_SIZE) {
            const attacks = card.passiveAbilities.includes('DOUBLE_ATTACK') ? 2 : 1;
            damage += card.currentAttack * attacks;
            remainingPp -= card.cost;
        }
    }

    return damage;
}

/**
 * DFS探索でリーサルパスを探す
 * - 動的探索制限（状況に応じて調整）
 * - 状態ハッシュで重複排除
 * - 早期終了の強化（最善パスが見つかった場合）
 *
 * @param state - 現在のシミュレーション状態
 * @param searchState - 探索状態（深度、訪問済み状態など）
 * @param currentPath - 現在までのアクション列
 * @param startTime - 探索開始時刻（ミリ秒）
 * @param maxNodes - ノード数上限（動的計算される）
 * @param timeLimitMs - 時間制限（ミリ秒、動的計算される）
 * @returns リーサルパス（見つからない場合はnull）
 */
export function findLethalPath(
    state: SimulatedGameState,
    searchState: SearchState,
    currentPath: ActionPlan[],
    startTime: number,
    maxNodes: number = BASE_MAX_NODES,
    timeLimitMs: number = BASE_TIME_LIMIT_MS
): ActionPlan[] | null {
    // 終了条件: リーサル達成
    if (state.playerHp <= 0) {
        console.log(`[AI Lookahead] Lethal found! Path length: ${currentPath.length}, Nodes: ${searchState.nodeCount}`);
        return currentPath;
    }

    // 早期終了: 最善パスが見つかっていて、現在のパスがそれより長い場合は枝刈り
    if (searchState.bestLethalPath && currentPath.length >= searchState.bestLethalPath.length) {
        return null;
    }

    // 終了条件: 探索深度上限
    if (searchState.depth >= searchState.maxDepth) {
        return null;
    }

    // 終了条件: ノード数上限（動的）
    if (searchState.nodeCount >= maxNodes) {
        console.log(`[AI Lookahead] Node limit reached (${maxNodes})`);
        return null;
    }

    // 終了条件: 時間制限（動的）
    if (Date.now() - startTime > timeLimitMs) {
        console.log(`[AI Lookahead] Time limit reached (${timeLimitMs}ms)`);
        return null;
    }

    // 枝刈り: 最大期待ダメージがHPに届かない（強化版）
    if (shouldPrune(state, state.playerHp, searchState.depth)) {
        return null;
    }

    // 状態ハッシュで重複排除
    const stateHash = computeStateHash(state);
    if (searchState.visitedStates.has(stateHash)) {
        return null;
    }
    searchState.visitedStates.add(stateHash);
    searchState.nodeCount++;

    // 可能なアクションを列挙（優先度順）
    const actions = enumerateActions(state);

    for (const actionPlan of actions) {
        // アクションが実行可能かチェック
        if (!canPerformAction(state, actionPlan.action)) {
            continue;
        }

        // アクションをシミュレーション
        const newState = simulateAction(state, actionPlan.action);
        if (!newState) {
            continue;
        }

        const newPath = [...currentPath, actionPlan];

        // 再帰的に探索（動的制限を引き継ぐ）
        const result = findLethalPath(
            newState,
            {
                ...searchState,
                depth: searchState.depth + 1,
                // visitedStatesとnodeCountは共有（参照渡し）
            },
            newPath,
            startTime,
            maxNodes,
            timeLimitMs
        );

        if (result) {
            // 最善パスを更新
            if (!searchState.bestLethalPath || result.length < searchState.bestLethalPath.length) {
                searchState.bestLethalPath = result;
            }
            return result;
        }
    }

    return null;
}

// ============================================================================
// Phase 5: 行動計画と統合
// ============================================================================

/**
 * 最適な行動順序を計画
 * リーサル可能なら計画を返す、不可なら空配列
 *
 * @param state - シミュレーション状態
 * @returns 最適なアクション計画配列（リーサル不可時は空配列）
 */
export function planOptimalSequence(state: SimulatedGameState): ActionPlan[] {
    console.log('[AI Lookahead] planOptimalSequence: Starting lethal search...');
    console.log(`[AI Lookahead] Player HP: ${state.playerHp}, AI Board: ${state.aiBoard.length}, AI Hand: ${state.aiHand.length}`);

    // 動的探索制限を計算
    const limits = calculateDynamicSearchLimits(state);
    console.log(`[AI Lookahead] Dynamic limits: maxDepth=${limits.maxDepth}, maxNodes=${limits.maxNodes}, timeLimit=${limits.timeLimitMs}ms`);

    // 探索状態を初期化（動的深度を使用）
    const searchState = createSearchState(limits.maxDepth);
    const startTime = Date.now();

    // DFS探索でリーサルパスを探す（動的制限を使用）
    const lethalPath = findLethalPath(state, searchState, [], startTime, limits.maxNodes, limits.timeLimitMs);

    const elapsed = Date.now() - startTime;
    console.log(`[AI Lookahead] Search completed. Nodes: ${searchState.nodeCount}, Time: ${elapsed}ms`);

    if (lethalPath && lethalPath.length > 0) {
        console.log(`[AI Lookahead] Lethal path found! Actions: ${lethalPath.length}`);
        for (const plan of lethalPath) {
            console.log(`[AI Lookahead]   - ${plan.reason}`);
        }
        return lethalPath;
    }

    console.log('[AI Lookahead] No lethal path found, falling back to existing logic');
    return [];
}

function isLethalPlanExecutable(state: SimulatedGameState, plans: ActionPlan[]): boolean {
    let currentState = deepCopySimulatedState(state);

    for (const plan of plans) {
        if (!canPerformAction(currentState, plan.action)) {
            return false;
        }
        const nextState = simulateAction(currentState, plan.action);
        if (!nextState) {
            return false;
        }
        currentState = nextState;
        if (currentState.playerHp <= 0) {
            return true;
        }
    }

    return currentState.playerHp <= 0;
}

/**
 * 外部から呼び出すエントリーポイント
 * GameStateからSimulatedStateを作成し、リーサル判定を実行
 * 計算量制限（50ms、5000ノード）を適用
 *
 * @param gameState - 現在のゲーム状態
 * @param aiPlayerId - AIのプレイヤーID
 * @param playerPlayerId - 人間プレイヤーのID
 * @returns リーサル情報
 */
export function tryFindLethalWithLookahead(
    gameState: GameState,
    aiPlayerId: string,
    playerPlayerId: string
): LethalInfo {
    console.log('[AI Lookahead] tryFindLethalWithLookahead: Starting...');

    try {
        // GameStateからSimulatedStateを作成
        const simState = createSimulatedState(gameState, aiPlayerId, playerPlayerId);

        // まず簡易版のリーサル計算を試みる
        const quickLethal = calculateLethalPotential(simState);
        console.log(`[AI Lookahead] Quick lethal check: canLethal=${quickLethal.canLethal}, totalDamage=${quickLethal.totalDamage}`);

        // 簡易版リーサルは必ず実行可能性を検証する（誤検知防止）
        if (quickLethal.canLethal) {
            const quickPlanValid = quickLethal.requiredActions.length > 0 &&
                isLethalPlanExecutable(simState, quickLethal.requiredActions);
            if (quickPlanValid) {
                console.log('[AI Lookahead] Quick lethal validated, using simple calculation');
                return quickLethal;
            }
            console.warn('[AI Lookahead] Quick lethal rejected by executable check, running full search');
        }

        // 動的探索制限を計算
        const limits = calculateDynamicSearchLimits(simState);
        console.log(`[AI Lookahead] Dynamic limits: maxDepth=${limits.maxDepth}, maxNodes=${limits.maxNodes}, timeLimit=${limits.timeLimitMs}ms`);

        // 探索状態を初期化（動的深度を使用）
        const searchState = createSearchState(limits.maxDepth);
        const startTime = Date.now();

        // DFS探索でリーサルパスを探す（動的制限を使用）
        const lethalPath = findLethalPath(simState, searchState, [], startTime, limits.maxNodes, limits.timeLimitMs);

        const elapsed = Date.now() - startTime;
        console.log(`[AI Lookahead] Full search completed. Nodes: ${searchState.nodeCount}, Time: ${elapsed}ms`);

        if (lethalPath && lethalPath.length > 0) {
            // リーサルパスが見つかった場合、LethalInfoを構築
            const lethalInfo = createEmptyLethalInfo();
            lethalInfo.canLethal = true;
            lethalInfo.requiredActions = lethalPath;

            // 総ダメージを計算
            let totalDamage = 0;
            for (const plan of lethalPath) {
                if (plan.expectedOutcome.damageToPlayer) {
                    totalDamage += plan.expectedOutcome.damageToPlayer;
                }
            }
            lethalInfo.totalDamage = totalDamage;

            // ダメージ内訳を設定
            lethalInfo.damageBreakdown = {
                boardDamage: calculateBoardDamage(simState, false),
                spellDamage: calculateSpellDamage(simState),
                evolveDamage: 0, // 探索結果から計算するのは複雑なので簡略化
                stormDamage: 0
            };

            // リソース使用量を計算
            let ppUsed = 0;
            let epUsed = 0;
            let sepUsed = 0;

            for (const plan of lethalPath) {
                const action = plan.action;
                if (action.type === 'USE_SPELL' || action.type === 'PLAY_CARD') {
                    const card = simState.aiHand.find(c => c.instanceId === action.cardInstanceId);
                    if (card) ppUsed += card.cost;
                } else if (action.type === 'EVOLVE') {
                    if (action.useSuperEvolve) {
                        sepUsed++;
                    } else {
                        epUsed++;
                    }
                }
            }

            lethalInfo.resourceUsage = {
                ppUsed,
                epUsed,
                sepUsed,
                necromanceUsed: 0
            };

            console.log(`[AI Lookahead] Lethal found via full search! Total damage: ${totalDamage}`);
            return lethalInfo;
        }

        // リーサル不可の場合、誤検知を避けるため非リーサルを返す
        console.log('[AI Lookahead] No lethal found via full search');
        return createEmptyLethalInfo();

    } catch (error) {
        console.error('[AI Lookahead] Error in tryFindLethalWithLookahead:', error);
        // エラー時は空のLethalInfoを返す（既存ロジックにフォールバック）
        return createEmptyLethalInfo();
    }
}
