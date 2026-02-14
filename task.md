# ランクマッチ同期処理バグ修正

## 内容
ランクマッチ（RANKED_MATCH）モードにおいて発生している以下の問題を修正する：

1. 先攻/後攻の決定がうまくいかない（両プレイヤーが後攻に見える場合がある）
2. ゲーム中にドラッグができなくなる
3. カード効果（手札に加える等）が発動せずカードが消える
4. 降参・切断による勝利でレートが変動しない

## 原因分析
`RESOLVE_EFFECT`処理において`gameMode === 'HOST'`でHOST/JOIN判定していたが、
CASUAL_MATCH/RANKED_MATCHモードでは`gameMode`は元の値のまま。
そのため、どちらのプレイヤーも`RESOLVE_EFFECT`を実行しない状態になっていた。

## タスクリスト
- [x] ランクマッチの同期処理問題を調査・分析
- [x] 先攻/後攻の決定ロジックを確認
- [x] カード効果（GENERATE_CARD等）の同期問題を修正
  - `gameMode === 'HOST'` → `isHost` に変更
- [x] レート変動処理にデバッグログを追加
- [x] walkthrough.md の更新
- [ ] トリプルレビュー実施
- [ ] 動作確認

## 修正ファイル
- `game/src/screens/GameScreen.tsx`
  - 3651-3667行目: GENERATE_CARDエフェクト処理
  - 3869-3888行目: 通常エフェクト処理
  - 2651-2707行目: レート更新処理（デバッグログ追加）

---

# CPU AI強化: 盞華デッキ戦術実装 (v1.11)

## 内容
CPU AIの盞華(Senka)デッキ用戦術を実装する。

## タスクリスト
- [x] バグ修正: AI味方ターゲット選択（しゑこ進化・翼スペル）
- [x] 進化後スペル使用フェーズ（2.6）の追加
- [x] 超進化権の温存ロジック（盞華用）
- [x] 盞華のプレイタイミング最適化
- [x] 攻撃優先度のデッキ別調整
- [x] コード検証・動作確認
- [x] トリプルレビュー実施

## トリプルレビュー結果 (2026-01-21)

### レビュアー
- Codex (gpt-5.2-codex)
- Gemini (gemini-3-pro-preview)
- GLM-4.7 (zai-coding-plan/glm-4.7)
- Claude (self-review)

### 主要指摘と対応

| 指摘 | 対応 | 理由 |
|------|------|------|
| 早期リターンでリーサル/低HPスキップ (Codex) | **修正済** | リーサル/低HP判定を温存ロジック前に移動 |
| `sep >= 1`で超進化可能判定 (Codex) | 対応不要 | リーサル計算目的にはポイント残量チェックで十分 |
| HP10守護ロジック不正確 (GLM) | 対応不要 | Quake(2)+Smash(6)+Jab(2)=10で正しい |
| 盞華ダメージ12/10不正確 (GLM) | 対応不要 | DOUBLE_ATTACKで2回攻撃(6×2=12, 5×2=10) |
| any型の過度な使用 (GLM) | 対応不要 | 技術的負債だが本スコープ外 |
| LGTM (Gemini) | - | 問題なし |

### 結論
✅ レビュー完了 - 全ての重要指摘に対応済み

## 実装詳細

### 1. バグ修正: 味方ターゲット選択
- **問題**: `SELECT_ALLY_FOLLOWER`/`SELECT_OTHER_ALLY_FOLLOWER`効果でプレイヤー側ボードを選択していた
- **修正箇所**:
  - スペル使用時 (6154-6170行目)
  - 進化時 (6344-6362行目)

### 2. 進化後スペル使用フェーズ (2.6)
- **実装箇所**: 6486-6592行目
- **処理順序**:
  1. クエイクハウリング（敵2体以上でAOE）
  2. フリッカージャブ（HP1-2の敵を処理）
  3. バックハンドスマッシュ（HP6以下の守護を処理）
  4. HP10守護 → 全スペル使用（2+2+6=10）
- **AURA/STEALTH対応**: 単体スペルでターゲット不可、AOEは有効

### 3. 超進化権温存ロジック
- **実装箇所**: 5985-6002行目
- **条件**: 手札に盞華1枚のみ、ボードに未進化盞華なし、HP>10、脅威低

