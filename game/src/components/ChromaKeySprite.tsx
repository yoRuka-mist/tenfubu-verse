
import React, { useRef, useEffect } from 'react';

interface ChromaKeySpriteProps {
    src: string;
    width: number;
    height: number;
    frameWidth: number;
    frameHeight: number;
    frameCount: number;
    fps?: number;
    loop?: boolean;
    keyColor?: [number, number, number]; // RGB, e.g. [0, 255, 0] for Green
    tolerance?: number;
    style?: React.CSSProperties;
    onComplete?: () => void;
}

/**
 * ChromaKeySprite Animation Component
 * Renders a sprite sheet animation with real-time green/purple screen removal via Canvas.
 */
export const ChromaKeySprite: React.FC<ChromaKeySpriteProps> = ({
    src,
    width,
    height,
    frameWidth,
    frameHeight,
    frameCount,
    fps = 10,
    loop = false,
    keyColor = [0, 255, 0], // Default Green
    tolerance = 100,
    style,
    onComplete
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const frameRef = useRef<number>(0);
    const lastFrameTimeRef = useRef<number>(0);
    const reqRef = useRef<number>();

    useEffect(() => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
            imageRef.current = img;
        };
    }, [src]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        const interval = 1000 / fps;

        const animate = (time: number) => {
            reqRef.current = requestAnimationFrame(animate);

            if (time - lastFrameTimeRef.current < interval) return;
            lastFrameTimeRef.current = time;

            if (!imageRef.current) return;

            // Clear
            ctx.clearRect(0, 0, width, height);

            // Draw current frame to offscreen or directly
            // 1. Draw raw frame
            const col = frameRef.current % frameCount; // Simplified strip for now
            // Assuming horizontal strip. If varying, need cols/rows logic.
            // MVP: Horizontal strip.

            ctx.drawImage(
                imageRef.current,
                col * frameWidth, 0, frameWidth, frameHeight,
                0, 0, width, height
            );

            // 2. Apply Chroma Key
            // Get pixel data
            const frameData = ctx.getImageData(0, 0, width, height);
            const data = frameData.data;
            const [kr, kg, kb] = keyColor;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Simple Euclidean distance for color match
                const dist = Math.sqrt(
                    (r - kr) ** 2 +
                    (g - kg) ** 2 +
                    (b - kb) ** 2
                );

                if (dist < tolerance) {
                    data[i + 3] = 0; // Alpha 0
                }
            }

            ctx.putImageData(frameData, 0, 0);

            // Correct Frame Logic
            frameRef.current++;
            if (frameRef.current >= frameCount) {
                if (loop) {
                    frameRef.current = 0;
                } else {
                    cancelAnimationFrame(reqRef.current!);
                    if (onComplete) onComplete();
                }
            }
        };

        reqRef.current = requestAnimationFrame(animate);

        return () => {
            if (reqRef.current) cancelAnimationFrame(reqRef.current);
        };
    }, [frameCount, fps, loop, width, height, frameWidth, frameHeight, keyColor, tolerance, onComplete]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{
                pointerEvents: 'none',
                imageRendering: 'pixelated', // Crucial for pixel art
                ...style
            }}
        />
    );
};
