# v1.04 実装計画書 - ランクマッチ＆レーティングシステム / ギャラリー機能

## 概要

1. ランダムマッチに「ランクマッチ」モードを追加し、クラスごとのレーティングシステムを実装する
2. カード一覧を閲覧できるギャラリー機能を実装する

---

## 実装タスク一覧

### Phase 1: Firebase Auth 導入

#### Task 1-1: Firebase Anonymous Auth のセットアップ

**対象ファイル**: `game/src/firebase/auth.ts`（新規作成）

```typescript
import { auth } from './config';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';

let currentUser: User | null = null;

// 匿名認証でサインイン
export const signInAnonymousUser = async (): Promise<string> => {
  const result = await signInAnonymously(auth);
  currentUser = result.user;
  return result.user.uid;
};

// 現在のユーザーIDを取得
export const getCurrentUserId = (): string | null => {
  return currentUser?.uid ?? null;
};

// 認証状態の監視
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
```

#### Task 1-2: Firebase config に auth を追加

**対象ファイル**: `game/src/firebase/config.ts`

- `getAuth` を import
- `export const auth = getAuth(app);` を追加

#### Task 1-3: App.tsx で認証初期化

**対象ファイル**: `game/src/App.tsx`

- アプリ起動時に `signInAnonymousUser()` を呼び出し
- `playerId` を state で管理
- 認証完了までローディング表示

---

### Phase 2: プレイヤーデータ管理

#### Task 2-1: レーティング型定義

**対象ファイル**: `game/src/firebase/rating.ts`（新規作成）

```typescript
import { ClassType } from '../core/types';

// ランク定義
export type RankType = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'MASTER';

export const RANK_THRESHOLDS: { rank: RankType; min: number; max: number; lossPoints: number }[] = [
  { rank: 'BRONZE', min: 0, max: 2000, lossPoints: 0 },
  { rank: 'SILVER', min: 2001, max: 4000, lossPoints: 20 },
  { rank: 'GOLD', min: 4001, max: 6000, lossPoints: 40 },
  { rank: 'PLATINUM', min: 6001, max: 8000, lossPoints: 60 },
  { rank: 'DIAMOND', min: 8001, max: 10000, lossPoints: 80 },
  { rank: 'MASTER', min: 10001, max: Infinity, lossPoints: 100 },
];

// レートからランクを取得
export const getRankFromRating = (rating: number): RankType => {
  for (const threshold of RANK_THRESHOLDS) {
    if (rating >= threshold.min && rating <= threshold.max) {
      return threshold.rank;
    }
  }
  return 'BRONZE';
};

// ランクのインデックスを取得（格上ボーナス計算用）
export const getRankIndex = (rank: RankType): number => {
  return RANK_THRESHOLDS.findIndex(t => t.rank === rank);
};

// クラス別レーティングデータ
export interface ClassRating {
  rating: number;
  winStreak: number;
  totalMatches: number;
  wins: number;
  losses: number;
}

// プレイヤーデータ
export interface PlayerData {
  playerName: string;
  createdAt: number;
  lastMatchAt: number;
  ratings: Partial<Record<ClassType, ClassRating>>;
}

// 初期クラスレーティング
export const createInitialClassRating = (): ClassRating => ({
  rating: 0,
  winStreak: 0,
  totalMatches: 0,
  wins: 0,
  losses: 0,
});
```

#### Task 2-2: レーティング計算ロジック

**対象ファイル**: `game/src/firebase/rating.ts`（続き）

