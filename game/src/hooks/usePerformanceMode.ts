import { useState, useEffect } from 'react';

// 高解像度の閾値（ピクセル数）
// 1080p = 1920 * 1080 = 2,073,600
// 1440p = 2560 * 1440 = 3,686,400
// 4K = 3840 * 2160 = 8,294,400
const HIGH_RES_THRESHOLD = 3_500_000; // 1440p以上を高解像度とみなす

export interface PerformanceMode {
    isHighRes: boolean;           // 高解像度モードかどうか
    isLightMode: boolean;         // 軽量モードを有効にすべきか
    pixelCount: number;           // 現在のピクセル数
    resolution: string;           // 解像度の文字列表現
}

/**
 * 画面解像度に基づいてパフォーマンスモードを判定するカスタムフック
 * 4K等の高解像度環境では自動的に軽量モードを有効にする
 */
export function usePerformanceMode(): PerformanceMode {
    const [mode, setMode] = useState<PerformanceMode>(() => calculateMode());

    useEffect(() => {
        const handleResize = () => {
            setMode(calculateMode());
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return mode;
}

function calculateMode(): PerformanceMode {
    const width = window.innerWidth * window.devicePixelRatio;
    const height = window.innerHeight * window.devicePixelRatio;
    const pixelCount = width * height;
    const isHighRes = pixelCount > HIGH_RES_THRESHOLD;

    let resolution = 'HD';
    if (pixelCount > 8_000_000) resolution = '4K';
    else if (pixelCount > 3_500_000) resolution = '1440p';
    else if (pixelCount > 2_000_000) resolution = '1080p';

    return {
        isHighRes,
        isLightMode: isHighRes,
        pixelCount,
        resolution,
    };
}

/**
 * 軽量モード用のエフェクト設定を取得
 */
export function getLightModeEffects(isLightMode: boolean) {
    if (isLightMode) {
        return {
            // box-shadowを1層に減らす
            glowShadow: (color: string, scale: number) =>
                `0 0 ${10 * scale}px ${color}`,
            // SVGフィルターのblur量を減らす
            blurAmount: 4,
            // アニメーションを簡略化（またはなし）
            enableGlowPulse: false,
            // drop-shadowを1層に
            dropShadow: (scale: number) =>
                `drop-shadow(0 0 ${10 * scale}px rgba(255,255,255,0.6))`,
        };
    }
    return {
        // 通常モード：フルエフェクト
        glowShadow: (color: string, scale: number) => `
            0 0 ${15 * scale}px ${color},
            0 0 ${30 * scale}px ${color}80,
            0 0 ${60 * scale}px ${color}50
        `,
        blurAmount: 8,
        enableGlowPulse: true,
        dropShadow: (scale: number) =>
            `drop-shadow(0 0 ${20 * scale}px rgba(255,255,255,0.8)) drop-shadow(0 0 ${40 * scale}px rgba(255,255,255,0.6))`,
    };
}
