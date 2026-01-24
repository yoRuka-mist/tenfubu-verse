# AI先読み機能（Lookahead System）設計書

## 0. 設計変更履歴

### 2026-01-24: 初版 → v2（トリプルレビュー対応）
**変更前**: 抽象的な設計のみ
**変更後**: 具体的な仕様を追加（Ward/バリア処理、コスト管理、探索戦略、評価関数）
**変更理由**: Codex/GLM-4.7からのブロッキング指摘（6件）への対応

---

## 1. 概要

### 1.1 現状の問題
現在のAIは「現在の盤面状態」のみを見て判断しており、以下の問題がある：

1. **超進化で得られるカードが計算されない**
   - 盞華超進化 → 0コストスペル3枚が手札に加わる
   - これらを使って守護を突破→リーサルできる状況を見逃す

2. **リーサル計算が不完全**
   - `calculatePotentialDamage`は盤面の攻撃力のみ
   - 手札のダメージスペルが含まれていない
   - 進化による攻撃力上昇が含まれていない

3. **行動順序の最適化ができない**
   - 「超進化→スペル使用→攻撃」という順序計画がない

### 1.2 解決方針
「仮想的にアクションをシミュレーションする」レイヤーを追加し、最適な行動順序を計画する。

### 1.3 スコープ制限（v1）
初期実装では以下に限定し、段階的に拡張する：
- **対応範囲**: リーサル計算のみ（盤面制圧は既存ロジック）
- **探索深度**: 最大6アクション（1ターン内）
- **対応効果**: DAMAGE, AOE_DAMAGE, DESTROY, GENERATE_CARD, SUMMON
- **除外**: 複数ターン先読み、相手の行動予測
- **除外（v1）**: ラストワード（死亡時効果）は考慮しない（単純消滅扱い）
- **除外（v1）**: PP回復・コスト軽減効果は考慮しない

### 1.4 計算量制限（パフォーマンス保証）
ブラウザのメインスレッドをブロックしないため、以下の制限を設ける：
- **ノード数上限**: 5000ノード（超過で探索打ち切り）
- **時間制限**: 50ms（超過で現状最善手を返す）
- **フォールバック**: 制限超過時は既存ロジックを使用

---

## 2. 設計

### 2.1 アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│                    AI Turn Manager                       │
├─────────────────────────────────────────────────────────┤
│  1. 現在の状態を取得                                      │
│  2. ActionPlanner.planTurn() でシミュレーション          │
│  3. 計画に従って実行（1行動ごとに再評価オプション）       │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    ActionPlanner                         │
├─────────────────────────────────────────────────────────┤
│  - simulateAction(state, action) → SimulatedState       │
│  - calculateLethalPotential(state) → LethalInfo         │
│  - planOptimalSequence(state) → ActionPlan[]            │
│  - evaluateBoardState(state) → number                   │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  SimulatedState                          │
├─────────────────────────────────────────────────────────┤
│  - 仮想的な盤面状態（ディープコピー）                    │
│  - 仮想的な手札状態                                      │
│  - PP/EP/SEP の仮想状態                                  │
└─────────────────────────────────────────────────────────┘
```

### 2.2 データ構造

```typescript
// シミュレーション用の軽量な状態
interface SimulatedGameState {
    aiHand: SimulatedCard[];      // 手札（超進化で追加されるカードも含む）
    aiBoard: SimulatedCard[];     // AI盤面（最大5体）
    playerBoard: SimulatedCard[]; // プレイヤー盤面
    playerHp: number;             // プレイヤーHP
    aiHp: number;                 // AI HP
    aiPp: number;                 // 残りPP（消費: カードコスト、回復: なし）
    aiEp: number;                 // 残りEP（消費: 通常進化1、回復: なし）
    aiSep: number;                // 残りSEP（消費: 超進化1、回復: なし）
    aiEvolveCount: number;        // このターンの進化回数（上限: 2回/ターン）
    aiGraveyard: number;          // 墓場カード数（ネクロマンス用）
}

interface SimulatedCard {
    id: string;                   // カード定義ID（例: 'c_senka_knuckler'）
    instanceId: string;           // 一意のインスタンスID（ターゲット指定に使用）
    name: string;
    cost: number;
    type: 'FOLLOWER' | 'SPELL';
    currentAttack: number;
    currentHealth: number;
    canAttack: boolean;           // 攻撃可能か（召喚酔い、疾走考慮）
    canEvolve: boolean;           // 進化可能か（EP/SEP、進化回数考慮）
    hasEvolved: boolean;
    passiveAbilities: string[];   // WARD, STEALTH, BANE, STORM, DOUBLE_ATTACK, AURA
    hasBarrier: boolean;          // バリア状態（1回ダメージ無効）
    hasAura: boolean;             // オーラ状態（対象不可だが攻撃可能）
    // 超進化/進化で何が起こるか
    evolveEffects?: SimulatedEffect[];
    superEvolveEffects?: SimulatedEffect[];
    // 超進化で手札に加わるカード
    superEvolveGeneratesCards?: string[];
    // ネクロマンス条件（条件を満たす場合のみ効果発動）
    necromanceRequired?: number;
}

interface SimulatedEffect {
    type: 'DAMAGE' | 'DESTROY' | 'AOE_DAMAGE' | 'HEAL_LEADER' | 'SUMMON' | 'GENERATE_CARD';
    value?: number;
    targetType?: string;
    targetCardId?: string;
}

