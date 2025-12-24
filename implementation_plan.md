# 実装計画 - カードアニメーション改善

## 現在の実装タスク（2025-12-23）

### 1. カードプレイアニメーションの位置修正 ✅
**問題**: カードプレイ時の表示位置がリーダーの位置よりも右にズレている

**原因**: 
- `targetX` の計算が `sidebarWidth + (window.innerWidth - sidebarWidth) / 2` となっている
- これはボードエリア全体の中央を指しているが、リーダーの中央軸とは異なる

**修正方法**:
```typescript
// 修正前（1613行目）
const targetX = sidebarWidth + (window.innerWidth - sidebarWidth) / 2;

// 修正後
// プレイヤーリーダーのX座標を基準にする
// リーダーは画面下部中央に配置されているため、その座標を使用
const targetX = window.innerWidth / 2; // または正確なリーダー位置を参照
```

**影響範囲**:
- `handlePlayCard` 関数（1613行目）
- CPU側のカードプレイ処理（該当箇所を確認）

---

### 2. カードプレイ時のサイズ拡大 ✅
**問題**: カードが小さすぎる

**修正方法**:
- アニメーションのスケールを `1.0` から `2.0` に変更
- キーフレーム定義（3442行目、3448行目付近）を修正

```css
/* 修正前 */
50% { transform: translate(0, 0) translate(-50%, -50%) scale(1.0); opacity: 1; }

/* 修正後 */
50% { transform: translate(0, 0) translate(-50%, -50%) scale(2.0); opacity: 1; }
```

---

### 3. フォロワーカードの着地アニメーション追加 ✅
**問題**: フォロワーが瞬間的に消えて盤面に瞬間的に出現する

**修正方法**:
1. `playingCardAnim` の型定義に `targetBoardIndex` を追加
2. アニメーション完了時に盤面の目標位置を計算
3. キーフレームを3段階に分割:
   - 0-40%: 手札から中央へ移動・拡大
   - 40-60%: 中央で表示（ホールド）
   - 60-100%: 中央から盤面位置へ移動・縮小

```typescript
// 型定義の拡張
const [playingCardAnim, setPlayingCardAnim] = React.useState<{
    card: any;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    boardTargetX?: number; // 盤面の最終位置
    boardTargetY?: number;
    onComplete: () => void;
} | null>(null);
```

**キーフレーム例**:
```css
@keyframes playCardToBoard {
    0% { transform: translate(startX, startY) scale(0.2); }
    40% { transform: translate(0, 0) scale(2.0); } /* 中央で拡大 */
    60% { transform: translate(0, 0) scale(2.0); } /* ホールド */
    100% { transform: translate(boardX, boardY) scale(0.25); } /* 盤面へ */
}
```

---

### 4. 進化アニメーション：光の剥がれタイミング修正 ✅
**問題**: 回転後から光が剥がれるまでが長く、進化後イラストが見えにくい

**修正箇所**: `EvolutionAnimation` の `REVEAL` フェーズ（488-502行目）

**修正方法**:
```typescript
// 修正前
case 'REVEAL':
    let revealProgress = 0;
    intervalId = setInterval(() => {
        revealProgress += 0.06; // 遅い
        setWhiteness(Math.max(1 - revealProgress, 0));
        setGlowIntensity(Math.max(60 - revealProgress * 60, 0));
        // ...
    }, 40);

// 修正後
case 'REVEAL':
    let revealProgress = 0;
    intervalId = setInterval(() => {
        revealProgress += 0.15; // 2.5倍速く
        setWhiteness(Math.max(1 - revealProgress, 0));
        setGlowIntensity(Math.max(60 - revealProgress * 60, 0));
        // ...
    }, 40);
```

または、FLIPフェーズの終了時に即座に光を消す方法も検討。

---

### 5. GENERATE_CARDアニメーションの移動先修正 ✅
**問題**: 手札に加える系の効果で、Y座標のみ移動し、相手/自分の手札位置に正しく移動しない

**現在の実装**（1064-1084行目）:
```typescript
if (current.effect.type === 'GENERATE_CARD' && current.effect.targetCardId) {
    // Phase 1: Float at center
    setTimeout(() => {
        setAnimatingCard(prev => prev ? { ...prev, status: 'FLY' } : null);
        // Phase 2: Fly to hand (Y座標のみ)
    }, 1000);
}
```

**修正方法**:
1. `sourcePlayerId` を確認して、自分/相手を判定
2. 目標座標を計算:
   - 自分の手札: 画面下部中央
   - 相手の手札: 画面上部中央
3. X座標とY座標の両方を移動

