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

---

## 修正日
2025年12月29日（バグ修正2）

## 修正内容

### RANDOM_DAMAGEの複数ヒット時のターゲット再選択

#### 問題
- 悠霞の進化時効果「ランダムなフォロワー1体に3ダメージ。これを2回行う」で1回目でフォロワーを倒した際、2回目が発動しない
- 原因: 全てのエフェクトがキュー時に同じボード状態からターゲットを事前計算するため

#### 対応
- RANDOM_DAMAGEエフェクトはターゲットを事前計算せず、解決時に選択するように変更
- RANDOM_DESTROYとRANDOM_SET_HPは従来通り事前計算を維持

#### 修正箇所

##### EVOLVEケースのエフェクトキュー処理（2456-2470行目付近）
```typescript
// 変更前
if (e.type === 'RANDOM_DESTROY' || e.type === 'RANDOM_SET_HP' || e.type === 'RANDOM_DAMAGE') {
    const count = (e.type === 'RANDOM_DAMAGE') ? (e.value2 || 1) : (e.value || 1);
    // 全ターゲット事前計算
}

// 変更後
if (e.type === 'RANDOM_DESTROY' || e.type === 'RANDOM_SET_HP') {
    // RANDOM_DAMAGE is NOT pre-calculated here - it should select target at resolution time
    // This allows each RANDOM_DAMAGE effect to re-select targets after previous effects resolve
    const count = e.value || 1;
    // RANDOM_DAMAGEを除外してターゲット事前計算
}
```

##### PLAY_CARDケースのエフェクトキュー処理（2245-2259行目付近）
- 同様にRANDOM_DAMAGEをターゲット事前計算から除外

#### 動作確認
- 悠霞の進化時に2回の独立したRANDOM_DAMAGEエフェクトが順番に解決される
- 1回目のダメージでフォロワーが破壊されても、2回目は残りのフォロワーから新たにターゲットを選択

## 構造の記録（更新）
- `game/src/core/engine.ts`
  - 2245-2259行目: PLAY_CARDケースのRANDOM_DAMAGEターゲット事前計算除外
  - 2456-2470行目: EVOLVEケースのRANDOM_DAMAGEターゲット事前計算除外
  - 1435-1488行目: RANDOM_DAMAGE解決処理（変更なし、既に動的選択対応済み）

---

## 修正日
2025年12月29日（バグ修正3）

## 修正内容

### 必殺(BANE)と超進化の「自分のターン中に破壊されない」効果の相互作用

#### 問題
- 超進化フォロワーと必殺持ちが戦闘すると相打ちになっていた
- 超進化の「自分のターン中に破壊されない」効果は必殺を無効化するべき

#### 動作仕様
- 必殺はバリアや白ツバキの「交戦ダメージ無効」を貫通する
- ただし、超進化フォロワーの「自分のターン中に破壊されない」効果は貫通できない
- 自分のターン中に相手の必殺持ちから攻撃されても、超進化フォロワーは破壊されない

#### 修正箇所

##### 攻撃者の必殺処理（2646-2659行目付近）
```typescript
// 変更前
if (attacker.passiveAbilities?.includes('BANE') && defender.currentHealth > 0) {
    defender.currentHealth = 0;
    newState.logs.push(`　${attacker.name} の必殺効果で ${defender.name} は即死！`);
}

// 変更後
const defOwnerId = isAttackerP1 ? 'p2' : 'p1';
const defenderIsImmune = defender.passiveAbilities?.includes('IMMUNE_TO_DAMAGE_MY_TURN') &&
                         newState.activePlayerId === defOwnerId;
if (attacker.passiveAbilities?.includes('BANE') && defender.currentHealth > 0) {
    if (defenderIsImmune) {
        newState.logs.push(`　${defender.name} は自分のターン中は破壊されない！必殺を無効化！`);
    } else {
        defender.currentHealth = 0;
        newState.logs.push(`　${attacker.name} の必殺効果で ${defender.name} は即死！`);
    }
}
```

##### 防御者の必殺処理（2679-2692行目付近）
```typescript
// 変更前
if (defender.passiveAbilities?.includes('BANE') && attacker.currentHealth > 0) {
    attacker.currentHealth = 0;
    newState.logs.push(`　${defender.name} の必殺効果で ${attacker.name} は即死！`);
}

// 変更後
const attOwnerId = isAttackerP1 ? 'p1' : 'p2';
const attackerIsImmune = attacker.passiveAbilities?.includes('IMMUNE_TO_DAMAGE_MY_TURN') &&
                         newState.activePlayerId === attOwnerId;
if (defender.passiveAbilities?.includes('BANE') && attacker.currentHealth > 0) {
    if (attackerIsImmune) {
        newState.logs.push(`　${attacker.name} は自分のターン中は破壊されない！必殺を無効化！`);
    } else {
        attacker.currentHealth = 0;
        newState.logs.push(`　${defender.name} の必殺効果で ${attacker.name} は即死！`);
    }
}
```

#### 動作確認
- 自分のターンに超進化フォロワーで相手の必殺持ちを攻撃 → 超進化フォロワーは破壊されない
- 相手のターンに相手の必殺持ちがこちらの超進化フォロワーを攻撃 → 超進化フォロワーは破壊されない（自分のターン）
- 自分のターンに必殺持ちで相手の超進化フォロワーを攻撃 → 超進化フォロワーは破壊される（相手のターン）

## 構造の記録（更新）
- `game/src/core/engine.ts`
  - 2646-2659行目: 攻撃者の必殺処理（防御者の超進化保護チェック追加）
  - 2679-2692行目: 防御者の必殺処理（攻撃者の超進化保護チェック追加）

---

## 修正日
2025年12月29日（バグ修正4）

## 修正内容

### BUFF_STATSにRANDOM_FOLLOWERケースを追加

#### 問題
- 刹那のラストワード「相手のランダムなフォロワーの攻撃力を-1する」が機能していなかった
- 原因: BUFF_STATSの処理に`RANDOM_FOLLOWER`というtargetTypeのケースが存在しなかった

#### 対応
- BUFF_STATSの処理にRANDOM_FOLLOWERケースを追加（1867-1896行目）
- 相手のボードからランダムにフォロワーを選択してバフ/デバフを適用
- 攻撃力が0未満にならないように制限を追加
- ログ表示でマイナス値も正しく表示（「-1/+0」形式）

#### 修正箇所
```typescript
} else if (effect.targetType === 'RANDOM_FOLLOWER') {
    // 相手のランダムなフォロワー1体にバフ/デバフ
    const targetBoard = newState.players[opponentId].board;
    const validIndices = targetBoard.map((c, i) => c ? i : -1).filter(i => i !== -1);

    if (validIndices.length > 0) {
        const randomIdx = validIndices[Math.floor(rng() * validIndices.length)];
        const c = targetBoard[randomIdx]!;
        // バフ/デバフ適用処理...
    }
}
```

#### 補足：交戦相手の抽選対象について
- 刹那が交戦で死亡した場合、ラストワードはpendingEffectsにキューされる
- この時点で攻撃者はまだボード上にいるため、抽選対象に含まれる
- これは意図した動作（ラストワードは死亡時に発動するため、交戦相手を対象にできる）
- ただし、攻撃者も交戦で死亡した場合は、攻撃者の死亡処理が先に行われるため、抽選対象から外れる

## 構造の記録（更新）
- `game/src/core/engine.ts`
  - 1867-1896行目: BUFF_STATSのRANDOM_FOLLOWERケース追加

---

## 修正日
2025年12月29日（バグ修正5）

## 修正内容

### ラストワードの発動タイミング修正

#### 問題
- 刹那のラストワード「相手のランダムなフォロワーの攻撃力を-1する」が、交戦相手を抽選対象に含めていた
- 原因: 防御者のラストワードがキューされた時点で、攻撃者がまだボード上にいたため

