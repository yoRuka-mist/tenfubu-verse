# 修正内容の確認・記録 (Walkthrough)

## 修正日
2025年12月26日

## 修正内容
### ルイ・ユーのスタッツ変更
- **対象ファイル**: `game/src/core/engine.ts`
- **変更前**: `attack: 4, health: 4`
- **変更後**: `attack: 5, health: 5`
- **理由**: ユーザーリクエストによるゲームバランス調整。

### saraの進化時イラスト変更
- **対象ファイル**: `game/src/core/engine.ts`
- **変更前**: (進化時イラスト設定なし)
- **変更後**: `evolvedImageUrl: '/cards/sara_2.png'`
- **理由**: ユーザーリクエストによるイラスト更新。

### BLUE_FIREエフェクトの追加
- **対象ファイル**: `game/src/core/types.ts`, `game/src/screens/GameScreen.tsx`
- **内容**: 新規エフェクト `BLUE_FIRE` をスプライトアニメーションとして実装。画像は `/effects/blue_fire.png`、SEは `fire.mp3` を使用。
- **ルイ・ユーへの適用**: `game/src/core/engine.ts` で `c_ruiyu` のエフェクトを `WATER` から `BLUE_FIRE` に変更。
- **理由**: キャラクターイメージに合わせたエフェクトの更新。

### Yのカード調整
- **対象ファイル**: `game/src/core/engine.ts`
- **変更前**: `attack: 4, health: 4`
- **変更後**: `attack: 3, health: 3`
- **理由**: ゲームバランス調整。

## 修正箇所の確認
- `game/src/core/engine.ts` の61行目付近（ルイ・ユー）および470行目付近（sara）の修正を確認。

## 構造の記録（目次代わり）
- `game/src/core/engine.ts`
  - 8行目 - `MOCK_CARDS`: カード定義配列
  - 60行目 - `c_ruiyu` (ルイ・ユー): スタッツおよびエフェクト修正箇所
  - 83行目 - `c_y` (Y): スタッツ修正箇所
  - 466行目 - `c_sara` (sara): 進化時イラスト修正箇所
- `game/src/core/types.ts`
  - 44行目 - `AttackEffectType`: エフェクト定数定義
- `game/src/screens/GameScreen.tsx`
  - 164行目 - `isSprite`: スプライト判定
  - 207行目 - SE再生分岐
  - 234行目 - 画像パス定義
  - 1289行目 - 状態型定義

---

## 修正日
2025年12月28日

## 修正内容

### せんかのナックラー疾走付与修正
- **対象ファイル**: `game/src/core/engine.ts`
- **問題**: せんかをプレイしてもナックラーに疾走が付与されない
- **原因**: `GRANT_PASSIVE`効果の`ALL_FOLLOWERS`ターゲット計算時に、敵フォロワーを対象にしていた（1859-1866行目）
- **修正内容**:
  - `GRANT_PASSIVE`や`BUFF_STATS`効果は味方フォロワー（`selfPid`）を対象にするよう修正
  - ダメージ系効果（`AOE_DAMAGE`等）は敵フォロワー（`opponentPid`）を対象
  - デバッグログを追加（1269, 1276, 1414, 1417, 1420, 1432, 1444, 1807, 1815行目）
- **行数変動**: +10行

### 画面が上にズレる問題の修正
- **対象ファイル**: `game/src/screens/GameScreen.tsx`, `game/src/index.css`
- **問題**: ゲーム中に画面が上にズレる現象が発生
- **原因**: BattleLogコンポーネントで`scrollIntoView`を使用していたため、親要素もスクロールされていた
- **修正内容**:
  1. **GameScreen.tsx (405-456行目)**:
     - `scrollIntoView`を削除し、`containerRef.scrollTop = containerRef.scrollHeight`に変更
     - `endRef`ダミー要素を削除
  2. **index.css (12-21行目)**:
     - `html, body, #root`に`position: fixed`と`overflow: hidden`を追加
     - 完全にスクロールを防止するCSSを適用
- **行数変動**: +4行（index.css）, -2行（GameScreen.tsx）

## 構造の記録（目次更新）
- `game/src/core/engine.ts`
  - 1857-1869行目 - ファンファーレ効果キュー時のALL_FOLLOWERS対象計算
  - 1411-1445行目 - GRANT_PASSIVE効果のALL_FOLLOWERS処理
  - 1267-1278行目 - SUMMON_CARDでのせんかオーラチェック
  - 1803-1817行目 - PLAY_CARDでのせんかオーラチェック
- `game/src/screens/GameScreen.tsx`
  - 405-458行目 - BattleLogコンポーネント（scrollIntoView削除済み）
  - 3935-3954行目 - スクロール防止useLayoutEffect
- `game/src/index.css`
  - 12-21行目 - html/body/rootのスクロール防止CSS
