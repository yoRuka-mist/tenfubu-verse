# AI強化 実装計画

## 概要
CPU戦におけるAIの強化。現状の弱点を分析し、段階的に改善する。

## 現状分析（2026-01-21）

### AI難易度別の特徴

| 項目 | EASY | NORMAL | HARD |
|------|------|--------|------|
| 思考時間 | 1200ms | 800ms | 400ms |
| 1ターン最大カード数 | 1枚 | 3枚 | 5枚 |
| カードスコアリング | コスト順 | スコア順 | 高度なスコア計算 |
| レサル判定 | **なし** | **なし** | あり |

### 主な問題点

| 優先度 | 問題 | 影響 | 対象行 |
|--------|------|------|--------|
| 🔴 高 | EASY/NORMALでレサル判定なし | 明確な勝ち筋を見落とす | 6422-6427 |
| 🟠 中 | 基本スコアが低い (cost×10) | ボーナスに過度依存 | 5779 |
| 🟠 中 | 敵脅威計算が単純 | BANE等への対応不足 | calculateEnemyThreat |
| 🟠 中 | 早期進化の閾値が厳しい | T4-5での進化機会損失 | shouldEvolveThisTurn |
| 🟡 低 | ドロー効果の低評価 | リソース管理が弱い | scoreCardForPlaying |
| 🟡 低 | 複合脅威の評価不足 | BANE+DOUBLE_ATTACK等 | - |

---

## Phase 1: 最優先修正（効果大・変更小）

### 1.1 NORMALにレサル判定追加

**ファイル**: `game/src/screens/GameScreen.tsx`
**対象**: `checkForLethal`関数（約6422行目）

```typescript
// 現状
const checkForLethal = (state: any): boolean => {
    if (aiDifficulty !== 'HARD') return false;
    // ...
};

// 改善案
const checkForLethal = (state: any): boolean => {
    if (aiDifficulty === 'EASY') return false;  // EASYのみ無効
    // NORMALとHARDはレサル判定を行う
    const playerHp = state.players[currentPlayerId].hp;
    const potentialDamage = calculatePotentialDamage(state);
    return potentialDamage >= playerHp;
};
```

**効果**: NORMALでも勝てる状況を見逃さなくなる

---

### 1.2 基本スコア計算の強化

**対象**: `scoreCardForPlaying`関数（約5779行目）

```typescript
// 現状
let score = card.cost * 10;

// 改善案
let score = card.cost * 15;  // または 20
```

**効果**: 高コストカードの価値が適正化され、ボーナスとのバランス改善

---

### 1.3 敵脅威度の動的計算

**対象**: `calculateEnemyThreat`関数

```typescript
// 現状
if (card.passiveAbilities?.includes('BANE')) threat += 15;  // 固定値
if (card.passiveAbilities?.includes('STORM')) threat += 10;  // 固定値

// 改善案
if (card.passiveAbilities?.includes('BANE')) {
    threat += (card.currentAttack || 0) * 3;  // ATK依存
}
if (card.passiveAbilities?.includes('STORM')) {
    threat += (card.currentAttack || 0) * 2;  // 即時ダメージ考慮
}
if (card.passiveAbilities?.includes('DOUBLE_ATTACK')) {
    threat += (card.currentAttack || 0) * 2;  // 2回攻撃
}
```

**効果**: 危険なカードへの適切な対応

---

## Phase 2: 中程度の改善

### 2.1 進化保留条件の緩和

**対象**: `shouldEvolveThisTurn`関数

```typescript
// 現状
if (turnCount <= 5 && aiHp >= 15 && enemyThreat < 8) {
    return bestScore >= 100;  // 閾値が高すぎる
}

// 改善案
if (turnCount <= 5 && aiHp >= 15 && enemyThreat < 8) {
    return bestScore >= 70;  // 緩和
}
```

---

### 2.2 ドロー効果の評価向上

**対象**: `scoreCardForPlaying`関数

```typescript
// 現状
if (eff.type === 'DRAW') score += 20 * (eff.value || 1);

// 改善案
const handSize = state.players[opponentPlayerId].hand.length;
const drawBonus = handSize <= 3 ? 40 : 25;  // 手札少なければ高評価
if (eff.type === 'DRAW') score += drawBonus * (eff.value || 1);
```