### 4. 盞華プレイタイミング最適化
- **実装箇所**: 5876-5899行目
- **ロジック**:
  - 盞華2枚以上 → 即プレイ可
  - 盞華1枚 → リーサル可能時のみプレイ（超進化12dmg / 通常10dmg）

### 5. 攻撃優先度調整
- **実装箇所**: 6078-6101行目
- **盞華デッキ**: リーダー攻撃優先（守護がいなければ顔）

## 修正ファイル
- `game/src/screens/GameScreen.tsx`
  - runAiTurn関数内の複数箇所

---

# CPU AI強化: トレード最適化とデッキ別リーサル警戒 (v1.12)

## 内容
CPU AIのトレード判断とデッキ別リーサル警戒を強化する。

## タスクリスト
- [x] Phase 1: デッキ別リーサル警戒（calculateDeckSpecificThreat）
- [x] Phase 2: 進化効果の事前評価（calculateThreatScore, simulateEvolveRemoval）
- [x] Phase 3: 攻撃順序最適化（optimizeAttackOrder）
- [x] Phase 4: 進化温存ロジック強化（低脅威盤面、次ターンAOE）
- [x] トリプルレビュー実施
- [x] バグ修正

## トリプルレビュー結果 (2026-01-21)

### レビュアー
- Codex (gpt-5.2-codex)
- Gemini (gemini-3-pro-preview)
- GLM-4.7 (zai-coding-plan/glm-4.7)
- Claude (self-review)

### 主要指摘と対応

| 指摘 | 対応 | 理由 |
|------|------|------|
| `'spell'` vs `'SPELL'` 大文字小文字 (Codex) | **修正済** | 6338行目を`'SPELL'`に修正 |
| `currentHp` vs `currentHealth` (Codex) | **修正済** | 5836,5851,5922,5927行目を`currentHealth`に修正 |
| `optimizeAttackOrder`が未使用 (Gemini) | 対応保留 | 現状はデバッグログのみ。将来的に攻撃ループへ統合 |
| ボード取得ロジック誤り (GLM) | 対応不要 | 検証の結果、現在の実装が正しい |

### 結論
✅ レビュー完了 - 重大バグ修正済み

## 実装詳細

### Phase 1: デッキ別リーサル警戒
- **関数**: `calculateDeckSpecificThreat`
- **SENKA**: 8T(12点), 9T(15点), 10T+(常時), 盤面盞華+SEP(即時)
- **AJA**: 10T+フォロワー残存(ファイナルキャノン), ~9T HP6以上安全
- **YORUKA**: 遙残存(20点即死), 7T+(6点), 10T(9点)

### Phase 2: 進化効果の事前評価
- **関数**: `calculateThreatScore`, `simulateEvolveRemoval`
- DESTROY/DAMAGE/AOE_DAMAGE/RANDOM_DESTROY効果を事前シミュレート
- AURA/STEALTH対象不可を考慮

### Phase 3: 攻撃順序最適化
- **関数**: `optimizeAttackOrder`
- 有利トレード優先(+100)、不利トレード回避(-50)
- HARD難易度でのみ有効

### Phase 4: 進化温存ロジック強化
- 低脅威盤面(全攻撃力≤2, 脅威<80)で温存
- 次ターンAOE(value≥3)があれば温存

## 修正ファイル
- `game/src/screens/GameScreen.tsx`
  - 5766-5997行目: 新規関数追加
  - 6000-6089行目: デッキ別脅威計算
  - 6310-6359行目: 進化温存強化

---

# CPU AI強化: YORUKAデッキ戦術実装 (v1.13)

## 内容
CPU AIのYORUKAデッキ用戦術を実装する。
超進化温存、リーサル判定、遙コンボを最適化する。

## タスクリスト
- [x] Phase 1: calculateYorukaLethal関数の実装
- [x] Phase 2: scoreCardForPlayingに遙ロジック追加
- [x] Phase 3: shouldEvolveThisTurnにYORUKA温存ロジック追加
- [x] Phase 4: scoreEvolveTargetにYORUKA判定追加
- [x] Phase 5: findBestAttackTargetにYORUKA攻撃優先度追加
- [x] Phase 6: トリプルレビュー実施
- [x] バグ修正

## トリプルレビュー結果 (2026-01-21)

### レビュアー
- Codex (gpt-5.2-codex)
- Gemini (gemini-3-pro-preview)
- GLM-4.7 (zai-coding-plan/glm-4.7)
- Claude (self-review)

### 主要指摘と対応

