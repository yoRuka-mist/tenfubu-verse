# Task List - 2025-12-18

- [ ] カード画像の表示修正 (最優先)
    - [x] カード画像パスの調査 (ブラウザエージェント)
    - [ ] `engine.ts` の画像パスを絶対パスに統一
    - [ ] `Card.tsx` の表示領域確保 (CSSクラスの適用ミス修正)
    - [ ] `Card.tsx` のCSS互換性向上 (`inset` の置換)
- [ ] Monoのカード画像の修正
- [ ] 青ツバキのコスト・ステータス修正
- [ ] ヴァルキリーが正常に守護（Ward）として機能しているか確認
- [ ] 相手フォロワーの進化・超進化時の効果が発揮されない（ターゲット指定が必要なもの）問題の修正 (AIがtargetIdを渡すようにする)
- [ ] GameScreen.tsx: SEP時の予測線とドラッグ円を紫色に変更 @GameScreen.tsx
- [ ] GameScreen.tsx: saraのトークン生成演出を11ターン目以降のみに制限 @GameScreen.tsx
- [ ] GameScreen.tsx: 'SHOT' スプライトアニメーションの実装（IMPACT等と同様） @GameScreen.tsx
- [ ] GameScreen.tsx: 相手のデッキの重なりを左下方向に修正 @GameScreen.tsx
- [ ] walkthrough.md: 修正内容を更新
