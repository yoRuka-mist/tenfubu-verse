import React, { useEffect, useState } from 'react';

interface BattleOutroProps {
    isVictory: boolean; // 自分の勝利かどうか
    loserLeaderRef: React.RefObject<HTMLDivElement>; // 敗者リーダーのref
    onComplete: () => void; // 演出完了時のコールバック
    scale?: number; // スケールファクター
}

type AnimationPhase =
    | 'start'           // 演出開始
    | 'zoom'            // リーダーにカメラズーム
    | 'white-fade'      // リーダーが白くなる
    | 'explode'         // 爆散
    | 'result-text'     // 勝利/敗北テキスト表示
    | 'fade-out'        // フェードアウト
    | 'complete';       // 完了

export const BattleOutro: React.FC<BattleOutroProps> = ({
    isVictory,
    loserLeaderRef,
    onComplete,
    scale = 1
}) => {
    const [phase, setPhase] = useState<AnimationPhase>('start');
    const [loserPosition, setLoserPosition] = useState<{ x: number; y: number; size: number } | null>(null);
    const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; angle: number; speed: number; size: number }>>([]);

    // 敗者リーダーの位置を取得
    useEffect(() => {
        if (loserLeaderRef.current) {
            const rect = loserLeaderRef.current.getBoundingClientRect();
            setLoserPosition({
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                size: rect.width
            });
        }
    }, [loserLeaderRef]);

    // 演出フェーズ管理
    useEffect(() => {
        const timings: { [key in AnimationPhase]?: number } = {
            'start': 200,
            'zoom': 800,
            'white-fade': 600,
            'explode': 1000,
            'result-text': 1800,
            'fade-out': 600,
        };

        if (phase === 'complete') {
            onComplete();
            return;
        }

        const nextPhase: { [key in AnimationPhase]?: AnimationPhase } = {
            'start': 'zoom',
            'zoom': 'white-fade',
            'white-fade': 'explode',
            'explode': 'result-text',
            'result-text': 'fade-out',
            'fade-out': 'complete',
        };

        const timer = setTimeout(() => {
            const next = nextPhase[phase];
            if (next) {
                setPhase(next);
            }
        }, timings[phase] || 1000);

        return () => clearTimeout(timer);
    }, [phase, onComplete]);

    // 爆散時にパーティクル生成
    useEffect(() => {
        if (phase === 'explode' && loserPosition) {
            const newParticles = Array.from({ length: 20 }, (_, i) => ({
                id: i,
                x: loserPosition.x,
                y: loserPosition.y,
                angle: (Math.PI * 2 * i) / 20 + Math.random() * 0.5,
                speed: 150 + Math.random() * 200,
                size: 10 + Math.random() * 20
            }));
            setParticles(newParticles);
        }
    }, [phase, loserPosition]);

    const phaseIndex = ['start', 'zoom', 'white-fade', 'explode', 'result-text', 'fade-out', 'complete'].indexOf(phase);

    if (!loserPosition) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 8000, // GameOverScreenより下、ゲーム画面より上
                pointerEvents: 'none',
                overflow: 'hidden',
            }}
        >
            {/* 暗転オーバーレイ（ズーム以降） */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'black',
                    opacity: phaseIndex >= 1 ? (phaseIndex >= 5 ? 1 : 0.6) : 0,
                    transition: 'opacity 0.5s ease-out',
                }}
            />

            {/* 敗者リーダーにズームするスポットライト */}
            {phaseIndex >= 1 && phaseIndex < 4 && (
                <div
                    style={{
                        position: 'absolute',
                        left: loserPosition.x,
                        top: loserPosition.y,
                        transform: 'translate(-50%, -50%)',
                        width: loserPosition.size * (phaseIndex >= 2 ? 1.3 : 1.5),
                        height: loserPosition.size * (phaseIndex >= 2 ? 1.3 : 1.5),
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
                        transition: 'all 0.5s ease-out',
                    }}
                />
            )}

            {/* 白くなるエフェクト（リーダー位置に重ねる） */}
            {phaseIndex >= 2 && phaseIndex < 4 && (
                <div
                    style={{
                        position: 'absolute',
                        left: loserPosition.x,
                        top: loserPosition.y,
                        transform: 'translate(-50%, -50%)',
                        width: loserPosition.size,
                        height: loserPosition.size,
                        borderRadius: '50%',
                        background: 'white',
                        opacity: phaseIndex === 2 ? 0.7 : 1,
                        filter: phaseIndex === 3 ? 'blur(30px)' : 'none',
                        transition: 'all 0.3s ease-out',
                        boxShadow: '0 0 60px white, 0 0 100px white',
                    }}
                />
            )}

            {/* 爆散パーティクル */}
            {phaseIndex >= 3 && particles.map((p) => (
                <div
                    key={p.id}
                    style={{
                        position: 'absolute',
                        left: p.x,
                        top: p.y,
                        width: p.size * scale,
                        height: p.size * scale,
                        borderRadius: '50%',
                        background: 'white',
                        boxShadow: '0 0 20px white',
                        opacity: phaseIndex >= 4 ? 0 : 1,
                        transform: 'translate(-50%, -50%)',
                        animation: `particleFly${p.id % 4} 1s ease-out forwards`,
                    }}
                />
            ))}

            {/* 画面振動エフェクト用のスタイル */}
            {phaseIndex === 3 && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        animation: 'outroShake 0.5s ease-in-out',
                        pointerEvents: 'none',
                    }}
                />
            )}

            {/* 勝利/敗北テキスト */}
            {phaseIndex >= 4 && phaseIndex < 6 && (
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        animation: 'resultTextPop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                >
                    <div
                        style={{
                            fontSize: `${7 * scale}rem`,
                            fontWeight: 900,
                            color: isVictory ? '#ffd700' : '#718096',
                            textShadow: isVictory
                                ? `0 0 30px rgba(255,215,0,0.8), 0 0 60px rgba(255,215,0,0.6), 0 0 90px rgba(255,215,0,0.4), 4px 4px 8px rgba(0,0,0,0.8)`
                                : `0 0 20px rgba(113,128,150,0.5), 4px 4px 8px rgba(0,0,0,0.8)`,
                            letterSpacing: '0.15em',
                            fontFamily: 'sans-serif',
                        }}
                    >
                        {isVictory ? '勝利！' : '敗北...'}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes outroShake {
                    0%, 100% { transform: translate(0, 0); }
                    10% { transform: translate(-10px, -5px); }
                    20% { transform: translate(10px, 5px); }
                    30% { transform: translate(-8px, 8px); }
                    40% { transform: translate(8px, -8px); }
                    50% { transform: translate(-6px, -6px); }
                    60% { transform: translate(6px, 6px); }
                    70% { transform: translate(-4px, 4px); }
                    80% { transform: translate(4px, -2px); }
                    90% { transform: translate(-2px, 0); }
                }

                @keyframes resultTextPop {
                    0% {
                        transform: translate(-50%, -50%) scale(2.5);
                        opacity: 0;
                        filter: blur(20px);
                    }
                    60% {
                        transform: translate(-50%, -50%) scale(0.95);
                        opacity: 1;
                        filter: blur(0px);
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 1;
                        filter: blur(0px);
                    }
                }

                @keyframes particleFly0 {
                    0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    100% { transform: translate(calc(-50% - 200px), calc(-50% - 250px)) scale(0); opacity: 0; }
                }
                @keyframes particleFly1 {
                    0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    100% { transform: translate(calc(-50% + 220px), calc(-50% - 200px)) scale(0); opacity: 0; }
                }
                @keyframes particleFly2 {
                    0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    100% { transform: translate(calc(-50% - 180px), calc(-50% + 230px)) scale(0); opacity: 0; }
                }
                @keyframes particleFly3 {
                    0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    100% { transform: translate(calc(-50% + 250px), calc(-50% + 180px)) scale(0); opacity: 0; }
                }
            `}</style>
        </div>
    );
};
