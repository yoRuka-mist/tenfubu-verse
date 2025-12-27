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

## 修正箇所の確認
- `game/src/core/engine.ts` の61行目付近（ルイ・ユー）および470行目付近（sara）の修正を確認。

## 構造の記録（目次代わり）
- `game/src/core/engine.ts`
  - 8行目 - `MOCK_CARDS`: カード定義配列
  - 60行目 - `c_ruiyu` (ルイ・ユー): スタッツおよびエフェクト修正箇所
  - 466行目 - `c_sara` (sara): 進化時イラスト修正箇所
- `game/src/core/types.ts`
  - 44行目 - `AttackEffectType`: エフェクト定数定義
- `game/src/screens/GameScreen.tsx`
  - 164行目 - `isSprite`: スプライト判定
  - 207行目 - SE再生分岐
  - 234行目 - 画像パス定義
  - 1289行目 - 状態型定義
