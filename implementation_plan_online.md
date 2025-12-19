# 通信対戦機能 実装計画

## 現状分析
- P2PAdapterはPeerJSを使用したP2P通信の基本実装あり
- hooksでuseGameNetworkがあるが、HOST時の接続完了検知が不完全
- GameScreenでは接続状態に応じた画面表示が不足

## 実装内容

### 1. P2PAdapterの改善
- 接続完了時のコールバック追加
- HOST側で相手が接続した時の通知機能
- クラス選択情報の送受信（HANDSHAKE）

### 2. useGameNetworkフックの改善
- HOST側で接続待ち→接続完了の状態遷移
- myIdの返却（ルームID表示用）
- 相手のクラス情報の受信

### 3. GameScreenの改善
- HOST/JOINモードでの接続待ち画面表示
- HOSTモードでルームIDを表示
- 接続完了後のゲーム開始処理
- 対人戦用のターン管理修正

### 4. 対人戦の仕様調整
- 自分のターンのみ操作可能に
- 相手のアクションの同期処理
- ゲーム状態の同期

## ファイル変更
1. `src/network/P2PAdapter.ts` - 接続コールバック追加
2. `src/network/hooks.ts` - 状態管理改善
3. `src/screens/GameScreen.tsx` - 待機画面・対人戦ロジック
