import React, { useEffect, useState, useMemo } from 'react';
import { ClassType, Player } from '../core/types';
import { usePerformanceMode, getLightModeEffects } from '../hooks/usePerformanceMode';
import { RankType, RANK_DISPLAY_NAMES } from '../firebase/rating';

// Helper function to resolve asset paths with base URL for GitHub Pages deployment
const getAssetUrl = (path: string): string => {
    const base = import.meta.env.BASE_URL || '/';
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${base}${cleanPath}`;
};

// Helper to get leader image by class
const getLeaderImg = (cls: ClassType): string => {
    if (cls === 'YORUKA') return getAssetUrl('/leaders/yoRuka_leader.png');
    if (cls === 'AJA') return getAssetUrl('/leaders/azya_leader.png');
    return getAssetUrl('/leaders/senka_leader.png');
};

// VS画像
const vsImg = getAssetUrl('/assets/VS.png');

// 斜め分割の角度設定
const DIAGONAL_OFFSET = 8; // 斜め線のオフセット（%）

// GameScreenと同じ定数を使用
const LEADER_SIZE = 240;

// ランク色取得
const getRankColor = (rank: RankType): string => {
    switch (rank) {
        case 'BRONZE': return '#cd7f32';
        case 'SILVER': return '#c0c0c0';
        case 'GOLD': return '#ffd700';
        case 'PLATINUM': return '#e5e4e2';
        case 'DIAMOND': return '#b9f2ff';
        case 'MASTER': return '#ff1493';
        default: return '#ffffff';
    }
};

interface BattleIntroProps {
    myPlayer: Player;
    opponentPlayer: Player;
    isFirstPlayer: boolean; // 先攻かどうか（GameScreen側で決定）
    onComplete: () => void; // 演出完了時のコールバック
    scale?: number; // スケールファクター
    onVsImpact?: () => void; // VS着地時のSE再生コールバック
    onCoinToss?: () => void; // コイントス時のSE再生コールバック
    onImpact?: () => void; // 衝撃音（リーダー衝突/ネームプレート表示）のSE再生コールバック
    onOrbLand?: () => void; // 光の玉着地時のSE再生コールバック
    onFadeInBoard?: () => void; // 盤面フェードイン開始のコールバック
    isMobile?: boolean; // モバイルかどうか
    isRankedMatch?: boolean; // ランクマッチかどうか
    myRank?: RankType; // 自分のランク
    opponentRank?: RankType; // 相手のランク
}

type AnimationPhase =
    | 'fade-in'           // シーン開始フェード
    | 'leaders-enter'     // リーダー登場
    | 'nameplate'         // ネームプレート表示
    | 'vs-display'        // VS表示
    | 'coin-toss'         // コイントス
    | 'turn-order'        // 先攻/後攻表示
    | 'leader-to-orb'     // リーダー→光の玉への変化
    | 'orb-pause'         // 光の玉で停滞（背景フェードアウト）
    | 'orb-fly'           // 光の玉がリーダー枠へ飛行
    | 'leader-appear'     // リーダー再生成
    | 'complete';         // 完了

export const BattleIntro: React.FC<BattleIntroProps> = ({
    myPlayer,
    opponentPlayer,
    isFirstPlayer,
    onComplete,
    scale = 1,
    onVsImpact,
    onCoinToss,
    onImpact,
    onOrbLand,
    onFadeInBoard,
    isMobile = false,
    isRankedMatch = false,
    myRank,
    opponentRank
}) => {
    const [phase, setPhase] = useState<AnimationPhase>('fade-in');
    const [shakeScreen, setShakeScreen] = useState(false);

    // パフォーマンスモード（4K等の高解像度時は軽量モード）
    const { isLightMode } = usePerformanceMode();
    const effects = getLightModeEffects(isLightMode);

    // 光の玉アニメーション用の状態
    const [leaderScale, setLeaderScale] = useState(1); // リーダー画像のスケール
    const [leaderOpacity, setLeaderOpacity] = useState(1); // リーダー画像の透明度
    const [orbScale, setOrbScale] = useState(0); // 光の玉のスケール
    const [orbOpacity, setOrbOpacity] = useState(0); // 光の玉の透明度
    const [backgroundOpacity, setBackgroundOpacity] = useState(1); // 背景（斜め分割等）の透明度
    const [orbPosition, setOrbPosition] = useState({ myX: 0, myY: 0, opX: 0, opY: 0 }); // 光の玉の位置
    const [finalLeaderScale, setFinalLeaderScale] = useState(0); // 最終リーダー画像のスケール
    const [finalLeaderOpacity, setFinalLeaderOpacity] = useState(0); // 最終リーダー画像の透明度
    const [landingParticles, setLandingParticles] = useState<{ id: number; x: number; y: number; angle: number; dist: number; size: number; delay: number; color: string }[]>([]); // 着地パーティクル

    // リーダー枠の目標座標を計算（GameScreenのレイアウトに基づく）
    // GameScreenから渡されるscaleを使用して、座標計算の整合性を保つ
    const leaderTargetPositions = useMemo(() => {
        const windowW = window.innerWidth;
        const windowH = window.innerHeight;

        // GameScreenと同じスケールを使用（propsのscaleはGameScreenのuseScaleFactorで計算済み）
        const gameScale = scale;

        // 左サイドバーの幅（isMobile ? 280 : 340）
        const sidebarWidth = (isMobile ? 280 : 340) * gameScale;

        // 盤面エリアの幅と中心
        const boardWidth = windowW - sidebarWidth;
        const boardCenterX = sidebarWidth + boardWidth / 2;

        // プレイヤーリーダー: bottom: -20 * scale, left: 50%, translateX(-50%)
        // 実際の位置: 盤面の下端から-20px上
        const playerLeaderX = boardCenterX;
        const playerLeaderY = windowH - (-20 * gameScale) - (LEADER_SIZE * gameScale) / 2;

        // 相手リーダー: top: -20 * scale, left: 50%, translateX(-50%)
        // 実際の位置: 盤面の上端から-20px上（つまり上にはみ出る）
        const opponentLeaderX = boardCenterX;
        const opponentLeaderY = (-20 * gameScale) + (LEADER_SIZE * gameScale) / 2;

        return {
            player: { x: playerLeaderX, y: playerLeaderY },
            opponent: { x: opponentLeaderX, y: opponentLeaderY },
            leaderSize: LEADER_SIZE * gameScale
        };
    }, [isMobile, scale]);

    // リーダー画像の初期位置（対戦カード内の中心位置）
    // 光の玉は画面の25%/75%位置に配置
    const leaderInitialPositions = useMemo(() => {
        const windowW = window.innerWidth;
        const windowH = window.innerHeight;

        // 左側エリアの中心（自分）- 画面幅の25%位置
        const myX = windowW * 0.25;
        const myY = windowH * 0.5;

        // 右側エリアの中心（相手）- 画面幅の75%位置
        const opX = windowW * 0.75;
        const opY = windowH * 0.5;

        return { myX, myY, opX, opY };
    }, []);

    // 軽量モード対応のbox-shadow
    const cyanGlow = isLightMode
        ? `0 0 ${10 * scale}px rgba(103, 232, 249, 0.8)`
        : `0 0 ${15 * scale}px rgba(103, 232, 249, 1), 0 0 ${30 * scale}px rgba(34, 211, 238, 0.8), 0 0 ${60 * scale}px rgba(6, 182, 212, 0.5)`;
    const pinkGlow = isLightMode
        ? `0 0 ${10 * scale}px rgba(249, 168, 212, 0.8)`
        : `0 0 ${15 * scale}px rgba(249, 168, 212, 1), 0 0 ${30 * scale}px rgba(244, 114, 182, 0.8), 0 0 ${60 * scale}px rgba(236, 72, 153, 0.5)`;
    const glowAnimation = effects.enableGlowPulse ? 'glowPulse 2s ease-in-out infinite' : 'none';

    // 演出フェーズ管理
    useEffect(() => {
        const timings: Record<string, number> = {
            'fade-in': 500,
            'leaders-enter': 1200,
            'nameplate': 800,
            'vs-display': 1500,
            'coin-toss': 1500,
            'turn-order': 1000,
            'leader-to-orb': 800,
            'orb-pause': 1000,
            'orb-fly': 900, // 1.5倍に延長
            'leader-appear': 600,
        };

        if (phase === 'complete') {
            // 盤面のフェードインを開始（リーダー枠のリーダーは表示し続ける）
            onFadeInBoard?.();

            // GameScreenのフェードイン（0.5s）が完了するまで待ってからonCompleteを呼ぶ
            const timer = setTimeout(() => {
                onComplete();
            }, 700); // GameScreenのtransition時間（0.5s）+ 余裕
            return () => clearTimeout(timer);
        }

        const nextPhase: { [key in AnimationPhase]?: AnimationPhase } = {
            'fade-in': 'leaders-enter',
            'leaders-enter': 'nameplate',
            'nameplate': 'vs-display',
            'vs-display': 'coin-toss',
            'coin-toss': 'turn-order',
            'turn-order': 'leader-to-orb',
            'leader-to-orb': 'orb-pause',
            'orb-pause': 'orb-fly',
            'orb-fly': 'leader-appear',
            'leader-appear': 'complete',
        };

        const timer = setTimeout(() => {
            const next = nextPhase[phase];
            if (next) {
                setPhase(next);
            }
        }, timings[phase] || 1000);

        return () => clearTimeout(timer);
    }, [phase, onComplete, isFirstPlayer]);

    // VS表示時の画面振動とSE再生
    useEffect(() => {
        if (phase === 'vs-display') {
            const timer = setTimeout(() => {
                setShakeScreen(true);
                onVsImpact?.();
                setTimeout(() => setShakeScreen(false), 300);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [phase, onVsImpact]);

    // コイントス時のSE再生
    useEffect(() => {
        if (phase === 'coin-toss') {
            onCoinToss?.();
        }
    }, [phase, onCoinToss]);

    // リーダー衝突時のSE再生（leaders-enterフェーズの終わり頃）
    useEffect(() => {
        if (phase === 'leaders-enter') {
            const timer = setTimeout(() => {
                onImpact?.();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [phase, onImpact]);

    // ネームプレート表示時のSE再生
    useEffect(() => {
        if (phase === 'nameplate') {
            onImpact?.();
        }
    }, [phase, onImpact]);

    // リーダー→光の玉への変化アニメーション
    useEffect(() => {
        if (phase === 'leader-to-orb') {
            const duration = 800;
            const startTime = Date.now();
            let animationId: number;

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3); // ease-out

                // リーダー画像を縮小・透明化
                setLeaderScale(1 - eased * 0.7); // 1 → 0.3
                setLeaderOpacity(1 - eased); // 1 → 0

                // 光の玉を出現・拡大
                setOrbScale(eased * 1.5); // 0 → 1.5
                setOrbOpacity(Math.min(eased * 1.5, 1)); // 0 → 1

                if (progress < 1) {
                    animationId = requestAnimationFrame(animate);
                }
            };

            // 初期位置を設定
            setOrbPosition(leaderInitialPositions);
            animationId = requestAnimationFrame(animate);

            return () => cancelAnimationFrame(animationId);
        }
    }, [phase, leaderInitialPositions]);

    // 光の玉停滞中の背景フェードアウト
    useEffect(() => {
        if (phase === 'orb-pause') {
            const duration = 800;
            const startTime = Date.now();
            let animationId: number;

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = progress; // linear

                setBackgroundOpacity(1 - eased); // 1 → 0

                if (progress < 1) {
                    animationId = requestAnimationFrame(animate);
                }
            };

            animationId = requestAnimationFrame(animate);

            return () => cancelAnimationFrame(animationId);
        }
    }, [phase]);

    // 光の玉の弧を描く移動
    useEffect(() => {
        if (phase === 'orb-fly') {
            const duration = 900; // 1.5倍に延長
            const startTime = Date.now();
            let animationId: number;

            // 開始位置
            const startMyX = leaderInitialPositions.myX;
            const startMyY = leaderInitialPositions.myY;
            const startOpX = leaderInitialPositions.opX;
            const startOpY = leaderInitialPositions.opY;

            // 終了位置（リーダー枠）
            const endMyX = leaderTargetPositions.player.x;
            const endMyY = leaderTargetPositions.player.y;
            const endOpX = leaderTargetPositions.opponent.x;
            const endOpY = leaderTargetPositions.opponent.y;

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                // ease-in: 最初ゆっくり、最後に加速
                const eased = progress * progress * progress; // cubic ease-in

                // 自分のリーダー: 左下→下への弧
                // ベジェ曲線的な動き（左下に膨らんでから下へ）
                const myControlX = startMyX - 200 * scale; // 左に膨らむ
                const myControlY = (startMyY + endMyY) / 2 + 100 * scale; // 下に膨らむ
                const myX = (1 - eased) * (1 - eased) * startMyX + 2 * (1 - eased) * eased * myControlX + eased * eased * endMyX;
                const myY = (1 - eased) * (1 - eased) * startMyY + 2 * (1 - eased) * eased * myControlY + eased * eased * endMyY;

                // 相手のリーダー: 右上→上への弧
                const opControlX = startOpX + 200 * scale; // 右に膨らむ
                const opControlY = (startOpY + endOpY) / 2 - 100 * scale; // 上に膨らむ
                const opX = (1 - eased) * (1 - eased) * startOpX + 2 * (1 - eased) * eased * opControlX + eased * eased * endOpX;
                const opY = (1 - eased) * (1 - eased) * startOpY + 2 * (1 - eased) * eased * opControlY + eased * eased * endOpY;

                setOrbPosition({ myX, myY, opX, opY });

                // 光の玉を徐々に縮小
                setOrbScale(1.5 - eased * 1.0); // 1.5 → 0.5

                if (progress < 1) {
                    animationId = requestAnimationFrame(animate);
                }
            };

            animationId = requestAnimationFrame(animate);

            return () => cancelAnimationFrame(animationId);
        }
    }, [phase, leaderInitialPositions, leaderTargetPositions, scale]);

    // リーダー再生成アニメーション
    useEffect(() => {
        if (phase === 'leader-appear') {
            const duration = 600;
            const startTime = Date.now();
            let animationId: number;

            // 着地SE
            onOrbLand?.();

            // 画面振動
            setShakeScreen(true);
            setTimeout(() => setShakeScreen(false), 300);

            // パーティクル生成（自分リーダー: 青系、相手リーダー: 赤系）
            const playerX = leaderTargetPositions.player.x;
            const playerY = leaderTargetPositions.player.y;
            const opponentX = leaderTargetPositions.opponent.x;
            const opponentY = leaderTargetPositions.opponent.y;
            const particleCount = 24; // 各リーダーから24個

            const particles: typeof landingParticles = [];
            // 自分リーダーのパーティクル（青系）
            for (let i = 0; i < particleCount; i++) {
                const angle = (i / particleCount) * 360 + (Math.random() - 0.5) * 15;
                particles.push({
                    id: i,
                    x: playerX,
                    y: playerY,
                    angle,
                    dist: 80 + Math.random() * 120,
                    size: 8 + Math.random() * 12,
                    delay: Math.random() * 0.1,
                    color: `hsl(${200 + Math.random() * 40}, 80%, ${60 + Math.random() * 20}%)` // 青〜シアン系
                });
            }
            // 相手リーダーのパーティクル（赤系）
            for (let i = 0; i < particleCount; i++) {
                const angle = (i / particleCount) * 360 + (Math.random() - 0.5) * 15;
                particles.push({
                    id: particleCount + i,
                    x: opponentX,
                    y: opponentY,
                    angle,
                    dist: 80 + Math.random() * 120,
                    size: 8 + Math.random() * 12,
                    delay: Math.random() * 0.1,
                    color: `hsl(${0 + Math.random() * 30}, 80%, ${55 + Math.random() * 20}%)` // 赤〜オレンジ系
                });
            }
            setLandingParticles(particles);

            // パーティクルを一定時間後にクリア
            const clearTimer = setTimeout(() => {
                setLandingParticles([]);
            }, 800);

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3); // ease-out

                // 光の玉を消す
                setOrbOpacity(1 - eased); // 1 → 0

                // リーダー画像を出現
                setFinalLeaderScale(eased); // 0 → 1
                setFinalLeaderOpacity(eased); // 0 → 1

                if (progress < 1) {
                    animationId = requestAnimationFrame(animate);
                }
            };

            animationId = requestAnimationFrame(animate);

            return () => {
                cancelAnimationFrame(animationId);
                clearTimeout(clearTimer);
            };
        }
    }, [phase, onOrbLand, leaderTargetPositions]);

    const phaseIndex = [
        'fade-in', 'leaders-enter', 'nameplate', 'vs-display', 'coin-toss', 'turn-order',
        'leader-to-orb', 'orb-pause', 'orb-fly', 'leader-appear', 'complete'
    ].indexOf(phase);

    // 新しいフェーズでの表示制御
    const showVs = phaseIndex >= 3 && phaseIndex <= 9; // VS表示をleader-appearまで延長
    const showBackground = phaseIndex >= 0 && phaseIndex <= 7; // orb-pauseまで背景表示

    // 斜め分割用のclip-path計算
    const leftClipPath = `polygon(0 0, ${50 + DIAGONAL_OFFSET}% 0, ${50 - DIAGONAL_OFFSET}% 100%, 0 100%)`;
    const rightClipPath = `polygon(${50 + DIAGONAL_OFFSET}% 0, 100% 0, 100% 100%, ${50 - DIAGONAL_OFFSET}% 100%)`;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: phaseIndex >= 7 ? 'transparent' : '#0a0a0f', // orb-pause以降は透明に
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: phaseIndex >= 6 ? 'visible' : 'hidden', // 光の玉フェーズ以降はoverflow:visibleでグローが切れないように
                animation: shakeScreen ? 'screenShake 0.3s ease-in-out' : undefined,
                pointerEvents: phaseIndex >= 9 ? 'none' : 'auto', // leader-appear以降はクリック透過
            }}
        >
            {/* フェードインオーバーレイ */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'black',
                    opacity: phase === 'fade-in' ? 1 : 0,
                    transition: 'opacity 0.5s ease-out',
                    pointerEvents: 'none',
                    zIndex: 10000,
                }}
            />

            {/* 背景グループ（フェードアウト対象） */}
            {showBackground && (
                <div style={{ opacity: backgroundOpacity, transition: 'opacity 0.3s' }}>
                    {/* 左側エリア（青サイド - 自分） */}
                    {phaseIndex >= 0 && (
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                clipPath: leftClipPath,
                                background: 'linear-gradient(135deg, #0a1628 0%, #1a2a4a 50%, #0d1a30 100%)',
                                transform: `translateX(${phaseIndex >= 1 ? '0' : '-100%'})`,
                                transition: 'transform 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
                                zIndex: 50,
                                overflow: 'hidden',
                            }}
                        >
                            {/* リーダー画像（画面の25%中心に配置） */}
                            <div
                                style={{
                                    position: 'fixed', // fixedで画面全体基準
                                    top: '50%',
                                    left: '25%', // 画面の25%位置
                                    transform: 'translate(-50%, -50%)', // 中心を25%位置に合わせる
                                    opacity: leaderOpacity,
                                }}
                            >
                                <img
                                    src={getLeaderImg(myPlayer.class)}
                                    alt={myPlayer.name}
                                    style={{
                                        height: '120vh',
                                        width: 'auto',
                                        objectFit: 'cover',
                                        objectPosition: myPlayer.class === 'AJA' ? 'center top' : 'center',
                                        filter: 'brightness(0.85) contrast(1.1)',
                                        transform: `scale(${leaderScale})`,
                                        transformOrigin: 'center center',
                                    }}
                                />
                            </div>

                            {/* 青いグラデーションオーバーレイ */}
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, transparent 60%)',
                                    pointerEvents: 'none',
                                }}
                            />

                            {/* ネームプレート */}
                            {phaseIndex >= 2 && phaseIndex < 6 && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        bottom: '12%',
                                        left: '15%',
                                        padding: `${16 * scale}px ${40 * scale}px`,
                                        background: 'rgba(0,0,0,0.85)',
                                        borderRadius: 8 * scale,
                                        borderLeft: `4px solid #3b82f6`,
                                        animation: 'nameplateSlideUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                        whiteSpace: 'nowrap',
                                        boxShadow: '0 4px 30px rgba(59, 130, 246, 0.4)',
                                    }}
                                >
                                    <div
                                        style={{
                                            color: 'white',
                                            fontSize: 2.2 * scale + 'rem',
                                            fontWeight: 'bold',
                                            textShadow: '0 0 20px rgba(59, 130, 246, 0.8)',
                                        }}
                                    >
                                        {myPlayer.name}
                                    </div>
                                    {/* ランクマッチ時のランク表示 */}
                                    {isRankedMatch && myRank && (
                                        <div
                                            style={{
                                                color: getRankColor(myRank),
                                                fontSize: 1.2 * scale + 'rem',
                                                fontWeight: 'bold',
                                                textShadow: `0 0 10px ${getRankColor(myRank)}80`,
                                                marginTop: `${4 * scale}px`,
                                            }}
                                        >
                                            {RANK_DISPLAY_NAMES[myRank]}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 先攻/後攻表示 */}
                            {phaseIndex >= 5 && phaseIndex < 6 && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '10%',
                                        left: '15%',
                                        padding: `${12 * scale}px ${32 * scale}px`,
                                        background: isFirstPlayer ? 'rgba(239, 68, 68, 0.9)' : 'rgba(59, 130, 246, 0.9)',
                                        borderRadius: 8 * scale,
                                        animation: 'turnOrderFadeIn 1s ease-out',
                                        boxShadow: isFirstPlayer
                                            ? '0 0 30px rgba(239, 68, 68, 0.6)'
                                            : '0 0 30px rgba(59, 130, 246, 0.6)',
                                    }}
                                >
                                    <div
                                        style={{
                                            color: 'white',
                                            fontSize: 1.8 * scale + 'rem',
                                            fontWeight: 'bold',
                                            letterSpacing: '0.1em',
                                        }}
                                    >
                                        {isFirstPlayer ? '先攻' : '後攻'}
                                    </div>
                                </div>
                            )}

                            {/* 光の玉は背景グループの外に移動 */}
                        </div>
                    )}

                    {/* 右側エリア（赤サイド - 相手） */}
                    {phaseIndex >= 0 && (
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                clipPath: rightClipPath,
                                background: 'linear-gradient(225deg, #280a0a 0%, #4a1a1a 50%, #300d0d 100%)',
                                transform: `translateX(${phaseIndex >= 1 ? '0' : '100%'})`,
                                transition: 'transform 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
                                zIndex: 50,
                                overflow: 'hidden',
                            }}
                        >
                            {/* リーダー画像（画面の75%中心に配置） */}
                            <div
                                style={{
                                    position: 'fixed', // fixedで画面全体基準
                                    top: '50%',
                                    left: '75%', // 画面の75%位置
                                    transform: 'translate(-50%, -50%)', // 中心を75%位置に合わせる
                                    opacity: leaderOpacity,
                                }}
                            >
                                <img
                                    src={getLeaderImg(opponentPlayer.class)}
                                    alt={opponentPlayer.name}
                                    style={{
                                        height: '120vh',
                                        width: 'auto',
                                        objectFit: 'cover',
                                        objectPosition: opponentPlayer.class === 'AJA' ? 'center top' : 'center',
                                        filter: 'brightness(0.85) contrast(1.1)',
                                        transform: `scale(${leaderScale})`,
                                        transformOrigin: 'center center',
                                    }}
                                />
                            </div>

                            {/* 赤いグラデーションオーバーレイ */}
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'linear-gradient(225deg, rgba(239, 68, 68, 0.3) 0%, transparent 60%)',
                                    pointerEvents: 'none',
                                }}
                            />

                            {/* ネームプレート */}
                            {phaseIndex >= 2 && phaseIndex < 6 && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        bottom: '12%',
                                        right: '15%',
                                        padding: `${16 * scale}px ${40 * scale}px`,
                                        background: 'rgba(0,0,0,0.85)',
                                        borderRadius: 8 * scale,
                                        borderRight: `4px solid #ef4444`,
                                        animation: 'nameplateSlideUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                        whiteSpace: 'nowrap',
                                        boxShadow: '0 4px 30px rgba(239, 68, 68, 0.4)',
                                    }}
                                >
                                    <div
                                        style={{
                                            color: 'white',
                                            fontSize: 2.2 * scale + 'rem',
                                            fontWeight: 'bold',
                                            textShadow: '0 0 20px rgba(239, 68, 68, 0.8)',
                                        }}
                                    >
                                        {opponentPlayer.name}
                                    </div>
                                    {/* ランクマッチ時のランク表示 */}
                                    {isRankedMatch && opponentRank && (
                                        <div
                                            style={{
                                                color: getRankColor(opponentRank),
                                                fontSize: 1.2 * scale + 'rem',
                                                fontWeight: 'bold',
                                                textShadow: `0 0 10px ${getRankColor(opponentRank)}80`,
                                                marginTop: `${4 * scale}px`,
                                            }}
                                        >
                                            {RANK_DISPLAY_NAMES[opponentRank]}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 先攻/後攻表示 */}
                            {phaseIndex >= 5 && phaseIndex < 6 && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '10%',
                                        right: '15%',
                                        padding: `${12 * scale}px ${32 * scale}px`,
                                        background: !isFirstPlayer ? 'rgba(239, 68, 68, 0.9)' : 'rgba(59, 130, 246, 0.9)',
                                        borderRadius: 8 * scale,
                                        animation: 'turnOrderFadeIn 1s ease-out',
                                        boxShadow: !isFirstPlayer
                                            ? '0 0 30px rgba(239, 68, 68, 0.6)'
                                            : '0 0 30px rgba(59, 130, 246, 0.6)',
                                    }}
                                >
                                    <div
                                        style={{
                                            color: 'white',
                                            fontSize: 1.8 * scale + 'rem',
                                            fontWeight: 'bold',
                                            letterSpacing: '0.1em',
                                        }}
                                    >
                                        {!isFirstPlayer ? '先攻' : '後攻'}
                                    </div>
                                </div>
                            )}

                            {/* 光の玉は背景グループの外に移動 */}
                        </div>
                    )}

                    {/* 左側エリアの縁取り（水色の光のライン） */}
                    {phaseIndex >= 1 && (
                        <>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: 4 * scale, height: '100%', background: 'linear-gradient(180deg, #67e8f9 0%, #22d3ee 30%, #06b6d4 50%, #22d3ee 70%, #67e8f9 100%)', boxShadow: cyanGlow, zIndex: 100, animation: glowAnimation }} />
                            <div style={{ position: 'absolute', top: 0, left: 0, width: `calc(${50 + DIAGONAL_OFFSET}% + ${2 * scale}px)`, height: 4 * scale, background: 'linear-gradient(90deg, #67e8f9 0%, #22d3ee 30%, #06b6d4 50%, #22d3ee 70%, #67e8f9 100%)', boxShadow: cyanGlow, zIndex: 100, animation: glowAnimation }} />
                            <div style={{ position: 'absolute', bottom: 0, left: 0, width: `calc(${50 - DIAGONAL_OFFSET}% + ${2 * scale}px)`, height: 4 * scale, background: 'linear-gradient(90deg, #67e8f9 0%, #22d3ee 30%, #06b6d4 50%, #22d3ee 70%, #67e8f9 100%)', boxShadow: cyanGlow, zIndex: 100, animation: glowAnimation }} />
                            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 100, pointerEvents: 'none', overflow: 'visible' }}>
                                <defs>
                                    <linearGradient id="cyanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#67e8f9" />
                                        <stop offset="30%" stopColor="#22d3ee" />
                                        <stop offset="50%" stopColor="#06b6d4" />
                                        <stop offset="70%" stopColor="#22d3ee" />
                                        <stop offset="100%" stopColor="#67e8f9" />
                                    </linearGradient>
                                    <filter id="cyanGlow" x="-50%" y="-50%" width="200%" height="200%">
                                        <feGaussianBlur stdDeviation={effects.blurAmount} result="blur" />
                                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                    </filter>
                                </defs>
                                <line x1={`${50 + DIAGONAL_OFFSET - 0.2}%`} y1="0" x2={`${50 - DIAGONAL_OFFSET - 0.2}%`} y2="100%" stroke="url(#cyanGradient)" strokeWidth={4 * scale} filter={isLightMode ? undefined : "url(#cyanGlow)"} style={{ animation: glowAnimation }} />
                            </svg>
                        </>
                    )}

                    {/* 右側エリアの縁取り（ピンクの光のライン） */}
                    {phaseIndex >= 1 && (
                        <>
                            <div style={{ position: 'absolute', top: 0, right: 0, width: 4 * scale, height: '100%', background: 'linear-gradient(180deg, #f9a8d4 0%, #f472b6 30%, #ec4899 50%, #f472b6 70%, #f9a8d4 100%)', boxShadow: pinkGlow, zIndex: 100, animation: glowAnimation, animationDelay: '0.3s' }} />
                            <div style={{ position: 'absolute', top: 0, right: 0, width: `calc(${50 - DIAGONAL_OFFSET}% + ${2 * scale}px)`, height: 4 * scale, background: 'linear-gradient(90deg, #f9a8d4 0%, #f472b6 30%, #ec4899 50%, #f472b6 70%, #f9a8d4 100%)', boxShadow: pinkGlow, zIndex: 100, animation: glowAnimation, animationDelay: '0.3s' }} />
                            <div style={{ position: 'absolute', bottom: 0, right: 0, width: `calc(${50 + DIAGONAL_OFFSET}% + ${2 * scale}px)`, height: 4 * scale, background: 'linear-gradient(90deg, #f9a8d4 0%, #f472b6 30%, #ec4899 50%, #f472b6 70%, #f9a8d4 100%)', boxShadow: pinkGlow, zIndex: 100, animation: glowAnimation, animationDelay: '0.3s' }} />
                            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 100, pointerEvents: 'none', overflow: 'visible' }}>
                                <defs>
                                    <linearGradient id="pinkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#f9a8d4" />
                                        <stop offset="30%" stopColor="#f472b6" />
                                        <stop offset="50%" stopColor="#ec4899" />
                                        <stop offset="70%" stopColor="#f472b6" />
                                        <stop offset="100%" stopColor="#f9a8d4" />
                                    </linearGradient>
                                    <filter id="pinkGlow" x="-50%" y="-50%" width="200%" height="200%">
                                        <feGaussianBlur stdDeviation={effects.blurAmount} result="blur" />
                                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                    </filter>
                                </defs>
                                <line x1={`${50 + DIAGONAL_OFFSET + 0.2}%`} y1="0" x2={`${50 - DIAGONAL_OFFSET + 0.2}%`} y2="100%" stroke="url(#pinkGradient)" strokeWidth={4 * scale} filter={isLightMode ? undefined : "url(#pinkGlow)"} style={{ animation: glowAnimation, animationDelay: '0.3s' }} />
                            </svg>
                        </>
                    )}
                </div>
            )}

            {/* 光の玉（リーダー縮小時から表示、背景フェードアウト中も表示し続ける） */}
            {/* boxShadowの代わりにradial-gradientでグローを表現（clipPathの影響を受けない） */}
            {phaseIndex >= 6 && phaseIndex <= 9 && (
                <>
                    {/* 自分の光の玉 - グローをradial-gradientで表現 */}
                    <div
                        style={{
                            position: 'fixed',
                            left: orbPosition.myX,
                            top: orbPosition.myY,
                            transform: `translate(-50%, -50%) scale(${orbScale})`,
                            opacity: orbOpacity,
                            width: 400 * scale, // グロー込みの全体サイズ
                            height: 400 * scale,
                            borderRadius: '50%',
                            background: isLightMode
                                ? 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(100,180,255,0.9) 15%, rgba(59,130,246,0.6) 30%, rgba(59,130,246,0.2) 50%, transparent 70%)'
                                : 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(100,180,255,0.9) 12%, rgba(59,130,246,0.7) 25%, rgba(59,130,246,0.4) 40%, rgba(59,130,246,0.15) 60%, transparent 80%)',
                            zIndex: 500,
                            pointerEvents: 'none',
                        }}
                    />

                    {/* 相手の光の玉 - グローをradial-gradientで表現 */}
                    <div
                        style={{
                            position: 'fixed',
                            left: orbPosition.opX,
                            top: orbPosition.opY,
                            transform: `translate(-50%, -50%) scale(${orbScale})`,
                            opacity: orbOpacity,
                            width: 400 * scale, // グロー込みの全体サイズ
                            height: 400 * scale,
                            borderRadius: '50%',
                            background: isLightMode
                                ? 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,150,150,0.9) 15%, rgba(239,68,68,0.6) 30%, rgba(239,68,68,0.2) 50%, transparent 70%)'
                                : 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,150,150,0.9) 12%, rgba(239,68,68,0.7) 25%, rgba(239,68,68,0.4) 40%, rgba(239,68,68,0.15) 60%, transparent 80%)',
                            zIndex: 500,
                            pointerEvents: 'none',
                        }}
                    />
                </>
            )}

            {/* リーダー枠に着地したリーダー画像 */}
            {phaseIndex >= 9 && (
                <>
                    {/* 自分のリーダー */}
                    <div
                        style={{
                            position: 'fixed',
                            left: leaderTargetPositions.player.x,
                            top: leaderTargetPositions.player.y,
                            transform: `translate(-50%, -50%) scale(${finalLeaderScale})`,
                            opacity: finalLeaderOpacity,
                            width: leaderTargetPositions.leaderSize,
                            height: leaderTargetPositions.leaderSize,
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: '4px solid #3182ce',
                            boxShadow: '0 0 20px rgba(49, 130, 206, 0.4)',
                            background: '#1a202c',
                            zIndex: 500,
                            pointerEvents: 'none',
                        }}
                    >
                        <img
                            src={getLeaderImg(myPlayer.class)}
                            alt={myPlayer.name}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                objectPosition: myPlayer.class === 'AJA' ? 'center top' : 'center',
                            }}
                        />
                    </div>

                    {/* 相手のリーダー */}
                    <div
                        style={{
                            position: 'fixed',
                            left: leaderTargetPositions.opponent.x,
                            top: leaderTargetPositions.opponent.y,
                            transform: `translate(-50%, -50%) scale(${finalLeaderScale})`,
                            opacity: finalLeaderOpacity,
                            width: leaderTargetPositions.leaderSize,
                            height: leaderTargetPositions.leaderSize,
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: '4px solid #c53030',
                            boxShadow: '0 0 20px rgba(197, 48, 48, 0.4)',
                            background: '#1a202c',
                            zIndex: 500,
                            pointerEvents: 'none',
                        }}
                    >
                        <img
                            src={getLeaderImg(opponentPlayer.class)}
                            alt={opponentPlayer.name}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                objectPosition: opponentPlayer.class === 'AJA' ? 'center top' : 'center',
                            }}
                        />
                    </div>
                </>
            )}

            {/* 着地パーティクル */}
            {landingParticles.map(p => (
                <div
                    key={p.id}
                    style={{
                        position: 'fixed',
                        left: p.x,
                        top: p.y,
                        width: p.size * scale,
                        height: p.size * scale,
                        borderRadius: '50%',
                        background: p.color,
                        boxShadow: `0 0 ${p.size * 0.5 * scale}px ${p.color}`,
                        pointerEvents: 'none',
                        zIndex: 600,
                        animation: `landingParticleBurst 0.6s ease-out ${p.delay}s forwards`,
                        transform: 'translate(-50%, -50%)',
                        '--particle-angle': `${p.angle}deg`,
                        '--particle-dist': `${p.dist * scale}px`,
                    } as React.CSSProperties}
                />
            ))}

            {/* VS表示（延長） */}
            {showVs && (
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        animation: phaseIndex === 3 ? 'vsZoomIn 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
                        opacity: phaseIndex >= 7 ? Math.max(0, backgroundOpacity) : 1, // 背景と一緒にフェードアウト
                        zIndex: 200,
                        pointerEvents: 'none',
                    }}
                >
                    <img
                        src={vsImg}
                        alt="VS"
                        style={{
                            height: 300 * scale,
                            width: 'auto',
                            filter: `drop-shadow(0 0 ${20 * scale}px rgba(255,255,255,0.8)) drop-shadow(0 0 ${40 * scale}px rgba(255,255,255,0.6))`,
                        }}
                    />
                </div>
            )}

            {/* コイントスアニメーション */}
            {phaseIndex >= 4 && phaseIndex < 5 && (
                <div
                    style={{
                        position: 'absolute',
                        top: '20%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 150,
                    }}
                >
                    <div
                        style={{
                            width: 100 * scale,
                            height: 100 * scale,
                            borderRadius: '50%',
                            background: 'linear-gradient(45deg, #f6ad55 0%, #fbd38d 100%)',
                            border: `4px solid white`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 2 * scale + 'rem',
                            fontWeight: 'bold',
                            color: 'white',
                            animation: 'coinFlip 1.5s ease-in-out',
                            boxShadow: `0 0 ${30 * scale}px rgba(246, 173, 85, 0.8)`,
                        }}
                    >
                        ？
                    </div>
                </div>
            )}

            <style>{`
                @keyframes screenShake {
                    0%, 100% { transform: translate(0, 0); }
                    10% { transform: translate(-10px, -10px); }
                    20% { transform: translate(10px, 10px); }
                    30% { transform: translate(-10px, 10px); }
                    40% { transform: translate(10px, -10px); }
                    50% { transform: translate(-10px, -10px); }
                    60% { transform: translate(10px, 10px); }
                    70% { transform: translate(-10px, 10px); }
                    80% { transform: translate(10px, -10px); }
                    90% { transform: translate(-10px, 0); }
                }

                @keyframes nameplateSlideUp {
                    0% {
                        transform: translateY(50px);
                        opacity: 0;
                    }
                    60% {
                        transform: translateY(-10px);
                    }
                    100% {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }

                @keyframes vsZoomIn {
                    0% {
                        transform: translate(-50%, -50%) scale(3) translateZ(0);
                        opacity: 0;
                        filter: blur(20px);
                    }
                    50% {
                        transform: translate(-50%, -50%) scale(1.2) translateZ(0);
                        opacity: 1;
                        filter: blur(0px);
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(1) translateZ(0);
                        opacity: 1;
                        filter: blur(0px);
                    }
                }

                @keyframes coinFlip {
                    0% {
                        transform: rotateY(0deg) scale(1);
                    }
                    50% {
                        transform: rotateY(1800deg) scale(1.2);
                    }
                    100% {
                        transform: rotateY(3600deg) scale(1);
                    }
                }

                @keyframes turnOrderFadeIn {
                    0% {
                        opacity: 0;
                        transform: scale(0.5);
                    }
                    50% {
                        transform: scale(1.2);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                @keyframes glowPulse {
                    0%, 100% {
                        opacity: 0.8;
                        filter: brightness(1);
                    }
                    50% {
                        opacity: 1;
                        filter: brightness(1.3);
                    }
                }

                @keyframes landingParticleBurst {
                    0% {
                        transform: translate(-50%, -50%) rotate(var(--particle-angle)) translateX(0);
                        opacity: 1;
                    }
                    100% {
                        transform: translate(-50%, -50%) rotate(var(--particle-angle)) translateX(var(--particle-dist));
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
};
