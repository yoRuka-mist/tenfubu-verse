# 実装計画 - BGM追加

## 概要
ゲーム中のBGMとして「kingetsu.mp3」を新たに追加する。

## 実装内容
1. `GameScreen.tsx` の `selectBgm` 関数を修正し、BGMプールに `/bgm/kingetsu.mp3` を追加する。
2. 「あじゃ (AJA)」および「せんか (SENKA)」の両クラスのプールに追加し、ランダムに再生されるようにする。

## チェックリスト
- [ ] `GameScreen.tsx` の `bgmPools` に追加されているか
- [ ] タイポ（スペルミス）がないか
- [ ] 他のBGMと同様にランダム抽選の対象となっているか