---

### 2.3 複合脅威の乗算評価

**新規関数追加**:

```typescript
const threatMultiplier = (card: any): number => {
    let mult = 1.0;
    if (card.passiveAbilities?.includes('BANE')) mult *= 2.0;
    if (card.passiveAbilities?.includes('DOUBLE_ATTACK')) mult *= 1.5;
    if (card.passiveAbilities?.includes('STORM')) mult *= 1.3;
    if (card.passiveAbilities?.includes('STEALTH')) mult *= 1.2;
    return mult;
};

// calculateEnemyThreatで使用
const baseThreat = card.currentAttack || 0;
threat += baseThreat * threatMultiplier(card);
```

---

## Phase 3: 高度な改善（将来）

### 3.1 フェーズ別戦術

```typescript
type GamePhase = 'EARLY' | 'MID' | 'LATE';

const getGamePhase = (turnCount: number): GamePhase => {
    if (turnCount <= 4) return 'EARLY';
    if (turnCount <= 8) return 'MID';
    return 'LATE';
};

const phaseModifiers = {
    EARLY: { removal: 0.8, tempo: 1.5, heal: 1.3 },
    MID:   { removal: 1.0, tempo: 1.0, heal: 1.0 },
    LATE:  { removal: 1.2, tempo: 0.7, lethal: 1.5 }
};
```

---

### 3.2 攻撃順序の最適化

現在はボード順（左から右）で攻撃しているが、以下の順序を検討：
1. WARD破壊が可能なカードを先に
2. BANE持ちを安全に処理できるカードを先に
3. 高ATKカードでの効率的なトレード

---

### 3.3 予防的除去の強化

危険なカード（BANE、高ATK+DOUBLE_ATTACK）への除去優先度を状況に応じて動的に変更。

```typescript
const isHighThreatCard = (card: any): boolean => {
    if (card.passiveAbilities?.includes('BANE')) return true;
    if (card.passiveAbilities?.includes('DOUBLE_ATTACK') && card.currentAttack >= 5) return true;
    if (card.passiveAbilities?.includes('STORM') && card.currentAttack >= 4) return true;
    return false;
};

// 高脅威カード存在時のDESTROYボーナス倍増
if (enemyBoard.some(isHighThreatCard)) {
    destroyBonus *= 2;
}
```

---

## 実装優先順位

### 即時実装推奨（Phase 1）
- [ ] 1.1 NORMALにレサル判定追加
- [ ] 1.2 基本スコア計算の強化
- [ ] 1.3 敵脅威度の動的計算

### 中期実装（Phase 2）
- [ ] 2.1 進化保留条件の緩和
- [ ] 2.2 ドロー効果の評価向上
- [ ] 2.3 複合脅威の乗算評価

### 長期実装（Phase 3）
- [ ] 3.1 フェーズ別戦術
- [ ] 3.2 攻撃順序の最適化
- [ ] 3.3 予防的除去の強化

---

## テスト方針

### 手動テスト
1. 各難易度でCPU戦をプレイ
2. 以下の状況を意図的に作成して確認：
   - レサル状況（NORMALで正しく勝ちに行くか）
   - BANE持ちが場にいる状況（適切に対処するか）
   - 進化可能だが進化しない状況（T4-5）

### チェックリスト
- [ ] EASY: 変わらず弱いまま（初心者向け）
- [ ] NORMAL: レサルを見逃さない、中程度の強さ
- [ ] HARD: 最適に近いプレイ

---

## 関連ファイル

| ファイル | 役割 |
|----------|------|
| `game/src/screens/GameScreen.tsx` | AI実装（runAiTurn関数） |
| `game/src/core/engine.ts` | ゲームロジック、カード定義 |

---

## Phase 4: デッキ別戦略（盞華デッキ専用AI）

### 4.0 現状の問題点

**現在のAIターン処理順序:**
```
1. Thinking time（思考時間）
2. Play Cards（カードプレイ）
2.5. Evolve Phase（進化フェーズ）
3. Attack Phase（攻撃フェーズ）
```

**問題:**
1. 進化後に手札に追加されたスペルを使う処理がない
2. 盞華超進化後のスペル（フリッカージャブ、クエイクハウリング、バックハンドスマッシュ）が攻撃前に使われない
3. 守護を除去せずにフォロワーで攻撃している

