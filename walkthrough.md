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

---

## 修正日
2025年12月29日（バグ修正）

## 修正内容

### 1. ネクロマンス効果修正
- **問題**: 遙の超進化時のネクロマンス6によるALL_OTHER_FOLLOWERSバフが発動しなかった
- **原因**: BUFF_STATSのswitch文にALL_OTHER_FOLLOWERSケースが未実装
- **対策**: engine.ts 1794-1815行目にALL_OTHER_FOLLOWERSの処理を追加

### 2. ラストワード発動修正
- **問題**: yoRukaが破壊されてもラストワードで再召喚されなかった
- **原因**: GameScreen.tsxのisSummonEffect判定にSUMMON_CARD_RUSHが含まれていなかった
- **対策**: GameScreen.tsx 1770行目でSUMMON_CARD_RUSHも判定に追加

### 3. 墓地枚数表示位置修正
- **問題**: 墓地枚数がプレイボタンと被っていた
- **対策**:
  - プレイヤー側: 手札枚数表示の右に移動（5315-5350行目）
  - 相手側: 手札カードの横に移動（4626-4654行目）

### 4. 画像パス修正
- **問題**: yoRukaリーダー画像が表示されなかった
- **原因**: `/cards/yoRuka_leader.png`を参照していたが、実際は`/leaders/yoRuka_leader.png`
- **対策**:
  - ClassSelectScreen.tsx 15行目
  - GameScreen.tsx 19行目

## 構造の記録（更新）
- `game/src/core/engine.ts`
  - 1794-1815行目: BUFF_STATS の ALL_OTHER_FOLLOWERS ケース追加

- `game/src/screens/GameScreen.tsx`
  - 1770行目: isSummonEffect に SUMMON_CARD_RUSH 追加
  - 5315-5350行目: 手札枚数+墓地枚数の統合表示
  - 4626-4654行目: 相手の手札+墓地枚数の統合表示

---

## 修正日
2025年12月29日（バグ修正続き）

## 修正内容

### 5. クラス選択画面のyoRuka画像修正
- **問題**: yoRukaの画像が丸枠で囲まれていた、ホバー効果が不要だった
- **原因**: リーダー画像を使用し、ホバー効果を追加していた
- **対策**:
  - `ClassSelectScreen.tsx` 15行目: 画像パスを`/cards/yoruka_secret.png`に変更
  - `showSecretHover`stateとホバー効果を削除
  - 表示を常に「ほぼAIで作りました」に固定

### 6. ラストワード処理の遅延発動修正
- **問題**: 刹那のラストワードが破壊時に発動せず、別の処理（ターン終了やカードプレイ）時に発動していた
- **原因**:
  - ATTACK処理内で`triggerLastWordInAttack`関数が重複定義されていた
  - pendingEffects監視のuseEffectが非同期実行のため、ATTACKアクション直後に発火しないケースがあった
- **対策**:
  - `engine.ts` 2636-2650行目の重複定義を削除（2558-2572行目の定義を使用）
  - `GameScreen.tsx` waitForIdle関数内で、pendingEffectsが滞留している場合に強制的にRESOLVE_EFFECTをdispatchする処理を追加（3010-3023行目）

### デバッグログ追加
- `GameScreen.tsx` 1716-1734行目: pendingEffects処理のuseEffectにデバッグログを追加
- `engine.ts` triggerLastWordInAttack内: ラストワード発動時のログを追加

## 構造の記録（更新）
- `game/src/screens/ClassSelectScreen.tsx`
  - 15行目: `yorukaSecretImg`を`/cards/yoruka_secret.png`に変更
  - `showSecretHover`stateを削除
  - 隠しキャラクターUIを簡素化

- `game/src/core/engine.ts`
  - 2558-2572行目: triggerLastWordInAttack関数定義（ATTACK内用）
  - 2636行目: 重複定義削除コメント

- `game/src/screens/GameScreen.tsx`
  - 1716-1734行目: pendingEffects処理のデバッグログ追加
  - 3010-3023行目: waitForIdle内でpendingEffects強制処理ロジック追加

## 失敗と学び
- **失敗1**: triggerLastWordInAttack関数の重複定義
  - 原因推測: if/elseブロックのスコープ問題を解決しようとして、両方のブロックで使えるように外に定義したが、elseブロック内の古い定義を削除し忘れた
  - 教訓: 関数定義の変更時は、重複がないか確認する

- **失敗2**: useEffectの発火タイミング問題
  - 原因推測: Reactのstateが変わればuseEffectが発火すると考えたが、非同期処理のタイミングで発火しないケースがあった
  - 教訓: useEffectは必ず発火するとは限らない。重要な処理は明示的にトリガーする仕組みも必要

---

## 修正日
2025年12月29日（UI/機能改善）

## 修正内容

### 7. 必殺(BANE)の即死効果改善
- **変更**: 必殺による即死は効果による破壊扱いとし、白ツバキの無効化やバリアを貫通するように修正
- **対象ファイル**: `game/src/core/engine.ts`
- **対策**:
  - 2606-2611行目: 攻撃者の必殺チェックから`actualDamage > 0`条件を削除
  - 2631-2636行目: 防御者の必殺チェックから`counterDamage > 0`条件を削除

### 8. タイトル画面のレイアウト調整
- **変更**: タイトル「てんふぶバース」を画面中央に、メニューボタンを画面下側に配置
- **対象ファイル**: `game/src/screens/TitleScreen.tsx`
- **対策**:
  - Flexboxのspacerを使用してタイトルを中央に配置
  - ボタングループを下部に固定配置
  - paddingTop/paddingBottomでマージン調整

