# Sonnet向け実装指示書 - ランクマッチ不正対策

## 概要

ランクマッチにおける簡易的な不正対策を実装する。

**対策一覧**:
1. 同一アカウントの同時マッチング禁止
2. 短時間での同一対戦相手との再マッチング制限
3. 最低ターン数によるレート変動制限
4. 降参連続使用の制限

---

## Task 1: 同一アカウントの同時マッチング禁止

### 概要
同じplayerIdで複数の待機エントリを作れないようにする。

### 対象ファイル
`game/src/firebase/matchmaking.ts`

### 実装内容

`startMatchmaking` 関数内で、待機リストへの登録前に同一playerIdのチェックを追加:

```typescript
// startMatchmaking 関数内、waitingListRef取得後に追加

// 同一playerIdの既存エントリをチェック（ランクマッチのみ）
if (matchType === 'ranked' && playerId) {
  const existingEntries: string[] = [];

  if (snapshot.exists()) {
    snapshot.forEach((child) => {
      const data = child.val() as WaitingPlayer;
      if (data.playerId === playerId) {
        existingEntries.push(child.key!);
      }
    });
  }

  // 既存エントリがあれば削除
  for (const key of existingEntries) {
    await remove(ref(database, `matchmaking/${matchType}/${key}`));
    console.log('[Matchmaking] Removed duplicate entry for playerId:', playerId);
  }
}
```

### 補足
- カジュアルマッチでは playerId が必須でないため、ランクマッチのみ適用
- 古いエントリを削除することで、新しい接続を優先

---

## Task 2: 短時間での同一対戦相手との再マッチング制限

### 概要
同じ2人が短時間（5分以内）に再マッチングした場合、レート変動なしのカジュアル扱いにする。

### 対象ファイル
- `game/src/screens/GameScreen.tsx`

### 実装内容

#### 2-1: 対戦履歴の型定義と管理

```typescript
// GameScreen.tsx の先頭付近に追加

interface RecentOpponent {
  odName: string;
  timestamp: number;
}

const REMATCH_COOLDOWN_MS = 5 * 60 * 1000; // 5分

// localStorageキー
const RECENT_OPPONENTS_KEY = 'recentOpponents';

// 対戦履歴を取得
const getRecentOpponents = (): RecentOpponent[] => {
  try {
    const data = localStorage.getItem(RECENT_OPPONENTS_KEY);
    if (!data) return [];
    const opponents: RecentOpponent[] = JSON.parse(data);
    // 5分以上前のエントリを除外
    const now = Date.now();
    return opponents.filter(o => now - o.timestamp < REMATCH_COOLDOWN_MS);
  } catch {
    return [];
  }
};

// 対戦履歴に追加
const addRecentOpponent = (odName: string): void => {
  const opponents = getRecentOpponents();
  // 同じ相手がいたら更新、いなければ追加
  const existingIndex = opponents.findIndex(o => o.odName === opponentPlayerId);
  if (existingIndex >= 0) {
    opponents[existingIndex].timestamp = Date.now();
  } else {
    opponents.push({ odName: opponentPlayerId, timestamp: Date.now() });
  }
  // 最大10件まで保持
  const trimmed = opponents.slice(-10);
  localStorage.setItem(RECENT_OPPONENTS_KEY, JSON.stringify(trimmed));
};

// 最近対戦したかチェック
const isRecentOpponent = (opponentPlayerId: string): boolean => {
  const opponents = getRecentOpponents();
  return opponents.some(o => o.opponentPlayerId === opponentPlayerId);
};
```

#### 2-2: マッチング成立時のチェック

マッチング成立後、ゲーム開始前に相手のplayerIdをチェック:

```typescript
// マッチング成立時（onMatch コールバック内など）

// ランクマッチで最近の対戦相手の場合、カジュアル扱いフラグを立てる
const [forceAsCasual, setForceAsCasual] = useState(false);

// マッチング成立時の処理に追加
if (matchType === 'ranked' && opponentPlayerId && isRecentOpponent(opponentPlayerId)) {
  console.log('[AntiCheat] Recent opponent detected, treating as casual');
  setForceAsCasual(true);
  // UIに通知（任意）: 「短時間での再マッチングのため、レート変動なしで対戦します」
}
```

