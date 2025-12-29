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