---

### 4.1 進化後スペル使用フェーズの追加

**改善後のターン処理順序:**
```
1. Thinking time（思考時間）
2. Play Cards（カードプレイ）
2.5. Evolve Phase（進化フェーズ）
2.6. Post-Evolve Spell Phase（進化後スペル使用フェーズ）★新規
3. Attack Phase（攻撃フェーズ）
```

**スペルの使い分け:**
| スペル | ダメージ | 対象 | 使用タイミング |
|--------|----------|------|----------------|
| クエイクハウリング | 2 | 全体 | 敵が2体以上いる場合に最初に使用 |
| バックハンドスマッシュ | 6 | 単体 | 高HP守護（HP3以上）の除去 |
| フリッカージャブ | 2 | 単体 | 低HP守護（HP1-2）の除去、トドメ |

**スペル使用の優先順序:**
1. 敵フォロワーが2体以上 → クエイクハウリングを先に使用
2. **オーラ(AURA)・隠密(STEALTH)持ちへの対処**
   - フリッカージャブ・バックハンドスマッシュは単体選択なので**選べない**
   - クエイクハウリングは全体効果なので**当たる**
   - HP 1-2のオーラ・隠密持ち → クエイクハウリングで除去
3. クエイクハウリング後の残HPに応じて効率的にスペルを選択
   - **フリッカージャブで倒せる（HP 1-2）→ 先にフリッカージャブで処理**
   - フリッカージャブで倒せない（HP 3-6）→ バックハンドスマッシュ
   - HP 7-8 → フリッカージャブ + バックハンドスマッシュ（計8ダメージ）
   - HP 9-10 → クエイク + フリッカー + バックハンド（計10ダメージ）
4. 守護を優先して倒す
5. キレイに倒せるなら守護以外も倒しておく
6. 倒せない場合は基本的に温存（ただし合計で倒せるなら使う）

**ダメージ計算早見表:**
| スペル組み合わせ | 合計ダメージ |
|-----------------|-------------|
| フリッカージャブのみ | 2 |
| バックハンドスマッシュのみ | 6 |
| クエイクハウリングのみ | 2（全体） |
| フリッカー + バックハンド | 8 |
| クエイク + フリッカー | 4 |
| クエイク + バックハンド | 8 |
| クエイク + フリッカー + バックハンド | **10** |

