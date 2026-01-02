# スタンプ機能 実装計画書

## 概要
シャドウバース ワールズビヨンドのチャット機能を参考に、リーダーをドラッグすることでスタンプを送信できる機能を実装する。

## 機能仕様

### 操作フロー
1. 自分のリーダー（画面左下）をドラッグ開始
2. リーダーを囲むように8つのスタンプ選択肢が円形に表示される
3. ドラッグしたまま目的のスタンプにマウスオーバー
4. マウスを離すとスタンプが送信される
5. 画面中央にスタンプが大きく表示される（自分・相手両方に）

### スタンプデータ
| ID | ファイル名 | 表示テキスト |
|----|-----------|-------------|
| 1 | 1_yoroshiku.png | よろしく |
| 2 | 2_nandato.png | なん…だと…！？ |
| 3 | 3_thank.png | ありがとう！ |
| 4 | 4_willwin.png | 勝ったな。 |
| 5 | 5_dontmind.png | ドンマイ！ |
| 6 | 6_thinking.png | 考え中… |
| 7 | 7_gg.png | GG！ |
| 8 | 8_sorry.png | ごめん |

### 格納場所
```
game/public/stamps/
├── senka/    (1-8)
├── azya/     (1-8)
└── yoruka/   (1-8)
```

## 実装詳細

### 1. 型定義（types.ts）
```typescript
// スタンプID
type StampId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// スタンプ定義
interface StampDefinition {
    id: StampId;
    filename: string;
    label: string;
}

// スタンプ表示状態
interface StampDisplay {
    stampId: StampId;
    playerId: string;
    playerClass: ClassType;
    timestamp: number;
}
```

### 2. スタンプ定義データ（engine.ts or 新規ファイル）
```typescript
const STAMP_DEFINITIONS: StampDefinition[] = [
    { id: 1, filename: '1_yoroshiku.png', label: 'よろしく' },
    { id: 2, filename: '2_nandato.png', label: 'なん…だと…！？' },
    { id: 3, filename: '3_thank.png', label: 'ありがとう！' },
    { id: 4, filename: '4_willwin.png', label: '勝ったな。' },
    { id: 5, filename: '5_dontmind.png', label: 'ドンマイ！' },
    { id: 6, filename: '6_thinking.png', label: '考え中…' },
    { id: 7, filename: '7_gg.png', label: 'GG！' },
    { id: 8, filename: '8_sorry.png', label: 'ごめん' },
];
```

### 3. UI実装（GameScreen.tsx）

#### 3.1 状態管理
```typescript
// スタンプ選択UI表示中か
const [isStampSelectorOpen, setIsStampSelectorOpen] = useState(false);
// ホバー中のスタンプID
const [hoveredStampId, setHoveredStampId] = useState<StampId | null>(null);
// 表示中のスタンプ
const [displayedStamp, setDisplayedStamp] = useState<StampDisplay | null>(null);
```

#### 3.2 リーダードラッグ処理
- onMouseDown: スタンプ選択UIを開く
- onMouseMove: ホバー中のスタンプを検出
- onMouseUp: 選択されたスタンプを送信、UIを閉じる

#### 3.3 スタンプ選択UI
- リーダーを中心に円形配置（半径150px程度）
- 8つのスタンプを45度間隔で配置
- ホバー時に拡大＋ハイライト

#### 3.4 スタンプ表示
- 画面中央に大きく表示（300x300px程度）
- フェードイン→数秒表示→フェードアウト
- アニメーション: scale + opacity

### 4. オンライン同期（server/index.js）

#### 4.1 WebSocketメッセージ
```javascript
// クライアント→サーバー
{ type: 'STAMP', stampId: number }

// サーバー→クライアント（ブロードキャスト）
{ type: 'STAMP', stampId: number, playerId: string }
```

#### 4.2 サーバー処理
- STAMPメッセージを受信したら、両プレイヤーにブロードキャスト

### 5. オフライン対応
- CPU戦ではスタンプ送信は自分のみ表示
- CPUはスタンプを送信しない（将来的に自動返答も可能）

## ファイル変更一覧

| ファイル | 変更内容 |
|---------|---------|
| game/src/core/types.ts | StampId, StampDefinition, StampDisplay型追加 |
| game/src/core/engine.ts | STAMP_DEFINITIONS定義追加 |
| game/src/screens/GameScreen.tsx | スタンプUI・ロジック追加 |
| game/server/index.js | STAMP WebSocketメッセージ処理追加 |

## UI配置イメージ

```
        [1]
    [8]     [2]
  [7]  LEADER  [3]
    [6]     [4]
        [5]
```

## アニメーション仕様

### スタンプ選択UI表示
- duration: 200ms
- easing: ease-out
- 効果: 各スタンプが中心から外側へ広がる

### スタンプ表示
- フェードイン: 300ms (scale 0.5→1, opacity 0→1)
- 表示維持: 2000ms
- フェードアウト: 500ms (opacity 1→0)