#### 2-3: 試合終了時の処理

```typescript
// 試合終了時のレート更新処理に追加

// レート更新前にチェック
if (matchType === 'ranked' && !forceAsCasual) {
  // 通常のレート更新処理
  await updateRatingAfterMatch(...);
  // 対戦履歴に追加
  if (opponentPlayerId) {
    addRecentOpponent(opponentPlayerId);
  }
} else if (forceAsCasual) {
  console.log('[AntiCheat] Skipping rating update due to recent rematch');
  // レート更新をスキップ、対戦履歴は更新しない（再度5分待てば対戦可能）
}
```

---

## Task 3: 最低ターン数によるレート変動制限

### 概要
一定ターン以下（3ターン以下）で終了した試合はレート変動なし。

### 対象ファイル
- `game/src/screens/GameScreen.tsx`

### 実装内容

#### 3-1: 定数定義

```typescript
const MIN_TURNS_FOR_RATING = 3; // 最低3ターン必要
```

#### 3-2: 試合終了時のチェック

```typescript
// 試合終了時のレート更新処理

// 現在のターン数を取得（gameStateから）
const currentTurn = gameState.turn;

if (matchType === 'ranked' && currentTurn < MIN_TURNS_FOR_RATING) {
  console.log(`[AntiCheat] Game ended too early (turn ${currentTurn}), skipping rating update`);
  // レート更新をスキップ
  // リザルト画面で通知: 「試合が早期終了したため、レートは変動しません」
  return;
}

// 通常のレート更新処理
await updateRatingAfterMatch(...);
```

#### 3-3: リザルト画面での表示

レート変動がスキップされた場合、理由を表示:

```typescript
// リザルト画面のレート表示部分

{matchType === 'ranked' && (
  <>
    {currentTurn < MIN_TURNS_FOR_RATING ? (
      <div style={{ color: '#888' }}>
        ※試合が早期終了したため、レートは変動しません
      </div>
    ) : forceAsCasual ? (
      <div style={{ color: '#888' }}>
        ※短時間での再マッチングのため、レートは変動しません
      </div>
    ) : (
      // 通常のレート増減表示
      <div>レート: {ratingResult.ratingChange > 0 ? '+' : ''}{ratingResult.ratingChange}</div>
    )}
  </>
)}
```

---

## Task 4: 降参連続使用の制限

### 概要
短時間に連続で降参した場合、マッチング一時禁止（クールダウン）。

### 条件
- 10分以内に3回降参 → 5分間ランクマッチ不可

### 対象ファイル
- `game/src/screens/GameScreen.tsx`（降参記録）
- `game/src/screens/MatchmakingScreen.tsx` または `MatchTypeSelectScreen.tsx`（クールダウンチェック）

### 実装内容

#### 4-1: 降参履歴の管理

```typescript
// GameScreen.tsx に追加

interface SurrenderRecord {
  timestamp: number;
}

const SURRENDER_WINDOW_MS = 10 * 60 * 1000; // 10分
const MAX_SURRENDERS_IN_WINDOW = 3;
const SURRENDER_COOLDOWN_MS = 5 * 60 * 1000; // 5分
const SURRENDER_RECORDS_KEY = 'surrenderRecords';
const SURRENDER_COOLDOWN_KEY = 'surrenderCooldownUntil';

// 降参履歴を取得
const getSurrenderRecords = (): SurrenderRecord[] => {
  try {
    const data = localStorage.getItem(SURRENDER_RECORDS_KEY);
    if (!data) return [];
    const records: SurrenderRecord[] = JSON.parse(data);
    const now = Date.now();
    // 10分以内の記録のみ
    return records.filter(r => now - r.timestamp < SURRENDER_WINDOW_MS);
  } catch {
    return [];
  }
};

// 降参を記録
const recordSurrender = (): void => {
  const records = getSurrenderRecords();
  records.push({ timestamp: Date.now() });
  localStorage.setItem(SURRENDER_RECORDS_KEY, JSON.stringify(records));

  // 3回以上ならクールダウン発動
  if (records.length >= MAX_SURRENDERS_IN_WINDOW) {
    const cooldownUntil = Date.now() + SURRENDER_COOLDOWN_MS;
    localStorage.setItem(SURRENDER_COOLDOWN_KEY, cooldownUntil.toString());
    console.log('[AntiCheat] Surrender cooldown activated until:', new Date(cooldownUntil));
  }
};

// クールダウン中かチェック
export const isSurrenderCooldownActive = (): boolean => {
  const cooldownUntil = localStorage.getItem(SURRENDER_COOLDOWN_KEY);
  if (!cooldownUntil) return false;
  return Date.now() < parseInt(cooldownUntil, 10);
};

// クールダウン残り時間を取得（秒）
export const getSurrenderCooldownRemaining = (): number => {
  const cooldownUntil = localStorage.getItem(SURRENDER_COOLDOWN_KEY);
  if (!cooldownUntil) return 0;
  const remaining = parseInt(cooldownUntil, 10) - Date.now();
  return Math.max(0, Math.ceil(remaining / 1000));
};
```