#### 正しい動作
- ラストワードは交戦の**全ての処理が終わった後**に発動する
- 交戦で死亡したフォロワー（攻撃者・防御者両方）は、ラストワード発動時には既にボードから削除されているべき
- 必殺で倒れた攻撃者も、ラストワードの抽選対象から外れる

#### 修正前の処理順序
1. 防御者死亡判定 → ラストワードキュー → 墓地移動 → ボードからnull
2. 攻撃者死亡判定 → ラストワードキュー → 墓地移動 → ボードからnull

#### 修正後の処理順序
1. 防御者・攻撃者の死亡判定
2. **両者をボードから削除**（墓地移動、ボードをnullに）
3. **その後にラストワードをキュー**

#### 修正箇所（2725-2756行目付近）
```typescript
// 4. 交戦終了後の死亡処理
const defenderDied = defender.currentHealth <= 0;
const attackerDied = attacker.currentHealth <= 0;

// 4a. まず両者をボードから削除（ラストワードの抽選対象から外す）
if (defenderDied) {
    defPlayer.graveyard.push(defender);
    defPlayer.board[targetIndex] = null;
}
if (attackerDied) {
    attPlayer.graveyard.push(attacker);
    attPlayer.board[attackerIndex] = null;
}

// 4b. 両者がボードから削除された後にラストワードをキュー
if (defenderDied) {
    triggerLastWordInAttack(defender, defOwnerId);
}
if (attackerDied) {
    triggerLastWordInAttack(attacker, attOwnerId);
}
```

#### 動作確認
- 刹那（防御者）が必殺持ち攻撃者と交戦して両者死亡
  → 両者がボードから削除
  → 刹那のラストワードが発動
  → 相手のランダムなフォロワーを抽選（死亡した攻撃者は対象外）

## 構造の記録（更新）
- `game/src/core/engine.ts`
  - 2725-2756行目: 交戦後の死亡処理順序を修正（ボード削除→ラストワードキュー）

---

## 修正日
2025年12月29日（カードエフェクト変更）

## 修正内容

### attackEffectTypeの変更

#### 変更内容
- **遙（haruka）**: `attackEffectType: 'SUMI'` → `'SLASH'`
- **刹那（setsuna）**: `attackEffectType: 'SLASH'` → `'SUMI'`

#### 修正箇所
- `game/src/core/engine.ts`
  - 735行目: 遙のattackEffectTypeをSLASHに変更
  - 761行目: 刹那のattackEffectTypeをSUMIに変更

#### 理由
- キャラクターのイメージに合わせたエフェクトの変更
- 刹那は墨（SUMI）エフェクト、遙は斬撃（SLASH）エフェクトに統一

---

## 修正日
2025年12月29日（カード説明文修正）

## 修正内容

### 隠密能力の説明文を明確化

#### 問題
- `[隠密]`の説明が不明確だった
- 隠密には2つの効果がある：
  1. 選択不可効果（一時的）：攻撃するまで相手に選ばれない
  2. 守護無視効果（永続）：相手の守護を無視して攻撃できる
- 攻撃して選択不可が解除されても、守護無視効果は残る

#### 対応
- 隠密を持つカードの説明文に「（攻撃まで選択不可・守護無視）」を追加

#### 修正箇所
- `game/src/core/engine.ts`
  - 85行目: Yのdescription修正
  - 731行目: 遙のdescription修正

#### 変更後の表記
```
[隠密]（攻撃まで選択不可・守護無視）
```

---

## 修正日
2025年12月29日（カード名・効果変更）

## 修正内容

### 「百鬼夜行」→「疾きこと風の如く」へ変更

#### 変更内容
- **カード名**: 「百鬼夜行」 → 「疾きこと風の如く」
- **イラスト**: hyakkiyako.png → hayakikoto.png
- **効果追加**: 1ドロー効果を追加

#### 変更前
```
name: '百鬼夜行'
description: '「刹那」を2体場に出す。'
imageUrl: '/cards/hyakkiyako.png'
effects: [SUMMON_CARD x2]
```

#### 変更後
```
name: '疾きこと風の如く'
description: 'カードを1枚引く。「刹那」を2体場に出す。'
imageUrl: '/cards/hayakikoto.png'
effects: [DRAW(1), SUMMON_CARD x2]
```

#### 修正箇所
- `game/src/core/engine.ts`
  - 798-813行目: カード定義変更
  - 915行目: デッキテンプレートのコメント更新

#### 備考
- カードIDも`s_hyakkiyako`から`s_hayakikoto`に変更（管理しやすさのため）

---

## 修正日
2025年12月29日（UI日本語化）

## 修正内容

### ロビー画面の日本語化とyoRuka表示対応

#### 問題
1. yoRukaクラス選択時、待機画面で「クラス：あじゃ」と表示されていた
2. ロビー画面に英語表記が残っていた
3. フォントがタイトル画面と統一されていなかった

#### 対応
1. クラス表示ロジックを修正してYORUKAに対応
2. 全ての英語テキストを日本語に翻訳
3. Tamanegiフォントを適用

#### 修正箇所
- `game/src/screens/LobbyScreen.tsx`
  - 151行目: fontFamilyを'Tamanegi, sans-serif'に変更
  - 154行目: 'WAITING FOR OPPONENT' → '対戦相手を待っています'、'CONNECTING...' → '接続中...'
  - 170行目: エラーメッセージにfontFamily追加
  - 187行目: ルーム作成中/接続中メッセージにfontFamily追加
  - 202行目: 'Room ID:' → 'ルームID:'、fontFamily追加
  - 229行目: コピーボタンにfontFamily追加
  - 231行目: 'Copy Room ID' → 'ルームIDをコピー'、'✓ Copied!' → '✓ コピーしました！'
  - 250行目: 待機メッセージにfontFamily追加
  - 266行目: 'Room X に接続中...' → 'ルーム X に接続中...'、fontFamily追加
  - 278行目: '✓ Connected!' → '✓ 接続完了！'、fontFamily追加
  - 279行目: ゲーム開始メッセージにfontFamily追加
  - 291行目: fontFamily追加
  - 293行目: クラス表示ロジックをYORUKA対応に修正
    - 変更前: `playerClass === 'SENKA' ? 'せんか' : 'あじゃ'`
    - 変更後: `playerClass === 'SENKA' ? 'せんか' : playerClass === 'AJA' ? 'あじゃ' : 'yoRuka'`
  - 309行目: 戻るボタンにfontFamily追加
  - 319行目: '← Back to Title' → '← タイトルに戻る'

## 構造の記録（更新）
- `game/src/screens/LobbyScreen.tsx`
  - 151行目: タイトルのfontFamily
  - 154行目: タイトルテキスト（日本語化）
  - 170行目: エラーメッセージfontFamily
  - 187行目: 接続中メッセージfontFamily
  - 202行目: ルームIDラベル（日本語化+fontFamily）
  - 229行目: コピーボタンfontFamily
  - 231行目: コピーボタンテキスト（日本語化）
  - 250行目: 待機メッセージfontFamily
  - 266行目: 接続中メッセージ（日本語化+fontFamily）
  - 278行目: 接続完了メッセージ（日本語化+fontFamily）
  - 279行目: ゲーム開始メッセージfontFamily
  - 291行目: クラス表示fontFamily
  - 293行目: クラス表示ロジック（YORUKA対応）
  - 309行目: 戻るボタンfontFamily
  - 319行目: 戻るボタンテキスト（日本語化）

---

## 修正日
2025年12月29日（通信対戦同期修正）

## 修正内容

### 1. 対戦相手の手札枚数表示追加
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **変更**: 対戦相手の手札エリアに手札枚数のテキスト表示を追加
- **修正箇所**: 4823-4837行目に手札枚数表示コンポーネントを追加

### 2. 通信対戦の同期問題修正

#### 問題
- 刹那のラストワード発動後、相手側でフォロワーが表示されない・ダメージが反映されない
- 通信対戦中に状態の同期が外れる

