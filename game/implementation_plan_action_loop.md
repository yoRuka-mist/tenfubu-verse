# AI行動選択ループ 設計書

## 概要

現在のAIは固定フェーズ（カードプレイ→進化→スペル→攻撃）で動作しているが、
実際のカードゲームでは行動順序は自由であり、最適な順序は状況次第。

### 現在の問題
- 攻撃前にスペルを使うべき場面で使えない
- フォロワーを出して進化→攻撃→別のフォロワーができない
- 盞華超進化後、スペルで守護を処理せずに殴ってしまう

## 設計

### 行動タイプ
```typescript
type AIActionType =
    | { type: 'PLAY_CARD'; cardIndex: number; targetId?: string }
    | { type: 'EVOLVE'; followerIndex: number; useSep: boolean; targetId?: string }
    | { type: 'ATTACK'; attackerIndex: number; targetIndex: number; targetIsLeader: boolean }
    | { type: 'END_TURN' };
```

### 行動評価スコア
各行動に優先度スコアを付与し、最高スコアの行動を選択。

| 行動 | 基本スコア | 条件 |
|------|-----------|------|
| リーサル攻撃 | 1000 | 勝利確定 |
| 守護除去スペル | 500 | 守護をスペルで処理可能 |
| 超進化（盞華） | 400 | スペル生成 |
| 守護攻撃（必殺） | 350 | BANE持ちで守護処理 |
| 守護攻撃（通常） | 300 | 守護を攻撃で処理 |
| 脅威除去進化 | 280 | 進化効果で脅威を除去 |
| 疾走フォロワー | 250 | リーダー直接ダメージ |
| 通常攻撃（リーダー） | 200 | リーダーへダメージ |
| フォロワー召喚 | 100-150 | 盤面展開 |
| スペル（非守護） | 80 | 通常スペル |
| 通常攻撃（フォロワー） | 50 | トレード |

### メインループ
```typescript
const runAiTurn = async () => {
    let actionCount = 0;
    const MAX_ACTIONS = 30; // 無限ループ防止

    while (actionCount < MAX_ACTIONS) {
        // 1. 全ての可能な行動を列挙
        const actions = enumerateAllActions(gameStateRef.current);

        // 2. 行動がなければターン終了
        if (actions.length === 0) break;

        // 3. 各行動を評価してスコアリング
        const scoredActions = actions.map(action => ({
            action,
            score: evaluateAction(action, gameStateRef.current)
        }));

        // 4. 最高スコアの行動を選択
        scoredActions.sort((a, b) => b.score - a.score);
        const bestAction = scoredActions[0];

        // 5. スコアが0以下なら終了（やる価値なし）
        if (bestAction.score <= 0) break;

        // 6. 行動を実行
        await executeAction(bestAction.action);
        await waitForIdle(300);

        actionCount++;
    }

    // ターン終了
    dispatch({ type: 'END_TURN', playerId: opponentPlayerId });
};
```

### 行動列挙（enumerateAllActions）
```typescript
function enumerateAllActions(state): AIAction[] {
    const actions: AIAction[] = [];

    // カードプレイ
    for (const [idx, card] of aiHand.entries()) {
        if (canPlayCard(card, state)) {
            actions.push({ type: 'PLAY_CARD', cardIndex: idx });
        }
    }

    // 進化
    for (const [idx, follower] of aiBoard.entries()) {
        if (canEvolve(follower, state)) {
            actions.push({ type: 'EVOLVE', followerIndex: idx, useSep: false });
        }
        if (canSuperEvolve(follower, state)) {
            actions.push({ type: 'EVOLVE', followerIndex: idx, useSep: true });
        }
    }

    // 攻撃
    for (const [idx, follower] of aiBoard.entries()) {
        if (canAttack(follower)) {
            const targets = getValidAttackTargets(follower, state);
            for (const target of targets) {
                actions.push({
                    type: 'ATTACK',
                    attackerIndex: idx,
                    targetIndex: target.index,
                    targetIsLeader: target.isLeader
                });
            }
        }
    }

    return actions;
}
```

### 行動評価（evaluateAction）
```typescript
function evaluateAction(action: AIAction, state): number {
    switch (action.type) {
        case 'ATTACK':
            return evaluateAttack(action, state);
        case 'PLAY_CARD':
            return evaluatePlayCard(action, state);
        case 'EVOLVE':
            return evaluateEvolve(action, state);
    }
}

function evaluateAttack(action, state): number {
    const attacker = aiBoard[action.attackerIndex];

    // リーダー攻撃でリーサル
    if (action.targetIsLeader && attacker.currentAttack >= playerHp) {
        return 1000;
    }

    // リーダー攻撃
    if (action.targetIsLeader) {
        return 200 + attacker.currentAttack * 10;
    }

    // 守護攻撃（必殺）
    const target = playerBoard[action.targetIndex];
    if (target.passiveAbilities.includes('WARD')) {
        if (attacker.passiveAbilities.includes('BANE')) {
            return 350;
        }
        return 300;
    }

    // 通常フォロワー攻撃
    return 50;
}

function evaluatePlayCard(action, state): number {
    const card = aiHand[action.cardIndex];

    // 守護除去スペル（盞華のスペル等）
    if (isWardRemovalSpell(card, state)) {
        return 500;
    }

    // 疾走フォロワー
    if (card.type === 'FOLLOWER' && card.passiveAbilities.includes('STORM')) {
        return 250;
    }

    // 通常フォロワー
    if (card.type === 'FOLLOWER') {
        return 100 + card.currentAttack * 5;
    }

    // 通常スペル
    return 80;
}

function evaluateEvolve(action, state): number {
    const follower = aiBoard[action.followerIndex];

    // 盞華超進化（スペル生成）
    if (action.useSep && follower.id === 'SENKA') {
        // 守護がいる場合は最優先
        if (hasWard(state)) return 400;
        return 280;
    }

    // 除去効果付き進化
    if (hasRemovalEffect(follower)) {
        return 280;
    }

    return 200;
}
```

## 実装計画

### Phase 1: 基盤実装
1. `AIAction` 型定義
2. `enumerateAllActions` 関数
3. `evaluateAction` 関数
4. メインループ

### Phase 2: 既存コード移行
1. 現在のカードプレイロジックを `evaluatePlayCard` に移行
2. 現在の攻撃ロジックを `evaluateAttack` に移行
3. 現在の進化ロジックを `evaluateEvolve` に移行

### Phase 3: テスト・調整
1. 動作確認
2. スコア調整
3. エッジケース対応

## 期待される改善

1. **盞華問題の解決**: 超進化→スペル→攻撃が自然に行える
2. **柔軟な行動順序**: 攻撃→カードプレイ→攻撃が可能
3. **最適化**: 常に最も価値の高い行動を選択

## 注意事項

- 既存のデッキ固有ロジック（SENKA, YORUKA等）は評価関数に組み込む
- 難易度による評価差は `evaluateAction` 内で調整
- 無限ループ防止のため `MAX_ACTIONS` を設定