**実装案:**
```typescript
// 2.6 Post-Evolve Spell Phase (進化後に追加されたスペルを使用)
{
    const state = gameStateRef.current;
    const aiHand = state.players[opponentPlayerId].hand;
    const playerBoard = state.players[currentPlayerId].board.filter((c: any) => c !== null);

    // 盞華の超進化で追加されたスペルを検出
    const quakeHowling = aiHand.find((c: any) => c.id === 'TOKEN_QUAKE_HOWLING');
    const backhandSmash = aiHand.find((c: any) => c.id === 'TOKEN_BACKHAND_SMASH');
    const flickerJab = aiHand.find((c: any) => c.id === 'TOKEN_FLICKER_JAB');

    // 守護持ちフォロワーを抽出
    const wardsOnBoard = playerBoard.filter((c: any) =>
        c.passiveAbilities?.includes('WARD')
    );

    // Step 1: 敵が複数体いる場合、クエイクハウリングを先に使用
    if (playerBoard.length >= 2 && quakeHowling) {
        // クエイクハウリング（全体2ダメージ）を使用
        const cardIndex = aiHand.findIndex((c: any) => c.id === 'TOKEN_QUAKE_HOWLING');
        dispatch({ type: 'PLAY_CARD', playerId: opponentPlayerId, payload: { cardIndex } });
        await waitForIdle(300);
    }

    // Step 2: 残った敵を効率的に処理
    // 方針: フリッカージャブで倒せるものを先に処理 → 残りをバックハンドスマッシュ
    const updatedState = gameStateRef.current;
    const updatedPlayerBoard = updatedState.players[currentPlayerId].board.filter((c: any) => c !== null);

    // オーラ・隠密チェック用ヘルパー
    const isUntargetable = (c: any) =>
        c.passiveAbilities?.includes('AURA') || c.passiveAbilities?.includes('STEALTH');

    // 守護を優先、その他も「キレイに倒せるなら」倒す
    const wards = updatedPlayerBoard.filter((c: any) => c.passiveAbilities?.includes('WARD'));
    const nonWards = updatedPlayerBoard.filter((c: any) => !c.passiveAbilities?.includes('WARD'));

    // 処理対象リスト（守護優先）
    const targets = [...wards, ...nonWards];

    // フリッカージャブで倒せるもの（HP 1-2）を先に処理
    // ※オーラ・隠密持ちは単体スペルで選択不可
    for (const target of targets) {
        const hp = target.currentHealth || 0;
        const currentHand = gameStateRef.current.players[opponentPlayerId].hand;
        const hasJab = currentHand.some((c: any) => c.id === 'TOKEN_FLICKER_JAB');

        // オーラ・隠密持ちは単体スペルで選べない
        if (isUntargetable(target)) continue;

        if (hp <= 2 && hasJab) {
            // フリッカージャブで倒せる → 処理
            const jabIndex = currentHand.findIndex((c: any) => c.id === 'TOKEN_FLICKER_JAB');
            dispatch({ type: 'PLAY_CARD', playerId: opponentPlayerId, payload: { cardIndex: jabIndex, targetId: target.instanceId } });
            await waitForIdle(300);
        }
    }

    // 残った守護をバックハンドスマッシュで処理
    const refreshedState = gameStateRef.current;
    const refreshedBoard = refreshedState.players[currentPlayerId].board.filter((c: any) => c !== null);
    const remainingWards = refreshedBoard.filter((c: any) => c.passiveAbilities?.includes('WARD'));

    for (const ward of remainingWards) {
        // オーラ・隠密持ちは単体スペルで選べない
        if (isUntargetable(ward)) continue;

        const hp = ward.currentHealth || 0;
        const currentHand = gameStateRef.current.players[opponentPlayerId].hand;
        const hasSmash = currentHand.some((c: any) => c.id === 'TOKEN_BACKHAND_SMASH');
        const hasJab = currentHand.some((c: any) => c.id === 'TOKEN_FLICKER_JAB');
        const hasQuake = currentHand.some((c: any) => c.id === 'TOKEN_QUAKE_HOWLING');

        if (hp <= 6 && hasSmash) {
            // バックハンドスマッシュで倒せる
            const smashIndex = currentHand.findIndex((c: any) => c.id === 'TOKEN_BACKHAND_SMASH');
            dispatch({ type: 'PLAY_CARD', playerId: opponentPlayerId, payload: { cardIndex: smashIndex, targetId: ward.instanceId } });
            await waitForIdle(300);
        } else if (hp <= 8 && hasSmash && hasJab) {
            // バックハンドスマッシュ + フリッカージャブで倒せる（計8ダメージ）
            const smashIndex = currentHand.findIndex((c: any) => c.id === 'TOKEN_BACKHAND_SMASH');
            dispatch({ type: 'PLAY_CARD', playerId: opponentPlayerId, payload: { cardIndex: smashIndex, targetId: ward.instanceId } });
            await waitForIdle(300);

            const newHand = gameStateRef.current.players[opponentPlayerId].hand;
            const jabIndex = newHand.findIndex((c: any) => c.id === 'TOKEN_FLICKER_JAB');
            if (jabIndex !== -1) {
                dispatch({ type: 'PLAY_CARD', playerId: opponentPlayerId, payload: { cardIndex: jabIndex, targetId: ward.instanceId } });
                await waitForIdle(300);
            }
        } else if (hp <= 10 && hasQuake && hasSmash && hasJab) {
            // クエイク + バックハンド + フリッカーで倒せる（計10ダメージ）
            // クエイクは既に使用済みの場合があるので、未使用なら使う
            const quakeIndex = currentHand.findIndex((c: any) => c.id === 'TOKEN_QUAKE_HOWLING');
            if (quakeIndex !== -1) {
                dispatch({ type: 'PLAY_CARD', playerId: opponentPlayerId, payload: { cardIndex: quakeIndex } });
                await waitForIdle(300);
            }

            // バックハンドスマッシュ
            const hand2 = gameStateRef.current.players[opponentPlayerId].hand;
            const smashIdx = hand2.findIndex((c: any) => c.id === 'TOKEN_BACKHAND_SMASH');
            if (smashIdx !== -1) {
                dispatch({ type: 'PLAY_CARD', playerId: opponentPlayerId, payload: { cardIndex: smashIdx, targetId: ward.instanceId } });
                await waitForIdle(300);
            }

            // フリッカージャブ
            const hand3 = gameStateRef.current.players[opponentPlayerId].hand;
            const jabIdx = hand3.findIndex((c: any) => c.id === 'TOKEN_FLICKER_JAB');
            if (jabIdx !== -1) {
                dispatch({ type: 'PLAY_CARD', playerId: opponentPlayerId, payload: { cardIndex: jabIdx, targetId: ward.instanceId } });
                await waitForIdle(300);
            }
        }
        // HP 11以上で倒せない場合は温存
    }

    // Step 3: 残りのスペルで「キレイに倒せる」非守護フォロワーを処理
    const finalState = gameStateRef.current;
    const finalBoard = finalState.players[currentPlayerId].board.filter((c: any) => c !== null);
    const finalHand = finalState.players[opponentPlayerId].hand;

    for (const enemy of finalBoard) {
        const hp = enemy.currentHealth || 0;
        const hasJab = finalHand.some((c: any) => c.id === 'TOKEN_FLICKER_JAB');
        const hasSmash = finalHand.some((c: any) => c.id === 'TOKEN_BACKHAND_SMASH');

        // キレイに倒せるなら処理
        if (hp <= 2 && hasJab) {
            const jabIndex = finalHand.findIndex((c: any) => c.id === 'TOKEN_FLICKER_JAB');
            dispatch({ type: 'PLAY_CARD', playerId: opponentPlayerId, payload: { cardIndex: jabIndex, targetId: enemy.instanceId } });
            await waitForIdle(300);
        } else if (hp <= 6 && hasSmash) {
            const smashIndex = finalHand.findIndex((c: any) => c.id === 'TOKEN_BACKHAND_SMASH');
            dispatch({ type: 'PLAY_CARD', playerId: opponentPlayerId, payload: { cardIndex: smashIndex, targetId: enemy.instanceId } });
            await waitForIdle(300);
        }
    }
}
```

