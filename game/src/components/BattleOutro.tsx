import React, { useEffect, useState } from 'react';

export type OutroPhase =
    | 'start'           // 演出開始
    | 'zoom'            // リーダーにカメラズーム
    | 'white-fade'      // リーダーが白くなる
    | 'explode'         // 爆散
    | 'result-text'     // 勝利/敗北テキスト表示
    | 'fade-out'        // フェードアウト
    | 'complete';       // 完了

interface BattleOutroProps {
    isVictory: boolean; // 自分の勝利かどうか
    loserLeaderRef: React.RefObject<HTMLDivElement>; // 敗者リーダーのref
    onComplete: () => void; // 演出完了時のコールバック
    onPhaseChange?: (phase: OutroPhase) => void; // フェーズ変更時のコールバック
    onShakeIntensityChange?: (intensity: number) => void; // 画面振動強度変更時のコールバック（0〜1）
    scale?: number; // スケールファクター
}

interface Particle {
    id: number;
    x: number;
    y: number;
    angle: number;      // 飛ぶ方向（度）
    distance: number;   // 飛ぶ距離
    size: number;
    delay: number;      // アニメーション開始遅延
    duration: number;   // アニメーション時間
}

export const BattleOutro: React.FC<BattleOutroProps> = ({
    isVictory,
    loserLeaderRef,
    onComplete,
    onPhaseChange,
    onShakeIntensityChange,
    scale = 1
}) => {
    const [phase, setPhase] = useState<OutroPhase>('start');
    const [loserPosition, setLoserPosition] = useState<{ x: number; y: number; size: number } | null>(null);
    const [particles, setParticles] = useState<Particle[]>([]);

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

    // フェーズ変更を親に通知
    useEffect(() => {
        onPhaseChange?.(phase);
    }, [phase, onPhaseChange]);

    // 演出フェーズ管理
    useEffect(() => {
        const timings: { [key in OutroPhase]?: number } = {
            'start': 200,
            'zoom': 600,
            'white-fade': 800,
            'explode': 1200,  // 振動の時間を考慮して少し長く
            'result-text': 1800,
            'fade-out': 600,
        };

        if (phase === 'complete') {
            onComplete();
            return;
        }

        const nextPhase: { [key in OutroPhase]?: OutroPhase } = {
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

    // 爆散時にパーティクル生成と画面振動
    useEffect(() => {
        if (phase === 'explode' && loserPosition) {
            // パーティクル生成（60個、360度均等に分布）
            const particleCount = 60;
            const newParticles: Particle[] = Array.from({ length: particleCount }, (_, i) => {
                // 360度均等に分布 + 少しランダム
                const baseAngle = (i / particleCount) * 360;
                const angleVariation = (Math.random() - 0.5) * 12; // ±6度のばらつき
                const angle = baseAngle + angleVariation;

                // 距離もランダムに
                const distance = 150 + Math.random() * 250;

                // サイズは中心から離れるほど小さくなる傾向
                const baseSize = 12 + Math.random() * 20;

                return {
                    id: i,
                    x: loserPosition.x,
                    y: loserPosition.y,
                    angle,
                    distance,
                    size: baseSize,
                    delay: Math.random() * 0.1, // 少しずつ遅れて発射
                    duration: 0.6 + Math.random() * 0.4, // 0.6〜1.0秒
                };
            });
            setParticles(newParticles);

            // 画面振動開始（大きく始まり徐々に減衰）
            onShakeIntensityChange?.(1);

            // 振動減衰アニメーション
            const shakeDuration = 1000; // 1秒かけて減衰
            const shakeStartTime = Date.now();

            const shakeInterval = setInterval(() => {
                const elapsed = Date.now() - shakeStartTime;
                const progress = elapsed / shakeDuration;

                if (progress >= 1) {
                    onShakeIntensityChange?.(0);
                    clearInterval(shakeInterval);
                } else {
                    // イーズアウトで減衰
                    const newIntensity = 1 - Math.pow(progress, 2);
                    onShakeIntensityChange?.(newIntensity);
                }
            }, 16); // 60fps

            return () => clearInterval(shakeInterval);
        }
    }, [phase, loserPosition, onShakeIntensityChange]);

    const phaseIndex = ['start', 'zoom', 'white-fade', 'explode', 'result-text', 'fade-out', 'complete'].indexOf(phase);

    if (!loserPosition) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 8000,
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
                    opacity: phaseIndex >= 1 ? (phaseIndex >= 5 ? 1 : 0.5) : 0,
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
                        width: loserPosition.size * 1.8,
                        height: loserPosition.size * 1.8,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 60%)',
                        transition: 'all 0.4s ease-out',
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
                        boxShadow: '0 0 15px white, 0 0 30px rgba(255,255,255,0.5)',
                        transform: 'translate(-50%, -50%)',
                        animation: `particleFly-${p.id} ${p.duration}s ease-out ${p.delay}s forwards`,
                    }}
                />
            ))}

            {/* パーティクル用動的キーフレーム */}
            {phaseIndex >= 3 && (
                <style>{
                    particles.map((p) => {
                        const rad = (p.angle * Math.PI) / 180;
                        const dx = Math.cos(rad) * p.distance;
                        const dy = Math.sin(rad) * p.distance;

                        return `
                            @keyframes particleFly-${p.id} {
                                0% {
                                    transform: translate(-50%, -50%) scale(1);
                                    opacity: 1;
                                }
                                100% {
                                    transform: translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0);
                                    opacity: 0;
                                }
                            }
                        `;
                    }).join('\n')
                }</style>
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
                            fontFamily: 'Tamanegi, sans-serif',
                            color: isVictory ? '#ffd700' : '#718096',
                            textShadow: isVictory
                                ? `0 0 30px rgba(255,215,0,0.8), 0 0 60px rgba(255,215,0,0.6), 0 0 90px rgba(255,215,0,0.4), 4px 4px 8px rgba(0,0,0,0.8)`
                                : `0 0 20px rgba(113,128,150,0.5), 4px 4px 8px rgba(0,0,0,0.8)`,
                            letterSpacing: '0.15em',
                        }}
                    >
                        {isVictory ? '勝利！' : '敗北...'}
                    </div>
                </div>
            )}

            <style>{`
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
            `}</style>
        </div>
    );
};