```typescript
const BASE_WIN_POINTS = 200;
const MAX_BONUS_PERCENT = 100;
const WIN_STREAK_BONUS_PER_WIN = 10; // 連勝ごとに+10%
const RANK_DIFF_BONUS_PER_RANK = 20; // ランク差ごとに+20%

export interface RatingCalculationResult {
  newRating: number;
  ratingChange: number;
  newWinStreak: number;
  newRank: RankType;
  oldRank: RankType;
  isRankUp: boolean;
  isRankDown: boolean;
  bonusBreakdown: {
    base: number;
    winStreakBonus: number;
    rankDiffBonus: number;
    total: number;
  };
}

// 勝利時のレーティング計算
export const calculateWinRating = (
  currentRating: number,
  currentWinStreak: number,
  opponentRating: number
): RatingCalculationResult => {
  const myRank = getRankFromRating(currentRating);
  const opponentRank = getRankFromRating(opponentRating);
  const oldRankIndex = getRankIndex(myRank);
  const opponentRankIndex = getRankIndex(opponentRank);

  // 連勝ボーナス: (連勝数) × 10%、最大100%
  const newWinStreak = currentWinStreak + 1;
  const winStreakBonusPercent = Math.min((newWinStreak - 1) * WIN_STREAK_BONUS_PER_WIN, MAX_BONUS_PERCENT);

  // 格上ボーナス: ランク差 × 20%、最大100%
  const rankDiff = Math.max(0, opponentRankIndex - oldRankIndex);
  const rankDiffBonusPercent = Math.min(rankDiff * RANK_DIFF_BONUS_PER_RANK, MAX_BONUS_PERCENT);

  // 合計ボーナス
  const totalBonusPercent = 100 + winStreakBonusPercent + rankDiffBonusPercent;
  const ratingChange = Math.floor(BASE_WIN_POINTS * totalBonusPercent / 100);
  const newRating = currentRating + ratingChange;

  const newRank = getRankFromRating(newRating);
  const newRankIndex = getRankIndex(newRank);

  return {
    newRating,
    ratingChange,
    newWinStreak,
    newRank,
    oldRank: myRank,
    isRankUp: newRankIndex > oldRankIndex,
    isRankDown: false,
    bonusBreakdown: {
      base: BASE_WIN_POINTS,
      winStreakBonus: Math.floor(BASE_WIN_POINTS * winStreakBonusPercent / 100),
      rankDiffBonus: Math.floor(BASE_WIN_POINTS * rankDiffBonusPercent / 100),
      total: ratingChange,
    },
  };
};

// 敗北時のレーティング計算
export const calculateLossRating = (
  currentRating: number
): RatingCalculationResult => {
  const myRank = getRankFromRating(currentRating);
  const rankData = RANK_THRESHOLDS.find(t => t.rank === myRank)!;

  const ratingChange = -rankData.lossPoints;
  const newRating = Math.max(0, currentRating + ratingChange);
  const newRank = getRankFromRating(newRating);

  const oldRankIndex = getRankIndex(myRank);
  const newRankIndex = getRankIndex(newRank);

  return {
    newRating,
    ratingChange,
    newWinStreak: 0, // 連勝リセット
    newRank,
    oldRank: myRank,
    isRankUp: false,
    isRankDown: newRankIndex < oldRankIndex,
    bonusBreakdown: {
      base: ratingChange,
      winStreakBonus: 0,
      rankDiffBonus: 0,
      total: ratingChange,
    },
  };
};
```

#### Task 2-3: Firebase プレイヤーデータ CRUD

**対象ファイル**: `game/src/firebase/playerData.ts`（新規作成）

```typescript
import { database } from './config';
import { ref, get, set, update } from 'firebase/database';
import { ClassType } from '../core/types';
import { PlayerData, ClassRating, createInitialClassRating, RatingCalculationResult } from './rating';

// プレイヤーデータを取得（なければ作成）
export const getOrCreatePlayerData = async (
  playerId: string,
  playerName: string
): Promise<PlayerData> => {
  const playerRef = ref(database, `players/${playerId}`);
  const snapshot = await get(playerRef);

  if (snapshot.exists()) {
    const data = snapshot.val() as PlayerData;
    // 名前が変わっていたら更新
    if (data.playerName !== playerName) {
      await update(playerRef, { playerName });
      data.playerName = playerName;
    }
    return data;
  }

  // 新規作成
  const newPlayerData: PlayerData = {
    playerName,
    createdAt: Date.now(),
    lastMatchAt: Date.now(),
    ratings: {},
  };

  await set(playerRef, newPlayerData);
  return newPlayerData;
};

// クラス別レーティングを取得（なければ初期値を作成）
export const getClassRating = async (
  playerId: string,
  playerClass: ClassType
): Promise<ClassRating> => {
  const ratingRef = ref(database, `players/${playerId}/ratings/${playerClass}`);
  const snapshot = await get(ratingRef);

  if (snapshot.exists()) {
    return snapshot.val() as ClassRating;
  }

  // 初期値を作成
  const initialRating = createInitialClassRating();
  await set(ratingRef, initialRating);
  return initialRating;
};

// レーティング更新（試合結果反映）
export const updateRatingAfterMatch = async (
  playerId: string,
  playerClass: ClassType,
  result: RatingCalculationResult,
  isWin: boolean
): Promise<void> => {
  const ratingRef = ref(database, `players/${playerId}/ratings/${playerClass}`);
  const playerRef = ref(database, `players/${playerId}`);

  const currentRating = await getClassRating(playerId, playerClass);

  const updatedRating: ClassRating = {
    rating: result.newRating,
    winStreak: result.newWinStreak,
    totalMatches: currentRating.totalMatches + 1,
    wins: currentRating.wins + (isWin ? 1 : 0),
    losses: currentRating.losses + (isWin ? 0 : 1),
  };

  await set(ratingRef, updatedRating);
  await update(playerRef, { lastMatchAt: Date.now() });
};
```