#### 原因
- pendingEffectsの処理（RESOLVE_EFFECT）が、`sourcePlayerId === currentPlayerId`の条件で片方のクライアントでしか実行されていなかった
- 相手のラストワードがキューされた場合、自分のクライアントでは`sourcePlayerId !== currentPlayerId`となり、RESOLVE_EFFECTがdispatchされなかった
- 両クライアントが独立してRESOLVE_EFFECTを処理すると、RNG（乱数）の呼び出し順序が異なり、ランダム効果の結果が不一致になる可能性があった

#### 対策
- **HOST/CPUモードのみがRESOLVE_EFFECTを処理**し、処理後のゲーム状態をJOINに送信
- **JOINモードはRESOLVE_EFFECTを処理せず**、HOSTからのGAME_STATE同期を待つ
- GAME_STATE受信時にisProcessingEffectフラグをリセット

#### 修正箇所
- `game/src/screens/GameScreen.tsx`
  - 1894-1906行目: GENERATE_CARD処理でのRESOLVE_EFFECTをHOST/CPUのみに制限
  - 2047-2064行目: 一般エフェクト処理でのRESOLVE_EFFECTをHOST/CPUのみに制限
  - 2054-2061行目: HOST時にGAME_STATEをJOINに送信
  - 2573-2582行目: GAME_STATE受信時の処理を拡張（ログ追加、フラグリセット）
  - 2096行目: useEffectの依存配列にgameMode, connected, adapterを追加

## 構造の記録（更新）
- `game/src/screens/GameScreen.tsx`
  - 4823-4837行目: 相手の手札枚数表示
  - 1894-1906行目: GENERATE_CARDのRESOLVE_EFFECT処理（HOST/CPU限定）
  - 2047-2064行目: エフェクト処理でのRESOLVE_EFFECT（HOST/CPU限定+状態送信）
  - 2573-2582行目: GAME_STATE受信処理（フラグリセット追加）

## 設計メモ
オンライン対戦では、ランダム要素を含む処理は「HOSTがマスター」として処理し、結果をJOINに同期する設計が必要。これにより、シード付きRNGの呼び出し順序が保証され、両クライアントで同じ結果が得られる。

---

## 修正日
2025年12月29日（通信対戦・手札ロック問題修正）

## 修正内容

### 通信対戦で手札が展開できなくなる問題の修正

#### 問題
- 通信対戦において、条件不明で手札が展開されず、カードが使用できなくなる
- cardPlayLockRefがtrueのまま残り、手札のクリック処理が完全にブロックされる

#### 原因分析
- `handleHandMouseDown`で`cardPlayLockRef`のチェックが手札展開処理より**前**に行われていた
- ロックがtrueの場合、手札を展開することすらできなくなる
- オンライン対戦で何らかの理由でロックが解除されないケースがあると、操作不能になる

#### 対策
1. **手札展開を常に許可**: `cardPlayLockRef`チェックを手札展開処理の**後**に移動
   - これにより、ロック中でも手札を見ることはできる
   - ドラッグ開始（カードプレイ）のみがブロックされる
2. **GAME_STATE同期時のロックリセット**: JOINがHOSTからGAME_STATEを受信した時に、アニメーション中でなければロックを解除
3. **安全機構の追加**: 3秒間隔でロックの状態をチェックし、不正なロック状態を解除

#### 修正箇所
- `game/src/screens/GameScreen.tsx`
  - 3590-3616行目: handleHandMouseDown内の処理順序を変更
    - 手札展開チェックを先に行い、cardPlayLockRefチェックを後に移動
  - 2582-2586行目: GAME_STATE受信時にcardPlayLockRefをリセット
  - 3171-3188行目: 3秒間隔でロックの安全解除を行うuseEffect追加

#### 修正後のhandleHandMouseDownロジック
```
1. ドラッグ中 or アニメーション中 → 即return
2. 手札未展開 → 展開してreturn（常に許可）
3. 手札展開済み → カード選択を更新（常に許可）
4. 自分のターンでない → return
5. cardPlayLockRef true → ドラッグ開始をブロック
6. pendingEffects処理中 → ドラッグ開始をブロック
7. 上記すべてOK → ドラッグ開始
```

## 構造の記録（更新）
- `game/src/screens/GameScreen.tsx`
  - 3590-3616行目: handleHandMouseDown（手札展開優先、ロックチェック後）
  - 2582-2586行目: GAME_STATE受信時のロックリセット
  - 3171-3188行目: 安全ロック解除のuseEffect

---

## 修正日
2025年12月29日（せんかオーラ効果の仕様修正）

## 修正内容

### クレイジー・ナックラーズ等で召喚されるナックラーに疾走が付かないように修正

#### 問題
- 「クレイジー・ナックラーズ」の効果で場に出た「しゑこ」が疾走を持っていた
- この効果で場に出る白ツバキとしゑこは普通の効果（突進）のみを持つはずだった

#### 原因
- 「せんか」の効果が「オーラ」として実装されており、せんかが場にいる間、新しく召喚されるナックラーすべてに疾走を付与していた
- SUMMON_CARD と PLAY_CARD の両方で、せんかが場にいるかチェックして疾走を付与するロジックがあった

#### 正しい仕様
- せんかのファンファーレ効果は「自分のナックラーすべては[疾走]を得る」
- これは「ファンファーレ発動時に場にいるナックラー」にのみ適用される
- **後から召喚されるナックラーには疾走は付与されない**

#### 修正箇所
- `game/src/core/engine.ts`
  - 1522-1534行目（SUMMON_CARD内）: せんかオーラチェックを削除、コメントに仕様を明記
  - 2223-2236行目（PLAY_CARD内）: せんかオーラチェックを削除、コメントに仕様を明記

## 構造の記録（更新）
- `game/src/core/engine.ts`
  - 1522-1524行目: SUMMON_CARDのせんか効果コメント（オーラ削除済み）
  - 2223-2225行目: PLAY_CARDのせんか効果コメント（オーラ削除済み）
  - 44-46行目: せんかのファンファーレ効果（GRANT_PASSIVEでSTORM付与）はそのまま維持

---

## 修正日
2025年12月29日（通信対戦・ターン終了二重dispatch問題修正）

## 修正内容

### 通信対戦で手札が展開できなくなる問題の根本原因修正

#### 問題
- クライアント側（JOIN）で手札が展開できなくなる
- ログ分析により、リモートのEND_TURNを受信した直後にローカルでもEND_TURNがdispatchされ、ターンが二重に切り替わっていた

#### 原因分析
```
1. クライアントがHOSTのEND_TURNを受信
2. ターンがクライアント側（p2）に切り替わる
3. handleEndTurnが何らかの理由で呼ばれる（タイムアウト待機中だった可能性）
4. 3秒のタイムアウト後、END_TURNがdispatchされる
5. ターンが再びHOST側（p1）に戻る
6. クライアントは自分のターンではないため操作不能に
```

#### 対策
1. **isEndingTurnRefの追加**: 非同期処理中も正確に状態をチェックできるようにrefを追加
2. **ターン状態の事前キャプチャ**: handleEndTurn開始時のturnCountとactivePlayerIdを記録
3. **待機中のターン変更検出**: waitForAllProcessing内でターン状態をチェックし、変更があれば即座にabort
4. **dispatch前の再チェック**: END_TURNをdispatchする前にターン状態が変わっていないか再確認

#### 修正箇所
- `game/src/screens/GameScreen.tsx`
  - 4421-4515行目: handleEndTurnを大幅に修正
    - isEndingTurnRefを追加（4423行目）
    - turnCountAtStart, activePlayerAtStartをキャプチャ（4440-4441行目）
    - 待機中のターン変更チェック（4470-4475行目）
    - dispatch前の再チェック（4498-4508行目）