#### 4-2: 降参時の記録

```typescript
// 降参処理（handleSurrender など）に追加

const handleSurrender = () => {
  // ランクマッチの場合のみ記録
  if (matchType === 'ranked') {
    recordSurrender();
  }
  // 既存の降参処理...
};
```

#### 4-3: マッチング前のクールダウンチェック

```typescript
// MatchTypeSelectScreen.tsx または マッチング開始前に追加

import { isSurrenderCooldownActive, getSurrenderCooldownRemaining } from '../screens/GameScreen';

// ランクマッチボタン押下時
const handleRankedMatch = () => {
  if (isSurrenderCooldownActive()) {
    const remaining = getSurrenderCooldownRemaining();
    alert(`降参が多いため、ランクマッチは${remaining}秒後に利用可能になります`);
    return;
  }
  // 通常のマッチング処理
  onSelectMatchType('ranked');
};
```

#### 4-4: UIでのクールダウン表示（任意）

```typescript
// ランクマッチボタンの表示

const [cooldownRemaining, setCooldownRemaining] = useState(0);

useEffect(() => {
  const interval = setInterval(() => {
    setCooldownRemaining(getSurrenderCooldownRemaining());
  }, 1000);
  return () => clearInterval(interval);
}, []);

// ボタン表示
{cooldownRemaining > 0 ? (
  <button disabled style={{ opacity: 0.5 }}>
    ランクマッチ（{cooldownRemaining}秒後に解除）
  </button>
) : (
  <button onClick={handleRankedMatch}>
    ランクマッチ
  </button>
)}
```

---

## 実装順序

1. Task 1: 同一アカウント同時マッチング禁止
2. Task 3: 最低ターン数制限（Task 2 より先にやると楽）
3. Task 2: 短時間再マッチング制限
4. Task 4: 降参連続使用制限

各Task完了後に動作確認を行うこと。

---

## 動作確認チェックリスト

### Task 1
- [ ] 同じアカウントで2つのブラウザからマッチング申請 → 片方のエントリが削除される

### Task 2
- [ ] ランクマッチ終了後、同じ相手と5分以内に再マッチング → レート変動なし
- [ ] 5分経過後に同じ相手とマッチング → レート変動あり

### Task 3
- [ ] 2ターン以下で降参/勝利 → レート変動なし、メッセージ表示
- [ ] 3ターン以上で終了 → レート変動あり

### Task 4
- [ ] 10分以内に3回降参 → クールダウン発動
- [ ] クールダウン中にランクマッチ選択 → 拒否される、残り時間表示
- [ ] 5分経過後 → ランクマッチ選択可能

---

## 注意事項

1. **localStorage使用**: これらの対策はローカルで管理するため、localStorageをクリアすれば回避可能。身内向けの簡易対策として割り切る。
2. **カジュアルマッチは対象外**: すべての制限はランクマッチのみに適用。
3. **ユーザー通知**: 制限が発動した場合は理由を明示し、ユーザー体験を損なわないようにする。