---

### 4.2 盞華デッキの勝ち筋パターン

#### パターンA: 標準リーサル
1. 相手のHPを12以下に削る
2. 盞華（8コスト）を召喚
3. 盞華を超進化（+3/+3 → ATK6、IMMUNE）
4. 超進化で手札に追加されたスペルで守護を除去
5. 盞華で攻撃（6点 × 2 = 12点）でリーサル

#### パターンB: ナックラーOTK
1. 盞華を召喚
2. ナックラー（しゑこ、ユキ、白ツバキ）を同時召喚
3. 盞華の常在効果でナックラーが疾走を得る
4. 全員でリーダーを攻撃してOTK

**重要なカード:**
| カード | コスト | 効果 | 役割 |
|--------|--------|------|------|
| 盞華 | 8 | STORM, DOUBLE_ATTACK, ナックラーに疾走付与 | フィニッシャー |
| しゑこ | 2 | RUSH, 進化時+2/+2 | 追加打点 |
| ユキ | 3 | RUSH, 進化時全体+1/+1 | 追加打点 |
| 白ツバキ | 4 | RUSH, 進化時しゑこ召喚 | 追加打点 |

**超進化で手札に加わるスペル（すべて0コスト）:**
| スペル | 効果 | 用途 |
|--------|------|------|
| フリッカージャブ | 敵1体に2ダメージ | 小型除去 |
| クエイクハウリング | 敵全体に2ダメージ | 全体除去 |
| バックハンドスマッシュ | 敵1体に6ダメージ | 守護除去 |

---

### 4.3 超進化権の管理（盞華温存ロジック）

**設計方針:**
- 手札に盞華がある場合、超進化権は盞華のために温存する
- 例外：次のターン負ける可能性が高い場合
- 例外：手札に盞華が2枚ある場合

