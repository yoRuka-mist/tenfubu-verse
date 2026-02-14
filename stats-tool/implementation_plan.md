# 統計分析ツール 実装計画書

## 概要

デジタルカードゲームの開発者向け統計分析ダッシュボードを開発する。
Firebase Realtime Databaseから対戦データを抽出し、グラフやテーブルで可視化する。

## 開発手法

**ハイブリッド方式**
- 統計計算ロジック → TDD（テスト駆動）
- ダッシュボードUI → SDD（実装先行）

## 技術スタック

| 項目 | 技術 |
|------|------|
| フレームワーク | React + TypeScript |
| ビルドツール | Vite |
| グラフライブラリ | Recharts |
| スタイリング | Tailwind CSS |
| データベース | Firebase Realtime Database（既存を共有） |
| テストフレームワーク | Vitest |

## データソース（既存スキーマ）

### matches/ コレクション
```typescript
interface MatchRecord {
  matchId: string;
  timestamp: number;
  gameMode: 'CASUAL_MATCH' | 'RANKED_MATCH';
  player1: MatchPlayer;
  player2: MatchPlayer;
  winnerId: string;
  winnerSide: 'player1' | 'player2';
  duration?: number;
}

interface MatchPlayer {
  playerId: string;
  playerName: string;
  playerClass: ClassType;  // 'SENKA' | 'AJA' | 'YORUKA'
  ratingBefore: number;
  ratingAfter: number;
  isFirst: boolean;  // 先攻フラグ
}
```

## 機能一覧

### 1. 概要ダッシュボード
- 総マッチ数
- 日別/週別マッチ数グラフ
- アクティブプレイヤー数

### 2. デッキ使用率分析
- 全マッチにおけるデッキ（クラス）使用率円グラフ
- 期間別使用率推移（折れ線グラフ）
- ランクマッチ/カジュアル別使用率

### 3. 先攻後攻分析
- 先攻勝率 vs 後攻勝率（全体）
- デッキ別の先攻/後攻勝率
- 先攻後攻勝率の時系列推移

### 4. デッキマッチアップ分析
- デッキ対デッキの勝率マトリックス（3x3）
- 各マッチアップの試合数・勝率詳細

### 5. 複合分析
- デッキ + 先攻/後攻条件での勝率
- レート帯別の勝率分析
- 試合時間分布

### 6. データエクスポート
- CSV/JSON形式でのエクスポート機能

## ディレクトリ構造

```
stats-tool/
├── src/
│   ├── main.tsx                 # エントリーポイント
│   ├── App.tsx                  # ルートコンポーネント
│   ├── index.css                # Tailwind CSS
│   │
│   ├── firebase/
│   │   └── config.ts            # Firebase設定（game/から共有）
│   │
│   ├── services/
│   │   └── matchDataService.ts  # データ取得サービス
│   │
│   ├── stats/
│   │   ├── types.ts             # 統計用型定義
│   │   ├── deckUsage.ts         # デッキ使用率計算
│   │   ├── firstTurn.ts         # 先攻後攻分析
│   │   ├── matchup.ts           # マッチアップ分析
│   │   └── combined.ts          # 複合分析
│   │
│   ├── components/
│   │   ├── Dashboard.tsx        # メインダッシュボード
│   │   ├── DeckUsageChart.tsx   # デッキ使用率グラフ
│   │   ├── FirstTurnChart.tsx   # 先攻後攻グラフ
│   │   ├── MatchupMatrix.tsx    # マッチアップマトリックス
│   │   ├── CombinedAnalysis.tsx # 複合分析パネル
│   │   ├── DateRangePicker.tsx  # 期間選択
│   │   └── ExportButton.tsx     # エクスポート機能
│   │
│   └── hooks/
│       └── useMatchData.ts      # データ取得カスタムフック
│
├── __tests__/
│   ├── stats/
│   │   ├── deckUsage.test.ts
│   │   ├── firstTurn.test.ts
│   │   ├── matchup.test.ts
│   │   └── combined.test.ts
│   └── services/
│       └── matchDataService.test.ts
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── vitest.config.ts
```

## 実装フェーズ

### Phase 1: プロジェクト初期化
1. Vite + React + TypeScript プロジェクト作成
2. Tailwind CSS セットアップ
3. Firebase設定（既存設定を共有）
4. Vitest セットアップ

### Phase 2: データ層実装（TDD）
1. 型定義作成
2. matchDataService 実装（Firebaseからデータ取得）
3. 統計計算関数のテスト作成（RED）
4. 統計計算関数の実装（GREEN）
5. リファクタリング

### Phase 3: UIコンポーネント実装（SDD）
1. ダッシュボードレイアウト
2. 各種グラフコンポーネント
3. フィルター・日付選択UI
4. エクスポート機能

### Phase 4: 統合・テスト
1. E2Eテスト
2. パフォーマンス最適化
3. ドキュメント作成

## 統計計算の詳細設計

### デッキ使用率
```typescript
interface DeckUsageStats {
  class: ClassType;
  count: number;
  percentage: number;
}

function calculateDeckUsage(matches: MatchRecord[]): DeckUsageStats[]
```

### 先攻後攻勝率
```typescript
interface FirstTurnStats {
  firstWins: number;
  firstLosses: number;
  secondWins: number;
  secondLosses: number;
  firstWinRate: number;
  secondWinRate: number;
}

function calculateFirstTurnStats(matches: MatchRecord[]): FirstTurnStats
```

### マッチアップ勝率
```typescript
interface MatchupStats {
  class1: ClassType;
  class2: ClassType;
  class1Wins: number;
  class2Wins: number;
  totalMatches: number;
  class1WinRate: number;
}

function calculateMatchupStats(matches: MatchRecord[]): MatchupStats[]
```

### 複合分析（デッキ + 先攻/後攻）
```typescript
interface CombinedStats {
  class: ClassType;
  isFirst: boolean;
  wins: number;
  losses: number;
  winRate: number;
}

function calculateCombinedStats(matches: MatchRecord[]): CombinedStats[]
```

## 起動方法

```bash
cd stats-tool
npm install
npm run dev
```

別ポート（5174など）でローカル起動し、ブラウザでアクセス。

## セキュリティ考慮

- 開発者専用ツールのため、認証は必須としない（ローカル起動前提）
- Firebase設定は読み取り専用アクセス
- 本番環境へのデプロイは行わない

---

作成日: 2026-01-08
