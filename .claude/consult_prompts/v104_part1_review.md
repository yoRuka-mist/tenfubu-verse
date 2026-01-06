# v1.04 Part 1 実装レビュー依頼

## 実装概要
デジタルカードゲームにランクマッチ＆レーティングシステムを実装しました。

## 実装内容

### 新規ファイル
1. **game/src/firebase/auth.ts** - Firebase匿名認証
2. **game/src/firebase/rating.ts** - レーティング計算ロジック（ELO、連勝/格上ボーナス）
3. **game/src/firebase/playerData.ts** - プレイヤーデータCRUD
4. **game/src/screens/MatchTypeSelectScreen.tsx** - マッチタイプ選択画面

### 主要修正
1. **game/src/firebase/matchmaking.ts** - カジュアル/ランクマッチ対応
2. **game/src/screens/TitleScreen.tsx** - ドア風パネルUI
3. **game/src/screens/ClassSelectScreen.tsx** - ランクマッチ時のレート表示
4. **game/src/screens/MatchmakingScreen.tsx** - 自分と相手のレート表示
5. **game/src/screens/GameScreen.tsx** - リザルトレート表示（既存実装を活用）
6. **game/src/App.tsx** - フロー統合

## レビューポイント

以下の観点でレビューをお願いします：

### 1. 設計の妥当性
- Firebase Realtime Databaseのデータ構造は適切か
- レーティング計算ロジック（ELO + ボーナス）は妥当か
- 匿名認証の使用は適切か

### 2. バグ・脆弱性
- **レース条件**: 複数タブ/デバイスでの同時ゲーム終了時のレート更新
- **データ整合性**: Firebase操作のトランザクション処理
- **エラーハンドリング**: 各非同期処理の例外処理
- **マッチング**: タイムアウト処理、キャンセル処理

### 3. パフォーマンス
- Firebase読み書きの最適化
- 不要な再レンダリング
- メモリリーク

### 4. ユーザビリティ
- UIフロー（タイトル → マッチタイプ選択 → クラス選択 → マッチング → ゲーム → リザルト）
- レート表示のタイミング
- エラーメッセージの分かりやすさ

### 5. コード品質
- 型安全性
- 命名規則
- コメントの適切性
- 重複コードの有無

## 特に確認してほしい点

1. **playerData.ts:115-130** のレート更新処理
   - レース条件の可能性はあるか
   - Firebase Transactionを使うべきか

2. **matchmaking.ts** のマッチング処理
   - タイムアウト処理は必要か
   - エラーハンドリングは十分か

3. **rating.ts** のレーティング計算
   - ボーナス計算のロジックは妥当か
   - エッジケース（レート0、マイナスなど）の処理

4. **MatchTypeSelectScreen.tsx** の必要性
   - 現在未使用だが、削除すべきか保持すべきか

## 期待する回答形式

```
【重大な問題】（Blocking）
- 問題点
- 理由
- 修正案

【改善推奨】（P1/P2）
- 問題点
- 理由
- 修正案

【その他の気づき】
- コメント
```

よろしくお願いします。