```typescript
// 目標座標の計算
const isPlayerCard = current.sourcePlayerId === currentPlayerId;
const targetX = window.innerWidth / 2; // 中央
const targetY = isPlayerCard 
    ? window.innerHeight - 150 // 自分の手札（下部）
    : 150; // 相手の手札（上部）
```

**アニメーションCSS**:
```css
@keyframes flyToHand {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(targetX, targetY) scale(0.5); opacity: 0; }
}
```

---

### 6. 進化アニメーション着地時の角度修正 ✅
**問題**: 着地時にカードが少し傾いている（完全に0度になっていない）

**原因**: `ZOOM_OUT` フェーズで `rotateY` を0に戻しているが、微小な誤差が残っている可能性

**修正箇所**: `ZOOM_OUT` フェーズ（504-534行目）

**確認ポイント**:
1. `setRotateY(0)` が確実に実行されているか
2. `chargeRotate` が0にリセットされているか
3. CSSの `transform` に他の回転が含まれていないか

**修正方法**:
```typescript
case 'ZOOM_OUT':
    // ... existing code ...
    if (progress >= 1) {
        if (intervalId) clearInterval(intervalId);
        setRotateY(0); // 確実に0
        setChargeRotate(0); // これも0に
        setScale(0.25);
        onPhaseChangeRef.current('LAND');
    }
```

**カードコンテナのCSS確認**（655-664行目）:
```typescript
transform: `translate(-50%, -50%) scale(${scale}) perspective(1200px) rotateY(${totalRotateY}deg)`,
```
- `totalRotateY` が確実に0になっているか確認

---

## 実装順序

1. ✅ カードプレイ位置修正（最も簡単）
2. ✅ カードサイズ拡大（簡単）
3. ✅ 進化アニメーション光の剥がれ（中）
4. ✅ 進化アニメーション着地角度（中）
5. ✅ GENERATE_CARDアニメーション（やや複雑）
6. ✅ フォロワー着地アニメーション（最も複雑）

---

## テスト項目

- [ ] フォロワーカードをプレイ → 中央に大きく表示 → 盤面に着地
- [ ] スペルカードをプレイ → 中央に大きく表示 → 消滅
- [ ] 進化実行 → 光が回転と同時に剥がれる → 着地時に角度0度
- [ ] 手札に加える効果 → 自分の手札に斜めに移動
- [ ] 相手が手札に加える効果 → 相手の手札に斜めに移動
- [ ] カード表示位置がリーダーと揃っている

---

## 以前の実装計画（アーカイブ）

### フェーズ1: 簡単な修正
- [x] GAME START表示時間を2秒に短縮
- [x] GAME START表示中はターン終了操作をブロック
- [x] CPU戦で相手が反対クラスを使用するように変更

### フェーズ2: 視覚効果の改善
- [x] SEPドラッグ時の矢印・点線・光の玉を紫色に変更
- [x] EP/SEPドラッグ時の選択円にグロー効果を追加
- [x] 進化時のカード後ろのグロー効果（EP:黄色、SEP:紫）

### フェーズ3: 進化アニメーションの改善
- [x] EP/SEPから対象カードへ曲線パスで光の玉が移動するアニメーション

### フェーズ4: 先攻後攻選択システム
- [x] コイントスシステム実装
- [x] 後攻の場合は相手が先攻になるように修正
### 7. カードプレイ/破壊/進化アニメーションの調整 (2025-12-23) ✅
**目的**: ユーザーフィードバックに基づくアニメーションの違和感解消

**実装内容**:
1.  **手札からのプレイ時フェードイン削除** ✅
    *   **修正前**: 手札からプレイしてもボードに出る際に `cardSummonAppear` (フェードイン) が再生されていた。
    *   **原因**: `isSpecialSummoning` 判定で、新たな `instanceId` が生成されるため「手札になかったカード」と誤認されていた。
    *   **修正方法**: `PLAY_CARD` アクションに `instanceId` を渡し、エンジン側で再利用させることで、手札にあったカードであることを追跡可能にする。

2.  **破壊エフェクトの変更** ✅
    *   **修正前**: 破壊時に `IMPACT` エフェクトも再生されていた。
    *   **修正方法**: `IMPACT` 再生処理を削除し、純粋に CSS の `card-dying` (発光フェードアウト) のみにする。

3.  **進化チャージ時間の延長** ✅
    *   **修正前**: チャージ時間が短縮されすぎていた (~1.4s)。
    *   **修正方法**: `EvolutionAnimation` の `WHITE_FADE` フェーズの閾値と速度を調整し、約1.9秒に延長。