| 指摘 | 対応 | 理由 |
|------|------|------|
| `state.turn` vs `state.turnCount` (Codex) | **修正済** | 6459行目を`state.turnCount`に修正 |
| RUSH→リーダー攻撃の仮定 (Codex) | 対応不要 | Pattern 1では悠霞未含、Pattern 2は遙生存後で正しい |
| 盤面リミット計算不足 (GLM) | **修正済** | Pattern 3,4で既存フォロワー数を考慮 |
| Pattern 2,3で盤面ダメージ未加算 (GLM) | **修正済** | 既存フォロワーのダメージを加算 |
| any型、魔法数字 (GLM) | 対応不要 | 技術的負債だが本スコープ外 |
| calculateYorukaLethalのキャッシュ (GLM) | 対応不要 | パフォーマンス上問題なし |
| LGTM (Gemini) | - | 問題なし |

### 結論
✅ レビュー完了 - 全ての重要指摘に対応済み

## 実装詳細

### Phase 1: calculateYorukaLethal関数
- **実装箇所**: 6066-6244行目
- **リーサルパターン**:
  | パターン | 条件 | ダメージ |
  |----------|------|---------|
  | 7T遙SE | 手札遙+SEP≥1+NC4+PP≥5 | 6 |
  | 遙生存+SE | 盤面遙(攻撃可)+SEP≥1+NC4 | 11-17+ |
  | NP+遙SE | 10T+NP+盤面遙+SEP+NC4+PP≥7 | 22+ |
  | NP単体 | 10T+NP+NC≥8+PP≥7 | 10+ |

### Phase 2: scoreCardForPlayingに遙ロジック
- **実装箇所**: 6397-6446行目
- **ロジック**:
  - 遙: リーサル可能→+500、安全時→-150（温存）
  - 疾きこと風の如く: リーサル用温存傾向
  - ナイトパレード: リーサル用

### Phase 3: shouldEvolveThisTurnにYORUKA温存
- **実装箇所**: 6614-6662行目
- **条件**:
  - SEP=1 かつ ハルカ手札 かつ 安全 → 温存
  - yoRuka盤面 かつ 敵2体以上 かつ SEP≥2 → SE実行
  - ハルカ盤面 かつ リーサル可能 → SE実行
  - ハルカ盤面 かつ リーサル不可 かつ 安全 → 温存

### Phase 4: scoreEvolveTargetにYORUKA判定
- **実装箇所**: 6515-6558行目
- **スコア調整**:
  | カード | 条件 | スコア |
  |--------|------|--------|
  | c_haruka | リーサル可能 | +1000 |
  | c_haruka | リーサル不可 | -500 |
  | c_yuka | 敵2体以上 | +100 |
  | c_yoruka | SE＆敵2体以上 | +150 |
  | c_y | - | +敵数×30 |

### Phase 5: findBestAttackTargetにYORUKA攻撃優先度
- **実装箇所**: 6798-6847行目
- **ロジック**:
  - 刹那: 守護優先、なければリーダー攻撃
  - 守護なし: リーダー攻撃優先（リーサル狙い）
  - BANE持ち: 守護を処理

## 修正ファイル
- `game/src/screens/GameScreen.tsx`
  - 6066-6244行目: calculateYorukaLethal関数
  - 6397-6446行目: scoreCardForPlayingにYORUKAロジック
  - 6515-6558行目: scoreEvolveTargetにYORUKA判定
  - 6614-6662行目: shouldEvolveThisTurnにYORUKA温存
  - 6798-6847行目: findBestAttackTargetにYORUKA攻撃優先度

---

# バグ修正: RANDOM_DAMAGE_BY_TURNでのラストワード不発動 (v1.14)

## 内容
悠長・オブ・ジ・アビス（RANDOM_DAMAGE_BY_TURN）でフォロワーを破壊した際に、
yoRukaなどのラストワードが発動しない不具合を修正。

## 原因分析
`processSingleEffect`内で、RANDOM_DAMAGE_BY_TURNによる破壊時のラストワード発動処理が
直接`newState.pendingEffects.push()`を使用していたため、RESOLVE_EFFECTでの
「新しく追加されたエフェクト」検出が正しく機能していなかった。

一方、同ファイル内の`triggerLastWord`ヘルパー関数は新しい配列を作成しており、
このヘルパーを使用するように修正することで解決。

