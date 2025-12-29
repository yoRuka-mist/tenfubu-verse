# 修正内容の確認・記録 (Walkthrough)

## 修正日
2025年12月28日

## 修正内容
### カード説明文の表記ゆれ統一
- **対象ファイル**: `game/src/core/engine.ts`
- **内容**: `MOCK_CARDS` 内の全カード（およびトークン）の `description` を以下のルールに従って修正。
  - パッシブ能力（[疾走], [守護]等）を `[]` で囲む。
  - トリガー（ファンファーレ：等）の後に全角コロンを使用。
  - 「点ダメージ」を「ダメージ」に統一。
  - 「場に出す」を「1体を出す」に統一。
  - 「2枚ドロー」を「カードを2枚引く」に統一。
  - 文末に必ず `。` を付ける。

## 修正箇所の確認
- `game/src/core/engine.ts` の `MOCK_CARDS` 配列内の各要素が、新しいフォーマットに更新されていることを目視で確認。
- カードの効果（`triggers`）と説明文の内容に矛盾がないことを再確認。

## 構造の記録
- `game/src/core/engine.ts`
  - 8行目 - `MOCK_CARDS`: 今回の修正対象。
  - 修正後の各カードの `description` プロパティが統一された表現になっている。

---

## 修正日
2025年12月29日

## 修正内容

### yoRukaデッキの実装
- **対象ファイル**: `game/src/core/types.ts`, `game/src/core/engine.ts`, `game/src/screens/ClassSelectScreen.tsx`, `game/src/screens/GameScreen.tsx`

#### 1. ClassTypeにYORUKAを追加
- `types.ts`: ClassTypeに`'YORUKA'`を追加

#### 2. YORUKA_DECK_TEMPLATE作成
- `engine.ts` 901行目～: 40枚のyoRukaデッキテンプレートを定義
  - c_yoruka, c_y, c_haruka, c_yuka, c_setsuna, s_hyakkiyako, s_keishou等

#### 3. createPlayer関数の更新
- `engine.ts` 956行目: クラスに応じたデッキテンプレート選択を三項演算子で分岐
  ```typescript
  const template = cls === 'SENKA' ? SENKA_DECK_TEMPLATE :
                   cls === 'AJA' ? AJA_DECK_TEMPLATE : YORUKA_DECK_TEMPLATE;
  ```

#### 4. クラス選択画面の隠し要素追加
- `ClassSelectScreen.tsx`:
  - 15行目: `yorukaSecretImg`を追加（yoRuka_leader.png）
  - 29行目: `showSecretHover` stateを追加
  - 132-175行目: 右下に隠しキャラクター要素を追加
    - 通常時:「ほぼAIで作りました」表示
    - ホバー時:「🎮 yoRukaデッキで参戦！」表示
    - クリックで`onSelectClass('YORUKA')`を発火

#### 5. CPU対戦時の相手クラス選択ロジック
- `GameScreen.tsx` 1421-1426行目:
  - プレイヤーがYORUKAの場合、CPUはSENKAかAJAをランダム選択
  ```typescript
  const opponentClass: ClassType = propOpponentClass || (() => {
      if (playerClass === 'YORUKA') {
          return Math.random() < 0.5 ? 'SENKA' : 'AJA';
      }
      return playerClass === 'SENKA' ? 'AJA' : 'SENKA';
  })();
  ```

#### 6. リーダースキンの対応
- `GameScreen.tsx` 19行目: `yorukaLeaderImg`定義を追加
- `GameScreen.tsx` 22-26行目: `getLeaderImg(cls)`ヘルパー関数を追加
- 4562行目、5083行目: リーダー画像表示を`getLeaderImg()`を使用するように変更

## 構造の記録（更新）
- `game/src/core/types.ts`
  - 1行目: `ClassType = 'SENKA' | 'AJA' | 'YORUKA'`

- `game/src/core/engine.ts`
  - 901-920行目: `YORUKA_DECK_TEMPLATE`
  - 956-957行目: クラスに応じたデッキ選択

- `game/src/screens/ClassSelectScreen.tsx`
  - 15行目: `yorukaSecretImg`
  - 29行目: `showSecretHover` state
  - 132-175行目: 隠しキャラクターUI

- `game/src/screens/GameScreen.tsx`
  - 19行目: `yorukaLeaderImg`
  - 22-26行目: `getLeaderImg()`
  - 1421-1426行目: CPU対戦時クラス選択
  - 4562行目、5083行目: リーダー画像表示
