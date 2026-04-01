# AIロジック強化ループ継続レポート（2026-02-15 夜）

## 実施ブランチ
- `ai/hardening-loop-20260215`（検証ブランチ）
- main直コミットなし（main先端: `aa3eb27`、検証側集計コミット: `ff3ec08`）

## サイクル定義（各10万戦）
- Cycle 1: `summary-2026-02-15T05-31-57-590Z.txt`
- Cycle 2: `summary-2026-02-15T05-40-38-147Z.txt`
- Cycle 3: `summary-2026-02-15T05-46-23-250Z.txt`
- Cycle 4(再確認): `summary-2026-02-15T05-52-51-514Z.txt`

---

## 各サイクルの全体勝率一覧（p1視点）

### Cycle 1
- SENKA vs SENKA: 49.8%
- SENKA vs AJA: 39.0%
- AJA vs SENKA: 60.3%
- YORUKA vs YORUKA: 49.8%
- AJA vs YORUKA: 66.4%
- YORUKA vs AJA: 33.7%
- SENKA vs YORUKA: 58.7%
- YORUKA vs SENKA: 40.7%
- AJA vs AJA: 49.8%

### Cycle 2
- SENKA vs SENKA: 49.8%
- SENKA vs AJA: 39.1%
- AJA vs SENKA: 60.4%
- YORUKA vs YORUKA: 49.8%
- AJA vs YORUKA: 68.0%
- YORUKA vs AJA: 31.8%
- SENKA vs YORUKA: 62.5%
- YORUKA vs SENKA: 37.1%
- AJA vs AJA: 49.8%

### Cycle 3
- SENKA vs SENKA: 49.8%
- SENKA vs AJA: 39.1%
- AJA vs SENKA: 60.4%
- YORUKA vs YORUKA: 49.8%
- AJA vs YORUKA: 68.0%
- YORUKA vs AJA: 31.8%
- SENKA vs YORUKA: 62.5%
- YORUKA vs SENKA: 37.1%
- AJA vs AJA: 49.8%

### Cycle 4（再確認）
- SENKA vs SENKA: 49.8%
- SENKA vs AJA: 39.1%
- AJA vs SENKA: 60.4%
- YORUKA vs YORUKA: 49.8%
- AJA vs YORUKA: 68.0%
- YORUKA vs AJA: 31.8%
- SENKA vs YORUKA: 62.5%
- YORUKA vs SENKA: 37.1%
- AJA vs AJA: 49.8%

---

## 目的に対する評価
- 最弱対面（SENKA vs AJA）:
  - 39.0% → 39.1%（+0.1pt）
- 他対面悪化抑制:
  - YORUKA vs AJA: 33.7% → 31.8%（-1.9pt）
  - YORUKA vs SENKA: 40.7% → 37.1%（-3.6pt）
  - SENKA vs YORUKA: 58.7% → 62.5%（対YORUKA側で悪化）

結論: 最弱対面の改善量は小さく、他対面悪化が大きいため「同時最適化」は未達。

## トリプルレビュー状況（可能範囲）
- Codex/Gemini/Claudeのレビュー履歴あり（` .claude/review_outputs/ `）
  - 例: `v4_cycle1_design_codex.txt` / `v4_cycle1_design_gemini.txt` / `v4_cycle1_design_claude.txt`
  - 例: `v4_cycle1_impl_codex.txt` / `v4_cycle1_impl_gemini.txt` / `v4_cycle1_impl_claude.txt`

## 採用候補 / 非採用候補
### 採用候補
- **限定採用（要ガード付き）**
  - `43371d1`（weights注入・自動探索モード）
  - 理由: 今後の探索基盤として有用、対面別の再最適化に使える。

### 非採用候補
- **現設定のポリシー重みセット（本番採用不可）**
  - `3d06033` + `8091667` + `aa3eb27` の現行組み合わせ
  - 理由: 最弱対面改善に対してYORUKA関連の副作用が過大。

---

## ブランチ名・コミット一覧
- 対象検証ブランチ: `ai/hardening-loop-20260215`
- 主要コミット:
  - `3d06033` AI自己対戦ロジック改善（8T盞華2ターン探索、対AJA/白ツバキ評価）
  - `43371d1` weights注入・自動探索モード追加
  - `8091667` バリア考慮トレード判定修正
  - `aa3eb27` トレード/顔面優先の再調整
  - `ff3ec08` ループ結果集計レポート追加

## 結果ファイル一覧
- `game/selfplay-results/summary-2026-02-15T05-31-57-590Z.txt`
- `game/selfplay-results/selfplay-2026-02-15T05-31-57-590Z.jsonl`
- `game/selfplay-results/selfplay-2026-02-15T05-31-57-590Z.csv`
- `game/selfplay-results/summary-2026-02-15T05-40-38-147Z.txt`
- `game/selfplay-results/selfplay-2026-02-15T05-40-38-147Z.jsonl`
- `game/selfplay-results/selfplay-2026-02-15T05-40-38-147Z.csv`
- `game/selfplay-results/summary-2026-02-15T05-46-23-250Z.txt`
- `game/selfplay-results/selfplay-2026-02-15T05-46-23-250Z.jsonl`
- `game/selfplay-results/selfplay-2026-02-15T05-46-23-250Z.csv`
- `game/selfplay-results/summary-2026-02-15T05-52-51-514Z.txt`
- `game/selfplay-results/selfplay-2026-02-15T05-52-51-514Z.jsonl`
- `game/selfplay-results/selfplay-2026-02-15T05-52-51-514Z.csv`
