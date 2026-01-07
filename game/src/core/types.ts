export type ClassType = 'SENKA' | 'AJA' | 'YORUKA';

export type AIDifficulty = 'EASY' | 'NORMAL' | 'HARD';

// Audio settings type (shared across screens)
export interface AudioSettings {
    bgm: number;
    se: number;
    voice: number;
    bgmEnabled: boolean;
    seEnabled: boolean;
}

export type CardType = 'FOLLOWER' | 'SPELL';

// Card Abilities
export type PassiveAbility = 'WARD' | 'STORM' | 'RUSH' | 'BANE' | 'DOUBLE_ATTACK' | 'COST_REDUCTION' | 'STEALTH' | 'IMMUNE_TO_FOLLOWER_DAMAGE' | 'IMMUNE_TO_DAMAGE_MY_TURN' | 'BARRIER' | 'AURA' | 'LEADER_DAMAGE_CAP' | 'GUTS_MY_TURN'; // 守護, 疾走, 突進, 必殺, ダブル, 節約, 隠密, 交戦ダメ無効, 自ターン無敵, バリア, オーラ, リーダーダメージ上限, 根性(自ターン)
export type TriggerType = 'FANFARE' | 'LAST_WORD' | 'LASTWORD' | 'EVOLVE' | 'SUPER_EVOLVE' | 'END_OF_TURN' | 'START_OF_TURN'; // ファンファーレ, ラストワード, 進化時, 超進化時, ターン終了時, ターン開始時

export type EffectType =
    | 'DESTROY' | 'RANDOM_DESTROY' | 'DESTROY_SELF' | 'DESTROY_AND_STEAL' | 'DESTROY_AND_GENERATE'
    | 'BOUNCE' | 'RANDOM_BOUNCE'
    | 'RETURN_TO_HAND'
    | 'DRAW' | 'ADD_GRAVEYARD'
    | 'SUMMON' | 'SUMMON_CARD' | 'SUMMON_CARD_RUSH' | 'SUMMON_CARD_BUFFED' | 'SUMMON_CARD_FILL_BOARD'
    | 'GRANT_PASSIVE'
    | 'DAMAGE' | 'SELECT_DAMAGE' | 'RANDOM_DAMAGE' | 'AOE_DAMAGE' | 'SELECT_DAMAGE_ALL' | 'DAMAGE_LEADER' | 'RANDOM_DAMAGE_BY_TURN'
    | 'SET_MAX_HP'
    | 'HEAL_LEADER' | 'HEAL_FOLLOWER' | 'BUFF_STATS' | 'GENERATE_CARD' | 'COST_REDUCTION' | 'CUSTOM' | 'RANDOM_SET_HP'
    | 'REDUCE_HAND_COST' | 'GRANT_LEADER_DAMAGE_SHIELD' | 'VISUAL_BUFF_ONLY'; // 追加: 手札コスト減少, リーダーダメージシールド付与, 視覚エフェクトのみ

export interface AbilityEffect {
    type: EffectType;
    value?: number; // X value (damage, count, etc)
    value2?: number; // Y value (optional second param)
    targetType?: 'SELF' | 'OPPONENT' | 'ALL_FOLLOWERS' | 'ALL_OTHER_FOLLOWERS' | 'RANDOM_FOLLOWER' | 'RANDOM_ENEMY_FOLLOWER' | 'SELECT_FOLLOWER' | 'SELECT_ALLY_FOLLOWER' | 'SELECT_OTHER_ALLY_FOLLOWER'; // More specific usage
    targetPassive?: PassiveAbility; // For GRANT_PASSIVE
    targetCardId?: string; // For SUMMON
    conditions?: { [key: string]: any }; // Flexible conditions
    necromance?: number; // ネクロマンス: 墓地のカードを消費して発動（指定数以上必要）
}

export interface TriggerDefinition {
    trigger: TriggerType;
    effects: AbilityEffect[]; // Ordered list of effects
}

export interface Card {
    id: string;
    name: string;
    cost: number;
    baseCost?: number; // Original cost for recalculation
    type: CardType;
    attack?: number; // For followers
    health?: number; // For followers
    description: string;
    attackEffectType?: 'SLASH' | 'FIREBALL' | 'LIGHTNING' | 'IMPACT' | 'SHOT' | 'SUMI' | 'WATER' | 'RAY' | 'ICE' | 'THUNDER' | 'FIRE' | 'BLUE_FIRE';
    tags?: string[]; // e.g. 'Knuckler'

