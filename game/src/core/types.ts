export type ClassType = 'SENKA' | 'AJA';

export type CardType = 'FOLLOWER' | 'SPELL';

// Card Abilities
export type PassiveAbility = 'WARD' | 'STORM' | 'RUSH' | 'BANE' | 'DOUBLE_ATTACK' | 'COST_REDUCTION' | 'STEALTH' | 'IMMUNE_TO_FOLLOWER_DAMAGE' | 'IMMUNE_TO_DAMAGE_MY_TURN' | 'BARRIER' | 'AURA'; // 守護, 疾走, 突進, 必殺, ダブル, 節約, 隠密, 交戦ダメ無効, 自ターン無敵, バリア, オーラ
export type TriggerType = 'FANFARE' | 'LAST_WORD' | 'EVOLVE' | 'SUPER_EVOLVE' | 'END_OF_TURN' | 'START_OF_TURN'; // ファンファーレ, ラストワード, 進化時, 超進化時, ターン終了時, ターン開始時

export type EffectType =
    | 'DESTROY' | 'RANDOM_DESTROY' | 'DESTROY_SELF'
    | 'BOUNCE' | 'RANDOM_BOUNCE'
    | 'RETURN_TO_HAND'
    | 'DRAW'
    | 'SUMMON' | 'SUMMON_CARD'
    | 'GRANT_PASSIVE'
    | 'DAMAGE' | 'SELECT_DAMAGE' | 'RANDOM_DAMAGE' | 'AOE_DAMAGE' | 'SELECT_DAMAGE_ALL' | 'DAMAGE_LEADER'
    | 'SET_MAX_HP'
    | 'HEAL_LEADER' | 'HEAL_FOLLOWER' | 'BUFF_STATS' | 'GENERATE_CARD' | 'COST_REDUCTION' | 'CUSTOM' | 'RANDOM_SET_HP'; // Keep legacy for compatibility for now

export interface AbilityEffect {
    type: EffectType;
    value?: number; // X value (damage, count, etc)
    value2?: number; // Y value (optional second param)
    targetType?: 'SELF' | 'OPPONENT' | 'ALL_FOLLOWERS' | 'ALL_OTHER_FOLLOWERS' | 'RANDOM_FOLLOWER' | 'SELECT_FOLLOWER'; // More specific usage
    targetPassive?: PassiveAbility; // For GRANT_PASSIVE
    targetCardId?: string; // For SUMMON
    conditions?: { [key: string]: any }; // Flexible conditions
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
    attackEffectType?: 'SLASH' | 'FIREBALL' | 'LIGHTNING' | 'IMPACT' | 'SHOT' | 'SUMI' | 'WATER' | 'RAY' | 'ICE' | 'THUNDER';
    tags?: string[]; // e.g. 'Knuckler'

    // New ability system
    passiveAbilities?: PassiveAbility[];
    triggers?: TriggerDefinition[]; // List of triggers with composed effects

    // Legacy support (to be migrated)
    effectId?: string;
    triggerAbilities?: { [key: string]: AbilityEffect };

    imageUrl?: string;
    evolvedImageUrl?: string; // 進化後の画像URL
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
    lastHash?: string;
    pendingEffects: {
        sourceCard: Card | BoardCard;
        effect: AbilityEffect;
        targetId?: string;
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
    | { type: 'REINIT_GAME'; payload: { p1Class: ClassType; p2Class: ClassType } };
