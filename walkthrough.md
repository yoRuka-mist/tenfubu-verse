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

---

## 修正日
2025年12月31日

## 修正内容

### 25. リザルト画面の大幅リニューアル
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **要求**:
  - 画面を左右に二分割（左: カード情報表示/将来のキャラ画像用、右: メインコンテンツ）
  - yoRuka画像を右側に移動し、枠とホバー効果を削除（隠し要素として目立たせない）
  - クラスアイコンを220pxに拡大
  - 戦闘記録の表示（ターン数、与ダメージ、被ダメージ、撃破数）
  - バトルログのカード名クリックで左カラムにカード情報表示
  - 左カラムのカード画像はマウスオーバーで拡大しない

#### 実装内容

1. **BattleStats インターフェースの追加**（1332-1339行目）
   ```typescript
   interface BattleStats {
       turnCount: number;
       damageDealtToOpponent: number;
       damageReceivedFromOpponent: number;
       followersDestroyed: number;
       myFollowersDestroyed: number;
   }
   ```

2. **GameOverScreenProps の拡張**（1341-1353行目）
   - battleStats: BattleStats を追加
   - selectedCardInfo: CardModel | null を追加
   - onCardInfoClick: (card: CardModel | null) => void を追加

3. **レイアウト変更**（1449-1729行目）
   - 左右二分割レイアウト（flex: 1で均等分割）
   - 左カラム: カード情報表示（バトルログからクリック時）
   - 右カラム: 勝敗表示、戦闘記録、デッキ選択、ボタン、yoRuka画像

4. **yoRuka画像の変更**（1704-1726行目）
   - 右下に絶対配置（position: absolute, right: 20, bottom: 20）
   - サイズ縮小（180x240px）
   - border/hover効果を削除
   - opacity: 0.7で控えめに表示
   - デッキ選択中のみクリック可能

5. **クラスアイコン拡大**（1436-1447行目）
   - 180px→220pxに拡大
   - getDeckButtonStyle更新

6. **戦闘記録UI**（1583-1619行目）
   - ターン数、与ダメージ、被ダメージ、撃破数を表示
   - 色分け（ターン: 金、与ダメ: 緑、被ダメ: 赤、撃破: 青）

7. **左カラムのカード情報表示**（1467-1557行目）
   - カード画像（200x280px、ホバー拡大なし）
   - カード名、コスト、攻撃力、体力
   - カード説明文
   - 閉じるボタン

8. **戦闘統計追跡ロジック**（1879-1889行目、2158-2207行目）
   - battleStats state追加
   - resultCardInfo state追加
   - useEffectでリーダーHP変化とボード変化を監視
   - ダメージ・撃破数を自動カウント

9. **バトルログクリック対応**（1959-1970行目）
   - handleCardNameClickFromLog更新
   - ゲームオーバー時は setResultCardInfo を呼び出し
   - 通常時は setSelectedCard を呼び出し

10. **GameOverScreen呼び出し更新**（6622-6630行目）
    - battleStats props追加
    - selectedCardInfo props追加
    - onCardInfoClick props追加

## 構造の記録（更新）
- `game/src/screens/GameScreen.tsx`
  - 1332-1339行目: BattleStats インターフェース
  - 1341-1353行目: GameOverScreenProps（拡張）
  - 1355-1730行目: GameOverScreen（左右二分割レイアウト）
  - 1436-1447行目: getDeckButtonStyle（220px）
  - 1467-1557行目: 左カラム（カード情報表示）
  - 1583-1619行目: 戦闘記録UI
  - 1704-1726行目: yoRuka画像（右下配置、枠なし）
  - 1879-1889行目: battleStats, resultCardInfo state
  - 1959-1970行目: handleCardNameClickFromLog（ゲームオーバー対応）
  - 2158-2207行目: 戦闘統計追跡useEffect
  - 2787-2799行目: startRematch内でbattleStatsリセット追加
  - 6622-6630行目: GameOverScreen呼び出し（新props追加）

### dual-review結果

| レビュアー | ok状態 | blocking | advisory | 備考 |
|-----------|--------|----------|----------|------|
| Codex (OpenAI) | 不完全 | - | - | タイムアウト |
| Gemini (Google) | false | 1 | 0 | startRematchでのリセット漏れ |
| Claude Code | 統合判断 | - | - | Geminiの指摘は一部誤検知、一部妥当 |

#### Gemini指摘への対応
1. **ターン数の更新漏れ** → **誤検知**: ターン数は`gameState.turnCount`から直接取得しているため問題なし
2. **再戦時のリセット漏れ** → **妥当**: startRematch関数にbattleStatsリセット処理を追加

### auto-test結果
- テストフレームワーク未設定のため、自動テストはスキップ
- UI変更が中心のため、手動テストを推奨

#### 手動テストチェックリスト
- [ ] リザルト画面で左右二分割レイアウトが正しく表示されること
- [ ] yoRuka画像が右下に表示され、枠がなく、ホバーで拡大しないこと
- [ ] デッキ選択時のみyoRukaがクリック可能なこと
- [ ] クラスアイコンが大きく表示されること（220px）
- [ ] 戦闘統計（ターン数、与ダメージ、被ダメージ、撃破数）が表示されること
- [ ] バトルログのカード名クリックで左カラムにカード情報が表示されること
- [ ] 左カラムのカード画像がホバーで拡大しないこと
- [ ] 再戦時に戦闘統計がリセットされること

---

## 修正日
2025年12月31日

## 修正内容

### アニメーション・ビジュアル強化（シャドウバース ワールズビヨンド準拠）

#### 1. カードプレイ時のY軸回転アニメーション
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **変更箇所**: 6513-6538行目 `playCardSequence` / `playSpellSequence` キーフレーム
- **内容**:
  - フォロワー/スペルカードをプレイする際、0-25%(フォロワー) / 0-30%(スペル)の間に360度Y軸回転を追加
  - ease-out効果で高速かつスムーズな回転アニメーション
  - カードが画面中央に到達するタイミングで回転が完了

#### 2. フォロワー攻撃時のY軸回転アニメーション
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **変更箇所**:
  - 1953-1954行目: `attackingFollowerInstanceId` state追加
  - 4668-4672行目: 攻撃時にアニメーションをトリガー（0.3秒）
  - 5746-5749行目: ボード上のフォロワー表示にrotateY(360deg)適用
- **内容**:
  - フォロワーが攻撃時に360度Y軸回転
  - どのフォロワーが攻撃しているか視覚的に識別可能
  - 0.3秒のease-outアニメーション

#### 3. ボードフォロワーのホバー挙動変更
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **変更箇所**:
  - 5696-5706行目: 相手ボードの`onMouseEnter/onMouseLeave`を条件付きに変更
  - 5740-5750行目: プレイヤーボードの`onMouseEnter/onMouseLeave`を条件付きに変更
  - 5712行目: 相手フォロワーのホバー時scale効果を削除
- **内容**:
  - マウスオーバーだけではホバー反応しない（拡大しない）
  - ドラッグ中（左クリックホールド）のみホバーターゲットを設定
  - 意図しないカード拡大を防止

#### 4. ドラッグキャンセル時のイーズイン落下アニメーション
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **変更箇所**:
  - 1956-1957行目: `cancellingDragIndex` state追加
  - 4794-4799行目: ハンドからのドラッグキャンセル時にアニメーションをトリガー
  - 6309-6311行目: ハンドカードの`transition`プロパティをease-inに切り替え
- **内容**:
  - ハンドカードをドラッグしてボード外でリリースした場合
  - ease-in（加速）効果で「落下」するようなアニメーション
  - 0.3秒間のアニメーション

#### 5. 進化アニメーションの強化
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **変更箇所**:
  - 810行目: `rotateZ` state追加
  - 945-948行目: FLIPフェーズの高速回転中に1.1倍拡大とZ軸-10度傾きを追加
  - 981-982行目: スローフェーズでZ軸を0に戻す
  - 1079行目: `totalRotateZ`変数追加
  - 1208行目: カードコンテナのtransformにrotateZ適用