// アクションの種類（targetは全てinstanceIdで統一）
type ActionType =
    | { type: 'PLAY_CARD'; cardInstanceId: string; targetInstanceId?: string }
    | { type: 'EVOLVE'; cardInstanceId: string; useSuperEvolve: boolean; targetInstanceId?: string }
    | { type: 'ATTACK'; attackerInstanceId: string; targetInstanceId: string | 'LEADER' }
    | { type: 'USE_SPELL'; cardInstanceId: string; targetInstanceId?: string }
    | { type: 'END_TURN' };

// アクション計画
interface ActionPlan {
    action: ActionType;
    priority: number;
    reason: string;
    expectedOutcome: {
        damageToPlayer?: number;
        cardsRemoved?: string[];
        cardsGained?: string[];
        lethalAchieved?: boolean;
    };
}

// リーサル情報
interface LethalInfo {
    canLethal: boolean;
    requiredActions: ActionPlan[];
    totalDamage: number;
    wardsToRemove: SimulatedCard[];
    damageBreakdown: {
        boardDamage: number;      // 盤面フォロワーからのダメージ
        spellDamage: number;      // 手札スペルからのダメージ
        evolveDamage: number;     // 進化効果による直接ダメージ
        stormDamage: number;      // 疾走フォロワーからのダメージ
    };
    resourceUsage: {
        ppUsed: number;
        epUsed: number;
        sepUsed: number;
        necromanceUsed: number;
    };
}