**実装案:**
```typescript
const shouldUseSuperEvolveForSenka = (state: any): boolean => {
    const aiHand = state.players[opponentPlayerId].hand;
    const senkaInHand = aiHand.filter((c: any) => c.id === 'c_senka_knuckler');

    // 手札に盞華がない → 他のカードに超進化を使ってもOK
    if (senkaInHand.length === 0) {
        return false;  // 盞華温存の必要なし
    }

    // 手札に盞華が2枚以上 → 1枚目は他に使ってもOK
    if (senkaInHand.length >= 2) {
        return false;  // 盞華温存の必要なし
    }

    // 手札に盞華が1枚 → 超進化権は盞華のために温存
    return true;  // 超進化を使わない
};

// shouldEvolveThisTurn関数内で使用
if (useSuperEvolve && shouldUseSuperEvolveForSenka(state)) {
    // 盞華のために超進化権を温存
    // ただし、次のターン負ける可能性が高い場合は例外
    const nextTurnThreat = calculateEnemyThreat(state);
    const aiHp = state.players[opponentPlayerId].hp;

    if (nextTurnThreat >= aiHp) {
        // 次のターン負ける可能性が高い → 超進化を使用
        return true;
    }

    // そうでなければ超進化を温存
    return false;
}
```

---

### 4.4 盞華のプレイタイミング

**設計方針:**
- 盞華を出すときは勝つ時
- リーサル可能な状況でのみ盞華をプレイ
- 例外：手札に盞華が2枚ある場合

**実装案:**
```typescript
const shouldPlaySenka = (state: any, card: any): boolean => {
    if (card.id !== 'c_senka_knuckler') {
        return true;  // 盞華以外は通常ロジック
    }

    const aiHand = state.players[opponentPlayerId].hand;
    const senkaCount = aiHand.filter((c: any) => c.id === 'c_senka_knuckler').length;

    // 盞華が2枚以上あれば、リーサルでなくても出してOK
    if (senkaCount >= 2) {
        return true;
    }

    // リーサル可能かチェック
    const playerHp = state.players[currentPlayerId].hp;
    const canSuperEvolve = state.players[opponentPlayerId].sep >= 1;

    // 盞華超進化後のダメージ計算（6点×2 = 12点）
    const senkaPostEvolveDamage = 6 * 2;  // DOUBLE_ATTACK

    // 現在の場のダメージ計算
    const currentBoardDamage = calculatePotentialDamage(state);

    // 盞華召喚後の合計ダメージ
    const totalDamage = currentBoardDamage + (canSuperEvolve ? senkaPostEvolveDamage : (3 + 2) * 2);

    // 相手の場に守護がいるかチェック
    const playerBoard = state.players[currentPlayerId].board;
    const hasWard = playerBoard.some((c: any) => c && c.passiveAbilities?.includes('WARD'));

    // 守護がいる場合、除去スペルで対処できるか
    // 超進化で手に入るスペル: バックハンドスマッシュ(6ダメ)、フリッカージャブ(2ダメ)、クエイクハウリング(全体2ダメ)
    const canRemoveWards = canSuperEvolve && hasWard;  // 超進化すればスペルで除去可能

    if (totalDamage >= playerHp && (!hasWard || canRemoveWards)) {
        return true;  // リーサル可能
    }

    // リーサルできない場合は盞華を温存
    return false;
};
```

---

### 4.5 攻撃優先度のデッキ別調整

**現状の問題:**
- 現在のAIはフォロワーを優先して攻撃している
- 盞華デッキの場合、リーダー攻撃を優先すべき

**設計方針（盞華デッキ用）:**
1. スペルで守護を除去
2. リーダーに攻撃（フォロワーより優先）
3. 守護がいて除去できない場合のみフォロワーに攻撃

**実装案:**
```typescript
// findBestAttackTarget関数内

const isSenkaClass = aiClass === 'SENKA';

if (isSenkaClass) {
    // 盞華デッキの場合、リーダー攻撃を優先
    const hasWard = playerBoard.some((c: any) => c && c.passiveAbilities?.includes('WARD'));

    if (!hasWard && canAttackLeader) {
        // 守護がいなければリーダー攻撃
        return { index: -1, isLeader: true };
    }

    // 守護がいる場合、守護を優先攻撃
    if (hasWard) {
        const wardTarget = playerBoard.findIndex((c: any) =>
            c && c.passiveAbilities?.includes('WARD')
        );
        if (wardTarget !== -1) {
            return { index: wardTarget, isLeader: false };
        }
    }
}
```

---

### 4.6 盞華デッキAIの全体フロー

