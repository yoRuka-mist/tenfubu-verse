# オニAI 実装計画

## 概要

現在のHARD AIを超える最強AI「オニ」を実装する。
2ターン先読みミニマックス + 強化された盤面評価関数を採用。

## 現状分析

### 現在のHARD AIの特徴
- 1ターン先の最適解を計算
- スコアベースのカード評価
- 致死判定（リーサルチェック）
- 脅威度ベースの攻撃対象選択

### 弱点
1. **先読みなし**: 相手の返しを考慮しない
2. **盤面評価が単純**: 攻撃力+体力の合計のみ
3. **手札アドバンテージ無視**: ドロー価値を過小評価
4. **リソース管理が甘い**: EP/SEPの温存判断が不十分

---

## オニAI 設計

### 1. 盤面評価関数（BoardEvaluator）

```typescript
evaluateBoard(state: GameState, playerId: string): number {
  let score = 0;

  // === 基本要素 ===
  // HP差
  score += (myHp - enemyHp) * 10;

  // 盤面価値
  for (follower of myBoard) {
    score += evaluateFollower(follower);
  }
  for (follower of enemyBoard) {
    score -= evaluateFollower(follower);
  }

  // 手札アドバンテージ
  score += (myHandSize - enemyHandSize) * 25;

  // リソース
  score += myEP * 15;
  score += mySEP * 25;

  // === 状況ボーナス ===
  // リーサル可能性
  if (canLethalNextTurn()) score += 500;

  // 守護の価値（HPが低いほど高い）
  if (hasWard && myHp <= 10) score += 50;

  // テンポアドバンテージ（PP効率）
  score += ppEfficiency * 5;

  return score;
}

evaluateFollower(follower: BoardCard): number {
  let value = follower.currentAttack * 12 + follower.currentHealth * 8;

  // 能力ボーナス
  if (hasAbility('WARD')) value += 30;
  if (hasAbility('STORM')) value += 40;
  if (hasAbility('BANE')) value += 35;
  if (hasAbility('DOUBLE_ATTACK')) value += 45;
  if (hasAbility('STEALTH')) value += 25;

  // 攻撃可能ボーナス
  if (canAttack) value += 20;

  // 進化済みボーナス
  if (hasEvolved) value += 15;

  return value;
}
```

### 2. ミニマックス探索（2ターン先読み）

```typescript
minimax(state: GameState, depth: number, isMaximizing: boolean, alpha: number, beta: number): number {
  // 終端条件
  if (depth === 0 || isGameOver(state)) {
    return evaluateBoard(state, aiPlayerId);
  }

  const moves = generateAllMoves(state, isMaximizing ? aiPlayerId : playerId);

  // 枝刈り: 有望な手のみ探索（上位N手）
  const prunedMoves = pruneMovesToTopN(moves, 8);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of prunedMoves) {
      const newState = applyMove(state, move);
      const eval = minimax(newState, depth - 1, false, alpha, beta);
      maxEval = Math.max(maxEval, eval);
      alpha = Math.max(alpha, eval);
      if (beta <= alpha) break; // β枝刈り
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of prunedMoves) {
      const newState = applyMove(state, move);
      const eval = minimax(newState, depth - 1, true, alpha, beta);
      minEval = Math.min(minEval, eval);
      beta = Math.min(beta, eval);
      if (beta <= alpha) break; // α枝刈り
    }
    return minEval;
  }
}
```

### 3. 行動列挙（Move Generation）

```typescript
interface AIMove {
  type: 'PLAY_CARD' | 'EVOLVE' | 'ATTACK' | 'END_TURN';
  params: any;
}

generateAllMoves(state: GameState, playerId: string): AIMove[][] {
  // 可能な行動のシーケンスを生成
  // カードプレイ → 進化 → 攻撃の順

  const moves: AIMove[][] = [];

  // 何もしない（パス）
  moves.push([{ type: 'END_TURN' }]);

  // カードプレイの組み合わせ
  for (const cardCombo of generateCardCombinations(state, playerId)) {
    // 各カードプレイ後の進化候補
    for (const evolveOption of generateEvolveOptions(state, playerId)) {
      // 各進化後の攻撃パターン
      for (const attackSequence of generateAttackSequences(state, playerId)) {
        moves.push([...cardCombo, ...evolveOption, ...attackSequence]);
      }
    }
  }

  return moves;
}
```

### 4. リーサル逆算

```typescript
calculateLethalTurns(state: GameState): number {
  const enemyHp = state.players[playerId].hp;
  const myBoard = state.players[aiPlayerId].board;
  const myHand = state.players[aiPlayerId].hand;

  // 現在盤面からの打点
  let currentDamage = 0;
  for (const follower of myBoard) {
    if (follower?.canAttack && !isBlockedByWard(follower, state)) {
      currentDamage += follower.currentAttack;
      if (follower.passiveAbilities?.includes('DOUBLE_ATTACK')) {
        currentDamage += follower.currentAttack;
      }
    }
  }

  // 手札からの追加打点（疾走持ち）
  let handDamage = 0;
  for (const card of myHand) {
    if (card.cost <= pp && card.passiveAbilities?.includes('STORM')) {
      handDamage += card.attack || 0;
    }
  }

  // 進化による追加打点
  const evolveDamage = canEvolve ? 2 : 0;

  const totalDamage = currentDamage + handDamage + evolveDamage;

  if (totalDamage >= enemyHp) return 0; // 今ターンリーサル

  // 次ターン以降の推定
  return Math.ceil((enemyHp - totalDamage) / estimatedDamagePerTurn);
}
```

---

## 実装手順

### Phase 1: 基盤整備
1. `types.ts`: AIDifficulty型に 'ONI' を追加
2. `TitleScreen.tsx`: 難易度選択UIにオニを追加

### Phase 2: 評価関数実装
3. `GameScreen.tsx`: evaluateBoard関数を実装
4. `GameScreen.tsx`: evaluateFollower関数を実装

### Phase 3: ミニマックス実装
5. `GameScreen.tsx`: generateAllMoves関数を実装
6. `GameScreen.tsx`: minimax関数を実装（α-β枝刈り）
7. `GameScreen.tsx`: applyMove関数（状態シミュレーション）

### Phase 4: 統合
8. AIターン処理にオニモードを追加
9. 処理時間の測定とチューニング

### Phase 5: テスト・調整
10. HARD vs ONI の対戦テスト
11. パラメータ調整

---

## パフォーマンス対策

1. **探索深度制限**: 2ターン（深度4）まで
2. **枝刈り**: α-β枝刈り + 上位8手のみ探索
3. **状態のイミュータブルコピー**: 軽量なクローン処理
4. **タイムアウト**: 最大500ms以内に最善手を返す

---

## 想定処理時間

| 条件 | 探索ノード数 | 予想時間 |
|------|-------------|---------|
| 盤面空 | ~100 | ~10ms |
| 通常盤面 | ~1,000 | ~50ms |
| 複雑盤面 | ~5,000 | ~200ms |
| 最悪ケース | ~10,000 | ~500ms |

---

## 難易度パラメータ比較

| パラメータ | HARD | ONI |
|-----------|------|-----|
| 思考時間 | 400ms | 100-500ms（可変） |
| 先読み深度 | 0 | 2ターン |
| 評価関数 | 単純スコア | 複合評価 |
| 枝刈り | なし | α-β |
| リーサル計算 | 1ターン | 2-3ターン |

---

## 作成日
2026-01-09
