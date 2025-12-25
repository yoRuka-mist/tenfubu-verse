# Walkthrough - Project Management & Documentation

## Changes

### 1. プロジェクトマップの作成 (`project_map.md`)
- **目的**: 巨大化した `engine.ts` (2000行超) や `GameScreen.tsx` (4100行超) の中身を把握しやすくするための目次を作成しました。
- **内容**: 
    - 各ファイルの主要なセクション（カード定義、エフェクト処理、UIコンポーネント、アクションハンドラ等）を、行数（L〜）とともにリスト化しました。
    - 開発者が迷わずに修正対象のコードを見つけられるように設計されています。

### 2. プロジェクトルールの更新 (`.agent/workflows/project-rules.md`)
- **参照の義務付け**: 修正作業を開始する前に、必ず `project_map.md` を参照して行数を確認するルールを追加しました。
- **メンテナンスの義務付け**: コードの追加・削除によって大幅に（10行以上など）行数がズレた場合や、新しい重要な処理を追加した際に、`project_map.md` を更新することを必須としました。

## Verification
- `project_map.md` の各項目の行数が、現在の最新コード（`engine.ts`, `GameScreen.tsx` 等）と整合していることを、既存の `view_file_outline` および `view_file` の結果から確認しました。
- `project-rules.md` にルールが正しく追記されていることを確認しました。