#### 修正後のhandleEndTurnロジック
```
1. gameState.activePlayerId !== currentPlayerId → return (自分のターンではない)
2. isEndingTurnRef.current === true → return (既にターン終了処理中)
3. 現在のturnCountとactivePlayerIdをキャプチャ
4. waitForAllProcessing開始
   - 待機中にターン状態が変わったら即座にfalseを返してabort
5. waitForAllProcessing完了後、ターン状態を再チェック
   - 変わっていたらdispatchせずにreturn
6. END_TURNをdispatch

## 構造の記録（更新）
- `game/src/screens/GameScreen.tsx`
  - 4421-4515行目: handleEndTurn（ターン状態チェック強化版）
  - 4423行目: isEndingTurnRef
  - 4440-4441行目: ターン状態キャプチャ
  - 4470-4475行目: 待機中ターン変更検出
  - 4498-4508行目: dispatch前再チェック

---

## 修正日
2025年12月30日（カードバランス調整）

## 修正内容

### 1. あじゃのカード変更

#### 変更内容
- **スタッツ変更**: 4/5 → 5/5
- **効果変更**: 「相手のフォロワー1体を破壊する」→「ランダムな相手のフォロワー1体を破壊する」

#### 修正箇所
- `game/src/core/engine.ts`
  - 220-234行目: あじゃのカード定義
    - attack: 4 → 5
    - DESTROY, targetType: 'SELECT_FOLLOWER' → RANDOM_DESTROY, value: 1
    - description更新

### 2. ありすのカード変更

#### 変更内容
- **進化時効果変更**: 「相手のフォロワー1体に2ダメージ」→「ランダムな相手のフォロワー2体に2ダメージ」
- ファンファーレと進化時が同じ効果になった

#### 修正箇所
- `game/src/core/engine.ts`
  - 597-617行目: ありすのカード定義
    - EVOLVE effects: DAMAGE, SELECT_FOLLOWER → RANDOM_DAMAGE, value: 2, value2: 2
    - description更新

## 構造の記録（更新）
- `game/src/core/engine.ts`
  - 220-246行目: あじゃ（5/5、ランダム破壊、超進化時に突進追加）
  - 597-617行目: ありす（ファンファーレ・進化時ともにランダム2体2ダメージ）

---

## 修正日
2025年12月30日（あじゃ超進化時効果追加）

## 修正内容

### あじゃの超進化時効果に突進追加

#### 変更内容
- 超進化時に召喚されるフォロワー（つぶまる、ゆうなぎ、なゆた）に[突進]を付与

#### 修正箇所
- `game/src/core/engine.ts`
  - 220-246行目: あじゃのカード定義
    - SUPER_EVOLVEにGRANT_PASSIVE（RUSH）を追加
    - description更新

---

## 修正日
2025年12月30日（JOIN側手札ロック問題の修正）

## 問題の概要
JOIN側（クライアント）でのみ手札が展開できなくなる問題が発生。
- ホスト側では一度も発生せず、JOIN側でのみ発生
- 茶トラのスペルを使った後に発生することが多い

## 原因分析

### ログ分析結果
```
[handleEndTurn] waitForAllProcessing completed, elapsed: 1012.70ms
[RemoteDispatch] Remote END_TURN received, turn switching to: p2
[GameScreen] Player turn started - resetting card play lock
[handleEndTurn] Dispatching END_TURN for player: p1 turn: 3
```

### 根本原因
1. HOST側で茶トラなどのスペル処理後にhandleEndTurnが呼ばれる
2. handleEndTurnは非同期でwaitForAllProcessing（約1秒）を待機
3. この待機中にHOST側のEND_TURNが完了し、リモートでJOIN側に通知される
4. JOIN側のターンが開始される
5. しかし、JOIN側で以前起動された古いhandleEndTurnの待機が完了
6. ターン状態チェックが不十分で、古いhandleEndTurnがEND_TURNをdispatch
7. ターンがHOSTに戻り、JOINは操作不能に

### 問題の本質
- `isEndingTurnRef`がリモートEND_TURN受信時にリセットされていなかった
- ターン開始時にもリセットされていなかった
- これにより古い非同期ハンドラが誤ってEND_TURNをdispatchしてしまった

## 修正内容

### 1. isEndingTurnRefの定義位置を移動
handleMessage内からアクセスできるよう、定義位置を移動

**修正箇所**: `game/src/screens/GameScreen.tsx` 2820行目
```typescript
// --- Card Play Lock to prevent double play ---
const cardPlayLockRef = React.useRef(false);
const lastPlayedInstanceIdRef = React.useRef<string | null>(null);
// --- End Turn Lock (moved here for access in handleMessage) ---
const isEndingTurnRef = React.useRef(false);
```

### 2. リモートEND_TURN受信時のリセット追加
リモートからEND_TURNを受信したら、ローカルのisEndingTurnRefをリセット

**修正箇所**: `game/src/screens/GameScreen.tsx` 2746-2752行目
```typescript
} else if (action.type === 'END_TURN') {
    console.log('[GameScreen] Remote END_TURN received, turn switching to:',
        action.playerId === 'p1' ? 'p2' : 'p1');
    // CRITICAL FIX: Reset isEndingTurnRef when receiving remote END_TURN
    // This prevents a stuck handleEndTurn from dispatching END_TURN again
    // after the turn has already switched
    isEndingTurnRef.current = false;
}
```

### 3. ターン開始時のリセット追加
自分のターンが開始されたらisEndingTurnRefをリセット

**修正箇所**: `game/src/screens/GameScreen.tsx` 3169-3177行目
```typescript
useEffect(() => {
    if (gameState.activePlayerId === currentPlayerId) {
        console.log('[GameScreen] Player turn started - resetting card play lock and ending turn state');
        cardPlayLockRef.current = false;
        lastPlayedInstanceIdRef.current = null;
        // CRITICAL FIX: Also reset isEndingTurnRef to prevent stale async handlers
        isEndingTurnRef.current = false;
    }
}, [gameState.activePlayerId, gameState.turnCount, currentPlayerId]);
```

## 修正後のisEndingTurnRefライフサイクル
```
1. handleEndTurn開始 → isEndingTurnRef = true
2. waitForAllProcessing待機中...
3. [パターンA] 正常完了 → END_TURN dispatch → isEndingTurnRef = false
4. [パターンB] リモートEND_TURN受信 → isEndingTurnRef = false（即座にリセット）
5. [パターンC] ターン開始 → isEndingTurnRef = false（ターン開始時にリセット）
```

これにより、古い非同期ハンドラが誤ってEND_TURNをdispatchすることを防止。

## 構造の記録（更新）
- `game/src/screens/GameScreen.tsx`
  - 2820行目: isEndingTurnRef定義（cardPlayLockRefの近くに移動）
  - 2746-2752行目: リモートEND_TURN受信時のisEndingTurnRefリセット
  - 3169-3177行目: ターン開始時のisEndingTurnRefリセット
  - 4421-4515行目: handleEndTurn（既存のターン状態チェック）

## 失敗からの教訓
- 非同期処理のロック機構は、すべての状態変更タイミングでリセットを考慮する必要がある
- 特にP2P通信では、リモートからの状態変更とローカルの非同期処理が競合しやすい
- ロックのリセットは「ターン終了時」だけでなく「ターン開始時」「リモート通知受信時」も必要

---

## 修正日
2025年12月30日（GENERATE_CARDアニメーションフリーズ問題の修正）

## 問題の概要
JOIN側で「キジトラ猫のごはん」などのGENERATE_CARDで生成されたカードが画面に表示されたまま固まる問題。

- 茶トラスペル（3枚のカードを手札に加える）使用後に発生
- カードがFLY状態のまま画面に残り続ける

## 原因分析

### 茶トラの処理フロー
1. 茶トラスペル使用 → 3つのGENERATE_CARDエフェクトがpendingEffectsに追加
2. 各エフェクトは1000ms（APPEAR）+ 600ms（FLY）= 1600msのアニメーション
3. HOST側でRESOLVE_EFFECT dispatch後、50ms後にGAME_STATEを送信

### 問題の発生メカニズム
1. HOST側でGENERATE_CARDアニメーション完了（1600ms）
2. HOST側がRESOLVE_EFFECTをdispatch、50ms後にGAME_STATEを送信
3. **JOIN側はまだアニメーション中（タイミングのズレ）**
4. JOIN側がGAME_STATEを受信
5. pendingEffectsが更新されるが、**animatingCardがnullにリセットされない**
6. アニメーションのタイムアウトがまだ動作中で、状態が不整合に
7. カードが画面に残ったままフリーズ

### 根本原因
GAME_STATE受信時にanimatingCardとeffectTimeoutRefをリセットしていなかった。

## 修正内容

**修正箇所**: `game/src/screens/GameScreen.tsx` 2582-2588行目（GAME_STATE受信処理内）
```typescript
// CRITICAL FIX: Clear animatingCard and its timeout to prevent frozen card display
// This ensures the card animation doesn't get stuck when HOST syncs state
setAnimatingCard(null);
if (effectTimeoutRef.current) {
    clearTimeout(effectTimeoutRef.current);
    effectTimeoutRef.current = null;
}
```

## 修正後の処理フロー
```
1. HOST: GENERATE_CARDアニメーション開始
2. JOIN: GENERATE_CARDアニメーション開始（animatingCard設定）
3. HOST: アニメーション完了 → RESOLVE_EFFECT → GAME_STATE送信
4. JOIN: GAME_STATE受信
   - pendingEffects更新（SYNC_STATE）
   - isProcessingEffect = false
   - animatingCard = null（★追加：フリーズ防止）
   - effectTimeoutRefクリア（★追加：重複タイムアウト防止）
