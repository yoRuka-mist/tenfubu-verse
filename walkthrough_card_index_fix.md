# 修正内容の確認 - カードインデックス問題の修正

## 報告された問題

1. **クエイクハウリング使用時の不具合**
   - せんかの超進化時に手札に加わる「クエイクハウリング」を使用すると、なぜか使っていない「バックハンドスマッシュ」が消えてしまう

2. **翼使用時の不具合**
   - 「翼」を使用する時に、他のカードを同時にプレイしてしまい効果を発動できなかった

## 原因分析

### 根本的な問題
従来は**配列インデックス**を使ってカードを特定していましたが、以下の状況で問題が発生していました：

1. **手札に新しいカードが追加される場合**（例：超進化時のGENERATE_CARD効果）
   - せんか超進化 → フリッカージャブ、クエイクハウリング、バックハンドスマッシュが追加される
   - 手札の順序が変わり、元のインデックスが指すカードが変わってしまう

2. **ターゲット選択中に手札が変化する場合**
   - 選択開始時のインデックス（例：2番目）が保存される
   - カードが追加されると、2番目のカードが変わってしまう
   - ターゲット選択完了時に**間違ったカードがプレイされる**

### 具体的なコード問題

**従来のコード（engine.ts）:**
```typescript
const { cardIndex, targetId } = action.payload;
const card = player.hand[cardIndex];  // ← インデックスで直接アクセス
player.hand.splice(cardIndex, 1);      // ← インデックスで削除
```

**従来のコード（GameScreen.tsx）:**
```typescript
// ターゲット選択開始時
setTargetingState({ type: 'PLAY', sourceIndex: index, ... });

// ターゲット選択完了時
const animCard = currentPlayer.hand[index];  // ← 古いインデックスを使用
```

## 修正内容

### 1. エンジン側（engine.ts）の修正

`PLAY_CARD`アクションで**instanceId**を使って正しいカードを特定：

```typescript
const { cardIndex, targetId, instanceId } = action.payload;

// instanceIdを使って実際のインデックスを検索
let actualCardIndex = cardIndex;
if (instanceId) {
    const foundIndex = player.hand.findIndex(c => c.instanceId === instanceId);
    if (foundIndex >= 0) {
        actualCardIndex = foundIndex;
        console.log(`Using instanceId ${instanceId}, found at index ${foundIndex} (was ${cardIndex})`);
    }
}

const card = player.hand[actualCardIndex];
player.hand.splice(actualCardIndex, 1);
```

### 2. UI側（GameScreen.tsx）の修正

#### handlePlayCard
ターゲット選択状態に`sourceInstanceId`を追加：

```typescript
if (needsTarget && hasValidTargets) {
    setTargetingState({ 
        type: 'PLAY', 
        sourceIndex: index,
        sourceInstanceId: card.instanceId,  // ← 追加
        allowedTargetPlayerId 
    });
    // ...
}
```

#### handleTargetClick
`sourceInstanceId`を使って正しいカードを取得：

```typescript
let index = targetingState.sourceIndex;
let animCard = currentPlayer.hand[index];

// instanceIdで再検索
if (targetingState.sourceInstanceId) {
    const foundIndex = currentPlayer.hand.findIndex(
        c => c.instanceId === targetingState.sourceInstanceId
    );
    if (foundIndex >= 0) {
        index = foundIndex;
        animCard = currentPlayer.hand[foundIndex];
        console.log(`Using sourceInstanceId, found at ${foundIndex} (was ${sourceIndex})`);
    }
}
```

## 修正の効果

- ✅ **クエイクハウリング**を使っても正しいカードが使用される
- ✅ **翼**を使っても正しいカードが使用される
- ✅ 超進化などでカードが生成されても、ターゲット選択中のカードが正しく特定される
- ✅ 手札の順序が変わっても影響を受けない
- ✅ すべてのターゲット選択カードで安定動作

## 技術的詳細

**instanceIdの利点:**
- 各カードに一意の識別子
- 手札の順序変化に影響されない
- デバッグログで追跡が容易

**処理フロー:**
1. ユーザーがカードをドラッグ/クリック → `instanceId`を保存
2. ターゲット選択 → `instanceId`を保持
3. プレイアクション → `instanceId`で再検索して正しいインデックスを取得
4. エンジンで処理 → `instanceId`で再度確認

これにより、手札の状態が変化する複雑な状況でも確実に正しいカードが使用されます。