---

### Phase 3: UI 実装

#### Task 3-1: マッチタイプ選択画面

**対象ファイル**: `game/src/screens/MatchTypeSelectScreen.tsx`（新規作成）

**仕様**:
- 「カジュアル」「ランクマッチ」の2つのボタン
- ランクマッチボタンの下に現在のレート・ランクを表示
- 既存のダークテーマに合わせたデザイン
- レスポンシブ対応（BASE_WIDTH: 1280, BASE_HEIGHT: 720）

**Props**:
```typescript
interface MatchTypeSelectScreenProps {
  playerClass: ClassType;
  playerId: string;
  onSelectMatchType: (matchType: MatchType) => void;
  onBack: () => void;
}
```

#### Task 3-2: クラス選択画面にレート表示を追加

**対象ファイル**: `game/src/screens/ClassSelectScreen.tsx`

**変更内容**:
- 各クラスカードの下部にレート・ランクを表示
- 例: 「ブロンズ 1250」のような表示
- playerId を props で受け取り、Firebase からクラス別レートを取得

#### Task 3-3: マッチング画面のレート表示

**対象ファイル**: `game/src/screens/MatchmakingScreen.tsx`

**変更内容**:
- ランクマッチの場合のみ、自分のレート・ランクを表示
- マッチング完了後、相手のレート・ランクも表示

#### Task 3-4: リザルト画面のレート増減表示

**対象ファイル**: `game/src/screens/GameScreen.tsx`（リザルト部分）

**変更内容**:
- ランクマッチの場合、リザルト画面にレート増減を表示
- 表示例:
  - 勝利: 「+240 (基本200 + 連勝40)」
  - 敗北: 「-20」
- ランク昇格/降格時はテキストで通知（例: 「シルバーに昇格！」）

---

### Phase 4: マッチメイキング拡張

#### Task 4-1: matchmaking.ts の拡張

**対象ファイル**: `game/src/firebase/matchmaking.ts`

**変更内容**:
- `WaitingPlayer` 型に `playerId`, `rating` を追加
- ランクマッチ時は `playerId` と `rating` を含めて登録
- マッチング結果に相手の `playerId`, `rating` を含める

```typescript
export interface WaitingPlayer {
  id: string;
  peerId: string;
  playerName: string;
  playerClass: ClassType;
  matchType: MatchType;
  playerId?: string;    // ← 追加
  rating?: number;      // ← 追加
  timestamp: number;
}

export interface MatchResult {
  peerId: string;
  playerName: string;
  playerClass: ClassType;
  isHost: boolean;
  playerId?: string;    // ← 追加
  rating?: number;      // ← 追加
}
```

#### Task 4-2: 試合終了時のレート更新処理

**対象ファイル**: `game/src/screens/GameScreen.tsx`

**変更内容**:
- 試合終了時（勝敗確定時）に `updateRatingAfterMatch()` を呼び出し
- ランクマッチの場合のみ処理
- 計算結果を state に保持してリザルト画面で表示

---

### Phase 5: App.tsx フロー変更

#### Task 5-1: 画面フローの変更

**対象ファイル**: `game/src/App.tsx`

**変更内容**:
- 新規 state: `playerId`, `selectedMatchType`
- 画面遷移フロー:
  1. 認証完了 → タイトル画面
  2. クラス選択 → モード選択
  3. ランダムマッチ選択 → マッチタイプ選択（新規画面）
  4. カジュアル/ランクマッチ選択 → マッチング画面