    // New ability system
    passiveAbilities?: PassiveAbility[];
    triggers?: TriggerDefinition[]; // List of triggers with composed effects

    // Legacy support (to be migrated)
    effectId?: string;
    triggerAbilities?: { [key: string]: AbilityEffect };

    imageUrl?: string;
    evolvedImageUrl?: string; // 進化後の画像URL
    flavorText?: string; // フレーバーテキスト（カードの世界観説明）
    relatedCards?: string[]; // ギャラリー用：このカードが召喚/生成するカードのID配列

    // Instance ID for cards in hand/deck (runtime)
    instanceId?: string;
}

export interface BoardCard extends Card {
    instanceId: string;
    currentAttack: number;
    currentHealth: number;
    maxHealth: number;
    canAttack: boolean;
    attacksMade: number; // Track for double attack
    hasEvolved?: boolean; // Track evolution state
    turnPlayed: number; // For Rush turn restriction
    hasBarrier?: boolean; // Barrier state (Damage 0 once)
    baseAttack?: number; // Original attack before buffs
    baseHealth?: number; // Original health before buffs
    hadStealth?: boolean; // Had Stealth when played (for Ward ignore after Stealth is removed)
}

export interface Player {
    id: string;
    name: string;
    class: ClassType;
    hp: number;
    maxHp: number;
    pp: number;
    maxPp: number;
    sep: number; // Super Evolution Points
    deck: Card[];
    hand: Card[];
    graveyard: Card[];
    board: (BoardCard | null)[]; // Max 5 slots

    // Evolution tracking
    evolutionsUsed: number; // Number of evolutions used (max 2)
    canEvolveThisTurn: boolean; // Can only evolve once per turn

    // Extra PP (後攻救済システム)
    // 後攻のみ使用可能: 1~5ターン目に1回、6ターン目以降に1回、計2回まで
    extraPpUsedEarly: boolean;  // 1~5ターン目で使用済みか
    extraPpUsedLate: boolean;   // 6ターン目以降で使用済みか
    extraPpActive: boolean;     // 現在のターンでエクストラPPを有効化しているか

    // Leader damage shield (次にリーダーが受けるダメージを0にする)
    leaderDamageShield?: boolean;
}

export type GamePhase = 'INIT' | 'MULLIGAN' | 'TURN_START' | 'MAIN' | 'COMBAT' | 'TURN_END' | 'GAME_OVER';

export interface GameState {
    phase: GamePhase;
    turnCount: number;
    activePlayerId: string;
    players: { [id: string]: Player };
    winnerId?: string;
    logs: string[];
    rngSeed: number;
    firstPlayerId: string;
    lastHash?: string;
    pendingEffects: {
        sourceCard: Card | BoardCard;
        effect: AbilityEffect;
        targetId?: string;
        targetIds?: string[]; // Multiple targets
        sourcePlayerId: string;
    }[];
}

export type GameAction =
    | { type: 'START_GAME' }
    | { type: 'PLAY_CARD'; playerId: string; payload: { cardIndex: number; targetId?: string; instanceId?: string } }
    | { type: 'ATTACK'; playerId: string; payload: { attackerIndex: number; targetIndex: number; targetIsLeader: boolean } }
    | { type: 'EVOLVE'; playerId: string; payload: { followerIndex: number; targetId?: string; useSep?: boolean } }
    | { type: 'RESOLVE_EFFECT'; playerId: string; payload: { targetId?: string } }
    | { type: 'END_TURN'; playerId: string }
    | { type: 'CONCEDE'; playerId: string }
    | { type: 'SYNC_STATE'; payload: GameState }
    | { type: 'REINIT_GAME'; payload: { p1Class: ClassType; p2Class: ClassType } }
    | { type: 'TOGGLE_EXTRA_PP'; playerId: string } // エクストラPPの有効化/無効化
    | { type: 'UPDATE_PLAYER_NAME'; payload: { playerId: string; name: string } } // プレイヤー名の更新
    | { type: 'SET_FIRST_PLAYER_ID'; payload: { firstPlayerId: string } }; // 先攻プレイヤーIDの設定

// ===== スタンプ機能 =====

// スタンプID (1-8)
export type StampId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// スタンプ定義
export interface StampDefinition {
    id: StampId;
    filename: string;
    label: string;
    se: string; // SEファイル名
}

// スタンプ表示状態
export interface StampDisplay {
    stampId: StampId;
    playerId: string;
    playerClass: ClassType;
    timestamp: number;
}