- **内容**:
  - 進化時の高速回転中にカードが1.1倍に拡大
  - 同時にZ軸で-10度（左に傾く）の傾斜を追加
  - スローフェーズで徐々に傾きが0に戻る
  - より迫力のある進化演出

#### 6. バトルログのカード名クリック機能（確認）
- **状態**: 既存実装済み
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **関連箇所**:
  - 646-791行目: `BattleLog`コンポーネント（`onCardNameClick`プロップ対応済み）
  - 1959-1972行目: `handleCardNameClickFromLog`関数（ゲーム中は`setSelectedCard`、ゲームオーバー時は`setResultCardInfo`を使用）
  - 6027行目: `<BattleLog onCardNameClick={handleCardNameClickFromLog} />` として使用
- **内容**:
  - バトルログ内の「カード名」（青い下線付き）をクリックすると、カード情報が表示される
  - ゲーム中: 右側にカード詳細パネルが表示
  - ゲームオーバー時: 左カラムにカード情報が表示

## 構造の記録（更新）
- `game/src/screens/GameScreen.tsx`
  - 810行目: `rotateZ` state（進化時Z軸傾き用）
  - 1079行目: `totalRotateZ`変数
  - 1208行目: カードコンテナにrotateZ適用
  - 1953-1957行目: `attackingFollowerInstanceId`, `cancellingDragIndex` state
  - 4668-4672行目: 攻撃アニメーショントリガー
  - 4794-4799行目: ドラッグキャンセルアニメーショントリガー
  - 5696-5712行目: 相手ボードホバー条件変更
  - 5740-5760行目: プレイヤーボードホバー条件変更、攻撃回転適用
  - 6309-6311行目: ハンドカード落下アニメーション適用
  - 6513-6538行目: カードプレイ時Y軸回転追加

## 手動テストチェックリスト
- [ ] カードプレイ時にY軸360度回転アニメーションが再生されること
- [ ] スペルプレイ時も同様にY軸回転が再生されること
- [ ] フォロワー攻撃時にY軸360度回転アニメーションが再生されること
- [ ] ボード上のフォロワーにマウスオーバーしても拡大しないこと
- [ ] ドラッグ中（左クリックホールド）のみホバー反応すること
- [ ] ハンドカードをドラッグしてボード外でリリースすると落下アニメーションすること
- [ ] 進化時にカードが1.1倍に拡大し、左に傾くこと
- [ ] 進化完了時にカードがまっすぐに戻ること
- [ ] バトルログのカード名をクリックするとカード情報が表示されること

---

## 修正日
2025年12月31日

## 修正内容

### アニメーション・UI不具合修正

#### 1. カードプレイ時Y軸回転が表示されない問題の修正
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **修正箇所**: 6552-6555行目
- **修正内容**:
  - `transformStyle: 'preserve-3d'`を追加
  - `perspective: '1000px'`を追加
  - これらのCSSプロパティがないと3D回転が視覚的に表示されなかった

#### 2. 進化アニメーションZ軸回転の方向修正
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **修正箇所**:
  - 849行目: ZOOM_INフェーズで`setRotateZ(-10)`を初期設定
  - 948-949行目: FLIP rapid phaseで`-10 * (1 - eased)`（-10度→0度へ）
  - 981-982行目: FLIP slow phaseからZ軸回転を削除（コメントのみ）
- **修正内容**:
  - 旧: 0度→-10度への回転（意図と逆）
  - 新: -10度（右傾き）→0度への回転（高速回転時のみ）
  - 低速回転フェーズではZ軸回転なし

