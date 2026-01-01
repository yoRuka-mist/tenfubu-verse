# Web公開・デプロイ実装計画

## 概要
このゲームをWebで公開し、異なるネットワーク環境のPC同士で通信対戦できるようにするための計画。

## 現在の通信対戦の仕組み

### PeerJS (WebRTC)
- **現在使用**: PeerJS公式の無料シグナリングサーバー (`0.peerjs.com`)
- **動作原理**:
  1. 各プレイヤーがPeerJSサーバーに接続し、一意のIDを取得
  2. HOST側がIDを共有し、JOIN側がそのIDで接続
  3. シグナリング完了後、P2P（直接通信）に切り替わる

### 接続フロー
```
[HOST PC] ←→ [PeerJS Server] ←→ [JOIN PC]
    ↓              ↓              ↓
  ID取得        シグナリング     ID入力
    ↓                             ↓
  待機中 ←────── P2P接続 ────────→ 接続
```

## デプロイ方法

### 推奨: GitHub Pages
1. **静的ファイルホスティング**: ビルド済みファイルをそのまま配信
2. **HTTPS**: 自動的にHTTPS化（WebRTCに必須）
3. **無料**: 無料で使用可能
4. **設定**: `vite.config.ts`で`base`を設定

### 代替: Vercel / Netlify
- より高機能だが、このプロジェクトには過剰
- ビルドコマンドの自動実行が可能

## 実装手順

### 1. GitHub Pagesデプロイ設定

#### vite.config.ts の修正
```typescript
export default defineConfig({
  plugins: [react()],
  base: '/05_DigitalCardGame/', // GitHub Pagesのサブパス
});
```

#### package.json にデプロイスクリプト追加
```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

#### 必要パッケージ
```bash
npm install --save-dev gh-pages
```

### 2. PeerJS設定の確認

現在の設定（P2PAdapter.ts）:
```typescript
this.peer = new Peer(); // 自動でpeerjs.comのサーバーを使用
```

これは以下と同等:
```typescript
this.peer = new Peer(undefined, {
  host: '0.peerjs.com',
  port: 443,
  secure: true,
  path: '/'
});
```

**注意**: 公式サーバーは無料だが、同時接続数に制限がある可能性あり。

### 3. NAT越え問題への対応

#### 問題
- 異なるネットワーク（自宅 vs 友人宅）では、NAT/ファイアウォールにより直接接続が失敗する場合がある
- PeerJSのデフォルトでは、GoogleのSTUNサーバーを使用（無料）
- STUNでも接続できない場合は、TURNサーバーが必要

#### 対策オプション

**オプション A: 現状維持（推奨）**
- PeerJSデフォルトのSTUNで多くのケースは対応可能
- 接続失敗時はエラーメッセージを表示

**オプション B: TURN サーバー追加**
```typescript
this.peer = new Peer(undefined, {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: 'turn:your-turn-server.com:3478',
        username: 'user',
        credential: 'pass'
      }
    ]
  }
});
```
- 有料サービス（Twilio, Xirsys等）を使用するか、自前でサーバー構築

### 4. HTTPS対応

- GitHub Pages: 自動でHTTPS
- ローカル開発: `localhost`はHTTPでも動作
- 自前サーバー: Let's Encrypt等でSSL証明書取得

## デプロイ手順（GitHub Pages）

### 初回セットアップ

1. GitHubリポジトリを作成
2. vite.config.tsの`base`を設定
3. 以下を実行:

```bash
# gh-pagesパッケージをインストール
npm install --save-dev gh-pages

# ビルド&デプロイ
npm run build
npx gh-pages -d dist
```

4. GitHubリポジトリの Settings → Pages でソースを `gh-pages` ブランチに設定

### 公開URL
```
https://{ユーザー名}.github.io/{リポジトリ名}/
```

## 動作確認チェックリスト

- [ ] GitHub Pagesにデプロイ完了
- [ ] HTTPSでアクセス可能
- [ ] 同一ネットワーク内で通信対戦が動作
- [ ] 異なるネットワーク間で通信対戦が動作（要テスト）
- [ ] Room ID の共有・コピー機能が動作
- [ ] ゲーム状態の同期が正常

## トラブルシューティング

### 接続できない場合
1. 両者がHTTPSでアクセスしているか確認
2. ブラウザの開発者ツールでエラーを確認
3. PeerJSサーバーの状態を確認
4. ファイアウォール設定を確認

### ゲームが同期しない場合
1. コンソールログで`dispatchAndSend`の呼び出しを確認
2. `INIT_GAME`メッセージがJOIN側に届いているか確認
3. アクションの`isRemote`フラグが正しく設定されているか確認

## 将来の改善案

1. **カスタムシグナリングサーバー**: 自前でPeerJSサーバーを立てて、安定性向上
2. **マッチメイキング**: ランダムマッチング機能の追加
3. **観戦モード**: 第三者が対戦を観戦できる機能
4. **リプレイ機能**: 対戦のリプレイ保存・再生
