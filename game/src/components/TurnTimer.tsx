import React, { useEffect, useState, useRef, useCallback, useId } from 'react';

interface TurnTimerProps {
    isMyTurn: boolean;           // 自分のターンかどうか
    turnCount: number;           // ターン数（ターン変更検知用）
    activePlayerId: string;      // アクティブプレイヤーID（ターン変更検知用）
    onTimeUp: () => void;        // タイムアップ時のコールバック（ターン終了を呼ぶ）
    timerEnabled: boolean;       // タイマー有効/無効
    isGameOver?: boolean;        // ゲーム終了フラグ（trueならタイマー停止）
    isPaused?: boolean;          // 一時停止フラグ（BattleIntro中など、trueならタイマー停止・非表示）
    scale?: number;              // スケールファクター
    buttonSize?: number;         // ボタンサイズ（デフォルト160）
    timerDuration?: number;      // タイマー秒数（デフォルト60）
}

export const TurnTimer: React.FC<TurnTimerProps> = ({
    isMyTurn,
    turnCount,
    activePlayerId,
    onTimeUp,
    timerEnabled,
    isGameOver = false,
    isPaused = false,
    scale = 1,
    buttonSize = 160,
    timerDuration = 60
}) => {
    // 小数点以下の精度で残り時間を管理（滑らかなゲージ用）
    const [timeRemaining, setTimeRemaining] = useState(timerDuration);
    const [isWarning, setIsWarning] = useState(false);      // 残り15秒以下
    const [isUrgent, setIsUrgent] = useState(false);        // 残り10秒以下
    const intervalRef = useRef<number | null>(null);
    const lastTurnKeyRef = useRef<string>('');
    const endTimeRef = useRef<number>(0);                   // 終了予定時刻（Date.now()ベース）
    const onTimeUpRef = useRef(onTimeUp);                   // コールバックをRef化（依存回避）
    const timeUpCalledRef = useRef(false);                  // タイムアップ呼び出し済みフラグ

    // ユニークIDでスタイル名の衝突を回避
    const uniqueId = useId().replace(/:/g, '_');

    // コールバックを常に最新に保つ
    useEffect(() => {
        onTimeUpRef.current = onTimeUp;
    }, [onTimeUp]);

    // ターンキー（ターン変更検知用）
    const turnKey = `${turnCount}-${activePlayerId}`;

    // タイマーリセット
    const resetTimer = useCallback(() => {
        setTimeRemaining(timerDuration);
        setIsWarning(false);
        setIsUrgent(false);
        endTimeRef.current = Date.now() + timerDuration * 1000;
        timeUpCalledRef.current = false;
    }, [timerDuration]);

    // ターン変更時にタイマーリセット
    useEffect(() => {
        if (turnKey !== lastTurnKeyRef.current) {
            lastTurnKeyRef.current = turnKey;
            resetTimer();
        }
    }, [turnKey, resetTimer]);

    // タイマー動作（Date.now()ベースで精度向上、小数点以下も更新）
    useEffect(() => {
        // タイマー無効 or 自分のターンでない or ゲーム終了 or 一時停止の場合は停止
        if (!timerEnabled || !isMyTurn || isGameOver || isPaused) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // 終了予定時刻が未設定なら設定
        if (endTimeRef.current === 0) {
            endTimeRef.current = Date.now() + timerDuration * 1000;
        }

        // タイマー開始（16msごとに更新して滑らかなゲージを実現）
        intervalRef.current = window.setInterval(() => {
            const now = Date.now();
            // 小数点以下2桁の精度で残り時間を計算
            const remaining = Math.max(0, (endTimeRef.current - now) / 1000);

            setTimeRemaining(remaining);

            // 警告状態更新（整数秒で判定）
            const remainingSec = Math.ceil(remaining);
            if (remainingSec <= 15 && remainingSec > 10) {
                setIsWarning(true);
                setIsUrgent(false);
            } else if (remainingSec <= 10) {
                setIsWarning(true);
                setIsUrgent(true);
            } else {
                setIsWarning(false);
                setIsUrgent(false);
            }

            // タイムアップ
            if (remaining <= 0 && !timeUpCalledRef.current) {
                timeUpCalledRef.current = true;
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
                // Refからコールバックを呼ぶ（依存配列に含めない）
                setTimeout(() => onTimeUpRef.current(), 0);
            }
        }, 16); // 約60fpsで滑らかに更新

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [timerEnabled, isMyTurn, isGameOver, isPaused, timerDuration]);

    // タイマー無効時 or 一時停止中は何も表示しない
    if (!timerEnabled || isPaused) {
        return null;
    }

    // ゲージの計算（小数点以下の精度で滑らかに）
    const progress = timeRemaining / timerDuration; // 1 → 0
    const radius = (buttonSize / 2 + 12) * scale;   // ボタンより少し大きい
    const strokeWidth = 6 * scale;
    const circumference = 2 * Math.PI * radius;
    // 時計回りに減少：strokeDashoffsetを負の値にして反転
    const strokeDashoffset = -circumference * (1 - progress);

    // 振動の強度（残り10秒〜0秒で増加: 0→1）
    const remainingSec = Math.ceil(timeRemaining);
    const shakeIntensity = isUrgent ? Math.min(1, (10 - remainingSec) / 10) : 0;
    // 振動アニメーション速度（強度が増すほど速くなる）
    const shakeDuration = Math.max(0.05, 0.15 - shakeIntensity * 0.1);

    // 色の決定
    let gaugeColor = '#4299e1'; // 通常：青
    if (isWarning && !isUrgent) {
        gaugeColor = '#f6ad55'; // 警告：オレンジ
    } else if (isUrgent) {
        gaugeColor = '#e53e3e'; // 緊急：赤
    }

    // 光彩のためのパディング
    const glowPadding = 20 * scale;
    const totalSize = radius * 2 + strokeWidth + glowPadding * 2;

    return (
        <div
            style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: totalSize,
                height: totalSize,
                pointerEvents: 'none',
                zIndex: 10,
                animation: isUrgent ? `timerShake${uniqueId} ${shakeDuration}s ease-in-out infinite` : undefined,
            }}
        >
            {/* 円形ゲージ */}
            <svg
                width={totalSize}
                height={totalSize}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    overflow: 'visible', // 光彩がはみ出ても表示
                }}
            >
                {/* 背景リング（暗い） */}
                <circle
                    cx={totalSize / 2}
                    cy={totalSize / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(0,0,0,0.3)"
                    strokeWidth={strokeWidth}
                />
                {/* ゲージリング（時計回り） */}
                <circle
                    cx={totalSize / 2}
                    cy={totalSize / 2}
                    r={radius}
                    fill="none"
                    stroke={gaugeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{
                        transform: 'rotate(-90deg)',
                        transformOrigin: 'center',
                        // transitionを削除して滑らかなリアルタイム更新
                    }}
                />
                {/* 警告時の光彩リング */}
                {isWarning && (
                    <circle
                        cx={totalSize / 2}
                        cy={totalSize / 2}
                        r={radius}
                        fill="none"
                        stroke={gaugeColor}
                        strokeWidth={strokeWidth * 3}
                        opacity={0.4}
                        style={{
                            filter: `blur(${12 * scale}px)`,
                            animation: isUrgent ? `timerPulse${uniqueId} 0.5s ease-in-out infinite` : `timerPulse${uniqueId} 1s ease-in-out infinite`,
                        }}
                    />
                )}
            </svg>

            {/* アニメーション用スタイル（ユニークIDで名前衝突回避） */}
            <style>{`
                @keyframes timerPulse${uniqueId} {
                    0%, 100% { opacity: 0.4; }
                    50% { opacity: 0.7; }
                }
                @keyframes timerShake${uniqueId} {
                    0%, 100% { transform: translate(-50%, -50%) translate(0, 0); }
                    25% { transform: translate(-50%, -50%) translate(${2 * scale}px, ${-2 * scale}px); }
                    50% { transform: translate(-50%, -50%) translate(${-2 * scale}px, ${2 * scale}px); }
                    75% { transform: translate(-50%, -50%) translate(${2 * scale}px, ${1 * scale}px); }
                }
            `}</style>
        </div>
    );
};
