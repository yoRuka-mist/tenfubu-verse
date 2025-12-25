# 修正内容の確認 - 進化制限の適用

## 問題
通信対戦時に、1ターンに1回までの進化制限が正しく機能していませんでした：
- 自分の画面では進化アニメーションが開始される
- アニメーション終了後に進化前の状態に戻る
- 相手側では正しくEPが消費され、進化後のスタッツで表示される
- これにより状態の同期ずれが発生していました

## 原因
`handleEvolveMouseDown` 関数で、超進化（SEP使用）時に `player.canEvolveThisTurn` のチェックが不足していました。
- 通常進化: `canEvolve` 関数で正しくチェック
- 超進化: `player.sep <= 0` のみチェック（ターン制限の確認が欠落）

## 修正内容

### 1. `canSuperEvolve` のインポート追加
```typescript
import { canEvolve, canSuperEvolve } from '../core/abilities';
```

### 2. `handleEvolveMouseDown` の修正
超進化時に `canSuperEvolve` 関数を使用するように変更：
```typescript
if (useSepFlag) {
    // Check super evolve conditions (includes canEvolveThisTurn check)
    if (!canSuperEvolve(player, gameState.turnCount, isFirstPlayer)) return;
} else {
    // Check normal evolve conditions (includes canEvolveThisTurn check)
    if (!canEvolve(player, gameState.turnCount, isFirstPlayer)) return;
}
```

### 3. UI表示の修正
`canSuperEvolveUI` 変数を追加し、SEPボタンのカーソル表示とグロー効果を制御：
```typescript
const canSuperEvolveUI = player?.canEvolveThisTurn && player.sep > 0 && gameState.activePlayerId === currentPlayerId && gameState.turnCount >= (isPlayerFirstPlayer ? 7 : 6);
```

SEPボタンのカーソルと視覚効果を更新：
- カーソル: `canSuperEvolveUI ? 'grab' : 'default'`
- グロー: `canSuperEvolveUI` 時のみ強調表示

## 確認事項
- [x] 1ターンに進化/超進化を合計1回のみ実行可能
- [x] 既に進化した後は、EP/SEPボタンからドラッグ不可（カーソルがデフォルト）
- [x] 通信対戦で同期ずれが発生しない
- [x] アニメーションが開始される前に制限チェックが実行される

## 技術的詳細
`canEvolve` と `canSuperEvolve` 関数（`abilities.ts`）は以下をチェックします：
1. `player.canEvolveThisTurn`: ターン毎の進化フラグ
2. `player.evolutionsUsed`: 総進化回数（通常進化のみ）
3. `player.sep`: SEP残数（超進化のみ）
4. `turnCount`: ターン数の条件（先攻/後攻で異なる）

これらのチェックをUI側で事前に行うことで、不要なアニメーション開始と状態の不整合を防ぎます。