```
[ターン開始]
    ↓
[カードプレイフェーズ]
    - 盞華をプレイするか判定（shouldPlaySenka）
    - リーサル可能 or 盞華2枚以上 → プレイ
    - そうでなければ温存
    ↓
[進化フェーズ]
    - 超進化を使うか判定
    - 盞華が手札に1枚 → 超進化は盞華のために温存
    - 盞華が場にいる → 盞華を超進化
    ↓
[進化後スペル使用フェーズ] ★新規
    1. 敵が2体以上 → クエイクハウリング（全体2ダメ）を先に使用
    2. 守護のHPに応じてスペル選択
       - HP 1-2: フリッカージャブ
       - HP 3-6: バックハンドスマッシュ
       - HP 7+: バックハンドスマッシュ + フリッカージャブ
    3. 残りスペルは他のフォロワー除去に使用
    ↓
[攻撃フェーズ]
    - 守護がいなければリーダー攻撃
    - 盞華のDOUBLE_ATTACKで12点
    ↓
[ターン終了]
```

**スペル使用の具体例:**

| 状況 | スペル使用順序 | 結果 |
|------|----------------|------|
| 守護1体(HP4) | バックハンドスマッシュ | 守護除去、スペル2枚温存 |
| 守護1体(HP2) | フリッカージャブ | 守護除去、スペル2枚温存 |
| 守護1体(HP8) | バックハンドスマッシュ → フリッカージャブ | 守護除去、スペル1枚温存 |
| 守護1体(HP10) | クエイク → フリッカー → バックハンド（計10ダメ） | 守護除去、スペル全使用 |
| 守護2体(HP3,HP2) | クエイク(→HP1,HP0) → フリッカー(HP1) | 両方除去、バックハンド温存 |
| 守護2体(HP5,HP4) | クエイク(→HP3,HP2) → フリッカー(HP2) → バックハンド(HP3) | 両方除去 |
| 敵3体(守護HP4,他HP2,HP1) | クエイク(→HP2,HP0,消滅) → フリッカー(守護HP2) | 全除去、バックハンド温存 |
| 敵3体(守護HP6,他HP3,HP2) | クエイク(→HP4,HP1,HP0) → フリッカー(HP1) → バックハンド(守護HP4) | 全除去 |
| 守護1体(HP11以上) | 温存（倒せないため） | スペル全温存、殴りで対処 |
| **オーラ持ち(HP2)** | クエイクハウリング | 除去成功（単体スペル選択不可） |
| **隠密持ち(HP2)** | クエイクハウリング | 除去成功（単体スペル選択不可） |
| **オーラ持ち(HP4)** | 温存 | 単体スペル選択不可、クエイクでも倒せない |

---

## 実装優先順位（更新）

### 即時実装推奨（Phase 1）
- [ ] 1.1 NORMALにレサル判定追加
- [ ] 1.2 基本スコア計算の強化
- [ ] 1.3 敵脅威度の動的計算

### 中期実装（Phase 2）
- [ ] 2.1 進化保留条件の緩和
- [ ] 2.2 ドロー効果の評価向上
- [ ] 2.3 複合脅威の乗算評価

### 長期実装（Phase 3）
- [ ] 3.1 フェーズ別戦術
- [ ] 3.2 攻撃順序の最適化
- [ ] 3.3 予防的除去の強化

### デッキ別戦略（Phase 4）★新規
- [ ] 4.1 進化後スペル使用フェーズの追加
- [ ] 4.2 盞華デッキの勝ち筋パターン認識
- [ ] 4.3 超進化権の管理（盞華温存ロジック）
- [ ] 4.4 盞華のプレイタイミング最適化
- [ ] 4.5 攻撃優先度のデッキ別調整

---

## テスト方針（更新）

### 盞華デッキ専用テスト
1. 盞華超進化後のスペル使用確認
   - 守護がいる場合、バックハンドスマッシュで除去するか
   - スペル使用後にリーダー攻撃するか
2. 超進化権の温存確認
   - 手札に盞華1枚の時、他のカードに超進化を使わないか
   - 手札に盞華2枚の時、1枚目の超進化は自由に使えるか
3. 盞華のプレイタイミング確認
   - リーサル可能な時のみ盞華を出すか
   - 盞華2枚ある時は早めに出すか

---

作成日: 2026-01-21
最終更新: 2026-01-21