5. JOIN: 次のpendingEffectを処理（正常動作）
```

## 構造の記録（更新）
- `game/src/screens/GameScreen.tsx`
  - 2575-2594行目: GAME_STATE受信処理（animatingCard/effectTimeoutRefリセット追加）

---

## 修正日
2025年12月30日（UI・エフェクト改善）

## 修正内容

### 1. GENERATE_CARDアニメーションの座標修正

#### 問題
- 茶トラ等でカードが手札に加わるアニメーションが、画面左上に寄った位置に表示されていた
- ウィンドウサイズ変更に対応しておらず、座標がBASE_WIDTH/BASE_HEIGHTの固定値だった

#### 修正箇所
- `game/src/screens/GameScreen.tsx`
  - 1880-1883行目: GENERATE_CARDの座標計算を実際の画面座標に変更
    - 変更前: `BASE_WIDTH - 200` / `BASE_HEIGHT - 100`
    - 変更後: `window.innerWidth - 200 * scale` / `window.innerHeight - 100 * scale`
  - 5885-5886行目: animatingCardのAPPEAR時の初期位置も実際の画面中央に変更
    - 変更前: `BASE_WIDTH / 2` / `BASE_HEIGHT / 2`
    - 変更後: `window.innerWidth / 2` / `window.innerHeight / 2`
  - 5898行目: Cardコンポーネントにスケール適用
    - `style={{ width: CARD_WIDTH * scale, height: CARD_HEIGHT * scale }}`

### 2. バフ/デバフエフェクトの数字表示改善

#### 問題
- マイナス値のデバフ（刹那のラストワードなど）が正しく表示されなかった
- あじゃの超進化時効果（ALL_FOLLOWERS + conditions）のバフが表示されなかった

#### 修正箇所

##### BuffEffectVisualコンポーネント（162-274行目）
- マイナス値対応: 攻撃力・HPそれぞれの値に応じて色を変更
  - 攻撃力: +値=赤、-値=青、0=灰色
  - HP: +値=緑、-値=紫、0=灰色
- 数字表示を`+N`または`-N`形式に統一
- デバフ時はグローエフェクトとパーティクルの色を赤系に変更

##### BUFF_STATS処理（2027-2084行目）
- `ALL_FOLLOWERS`ターゲットタイプへの対応を追加
  - conditions（nameIn, tag）のフィルタリングを実装
- `ALL_OTHER_FOLLOWERS`にもconditionsフィルタリングを追加

## 今後の課題
- `RANDOM_FOLLOWER`ターゲットタイプのBUFF_STATSエフェクト表示
  - 現在engine.ts側で直接処理され、pendingEffectsにtargetIdが設定されない
  - HOST/JOIN間のRNG同期を考慮した実装が必要

## 構造の記録（更新）
- `game/src/screens/GameScreen.tsx`
  - 162-274行目: BuffEffectVisual（マイナス値対応）
  - 1880-1883行目: GENERATE_CARD座標計算（スクリーン座標対応）
  - 2042-2058行目: BUFF_STATS ALL_FOLLOWERSハンドリング
  - 5880-5908行目: animatingCard表示（スクリーン座標対応）

---

## 修正日
2025年12月30日（隠密の守護無視効果修正・せんかデッキ調整）

## 修正内容

### 1. 隠密の守護無視効果が解除後も残るように修正

#### 問題
- Yや遙などの隠密持ちフォロワーが、攻撃して隠密が解除された後、守護を無視できなくなっていた
- 仕様では「隠密を持っていたフォロワーは、隠密が解除された後も守護を無視できる」

#### 修正箇所

##### types.ts
- `BoardCard`インターフェースに`hadStealth`プロパティを追加（76行目）
- 場に出た時点で隠密を持っていたかを記録

##### engine.ts
- PLAY_CARD処理でhadStealthを設定（2219-2220行目）
- SUMMON_CARD処理でhadStealthを設定（1521-1522行目）
- SUMMON_CARD_RUSH処理でhadStealthを設定（1553-1554行目）
- ATTACK処理の守護無視判定を`attackerIgnoresWard`に変更（2563-2564行目）
  - `passiveAbilities?.includes('STEALTH') || hadStealth`で判定

##### GameScreen.tsx
- UI側の守護無視判定も`ignoresWard`に変更（3959-3961行目）
  - `passiveAbilities?.includes('STEALTH') || hadStealth`で判定

### 2. カードのdescriptionを簡素化

#### 変更内容
- Yのdescription: `[隠密]（攻撃まで選択不可・守護無視）` → `[隠密]`
- 遙のdescription: `[隠密]（攻撃まで選択不可・守護無視）` → `[隠密]`
- 詳細な説明はヘルプボタン内に記載

### 3. ヘルプの隠密説明を更新

- 「この効果は隠密が解除された後も残ります」を追加（597行目）

### 4. せんかデッキ構成変更

#### 変更内容
- ぶっちー: 3枚 → 2枚
- ヴァルキリー: 0枚 → 1枚（新規追加）

#### 修正箇所
- engine.ts SENKA_DECK_TEMPLATE（877-878行目）

## 構造の記録（更新）
- `game/src/core/types.ts`
  - 76行目: BoardCard.hadStealth
- `game/src/core/engine.ts`
  - 877-878行目: せんかデッキ構成（ぶっちー2、ヴァルキリー1）
  - 1521-1522行目: SUMMON_CARD hadStealth設定
  - 1553-1554行目: SUMMON_CARD_RUSH hadStealth設定
  - 2219-2220行目: PLAY_CARD hadStealth設定
  - 2563-2564行目: ATTACK守護無視判定（hadStealth対応）
- `game/src/screens/GameScreen.tsx`
  - 597行目: ヘルプの隠密説明更新
  - 3959-3961行目: UI守護無視判定（hadStealth対応）

---

## 修正日
2025年12月30日（CPU AI強化と難易度選択機能）

## 修正内容

### 1. 難易度選択システムの追加

#### 概要
ひとりで遊ぶモード（CPU対戦）に、3段階の難易度選択機能を追加。

#### 追加した難易度
- **かんたん（EASY）**: 初心者向け。CPUは単純な行動をとる
- **ふつう（NORMAL）**: 標準的な難易度。CPUは基本的な戦略を使用
- **むずかしい（HARD）**: 上級者向け。CPUは効果的な戦略で挑んでくる

#### 修正ファイル

##### types.ts
- 3行目: `AIDifficulty`型を追加
  ```typescript
  export type AIDifficulty = 'EASY' | 'NORMAL' | 'HARD';
  ```

##### App.tsx
- 6行目: AIDifficultyのimport追加
- 28行目: aiDifficulty state追加（デフォルト: 'NORMAL'）
- 122-130行目: ClassSelectScreenにgameMode、aiDifficulty、onDifficultyChangeを渡す
- 150行目: GameScreenにaiDifficultyを渡す

##### ClassSelectScreen.tsx
- 2行目: AIDifficultyのimport追加
- 24-26行目: propsにgameMode、aiDifficulty、onDifficultyChangeを追加
- 138-184行目: 難易度選択UIコンポーネントを追加
  - CPUモード時のみ表示
  - 3つのボタン（かんたん/ふつう/むずかしい）
  - 選択中の難易度は色付きで表示
  - 各難易度の説明テキストを表示

##### GameScreen.tsx
- 97行目: propsにaiDifficultyを追加
- 1506行目: propsからaiDifficulty受け取り（デフォルト: 'NORMAL'）
- 3851行目: useEffectの依存配列にaiDifficultyを追加

### 2. CPU AI強化

#### 問題点（修正前）
- カードプレイ: 最もコストが高い1枚だけをプレイ（PPが余っても追加プレイしない）
- 進化: 最後に出したカードを常に進化（効果を考慮しない）
- 攻撃: 免疫持ち（IMMUNE_TO_FOLLOWER_DAMAGE等）を考慮せずに攻撃

#### 強化内容

##### AIヘルパー関数の追加（3307-3489行目）
1. **isImmuneToFollowerAttack**: ターゲットがフォロワー攻撃に対して免疫かどうかを判定
   - IMMUNE_TO_FOLLOWER_DAMAGE（白ツバキ等）を考慮
2. **wouldDieAttacking**: 攻撃時に自分が死亡するかを判定
3. **canKillTarget**: ターゲットを倒せるかを判定（BANEとBARRIERを考慮）
4. **scoreCardForPlaying**: カードのプレイ優先度をスコアリング
   - 敵ボードがある場合、除去効果にボーナス
   - 敵リーダーHP低下時、STORMにボーナス
   - ボードが満杯の場合、フォロワーにペナルティ
5. **scoreEvolveTarget**: 進化対象の優先度をスコアリング
   - 進化時効果（ダメージ/破壊/召喚等）を評価
   - 攻撃可能なユニットを優先
6. **findBestAttackTarget**: 最適な攻撃対象を決定
   - 守護の処理（隠密による無視も考慮）
   - 免疫持ちを避ける
   - 有利トレードを優先
   - ターゲットがいない場合はリーダーを攻撃

##### 難易度別のAI行動（3491-3851行目）

###### カードプレイ
- **EASY**: 1枚のみプレイ、30%の確率で追加プレイをスキップ
- **NORMAL**: 最大3枚まで、コスト降順でプレイ
- **HARD**: 最大5枚まで、スコア順でプレイ、高価値ターゲットを優先

###### 進化
- **EASY**: ランダムなフォロワーを進化
- **NORMAL/HARD**: 進化時効果が高価値なフォロワーを優先して進化
  - ダメージ/破壊効果を持つカードを優先
  - 敵ボードがある場合、除去効果にボーナス

###### 攻撃
- **EASY**: 守護があれば攻撃、なければ50%で顔攻撃
- **NORMAL/HARD**:
  - 免疫持ちをスキップ
  - 有利トレードを優先
  - 倒せないターゲットへの無駄な攻撃を避ける
  - BANEやDAMNを持つ危険なフォロワーを優先除去

###### 思考時間
- **EASY**: 1200ms（ゆっくり）
- **NORMAL**: 800ms（標準）
- **HARD**: 400ms（テンポよく）

## 構造の記録（更新）
- `game/src/core/types.ts`
  - 3行目: AIDifficulty型定義

- `game/src/App.tsx`
  - 28行目: aiDifficulty state
  - 122-130行目: ClassSelectScreen props
  - 150行目: GameScreen props

- `game/src/screens/ClassSelectScreen.tsx`
  - 2行目: AIDifficulty import
  - 21-27行目: ClassSelectScreenProps拡張
  - 138-184行目: 難易度選択UI

- `game/src/screens/GameScreen.tsx`
  - 97行目: aiDifficulty props
  - 1506行目: aiDifficulty受け取り
  - 3307-3489行目: AIヘルパー関数群
  - 3491-3851行目: 難易度別AIロジック

## 設計メモ
- AI強化は主にGameScreen.tsx内のrunAiTurn関数で実装
- 難易度に応じてカード評価関数を使用するかどうかを分岐
- HARDモードではカード効果とボード状況を考慮した戦略的なプレイを行う
- 免疫持ちへの無駄な攻撃を防ぐことで、より合理的な行動を実現

---

## 修正日
2025年12月30日（AI攻撃バグ修正）

## 修正内容

### AIの守護無視バグと必殺回避不足の修正
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **報告された問題**:
  1. 守護がいるのに守護の裏にいるフォロワーを攻撃しようとし、エフェクトは出るがダメージが通らない処理を無限に試行
  2. 「むずかしい」でも進化後のフォロワーで必殺のフォロワーに攻撃するなど無駄な行動が見られる

#### 原因分析

##### 守護無視バグの原因
1. EASYモードでは守護を見つけて攻撃しようとしていたが、**攻撃者が守護を無視できるか（STEALTH/hadStealth）をチェックしていなかった**
2. 守護がいない場合のフォールバック処理で、再度守護確認をしていなかった
3. NORMAL/HARDでは`findBestAttackTarget`が守護を返しても、その後のRUSH制限チェックで上書きされる可能性があった

##### 必殺回避不足の原因
1. `wouldDieAttacking`関数が相手の攻撃力だけで判定し、**BANE（必殺）を考慮していなかった**
2. `findBestAttackTarget`でBANE持ちを「倒す価値がある」としてボーナスを与えていたが、**BANEで自分が即死するペナルティが不足**
3. 進化フォロワーで攻撃する場合の追加ペナルティがなかった

#### 修正内容

##### 1. wouldDieAttacking関数の修正（行3320-3328）
```typescript
// 修正前
const wouldDieAttacking = (attacker: any, target: any): boolean => {
    if (!target || !attacker) return false;
    return (target.currentAttack || 0) >= attacker.currentHealth;
};