### 9. バフ効果の表示改善
- **変更**: バフ効果（BUFF_STATS）発動時に、攻撃力・体力の増加値を分けて黄色で表示
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **対策**:
  - 162-256行目: BuffEffectVisualコンポーネントを追加
    - 黄色のグロー効果とスパークルパーティクル
    - 攻撃力増加を赤色(+X)、体力増加を緑色(+Y)で表示
    - +0の場合も表示
  - 1631-1639行目: ActiveEffectStateにBUFFタイプとatkBuff/hpBuffプロパティを追加
  - 1708-1741行目: playBuffEffect関数を追加
  - 2000-2035行目: pendingEffects処理でBUFF_STATS効果を検出してバフエフェクトを表示
  - 5729-5749行目: activeEffectsのレンダリングでBUFFタイプ時にBuffEffectVisualを使用

## 構造の記録（更新）
- `game/src/core/engine.ts`
  - 2606-2611行目: 必殺（攻撃者）の即死効果
  - 2631-2636行目: 必殺（防御者）の即死効果

- `game/src/screens/TitleScreen.tsx`
  - 94-192行目: コンテンツ全体のレイアウト（中央タイトル＋下部ボタン）

- `game/src/screens/GameScreen.tsx`
  - 162-256行目: BuffEffectVisualコンポーネント
  - 1631-1639行目: ActiveEffectStateインターフェース
  - 1708-1741行目: playBuffEffect関数
  - 1914行目: isBuffEffectType判定
  - 2000-2035行目: BUFF_STATS効果のビジュアル処理
  - 5729-5749行目: BUFFエフェクトのレンダリング

---

## 修正日
2025年12月29日（BGM追加）

## 修正内容

### 10. タイトル・クラス選択画面BGM追加
- **変更**: タイトル画面とクラス選択画面で`tenfubu.mp3`を再生
- **対象ファイル**: `game/src/App.tsx`
- **対策**:
  - App.tsxでBGM管理を一元化（画面遷移時にBGMが途切れないように）
  - 36-47行目: BGMオーディオ要素の初期化
  - 49-66行目: 画面遷移に応じたBGM再生/停止制御
  - 68-78行目: autoplay policy対応のクリックイベントハンドラ
  - TITLEとCLASS_SELECT画面でBGMを継続再生
  - LOBBY/GAME画面ではBGMを停止

## 構造の記録（更新）
- `game/src/App.tsx`
  - 9-17行目: getAssetUrl関数とBGM URL定義
  - 33-78行目: タイトルBGM管理（初期化、画面遷移制御、autoplay対応）

- `game/src/screens/TitleScreen.tsx`
  - BGM関連コードを削除（App.tsxで管理）
  - 57-162行目: コンテンツ全体のレイアウト（中央タイトル＋下部ボタン）

- `game/src/screens/ClassSelectScreen.tsx`
  - BGM関連コードを削除（App.tsxで管理）

---

## 修正日
2025年12月29日（バランス調整）

## 修正内容

### 11. yoRukaデッキのバランス調整
- **対象ファイル**: `game/src/core/engine.ts`, `game/src/core/types.ts`

#### yoRuka
- ラストワードにネクロマンス4を追加
- 変更前: 「ラストワード：「yoRuka」1体を場に出す。」
- 変更後: 「ラストワード：ネクロマンス 4：「yoRuka」1体を場に出す。」

#### 遙
- ファンファーレで「刹那」も召喚するように変更
- 超進化時の「刹那」召喚を2体→1体に変更
- 変更後: 「ファンファーレ：「悠霞」を場に出す。それは[突進]を得る。「刹那」を1体場に出す。」
- 変更後: 「超進化時：「刹那」を1体場に出す。ネクロマンス 6：...」

#### 刹那
- ラストワードを「ドロー」から「攻撃力-1」に変更
- 変更前: 「ラストワード：1枚ドローする。墓地を1増やす。」
- 変更後: 「ラストワード：相手のランダムなフォロワーの攻撃力を-1する。墓地を1増やす。」

#### 悠霞
- ファンファーレを追加
- 進化時のダメージを2→3に変更
- 追加: 「ファンファーレ：「刹那」を1体場に出す。カードを1枚引く。」
- 変更後: 「進化時：相手のランダムなフォロワー1体に3ダメージ。これを2回行う。」

#### 継承される力
- 効果を変更（新効果タイプDESTROY_AND_GENERATEを追加）
- 変更前: 「相手のフォロワー1体を破壊する。破壊したフォロワーを自分の場に出す。」
- 変更後: 「相手のフォロワー1体を破壊する。破壊したフォロワーを自分の手札に加え、そのコストを-9する。」

## 構造の記録（更新）
- `game/src/core/types.ts`
  - 10行目: EffectTypeにDESTROY_AND_GENERATEを追加

- `game/src/core/engine.ts`
  - 700-726行目: yoRukaカード定義（ネクロマンス4追加）
  - 727-752行目: 遙カード定義（ファンファーレ・超進化時変更）
  - 753-771行目: 刹那カード定義（ラストワード変更）
  - 772-797行目: 悠霞カード定義（ファンファーレ追加・進化時変更）
  - 813-826行目: 継承される力カード定義（効果変更）
  - 1614-1641行目: DESTROY_AND_GENERATE効果の処理実装
