# 実装計画書 - 通信対戦機能の修復

## 現状の問題

1. **待機画面がない**: HOST/JOIN モードでも即座に `GameScreen` が表示され、接続を待たずにゲームが初期化されてしまう。
2. **Room ID 表示がない**: HOST モードでの部屋 ID 表示・コピー機能が欠落している（または無効化されている）。
3. **接続待ちのフローがない**: `connected` の状態を見て待機するロジックが `GameScreen` にない。

## 解決策

### Phase 1: 待機画面 (LobbyScreen) の作成と統合

1.  `LobbyScreen.tsx` を新規作成
    - HOST モード: 「Room ID: XXXX」と「Copy to Clipboard」ボタンを表示。「Waiting for opponent...」メッセージ。
    - JOIN モード: 「Connecting to Room...」メッセージ。
    - 接続完了時に `onGameStart()` コールバックを呼び出す。
    - エラー発生時にはエラーメッセージを表示し、タイトルへ戻るボタンを提供。

2.  `App.tsx` の画面遷移を修正
    - `GAME` 画面の前に `LOBBY` 画面を挟む。
    - CPU モードは `LOBBY` をスキップして直接 `GAME` へ。
    - HOST/JOIN モードは `LOBBY` に遷移し、接続完了後に `GAME` へ。

3.  `GameScreen.tsx` の修正
    - `opponentType === 'ONLINE'` の場合、初期化時に相手の情報を受け取る（または待機する）ロジックを追加。
    - AI ターンのロジックが `gameMode === 'CPU'` 以外で実行されないようガードを確認（現状で実装済み）。

### Phase 2: 別 PC 間の対戦対応の確認

- PeerJS はデフォルトで公式のシグナリングサーバー (`0.peerjs.com`) を使用します。これはインターネット経由での接続をサポートしていますが、ファイアウォールやNAT環境によっては接続できない場合があります。
- まず基本機能が動くことを確認し、必要であれば TURN サーバーの設定を追加することを検討します（PeerJS の `config.iceServers` オプション）。

## 作業手順

1.  `LobbyScreen.tsx` の作成
2.  `App.tsx` の画面遷移ロジックの修正
3.  `hooks.ts` (`useGameNetwork`) から `myId`, `connecting`, `error` を正しく取得できるよう確認
4.  動作確認（同一PC/ブラウザでのテスト）
5.  Gitにコミット
6.  動作確認（別PC間でのテスト - 可能であれば）