// 修正後
const wouldDieAttacking = (attacker: any, target: any): boolean => {
    if (!target || !attacker) return false;
    // BANE kills on any damage (unless attacker has BARRIER)
    if (target.passiveAbilities?.includes('BANE') && !attacker.hasBarrier) {
        return true; // BANE always kills attacker
    }
    return (target.currentAttack || 0) >= attacker.currentHealth;
};
```

##### 2. findBestAttackTargetのスコアリング改善（行3451-3501）
- `attackerIsEvolved`フラグを追加し、進化フォロワーの判定
- BANEで死ぬ場合の大きなペナルティを追加:
  - 進化フォロワーがBANEで死ぬ: -60点
  - 通常フォロワーがBANEで死ぬ: -30点
- ターゲットを倒せず自分が死ぬ場合:
  - 基本ペナルティ: -50点
  - 進化フォロワーの場合: さらに-40点

##### 3. 攻撃フェーズの守護チェック統合（行3774-3846）
- 全難易度共通で攻撃前に守護チェックを実施
- `attackerIgnoresWard`変数で守護無視判定（STEALTH/hadStealth）
- 守護がいる場合は難易度に関係なく守護を攻撃
- EASYモードのロジックを守護チェック後に移動

```typescript
// 修正後の構造
// 1. 攻撃者が守護を無視できるかチェック
const attackerIgnoresWard = attacker.passiveAbilities?.includes('STEALTH') || attacker.hadStealth;