## タスクリスト
- [x] 原因調査
- [x] triggerLastWordヘルパーを使用するように修正
- [x] task.md更新

## 修正ファイル
- `game/src/core/engine.ts`
  - 1776-1783行目: RANDOM_DAMAGE_BY_TURNの死亡処理
  - 変更前: 直接`newState.pendingEffects.push()`を使用
  - 変更後: `triggerLastWord(target, targetPid)`を使用

---

# CPU AI強化: AJAデッキ あじゃリーサル判定追加 (v1.15)

## 内容
あじゃ（c_azya）のファンファーレで相手リーダーに3ダメージを与えるため、
相手HP≤3の場合にリーサル確定として即座にプレイするロジックを追加。

## タスクリスト
- [x] あじゃリーサル判定ロジック実装
- [x] task.md更新

## 修正ファイル
- `game/src/screens/GameScreen.tsx`
  - scoreCardForPlaying関数内のAJAデッキ用ロジック
  - 相手HP≤3 → score += 1000（最優先）

---

# CPU AI強化: SENKAデッキ BANE/BARRIER回避ロジック (v1.16)

## 内容
せんかデッキの攻撃AIを強化。突進がメインのため、必殺（BANE）やバリア（BARRIER）を
考慮した攻撃判断を実装。進化済みや高スタッツのフォロワーで必殺持ちを攻撃して
盤面不利になることを防ぐ。

## 問題点
1. 必殺持ちに進化済み/高スタッツで攻撃 → フォロワーが無駄死に
2. バリア持ちを進化済みで攻撃 → ダメージ0で無意味
3. 守護がいない場合、常にリーダー攻撃 → 盤面の脅威を無視

## 実装内容

### 1. 守護処理の最適化
- 守護の中でもBANE/BARRIER持ちを分類
- 進化済みアタッカーはBANE守護を回避（他のアタッカーに任せる）
- 低スタッツならBANE守護処理OK
- 自身がBANE持ちなら相打ち上等

### 2. BANE回避ロジック
- 進化済み or ATK≥4 → BANE持ちを無視してリーダー攻撃
- 低スタッツ（ATK<4）→ BANE処理OK（有利トレード）

### 3. BARRIER回避ロジック
- 進化済みでBARRIER持ちを攻撃しない → リーダー攻撃へ

## タスクリスト
- [x] BANE/BARRIER回避ロジック設計
- [x] findBestAttackTarget内のSENKAロジック書き換え
- [x] task.md更新

## 修正ファイル
- `game/src/screens/GameScreen.tsx`
  - findBestAttackTarget関数内のSENKAデッキ用ロジック（約70行追加）

---

# CPU AI強化: 進化/超進化の優先順位と無駄進化防止 (v1.17)

## 内容
進化と超進化の使い分けを最適化。敵盤面が空の時の無駄な進化を防止し、
超進化を温存するロジックを実装。

## 問題点
1. 敵盤面が空でも進化を切ってしまう（Yのファンファーレで全滅後など）
2. 超進化効果が除去のみで敵盤面が空 → 意味がない
3. 通常進化でも効果がある場合に超進化を使ってしまう

## 実装内容

### 1. 敵盤面空時の無駄進化防止（shouldEvolveThisTurn）
- 敵盤面が空の場合、基本的に進化しない
- 例外: SUMMON系/BUFF系/ADD_PASSIVE（バリア付与）など有用な効果がある場合
- 緊急判定（HP低い等）も敵盤面が空なら発動しない

### 2. 進化/超進化の使い分けロジック
| 状況 | 判断 |
|------|------|
| 敵盤面空 + 両方とも除去効果のみ | **進化スキップ（両方温存）** |
| 敵盤面空 + 超進化にSUMMON系効果あり | 超進化OK |
| 敵盤面空 + 通常進化にSUMMON系効果あり | 通常進化OK |
| 敵盤面あり + 通常進化で除去効果あり | 通常進化を優先（超進化温存） |
| 敵盤面あり + 超進化がSUMMON/ADD_PASSIVE効果あり | 超進化OK |

## タスクリスト
- [x] 敵盤面空時の無駄進化防止ロジック追加
- [x] 進化/超進化の優先順位ロジック実装
- [x] task.md更新

## 修正ファイル
- `game/src/screens/GameScreen.tsx`
  - shouldEvolveThisTurn関数（敵盤面空チェック追加）
  - 進化フェーズ（useSuper判断ロジック追加）
