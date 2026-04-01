# AI Hardening Loop Report (2026-02-15)

## 実行ブランチ
- `ai/hardening-loop-20260215`（main直コミットなし）

## 前提
- 既存の10万戦ログ（`game/selfplay-results/summary-*.txt`）をサイクルとして評価
- build: `npm run build` 成功（2026-02-15）
- トリプルレビュー: `.claude/review_outputs/` に Codex/Gemini/Claude のレビュー履歴あり

## サイクル比較（各10万戦）

| Cycle | Summary | SENKA vs AJA | YORUKA vs AJA | YORUKA vs SENKA | 最悪対面 | 8T先切り率 | 9/10Tリーサル率 | 平均ターン(代表) |
|---|---|---:|---:|---:|---|---:|---:|---|
| 0 (Baseline) | `summary-2026-02-15T05-31-57-590Z.txt` | 39.0% | 33.7% | 40.7% | YORUKA vs AJA (33.7%) | 60.17% | 23.98% | SENKA-AJA: 8.85T / AJA-YORUKA: 10.56T |
| 1 | `summary-2026-02-15T05-40-38-147Z.txt` | 39.1% (+0.1) | 31.8% (-1.9) | 37.1% (-3.6) | YORUKA vs AJA (31.8%) | 59.65% | 23.32% | SENKA-AJA: 8.83T / AJA-YORUKA: 10.47T |
| 2 | `summary-2026-02-15T05-46-23-250Z.txt` | 39.1% | 31.8% | 37.1% | YORUKA vs AJA (31.8%) | 59.65% | 23.33% | 同等 |
| 3 | `summary-2026-02-15T05-52-51-514Z.txt` | 39.1% | 31.8% | 37.1% | YORUKA vs AJA (31.8%) | 59.65% | 23.32% | 同等 |
| 4 (再確認) | `summary-2026-02-15T06-49-31-557Z.txt` | 39.1% | 31.8% | 37.1% | YORUKA vs AJA (31.8%) | 59.69% | 23.33% | 同等 |

## 全体勝率一覧（Cycle 4）
- SENKA vs SENKA: 49.8%
- SENKA vs AJA: 39.1%
- AJA vs SENKA: 60.4%
- YORUKA vs YORUKA: 49.8%
- AJA vs YORUKA: 68.0%
- YORUKA vs AJA: 31.8%
- SENKA vs YORUKA: 62.5%
- YORUKA vs SENKA: 37.1%
- AJA vs AJA: 49.8%

## 各サイクルの変更内容（関連コミット）
1. `3d06033` AI自己対戦ロジック改善（8T盞華2ターン探索、対AJA/白ツバキ評価）
2. `43371d1` weights注入・自動探索モード追加
3. `8091667` バリア考慮トレード判定修正
4. `aa3eb27` トレード/顔面優先の再調整

## 判定
- **最弱対面改善優先**の観点では、SENKA vs AJA は +0.1pt と限定的
- 一方で他対面（YORUKA系）が **悪化**（最大 -3.6pt）
- サイクル2以降も改善停滞

### 採用推奨
- **非推奨（現状のままは採用しない）**
- 理由: 最弱改善量に対して副作用が大きく、悪化監視基準を満たせない

### mainマージ可否
- **不可（要追加調整）**

## ブランチ・コミット一覧
- branch: `ai/hardening-loop-20260215`
- 関連コミット:
  - `3d06033`
  - `43371d1`
  - `8091667`
  - `aa3eb27`