// 探索状態（枝刈り用）
interface SearchState {
    depth: number;                // 現在の探索深度
    maxDepth: number;             // 最大探索深度（6）
    visitedStates: Set<string>;   // 訪問済み状態のハッシュ
    bestLethalPath: ActionPlan[] | null;
    bestLethalDamage: number;
}
```

### 2.3 主要関数

#### 2.3.1 `createSimulatedState(gameState, aiPlayerId, playerPlayerId)`
```typescript
// 現在のゲーム状態から軽量なシミュレーション用状態を作成
function createSimulatedState(
    gameState: any,
    aiPlayerId: string,
    playerPlayerId: string
): SimulatedGameState {
    // ディープコピーして独立した状態を作成
    // 各カードの進化/超進化効果も事前に解析して含める
}
```

#### 2.3.2 `simulateAction(state, action)`
```typescript
// アクションを仮想的に実行し、結果の状態を返す
function simulateAction(
    state: SimulatedGameState,
    action: ActionType
): SimulatedGameState {
    const newState = deepCopy(state);

    switch (action.type) {
        case 'PLAY_CARD':
            // カードプレイのシミュレーション
            // - PPを減らす
            // - フォロワーなら盤面に追加
            // - ファンファーレ効果を適用
            break;

        case 'EVOLVE':
            // 進化のシミュレーション
            // - EP/SEPを減らす
            // - ステータス上昇
            // - 進化効果を適用
            // - 超進化なら手札にカードを追加
            break;

        case 'ATTACK':
            // 攻撃のシミュレーション
            // - ダメージ計算
            // - 死亡処理
            // - バリア/必殺などの特殊効果
            break;
    }

    return newState;
}
```

#### 2.3.3 `calculateLethalPotential(state)`
```typescript
// リーサルの可能性を計算
function calculateLethalPotential(state: SimulatedGameState): LethalInfo {
    // 1. 守護の有無を確認
    const wards = state.playerBoard.filter(c =>
        c.passiveAbilities.includes('WARD') &&
        !c.passiveAbilities.includes('STEALTH')
    );

    // 2. 守護を突破する手段を列挙
    //    - 手札のダメージスペル
    //    - 盤面フォロワーの攻撃
    //    - 進化/超進化の除去効果
    //    - 超進化で得られるスペル（盞華など）

    // 3. 守護突破後の顔面ダメージを計算
    //    - 盤面フォロワーの攻撃力合計
    //    - 進化による攻撃力上昇
    //    - ダブルアタックの考慮

    // 4. リーサル達成可能なアクション順序を返す
}
```

#### 2.3.4 `planOptimalSequence(state)`
```typescript
// 最適な行動順序を計画
function planOptimalSequence(state: SimulatedGameState): ActionPlan[] {
    // 1. リーサル判定
    const lethalInfo = calculateLethalPotential(state);
    if (lethalInfo.canLethal) {
        return lethalInfo.requiredActions;
    }

    // 2. リーサルでない場合は既存ロジックにフォールバック
    //    （v1ではリーサル計算のみ対応）
    return [];
}
```

### 2.4 Ward/バリア/攻撃制限の処理仕様

#### 2.4.1 攻撃対象の決定ルール
```typescript
function getValidAttackTargets(
    attacker: SimulatedCard,
    playerBoard: SimulatedCard[],
    playerHp: number
): Array<{ instanceId: string | 'LEADER'; priority: number }> {
    const targets: Array<{ instanceId: string | 'LEADER'; priority: number }> = [];

    // 1. 守護チェック（STEALTHでない守護のみ）
    const activeWards = playerBoard.filter(c =>
        c.passiveAbilities.includes('WARD') &&
        !c.passiveAbilities.includes('STEALTH')
    );

    // 2. 守護がいる場合は守護のみ攻撃可能
    if (activeWards.length > 0) {
        for (const ward of activeWards) {
            targets.push({ instanceId: ward.instanceId, priority: 100 });
        }
        return targets;
    }

    // 3. 守護がいない場合
    // 3.1 リーダー攻撃可能
    targets.push({ instanceId: 'LEADER', priority: 50 });

    // 3.2 AURA以外のフォロワー攻撃可能（AURAは対象不可だが攻撃はできる）
    for (const card of playerBoard) {
        if (!card.passiveAbilities.includes('STEALTH')) {
            // AURAフォロワーも攻撃対象に含める
            targets.push({ instanceId: card.instanceId, priority: 30 });
        }
    }

    return targets;
}
```

#### 2.4.2 バリアの処理
```typescript
function applyDamageToCard(target: SimulatedCard, damage: number): {
    actualDamage: number;
    barrierConsumed: boolean;
    destroyed: boolean;
} {
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
```

#### 2.4.3 必殺（BANE）の処理
```typescript
function resolveCombat(attacker: SimulatedCard, defender: SimulatedCard): {
    attackerDestroyed: boolean;
    defenderDestroyed: boolean;
} {
    // 必殺持ちはバリアを貫通して即破壊
    const attackerHasBane = attacker.passiveAbilities.includes('BANE');
    const defenderHasBane = defender.passiveAbilities.includes('BANE');

    // ダメージ適用（バリア処理含む）
    const attackerDamageResult = applyDamageToCard(attacker, defender.currentAttack);
    const defenderDamageResult = applyDamageToCard(defender, attacker.currentAttack);

    // 破壊判定（必殺はバリアを貫通する）
    const attackerDestroyed = attackerDamageResult.destroyed || defenderHasBane;
    const defenderDestroyed = defenderDamageResult.destroyed || attackerHasBane;

    return { attackerDestroyed, defenderDestroyed };
}
```

#### 2.4.4 バリアと必殺の相互作用
- **必殺（BANE）はバリアを貫通して即破壊する**
- **バリアはダメージを0にする**（必殺以外の攻撃に対して有効）
- **AOEでもバリアは1回の攻撃につき1消費**
- **STEALTHを持つ守護は攻撃対象にならない**（守護効果が発動しない）

#### 2.4.6 守護突破の最適行動設計

**必殺持ちの優先使用ルール:**
```typescript
function planWardRemoval(
    state: SimulatedGameState,
    wards: SimulatedCard[]
): ActionPlan[] {
    const plans: ActionPlan[] = [];
    const attackers = state.aiBoard.filter(c => c.canAttack);
    const baneAttackers = attackers.filter(c => c.passiveAbilities.includes('BANE'));
    const normalAttackers = attackers.filter(c => !c.passiveAbilities.includes('BANE'));

    for (const ward of wards) {
        if (ward.hasBarrier) {
            // バリア持ち守護 → 必殺持ちを優先使用（1体で突破可能）
            if (baneAttackers.length > 0) {
                const bane = baneAttackers.shift()!;
                plans.push({
                    action: { type: 'ATTACK', attackerInstanceId: bane.instanceId, targetInstanceId: ward.instanceId },
                    priority: 200,
                    reason: 'BANE破壊バリア守護',
                    expectedOutcome: { cardsRemoved: [ward.instanceId] }
                });
            } else {
                // 必殺がいない → 2体必要（1体でバリア消費、1体で破壊）
                if (normalAttackers.length >= 2) {
                    const first = normalAttackers.shift()!;
                    const second = normalAttackers.shift()!;
                    plans.push(
                        { action: { type: 'ATTACK', attackerInstanceId: first.instanceId, targetInstanceId: ward.instanceId },
                          priority: 150, reason: 'バリア消費', expectedOutcome: {} },
                        { action: { type: 'ATTACK', attackerInstanceId: second.instanceId, targetInstanceId: ward.instanceId },
                          priority: 150, reason: '守護破壊', expectedOutcome: { cardsRemoved: [ward.instanceId] } }
                    );
                }
            }
        } else {
            // バリアなし守護 → 攻撃力が足りる攻撃者を選択（必殺は温存）
            const attacker = normalAttackers.find(a => a.currentAttack >= ward.currentHealth)
                || baneAttackers[0]
                || normalAttackers[0];
            if (attacker) {
                const index = normalAttackers.indexOf(attacker);
                if (index >= 0) normalAttackers.splice(index, 1);
                else baneAttackers.shift();
                plans.push({
                    action: { type: 'ATTACK', attackerInstanceId: attacker.instanceId, targetInstanceId: ward.instanceId },
                    priority: 120,
                    reason: '守護破壊',
                    expectedOutcome: { cardsRemoved: [ward.instanceId] }
                });
            }
        }
    }

    return plans;
}
```

**守護突破コスト計算:**
| 守護の状態 | 必殺あり | 必殺なし |
|-----------|---------|---------|
| バリアなし | 1体（任意） | 1体（ATK≥HP） |
| バリアあり | **1体（必殺）** | 2体 |

**刹那の戦略的価値と制約:**
- 刹那（BANE + STORM）はバリア持ち守護を1体で突破可能
- **ただし**、刹那は疾走持ちなので守護処理に使うとリーサルダメージが減る
- 刹那1体 = 1ATK + バフ2 = **3点のリーサル貢献を失う**
- 遙超進化で刹那2体 → 両方リーダーに行けば6点、守護処理で0点

**守護突破の最適化判定（リーサルダメージ最大化）:**

```typescript
function planOptimalWardRemoval(
    state: SimulatedGameState,
    ward: SimulatedCard,
    lethalRequired: number
): ActionPlan[] {
    const plans: ActionPlan[] = [];

    // 遙超進化で得られるリソース
    const harukaOnBoard = state.aiBoard.find(c => c.id === 'c_haruka' && !c.hasEvolved);
    const yukaOnBoard = state.aiBoard.find(c => c.id === 'c_yuka' && c.canAttack); // 悠霞（突進）
    const setsunas = state.aiBoard.filter(c => c.id === 'c_setsuna' && c.canAttack);
    const harukaEvolved = harukaOnBoard && state.aiSep >= 1; // 超進化可能
    const harukaAtk = harukaEvolved ? 5 + 2 : 5; // 超進化後7ATK

    if (ward.hasBarrier) {
        // === ケース1: 悠霞(突進)でバリア剥がし → 遙で処理 ===
        // 条件: 悠霞がいる && 遙ATK >= 守護HP
        if (yukaOnBoard && harukaAtk >= ward.currentHealth) {
            // 刹那を温存してリーダー攻撃に使える
            plans.push(
                { action: { type: 'ATTACK', attackerInstanceId: yukaOnBoard.instanceId, targetInstanceId: ward.instanceId },
                  priority: 250, reason: '悠霞でバリア剥がし', expectedOutcome: {} },
                { action: { type: 'ATTACK', attackerInstanceId: harukaOnBoard!.instanceId, targetInstanceId: ward.instanceId },
                  priority: 240, reason: '遙で守護破壊', expectedOutcome: { cardsRemoved: [ward.instanceId] } }
            );
            return plans; // 最適解
        }

        // === ケース2: 悠霞+遙でも倒せない（HP7以上バリア守護: ヴァルキリー等） ===
        // → 必殺（刹那）で処理が効率的
        if (ward.currentHealth > harukaAtk) {
            const setsuna = setsunas[0];
            if (setsuna) {
                plans.push({
                    action: { type: 'ATTACK', attackerInstanceId: setsuna.instanceId, targetInstanceId: ward.instanceId },
                    priority: 220, reason: '必殺で高HP守護処理（刹那1体消費）',
                    expectedOutcome: { cardsRemoved: [ward.instanceId] }
                });
                return plans;
            }
        }

        // === ケース3: 悠霞がいない場合 ===
        // リーサルダメージへの影響を計算
        const setsunaLethalValue = 3; // 刹那1体 = 3点（1ATK + 遙バフ2）
        const remainingDamageIfUseSetuna = calculateRemainingDamage(state) - setsunaLethalValue;

        if (remainingDamageIfUseSetuna >= lethalRequired) {
            // 刹那を使ってもリーサル可能 → 刹那で処理OK
            const setsuna = setsunas[0];
            if (setsuna) {
                plans.push({
                    action: { type: 'ATTACK', attackerInstanceId: setsuna.instanceId, targetInstanceId: ward.instanceId },
                    priority: 200, reason: '刹那で処理（リーサル余裕あり）',
                    expectedOutcome: { cardsRemoved: [ward.instanceId] }
                });
            }
        } else {
            // リーサルがギリギリ → 他の手段を探す
            // 2体で処理（バリア剥がし + 破壊）
            // ...
        }
    }

    return plans;
}
```

**判断フローチャート（バリア持ち守護の処理）:**
```
バリア持ち守護を発見
    ↓
悠霞（突進）がいる？
    ↓ YES                      ↓ NO
守護HP ≤ 遙ATK(7)?              刹那で処理してもリーサル可能？
    ↓ YES     ↓ NO                ↓ YES        ↓ NO
悠霞→遙で処理  刹那で処理         刹那で処理     2体で処理
（刹那温存）   （高HPバリア守護）   （余裕あり）   or リーサル不可
```

**具体例:**
| 状況 | 最適行動 | 理由 |
|------|---------|------|
| バリア守護HP5、悠霞あり、遙SE可能 | 悠霞→遙 | 刹那2体温存で+6点 |
| バリア守護HP7（ヴァルキリー）、悠霞あり | 刹那で処理 | 遙では倒せない |
| バリア守護HP5、悠霞なし、リーサル余裕あり | 刹那で処理 | 効率的 |
| バリア守護HP5、悠霞なし、リーサルギリギリ | 他2体で処理 | 刹那温存 |
| バリア守護2体、刹那2体 | 刹那2体で処理 | 仕方ない（リーサル再計算） |

#### 2.4.5 passiveAbilitiesの内容
`passiveAbilities`配列には以下の文字列が含まれる：
| 能力 | 説明 |
|------|------|
| STORM | 召喚酔いなし |
| BANE | ダメージを与えれば即破壊 |
| WARD | 守護（優先攻撃対象） |
| STEALTH | 潜伏（対象不可） |
| DOUBLE_ATTACK | 2回攻撃 |
| AURA | オーラ（対象不可だが攻撃可能） |
| DRAIN | ドレイン（リーダー回復、v1では計算のみ） |

### 2.5 盞華超進化の具体的シミュレーション

```typescript
// 盞華を超進化した場合のシミュレーション例
function simulateSenkaSuperEvolve(state: SimulatedGameState, senkaIndex: number): SimulatedGameState {
    const newState = deepCopy(state);
    const senka = newState.aiBoard[senkaIndex];

    // 1. SEPを消費
    newState.aiSep -= 1;

    // 2. ステータス上昇（進化 +2/+2）
    senka.currentAttack += 2;
    senka.currentHealth += 2;
    senka.hasEvolved = true;
    senka.canAttack = true; // 進化で攻撃可能に

    // 3. 超進化効果: 3枚のスペルを手札に追加
    newState.aiHand.push(
        createSimulatedCard('TOKEN_FLICKER_JAB'),    // 2ダメージ
        createSimulatedCard('TOKEN_QUAKE_HOWLING'),  // 全体2ダメージ
        createSimulatedCard('TOKEN_BACKHAND_SMASH')  // 6ダメージ
    );

    return newState;
}

// これにより以下のリーサル判定が可能になる:
// - 守護にバックハンドスマッシュ(6ダメージ)で6HP以下なら破壊可能
// - 盞華(5+2=7攻撃) × ダブルアタック = 14ダメージ
// - 合計で守護突破 + 14点リーサル
```

### 2.6 探索戦略と枝刈り

#### 2.6.1 探索アルゴリズム
**貪欲法 + 深さ優先探索（DFS）** を採用

```typescript
function findLethalPath(
    state: SimulatedGameState,
    searchState: SearchState,
    currentPath: ActionPlan[],
    startTime: number
): ActionPlan[] | null {
    // 終了条件: リーサル達成
    if (state.playerHp <= 0) {
        return currentPath;
    }

    // 終了条件: 探索深度上限
    if (searchState.depth >= searchState.maxDepth) {
        return null;
    }

    // 終了条件: ノード数上限（5000ノード）
    if (searchState.visitedStates.size >= 5000) {
        console.log('[AI Lookahead] Node limit reached');
        return null;
    }

    // 終了条件: 時間制限（50ms）
    if (Date.now() - startTime > 50) {
        console.log('[AI Lookahead] Time limit reached');
        return null;
    }

    // 状態ハッシュで重複排除
    const stateHash = computeStateHash(state);
    if (searchState.visitedStates.has(stateHash)) {
        return null;
    }
    searchState.visitedStates.add(stateHash);

    // 可能なアクションを列挙（優先度順）
    const actions = enumerateActions(state);

    for (const action of actions) {
        const newState = simulateAction(state, action.action);
        const newPath = [...currentPath, action];

        const result = findLethalPath(newState, {
            ...searchState,
            depth: searchState.depth + 1
        }, newPath, startTime);

        if (result) {
            return result;
        }
    }

    return null;
}
```

#### 2.6.2 枝刈り条件（具体例）

| 条件 | 説明 | 効果 |
|------|------|------|
| 期待ダメージ不足 | 残りアクションで最大ダメージを出してもリーサルに届かない | 早期終了 |
| リソース不足 | PP/EP/SEPが0で追加アクション不可 | 枝を刈る |
| 攻撃可能フォロワー0 | 攻撃できるフォロワーがいない | 攻撃アクションを除外 |
| 守護未突破 | 守護がいるのにリーダー攻撃を試行 | 無効なアクション |
| 重複状態 | 同じ盤面状態に到達済み | 既訪問スキップ |

```typescript
function shouldPrune(state: SimulatedGameState, targetHp: number): boolean {
    // 最大期待ダメージを計算
    const maxPossibleDamage = calculateMaxPossibleDamage(state);

    // リーサルに届かない場合は枝刈り
    if (maxPossibleDamage < targetHp) {
        return true;
    }

    return false;
}

function calculateMaxPossibleDamage(state: SimulatedGameState): number {
    let damage = 0;

    // 盤面フォロワーの攻撃力合計（進化ボーナス込み）
    for (const card of state.aiBoard) {
        if (card.canAttack || card.passiveAbilities.includes('STORM')) {
            const evoBonus = card.canEvolve ? 2 : 0;
            const attacks = card.passiveAbilities.includes('DOUBLE_ATTACK') ? 2 : 1;
            damage += (card.currentAttack + evoBonus) * attacks;
        }
    }

    // 手札スペルのダメージ合計
    for (const card of state.aiHand) {
        if (card.type === 'SPELL' && card.cost <= state.aiPp) {
            damage += getSpellDirectDamage(card.id);
        }
    }

    return damage;
}
```

#### 2.6.3 探索深度の定義
**「1手」の定義**: 1つのActionTypeの実行

- PLAY_CARD: 1手
- EVOLVE: 1手
- ATTACK: 1手
- USE_SPELL: 1手

**最大6手の根拠**:
- 典型的なリーサルパターン: 超進化(1) + スペル(1-2) + 攻撃(2-3) = 5-6手
- 計算量: O(分岐数^深度) = O(10^6) ≈ 100万（許容範囲）

#### 2.6.4 アクション列挙の優先度

```typescript
function enumerateActions(state: SimulatedGameState): ActionPlan[] {
    const actions: ActionPlan[] = [];
    const hasWards = state.playerBoard.some(c =>
        c.passiveAbilities.includes('WARD') && !c.passiveAbilities.includes('STEALTH')
    );
    const hasBarrierWards = state.playerBoard.some(c =>
        c.passiveAbilities.includes('WARD') && c.hasBarrier
    );

    // === 優先度1: 超進化（刹那生成のため） ===
    // 遙が盤面にいて超進化可能 → 刹那2体生成でバリア守護突破可能に
    for (const card of state.aiBoard) {
        if (card.canEvolve && state.aiSep >= 1 && card.superEvolveGeneratesCards?.length) {
            actions.push({
                action: { type: 'EVOLVE', cardInstanceId: card.instanceId, useSuperEvolve: true },
                priority: 300, // 最優先
                reason: '超進化でカード生成',
                expectedOutcome: { cardsGained: card.superEvolveGeneratesCards }
            });
        }
    }

    // === 優先度2: 守護突破スペル ===
    for (const card of state.aiHand) {
        if (card.type === 'SPELL' && card.cost <= state.aiPp) {
            const dmg = getSpellDirectDamage(card.id);
            if (dmg > 0 && hasWards) {
                actions.push({
                    action: { type: 'USE_SPELL', cardInstanceId: card.instanceId },
                    priority: 250,
                    reason: 'スペルで守護破壊',
                    expectedOutcome: { damageToPlayer: dmg }
                });
            }
        }
    }

    // === 優先度3: 必殺持ちでバリア守護攻撃 ===
    if (hasBarrierWards) {
        const baneAttackers = state.aiBoard.filter(c =>
            c.canAttack && c.passiveAbilities.includes('BANE')
        );
        const barrierWards = state.playerBoard.filter(c =>
            c.passiveAbilities.includes('WARD') && c.hasBarrier
        );
        for (const bane of baneAttackers) {
            for (const ward of barrierWards) {
                actions.push({
                    action: { type: 'ATTACK', attackerInstanceId: bane.instanceId, targetInstanceId: ward.instanceId },
                    priority: 220, // 高優先度
                    reason: '必殺でバリア守護貫通',
                    expectedOutcome: { cardsRemoved: [ward.instanceId] }
                });
            }
        }
    }

    // === 優先度4: 通常攻撃（守護→リーダー） ===
    const targets = getValidAttackTargets(null as any, state.playerBoard, state.playerHp);
    for (const attacker of state.aiBoard.filter(c => c.canAttack)) {
        for (const target of targets) {
            actions.push({
                action: { type: 'ATTACK', attackerInstanceId: attacker.instanceId, targetInstanceId: target.instanceId },
                priority: target.instanceId === 'LEADER' ? 100 : 80,
                reason: target.instanceId === 'LEADER' ? 'リーダー攻撃' : '守護攻撃',
                expectedOutcome: {}
            });
        }
    }

    // 優先度順にソート
    return actions.sort((a, b) => b.priority - a.priority);
}
```

**優先度表:**
| アクション | 優先度 | 理由 |
|-----------|--------|------|
| 超進化（カード生成） | 300 | 刹那生成で選択肢増加 |
| スペル（守護破壊） | 250 | 確実な除去 |
| **必殺→バリア守護** | **220** | **1体で突破可能** |
| 通常攻撃→守護 | 80 | 必須行動 |
| 通常攻撃→リーダー | 100 | リーサル達成 |

### 2.7 コスト管理ルール

| リソース | 消費タイミング | 消費量 | 回復 | 上限 |
|---------|--------------|-------|------|------|
| PP | カードプレイ/スペル使用 | カードコスト | なし（ターン内） | ターン開始時PP |
| EP | 通常進化 | 1 | なし | 開始時EP |
| SEP | 超進化 | 1 | なし | 開始時SEP |
| 進化回数 | 進化/超進化 | 1 | なし | 2回/ターン |
| ネクロマンス | NC効果発動 | 効果記載値 | 墓場追加時 | 墓場カード数 |

```typescript
function canPerformAction(state: SimulatedGameState, action: ActionType): boolean {
    switch (action.type) {
        case 'PLAY_CARD':
        case 'USE_SPELL':
            const card = findCard(state, action.cardInstanceId);
            return card && card.cost <= state.aiPp;

        case 'EVOLVE':
            if (state.aiEvolveCount >= 2) return false; // 進化回数上限
            if (action.useSuperEvolve) {
                return state.aiSep >= 1;
            } else {
                return state.aiEp >= 1;
            }

        case 'ATTACK':
            const attacker = findCard(state, action.attackerInstanceId);
            return attacker && attacker.canAttack;

        default:
            return true;
    }
}
```

### 2.8 ランダム効果の評価方針

| 状況 | 評価方法 | 理由 |
|------|---------|------|
| リーサル判定 | **最悪ケース** | 確実にリーサルできるか判定 |
| 除去判定 | **期待値** | 平均的な効果で計算 |
| 複数ターゲットランダム | **均等分散** | 各ターゲットに均等ダメージ |

```typescript
function evaluateRandomEffect(
    effect: SimulatedEffect,
    targets: SimulatedCard[],
    mode: 'LETHAL' | 'REMOVAL'
): SimulatedEffect[] {
    if (mode === 'LETHAL') {
        // リーサル判定時は最悪ケース（ダメージが分散）
        // 例: 6ダメージランダム → 各ターゲットに均等
        const damagePerTarget = Math.floor(effect.value! / targets.length);
        return targets.map(t => ({
            ...effect,
            value: damagePerTarget,
            targetCardId: t.instanceId
        }));
    } else {
        // 除去判定時は期待値
        // 例: 3ダメージ×2回ランダム → 1体に集中期待
        return [{ ...effect, value: effect.value! * 2 }];
    }
}
```

---

## 3. 実装計画

**推奨順序変更**: Phase 2（シミュレーション）とPhase 3（リーサル計算）を入れ替え。
リーサル計算は盤面評価だけで簡易版が作れるが、シミュレーションは全効果対応が必要で複雑。

### Phase 1: データ構造とユーティリティ（基盤）
1. `SimulatedGameState`、`SimulatedCard`型の定義
2. `createSimulatedState()` - ゲーム状態からシミュレーション状態を作成
3. `deepCopySimulatedState()` - 状態のディープコピー
4. `createSimulatedCard()` - カードIDからシミュレーション用カードを作成
5. `computeStateHash()` - 状態のハッシュ計算（重複排除用）

### Phase 2: リーサル計算（簡易版）
1. `calculateBoardDamage()` - 盤面からの総ダメージ（進化ボーナス含む）
2. `calculateSpellDamage()` - 手札スペルからのダメージ
3. `findWardRemovalOptions()` - 守護突破手段の列挙
4. `calculateLethalPotential()` - リーサル判定統合（シミュレーションなし）
5. `getValidAttackTargets()` - 攻撃対象決定ロジック

### Phase 3: シミュレーション関数（コア）
1. `simulatePlayCard()` - カードプレイのシミュレーション
2. `simulateEvolve()` - 進化のシミュレーション（超進化含む）
3. `simulateAttack()` - 攻撃のシミュレーション（バリア/必殺対応）
4. `simulateSpellEffect()` - スペル効果のシミュレーション
5. `applyDamageToCard()` - ダメージ適用（バリア考慮）
6. `resolveCombat()` - 戦闘解決（必殺考慮）

### Phase 4: 探索最適化
1. `findLethalPath()` - DFS探索
2. `shouldPrune()` - 枝刈り判定
3. `calculateMaxPossibleDamage()` - 最大期待ダメージ
4. `enumerateActions()` - 可能なアクション列挙（優先度順）

### Phase 5: 行動計画と統合
1. `planOptimalSequence()` - 最適行動順序の計画
2. 既存AIループへの統合（HARD難易度のみ）
3. リーサルモード時の行動実行

### 3.1 既存コードとの統合アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                    GameScreen.tsx                            │
├─────────────────────────────────────────────────────────────┤
│  executeAiTurn() - 既存                                      │
│    ↓                                                         │
│  [HARD難易度 && aiLookaheadEnabled]                          │
│    ↓ YES                          ↓ NO                       │
│  ┌─────────────────────┐    ┌─────────────────────┐         │
│  │ ActionPlanner       │    │ 既存ロジック         │         │
│  │ .planOptimalSequence│    │ (scoreCardForPlaying │         │
│  │ ()                  │    │  scoreEvolveTarget)  │         │
│  └─────────────────────┘    └─────────────────────┘         │
│    ↓                          ↓                              │
│  リーサル可能？                                               │
│    ↓ YES        ↓ NO                                         │
│  計画実行      既存ロジックにフォールバック                    │
└─────────────────────────────────────────────────────────────┘
```

**統合ポイント**:
- `executeAiTurn()` の先頭でリーサル判定を実行
- リーサル可能なら計画に従って実行、不可なら既存ロジック
- `aiLookaheadEnabled` フラグで段階的有効化

---

## 4. 設計上の考慮事項

### 4.1 パフォーマンス
- シミュレーションは軽量な構造体で行う（フルのGameStateをコピーしない）
- 探索深度を制限（最大6手）
- 枝刈り条件で計算量削減（2.6.2参照）
- 状態ハッシュで重複排除

### 4.2 正確性とのトレードオフ
- 完全なシミュレーションは複雑すぎるため、主要な効果のみ対応
- **対応する効果タイプ**:
  | 効果 | 対応レベル | 備考 |
  |------|-----------|------|
  | DAMAGE | 完全 | 単体ダメージ |
  | AOE_DAMAGE | 完全 | 全体ダメージ |
  | DESTROY | 完全 | 単体破壊 |
  | GENERATE_CARD | 完全 | 超進化トークン等 |
  | SUMMON | 部分的 | 固定召喚のみ |
  | HEAL_LEADER | 完全 | 回復 |
  | RANDOM_DAMAGE | 簡易 | 最悪/期待値評価 |
  | BUFF/DEBUFF | 部分的 | 攻撃力のみ |
- **対応するパッシブ能力**:
  | 能力 | 対応 | 備考 |
  |------|------|------|
  | WARD | ✓ | 攻撃対象制限 |
  | STEALTH | ✓ | 対象不可 |
  | BANE | ✓ | 即破壊 |
  | STORM | ✓ | 召喚酔いなし |
  | DOUBLE_ATTACK | ✓ | 2回攻撃 |
  | AURA | ✓ | 対象不可（攻撃可） |
  | BARRIER | ✓ | 1回ダメージ無効 |

### 4.3 既存コードとの整合性
- 新規関数として追加（既存ロジックを壊さない）
- HARD難易度でのみ使用（EASY/NORMALは従来通り）
- `aiLookaheadEnabled` フラグで段階的有効化
- **呼び出し箇所**: `executeAiTurn()` の先頭
- **フォールバック**: リーサル不可時は既存ロジック

### 4.4 拡張性
- 新カード追加時にもシミュレーション対応しやすい構造
- **効果定義方式**: カードIDに対応するシミュレーション関数をマッピング

```typescript
const CARD_EFFECT_SIMULATORS: Record<string, (state: SimulatedGameState, card: SimulatedCard) => SimulatedGameState> = {
    'c_senka_knuckler': simulateSenkaSuperEvolve,
    's_backhand_smash': simulateBackhandSmash,
    // ... 必要なカードのみ追加
};
```

### 4.5 エラーハンドリング

```typescript
function simulateWithSafety(
    state: SimulatedGameState,
    action: ActionType
): SimulatedGameState | null {
    try {
        // 事前検証
        if (!canPerformAction(state, action)) {
            console.warn('[AI Lookahead] Invalid action:', action);
            return null;
        }

        return simulateAction(state, action);
    } catch (e) {
        console.error('[AI Lookahead] Simulation error:', e);
        return null; // エラー時は既存ロジックにフォールバック
    }
}

---

## 5. Why（設計理由）

### 5.1 なぜシミュレーション方式か
**代替案1**: 各カードに「リーサル貢献度」をハードコード
- 却下理由: 組み合わせ爆発、メンテナンス困難

**代替案2**: 機械学習でスコアリング
- 却下理由: 学習データ不足、実装コスト高

**採用理由**: シミュレーション方式は汎用的で、新カード追加にも対応しやすい

### 5.2 なぜ軽量構造体を使うか
- フルGameStateは巨大（10KB以上）
- 1ターンに数十回シミュレーションする可能性
- 必要な情報だけを抽出することでパフォーマンス確保

### 5.3 なぜHARD難易度限定か
- EASY/NORMALは「人間らしいミス」があった方が楽しい
- 計算コストの削減
- 段階的導入によるバグリスク低減

---

## 6. テスト計画

### 6.1 ユニットテスト
- `simulatePlayCard`: 各カードタイプの正しいシミュレーション
- `simulateEvolve`: 進化/超進化効果の正しい適用
- `simulateAttack`: バリア/必殺/ダブルアタックの正しい処理
- `calculateLethalPotential`: 各シナリオでの正しいリーサル判定
- `applyDamageToCard`: バリア消費の正しい処理
- `resolveCombat`: 必殺の相互処理

### 6.2 統合テスト
- 盞華超進化→スペル→攻撃のリーサルシナリオ
- 守護突破→リーサルのシナリオ
- リーサル不可時の適切な行動選択
- バリア付き守護の突破シナリオ
- 必殺持ちでの守護突破

### 6.3 検証シナリオ（目視確認）

| シナリオ | 条件 | 期待結果 |
|---------|------|---------|
| 盞華リーサル | 盞華盤面、SEP1、敵HP≤14、守護なし | 超進化→14点リーサル |
| 守護突破リーサル | 盞華盤面、SEP1、敵HP≤8、守護HP≤6 | バックハンド→守護破壊→リーサル |
| バリア守護突破（必殺なし） | 攻撃2体、敵バリア守護HP3 | 1体でバリア消費、1体で破壊 |
| **バリア守護突破（必殺あり）** | 刹那1体、敵バリア守護HP5 | **刹那1体で即破壊** |
| **遙SE→バリア守護突破** | 遙盤面、SEP1、敵バリア守護2体 | 超進化→刹那2体で2体とも突破 |
| リーサル不可 | 盤面攻撃力不足 | 既存ロジックで行動 |

### 6.4 必殺活用の検証シナリオ

| シナリオ | 盤面状態 | 期待行動 |
|---------|---------|---------|
| 刹那でバリア守護突破 | 刹那1体 + 他2体、敵バリア守護1体 | 刹那→守護、他2体→リーダー |
| 刹那温存（バリアなし守護） | 刹那1体 + 他2体（ATK十分）、敵守護1体（バリアなし） | 他→守護、刹那→リーダー |
| 刹那2体でバリア守護2体 | 刹那2体、敵バリア守護2体 | 刹那→各守護、リーサル不可判定 |
| 遙SE→刹那生成→突破 | 遙盤面、SEP1、敵バリア守護2体+HP6 | 超進化→刹那2体→各守護→遙→リーダー |

---

## 7. 段階的有効化方針

| バージョン | 機能 | 有効化条件 |
|-----------|------|-----------|
| v1.0 | リーサル計算（簡易版）| HARD + aiLookaheadEnabled |
| v1.1 | シミュレーション（基本）| v1.0 + テスト完了 |
| v1.2 | 探索最適化 | v1.1 + パフォーマンス検証 |
| v2.0 | 全機能有効 | v1.2 + 実プレイ検証 |

---

最終更新: 2026-01-24 v2.1（トリプルレビュー v2対応）

## 8. v2.1 追加修正事項（トリプルレビュー v2対応）

### 8.1 計算量制限の実装
- ノード数上限: 5000ノード
- 時間制限: 50ms
- 制限超過時: 既存ロジックにフォールバック

### 8.2 バリア+必殺の相互作用明確化
- **必殺（BANE）はバリアを貫通して即破壊する**
- バリアはダメージを0にする（必殺以外の攻撃に対して有効）
- AOEでもバリアは1回消費

### 8.3 STEALTH+守護の関係
- STEALTHを持つ守護は攻撃対象にならない

### 8.4 ラストワードの扱い
- v1ではラストワードを考慮しない（単純消滅扱い）
- リーサル計算の信頼度に影響する可能性あり（v2で対応予定）

### 8.5 PP回復/コスト軽減
- v1では考慮しない
- 該当カードが少ないためスコープ外