---

## 注意事項

1. **既存のカジュアルマッチは変更しない**: 既存の動作を壊さないよう注意
2. **レスポンシブ対応**: 既存画面と同じ BASE_WIDTH/BASE_HEIGHT を使用
3. **エラーハンドリング**: Firebase 通信エラー時の fallback 処理を実装
4. **テスト**: 各フェーズ完了後に動作確認を行う

---

## ファイル一覧

### 新規作成
- `game/src/firebase/auth.ts`
- `game/src/firebase/rating.ts`
- `game/src/firebase/playerData.ts`
- `game/src/screens/MatchTypeSelectScreen.tsx`

### 変更
- `game/src/firebase/config.ts`
- `game/src/firebase/matchmaking.ts`
- `game/src/screens/ClassSelectScreen.tsx`
- `game/src/screens/MatchmakingScreen.tsx`
- `game/src/screens/GameScreen.tsx`
- `game/src/App.tsx`

---

## 実装順序

1. Phase 1 → Phase 2 → Phase 3-1 → Phase 4 → Phase 5 → Phase 3-2,3-3,3-4

**推奨**: Phase ごとに動作確認してから次へ進む

---

## Part 2: ギャラリー機能

### Phase 6: カードデータ拡張

#### Task 6-1: 関連カードフィールドの追加

**対象ファイル**: `game/src/core/engine.ts`

**作業内容**:
1. `MOCK_CARDS` の各カードに `relatedCards?: string[]` フィールドを追加
2. カード効果を確認し、以下の条件に該当するカードに関連カードを設定:
   - 別のカードを特殊召喚する効果を持つカード
   - 別のカードを手札に加える効果を持つカード

**例**:
```typescript
{
  id: 'senka',
  name: '盞華',
  // ... 既存フィールド
  relatedCards: ['flickerJab', 'quakeHowling', 'backhandSmash'], // 追加
}
```

**注意**:
- トークンカード（召喚されるカード）自体には `relatedCards` は不要
- カード効果の `triggers` を確認して、`SUMMON` や `ADD_TO_HAND` アクションを持つカードを洗い出すこと

#### Task 6-2: カード型定義の更新

**対象ファイル**: `game/src/core/types.ts`

**変更内容**:
- `Card` 型に `relatedCards?: string[]` を追加

```typescript
export interface Card {
  // ... 既存フィールド
  relatedCards?: string[];  // 追加: 関連カードのID配列
}
```

---

### Phase 7: ギャラリー画面実装

#### Task 7-1: ギャラリークラス選択画面

**対象ファイル**: `game/src/screens/GalleryClassSelectScreen.tsx`（新規作成）

**仕様**:
- 各クラスを選択するボタンを表示
- 既存の ClassSelectScreen を参考にしつつ、よりシンプルな構成
- 戻るボタン（タイトル画面へ）

**Props**:
```typescript
interface GalleryClassSelectScreenProps {
  onSelectClass: (classType: ClassType) => void;
  onBack: () => void;
}
```

#### Task 7-2: カード一覧画面

**対象ファイル**: `game/src/screens/GalleryCardListScreen.tsx`（新規作成）

**仕様**:
- 選択クラスのデッキに含まれるカードをすべて1画面に表示
- 各カードに枚数を表示
- トークンカードは表示しない（関連カードからのみアクセス）
- カードクリックで詳細画面へ
- 戻るボタン（クラス選択へ）

**Props**:
```typescript
interface GalleryCardListScreenProps {
  classType: ClassType;
  onSelectCard: (cardId: string) => void;
  onBack: () => void;
}
```

**レイアウト**:
- グリッド表示（4〜5列程度）
- カードはサムネイルサイズで表示
- 枚数はカード右下にバッジ表示

#### Task 7-3: カード詳細画面

**対象ファイル**: `game/src/screens/GalleryCardDetailScreen.tsx`（新規作成）

**仕様**:

