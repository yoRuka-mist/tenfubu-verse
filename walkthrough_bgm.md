# 修正内容の確認 - BGM追加

## 修正内容
1. `GameScreen.tsx` にて、BGMの抽選プールに「kingetsu.mp3」を追加しました。
2. 「あじゃ (AJA)」と「せんか (SENKA)」のどちらのクラスでプレイしても、一定の確率で「kingetsu.mp3」が流れるようになっています。

## 確認事項
- [x] `GameScreen.tsx` 内の `bgmPools` 定義に `/bgm/kingetsu.mp3` が含まれていること。
- [x] タイポがないこと。
