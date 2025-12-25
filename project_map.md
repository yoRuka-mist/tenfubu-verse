# 05_DigitalCardGame プロジェクトマップ

このドキュメントは、プロジェクト内の主要なファイルとその中身（定数、関数、コンポーネント、ロジックの場所）を把握するための目次です。

## ルール
1.  **修正時は必ず参照**: コードを修正・検索する前に、このマップを見てアタリをつけてください。
2.  **行数の更新**: コードの追加・削除によって行数がズレた場合、速やかにこのドキュメントの行数を更新してください。
3.  **新機能の追記**: 新しい重要な関数やコンポーネントを作成した場合は、ここに追加してください。

---

## 1. コアロジック (game/src/core)

### engine.ts (ゲームエンジン・状態管理)
ゲームの根幹。カードデータ、初期化、状態遷移(Reducer)を担当。
-   **L008 - L667**: `MOCK_CARDS` (全カードのデータ定義。コスト、攻撃力、体力、効果、画像パス)
-   **L708 - L743**: `DECK_TEMPLATE` (構築済みデッキの内容定義)
-   **L848 - L1371**: `processSingleEffect` (個別の効果処理ロジック: ダメージ、ドロー、回復、破壊、特殊召喚など)
-   **L1410 - L2004**: `gameReducer` / `internalGameReducer` (プレイヤーの各行動を処理。`PLAY_CARD`, `ATTACK`, `END_TURN`, `EVOLVE` など)

### abilities.ts (効果・バリデーション)
エンジンの補助。より詳細な効果処理や、行動の適正判定を担当。
-   **L026 - L424**: `processSingleEffect` (engine.tsの処理から切り出し中の詳細ロジック)
-   **L475 - L566**: バリデーション系関数 (`canFollowerAttack`, `isValidAttackTarget`, `canEvolve`)

### types.ts (型定義)
`Card`, `GameState`, `Player`, `AbilityEffect` などの重要なデータ型。

---

## 2. 画面・UI (game/src/screens)

### GameScreen.tsx (メイン対戦画面)
最も巨大で複雑なファイル。UI構造、アニメーション、音、ユーザーとの対話。
-   **L027 - L064**: `useScaleFactor` (4K/HD等の解像度、レスポンシブスケーリングの計算)
-   **L144 - L302**: `AttackEffect` (攻撃時の視覚演出: SLASH, FIREBALL, RAYなど)
-   **L458 - L973**: `EvolutionAnimation` (進化・超進化時の拡大・回転・パーティクル演出)
-   **L1092 〜**: `GameScreen` コンポーネント本体
    -   **L1177**: `playEffect` (特定座標にエフェクトを発生させる)
    -   **L1339 - L1494**: 効果処理キューの処理 (`pendingEffects`を順次ビジュアルに反映)
    -   **L1530 - L1668**: HP変動の監視とダメージ数字・回復数字のポップアップ表示
    -   **L1945**: `handleEvolveWithAnimation` (進化ボタンクリック時の演出開始)
    -   **L2025**: `handlePlayCard` (手札から場に出す際のアニメーションと処理)
    -   **L2210**: `runAiTurn` (CPUの行動選択アルゴリズム)
    -   **L2698**: `handleGlobalMouseUp` (ドラッグ終了時の攻撃/プレイ処理)
    -   **L3100 〜**: `return` (JSX構造: フィールド、手札、リーダー、ログ、UIボタン等のレイアウト)

### TitleScreen.tsx / ClassSelectScreen.tsx
ゲーム開始前の画面。構成はシンプル。

---

## 3. コンポーネント (game/src/components)

### Card.tsx (カード単体UI)
カード1枚1枚の見た目。
-   枠線、攻撃力/体力の表示位置、キーワード（[守護]など）の表示。
-   レアリティや状態（プレイ可能か等）による光の演出。

### Card.css
カードのCSSアニメーション。死ぬ時の消える演出、レアリティの輝き、ホバー時の動きなど。