**レイアウト（上から順に）**:
```
┌─────────────────────────────────────┐
│  [戻る]                              │
├─────────────────────────────────────┤
│                                     │
│   [進化前イラスト]  [進化後イラスト]   │  ← フォロワーの場合（左右対称）
│         または                       │
│       [イラスト]                     │  ← スペルの場合（中央1枚）
│                                     │
├─────────────────────────────────────┤
│  カード名: ○○○                      │
│  コスト: ○  攻撃力: ○  体力: ○       │
│                                     │
│  効果テキスト:                       │
│  ○○○○○○○○○○○○                │
│                                     │
│  フレーバーテキスト:                  │  [関連カード]
│  ○○○○○○○○○○○○                │     ボタン
│                                     │
└─────────────────────────────────────┘
```

**Props**:
```typescript
interface GalleryCardDetailScreenProps {
  cardId: string;
  onOpenRelatedCard: (cardId: string) => void;
  onBack: () => void;
}
```

**表示ロジック**:
- `card.type === 'FOLLOWER'`: 左に通常イラスト、右に進化後イラスト
- `card.type === 'SPELL'`: 中央に1枚のみ
- 関連カードボタン: `card.relatedCards` が存在する場合のみ表示

#### Task 7-4: 関連カード画面

**対象ファイル**: `game/src/screens/GalleryRelatedCardScreen.tsx`（新規作成）

**仕様**:
- ページ式で関連カードを1枚ずつ表示
- 左右の矢印ボタンでページ送り
- 現在のページ番号表示（例: 1/3）
- 戻るボタン（元のカード詳細へ）

**Props**:
```typescript
interface GalleryRelatedCardScreenProps {
  parentCardId: string;       // 元カードのID
  relatedCardIds: string[];   // 関連カードのID配列
  onBack: () => void;
}
```

**レイアウト**:
- カード詳細画面と同じレイアウトを使用
- ページ送りUIを追加

---

### Phase 8: App.tsx ギャラリーフロー追加

#### Task 8-1: ギャラリー画面フローの追加

**対象ファイル**: `game/src/App.tsx`

**変更内容**:
- 新規 state: `galleryClassType`, `galleryCardId`, `galleryRelatedCardIds`
- 画面遷移フロー:
  ```
  タイトル画面
      ↓ ギャラリーボタン（既存）
  ギャラリークラス選択画面
      ↓ クラス選択
  カード一覧画面
      ↓ カード選択
  カード詳細画面
      ↓ 関連カードボタン
  関連カード画面（ページ式）
  ```

---

## 注意事項（ギャラリー）

1. **トークンカードの扱い**: デッキ一覧には表示しない、関連カードからのみアクセス可能
2. **イラスト表示**: 進化前/進化後イラストのパスは既存のカードデータから取得
3. **レスポンシブ対応**: 既存画面と同じ BASE_WIDTH/BASE_HEIGHT を使用
4. **戻るボタン**: 各画面に必ず配置

---

## ファイル一覧（更新）

### 新規作成
- `game/src/firebase/auth.ts`
- `game/src/firebase/rating.ts`
- `game/src/firebase/playerData.ts`
- `game/src/screens/MatchTypeSelectScreen.tsx`
- `game/src/screens/GalleryClassSelectScreen.tsx`（追加）
- `game/src/screens/GalleryCardListScreen.tsx`（追加）
- `game/src/screens/GalleryCardDetailScreen.tsx`（追加）
- `game/src/screens/GalleryRelatedCardScreen.tsx`（追加）

### 変更
- `game/src/firebase/config.ts`
- `game/src/firebase/matchmaking.ts`
- `game/src/screens/ClassSelectScreen.tsx`
- `game/src/screens/MatchmakingScreen.tsx`
- `game/src/screens/GameScreen.tsx`
- `game/src/App.tsx`
- `game/src/core/types.ts`（追加）
- `game/src/core/engine.ts`（追加）

---

## 全体実装順序

### Part 1: ランクマッチ＆レーティング
1. Phase 1（Firebase Auth）
2. Phase 2（プレイヤーデータ）
3. Phase 3-1（マッチタイプ選択画面）
4. Phase 4（マッチメイキング拡張）
5. Phase 5（App.tsx フロー）
6. Phase 3-2,3-3,3-4（UI表示追加）

### Part 2: ギャラリー
7. Phase 6（カードデータ拡張）
8. Phase 7（ギャラリー画面実装）
9. Phase 8（App.tsx ギャラリーフロー）

**推奨**: Part 1 完了後に動作確認、Part 2 完了後に動作確認