// 2. 守護がいるかチェック（無視できない場合のみ）
const wardTarget = !attackerIgnoresWard
    ? playerBoard.findIndex(c => c && c.passiveAbilities?.includes('WARD') && ...)
    : -1;

// 3. 守護がいれば強制的に守護を攻撃
if (wardTarget !== -1) {
    targetIndex = wardTarget;
    targetIsLeader = false;
} else if (aiDifficulty === 'EASY') {
    // EASYモードのランダムロジック
} else {
    // NORMAL/HARDのスマートターゲティング
}
```

##### 4. RUSH制限チェックでの守護優先（行3834-3841）
- RUSHがリーダーを攻撃できない場合、validTargets内で守護を優先

## 修正箇所の確認
- `wouldDieAttacking`: BANE判定が追加されていることを確認
- `findBestAttackTarget`: 進化フォロワー+BANE のペナルティが機能することを確認
- 攻撃ループ: 守護がいる場合に守護以外を攻撃しないことを確認
- RUSH制限: 守護がいる場合に守護を優先することを確認

## 構造の記録（更新）
- `game/src/screens/GameScreen.tsx`
  - 3320-3328行目: wouldDieAttacking（BANE判定追加）
  - 3451-3501行目: findBestAttackTarget（スコアリング改善）
  - 3774-3846行目: 攻撃フェーズ（守護チェック統合、RUSH制限改善）

## 失敗の記録と教訓
- **問題**: EASYモードの守護チェックが攻撃者の守護無視能力を考慮していなかった
- **原因の想定**: 当初は「守護があれば守護を攻撃」という単純なロジックで十分と考えた
- **実際の原因**: 攻撃者がSTEALTH/hadStealth を持つ場合、守護を無視できるため、その判定が必要だった
- **教訓**: ゲームルールの例外（守護無視など）を全てのコードパスで一貫して処理する必要がある

## 今後の改善案
1. AI攻撃ログの追加（デバッグ用）
2. より高度な盤面評価（ターン先読み）
3. コンボ認識（特定カード組み合わせの優先）

---

## 修正日
2025年12月30日（ダメージ表記左上バグ修正）

## 修正内容

### ダメージ表記が画面左上に表示されるバグの修正

#### 問題
- 稀にダメージの赤文字が画面左上（0,0座標）に表示されることがあった
- 再現条件が不明確で、毎回ではなく稀に発生

#### 原因
- カードが墓地に移動した際のダメージ表示処理（2307-2324行目）で：
  1. まず `x: 0, y: 0` でダメージを配列に追加
  2. その後に `refs[idx]` から座標を取得して更新
  3. `refs[idx]` がnull（カードが既に削除されている等）の場合、座標が0,0のまま残る
- コードコメントにも「Coords need fix」「Last Known Position needed」と記載されており、既知の問題だった

#### 修正内容
座標を先に取得し、有効な座標が取得できた場合のみダメージ表示を追加するように変更

**修正箇所**: `game/src/screens/GameScreen.tsx` 2307-2320行目
```typescript
// 修正前
if (damage > 0) {
    newDamages.push({ ..., x: 0, y: 0, ... }); // 先に0,0で追加
    const el = refs[idx];
    if (el) {
        // 後から座標を更新（elがnullなら0,0のまま）
        newDamages[newDamages.length - 1].x = coords.x;
        newDamages[newDamages.length - 1].y = coords.y;
    }
}

