import React, { useEffect, useState } from 'react';
import { ClassType, Player } from '../core/types';

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

interface BattleIntroProps {
    myPlayer: Player;
    opponentPlayer: Player;
    isFirstPlayer: boolean; // 先攻かどうか（GameScreen側で決定）
    onComplete: () => void; // 演出完了時のコールバック
    scale?: number; // スケールファクター
}

type AnimationPhase =
    | 'fade-in'           // シーン開始フェード
    | 'leaders-enter'     // リーダー登場
    | 'nameplate'         // ネームプレート表示
    | 'vs-display'        // VS表示
    | 'coin-toss'         // コイントス
    | 'turn-order'        // 先攻/後攻表示
    | 'ui-build'          // UI組み立て
    | 'complete';         // 完了

export const BattleIntro: React.FC<BattleIntroProps> = ({
    myPlayer,
    opponentPlayer,
    isFirstPlayer,
    onComplete,
    scale = 1
}) => {
    const [phase, setPhase] = useState<AnimationPhase>('fade-in');
    const [shakeScreen, setShakeScreen] = useState(false);

    // 演出フェーズ管理
    useEffect(() => {
        const timings = {
            'fade-in': 500,
            'leaders-enter': 1200,
            'nameplate': 800,
            'vs-display': 1500,
            'coin-toss': 1500,
            'turn-order': 1000,
            'ui-build': 1500,
        };

        if (phase === 'complete') {
            onComplete();
            return;
        }

        const nextPhase: { [key in AnimationPhase]?: AnimationPhase } = {
            'fade-in': 'leaders-enter',
            'leaders-enter': 'nameplate',
            'nameplate': 'vs-display',
            'vs-display': 'coin-toss',
            'coin-toss': 'turn-order',
            'turn-order': 'ui-build',
            'ui-build': 'complete',
        };

        const timer = setTimeout(() => {
            const next = nextPhase[phase];
            if (next) {
                setPhase(next);
            }
        }, timings[phase] || 1000);

        return () => clearTimeout(timer);
    }, [phase, onComplete, isFirstPlayer]);

    // VS表示時の画面振動
    useEffect(() => {
        if (phase === 'vs-display') {
            const timer = setTimeout(() => {
                setShakeScreen(true);
                // SE再生（実装はGameScreenで行う想定）
                setTimeout(() => setShakeScreen(false), 300);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [phase]);

    const phaseIndex = ['fade-in', 'leaders-enter', 'nameplate', 'vs-display', 'coin-toss', 'turn-order', 'ui-build', 'complete'].indexOf(phase);

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                animation: shakeScreen ? 'screenShake 0.3s ease-in-out' : undefined,
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

            {/* 自分のリーダー（左側） */}
            {phaseIndex >= 0 && (
                <div
                    style={{
                        position: 'absolute',
                        left: '25%',
                        top: '50%',
                        transform: `translate(-50%, -50%) translateX(${phaseIndex >= 1 ? '0' : '-150%'})`,
                        transition: 'transform 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
                        zIndex: 100,
                    }}
                >
                    {/* リーダー画像 */}
                    <div
                        style={{
                            width: 600 * scale,
                            height: 600 * scale,
                            overflow: 'hidden',
                            boxShadow: `0 20px 60px rgba(0,0,0,0.8), 0 0 40px ${isFirstPlayer ? 'rgba(72, 187, 120, 0.3)' : 'rgba(246, 173, 85, 0.3)'}`,
                        }}
                    >
                        <img
                            src={getLeaderImg(myPlayer.class)}
                            alt={myPlayer.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>

                    {/* ネームプレート */}
                    {phaseIndex >= 2 && (
                        <div
                            style={{
                                position: 'absolute',
                                bottom: -80 * scale,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                padding: `${16 * scale}px ${40 * scale}px`,
                                background: 'rgba(0,0,0,0.9)',
                                borderRadius: 30 * scale,
                                border: '3px solid rgba(255,255,255,0.4)',
                                animation: 'nameplateSlideUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <div
                                style={{
                                    color: 'white',
                                    fontSize: 2.5 * scale + 'rem',
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                }}
                            >
                                {myPlayer.name}
                            </div>
                        </div>
                    )}

                    {/* 先攻/後攻表示 */}
                    {phaseIndex >= 5 && (
                        <div
                            style={{
                                position: 'absolute',
                                top: -100 * scale,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                padding: `${12 * scale}px ${32 * scale}px`,
                                background: isFirstPlayer ? 'rgba(72, 187, 120, 0.9)' : 'rgba(246, 173, 85, 0.9)',
                                borderRadius: 20 * scale,
                                border: '3px solid white',
                                animation: 'turnOrderFadeIn 1s ease-out',
                            }}
                        >
                            <div
                                style={{
                                    color: 'white',
                                    fontSize: 2 * scale + 'rem',
                                    fontWeight: 'bold',
                                }}
                            >
                                {isFirstPlayer ? '先攻' : '後攻'}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 相手のリーダー（右側） */}
            {phaseIndex >= 0 && (
                <div
                    style={{
                        position: 'absolute',
                        right: '25%',
                        top: '50%',
                        transform: `translate(50%, -50%) translateX(${phaseIndex >= 1 ? '0' : '150%'})`,
                        transition: 'transform 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
                        zIndex: 100,
                    }}
                >
                    {/* リーダー画像 */}
                    <div
                        style={{
                            width: 600 * scale,
                            height: 600 * scale,
                            overflow: 'hidden',
                            boxShadow: `0 20px 60px rgba(0,0,0,0.8), 0 0 40px ${!isFirstPlayer ? 'rgba(72, 187, 120, 0.3)' : 'rgba(246, 173, 85, 0.3)'}`,
                        }}
                    >
                        <img
                            src={getLeaderImg(opponentPlayer.class)}
                            alt={opponentPlayer.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>

                    {/* ネームプレート */}
                    {phaseIndex >= 2 && (
                        <div
                            style={{
                                position: 'absolute',
                                bottom: -80 * scale,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                padding: `${16 * scale}px ${40 * scale}px`,
                                background: 'rgba(0,0,0,0.9)',
                                borderRadius: 30 * scale,
                                border: '3px solid rgba(255,255,255,0.4)',
                                animation: 'nameplateSlideUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <div
                                style={{
                                    color: 'white',
                                    fontSize: 2.5 * scale + 'rem',
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                }}
                            >
                                {opponentPlayer.name}
                            </div>
                        </div>
                    )}

                    {/* 先攻/後攻表示 */}
                    {phaseIndex >= 5 && (
                        <div
                            style={{
                                position: 'absolute',
                                top: -100 * scale,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                padding: `${12 * scale}px ${32 * scale}px`,
                                background: !isFirstPlayer ? 'rgba(72, 187, 120, 0.9)' : 'rgba(246, 173, 85, 0.9)',
                                borderRadius: 20 * scale,
                                border: '3px solid white',
                                animation: 'turnOrderFadeIn 1s ease-out',
                            }}
                        >
                            <div
                                style={{
                                    color: 'white',
                                    fontSize: 2 * scale + 'rem',
                                    fontWeight: 'bold',
                                }}
                            >
                                {!isFirstPlayer ? '先攻' : '後攻'}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* VS表示 */}
            {phaseIndex >= 3 && phaseIndex < 6 && (
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        animation: 'vsZoomIn 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        zIndex: 200,
                    }}
                >
                    <div
                        style={{
                            fontSize: 8 * scale + 'rem',
                            fontWeight: 900,
                            color: 'white',
                            textShadow: `
                                0 0 ${20 * scale}px rgba(255,255,255,0.8),
                                0 0 ${40 * scale}px rgba(255,255,255,0.6),
                                ${4 * scale}px ${4 * scale}px ${8 * scale}px rgba(0,0,0,0.8)
                            `,
                            letterSpacing: '0.1em',
                        }}
                    >
                        VS
                    </div>
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

            {/* UI組み立て演出 */}
            {phaseIndex >= 6 && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
                        animation: 'uiBuildFlash 1.5s ease-out',
                        pointerEvents: 'none',
                        zIndex: 300,
                    }}
                />
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
                        transform: translateX(-50%) translateY(50px);
                        opacity: 0;
                    }
                    60% {
                        transform: translateX(-50%) translateY(-10px);
                    }
                    100% {
                        transform: translateX(-50%) translateY(0);
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
                        transform: translateX(-50%) scale(0.5);
                    }
                    50% {
                        transform: translateX(-50%) scale(1.2);
                    }
                    100% {
                        opacity: 1;
                        transform: translateX(-50%) scale(1);
                    }
                }

                @keyframes uiBuildFlash {
                    0% {
                        opacity: 0;
                    }
                    50% {
                        opacity: 1;
                    }
                    100% {
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
};