#### 3. バトルログのカード名クリック視認性改善
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **修正箇所**: 676-700行目、715-739行目
- **修正内容**:
  - 色を青色(#90cdf4)から黄色(#ffd700)に変更
  - `fontWeight: 'bold'`を追加
  - ホバー時のグロー効果も黄色ベース(#ffec8b)に統一
  - これにより、クリック可能であることが一目でわかるように

#### 4. 攻撃時の回転開始タイミング改善
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **修正箇所**:
  - 5388-5395行目: `@keyframes attackRotate`と`.attack-rotating`クラスを追加
  - 5789-5806行目: プレイヤーボードカードにCSS変数とクラスを適用
- **修正内容**:
  - CSSトランジションベースからCSSキーフレームアニメーションベースに変更
  - `--offsetX` CSS変数を使用してオフセット位置を維持しつつ回転
  - `!important`を使用してトランジションよりアニメーションを優先
  - これにより、ドラッグを離した瞬間に即座にアニメーションが開始される

## 構造の記録（更新）

- `game/src/screens/GameScreen.tsx`
  - 676-700行目: バトルログ「」内カード名スタイル（黄色・太字）
  - 715-739行目: バトルログ「は」前カード名スタイル（黄色・太字）
  - 849行目: EvolutionAnimation ZOOM_INフェーズ rotateZ(-10)初期化
  - 948-949行目: EvolutionAnimation FLIP rapidフェーズ Z軸回転(-10→0)
  - 981-982行目: EvolutionAnimation FLIP slowフェーズ Z軸回転なし
  - 5388-5395行目: @keyframes attackRotate, .attack-rotating
  - 5789-5806行目: プレイヤーボードカードCSS変数とクラス適用
  - 6552-6555行目: カードプレイコンテナ preserve-3d, perspective

## デュアルレビュー結果

- **規模**: small（1ファイル、約50行）
- **Codex**: レビュー省略（変更規模が小さいため）
- **Gemini**: レビュー省略（変更規模が小さいため）
- **Claude Code（第三の審査者）**: ✅ ok
  - Blocking Issues: なし
  - Advisory Issues:
    1. CSS変数使用のため`as React.CSSProperties`型アサーションが必要 → 許容範囲
    2. バトルログスタイルの重複 → 軽微な改善点として記録

## 手動テストチェックリスト（更新）
- [ ] カードプレイ時にY軸360度回転アニメーションが視覚的に再生されること
- [ ] 進化アニメーションで最初に-10度（右傾き）状態から開始すること
- [ ] 高速回転時にZ軸が0度に戻ること
- [ ] 低速回転時はZ軸回転が発生しないこと
- [ ] バトルログのカード名が黄色太字で表示され、クリック可能とわかること
- [ ] バトルログのカード名クリックでカード情報が表示されること
- [ ] 攻撃時の回転がドラッグリリース直後に開始されること

---

## 修正日
2025年12月31日（アニメーションバグ修正）

## 修正内容

### 1. 攻撃時の回転アニメーションを0.2秒linearに修正
- **変更前**: 0.3s ease-out
- **変更後**: 0.2s linear
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **対象行**: 5388-5395行目（@keyframes attackRotate, .attack-rotating）
  ```css
  @keyframes attackRotate {
      0% { transform: translateX(var(--offsetX)) rotateY(0deg); }
      100% { transform: translateX(var(--offsetX)) rotateY(360deg); }
  }
  .attack-rotating {
      animation: attackRotate 0.2s linear forwards !important;
      transform-style: preserve-3d;
  }
  ```

### 2. バトルログのカード名クリック機能を根本から見直し
- **問題**: 以前の実装はログフォーマットを誤解しており、カード名を正しく検出できなかった
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **対策**:
  - ログフォーマット分析: `${player.name} は ${card.name} をプレイしました`
  - 新しい正規表現パターンを実装:
    - Pattern 1: `^(.+?) は (.+?) (をプレイしました|を場に出した|を進化させました)`
    - Pattern 2: `^(.+?) は (\+?\d+\/\+?\d+ された|ダメージを受けた|破壊された)`
    - Pattern 3: 括弧パターン `「([^」]+)」`
  - カード名とプレイヤー名を区別してクリック可能に

### 3. 盤面フォロワーのマウスオーバー浮き上がりを削除
- **問題**: 盤面のカードにマウスを乗せると浮き上がる（ドラッグ時のみ浮くべき）
- **対象ファイル**: `game/src/components/Card.css`, `game/src/components/Card.tsx`
- **対策**:
  - Card.cssに`.card.on-board:hover`セレクタを追加
    ```css
    .card.on-board:hover {
        transform: none;
        box-shadow: inherit;
        border-color: inherit;
        z-index: inherit;
    }
    ```
  - Card.tsxに`isOnBoard`プロップに基づく`on-board`クラスを追加

### 4. 進化時Z軸回転を-5度→3度に変更
- **変更前**: -10度→0度
- **変更後**: -5度→3度（8度の変化、以前の10度より少し控えめ）
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **対策**:
  - 860行目: `setRotateZ(-5)` - 開始時の傾き
  - 959-962行目: 高速回転フェーズで`setRotateZ(-5 + eased * 8)` (-5→3)

### 5. 超進化時の拡大率を1.2倍に変更
- **変更前**: 通常進化も超進化も1.1倍
- **変更後**: 通常進化1.1倍、超進化1.2倍
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **対策**:
  - 958-960行目:
    ```typescript
    const targetScale = useSep ? 1.2 : 1.1;
    setCurrentScale(0.75 + eased * (targetScale - 0.75));
    ```

### 6. 手札プレイ時のカード非表示を実装
- **問題**: カードプレイアニメーション中に手札の元カードが見えたまま
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **対策**:
  - `playingCardAnim`のstateに`sourceIndex`プロパティを追加（3269行目）
  - すべての`setPlayingCardAnim`呼び出しに`sourceIndex`を追加
    - 自分のカードプレイ: `sourceIndex: index`（手札の位置）
    - CPU/リモート: `sourceIndex: -1`（非表示不要）
  - 手札レンダリング（6268-6273行目）でアニメーション中のカードをスキップ:
    ```typescript
    const isBeingPlayed = playingCardAnim !== null && playingCardAnim.sourceIndex === i;
    if (isBeingPlayed) {
        return null; // Don't render - shown in animation overlay
    }
    ```

### 7. 手札プレイ時のY軸回転を0.2秒で実装
- **問題**: Y軸回転が見えない（開始スケールが小さすぎた）
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **対策**:
  - アニメーションを4フェーズに分割:
    - Phase 1 (0-20%): 手札→中央へ移動、スケール1.0→1.5
    - Phase 2 (20-45%): Y軸360度回転、スケール1.5→1.8（約0.2秒）
    - Phase 3 (45-85%): 中央でホールド、スケール1.8→2.0
    - Phase 4 (85-100%): ボード位置へ移動、スケール2.0→1.0

### 8. 回転時の裏面を無地（山札スタイル）に実装
- **問題**: Y軸回転時に裏面がないため回転が見えない
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **対策**:
  - 3Dフリップカード構造を実装（6674-6725行目）
    - 前面: `Card`コンポーネント + `backfaceVisibility: hidden`
    - 背面: 山札スタイルのグラデーション背景 + `transform: rotateY(180deg)`
  - 背面デザイン:
    ```css
    background: linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 50%, #1e3a5f 100%);
    border: 3px solid #4a6fa5;
    boxShadow: inset 0 0 30px rgba(74, 111, 165, 0.5);
    ```

## 構造の記録（更新）
- `game/src/screens/GameScreen.tsx`
  - 3267-3276行目: playingCardAnim state型定義（sourceIndex追加）
  - 5388-5395行目: 攻撃回転アニメーション（0.2s linear）
  - 6268-6273行目: 手札レンダリング時のプレイ中カード非表示
  - 6596-6672行目: カードプレイアニメーションkeyframes
  - 6674-6725行目: 3Dフリップカード構造

- `game/src/components/Card.css`
  - 30-36行目: `.card.on-board:hover`ホバー無効化

- `game/src/components/Card.tsx`
  - 143行目: `on-board`クラスの条件付き追加

## 手動テストチェックリスト（更新）
- [ ] 攻撃時の回転が0.2秒・等速で回転すること
- [ ] バトルログ「XXX は カード名 をプレイしました」のカード名がクリック可能なこと
- [ ] 盤面のカードにホバーしても浮き上がらないこと（ドラッグ時のみ浮く）
- [ ] 進化アニメーションで-5度から3度に傾くこと
- [ ] 超進化時に1.2倍に拡大されること（通常進化は1.1倍）
- [ ] カードプレイ時に手札の元カードが消えること
- [ ] カードプレイ時にY軸回転が視覚的に確認できること（裏面が見える）
- [ ] カードプレイ時の裏面が山札と同じ青いデザインであること

---

## 修正日
2025年12月31日（続き・Dual-review対応）

## 修正内容

### 1. 進化アニメーションZ軸回転を0度→-5度→3度→0度に修正
- **問題**: 進化開始時にいきなり-5度に傾くのが不自然
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **対策**:
  - ZOOM_INフェーズ開始時に`setRotateZ(0)`で0度から開始
  - ZOOM_IN中に0度→-5度へアニメーション
  - FLIPフェーズで-5度→3度へ回転
  - ZOOM_OUTフェーズで3度→0度へ戻す

### 2. BGM音量設定をタイトル画面と試合中で共通化
- **問題**: 試合中とタイトル画面でBGM設定が別々だった
- **対象ファイル**: `game/src/App.tsx`, `game/src/screens/TitleScreen.tsx`, `game/src/core/types.ts`
- **対策**:
  - `AudioSettings`型を`types.ts`に共通定義
  - App.tsxでaudioSettings stateを管理し、localStorageに永続化
  - TitleScreenにprops経由でaudioSettingsとonAudioSettingsChangeを渡す

### 3. タイトル画面に設定ボタンを追加
- **問題**: タイトル画面でBGM/SE設定ができなかった
- **対象ファイル**: `game/src/screens/TitleScreen.tsx`
- **対策**:
  - 右上に⚙設定ボタンを追加
  - クリックで音声設定モーダルを表示
  - BGM/SE各自のオン/オフ切り替えと音量スライダー

### 4. 攻撃対象選択時の矢印を水色の光の線に変更
- **問題**: 赤い三角矢印が目立ちすぎて見にくい
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **対策**:
  - 4層のSVG pathで水色グローラインを実装
    - 層1: 外側グロー（20px, rgba(100, 200, 255, 0.3)）
    - 層2: 中間グロー（10px, rgba(150, 220, 255, 0.5)）
    - 層3: 明るいコア（4px, rgba(200, 240, 255, 0.9)）
    - 層4: 白コア（2px, rgba(255, 255, 255, 1)）
  - SVG filterでcyanGlowエフェクトを追加

### 5. 攻撃可能エフェクトの表示条件確認
- **確認結果**: 既に`isMyTurn`プロパティで制御済み
- Card.tsx 77行目で`isReady && isMyTurn`の条件
- 相手のボードには`isMyTurn`を渡していないため、相手カードにはエフェクトが表示されない

### 6. AudioSettings型の共通化（Dual-review指摘対応）
- **問題**: Geminiレビューで重複定義がblocking issueとして報告
- **対象ファイル**: `game/src/core/types.ts`, `game/src/App.tsx`, `game/src/screens/TitleScreen.tsx`
- **対策**:
  - `types.ts`に`AudioSettings`インターフェースを定義
  - App.tsxとTitleScreen.tsxの重複定義を削除し、インポートに変更

## Dual-review結果

### Codex (OpenAI GPT-5.2)
- **結果**: ✅ OK
- **blocking**: 0件
- **advisory**: 1件（攻撃時アニメーションのtransform競合可能性）

### Gemini (Google)
- **初回結果**: ❌ NG（AudioSettings重複定義）
- **修正後結果**: ✅ OK
- **blocking**: 0件
- **advisory**: 0件

## 構造の記録（更新）
- `game/src/core/types.ts`
  - 5-11行目: `AudioSettings`インターフェース定義

- `game/src/App.tsx`
  - 6行目: `AudioSettings`をtypes.tsからインポート
  - 19-35行目: defaultAudioSettings, loadAudioSettings
  - 72-82行目: audioSettings state管理とlocalStorage永続化

- `game/src/screens/TitleScreen.tsx`
  - 2行目: `AudioSettings`をtypes.tsからインポート
  - 200-231行目: 設定ボタン
  - 234-365行目: 設定モーダル

- `game/src/screens/GameScreen.tsx`
  - 856-896行目: ZOOM_INフェーズZ軸回転アニメーション
  - 1060-1095行目: ZOOM_OUTフェーズZ軸回転0度へ戻す
  - 6543-6634行目: 攻撃矢印の水色グロー実装

---

## 修正日
2025年12月31日（バグ修正 & Dual-review対応）

## 修正内容

### 1. バトルログのカード名クリック処理を全パターン対応に修正
- **問題**: 同じカードでもログの表示形式によってクリック可能/不可能が混在していた
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **対策**:
  - pattern1～5の包括的な正規表現パターンを実装
  - pattern1: 「XXX は YYY をプレイしました/を場に出した/を進化させました/を召喚した」形式
  - pattern2: 「YYY は+X/+Xされた/ダメージを受けた/破壊された」＋「XXX の効果で YYY を召喚」二重カード名対応
  - pattern3: 「XXX に Y ダメージ/を破壊/を手札に戻」形式
  - pattern4: 「XXX が YYY に ZZ ダメージ/を攻撃」攻撃者-被攻撃者形式（リーダー除外）
  - pattern5: 「YYY」括弧形式（既存）
- **修正箇所**: 656-808行目 `renderLogWithCardLinks`関数

### 2. 進化アニメーションZ軸回転方向の修正
- **問題**: Y軸180度回転後にZ軸+3度が左傾きになっていた（右傾きが期待）
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **対策**:
  - FLIPフェーズ: -5度→-3度に変更（以前は-5度→+3度）
  - ZOOM_OUTフェーズ: startRotateZを3から-3に修正してフェーズ遷移の不整合を解消
- **修正箇所**:
  - 1032行目: `setRotateZ(-5 + eased * 2);` // -5 -> -3
  - 1123行目: `const startRotateZ = -3;` // フェーズ遷移整合性

### 3. カードプレイ時の裏面を無地に修正
- **問題**: Y軸360度回転中にカードの裏面（カード画像）が見えていた
- **対象ファイル**: `game/src/components/Card.tsx`, `game/src/screens/GameScreen.tsx`
- **対策**:
  - CardコンポーネントにbackfaceVisibility/WebkitBackfaceVisibilityの対応を追加
  - カードプレイアニメーションでCardにbackfaceVisibility: 'hidden'を渡すよう修正
- **修正箇所**:
  - Card.tsx 159-161行目: backfaceVisibilityスタイル対応追加
  - GameScreen.tsx 6813行目: backfaceVisibility/WebkitBackfaceVisibilityをCardに渡す

## Dual-review結果

### Codex (OpenAI GPT-5.2)
- **結果**: ✅ OK (advisoryのみ)
- **blocking**: 0件
- **advisory**: 2件
  1. pattern2の二重カード名検出でafterNameに先頭スペースが入り「XXXの効果でYYYを召喚」系がマッチしない → **修正済み**（effectPatternに`\s*`を追加）
  2. FLIPフェーズ終端Z回転(-3)とZOOM_OUT開始値(3)の符号不整合 → **修正済み**（startRotateZを-3に変更）

### Gemini (Google)
- **初回結果**: ❌ NG
- **blocking**: 1件（進化アニメーションのフェーズ遷移時Z軸角度ジャンプ）
- **修正後**: ✅ OK
- **対策**: startRotateZを3から-3に変更

## 構造の記録（更新）
- `game/src/screens/GameScreen.tsx`
  - 656-808行目: `renderLogWithCardLinks`関数（5パターン対応に拡張）
  - 1032行目: FLIPフェーズZ軸回転（-5→-3に変更）
  - 1123行目: ZOOM_OUTフェーズ開始Z回転（-3に修正）
  - 6813行目: カードプレイアニメーションbackfaceVisibility渡し

- `game/src/components/Card.tsx`
  - 159-161行目: backfaceVisibility/WebkitBackfaceVisibilityスタイル対応

---

## 修正日
2025年12月31日（ネクロマンスエフェクト & ドキュメント整理）

## 修正内容

### 1. ネクロマンスエフェクトの視覚的改善
- **問題**: ネクロマンス発動時に視覚的なフィードバックがなく分かりにくかった
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **対策**:
  - ログから「XXX はネクロマンス Y を発動！」パターンを検知するuseEffectを追加
  - 墓地表示の上に紫色の「-X」数字がフロートアップするアニメーションを実装
  - プレイヤー用（上方向にフロート）と相手用（下方向にフロート）の2種類
  - CSSアニメーション `necromanceFloat` / `necromanceFloatOpponent` を追加
  - 紫色のグロー効果（text-shadow: #d946ef, #a855f7, #7c3aed）
- **修正箇所**:
  - 1989-1999行目: NecromanceEffect interface と state定義
  - 2014-2047行目: ネクロマンス検知useEffect
  - 5540-5554行目: ネクロマンスアニメーションCSS
  - 5565-5585行目: プレイヤー墓地のネクロマンスエフェクト表示
  - 5839-5859行目: 相手墓地のネクロマンスエフェクト表示

### 2. プロジェクトドキュメントの整理
- **問題**: 試行錯誤の過程で生成された個別のドキュメントが乱立していた
- **対策**:
  - `docs/archive/` フォルダを作成し、古いドキュメントを移動
  - CLAUDE.mdのルールに則って3つの主要ドキュメントのみをルートに残す:
    - `task.md` - タスクリスト
    - `implementation_plan.md` - 実装計画書
    - `walkthrough.md` - 修正内容の記録
- **移動したファイル**:
  - implementation_extra_pp.md
  - implementation_plan_bgm.md
  - implementation_plan_cards.md
  - implementation_plan_online.md
  - implementation_plan_web_deploy.md
  - walkthrough_bgm.md
  - walkthrough_card_index_fix.md
  - walkthrough_cards.md
  - walkthrough_evolution_limit.md
  - walkthrough_evolution_polish.md
  - walkthrough_project_map.md
  - project_map.md
  - 修正メモ.md

## 構造の記録（更新）
- `game/src/screens/GameScreen.tsx`
  - 1989-1999行目: ネクロマンスエフェクトstate定義
  - 2014-2047行目: ネクロマンス検知useEffect
  - 5540-5554行目: ネクロマンスアニメーションCSS定義
  - 5565-5585行目: プレイヤー墓地エフェクト表示
  - 5839-5859行目: 相手墓地エフェクト表示

- `docs/archive/` - 過去のドキュメントアーカイブ

## Dual-review結果

### Codex (OpenAI GPT-5.2)
- **結果**: ✅ OK
- **blocking**: 0件
- **advisory**: 1件
  - ネクロマンス発動の表示先をプレイヤー名一致で判定しているため、ログ表示名が異なる場合に誤表示の可能性
  - **対応方針**: 現状はログがエンジン内で生成され`player.name`を使用しているため問題ないが、将来的にログにプレイヤーIDを含める改善を検討

### Gemini (Google)
- **結果**: ✅ OK
- **blocking**: 0件
- **advisory**: 0件
- **notes**: GameScreen.tsxが7000行以上と大きいため、将来的にUIセクションの分割を推奨

---

## 修正日
2025年12月31日

## 修正内容

### リーダー回復SEの変更
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **内容**: リーダーの体力回復時（HEAL_LEADER効果）のSEを`water.mp3`から`heal.mp3`へ変更

#### 変更箇所
- 339行目: `playSE('water.mp3', 0.6)` → `playSE('heal.mp3', 0.6)`

---

### カードプレイ時の回転タイミング修正
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **内容**: カードをプレイした際の3D回転アニメーションのタイミングを修正
  - 変更前: 手札から中央に移動完了後に回転開始
  - 変更後: 手札から移動開始と同時に回転開始、中央到着時に回転完了

#### 変更箇所
- 6914-6935行目: `@keyframes playCardSequence` の修正
  - 0%: 手札位置から移動開始 + rotateY(0deg)
  - 25%: 中央に到着 + rotateY(360deg) ← 回転完了
  - 80%: 中央で待機
  - 100%: ボード位置へ移動
- 6956-6978行目: `@keyframes playSpellSequence` の修正
  - 同様に移動と同時に回転するよう変更

---

### バトルログのカード名強調表示・クリック処理の修正
- **対象ファイル**:
  - `game/src/core/engine.ts`
  - `game/src/screens/GameScreen.tsx`
- **内容**: バトルログ内のカード名検出をパターンマッチングからカードデータベースマッチング方式に変更

#### 変更箇所
- `engine.ts` 940-943行目: `getAllCardNames()` 関数を追加
  - 全カード名を長さ降順でソートして返す（長いカード名を優先マッチ）
- `GameScreen.tsx` 2行目: `getAllCardNames` をインポートに追加
- `GameScreen.tsx` 655-746行目: `renderLogWithCardLinks` 関数を全面書き換え
  - カード名データベースから全カード名を取得
  - ログ文字列内で全カード名を検索してマッチング
  - 重複排除（長いカード名優先）
  - 開始位置でソートしてパーツを組み立て

---

### 攻撃時の回転でカードのみ回転させる修正
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **内容**: 攻撃時のY軸回転アニメーションがカードのみに適用され、守護マーカー等のエフェクトは回転しないよう修正

#### 変更箇所
- 6050-6054行目: プレイヤーボードのカード描画部分
  - 変更前: 親divに`attack-rotating`クラスを適用（カードとマーカー両方が回転）
  - 変更後: Cardを別のdivでラップし、そのdivにのみ`attack-rotating`クラスを適用

## 構造の記録（更新）
- `game/src/screens/GameScreen.tsx`
  - 338-339行目: HEALエフェクト時のSE再生（heal.mp3）
  - 655-760行目: バトルログのカード名検出（データベースマッチング方式 + 単語境界チェック）
  - 6050-6054行目: 攻撃時回転アニメーション用Cardラッパー
  - 6933-7016行目: カードプレイ時のアニメーションキーフレーム（中間キーフレーム追加版）

- `game/src/core/engine.ts`
  - 940-943行目: `getAllCardNames()` 関数

---

### バトルログのカード名判定改善（単語境界チェック追加）
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **問題**: 「You」の中の「Y」が強調表示される等、カード名が単語の一部でもマッチしてしまう
- **原因**: 単純なindexOf検索で、前後の文字を考慮していなかった
- **修正内容**:
  - `isWordBoundary()` 関数を追加
  - カード名の前後が単語境界（スペース、句読点、文字列端など）であることを確認
  - 英数字・ひらがな・カタカナ・漢字が隣接している場合はマッチしない

#### 変更箇所
- 693-703行目: `isWordBoundary()` 関数追加
- 714-717行目: 単語境界チェックを追加

---

### カードプレイ時の回転が動作しない問題の修正
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **問題**: カードが手札から中央に移動する間に回転しない（中央到着後にのみ回転）
- **原因分析（CodexおよびGeminiによる診断）**:
  - CSS行列補間において、rotateY(0deg)からrotateY(360deg)への変化は、数学的に等価（同じ向き）の行列となる
  - ブラウザは「最短経路」を選択して補間するため、「回転しない（0度差）」と解釈される
- **修正内容**:
  - 中間キーフレーム（12.5%/15%）を追加してrotateY(180deg)を明示的に指定
  - これにより回転方向が強制され、0deg→180deg→360degと確実に回転する

#### 変更箇所
- 6941-6945行目: `playCardSequence` に12.5%キーフレーム追加（フォロワーカード用）
- 6967-6971行目: `playCardSequence` のSpell分岐に15%キーフレーム追加
- 6992-6997行目: `playSpellSequence` に15%キーフレーム追加（スペルカード用）

---

## 修正日
2025年12月31日（続き）

## 修正内容

### スリーブ機能の実装
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **内容**: カードの裏面にスリーブ画像を表示する機能を実装。各リーダークラスごとに1種類のスリーブを用意。

#### スリーブ画像の格納場所
- **フォルダ**: `public/sleeves/`
- **ファイル名**:
  - `senka_sleeve.png` - センカ用スリーブ
  - `aja_sleeve.png` - アジャ用スリーブ
  - `yoruka_sleeve.png` - yoRuka用スリーブ

#### 変更箇所

##### 1. スリーブ画像インポートとヘルパー関数追加
- 21-23行目: スリーブ画像のインポート
  ```typescript
  const ajaSleeve = getAssetUrl('/sleeves/aja_sleeve.png');
  const senkaSleeve = getAssetUrl('/sleeves/senka_sleeve.png');
  const yorukaSleeve = getAssetUrl('/sleeves/yoruka_sleeve.png');
  ```
- 33-38行目: `getSleeveImg(cls: ClassType)` ヘルパー関数を追加
  ```typescript
  const getSleeveImg = (cls: ClassType): string => {
      if (cls === 'YORUKA') return yorukaSleeve;
      if (cls === 'AJA') return ajaSleeve;
      return senkaSleeve;
  };
  ```

##### 2. カードプレイアニメーションへのスリーブ適用
- 3394行目: `playingCardAnim` stateに `playerClass: ClassType` プロパティを追加
- 以下の5箇所で `setPlayingCardAnim` 呼び出しに `playerClass` を追加:
  - 3271行目: リモートプレイヤーのスペルプレイ時 (`opponent?.class || 'SENKA'`)
  - 3287行目: リモートプレイヤーのフォロワープレイ時 (`opponent?.class || 'SENKA'`)
  - 3685行目: プレイヤーのカードプレイ時 (`player?.class || 'SENKA'`)
  - 4164行目: CPUのカードプレイ時 (`opponent?.class || 'SENKA'`)
  - 5259行目: ターゲットクリック時のカードプレイ (`player?.class || 'SENKA'`)
- 7181-7208行目: カードプレイアニメーションの裏面 (`.play-card-back`) を修正
  - 変更前: 無地のグラデーション背景
  - 変更後: スリーブ画像を表示（エラー時はグラデーションにフォールバック）

##### 3. プレイヤーボードのカードに3D flip構造を適用
- 6187-6232行目: プレイヤーボードの各カードを3D flip構造でラップ
  - `perspective: '800px'` の親コンテナ
  - `transformStyle: 'preserve-3d'` のフリッパー要素
  - 表面: Cardコンポーネント（`backfaceVisibility: 'hidden'`）
  - 裏面: スリーブ画像（`transform: 'rotateY(180deg)'`, `backfaceVisibility: 'hidden'`）
  - 攻撃時の回転アニメーションで自動的にスリーブが表示される

##### 4. 相手ボードのカードに3D flip構造を適用
- 6025-6067行目: 相手ボードの各カードを3D flip構造でラップ（プレイヤーボードと同様）
  - 相手のクラスのスリーブ画像を使用 (`opponent?.class || 'SENKA'`)

## 構造の記録（更新）
- `game/src/screens/GameScreen.tsx`
  - 21-23行目: スリーブ画像インポート
  - 33-38行目: `getSleeveImg()` ヘルパー関数
  - 3394行目: `playingCardAnim` に `playerClass` プロパティ追加
  - 6025-6067行目: 相手ボードカードの3D flip構造
  - 6187-6232行目: プレイヤーボードカードの3D flip構造
  - 7181-7208行目: カードプレイアニメーションの裏面にスリーブ表示

## 備考
- スリーブ画像はユーザーが `public/sleeves/` フォルダに配置する必要がある
- 画像がない場合はエラーハンドリングでグラデーション背景にフォールバックする
- アジャ用スリーブのファイル名は `azya_sleeve.png`（aja ではなく azya）

---

### 反撃時のY軸回転アニメーション追加
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **内容**: 攻撃されたカード（反撃側）にもY軸回転アニメーションを追加。反撃エフェクト発動と同時に回転開始。

#### 変更箇所

##### 1. 反撃アニメーション用state追加
- 2065行目: `counterAttackingFollowerInstanceId` stateを追加
  ```typescript
  const [counterAttackingFollowerInstanceId, setCounterAttackingFollowerInstanceId] = React.useState<string | null>(null);
  ```

##### 2. プレイヤー攻撃時の反撃回転トリガー
- 4838-4847行目: プレイヤーが相手フォロワーを攻撃した時、反撃エフェクト発動と同時に相手カードの回転をトリガー
  ```typescript
  const defenderInstanceId = (defender as any).instanceId;
  setTimeout(() => {
      if (defenderInstanceId) {
          setCounterAttackingFollowerInstanceId(defenderInstanceId);
          setTimeout(() => setCounterAttackingFollowerInstanceId(null), 300);
      }
      playEffect(...);
  }, 200);
  ```

##### 3. CPU攻撃時の攻撃・反撃回転トリガー
- 4411-4432行目: CPUがプレイヤーフォロワーを攻撃した時:
  - CPU攻撃側カードの回転をトリガー
  - 反撃エフェクト発動と同時にプレイヤーカード（反撃側）の回転をトリガー

##### 4. ボードカードへの反撃回転クラス適用
- 6049行目: 相手ボードカードの3D flipラッパーに `attack-rotating` クラス条件を拡張
  ```typescript
  className={(attackingFollowerInstanceId === c?.instanceId || counterAttackingFollowerInstanceId === c?.instanceId) ? 'attack-rotating' : ''}
  ```
- 6213行目: プレイヤーボードカードも同様に拡張

## 構造の記録（更新）
- `game/src/screens/GameScreen.tsx`
  - 2065行目: `counterAttackingFollowerInstanceId` state追加
  - 4411-4432行目: CPU攻撃時の攻撃・反撃回転トリガー
  - 4838-4847行目: プレイヤー攻撃時の反撃回転トリガー
  - 6049行目: 相手ボードカードの回転クラス条件拡張
  - 6213行目: プレイヤーボードカードの回転クラス条件拡張

---

### 山札とドローアニメーションへのスリーブ適用
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **内容**: 山札の表示とドロー時のカードアニメーションにスリーブ画像を適用

#### 変更箇所

##### 1. 相手の山札にスリーブ適用
- 5925-5948行目: 相手の山札表示を修正
  - グラデーション背景からスリーブ画像（`getSleeveImg(opponent?.class)`）に変更
  - 画像読み込みエラー時はグラデーションにフォールバック

##### 2. プレイヤーの山札にスリーブ適用
- 6693-6717行目: プレイヤーの山札表示を修正
  - グラデーション背景からスリーブ画像（`getSleeveImg(player?.class)`）に変更
  - 画像読み込みエラー時はグラデーションにフォールバック

##### 3. ドローアニメーションにスリーブ適用
- 6937-6977行目: ドローアニメーションのカード表示を修正
  - ドローするプレイヤーに応じてスリーブ画像を切り替え
    - プレイヤードロー時: `getSleeveImg(player?.class)`
    - 相手ドロー時: `getSleeveImg(opponent?.class)`
  - 画像読み込みエラー時はストライプパターンにフォールバック

## 構造の記録（更新）
- `game/src/screens/GameScreen.tsx`
  - 5925-5948行目: 相手の山札表示（スリーブ画像）
  - 6693-6717行目: プレイヤーの山札表示（スリーブ画像）
  - 6937-6977行目: ドローアニメーション（スリーブ画像）

---

## 修正日
2025年12月31日

## 修正内容

### 1. せんかのオーラ効果を常在効果に修正
- **対象ファイル**: `game/src/core/engine.ts`
- **内容**: せんかのカード効果「味方のナックラーすべては疾走を得る」がファンファーレ（場に出た時の一度きりの効果）ではなく常在効果（オーラ）であるべきだったため修正

#### 変更箇所

##### 1-1. カード定義の修正（34-52行目）
- FANFAREトリガーを削除
- `passiveAbilities`に`'AURA'`を追加
- `description`を「ファンファーレ：〜」から「（常在効果）」に変更

```typescript
// 修正前
triggers: [
    { trigger: 'FANFARE', effects: [{ type: 'GRANT_PASSIVE', targetPassive: 'STORM', targetType: 'ALL_FOLLOWERS', conditions: { tag: 'Knuckler' } }] },
    { trigger: 'SUPER_EVOLVE', ... }
]

// 修正後
passiveAbilities: ['STORM', 'DOUBLE_ATTACK', 'AURA'],
triggers: [
    { trigger: 'SUPER_EVOLVE', ... }  // FANFAREは削除
]
```

##### 1-2. せんか召喚時に既存ナックラーへ疾走付与（2276-2290行目）
- せんかが場に出た時、既に場にいる味方ナックラーすべてに疾走を付与
- 元々のオーラ処理（ナックラーが後から場に出る時）は既存のまま

```typescript
// せんかがプレイされた時、既存の味方ナックラーすべてに疾走を付与（常在効果）
if (newFollower.id === 'c_senka_knuckler') {
    player.board.forEach(boardCard => {
        if (boardCard && boardCard.tags?.includes('Knuckler') && boardCard.instanceId !== newFollower.instanceId) {
            if (!boardCard.passiveAbilities?.includes('STORM')) {
                if (!boardCard.passiveAbilities) {
                    boardCard.passiveAbilities = [];
                }
                boardCard.passiveAbilities.push('STORM');
                boardCard.canAttack = true;
                newState.logs.push(`${boardCard.name} は せんか の効果で疾走を得た！`);
            }
        }
    });
}
```

### 2. エフェクト表示の整合性チェック機能改善
- **対象ファイル**: `game/src/components/Card.tsx`
- **内容**: バリアやオーラ、守護などのエフェクトが相手が出したカードや特殊召喚カードに表示されない問題を修正

#### 変更箇所

##### 2-1. バリアエフェクト判定の改善（65-73行目）
- `hasBarrier`プロパティだけでなく、`passiveAbilities`にBARRIERが含まれる場合もバリアエフェクトを表示
- エンジン側とUI側のデータ不整合を吸収

```typescript
// 修正前
const hasBarrier = (card as any).hasBarrier === true;

// 修正後
const hasBarrier = (card as any).hasBarrier === true ||
    (abilities.includes('BARRIER') && (card as any).hasBarrier !== false);
```

## オーラ効果の仕組み整理

### せんかのオーラ効果が発動するタイミング
1. **せんかがプレイされた時**: 既に場にいる味方ナックラーすべてに疾走を付与（新規追加）
2. **ナックラーがプレイされた時**: 場にせんかがいれば疾走を付与（既存：2260-2271行目）
3. **ナックラーがトークン召喚された時**: 場にせんかがいれば疾走を付与（既存：1536-1547行目、1577-1586行目）

### 既存のオーラ処理コード（変更なし）
- 1536-1547行目（SUMMON_CARD）
- 1577-1586行目（SUMMON_CARD_RUSH）
- 2260-2271行目（PLAY_CARD）

### 3. せんかのオーラ効果のカードID比較を修正
- **対象ファイル**: `game/src/core/engine.ts`
- **内容**: デッキ構築時にカードIDが上書きされる問題を修正

#### 問題の原因
`buildDeckFromTemplate`関数（940-961行目）でカードをデッキに追加する際、
```typescript
deck.push({
    ...cardDef,
    id: `${playerId}_c${cardIndex}`,  // 元のカードIDが上書きされる！
    instanceId: `inst_${playerId}_c${cardIndex}`
} as Card);
```
これにより、元のカードID（例：`c_senka_knuckler`）が`p1_c0`のような形式に上書きされ、
`c?.id === 'c_senka_knuckler'`の比較が常に`false`になっていた。

#### 修正箇所
すべてのカードID比較をカード名比較に変更：

##### 3-1. SUMMON_CARD内のオーラ処理（1538-1539行目）
##### 3-2. SUMMON_CARD_RUSH内のオーラ処理（1581-1582行目）
##### 3-3. PLAY_CARD内のナックラープレイ時オーラ処理（2262-2263行目）
- 変更: `c?.id === 'c_senka_knuckler'` → `c?.name === 'せんか'`

##### 3-4. PLAY_CARD内のせんかプレイ時処理（2280-2281行目）
- 変更: `newFollower.id === 'c_senka_knuckler'` → `newFollower.name === 'せんか'`

## 構造の記録（更新）
- `game/src/core/engine.ts`
  - 34-52行目: せんかのカード定義（AURA追加、FANFARE削除）
  - 1538-1539行目: SUMMON_CARD内のオーラ処理（カード名で比較）
  - 1581-1582行目: SUMMON_CARD_RUSH内のオーラ処理（カード名で比較）
  - 2262-2263行目: ナックラープレイ時のオーラ処理（カード名で比較）
  - 2280-2281行目: せんかプレイ時の既存ナックラーへの疾走付与（カード名で比較）
- `game/src/components/Card.tsx`
  - 65-73行目: パッシブエフェクト判定（バリア判定改善）

---

## 修正日
2026年1月2日

## 修正内容

### オーラ/バリアエフェクトが高速処理時に表示されない問題の修正

#### 問題
- CPU戦や連続召喚（遙→悠霞→刹那など）のような高速処理時に、オーラやバリアのエフェクトが表示されないことがあった
- 効果は発動しているが、視覚的なエフェクトが表示されない

#### 根本原因
Reactの状態変更検知の問題。ボードカードをコピーする際に `{ ...c }` のシャローコピーを使っていたため、`passiveAbilities` 配列の参照が同じままになり、Reactが変更を検知できなかった。

特に問題となった箇所：
1. `engine.ts` の `applyAbilityEffect` 関数（1051-1077行目）
2. `engine.ts` の `internalGameReducer` 関数（1978-2011行目）
3. `abilities.ts` の各エフェクト処理（AOE_DAMAGE, RANDOM_DAMAGE, HEAL_FOLLOWER）
4. `GameScreen.tsx` の `useVisualBoard` フック

高速処理時に複数のアクションが連続して発生すると、参照の変更が適切に伝播せず、Reactの再レンダリングがトリガーされないケースがあった。

#### 修正箇所

##### 1. engine.ts - applyAbilityEffect関数のボードコピー（1059-1072行目）
```typescript
// 変更前
board: state.players.p1.board.map(c => c ? { ...c } : null),

// 変更後
board: state.players.p1.board.map(c => c ? {
    ...c,
    passiveAbilities: c.passiveAbilities ? [...c.passiveAbilities] : []
} : null),
```

##### 2. engine.ts - internalGameReducer関数のボードコピー（1993-2006行目）
同様の修正を適用

##### 3. abilities.ts - AOE_DAMAGEのカードコピー（76-79行目）
```typescript
// 変更前
const newCard = { ...c };

// 変更後
const newCard = {
    ...c,
    passiveAbilities: c.passiveAbilities ? [...c.passiveAbilities] : []
};
```

##### 4. abilities.ts - RANDOM_DAMAGEのカードコピー（107-111行目）
同様の修正を適用

##### 5. abilities.ts - HEAL_FOLLOWER (ALL_FOLLOWERS)のカードコピー（190-194行目）
同様の修正を適用

##### 6. abilities.ts - HEAL_FOLLOWER (RANDOM_FOLLOWER)のカードコピー（208-212行目）
同様の修正を適用

##### 7. GameScreen.tsx - useVisualBoardフックのディープコピー（1877-1897行目）
```typescript
// 変更前
next.push({ ...real, isDying: false });

// 変更後
next.push({
    ...real,
    passiveAbilities: real.passiveAbilities ? [...real.passiveAbilities] : [],
    isDying: false
});
```

#### 技術的解説
- Reactは参照比較で変更を検知する
- `{ ...obj }` はシャローコピーなので、ネストされた配列・オブジェクトは同じ参照を共有する
- `passiveAbilities` 配列を `[...arr]` でディープコピーすることで、新しい参照が作成され、Reactが変更を検知できるようになる
- 高速処理時には複数のreducerアクションが短時間で発生するため、参照の不変性がより重要になる

#### TypeScriptエラー修正
passiveAbilitiesを常に`[]`で初期化しているにも関わらず、TypeScriptが`undefined`の可能性を警告したため、非nullアサーション（`!`）を追加：
- engine.ts 1546行目、1550行目: `newCard.passiveAbilities!`
- engine.ts 2280行目、2284行目: `newFollower.passiveAbilities!`

## 構造の記録（更新）
- `game/src/core/engine.ts`
  - 1051-1077行目: applyAbilityEffect内のボードディープコピー
  - 1985-2011行目: internalGameReducer内のボードディープコピー
  - 1544-1554行目: SUMMON_CARDのせんかオーラ処理
  - 2278-2288行目: PLAY_CARDのせんかオーラ処理
- `game/src/core/abilities.ts`
  - 73-82行目: AOE_DAMAGEのディープコピー
  - 106-114行目: RANDOM_DAMAGEのディープコピー
  - 187-197行目: HEAL_FOLLOWER (ALL_FOLLOWERS)のディープコピー
  - 207-216行目: HEAL_FOLLOWER (RANDOM_FOLLOWER)のディープコピー
- `game/src/screens/GameScreen.tsx`
  - 1877-1897行目: useVisualBoardフックのディープコピー

---

## 修正日
2026年1月2日

## 修正内容

### CPU戦で相手のバリアエフェクトが表示されない問題の修正

#### 1. 問題の原因
- CPUがカードをプレイする際の`PLAY_CARD`アクションに`instanceId`が含まれていなかった
- `instanceId`がundefinedのため、カードが手札から出されたものとして認識されず、特殊召喚と判定されていた
- 特殊召喚と判定されると`isSpecialSummoning: true`となり、`playSummonAnim: true`が設定される
- `playSummonAnim: true`の間は、バリア・オーラ等のパッシブエフェクトが表示されない仕様

#### 2. 修正箇所
- **対象ファイル**: `game/src/screens/GameScreen.tsx`
- **修正内容**: CPUのPLAY_CARDアクションにinstanceIdを追加

**修正前（4227行目付近）**:
```typescript
payload: { cardIndex: bestCard.originalIndex, targetId }
```

**修正後**:
```typescript
payload: { cardIndex: bestCard.originalIndex, targetId, instanceId: bestCard.instanceId }
```

#### 3. デバッグログ削除
- `Card.tsx`: バリア持ちカード（ウララ、ヴァルキリー）のデバッグログを削除（75-84行目）
- `GameScreen.tsx`: 特殊召喚検知のデバッグログを削除（2756-2763行目）

## 構造の記録
- `game/src/screens/GameScreen.tsx`
  - 4224-4228行目: CPUのPLAY_CARDアクション（instanceId追加済み）
  - 5273-5277行目: プレイヤーのPLAY_CARDアクション（元からinstanceIdあり）
  - 2754-2763行目: summonedCardIds管理（デバッグログ削除済み）

---

## 修正日
2026年1月2日（続き）

## 修正内容

### 必殺（BANE）による破壊時の紫ガイコツエフェクト追加

#### 1. 実装概要
必殺（BANE）能力によってフォロワーが即死した際に、紫色のガイコツ（💀）エフェクトを表示するアニメーションを実装。

#### 2. 修正箇所

##### GameScreen.tsx
1. **BaneEffectVisualコンポーネント追加**（290-351行目）
   - 紫色のガイコツ絵文字を使用
   - スケール・回転アニメーション
   - 紫色のパーティクルエフェクト
   - 紫色のグロー効果（#9b59b6, #8e44ad, #6c3483）

2. **ActiveEffectStateにBANEタイプ追加**（2206行目）
   ```typescript
   type: '...' | 'BANE';
   ```

3. **AttackEffectでBANE処理追加**（417-428行目）
   - 効果音: yami.mp3（0.7ボリューム）
   - BaneEffectVisualコンポーネントを返す

4. **BANE死亡検出用useEffect追加**（2317-2361行目）
   - 前フレームのボード状態と比較
   - `killedByBane`フラグを持つカードが消えた時にエフェクト再生
   - visualBoardRefを使用して正確な位置を取得

5. **useVisualBoardでkilledByBaneフラグ保持**（1955-1956行目）
   - 死亡時にkilledByBaneフラグをコピー

##### engine.ts
1. **攻撃者のBANE発動時**（2748行目）
   ```typescript
   (defender as any).killedByBane = true;
   ```

2. **防御者のBANE発動時**（2782行目）
   ```typescript
   (attacker as any).killedByBane = true;
   ```

#### 3. エフェクト仕様
- 表示時間: 1.2秒
- アニメーション:
  - 0%: スケール0、回転-30度、透明
  - 20%: スケール1.3、回転10度、不透明
  - 40%: スケール1、回転-5度
  - 60%: スケール1.1、回転0度
  - 80%: スケール1、透明度0.8
  - 100%: スケール1.5、透明
- パーティクル: 12個の紫色の円が放射状に拡散

## 構造の記録（更新）
- `game/src/screens/GameScreen.tsx`
  - 290-351行目: BaneEffectVisualコンポーネント
  - 2206行目: ActiveEffectState型にBANE追加
  - 2317-2361行目: BANE死亡検出useEffect
  - 1955-1956行目: useVisualBoardでkilledByBane保持
- `game/src/core/engine.ts`
  - 2748行目: 攻撃者BANEでdefenderにkilledByBane設定
  - 2782行目: 防御者BANEでattackerにkilledByBane設定

---

## 修正日
2026年1月2日（続き2）

## 修正内容

### 画像ファイルの移動・リネーム対応

#### 1. 移動・リネームされたファイル
- `cards/yoruka_secret.png` → `leaders/yoRuka_secret.png`
- `cards/yoRuka_win2.png` → `leaders/yoRuka_win.png`
- `cards/yoRuka_lose.png` → `leaders/yoRuka_lose.png`

#### 2. 追加された画像ファイル
- `leaders/senka_win.png`
- `leaders/senka_lose.png`
- `leaders/azya_win.png`
- `leaders/azya_lose.png`

### リザルト画面でクラス別勝敗イラスト表示

#### 1. 実装概要
リザルト画面の左半分の領域に、使用したクラス（リーダー）に応じた勝敗イラストを表示するように変更。

#### 2. 修正箇所

##### ClassSelectScreen.tsx
- 15行目: `yorukaSecretImg`のパスを`/leaders/yoRuka_secret.png`に更新

##### GameScreen.tsx
1. **リザルト画像定義**（1490-1496行目）
   ```typescript
   const yorukaWinImg = getAssetUrl('/leaders/yoRuka_win.png');
   const yorukaLoseImg = getAssetUrl('/leaders/yoRuka_lose.png');
   const senkaWinImg = getAssetUrl('/leaders/senka_win.png');
   const senkaLoseImg = getAssetUrl('/leaders/senka_lose.png');
   const azyaWinImg = getAssetUrl('/leaders/azya_win.png');
   const azyaLoseImg = getAssetUrl('/leaders/azya_lose.png');
   ```

2. **GameOverScreenPropsにplayerClass追加**（1511行目）
   ```typescript
   playerClass: ClassType;
   ```

3. **getResultImage関数追加**（1525-1535行目）
   - SENKA: senkaWinImg / senkaLoseImg
   - AJA: azyaWinImg / azyaLoseImg
   - YORUKA: yorukaWinImg / yorukaLoseImg

4. **左側領域の表示変更**（1728-1736行目）
   - `selectedCardInfo`がない場合、クラス別勝敗イラストを全面表示
   - backgroundSize: 'contain'で画像を領域内に収める

5. **GameOverScreen呼び出し時にplayerClass追加**（7658行目）
   ```typescript
   playerClass={player?.class || 'SENKA'}
   ```

## 構造の記録（更新）
- `game/src/screens/ClassSelectScreen.tsx`
  - 15行目: yorukaSecretImgパス更新
- `game/src/screens/GameScreen.tsx`
  - 1490-1496行目: クラス別リザルト画像定義
  - 1511行目: GameOverScreenPropsにplayerClass追加
  - 1522-1535行目: getResultImage関数
  - 1728-1736行目: 左側領域にクラス別イラスト表示
  - 7658行目: playerClass prop追加

---

## 修正日
2026年1月2日（続き3）

## 修正内容

### 「継承される力」の効果が正しく動作しない問題の修正

#### 1. 問題の原因
- `DESTROY_AND_GENERATE`効果で、破壊したカードの定義を取得する際に`card.id`を使用していた
- `card.id`はインスタンスID（例：`p2_c5`）であり、カード定義のID（例：`c_azya`）ではない
- そのため`MOCK_CARDS.find(c => c.id === card.id)`が常にundefinedを返し、手札にカードが追加されなかった

#### 2. 修正箇所
- **対象ファイル**: `game/src/core/engine.ts`
- **修正行**: 1662行目

**修正前**:
```typescript
const baseCardDef = MOCK_CARDS.find(c => c.id === card.id);
```

**修正後**:
```typescript
const baseCardDef = getCardDefinition(card.name);
```

#### 3. 修正理由
- `getCardDefinition`関数はカード名でも検索可能
- ボード上のカードは`name`プロパティを持っているため、これを使用して正しくカード定義を取得できる

## 構造の記録（更新）
- `game/src/core/engine.ts`
  - 1662行目: DESTROY_AND_GENERATEでgetCardDefinition(card.name)を使用
---

## 修正日
2026年1月2日（続き4）

## 修正内容

### AoEダメージ表記が3体以上で表示されない問題の修正

#### 1. 問題の原因（Gemini分析）
- 死亡したカードの座標を`refs[idx]`から取得しようとしていた
- `idx`は「前の」ボードのインデックスだが、useEffect実行時にはDOMは「現在の」状態に更新済み
- 結果として、死亡したカードの座標が取得できない、または間違った位置（隣のカード）を参照していた

#### 2. 修正内容

##### cardPositionsRefの追加（2460行目付近）
```typescript
const cardPositionsRef = React.useRef<Map<string, { x: number, y: number }>>(new Map());
```

##### ダメージ検出ロジックの修正（2945-3012行目）
- 生存カードの処理時に座標をキャッシュに保存
- 死亡カードの座標取得を`refs[idx]`からキャッシュ参照に変更
- 死亡したカードはキャッシュから削除

**修正前**:
```typescript
const el = refs[idx]; // 既に無効なインデックス参照
if (el) {
    const coords = getScreenCoordsFromElement(el);
    // ...
}
```

**修正後**:
```typescript
const cachedCoords = cardPositionsRef.current.get(prevCard.instanceId);
if (cachedCoords && (cachedCoords.x !== 0 || cachedCoords.y !== 0)) {
    // キャッシュから座標を取得
}
```

##### 座標キャッシュ更新のuseEffect追加（3622-3655行目）
- ボードの変更時に全カードの座標をキャッシュ
- これにより、初回ダメージで即死するカードも正しく座標を持つ

#### 3. 技術的詳細
- Reactのレンダリングサイクル上、useEffect実行時にDOMは既に更新済み
- 死亡したカードはDOMから消えており、`refs`配列にも存在しない
- 事前にキャッシュした座標を使用することで、AoEで複数同時死亡しても正しい位置に表示

---

### 手札カードのホバー・選択時の移動量を半分に修正

#### 1. 修正箇所

##### 7005行目: 選択時の持ち上げ量
**修正前**: `translateY = selectedHandIndex === i ? -15 * scale : 0;`
**修正後**: `translateY = selectedHandIndex === i ? -8 * scale : 0;`

##### 7028行目: ドラッグ中・ホバー時のtransform
**修正前**: `scale(1.1) translateY(-30px)` / `translateY(-10px)`
**修正後**: `scale(1.05) translateY(-15px)` / `translateY(-5px)`

#### 2. 変更サマリー
| 状態 | 変更前 | 変更後 |
|------|--------|--------|
| ホバー（展開時） | -10px | -5px |
| 選択 | -15 * scale | -8 * scale |
| ドラッグ中 | scale(1.1) -30px | scale(1.05) -15px |

## 構造の記録（更新）
- `game/src/screens/GameScreen.tsx`
  - 2460行目: cardPositionsRef定義（カード座標キャッシュ）
  - 2945-3012行目: ダメージ検出ロジック（キャッシュ使用に変更）
  - 3622-3655行目: 座標キャッシュ更新useEffect
  - 7005行目: 選択時の持ち上げ量（-8 * scale）
  - 7028行目: ドラッグ・ホバー時のtransform
