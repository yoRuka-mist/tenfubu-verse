# 実装計画書 - ルイ・ユーのスタッツ変更

## 概要
カード「ルイ・ユー」の基本スタッツ（攻撃力/体力）を現在の4/4から5/5に変更します。

## 修正対象ファイル
- `game/src/core/engine.ts`: カード定義（MOCK_CARDS）の更新

## 修正内容
### ルイ・ユー
1. `MOCK_CARDS` 配列内の `id: 'c_ruiyu'` を持つオブジェクトを特定する。
2. `attack` プロパティを `4` から `5` に変更する。
3. `health` プロパティを `4` から `5` に変更する。

### sara
1. `MOCK_CARDS` 配列内の `id: 'c_sara'` を持つオブジェクトを特定する。
2. `evolvedImageUrl` プロパティを追加または更新し、`'/cards/sara_2.png'` に設定する。

### BLUE_FIREエフェクト
1. `game/src/core/types.ts`: `AttackEffectType` に `'BLUE_FIRE'` を追加。
2. `game/src/screens/GameScreen.tsx`: 
    - `AttackEffect` コンポーネント内のスプライト判定リストに `'BLUE_FIRE'` を追加。
    - `AttackEffect` コンポーネント内のSE再生処理に `'BLUE_FIRE'` を追加（`fire.mp3`を使用）。
    - `AttackEffect` コンポーネント内の画像マッピングに `'/effects/blue_fire.png'` を追加。
    - `ActiveEffectState` 型定義に `'BLUE_FIRE'` を追加。
3. `game/src/core/engine.ts`: ルイ・ユー（`c_ruiyu`）の `attackEffectType` を `'BLUE_FIRE'` に変更。

### Yのカード調整
1. `MOCK_CARDS` 配列内の `id: 'c_y'` を持つオブジェクトを特定する。
2. `attack` プロパティを `4` から `3` に変更する。
3. `health` プロパティを `4` から `3` に変更する。

## 確認事項
- スタッツの変更が正しく反映されているか、コード上で確認する。
- 他のカードに影響を与えていないことを確認する。