// 修正後
if (damage > 0) {
    const el = refs[idx];
    if (el) {
        const coords = getScreenCoordsFromElement(el);
        if (coords.x !== 0 || coords.y !== 0) {
            // 座標が有効な場合のみ追加
            newDamages.push({ ..., x: coords.x, y: coords.y, ... });
        }
    }
    // elがnullまたは座標が0,0の場合はスキップ
}
```

## 構造の記録（更新）
- `game/src/screens/GameScreen.tsx`
  - 2307-2320行目: 墓地移動時のダメージ表示処理（座標検証追加）

---

## 修正日
2025年12月30日（RANDOM_DAMAGE死亡カード重複ダメージ修正）

## 修正内容

### RANDOM_DAMAGEで死亡済みカードへの重複ダメージを防止

#### 問題
- 悠霞の進化時効果（ランダム3ダメージ×2回）で、1回目のダメージでフォロワーが破壊されても、2回目のダメージが同じフォロワーに飛んでしまう
- 死亡アニメーション中に次の対象を抽選してしまい、既に破壊されたフォロワーが選ばれる

#### 原因
- 複数のRANDOM_DAMAGEエフェクトがキューに追加される際、全てが同じボード状態からターゲットを事前計算していた
- 例：悠霞の進化時効果
  1. 2つのRANDOM_DAMAGEエフェクトがキューに追加される
  2. 両方とも同じ時点のボードからターゲットを選択
  3. 同じカードが両方のtargetIdsに含まれる可能性がある
  4. 1回目でカードが死亡しても、2回目のtargetIdsには同じIDが残っている

#### 修正内容
RANDOM_DAMAGE処理時に、targetIdsで指定されたカードが既に死亡している場合は、別の有効なターゲットを再選択するように変更

**修正箇所**: `game/src/core/engine.ts` 1438-1503行目
```typescript
case 'RANDOM_DAMAGE': {
    // ... 省略 ...

    // Track which cards have already been targeted to avoid hitting the same card twice
    const alreadyTargetedIds = new Set<string>();

    if (targetIds && targetIds.length > 0) {
        targetIds.forEach(tid => {
            const idx = targetBoard.findIndex(c => c?.instanceId === tid);
            if (idx !== -1 && targetBoard[idx]) {
                // Target is still alive, apply damage
                alreadyTargetedIds.add(tid);
                applyDamageToTarget(idx);
            } else {
                // Target is already dead or removed - find a replacement target
                const validIndices = targetBoard
                    .map((c, i) => (c && !alreadyTargetedIds.has(c.instanceId)) ? i : -1)
                    .filter(i => i !== -1);

                if (validIndices.length > 0) {
                    // Randomly select a new target
                    const randomIdx = Math.floor(rng() * validIndices.length);
                    const newTargetIdx = validIndices[randomIdx];
                    const newTarget = targetBoard[newTargetIdx]!;
                    alreadyTargetedIds.add(newTarget.instanceId);
                    applyDamageToTarget(newTargetIdx);
                }
                // If no valid targets remain, the damage fizzles (no target)
            }
        });
    }
    // ... 省略 ...
}
```

#### 修正後の動作
1. targetIdsに指定されたカードが生存している → そのカードにダメージ
2. targetIdsに指定されたカードが死亡している → 他の有効なターゲットを再抽選
3. 有効なターゲットがない → ダメージがfizzle（不発）
4. `alreadyTargetedIds`で同一処理内での重複ターゲットも防止

## 構造の記録（更新）
- `game/src/core/engine.ts`
  - 1438-1503行目: RANDOM_DAMAGE処理（死亡カード再抽選対応）
  - 1444-1461行目: applyDamageToTargetヘルパー関数
  - 1463行目: alreadyTargetedIds（重複ターゲット防止用Set）
  - 1473-1489行目: 死亡カード検出時の再抽選ロジック

---

## 修正日
2025年12月30日

## 修正内容

### 21. せんかのオーラ効果復活（ナックラー疾走付与）
- **対象ファイル**: `game/src/core/engine.ts`
- **問題**: せんかが場にいる状態で後からナックラーを出しても疾走が付与されない
- **原因**: 以前の修正でせんかのオーラ効果が削除されていた（ファンファーレ時のみ付与する仕様に変更）
- **対策**: 3箇所にオーラ効果を追加
  1. PLAY_CARD処理（2240-2251行目）: 手札からナックラーをプレイ時にせんかがいれば疾走付与
  2. SUMMON_CARD処理（1537-1548行目）: トークンとしてナックラーを召喚時にせんかがいれば疾走付与
  3. SUMMON_CARD_RUSH処理（1578-1594行目）: 突進付与召喚時にナックラー+せんかがいれば疾走付与（突進より優先）

#### 修正コード（PLAY_CARD）
```typescript
// せんかのオーラ効果: 場にせんかがいる場合、ナックラーに疾走を付与
if (newFollower.tags?.includes('Knuckler') && !newFollower.passiveAbilities?.includes('STORM')) {
    const hasSenkaOnBoard = player.board.some(c => c?.id === 'c_senka_knuckler');
    if (hasSenkaOnBoard) {
        if (!newFollower.passiveAbilities) {
            newFollower.passiveAbilities = [];
        }
        newFollower.passiveAbilities.push('STORM');
        newFollower.canAttack = true;
        newState.logs.push(`${newFollower.name} は せんか の効果で疾走を得た！`);
    }
}
```

#### 動作確認
- せんかが場にいる状態でナックラーをプレイ → 疾走が付与され即座に攻撃可能
- せんかが場にいない状態でナックラーをプレイ → 通常通り（疾走なし）
- せんかの超進化時にトークンナックラーを召喚 → 疾走が付与される

## 構造の記録（更新）
- `game/src/core/engine.ts`
  - 34-57行目: c_senka_knuckler定義
  - 1537-1548行目: SUMMON_CARD処理のオーラ効果チェック
  - 1578-1594行目: SUMMON_CARD_RUSH処理のオーラ効果チェック（疾走>突進の優先度）
  - 2240-2251行目: PLAY_CARD処理のオーラ効果チェック

---

## 修正日
2025年12月30日

## 修正内容

### 22. フォロワー選択効果時のリーダーハイライト修正
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **問題**: フォロワーを選択する効果（SELECT_FOLLOWER等）発動時に、リーダーが対象外なのに赤くハイライトされてしまう
- **原因**: 5156行目でリーダーのborderを決定する条件に`(targetingState && opponentType !== 'CPU')`が含まれていた
  - targetingStateはフォロワー選択用なので、リーダーはターゲット対象外
- **対策**:
  - リーダーのハイライト条件から`targetingState`の存在を除外
  - `!targetingState`を条件に追加し、ターゲット選択中はリーダーをハイライトしないように変更
  - cursorも`crosshair`から`default`に変更

#### 修正前
```typescript
border: (hoveredTarget?.type === 'LEADER' && hoveredTarget.playerId === opponentPlayerId) || (targetingState && opponentType !== 'CPU') ? '4px solid #f56565' : '4px solid #4a5568',
cursor: targetingState ? 'crosshair' : 'default',
```

#### 修正後
```typescript
border: (hoveredTarget?.type === 'LEADER' && hoveredTarget.playerId === opponentPlayerId && !targetingState) ? '4px solid #f56565' : '4px solid #4a5568',
cursor: 'default',
```

## 構造の記録（更新）
- `game/src/screens/GameScreen.tsx`
  - 5156行目: 相手リーダーのborder条件（targetingState中はハイライトしない）
  - 5158行目: 相手リーダーのcursor（常にdefault）

---

## 修正日
2025年12月30日

## 修正内容

### 23. リザルト画面でのデッキ選択機能追加
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **要求**: 決着後の再戦時に、次に使用するデッキタイプを選択できるようにする
- **実装内容**:

#### GameOverScreenコンポーネントの拡張
1. **デッキ選択UI追加**（1456-1503行目）
   - 「再戦」ボタンをクリックするとデッキ選択画面に切り替わる
   - せんか、あじゃの2つのデッキを選択可能
   - yoRukaは隠し要素として表示（暗くして`???`ラベル、クリックは可能）
   - キャンセルボタンで選択画面を閉じれる

2. **DeckSelectButtonコンポーネント追加**（1536-1571行目）
   - 各デッキ選択ボタンのコンポーネント
   - ホバー時に拡大エフェクト
   - 隠し要素は暗く表示

3. **onRematch引数の変更**
   - `onRematch: () => void` → `onRematch: (deckType: ClassType) => void`
   - 選択したデッキタイプを親コンポーネントに渡す

#### startRematch関数の拡張（2515-2570行目）
1. **デッキタイプ引数追加**
   - `startRematch()` → `startRematch(newDeckType?: ClassType)`
   - 指定されたデッキタイプでゲームを初期化

2. **currentPlayerClass状態追加**（1687行目）
   - 再戦時に選択したデッキタイプを保持
   - オンラインモードで相手の承認待ち中もデッキを保持

3. **CPU対戦時の相手クラス決定**
   - 選択したデッキに応じて相手CPUのクラスを自動決定
   - YORUKAの場合はSENKAかAJAをランダム選択
   - それ以外は異なるクラスを選択

#### オンラインモード対応（2886-2891行目, 6420-6440行目）
- REMATCH_ACCEPT受信時も選択したデッキで再戦
- デッキ選択後に相手の承認を待つ場合、選択をcurrentPlayerClassに保存

## 構造の記録（更新）
- `game/src/screens/GameScreen.tsx`
  - 1329-1337行目: GameOverScreenProps（onRematchにClassType引数追加）
  - 1339-1533行目: GameOverScreen（デッキ選択UI追加）
  - 1536-1571行目: DeckSelectButton（新規コンポーネント）
  - 1687行目: currentPlayerClass状態
  - 2515-2570行目: startRematch（デッキタイプ引数対応）
  - 2886-2891行目: REMATCH_ACCEPT処理
  - 6420-6440行目: onRematch呼び出し

---

## 修正日
2025年12月30日

## 修正内容

### 24. リザルト画面のUIリニューアル
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **要求**:
  - yoRukaの勝利/敗北画像を表示し、クリックでyoRukaデッキで再戦
  - VICTORYをtamanegiフォントの「勝利」に変更
  - 「あなたの勝ち！」「お前の負け！」メッセージをtamanegiフォントで表示
  - クラス選択からyoRukaを削除（隠し要素のため）
  - クラスアイコンを大きく（120px→180px）

#### 実装内容

1. **yoRuka画像の追加**（1328-1330行目）
   ```typescript
   const yorukaWinImg = getAssetUrl('/cards/yoRuka_win2.png');
   const yorukaLoseImg = getAssetUrl('/cards/yoRuka_lose.png');
   ```

2. **レイアウト変更**（1438-1591行目）
   - 横並びレイアウト（左: yoRuka画像、右: メインコンテンツ）
   - yoRuka画像: 300x400px、勝利時はyoRuka_win2.png、敗北時はyoRuka_lose.png
   - デッキ選択中のみyoRuka画像がクリック可能に
   - ホバー時に紫色のグロー効果

3. **tamanegiフォント適用**
   - 「勝利」「敗北」: 6rem、floatアニメーション付き
   - 「あなたの勝ち！」「お前の負け！」: 1.8rem
   - 「デッキを選択してください」: 1.8rem
   - クラスラベル「せんか」「あじゃ」: 1.4rem

4. **クラス選択の変更**
   - yoRukaを選択肢から削除（せんか、あじゃのみ表示）
   - アイコンサイズを120px→180pxに拡大
   - ボーダー、シャドウも強化

5. **DeckSelectButtonコンポーネントの簡素化**（1596-1625行目）
   - isHiddenプロパティを削除（yoRukaは選択肢に表示しないため）

## 構造の記録（更新）
- `game/src/screens/GameScreen.tsx`
  - 1328-1330行目: yoRuka勝利/敗北画像URL定義
  - 1343-1593行目: GameOverScreen（横並びレイアウト、yoRuka画像、tamanegiフォント）
  - 1425-1436行目: getDeckButtonStyle（180px、ボーダー・シャドウ強化）
  - 1457-1502行目: yoRuka画像エリア（クリックでYORUKAデッキ選択）
  - 1508-1520行目: 「勝利」「敗北」表示（tamanegiフォント、6rem）
  - 1596-1625行目: DeckSelectButton（tamanegiフォント使用）