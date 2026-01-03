import React, { useEffect, useLayoutEffect, useReducer, useState, useCallback, useRef } from 'react';
import { initializeGame, gameReducer, getCardDefinition, getAllCardNames, STAMP_DEFINITIONS, getStampImagePath, getStampSE } from '../core/engine';
import { ClassType, Player, Card as CardModel, StampId, StampDisplay } from '../core/types';
import { Card } from '../components/Card';
import { useGameNetwork } from '../network/hooks';
import { canEvolve, canSuperEvolve } from '../core/abilities';

// Helper function to resolve asset paths with base URL for GitHub Pages deployment
const getAssetUrl = (path: string): string => {
    const base = import.meta.env.BASE_URL || '/';
    // Remove leading slash from path if base already ends with /
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${base}${cleanPath}`;
};

// Leader Images
const azyaLeaderImg = getAssetUrl('/leaders/azya_leader.png');
const senkaLeaderImg = getAssetUrl('/leaders/senka_leader.png');
const yorukaLeaderImg = getAssetUrl('/leaders/yoRuka_leader.png');

// Sleeve Images (Card Back)
const azyaSleeve = getAssetUrl('/sleeves/azya_sleeve.png');
const senkaSleeve = getAssetUrl('/sleeves/senka_sleeve.png');
const yorukaSleeve = getAssetUrl('/sleeves/yoruka_sleeve.png');

// Helper to get leader image by class
const getLeaderImg = (cls: ClassType): string => {
    if (cls === 'YORUKA') return yorukaLeaderImg;
    if (cls === 'AJA') return azyaLeaderImg;
    return senkaLeaderImg;
};

// Helper to get sleeve image by class
const getSleeveImg = (cls: ClassType): string => {
    if (cls === 'YORUKA') return yorukaSleeve;
    if (cls === 'AJA') return azyaSleeve;
    return senkaSleeve;
};

// --- Scale Factor Hook for 4K/Multi-resolution Support ---
// Base resolution: 1920x1080 (Full HD)
// Now uses independent X/Y scaling to fill entire screen without black bars
const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;



interface ScaleInfo {
    scale: number;
    // For coordinate conversions: viewport to game coords
    toGameX: (screenX: number) => number;
    toGameY: (screenY: number) => number;
}

const useScaleFactor = (): ScaleInfo => {
    const [scaleInfo, setScaleInfo] = useState<ScaleInfo>({
        scale: 1,
        toGameX: (x) => x,
        toGameY: (y) => y,
    });

    const calculateScale = useCallback(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Calculate uniform scale based on the smaller dimension to fit, 
        // multiplied by 1.5 as requested for larger UI elements relative to screen
        // But we must ensure it doesn't get too crazy large.
        // Let's stick to height-based scaling for consistent vertical layout, 
        // but clamped by width to prevent overflow.

        let scale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);

        // Apply user requested magnification (approx 1.5x larger than standard relative size)
        scale *= 1.5;

        // Coordinate conversion functions (Offset is 0 because we will use relative CSS positioning)
        // Coordinate conversion functions (Identity - we use screen coords everywhere now logic-wise)
        const toGameX = (screenX: number) => screenX;
        const toGameY = (screenY: number) => screenY;

        setScaleInfo({ scale, toGameX, toGameY });
    }, []);

    useEffect(() => {
        calculateScale();
        window.addEventListener('resize', calculateScale);
        return () => window.removeEventListener('resize', calculateScale);
    }, [calculateScale]);

    return scaleInfo;
};

// UI Element Size Constants (Base values, will be scaled)
const CARD_WIDTH = 90;
const CARD_HEIGHT = 120;
const CARD_SPACING = CARD_WIDTH + 18; // 108
const LEADER_SIZE = 240;

interface GameScreenProps {
    playerClass: ClassType;
    opponentType: 'CPU' | 'ONLINE';
    gameMode: 'CPU' | 'HOST' | 'JOIN';
    targetRoomId?: string;
    onLeave: () => void;
    networkAdapter?: any; // NetworkAdapter passed from LobbyScreen
    networkConnected?: boolean;
    opponentClass?: ClassType; // For online play: opponent's class selection
    aiDifficulty?: 'EASY' | 'NORMAL' | 'HARD'; // AI difficulty for CPU mode
}



// --- Heal Visual Effect (Soft) ---
const HealEffectVisual = ({ x, y, onComplete }: { x: number, y: number, onComplete: () => void }) => {
    React.useEffect(() => {
        const timer = setTimeout(onComplete, 2000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    const particles = React.useMemo(() => {
        return Array(20).fill(0).map((_, i) => ({
            id: i,
            angle: Math.random() * 360,
            dist: 50 + Math.random() * 100,
            size: 15 + Math.random() * 25,
            delay: Math.random() * 0.5,
        }));
    }, []);

    return (
        <div style={{ position: 'absolute', left: x, top: y, pointerEvents: 'none', zIndex: 6000 }}>
            <style>{`
                @keyframes healGlowFade {
                    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; filter: blur(10px); }
                    30% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; filter: blur(15px); }
                    100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; filter: blur(30px); }
                }
                @keyframes healParticleRise {
                    0% { transform: translate(-50%, -50%) rotate(var(--angle)) translate(0, 0) scale(0); opacity: 0; }
                    20% { transform: translate(-50%, -50%) rotate(var(--angle)) translate(0, 0) opacity: 0.7; }
                    100% { transform: translate(-50%, -50%) rotate(var(--angle)) translate(calc(var(--dist) * 1px), 0) scale(1.5); opacity: 0; }
                }
            `}</style>

            {/* Core Glow */}
            <div style={{
                position: 'absolute', left: 0, top: 0,
                width: 250, height: 250,
                background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(200,255,240,0.5) 50%, transparent 80%)',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                animation: 'healGlowFade 1.5s ease-out forwards',
                filter: 'blur(10px)'
            }} />

            {/* Soft Particles */}
            {particles.map(p => (
                <div key={p.id} style={({
                    position: 'absolute', left: 0, top: 0,
                    width: p.size, height: p.size,
                    background: 'rgba(255,250,240,0.6)',
                    borderRadius: '50%',
                    filter: 'blur(5px)',
                    '--angle': `${p.angle}deg`,
                    '--dist': p.dist,
                    animation: `healParticleRise 1.2s ease-out ${p.delay}s forwards`,
                    pointerEvents: 'none'
                } as any)} />
            ))}
        </div>
    );
};

// --- Buff/Debuff Visual Effect (with +ATK/+HP or -ATK/-HP numbers) ---
const BuffEffectVisual = ({ x, y, atkBuff, hpBuff, onComplete }: { x: number, y: number, atkBuff: number, hpBuff: number, onComplete: () => void }) => {
    React.useEffect(() => {
        const timer = setTimeout(onComplete, 1500);
        return () => clearTimeout(timer);
    }, [onComplete]);

    // Determine colors and glow based on buff/debuff
    const isDebuff = atkBuff < 0 || hpBuff < 0;
    const glowColor = isDebuff
        ? 'radial-gradient(circle, rgba(180,50,50,0.9) 0%, rgba(150,30,30,0.4) 50%, transparent 80%)'
        : 'radial-gradient(circle, rgba(255,230,100,0.9) 0%, rgba(255,200,50,0.4) 50%, transparent 80%)';
    const sparkleColor = isDebuff ? '#ff4444' : '#ffd93d';

    // All buff values shown in yellow
    const buffColor = '#ffd93d';
    const buffGlow = 'rgba(255,217,61,0.8)';

    // Format number with sign
    const formatValue = (val: number) => val >= 0 ? `+${val}` : `${val}`;

    // Card dimensions for positioning (approximate card size on board)
    // Attack is displayed at bottom-left, HP at bottom-right of the card
    const cardWidth = 80; // Approximate card width
    const cardHeight = 110; // Approximate card height

    return (
        <div style={{ position: 'absolute', left: x, top: y, pointerEvents: 'none', zIndex: 6000 }}>
            <style>{`
                @keyframes buffGlow {
                    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                    30% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
                }
                @keyframes buffNumberRise {
                    0% { transform: translateY(0); opacity: 0; }
                    20% { opacity: 1; }
                    100% { transform: translateY(-30px); opacity: 0; }
                }
                @keyframes buffSparkle {
                    0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                    50% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                }
            `}</style>

            {/* Core Glow */}
            <div style={{
                position: 'absolute', left: 0, top: 0,
                width: 150, height: 150,
                background: glowColor,
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                animation: 'buffGlow 1.2s ease-out forwards',
                filter: 'blur(8px)'
            }} />

            {/* Attack Value - positioned at bottom-left of card */}
            {atkBuff !== 0 && (
                <div style={{
                    position: 'absolute',
                    left: -cardWidth / 2 + 12,
                    top: cardHeight / 2 - 20,
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: buffColor,
                    textShadow: `0 0 10px ${buffGlow}, 2px 2px 4px rgba(0,0,0,0.8)`,
                    fontFamily: 'Tamanegi, sans-serif',
                    animation: 'buffNumberRise 1.2s ease-out forwards',
                    textAlign: 'center'
                }}>
                    {formatValue(atkBuff)}
                </div>
            )}

            {/* HP Value - positioned at bottom-right of card */}
            {hpBuff !== 0 && (
                <div style={{
                    position: 'absolute',
                    left: cardWidth / 2 - 28,
                    top: cardHeight / 2 - 20,
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: buffColor,
                    textShadow: `0 0 10px ${buffGlow}, 2px 2px 4px rgba(0,0,0,0.8)`,
                    fontFamily: 'Tamanegi, sans-serif',
                    animation: 'buffNumberRise 1.2s ease-out forwards',
                    textAlign: 'center'
                }}>
                    {formatValue(hpBuff)}
                </div>
            )}

            {/* Sparkle particles */}
            {[...Array(8)].map((_, i) => (
                <div key={i} style={{
                    position: 'absolute',
                    left: Math.cos(i * Math.PI / 4) * 60,
                    top: Math.sin(i * Math.PI / 4) * 60,
                    width: 12, height: 12,
                    background: sparkleColor,
                    borderRadius: '50%',
                    boxShadow: `0 0 10px ${sparkleColor}, 0 0 20px ${sparkleColor}`,
                    animation: `buffSparkle 0.8s ease-out ${i * 0.1}s forwards`,
                }} />
            ))}
        </div>
    );
};

// --- Visual Effects ---
// BANE effect component - Purple skull animation
const BaneEffectVisual = ({ x, y, onComplete }: { x: number, y: number, onComplete: () => void }) => {
    React.useEffect(() => {
        const timer = setTimeout(onComplete, 1200);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div style={{
            position: 'absolute',
            left: x,
            top: y,
            transform: 'translate(-50%, -50%)',
            width: 200,
            height: 200,
            pointerEvents: 'none',
            zIndex: 5000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            {/* Purple skull icon using emoji or custom drawing */}
            <div style={{
                fontSize: '120px',
                animation: 'baneSkullAppear 1.2s ease-out forwards',
                textShadow: '0 0 30px #9b59b6, 0 0 60px #8e44ad, 0 0 90px #6c3483',
                filter: 'drop-shadow(0 0 20px #9b59b6) hue-rotate(-10deg)',
            }}>
                💀
            </div>
            {/* Purple particle effects */}
            {[...Array(12)].map((_, i) => (
                <div key={i} style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: 8,
                    height: 8,
                    background: 'radial-gradient(circle, #9b59b6, #6c3483)',
                    borderRadius: '50%',
                    boxShadow: '0 0 10px #9b59b6, 0 0 20px #8e44ad',
                    animation: `baneParticle 1s ease-out ${i * 0.08}s forwards`,
                    transform: `rotate(${i * 30}deg) translateX(0)`,
                }} />
            ))}
            <style>{`
                @keyframes baneSkullAppear {
                    0% { transform: scale(0) rotate(-30deg); opacity: 0; }
                    20% { transform: scale(1.3) rotate(10deg); opacity: 1; }
                    40% { transform: scale(1) rotate(-5deg); opacity: 1; }
                    60% { transform: scale(1.1) rotate(0deg); opacity: 1; }
                    80% { transform: scale(1) rotate(0deg); opacity: 0.8; }
                    100% { transform: scale(1.5) rotate(0deg); opacity: 0; }
                }
                @keyframes baneParticle {
                    0% { transform: rotate(${0}deg) translateX(0); opacity: 1; }
                    100% { transform: rotate(${0}deg) translateX(100px); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

const AttackEffect = ({ type, x, y, onComplete, audioSettings }: { type: string, x: number, y: number, onComplete: () => void, audioSettings: any }) => {
    // Sprite Configuration (Updated for 8x8 standardization)
    const spriteConfig = React.useMemo(() => {
        let cols = 8;
        let rows = 8;
        let fps = 100; // Faster sprites
        let size = 256;

        if (type === 'SHOT') {
            size = 128; // Half size
        }

        return { cols, rows, fps, size };
    }, [type]);

    React.useEffect(() => {
        // Duration based on animation type
        const isSprite = ['LIGHTNING', 'THUNDER', 'IMPACT', 'SUMI', 'SHOT', 'ICE', 'WATER', 'RAY', 'FIRE', 'SLASH', 'BLUE_FIRE'].includes(type);
        const duration = isSprite
            ? (spriteConfig.cols * spriteConfig.rows) / spriteConfig.fps * 1000
            : (type === 'FIREBALL' ? 500 : (type === 'HEAL' ? 2000 : 400)); // Snappy for FLASH/BEAM/SLASH, Long for HEAL

        const timer = setTimeout(onComplete, duration);
        return () => clearTimeout(timer);
    }, [onComplete, type, spriteConfig]);

    // SE Trigger Logic
    React.useEffect(() => {
        if (!audioSettings || !audioSettings.seEnabled) return;

        const playSE = (file: string, volume: number = 0.5, delay: number = 0) => {
            setTimeout(() => {
                const audio = new Audio(getAssetUrl(`/se/${file}`));
                audio.volume = (audioSettings.se || 0.5) * volume;
                audio.play().catch(e => console.warn("SE Play prevented", e));
            }, delay);
        };

        if (type === 'SHOT') {
            playSE('shot.mp3', 0.6);
            playSE('hibi.mp3', 0.4, 400);
        } else if (type === 'IMPACT') {
            playSE('panch1.mp3', 0.6, 100);
            playSE('panch2.mp3', 0.6, 500);
        } else if (type === 'LIGHTNING' || type === 'THUNDER') {
            playSE('thunder.mp3', 0.5);
        } else if (type === 'FIREBALL') {
            playSE('explosion.mp3', 0.5);
        } else if (type === 'FIRE') {
            playSE('fire.mp3', 0.5);
        } else if (type === 'SLASH') {
            playSE('slash.mp3', 0.5);
        } else if (type === 'ICE') {
            playSE('ice.mp3', 0.5);
        } else if (type === 'WATER') {
            playSE('water.mp3', 0.5);
        } else if (type === 'RAY') {
            playSE('ray.mp3', 0.6);
        } else if (type === 'SUMI') {
            playSE('yami.mp3', 0.6);
        } else if (type === 'HEAL') {
            playSE('heal.mp3', 0.6);
        } else if (type === 'BLUE_FIRE') {
            playSE('fire.mp3', 0.5);
        } else if (type === 'BANE') {
            playSE('yami.mp3', 0.7); // Use dark/death sound for BANE
        }
    }, [type, audioSettings]);

    if (type === 'HEAL') {
        return <HealEffectVisual x={x} y={y} onComplete={onComplete} />;
    }

    if (type === 'BANE') {
        return <BaneEffectVisual x={x} y={y} onComplete={onComplete} />;
    }

    const style: React.CSSProperties = {
        position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)',
        width: 150, height: 150, pointerEvents: 'none', zIndex: 5000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    };

    const isSpriteType = ['LIGHTNING', 'THUNDER', 'IMPACT', 'SUMI', 'SHOT', 'ICE', 'WATER', 'RAY', 'FIRE', 'SLASH', 'BLUE_FIRE'].includes(type);

    if (isSpriteType) {
        // Map Type to Image
        let bgImage = getAssetUrl('/effects/thunder.png');
        if (type === 'IMPACT') bgImage = getAssetUrl('/effects/impact.png');
        if (type === 'SUMI') bgImage = getAssetUrl('/effects/sumi.png');
        if (type === 'SHOT') bgImage = getAssetUrl('/effects/shot.png');
        if (type === 'ICE') bgImage = getAssetUrl('/effects/ice.png');
        if (type === 'WATER') bgImage = getAssetUrl('/effects/water.png');
        if (type === 'RAY') bgImage = getAssetUrl('/effects/ray.png');
        if (type === 'FIRE') bgImage = getAssetUrl('/effects/fire.png');
        if (type === 'SLASH') bgImage = getAssetUrl('/effects/slash.png');
        if (type === 'BLUE_FIRE') bgImage = getAssetUrl('/effects/blue_fire.png');

        const steps = spriteConfig.cols * spriteConfig.rows;

        return (
            <div style={{
                ...style,
                width: spriteConfig.size, height: spriteConfig.size,
                transform: `${style?.transform || ''}`
            }}>
                <div style={{
                    width: '100%', height: '100%',
                    backgroundImage: `url(${bgImage})`,
                    backgroundSize: `${spriteConfig.cols * 100}% ${spriteConfig.rows * 100}%`,
                    animation: `spriteAnimation ${(steps / spriteConfig.fps)}s steps(1) forwards`
                }} />
                <style>{`
                    @keyframes spriteAnimation {
                        ${Array.from({ length: steps }).map((_, i) => {
                    const col = i % spriteConfig.cols;
                    const row = Math.floor(i / spriteConfig.cols);
                    const xPct = col * (100 / (spriteConfig.cols - 1));
                    const yPct = row * (100 / (spriteConfig.rows - 1));
                    const timePct = (i / (steps - 1)) * 100;
                    return `${timePct}% { background-position: ${xPct}% ${yPct}%; }`;
                }).join('\n')}
                    }
                `}</style>
            </div>
        );
    }

    let imgSrc = '';
    let animation = '';

    if (type === 'FIREBALL') {
        imgSrc = getAssetUrl('/effects/fireball.png');
        animation = 'explode 0.5s ease-out forwards';
    } else if (type === 'BEAM') {
        return (
            <div style={{
                position: 'fixed', left: x, top: y,
                width: 400, height: 30,
                background: 'linear-gradient(90deg, transparent, #faf089, #fff, #faf089, transparent)',
                transform: 'translate(-50%, -50%) rotate(-45deg)',
                boxShadow: '0 0 20px #faf089',
                opacity: 0,
                animation: 'beamShoot 0.4s ease-out forwards',
                pointerEvents: 'none', zIndex: 5000
            }}>
                <style>{`
                    @keyframes beamShoot {
                        0% { width: 0; opacity: 1; transform: translate(-50%, -50%) rotate(-45deg) scaleX(0); }
                        20% { width: 400px; opacity: 1; transform: translate(-50%, -50%) rotate(-45deg) scaleX(1); }
                        100% { width: 400px; opacity: 0; transform: translate(-50%, -50%) rotate(-45deg) scaleX(1.2); }
                    }
                `}</style>
            </div>
        );
    }

    if (!imgSrc) return null;

    return (
        <div style={style}>
            <img src={imgSrc} style={{ width: '100%', height: '100%', objectFit: 'contain', animation: animation }} />
            <style>{`
                @keyframes explode { 0% { transform: scale(0.5); opacity: 0; } 20% { opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
            `}</style>
        </div>
    );
};


// --- Floating Damage Text ---
const DamageText = ({ value, x, y, color, onComplete }: { value: string | number, x: number, y: number, color?: string, onComplete: () => void }) => {
    React.useEffect(() => {
        const timer = setTimeout(onComplete, 1200);
        return () => clearTimeout(timer);
    }, [onComplete]);

    const isHealing = color === '#48bb78'; // Green = healing
    const displayColor = color || '#e53e3e';

    // Create gradient colors for text
    const gradientColors = isHealing
        ? 'linear-gradient(180deg, #68d391 0%, #38a169 50%, #276749 100%)'
        : 'linear-gradient(180deg, #fc8181 0%, #e53e3e 50%, #c53030 100%)';

    return (
        <div style={{
            position: 'absolute', left: x, top: y,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none', zIndex: 6000,
            fontSize: '4rem',
            fontWeight: '900',
            fontFamily: '"Impact", "Arial Black", sans-serif',
            letterSpacing: '-2px',
            background: gradientColors,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: `drop-shadow(0 0 8px ${displayColor}) drop-shadow(0 2px 4px rgba(0,0,0,0.8))`,
            animation: 'floatUp 1.2s ease-out forwards'
        }}>
            {value}
            <style>{`
                @keyframes floatUp {
                    0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
                    15% { transform: translate(-50%, -70%) scale(1.8); opacity: 1; }
                    30% { transform: translate(-50%, -90%) scale(1.4); opacity: 1; }
                    100% { transform: translate(-50%, -180%) scale(1); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

// --- Sparkle Particle System for Spells (CSS based) ---
const SparkleBurst = ({ x, y }: { x: number, y: number }) => {
    // Generate constant particles for this render
    const particles = React.useMemo(() => {
        return Array(16).fill(0).map((_, i) => ({
            id: i,
            angle: Math.random() * 360,
            dist: 60 + Math.random() * 120,
            size: 4 + Math.random() * 8,
            delay: Math.random() * 0.3,
            color: Math.random() > 0.5 ? '#f6e05e' : '#ffffff' // Gold and White
        }));
    }, []);

    return (
        <div style={{ position: 'absolute', left: x, top: y, pointerEvents: 'none', zIndex: 6000 }}>
            <style>{`
                @keyframes sparkleMove {
                    0% { transform: rotate(var(--angle)) translate(0, 0) scale(0); opacity: 0; }
                    20% { opacity: 1; transform: rotate(var(--angle)) translate(calc(var(--dist) * 0.2px), 0) scale(1.5); }
                    100% { transform: rotate(var(--angle)) translate(calc(var(--dist) * 1px), 0) scale(0); opacity: 0; }
                }
            `}</style>
            {particles.map(p => (
                <div key={p.id} style={({
                    position: 'absolute', left: 0, top: 0,
                    width: p.size, height: p.size,
                    background: p.color,
                    borderRadius: '50%',
                    boxShadow: `0 0 10px ${p.color}, 0 0 20px ${p.color}`,
                    '--angle': `${p.angle}deg`,
                    '--dist': p.dist,
                    animation: `sparkleMove 0.8s ease-out ${p.delay}s forwards`,
                    pointerEvents: 'none'
                } as any)}>
                </div>
            ))}
        </div>
    );
};

// --- Help Modal Component ---
const HelpModal = ({ onClose }: { onClose: () => void }) => {
    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(0,0,0,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)',
                    borderRadius: 16,
                    padding: 30,
                    maxWidth: 700,
                    maxHeight: '80vh',
                    overflowY: 'auto',
                    color: '#fff',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                    border: '1px solid #4a5568',
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ margin: 0, color: '#63b3ed' }}>ゲームヘルプ</h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#a0aec0',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* 基本ルール */}
                <section style={{ marginBottom: 25 }}>
                    <h3 style={{ color: '#f6e05e', borderBottom: '1px solid #4a5568', paddingBottom: 8 }}>基本ルール</h3>
                    <ul style={{ lineHeight: 1.8, paddingLeft: 20, color: '#e2e8f0' }}>
                        <li>相手リーダーの体力を0にすると勝利となります</li>
                        <li>毎ターン開始時にカードを1枚ドローし、PP（プレイポイント）が1増加します（最大10）</li>
                        <li>PPを消費してカードをプレイし、フォロワーを場に出したり、スペルを使用したりします</li>
                        <li>フォロワーは出したターンには攻撃できません（疾走・突進・進化・超進化を除く）</li>
                        <li>場に同時に出せるフォロワーは最大5体までです</li>
                        <li>手札は最大9枚で、10枚目以降の手札は自動的に墓地へ送られます</li>
                    </ul>
                </section>

                {/* パッシブ効果 */}
                <section style={{ marginBottom: 25 }}>
                    <h3 style={{ color: '#f6e05e', borderBottom: '1px solid #4a5568', paddingBottom: 8 }}>パッシブ効果（常時効果）</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div><span style={{ color: '#48bb78', fontWeight: 'bold' }}>[守護]</span>：守護を持つフォロワーがいる間、他のフォロワーやリーダーを攻撃できません</div>
                        <div><span style={{ color: '#ed8936', fontWeight: 'bold' }}>[疾走]</span>：場に出たターンからリーダーとフォロワーに攻撃できます</div>
                        <div><span style={{ color: '#4299e1', fontWeight: 'bold' }}>[突進]</span>：場に出たターンからフォロワーにのみ攻撃できます（リーダーは不可）</div>
                        <div><span style={{ color: '#9f7aea', fontWeight: 'bold' }}>[必殺]</span>：攻撃で相手フォロワーにダメージを与えると、そのフォロワーを破壊します</div>
                        <div><span style={{ color: '#f56565', fontWeight: 'bold' }}>[ダブル]</span>：1ターンに2回攻撃できます</div>
                        <div><span style={{ color: '#38b2ac', fontWeight: 'bold' }}>[バリア]</span>：最初に受けるダメージを1回だけ無効化します。破壊効果や手札に戻す効果は無効化できません</div>
                        <div><span style={{ color: '#718096', fontWeight: 'bold' }}>[隠密]</span>：カードの効果および攻撃対象に選択することができません（ランダム対象の効果やAoEダメージは適用されます）。隠密状態のカードが一度攻撃を行うと、選択不可の効果は解除されます。また、相手の守護を無視して攻撃することができ、この効果は隠密が解除された後も残ります</div>
                        <div><span style={{ color: '#d69e2e', fontWeight: 'bold' }}>[オーラ]</span>：相手のカードの効果で選択することができません（ランダム対象の効果やAoEダメージは適用されます）。攻撃対象に選択することは可能です</div>
                    </div>
                </section>

                {/* トリガー効果 */}
                <section style={{ marginBottom: 25 }}>
                    <h3 style={{ color: '#f6e05e', borderBottom: '1px solid #4a5568', paddingBottom: 8 }}>トリガー効果（発動条件）</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div><span style={{ color: '#63b3ed', fontWeight: 'bold' }}>ファンファーレ</span>：カードを手札からプレイした時に発動します</div>
                        <div><span style={{ color: '#f687b3', fontWeight: 'bold' }}>ラストワード</span>：フォロワーが破壊された時に発動します</div>
                        <div><span style={{ color: '#faf089', fontWeight: 'bold' }}>進化時</span>：EPを使用してフォロワーを進化させた時に発動します</div>
                        <div><span style={{ color: '#b794f4', fontWeight: 'bold' }}>超進化時</span>：SEPを使用してフォロワーを超進化させた時に発動します</div>
                        <div><span style={{ color: '#68d391', fontWeight: 'bold' }}>ターン終了時</span>：自分のターン終了時に発動します</div>
                    </div>
                </section>

                {/* 進化システム */}
                <section style={{ marginBottom: 25 }}>
                    <h3 style={{ color: '#f6e05e', borderBottom: '1px solid #4a5568', paddingBottom: 8 }}>進化システム</h3>
                    <ul style={{ lineHeight: 1.8, paddingLeft: 20, color: '#e2e8f0' }}>
                        <li><span style={{ color: '#faf089' }}>EP（進化ポイント）</span>：先攻は5ターン目から、後攻は4ターン目から使用可能です。1ターンに1回、フォロワーを進化できます（最大2回）</li>
                        <li><span style={{ color: '#b794f4' }}>SEP（超進化ポイント）</span>：先攻は7ターン目から、後攻は6ターン目から使用可能です。1ターンに1回、フォロワーを超進化できます（最大2回）</li>
                        <li>進化および超進化は、1ターンにどちらか1回までです。どちらも1ターンに1回ずつ行うということはできません</li>
                        <li>進化するとフォロワーのステータスが+2/+2され、突進と同じく即座にフォロワーに攻撃可能になります</li>
                        <li>超進化するとフォロワーのステータスが+3/+3され、突進と同じく即座にフォロワーに攻撃可能になります。また、自分のターン中は超進化したフォロワーはダメージを受けず、破壊もされません（必殺や自分で破壊する効果も無効）</li>
                    </ul>
                </section>

                {/* 後攻救済 */}
                <section>
                    <h3 style={{ color: '#f6e05e', borderBottom: '1px solid #4a5568', paddingBottom: 8 }}>後攻救済システム</h3>
                    <ul style={{ lineHeight: 1.8, paddingLeft: 20, color: '#e2e8f0' }}>
                        <li><span style={{ color: '#ed8936' }}>エクストラPP</span>：後攻プレイヤーのみ使用可能です</li>
                        <li>1〜5ターン目に1回、6ターン目以降に1回、計2回までPP +1を獲得できます</li>
                    </ul>
                </section>
            </div>
        </div>
    );
};

// --- Battle Log Component ---
interface BattleLogProps {
    logs: string[];
    onCardNameClick?: (cardName: string) => void;
    scale?: number;
}

const BattleLog = ({ logs, onCardNameClick, scale = 1 }: BattleLogProps) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        // Scroll to bottom of container without affecting parent elements
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [logs.length]); // Scroll on length change

    // カード名を検出してクリック可能にする（カード名データベースマッチング方式）
    const renderLogWithCardLinks = (log: string, _index: number) => {
        const cardNameStyle: React.CSSProperties = {
            color: '#ffd700',
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: '2px',
            fontWeight: 'bold',
        };

        const handleMouseEnter = (e: React.MouseEvent) => {
            (e.target as HTMLElement).style.color = '#ffec8b';
            (e.target as HTMLElement).style.textShadow = '0 0 8px rgba(255, 215, 0, 0.8)';
        };

        const handleMouseLeave = (e: React.MouseEvent) => {
            (e.target as HTMLElement).style.color = '#ffd700';
            (e.target as HTMLElement).style.textShadow = 'none';
        };

        const createClickableCardName = (cardName: string, key: number) => (
            <span
                key={key}
                style={cardNameStyle}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={(e) => {
                    e.stopPropagation();
                    onCardNameClick?.(cardName);
                }}
            >
                {cardName}
            </span>
        );

        // カード名データベースから全カード名を取得（長い名前優先でソート済み）
        const allCardNames = getAllCardNames();

        // カード名の境界をチェックする関数
        // 前後に単語の一部となる文字（英数字、ひらがな、カタカナ、漢字）がある場合はマッチしない
        const isWordBoundary = (char: string | undefined): boolean => {
            if (!char) return true; // 文字列の端は境界
            // 英数字
            if (/[a-zA-Z0-9]/.test(char)) return false;
            // ひらがな・カタカナ・漢字
            if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(char)) return false;
            // その他（スペース、句読点など）は境界
            return true;
        };

        // ログ内のすべてのカード名の位置を検出
        const matches: { start: number; end: number; name: string }[] = [];

        for (const cardName of allCardNames) {
            let searchStart = 0;
            while (true) {
                const idx = log.indexOf(cardName, searchStart);
                if (idx === -1) break;

                // 単語境界チェック：カード名の前後が境界であることを確認
                const charBefore = idx > 0 ? log[idx - 1] : undefined;
                const charAfter = idx + cardName.length < log.length ? log[idx + cardName.length] : undefined;
                const isValidBoundary = isWordBoundary(charBefore) && isWordBoundary(charAfter);

                // 既存のマッチと重複していないかチェック
                const overlaps = matches.some(m =>
                    (idx >= m.start && idx < m.end) ||
                    (idx + cardName.length > m.start && idx + cardName.length <= m.end) ||
                    (idx <= m.start && idx + cardName.length >= m.end)
                );

                if (isValidBoundary && !overlaps) {
                    matches.push({ start: idx, end: idx + cardName.length, name: cardName });
                }

                searchStart = idx + 1;
            }
        }

        // マッチが見つからない場合はそのまま表示
        if (matches.length === 0) {
            return <span>{log}</span>;
        }

        // 開始位置でソート
        matches.sort((a, b) => a.start - b.start);

        // パーツを組み立て
        const parts: React.ReactNode[] = [];
        let lastEnd = 0;
        let key = 0;

        for (const match of matches) {
            // マッチの前のテキスト
            if (match.start > lastEnd) {
                parts.push(<span key={key++}>{log.slice(lastEnd, match.start)}</span>);
            }
            // カード名（クリック可能）
            parts.push(createClickableCardName(match.name, key++));
            lastEnd = match.end;
        }

        // 最後のマッチの後のテキスト
        if (lastEnd < log.length) {
            parts.push(<span key={key++}>{log.slice(lastEnd)}</span>);
        }

        return <>{parts}</>;
    };

    // 画面サイズに応じた最大高さ（小さい画面では短く）
    const logMaxHeight = Math.max(150, 200 * scale);
    const logWidth = Math.max(180, 220 * scale);

    return (
        <div
            ref={containerRef}
            style={{
                position: 'absolute',
                left: 0,
                top: '45%',
                transform: 'translateY(-50%)',
                width: logWidth,
                maxHeight: logMaxHeight,
                overflowY: 'auto',
                background: 'linear-gradient(to right, rgba(0,0,0,0.8), rgba(0,0,0,0.0))',
                color: '#fff',
                fontSize: `${Math.max(0.65, 0.75 * scale)}rem`,
                padding: `${8 * scale}px ${8 * scale}px ${8 * scale}px ${12 * scale}px`,
                borderLeft: '3px solid #63b3ed',
                zIndex: 15, // Under menus, over board default
                pointerEvents: 'auto', // Allow scroll
                // Custom Scrollbar styling handled by browser usually, or simple CSS class if available
                scrollbarWidth: 'thin',
            }}
            onMouseDown={e => e.stopPropagation()} // Prevent drag triggering
            onClick={e => e.stopPropagation()} // Prevent hand collapse
        >
            <div style={{
                fontWeight: 'bold', marginBottom: 4 * scale, color: '#a0aec0',
                borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 2,
                fontSize: `${Math.max(0.55, 0.65 * scale)}rem`, textTransform: 'uppercase', letterSpacing: 1
            }}>
                BATTLE LOG
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 * scale }}>
                {logs.map((log, i) => (
                    <div key={i} style={{
                        opacity: 0.9,
                        lineHeight: '1.4',
                        textShadow: '0 1px 2px black',
                        animation: 'fadeIn 0.3s ease-out'
                    }}>
                        {renderLogWithCardLinks(log, i)}
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Evolution Animation Component ---
interface EvolutionAnimationProps {
    card: any;
    evolvedImageUrl?: string;
    startX: number;
    startY: number;
    phase: 'ZOOM_IN' | 'WHITE_FADE' | 'FLIP' | 'REVEAL' | 'ZOOM_OUT' | 'LAND';
    onPhaseChange: (phase: 'ZOOM_IN' | 'WHITE_FADE' | 'FLIP' | 'REVEAL' | 'ZOOM_OUT' | 'LAND' | 'DONE') => void;
    onShake: () => void;
    useSep?: boolean;
    playSE?: (file: string, volume?: number) => void;
    scale: number; // Add scale prop
}

const EvolutionAnimation: React.FC<EvolutionAnimationProps> = ({ card, evolvedImageUrl, startX, startY, phase, onPhaseChange, onShake, useSep, playSE, scale }) => {
    const [rotateY, setRotateY] = React.useState(0);
    const [rotateZ, setRotateZ] = React.useState(0); // Z-axis tilt for evolution enhancement
    const [chargeRotate, setChargeRotate] = React.useState(0); // Slow 0-10deg rotation during charge
    const [whiteness, setWhiteness] = React.useState(0);
    const [glowIntensity, setGlowIntensity] = React.useState(0);
    const [currentScale, setCurrentScale] = React.useState(0.25); // Start at board card size, renamed to avoid conflict with prop
    const [position, setPosition] = React.useState({ x: startX, y: startY });
    const [showParticles, setShowParticles] = React.useState(false);
    // Added dist, duration, and size to charge particles
    const [chargeParticles, setChargeParticles] = React.useState<{ id: number; angle: number; dist: number; delay: number; duration: number; size: number }[]>([]);
    const [burstParticles, setBurstParticles] = React.useState<{ id: number; angle: number; dist: number; size: number; delay: number; }[]>([]);
    const [vibrate, setVibrate] = React.useState(false);
    const burstCreatedRef = React.useRef(false); // Track if burst particles have been created

    // Ref for kirakira audio to enable fadeout during FLIP phase
    const kirakiraAudioRef = React.useRef<HTMLAudioElement | null>(null);

    // Use refs to avoid stale closures
    const onPhaseChangeRef = React.useRef(onPhaseChange);
    const onShakeRef = React.useRef(onShake);
    const playSERef = React.useRef(playSE);
    React.useEffect(() => {
        onPhaseChangeRef.current = onPhaseChange;
        onShakeRef.current = onShake;
        playSERef.current = playSE;
    }, [onPhaseChange, onShake, playSE]);

    // Card display size (original 360/480, scale controlled via prop/state)
    const cardWidth = 360 * scale;
    const cardHeight = 480 * scale;

    // Phase Timing
    React.useEffect(() => {
        console.log('[EvolutionAnimation] Phase:', phase);
        let timer: ReturnType<typeof setTimeout>;
        let intervalId: ReturnType<typeof setInterval> | null = null;

        switch (phase) {
            case 'ZOOM_IN': {
                // Start at card position, scale to match board card size initially
                setPosition({ x: startX, y: startY });
                setCurrentScale(0.25); // Match board card size (90/360)
                setRotateZ(0); // Start at 0 degrees (no tilt) - will animate to -5 during move

                // Animate Z-axis tilt during ZOOM_IN phase (0 -> -5 degrees)
                const zoomInStartTime = Date.now();
                const zoomInDuration = 650; // Match the movement duration
                const zoomInInterval = setInterval(() => {
                    const elapsed = Date.now() - zoomInStartTime;
                    const progress = Math.min(elapsed / zoomInDuration, 1);
                    const eased = 1 - Math.pow(1 - progress, 2); // Ease-out
                    setRotateZ(-5 * eased); // 0 -> -5
                    if (progress >= 1) {
                        clearInterval(zoomInInterval);
                    }
                }, 16);

                // Small delay to ensure initial position is set before animating
                timer = setTimeout(() => {
                    // Move to left-center of board area (slightly left of center)
                    const boardActualWidth = window.innerWidth - 340;
                    const boardCenterX = 340 + (boardActualWidth * 0.35); // More left of center
                    setPosition({ x: boardCenterX, y: window.innerHeight / 2 - 30 });
                    setCurrentScale(0.75); // Target 3/4 size during animation (270/360)
                }, 50);
                // Play kirakira sound when card arrives (store ref for fadeout in FLIP phase)
                const kirakiraTimer = setTimeout(() => {
                    // Create audio directly instead of using playSE to enable fadeout control
                    const audio = new Audio(getAssetUrl('/se/kirakira.mp3'));
                    audio.volume = 0.7;
                    audio.play().catch(() => { /* ignore autoplay restrictions */ });
                    kirakiraAudioRef.current = audio;
                }, 600);
                // Transition to next phase after animation completes
                const zoomTimer = setTimeout(() => {
                    onPhaseChangeRef.current('WHITE_FADE');
                }, 700);
                return () => {
                    clearTimeout(timer);
                    clearTimeout(zoomTimer);
                    clearTimeout(kirakiraTimer);
                    clearInterval(zoomInInterval);
                };
            }

            case 'WHITE_FADE':
                // Play magic charge sound during energy gathering
                playSERef.current?.('magic_charge.mp3', 0.6);

                // Create charge particles that will converge toward the card
                // 80 particles evenly distributed in 360 degrees, various distances
                const particles = Array(80).fill(0).map((_, i) => {
                    // Even distribution across 360 degrees with slight randomness
                    const baseAngle = (i / 80) * 360;
                    const angleVariation = (Math.random() - 0.5) * 10; // ±5 degrees variation
                    const angle = baseAngle + angleVariation;

                    // Distance: 200 to 800 pixels (wide range)
                    const dist = 200 + Math.random() * 600;

                    // Delay: 0 to 1.8 seconds (Cover full 1.9s duration)
                    const delay = Math.random() * 1.8;

                    // Duration: Fixed range for consistent speed
                    // We want them to reach center.
                    const normalizedDist = (dist - 200) / 600;
                    const duration = 0.5 + normalizedDist * 0.5; // 0.5s to 1.0s

                    // Size: 24 to 72 pixels
                    const size = 24 + Math.random() * 48;

                    return {
                        id: i,
                        angle,
                        dist,
                        delay,
                        duration,
                        size
                    };
                });
                setChargeParticles(particles);
                setVibrate(true);

                // Gradually increase whiteness, glow, and slow rotation (0-10deg)
                // Shortened from 2.4s to ~1.4s (1 second faster)
                let whiteProgress = 0;
                intervalId = setInterval(() => {
                    whiteProgress += 0.025; // Adjusted for ~1.9s duration
                    setWhiteness(Math.min(whiteProgress, 1));
                    setGlowIntensity(Math.min(whiteProgress * 80, 80)); // Stronger glow
                    setChargeRotate(whiteProgress * 15); // Rotate more
                    if (whiteProgress >= 1.2) { // Adjusted threshold for duration (~1.9s)
                        if (intervalId) clearInterval(intervalId);
                        setVibrate(false);
                        onPhaseChangeRef.current('FLIP');
                    }
                }, 40);
                return () => { if (intervalId) clearInterval(intervalId); };

            case 'FLIP':
                // Play syakin and KO sounds at start of flip
                playSERef.current?.('syakin.mp3', 0.8);
                playSERef.current?.('KO.mp3', 0.7);
                // Fadeout kirakira sound when flip starts
                if (kirakiraAudioRef.current) {
                    const audio = kirakiraAudioRef.current;
                    const fadeOutDuration = 300; // 300ms fadeout
                    const fadeInterval = 30;
                    const steps = fadeOutDuration / fadeInterval;
                    const volumeStep = audio.volume / steps;
                    let currentStep = 0;
                    const fadeOut = setInterval(() => {
                        currentStep++;
                        audio.volume = Math.max(0, audio.volume - volumeStep);
                        if (currentStep >= steps) {
                            clearInterval(fadeOut);
                            audio.pause();
                            kirakiraAudioRef.current = null;
                        }
                    }, fadeInterval);
                }
                // Clear charge particles
                setChargeParticles([]);

                // Phase 1: Rapid rotation from 10 to 170 degrees with scale increase
                // Phase 2: Slow rotation from 170 to 180 degrees
                const flipStartTime = Date.now();
                const rapidDuration = 400; // Fast flip to 170
                const slowDuration = 1200; // Linger longer while slowly rotating (Increased from 600ms)

                intervalId = setInterval(() => {
                    const elapsed = Date.now() - flipStartTime;

                    if (elapsed < rapidDuration) {
                        // Rapid rotation phase (10 -> 170)
                        const progress = elapsed / rapidDuration;
                        // Ease-out for snappy feel
                        const eased = 1 - Math.pow(1 - progress, 3);
                        const currentRotateY = 10 + eased * 160;

                        setRotateY(currentRotateY); // 10 to 170
                        // Scale up to 1.1x during rapid rotation (enhanced evolution animation)
                        // Scale up: 1.1x for normal evolution, 1.2x for super evolution (useSep)
                        const targetScale = useSep ? 1.2 : 1.1;
                        setCurrentScale(0.75 + eased * (targetScale - 0.75)); // Scale up from 0.75 to targetScale
                        // Z-axis tilt: Animate from -5 degrees to -3 degrees during rapid rotation
                        // Note: After Y-axis 180° rotation, positive Z values appear as left tilt
                        // So we use negative value (-3) for right tilt after rotation
                        setRotateZ(-5 + eased * 2); // -5 -> -3

                        // Fade out white light quickly as rotation starts
                        setWhiteness(Math.max(1 - progress * 3, 0));

                        // Burst at 90 degrees (approx halfway through rotation)
                        if (currentRotateY > 90 && !burstCreatedRef.current) {
                            burstCreatedRef.current = true;
                            // 120 particles bursting out in all directions
                            const burst = Array(120).fill(0).map((_, i) => {
                                const baseAngle = (i / 120) * 360;
                                const angleVariation = (Math.random() - 0.5) * 8;
                                // Size increased by 3x (Total 9x from original base)
                                const baseSize = 18 + Math.random() * 42;
                                return {
                                    id: i,
                                    angle: baseAngle + angleVariation,
                                    dist: 200 + Math.random() * 400,
                                    size: baseSize * 3,
                                    delay: Math.random() * 0.05
                                };
                            });
                            setBurstParticles(burst);
                        }

                    } else {
                        // Slow lingering phase (170 -> 180)
                        const slowProgress = Math.min((elapsed - rapidDuration) / slowDuration, 1);
                        // Ease-in-out for smooth finish
                        const slowEased = slowProgress < 0.5
                            ? 2 * slowProgress * slowProgress
                            : 1 - Math.pow(-2 * slowProgress + 2, 2) / 2;
                        setRotateY(170 + slowEased * 10); // 170 to 180
                        // No Z-axis rotation during slow phase - keep at 0
                        // (Z-axis already returned to 0 during rapid phase)

                        // Ensure whiteness is 0
                        setWhiteness(0);

                        // Safety check for burst (if frame skip caused miss)
                        if (!burstCreatedRef.current) {
                            burstCreatedRef.current = true;
                            const burst = Array(120).fill(0).map((_, i) => {
                                const baseAngle = (i / 120) * 360;
                                const angleVariation = (Math.random() - 0.5) * 8;
                                const baseSize = 18 + Math.random() * 42;
                                return {
                                    id: i,
                                    angle: baseAngle + angleVariation,
                                    dist: 200 + Math.random() * 400,
                                    size: baseSize * 3,
                                    delay: Math.random() * 0.05
                                };
                            });
                            setBurstParticles(burst);
                        }

                        if (slowProgress >= 1) {
                            if (intervalId) clearInterval(intervalId);
                            onPhaseChangeRef.current('REVEAL');
                        }
                    }
                }, 16);
                return () => { if (intervalId) clearInterval(intervalId); };

            case 'REVEAL':
                // Fade out effects quickly without changing scale or adding delay
                let revealProgress = 0;
                intervalId = setInterval(() => {
                    revealProgress += 0.25;
                    setWhiteness(Math.max(1 - revealProgress, 0));
                    setGlowIntensity(Math.max(60 - revealProgress * 60, 0));
                    // Keep scale at max (1.3)
                    if (revealProgress >= 1) {
                        if (intervalId) clearInterval(intervalId);
                        setBurstParticles([]);
                        // Transition to ZOOM_OUT immediately to remove the static pause
                        onPhaseChangeRef.current('ZOOM_OUT');
                    }
                }, 40);
                return () => { if (intervalId) clearInterval(intervalId); };

            case 'ZOOM_OUT': {
                // Gradually return to original position, size, and rotation
                setPosition({ x: startX, y: startY });

                // Animate rotation and scale back to board card state (Much faster)
                const zoomOutStart = Date.now();
                const zoomOutDuration = 250; // Quicker landing (Was 500ms)

                const startScale = currentScale; // Current scale (should be ~1)
                const startRotateZ = -3; // Current Z rotation after FLIP phase (-5 -> -3)

                intervalId = setInterval(() => {
                    const elapsed = Date.now() - zoomOutStart;
                    const progress = Math.min(elapsed / zoomOutDuration, 1);

                    // Ease-out for smooth deceleration
                    const eased = 1 - Math.pow(1 - progress, 3);

                    // Gradually reduce scale to 0.25 (board card size)
                    setCurrentScale(startScale - (startScale - 0.25) * eased);

                    // Gradually return Z rotation to 0 (3 -> 0)
                    setRotateZ(startRotateZ * (1 - eased));

                    if (progress >= 1) {
                        if (intervalId) clearInterval(intervalId);
                        // Keep rotation at 180 (flipped state)
                        setRotateY(180);
                        setChargeRotate(0); // Reset charge rotation
                        setCurrentScale(0.25); // Ensure exact board size
                        setRotateZ(0); // Ensure exact 0 degrees
                        onPhaseChangeRef.current('LAND');
                    }
                }, 16);
                return () => { if (intervalId) clearInterval(intervalId); };
            }

            case 'LAND':
                onShakeRef.current();
                setShowParticles(true);
                timer = setTimeout(() => {
                    onPhaseChangeRef.current('DONE');
                }, 600);
                return () => clearTimeout(timer);
        }

        return () => {
            if (timer) clearTimeout(timer);
            if (intervalId) clearInterval(intervalId);
            // Stop kirakira if still playing when animation is interrupted
            if (kirakiraAudioRef.current) {
                kirakiraAudioRef.current.pause();
                kirakiraAudioRef.current = null;
            }
        };
    }, [phase]); // Only depend on phase to avoid reset loops on state updates

    // Total rotation is just pure Y rotation + charge wobble
    // 3D CSS will handle the face visibility
    const totalRotateY = rotateY + chargeRotate;
    const totalRotateZ = rotateZ; // Z-axis tilt for enhanced evolution

    // Vibration offset
    const vibrateOffset = vibrate ? {
        x: (Math.random() - 0.5) * 4,
        y: (Math.random() - 0.5) * 4
    } : { x: 0, y: 0 };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.75)',
            pointerEvents: 'none'
        }}>
            {/* 1. Global style block for all particles to avoid thousands of <style> tags */}
            <style>{`
                ${chargeParticles.map(p => `
                    @keyframes chargeParticleIn-${p.id} {
                        0% { opacity: 0; transform: rotate(${p.angle}deg) translateX(${p.dist}px) scale(0.5); }
                        20% { opacity: 0.8; transform: rotate(${p.angle}deg) translateX(${p.dist * 0.8}px) scale(1.2); }
                        100% { opacity: 1; transform: rotate(${p.angle}deg) translateX(0) scale(0.2); } /* Keep visible at end */
                    }
                `).join('')}
                ${burstParticles.map(p => `
                    @keyframes burstParticleOut-${p.id} {
                        0% { opacity: 1; transform: translate(-50%, -50%) rotate(${p.angle}deg) translateX(0) scale(1.5); }
                        100% { opacity: 0; transform: translate(-50%, -50%) rotate(${p.angle}deg) translateX(${p.dist * 1.5}px) scale(0); }
                    }
                `).join('')}
            `}</style>

            {/* Charge Particles - Converging toward card */}
            {chargeParticles.map(p => (
                <div
                    key={`charge-${p.id}`}
                    style={{
                        position: 'absolute',
                        left: position.x,
                        top: position.y,
                        width: p.size,
                        height: p.size,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(200,230,255,0.6) 40%, transparent 70%)',
                        boxShadow: '0 0 10px white, 0 0 20px rgba(100,200,255,0.5)',
                        filter: 'blur(1px)',
                        animation: `chargeParticleIn-${p.id} ${p.duration}s ease-in ${p.delay}s forwards`,
                        transform: `rotate(${p.angle}deg) translateX(${p.dist}px)`,
                        opacity: 0,
                        pointerEvents: 'none'
                    }}
                />
            ))}

            {/* Energy Rings (Hula Hoop Effect) - Visible during WHITE_FADE */}
            {phase === 'WHITE_FADE' && (
                <div style={{
                    position: 'absolute',
                    left: position.x + vibrateOffset.x,
                    top: position.y + vibrateOffset.y,
                    width: 0, height: 0,
                    transformStyle: 'preserve-3d'
                }}>
                    {/* Ring 1 - Inner */}
                    <div style={{
                        position: 'absolute',
                        top: '50%', left: '50%',
                        width: 500 * scale, height: 500 * scale, // Scaled
                        border: '8px solid rgba(255, 255, 255, 0.6)', // Thicker ring
                        borderRadius: '50%',
                        transform: 'translate(-50%, -50%) rotateX(75deg)',
                        boxShadow: '0 0 30px rgba(255, 255, 255, 0.8), inset 0 0 30px rgba(255, 255, 255, 0.8)', // Stronger glow
                        animation: 'ringSpin 2s linear infinite'
                    }} />
                    {/* Ring 2 - Outer with different angle */}
                    <div style={{
                        position: 'absolute',
                        top: '50%', left: '50%',
                        width: 600 * scale, height: 600 * scale, // Scaled
                        border: '6px dashed rgba(100, 200, 255, 0.7)', // Thicker dashed ring
                        borderRadius: '50%',
                        transform: 'translate(-50%, -50%) rotateX(80deg) rotateY(10deg)',
                        boxShadow: '0 0 40px rgba(100, 200, 255, 0.5)', // Stronger glow
                        animation: 'ringSpinReverse 3s linear infinite'
                    }} />
                    <style>{`
                        @keyframes ringSpin {
                            0% { transform: translate(-50%, -50%) rotateX(75deg) rotate(0deg); opacity: 0; scale: 0.5; }
                            20% { opacity: 1; scale: 1; }
                            100% { transform: translate(-50%, -50%) rotateX(75deg) rotate(360deg); opacity: 1; scale: 1; }
                        }
                        @keyframes ringSpinReverse {
                            0% { transform: translate(-50%, -50%) rotateX(80deg) rotateY(10deg) rotate(0deg); opacity: 0; scale: 0.6; }
                            20% { opacity: 0.8; scale: 1; }
                            100% { transform: translate(-50%, -50%) rotateX(80deg) rotateY(10deg) rotate(-360deg); opacity: 0.8; scale: 1; }
                        }
                    `}</style>
                </div>
            )}

            {/* Burst Particles - Exploding outward on evolve */}
            {burstParticles.map(p => (
                <div
                    key={`burst-${p.id}`}
                    style={{
                        position: 'absolute',
                        left: position.x,
                        top: position.y,
                        width: p.size * scale, // Scaled
                        height: p.size * scale, // Scaled
                        borderRadius: '50%',
                        background: useSep
                            ? `radial-gradient(circle, rgba(183, 148, 244, 1) 0%, rgba(159, 122, 234, 0.8) 50%, transparent 100%)`
                            : `radial-gradient(circle, rgba(255, 251, 235, 1) 0%, rgba(251, 211, 141, 0.8) 50%, transparent 100%)`,
                        boxShadow: useSep
                            ? '0 0 10px #b794f4, 0 0 20px rgba(159,122,234,0.6)'
                            : '0 0 10px #fbd38d, 0 0 20px rgba(251,211,141,0.6)',
                        animation: `burstParticleOut-${p.id} 0.4s ease-out ${p.delay}s forwards`,
                        pointerEvents: 'none'
                    }}
                />
            ))}

            {/* Card Container */}
            <div style={{
                position: 'absolute',
                left: position.x + vibrateOffset.x,
                top: position.y + vibrateOffset.y,
                transform: `translate(-50%, -50%) scale(${currentScale}) perspective(1200px) rotateY(${totalRotateY}deg) rotateZ(${totalRotateZ}deg)`, // Use currentScale + Z-axis tilt
                transition: (phase === 'ZOOM_IN' || phase === 'ZOOM_OUT')
                    ? 'left 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    : 'none',
                transformStyle: 'preserve-3d'
            }}>
                {/* Consolidated Background Glow - Optimized */}
                <div style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: cardWidth * 1.3,
                    height: cardHeight * 1.2,
                    background: useSep
                        ? `radial-gradient(ellipse, rgba(159, 122, 234, 0.4) 0%, transparent 70%)`
                        : `radial-gradient(ellipse, rgba(251, 211, 141, 0.4) 0%, transparent 70%)`,
                    filter: 'blur(20px)',
                    pointerEvents: 'none',
                    opacity: glowIntensity > 1 ? 1 : 0,
                    transition: 'opacity 0.4s'
                }} />

                {/* Card */}
                <div style={{
                    width: cardWidth,
                    height: cardHeight,
                    borderRadius: 16,
                    overflow: 'hidden',
                    boxShadow: useSep
                        ? `0 0 40px rgba(159, 122, 234, 0.7)`
                        : `0 0 40px rgba(251, 211, 141, 0.7)`,
                    position: 'relative',
                    transformStyle: 'preserve-3d' // Required for backface-visibility to work
                }}>
                    {/* --- FRONT FACE (Original) --- */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        // backfaceVisibility removed - controlled by opacity
                        borderRadius: 16, overflow: 'hidden',
                        background: '#1a202c', // Fallback bg
                        zIndex: totalRotateY <= 90 ? 2 : 1, // Explicit stacking order
                        opacity: totalRotateY <= 90 ? 1 : 0, // Explicit visibility toggle
                    }}>
                        <img
                            src={getAssetUrl(card.imageUrl || '')}
                            alt={card.name}
                            style={{
                                width: '100%', height: '100%', objectFit: 'cover',
                                filter: `brightness(${1 + whiteness * 0.5}) contrast(${1 - whiteness * 0.2})`
                            }}
                        />
                        {/* White Overlay Front */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'white',
                            opacity: whiteness,
                            pointerEvents: 'none'
                        }} />
                    </div>

                    {/* --- BACK FACE (Evolved) --- */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        // backfaceVisibility removed
                        transform: 'rotateY(180deg)',
                        borderRadius: 16, overflow: 'hidden',
                        background: '#1a202c',
                        zIndex: totalRotateY > 90 ? 2 : 1, // Explicit stacking order
                        opacity: totalRotateY > 90 ? 1 : 0, // Explicit visibility toggle
                    }}>
                        <img
                            src={getAssetUrl((evolvedImageUrl && evolvedImageUrl !== '') ? evolvedImageUrl : (card.imageUrl || ''))}
                            alt={`${card.name} Evolved`}
                            style={{
                                width: '100%', height: '100%', objectFit: 'cover',
                                filter: `brightness(${1 + whiteness * 0.5}) contrast(${1 - whiteness * 0.2})`
                            }}
                        />
                        {/* White Overlay Back */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'white',
                            opacity: whiteness,
                            pointerEvents: 'none'
                        }} />
                    </div>
                </div>
            </div>

            {/* Landing Particles */}
            {showParticles && (
                <div style={{
                    position: 'absolute',
                    left: startX,
                    top: startY,
                    pointerEvents: 'none'
                }}>
                    <style>{`
                        @keyframes landParticleMove {
                            0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                            100% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--angle)) translateX(calc(var(--dist) * 1px)) scale(0); }
                        }
                    `}</style>
                    {Array(20).fill(0).map((_, i) => {
                        const angle = (i / 20) * 360;
                        const dist = 40 + Math.random() * 100;
                        return (
                            <div key={`land-${i}`} style={({
                                position: 'absolute', left: 0, top: 0,
                                width: 8 * scale, height: 8 * scale, borderRadius: '50%', // Scaled
                                background: 'white',
                                '--angle': `${angle}deg`,
                                '--dist': dist,
                                animation: `landParticleMove 0.5s ease-out forwards`
                            } as any)} />
                        );
                    })}
                </div>
            )}
        </div>
    );
};




// Result images for each class
const yorukaWinImg = getAssetUrl('/leaders/yoRuka_win.png');
const yorukaLoseImg = getAssetUrl('/leaders/yoRuka_lose.png');
const senkaWinImg = getAssetUrl('/leaders/senka_win.png');
const senkaLoseImg = getAssetUrl('/leaders/senka_lose.png');
const azyaWinImg = getAssetUrl('/leaders/azya_win.png');
const azyaLoseImg = getAssetUrl('/leaders/azya_lose.png');

// Battle statistics interface
interface BattleStats {
    turnCount: number;
    damageDealtToOpponent: number;
    damageReceivedFromOpponent: number;
    followersDestroyed: number;
    myFollowersDestroyed: number;
}

// Simple internal component for Game Over
interface GameOverScreenProps {
    winnerId: string;
    playerId: string;
    playerClass: ClassType;
    onRematch: (deckType: ClassType) => void;
    onLeave: () => void;
    isOnline: boolean;
    myRematchRequested: boolean;
    opponentRematchRequested: boolean;
    battleStats: BattleStats;
    selectedCardInfo: CardModel | null;
    onCardInfoClick: (card: CardModel | null) => void;
}

const GameOverScreen = ({ winnerId, playerId, playerClass, onRematch, onLeave, isOnline, myRematchRequested, opponentRematchRequested, battleStats, selectedCardInfo, onCardInfoClick }: GameOverScreenProps) => {
    const isVictory = winnerId === playerId;

    // Get result image based on player class and victory status
    const getResultImage = () => {
        if (playerClass === 'SENKA') {
            return isVictory ? senkaWinImg : senkaLoseImg;
        } else if (playerClass === 'AJA') {
            return isVictory ? azyaWinImg : azyaLoseImg;
        } else {
            // YORUKA
            return isVictory ? yorukaWinImg : yorukaLoseImg;
        }
    };
    const [timeLeft, setTimeLeft] = React.useState(15);
    const [showDeckSelect, setShowDeckSelect] = React.useState(false);
    const [selectedDeck, setSelectedDeck] = React.useState<ClassType | null>(null);

    // For online: stop countdown when either player requests rematch or deck selection is shown
    const shouldStopCountdown = isOnline ? (myRematchRequested || opponentRematchRequested) : (myRematchRequested || showDeckSelect);

    React.useEffect(() => {
        if (shouldStopCountdown) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onLeave();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [onLeave, shouldStopCountdown]);

    // Handle deck selection and start rematch
    const handleDeckSelect = (deckType: ClassType) => {
        setSelectedDeck(deckType);
        onRematch(deckType);
    };

    // Get rematch button text based on state
    const getRematchButtonText = () => {
        if (!isOnline) {
            return myRematchRequested ? '再戦中...' : '再戦';
        }
        if (myRematchRequested && opponentRematchRequested) {
            return '再戦開始...';
        }
        if (myRematchRequested) {
            return '相手を待機中...';
        }
        if (opponentRematchRequested) {
            return '相手が再戦希望！';
        }
        return '再戦';
    };

    const getRematchButtonStyle = () => {
        const base = {
            padding: '15px 40px', fontSize: '1.5rem', fontWeight: 'bold' as const,
            border: 'none', borderRadius: 12,
            cursor: myRematchRequested ? 'default' : 'pointer',
            transform: 'scale(1)', transition: 'transform 0.1s, background 0.2s'
        };

        if (opponentRematchRequested && !myRematchRequested) {
            // Opponent wants rematch - highlight the button
            return {
                ...base,
                background: 'linear-gradient(135deg, #f6e05e, #d69e2e)',
                color: 'black',
                boxShadow: '0 4px 15px rgba(246, 224, 94, 0.6)',
                animation: 'pulse 1s infinite'
            };
        }
        if (myRematchRequested) {
            return {
                ...base,
                background: 'linear-gradient(135deg, #718096, #4a5568)',
                color: 'white',
                boxShadow: 'none'
            };
        }
        return {
            ...base,
            background: 'linear-gradient(135deg, #48bb78, #38a169)',
            color: 'white',
            boxShadow: '0 4px 15px rgba(72, 187, 120, 0.4)'
        };
    };

    // Deck selection button style - larger size (220px)
    const getDeckButtonStyle = (deckType: ClassType, isHovered: boolean) => ({
        width: 220,
        height: 220,
        borderRadius: '50%',
        border: selectedDeck === deckType ? '5px solid #f6e05e' : '4px solid rgba(255,255,255,0.4)',
        background: `url(${getLeaderImg(deckType)}) center/cover`,
        cursor: 'pointer',
        transform: isHovered ? 'scale(1.1)' : 'scale(1)',
        transition: 'all 0.2s ease',
        boxShadow: isHovered ? '0 0 30px rgba(246, 224, 94, 0.7)' : '0 6px 15px rgba(0,0,0,0.5)'
    });

    return (
        <div style={{
            position: 'absolute', inset: 0, zIndex: 5000,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
            display: 'flex', flexDirection: 'row', alignItems: 'stretch',
            animation: 'fadeIn 0.5s ease-out'
        }} onClick={() => { /* background click */ }}>
            <style>{`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
            `}</style>

            {/* Left Column: Card Info / Future character images (せんか/あじゃ) */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 40,
                borderRight: '1px solid rgba(255,255,255,0.1)'
            }}>
                {selectedCardInfo ? (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 16,
                        maxWidth: 320
                    }}>
                        {/* Card image - no hover zoom */}
                        <div style={{
                            width: 200,
                            height: 280,
                            backgroundImage: `url(${getAssetUrl(`/cards/${selectedCardInfo.id}.png`)})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            borderRadius: 12,
                            boxShadow: '0 8px 30px rgba(0,0,0,0.6)'
                        }} />
                        {/* Card name */}
                        <div style={{
                            fontFamily: 'var(--font-tamanegi)',
                            fontSize: '1.6rem',
                            color: 'white',
                            textShadow: '0 2px 6px rgba(0,0,0,0.6)',
                            textAlign: 'center'
                        }}>
                            {selectedCardInfo.name}
                        </div>
                        {/* Card stats */}
                        <div style={{
                            display: 'flex',
                            gap: 20,
                            fontSize: '1.2rem',
                            color: 'rgba(255,255,255,0.9)'
                        }}>
                            <span>コスト: {selectedCardInfo.cost}</span>
                            {selectedCardInfo.type === 'FOLLOWER' && (
                                <>
                                    <span>攻撃力: {selectedCardInfo.attack}</span>
                                    <span>体力: {selectedCardInfo.health}</span>
                                </>
                            )}
                        </div>
                        {/* Card description */}
                        <div style={{
                            fontSize: '1rem',
                            color: 'rgba(255,255,255,0.7)',
                            textAlign: 'center',
                            lineHeight: 1.5,
                            maxHeight: 120,
                            overflow: 'auto'
                        }}>
                            {selectedCardInfo.description || 'テキストなし'}
                        </div>
                        {/* Close button */}
                        <button
                            onClick={() => onCardInfoClick(null)}
                            style={{
                                padding: '8px 24px',
                                fontSize: '1rem',
                                background: 'transparent',
                                border: '1px solid rgba(255,255,255,0.3)',
                                color: 'white',
                                borderRadius: 8,
                                cursor: 'pointer',
                                marginTop: 10
                            }}
                        >
                            閉じる
                        </button>
                    </div>
                ) : (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        backgroundImage: `url(${getResultImage()})`,
                        backgroundSize: 'contain',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        opacity: 0.9
                    }} />
                )}
            </div>

            {/* Right Column: Main Content + yoRuka */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 40,
                position: 'relative'
            }}>
                {/* Result Text with Tamanegi font */}
                <div style={{
                    fontFamily: 'var(--font-tamanegi)',
                    fontSize: '5rem',
                    color: isVictory ? '#f6e05e' : '#a0aec0',
                    textShadow: isVictory
                        ? '0 0 40px rgba(246, 224, 94, 0.7), 4px 4px 8px rgba(0,0,0,0.6)'
                        : '0 0 20px rgba(160, 174, 192, 0.5), 4px 4px 8px rgba(0,0,0,0.6)',
                    marginBottom: 20,
                    animation: 'float 3s ease-in-out infinite'
                }}>
                    {isVictory ? '勝利' : '敗北'}
                </div>

                {/* Battle Statistics */}
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: 16,
                    marginBottom: 30,
                    padding: '16px 24px',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div style={{ textAlign: 'center', minWidth: 80 }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f6e05e' }}>
                            {battleStats.turnCount}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>ターン</div>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 80 }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#48bb78' }}>
                            {battleStats.damageDealtToOpponent}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>与ダメージ</div>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 80 }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#e53e3e' }}>
                            {battleStats.damageReceivedFromOpponent}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>被ダメージ</div>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 80 }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#63b3ed' }}>
                            {battleStats.followersDestroyed}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>撃破数</div>
                    </div>
                </div>

                {/* yoRuka message - positioned above the yoRuka image */}
                <div style={{
                    position: 'absolute',
                    right: 20,
                    bottom: 270,
                    width: 180,
                    textAlign: 'center',
                    fontFamily: 'var(--font-tamanegi)',
                    fontSize: '1.4rem',
                    color: isVictory ? '#f6e05e' : '#e53e3e',
                    textShadow: isVictory
                        ? '0 0 20px rgba(246, 224, 94, 0.8), 2px 2px 4px rgba(0,0,0,0.8)'
                        : '0 0 20px rgba(229, 62, 62, 0.8), 2px 2px 4px rgba(0,0,0,0.8)',
                    zIndex: 10
                }}>
                    {isVictory ? 'あなたの勝ち！' : 'お前の負け！'}
                </div>

                {/* Deck Selection UI */}
                {showDeckSelect && !myRematchRequested ? (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        animation: 'fadeIn 0.3s ease-out'
                    }}>
                        <div style={{
                            fontFamily: 'var(--font-tamanegi)',
                            fontSize: '1.6rem', color: 'white',
                            marginBottom: 24, textShadow: '0 2px 6px rgba(0,0,0,0.6)'
                        }}>
                            デッキを選択してください
                        </div>
                        <div style={{ display: 'flex', gap: 40, marginBottom: 24 }}>
                            {/* せんかデッキ */}
                            <DeckSelectButton
                                deckType="SENKA"
                                label="せんか"
                                onSelect={handleDeckSelect}
                                getStyle={getDeckButtonStyle}
                            />
                            {/* あじゃデッキ */}
                            <DeckSelectButton
                                deckType="AJA"
                                label="あじゃ"
                                onSelect={handleDeckSelect}
                                getStyle={getDeckButtonStyle}
                            />
                        </div>
                        <button
                            onClick={() => setShowDeckSelect(false)}
                            style={{
                                padding: '10px 36px', fontSize: '1.1rem', fontWeight: 'bold',
                                background: 'transparent', border: '2px solid rgba(255,255,255,0.3)',
                                color: 'white', borderRadius: 10,
                                cursor: 'pointer', marginTop: 8
                            }}
                        >
                            キャンセル
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: 20 }}>
                        <button
                            onClick={() => {
                                if (!myRematchRequested) {
                                    setShowDeckSelect(true);
                                }
                            }}
                            disabled={myRematchRequested}
                            style={getRematchButtonStyle()}
                            onMouseDown={e => { if (!myRematchRequested) e.currentTarget.style.transform = 'scale(0.95)'; }}
                            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            {getRematchButtonText()}
                        </button>
                        <button
                            onClick={onLeave}
                            style={{
                                padding: '15px 40px', fontSize: '1.5rem', fontWeight: 'bold',
                                background: 'transparent', border: '2px solid rgba(255,255,255,0.3)',
                                color: 'white', borderRadius: 12,
                                cursor: 'pointer'
                            }}
                        >
                            タイトルへ {!shouldStopCountdown && `(${timeLeft})`}
                        </button>
                    </div>
                )}

                {/* yoRuka Image - Hidden element at right side, no border/hover effects */}
                <div
                    onClick={() => {
                        if (showDeckSelect && !myRematchRequested) {
                            handleDeckSelect('YORUKA');
                        }
                    }}
                    style={{
                        position: 'absolute',
                        right: 20,
                        bottom: 20,
                        width: 180,
                        height: 240,
                        backgroundImage: `url(${isVictory ? yorukaWinImg : yorukaLoseImg})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        borderRadius: 12,
                        cursor: showDeckSelect && !myRematchRequested ? 'pointer' : 'default',
                        opacity: 0.7,
                        transition: 'opacity 0.3s ease',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.4)'
                    }}
                />
            </div>
        </div>
    );
};

// Deck selection button component
interface DeckSelectButtonProps {
    deckType: ClassType;
    label: string;
    onSelect: (deckType: ClassType) => void;
    getStyle: (deckType: ClassType, isHovered: boolean) => React.CSSProperties;
}

const DeckSelectButton = ({ deckType, label, onSelect, getStyle }: DeckSelectButtonProps) => {
    const [isHovered, setIsHovered] = React.useState(false);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <button
                onClick={() => onSelect(deckType)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={getStyle(deckType, isHovered)}
            />
            <span style={{
                color: 'white',
                fontFamily: 'var(--font-tamanegi)',
                fontSize: '1.4rem',
                textShadow: '0 2px 6px rgba(0,0,0,0.6)'
            }}>
                {label}
            </span>
        </div>
    );
};

// --- Custom Hook for Visual Board ---
// NOTE: Deep copy passiveAbilities to ensure React detects changes correctly
// This fixes the issue where effects (AURA, BARRIER) don't display during rapid updates
const useVisualBoard = (realBoard: (CardModel | any | null)[]) => {
    const [visualBoard, setVisualBoard] = React.useState<(any & { isDying?: boolean })[]>([]);
    // Track previous real board to detect removals
    React.useEffect(() => {
        setVisualBoard(prev => {
            const next: (any & { isDying?: boolean })[] = [];
            const realMap = new Map((realBoard || []).filter(c => c).map(c => [(c as any).instanceId, c]));

            // 1. Process existing visual cards (Keep order, update stats, mark dying)
            prev.forEach(v => {
                if (!v) return;
                const real = realMap.get((v as any).instanceId);
                if (real) {
                    // Deep copy passiveAbilities to ensure React detects changes
                    next.push({
                        ...real,
                        passiveAbilities: real.passiveAbilities ? [...real.passiveAbilities] : [],
                        isDying: false
                    });
                    realMap.delete((v as any).instanceId);
                } else {
                    // Removed from real board -> Mark Dying
                    // Preserve killedByBane flag for BANE death effect
                    next.push({ ...v, isDying: true, killedByBane: (v as any).killedByBane });
                }
            });

            // 2. Add new cards (Appended)
            realMap.forEach(real => {
                // Deep copy passiveAbilities for new cards too
                next.push({
                    ...real,
                    passiveAbilities: real.passiveAbilities ? [...real.passiveAbilities] : [],
                    isDying: false
                });
            });

            return next;
        });
    }, [realBoard]);

    // Cleanup timer
    React.useEffect(() => {
        const hasDying = visualBoard.some(c => c.isDying);
        if (hasDying) {
            const timer = setTimeout(() => {
                setVisualBoard(prev => prev.filter(c => !c.isDying));
            }, 700); // 0.7s delay (shortened from 1.2s)
            return () => clearTimeout(timer);
        }
    }, [visualBoard]);

    return visualBoard;
};

export const GameScreen: React.FC<GameScreenProps> = ({ playerClass, opponentType, gameMode, targetRoomId, onLeave, networkAdapter, networkConnected, opponentClass: propOpponentClass, aiDifficulty = 'NORMAL' }) => {
    // For online play, use the adapter passed from LobbyScreen
    // Only use useGameNetwork hook for CPU mode (where it returns nothing)
    // If networkAdapter is provided (HOST/JOIN from LobbyScreen), skip creating a new one
    const shouldUseHook = gameMode === 'CPU' || !networkAdapter;
    const hookResult = useGameNetwork(shouldUseHook ? (gameMode === 'CPU' ? 'CPU' : gameMode) : 'CPU', shouldUseHook ? targetRoomId : undefined);
    const adapter = networkAdapter || hookResult.adapter;
    const connected = networkConnected !== undefined ? networkConnected : hookResult.connected;

    // 4K/Multi-resolution scaling - now returns uniform scale
    const scaleInfo = useScaleFactor();
    const { scale, toGameX, toGameY } = scaleInfo;

    // Helper to convert screen coordinates to game container coordinates
    // Since we now use independent X/Y scaling that fills the entire screen,
    // screen coords can be directly converted using the scale factors
    const screenToGameCoords = useCallback((screenX: number, screenY: number): { x: number, y: number } => {
        return { x: toGameX(screenX), y: toGameY(screenY) };
    }, [toGameX, toGameY]);

    const [selectedHandIndex, setSelectedHandIndex] = useState<number | null>(null); // New: Click selection for hand

    // Ref to store scaleInfo for use in event listeners
    const scaleInfoRef = React.useRef(scaleInfo);
    useEffect(() => {
        scaleInfoRef.current = scaleInfo;
    }, [scaleInfo]);

    // === ONLINE PLAY: Player ID assignment ===
    // HOST is always p1 (goes first in standard rules)
    // JOIN is always p2
    const isHost = gameMode === 'HOST' || gameMode === 'CPU';
    const currentPlayerId = isHost ? 'p1' : 'p2';
    const opponentPlayerId = isHost ? 'p2' : 'p1';

    // CPU対戦時は相手クラスを決定
    // For online play, use propOpponentClass if provided
    // プレイヤーがYORUKAの場合、CPUはSENKAかAJAをランダム選択
    const opponentClass: ClassType = propOpponentClass || (() => {
        if (playerClass === 'YORUKA') {
            return Math.random() < 0.5 ? 'SENKA' : 'AJA';
        }
        return playerClass === 'SENKA' ? 'AJA' : 'SENKA';
    })();

    // Game state initialization
    // HOST initializes the game, JOIN waits for INIT_GAME message
    const [gameState, dispatch] = useReducer(gameReducer, null, () => {
        if (gameMode === 'JOIN') {
            // JOIN: Create empty placeholder state, will be replaced by SYNC_STATE
            return initializeGame('ENEMY', opponentClass, 'You', playerClass);
        }
        // HOST or CPU: Initialize normally (HOST is p1)
        return initializeGame('You', playerClass, opponentType === 'ONLINE' ? 'ENEMY' : 'CPU', opponentClass);
    });

    // Track if game has been synced (for JOIN)
    const [gameSynced, setGameSynced] = useState(gameMode !== 'JOIN');

    // Coin toss and game start animation states - declared early for use in INIT_GAME effect
    const [coinTossPhase, setCoinTossPhase] = React.useState<'IDLE' | 'TOSSING' | 'RESULT' | 'DONE'>('IDLE');
    const [coinTossResult, setCoinTossResult] = React.useState<'FIRST' | 'SECOND' | null>(null);
    const [isGameStartAnim, setIsGameStartAnim] = React.useState(false);

    // Rematch states for online play
    const [myRematchRequested, setMyRematchRequested] = React.useState(false);
    const [opponentRematchRequested, setOpponentRematchRequested] = React.useState(false);

    // Current player class (can be changed on rematch)
    const [currentPlayerClass, setCurrentPlayerClass] = React.useState<ClassType>(playerClass);

    // Battle statistics tracking
    const [battleStats, setBattleStats] = React.useState<BattleStats>({
        turnCount: 0,
        damageDealtToOpponent: 0,
        damageReceivedFromOpponent: 0,
        followersDestroyed: 0,
        myFollowersDestroyed: 0
    });

    // Card info display for result screen (when clicking card names in log)
    const [resultCardInfo, setResultCardInfo] = React.useState<CardModel | null>(null);

    // Necromance effect state - shows -X on graveyard when necromance is activated
    interface NecromanceEffect {
        playerId: string;
        amount: number;
        key: number;
    }
    const [necromanceEffects, setNecromanceEffects] = React.useState<NecromanceEffect[]>([]);
    const necromanceKeyRef = React.useRef(0);

    // ===== スタンプ機能 =====
    // スタンプ選択UI表示中か
    const [isStampSelectorOpen, setIsStampSelectorOpen] = React.useState(false);
    // ホバー中のスタンプID
    const [hoveredStampId, setHoveredStampId] = React.useState<StampId | null>(null);
    // 表示中のスタンプ
    const [displayedStamp, setDisplayedStamp] = React.useState<StampDisplay | null>(null);
    // スタンプドラッグの起点座標
    const stampDragStartRef = React.useRef<{ x: number, y: number } | null>(null);
    // スタンプ表示タイマーのref（連続送信/受信時のクリーンアップ用）
    const stampDisplayTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // 進化ドラッグ中のオーラSE管理
    const evolveAuraAudioRef = React.useRef<HTMLAudioElement | null>(null);

    // Track previous logs to detect necromance activation
    const prevLogsLengthRef = React.useRef(gameState.logs.length);

    // HOST: Send initial game state when connected AND coin toss is complete
    const initialStateSentRef = useRef(false);
    useEffect(() => {
        if (gameMode === 'HOST' && connected && adapter && !initialStateSentRef.current && coinTossPhase === 'DONE') {
            console.log('[GameScreen] HOST: Sending initial game state to JOIN after coin toss');
            // Small delay to ensure JOIN's message handler is ready
            setTimeout(() => {
                adapter.send({ type: 'INIT_GAME', payload: gameState });
                initialStateSentRef.current = true;
            }, 500);
        }
    }, [gameMode, connected, adapter, gameState, coinTossPhase]);

    const player = gameState.players[currentPlayerId];
    const opponent = gameState.players[opponentPlayerId];

    // Detect necromance activation from logs and trigger visual effect
    useEffect(() => {
        const currentLength = gameState.logs.length;
        if (currentLength > prevLogsLengthRef.current) {
            // Check new logs for necromance pattern: "XXX はネクロマンス Y を発動！"
            for (let i = prevLogsLengthRef.current; i < currentLength; i++) {
                const log = gameState.logs[i];
                const necroMatch = log.match(/(.+?) はネクロマンス (\d+) を発動/);
                if (necroMatch) {
                    const playerName = necroMatch[1];
                    const amount = parseInt(necroMatch[2], 10);
                    // Determine which player triggered necromance
                    const triggerPlayerId = player?.name === playerName ? currentPlayerId : opponentPlayerId;

                    // Add necromance effect
                    const effectKey = necromanceKeyRef.current++;
                    setNecromanceEffects(prev => [...prev, {
                        playerId: triggerPlayerId,
                        amount,
                        key: effectKey
                    }]);

                    // Remove effect after animation
                    setTimeout(() => {
                        setNecromanceEffects(prev => prev.filter(e => e.key !== effectKey));
                    }, 1500);
                }
            }
        }
        prevLogsLengthRef.current = currentLength;
    }, [gameState.logs.length, currentPlayerId, opponentPlayerId, player?.name]);

    const visualPlayerBoard = useVisualBoard(gameState.players[currentPlayerId]?.board || []);
    const visualOpponentBoard = useVisualBoard(gameState.players[opponentPlayerId]?.board || []);

    // --- Visual Board Refs (declared early for use in playEffect) ---
    const visualPlayerBoardRef = React.useRef(visualPlayerBoard);
    const visualOpponentBoardRef = React.useRef(visualOpponentBoard);

    // Effect Processing State
    const [isProcessingEffect, setIsProcessingEffect] = React.useState(false);
    const isProcessingEffectRef = React.useRef(false); // Ref for stable access in async functions
    const [turnNotification, setTurnNotification] = React.useState<string | null>(null);
    const [notifiedTurn, setNotifiedTurn] = React.useState<number>(-1); // Track notified turn
    const processingHandledRef = React.useRef<any>(null);

    // Generic Card Animation (e.g. Draw, Generate) - Array for multiple simultaneous cards
    const [animatingCards, setAnimatingCards] = React.useState<{
        card: CardModel;
        status: 'APPEAR' | 'FLY';
        targetX?: number;
        targetY?: number;
        xOffset: number; // X offset for simultaneous display
    }[]>([]);

    // Interaction State
    const [dragState, setDragState] = React.useState<{
        sourceType: 'HAND' | 'BOARD' | 'EVOLVE';
        sourceIndex: number;
        sourceInstanceId?: string; // Add instanceId
        startX: number;
        startY: number;
        currentX: number;
        currentY: number;
        offsetX: number;
        offsetY: number;
        useSep?: boolean; // SEP (Super Evolve Point) flag
    } | null>(null);

    const [hoveredTarget, setHoveredTarget] = React.useState<{
        type: 'LEADER' | 'FOLLOWER';
        index?: number;
        playerId: string;
        instanceId?: string; // Card instance ID for accurate board lookup
    } | null>(null);

    // ドラッグ線先端のパーティクル
    interface DragParticle {
        id: number;
        x: number;
        y: number;
        vx: number;
        vy: number;
        opacity: number;
        radius: number; // 生成時に決定（render内でMath.random()を避ける）
        createdAt: number;
    }
    const [dragParticles, setDragParticles] = React.useState<DragParticle[]>([]);
    const dragParticleIdRef = React.useRef(0);
    const dragParticleAngleRef = React.useRef(0); // 360度均等に散らばらせるための角度追跡

    // ドラッグ中にパーティクルを生成
    // dragStateを直接参照し、座標はuseRef経由で取得
    const dragStateForParticleRef = React.useRef(dragState);
    dragStateForParticleRef.current = dragState; // 常に最新のdragStateを保持

    React.useEffect(() => {
        const sourceType = dragState?.sourceType;
        if (!sourceType || (sourceType !== 'BOARD' && sourceType !== 'EVOLVE')) {
            setDragParticles([]);
            return;
        }

        const PARTICLE_LIFETIME = 400; // 0.4秒で消える
        const interval = setInterval(() => {
            // Refから最新のdragStateを取得
            const currentDrag = dragStateForParticleRef.current;
            if (!currentDrag || (currentDrag.sourceType !== 'BOARD' && currentDrag.sourceType !== 'EVOLVE')) return;

            const now = Date.now();
            // 1個だけ生成（軽量化）、角度は前回から約137度（黄金角）ずらして均等に散らばらせる
            const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // 約137.5度
            dragParticleAngleRef.current += goldenAngle + (Math.random() - 0.5) * 0.3; // 少しランダム性を加える
            const angle = dragParticleAngleRef.current;
            const speed = 4 + Math.random() * 3; // 速度2倍（外へ飛び散る感じ）

            const newParticle: DragParticle = {
                id: dragParticleIdRef.current++,
                x: currentDrag.currentX,
                y: currentDrag.currentY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                opacity: 1,
                radius: 3 + Math.random() * 2, // 生成時にサイズ決定（3-5px）
                createdAt: now
            };

            setDragParticles(prev => {
                // 古いパーティクルを除外し、位置とopacity更新
                const updated = prev
                    .filter(p => now - p.createdAt < PARTICLE_LIFETIME)
                    .map(p => ({
                        ...p,
                        x: p.x + p.vx,
                        y: p.y + p.vy,
                        opacity: Math.max(0, 1 - (now - p.createdAt) / PARTICLE_LIFETIME)
                    }));
                return [...updated, newParticle];
            });
        }, 80); // 間隔を長く（50ms→80ms）

        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dragState?.sourceType]);

    // 進化ドラッグ中のオーラSE再生/停止
    React.useEffect(() => {
        const isEvolveDrag = dragState?.sourceType === 'EVOLVE';

        if (isEvolveDrag && !evolveAuraAudioRef.current) {
            // 進化ドラッグ開始 - フェードインで再生
            const audio = new Audio(getAssetUrl('/se/aura.mp3'));
            audio.loop = true;
            audio.volume = 0;
            audio.play().catch(() => { /* ignore autoplay restrictions */ });
            evolveAuraAudioRef.current = audio;

            // フェードイン（0→0.25, 300ms）音量を半分に
            const fadeInDuration = 300;
            const fadeInInterval = 30;
            const fadeInSteps = fadeInDuration / fadeInInterval;
            const volumeStep = 0.25 / fadeInSteps;
            let currentStep = 0;
            const fadeIn = setInterval(() => {
                currentStep++;
                if (evolveAuraAudioRef.current) {
                    evolveAuraAudioRef.current.volume = Math.min(currentStep * volumeStep, 0.25);
                }
                if (currentStep >= fadeInSteps) {
                    clearInterval(fadeIn);
                }
            }, fadeInInterval);
        } else if (!isEvolveDrag && evolveAuraAudioRef.current) {
            // 進化ドラッグ終了 - フェードアウトで停止
            const audio = evolveAuraAudioRef.current;
            const fadeOutDuration = 200;
            const fadeOutInterval = 20;
            const fadeOutSteps = fadeOutDuration / fadeOutInterval;
            const volumeStep = audio.volume / fadeOutSteps;
            let currentStep = 0;
            const fadeOut = setInterval(() => {
                currentStep++;
                audio.volume = Math.max(0, audio.volume - volumeStep);
                if (currentStep >= fadeOutSteps) {
                    clearInterval(fadeOut);
                    audio.pause();
                    audio.currentTime = 0;
                }
            }, fadeOutInterval);
            evolveAuraAudioRef.current = null;
        }

        // クリーンアップ
        return () => {
            if (!dragState && evolveAuraAudioRef.current) {
                evolveAuraAudioRef.current.pause();
                evolveAuraAudioRef.current = null;
            }
        };
    }, [dragState?.sourceType]);

    // Special Summon Tracking (for cards appearing not from hand)
    const [summonedCardIds, setSummonedCardIds] = React.useState<Set<string>>(new Set());

    // Attack Animation State (for Y-axis rotation during attack)
    const [attackingFollowerInstanceId, setAttackingFollowerInstanceId] = React.useState<string | null>(null);
    // Counter-Attack Animation State (for Y-axis rotation during counter-attack / being attacked)
    const [counterAttackingFollowerInstanceId, setCounterAttackingFollowerInstanceId] = React.useState<string | null>(null);

    // Drag Cancel Animation State (for ease-in falling animation)
    const [cancellingDragIndex, setCancellingDragIndex] = React.useState<number | null>(null);

    const [selectedCard, setSelectedCard] = React.useState<{
        card: any;
        owner: 'PLAYER' | 'OPPONENT';
    } | null>(null);

    // バトルログからカード名をクリックした時にカード情報を表示
    const handleCardNameClickFromLog = React.useCallback((cardName: string) => {
        // カード名からカード定義を検索
        const cardDef = getCardDefinition(cardName);
        if (cardDef) {
            // ゲームオーバー時はリザルト画面の左カラムに表示
            if (gameState.winnerId) {
                setResultCardInfo(cardDef as CardModel);
            } else {
                setSelectedCard({ card: cardDef, owner: 'OPPONENT' }); // バトルログからは相手カードとして扱う
            }
        }
    }, [gameState.winnerId]);

    interface ActiveEffectState {
        type: 'SLASH' | 'FIREBALL' | 'LIGHTNING' | 'IMPACT' | 'SHOT' | 'SUMI' | 'HEAL' | 'RAY' | 'ICE' | 'WATER' | 'FIRE' | 'THUNDER' | 'BLUE_FIRE' | 'BUFF' | 'BANE';
        x: number;
        y: number;
        key: number;
        atkBuff?: number; // For BUFF type
        hpBuff?: number;  // For BUFF type
    }
    const [activeEffects, setActiveEffects] = React.useState<ActiveEffectState[]>([]);

    // CRITICAL: playEffect now accepts instanceId for accurate visual positioning
    // This ensures the effect plays on the correct card even when board indices differ from visual indices
    const playEffect = (effectType: any, targetPlayerId?: string, targetIndex?: number, targetInstanceId?: string) => {
        if (!effectType) return;

        // NO SHAKE for SPELLS (Assuming SPELL effect types or derived by context?)
        // effectType is string. 'SLASH', 'FIREBALL' etc.
        // User request: "When using Spells, do not use vibration."
        // We need to know if the SOURCE was a spell or if the effect itself implies it.
        // Or simple hack: If effectType is generic default for spells? But spells use FIREBALL etc.
        // Let's rely on caller.
        // Caller `handlePlayCard` logic triggers a shake: `triggerShake(); // Trigger Shake on Land`
        // We should modify `handlePlayCard` to check Card Type.
        // Here in `playEffect`, it's just visual.
        // We will remove the shake trigger from Spell Play completion in `handlePlayCard`.

        // Use Screen Center as default
        let x = window.innerWidth / 2;
        let y = window.innerHeight / 2;

        const isOpponentTarget = targetPlayerId === opponentPlayerId;
        const isLeader = targetIndex === undefined || targetIndex === -1;

        if (isLeader) {
            const ref = isOpponentTarget ? opponentLeaderRef : playerLeaderRef;
            if (ref.current) {
                const rect = ref.current.getBoundingClientRect();
                // Convert screen coordinates to game container coordinates
                const gameCoords = screenToGameCoords(rect.left + rect.width / 2, rect.top + rect.height / 2);
                x = gameCoords.x;
                y = gameCoords.y;
            } else {
                y = isOpponentTarget ? 150 : BASE_HEIGHT - 250;
            }
        } else if (targetIndex !== undefined && targetIndex >= 0) {
            const refs = isOpponentTarget ? opponentBoardRefs : playerBoardRefs;
            // CRITICAL: Use refs to get the latest visual board state for accurate positioning
            const visualBoard = isOpponentTarget ? visualOpponentBoardRef.current : visualPlayerBoardRef.current;

            // CRITICAL: Find visual index using instanceId if provided, otherwise use targetIndex
            // This ensures effect plays on the correct visual card position
            let visualIndex = targetIndex;
            if (targetInstanceId) {
                const foundIndex = visualBoard.findIndex((c: any) => c && c.instanceId === targetInstanceId);
                if (foundIndex >= 0) {
                    visualIndex = foundIndex;
                }
            }

            const el = refs.current[visualIndex];
            if (el) {
                const rect = el.getBoundingClientRect();
                // Convert screen coordinates to game container coordinates
                const gameCoords = screenToGameCoords(rect.left + rect.width / 2, rect.top + rect.height / 2);
                x = gameCoords.x;
                y = gameCoords.y;
            }
        }

        setActiveEffects(prev => [...prev, {
            type: effectType,
            x,
            y,
            key: Date.now() + Math.random()
        }]);
    };

    // Buff effect with attack and HP values
    const playBuffEffect = (targetPlayerId: string, targetIndex: number, atkBuff: number, hpBuff: number, targetInstanceId?: string) => {
        let x = window.innerWidth / 2;
        let y = window.innerHeight / 2;

        const isOpponentTarget = targetPlayerId === opponentPlayerId;
        const refs = isOpponentTarget ? opponentBoardRefs : playerBoardRefs;
        const visualBoard = isOpponentTarget ? visualOpponentBoardRef.current : visualPlayerBoardRef.current;

        let visualIndex = targetIndex;
        if (targetInstanceId) {
            const foundIndex = visualBoard.findIndex((c: any) => c && c.instanceId === targetInstanceId);
            if (foundIndex >= 0) {
                visualIndex = foundIndex;
            }
        }

        const el = refs.current[visualIndex];
        if (el) {
            const rect = el.getBoundingClientRect();
            const gameCoords = screenToGameCoords(rect.left + rect.width / 2, rect.top + rect.height / 2);
            x = gameCoords.x;
            y = gameCoords.y;
        }

        setActiveEffects(prev => [...prev, {
            type: 'BUFF' as const,
            x,
            y,
            key: Date.now() + Math.random(),
            atkBuff,
            hpBuff
        }]);
    };

    // --- BANE Death Effect Detection ---
    // Track previous board states to detect BANE deaths
    const prevPlayerBoardRef = React.useRef<any[]>([]);
    const prevOpponentBoardRef = React.useRef<any[]>([]);

    React.useEffect(() => {
        // Check for cards that just started dying with killedByBane flag
        const checkBaneDeaths = (currentBoard: any[], prevBoard: any[], playerId: string) => {
            prevBoard.forEach((prevCard: any) => {
                if (!prevCard) return;
                const stillExists = currentBoard.find((c: any) => c && c.instanceId === prevCard.instanceId);
                // Card was removed and had killedByBane flag
                if (!stillExists && prevCard.killedByBane) {
                    // Find position from visual board refs
                    const isOpponent = playerId === opponentPlayerId;
                    const refs = isOpponent ? opponentBoardRefs : playerBoardRefs;
                    const visualBoard = isOpponent ? visualOpponentBoardRef.current : visualPlayerBoardRef.current;
                    const visualIndex = visualBoard.findIndex((c: any) => c && c.instanceId === prevCard.instanceId);

                    if (visualIndex >= 0 && refs.current[visualIndex]) {
                        const el = refs.current[visualIndex];
                        const rect = el.getBoundingClientRect();
                        const gameCoords = screenToGameCoords(rect.left + rect.width / 2, rect.top + rect.height / 2);
                        // Play BANE effect at card position
                        setActiveEffects(prev => [...prev, {
                            type: 'BANE' as const,
                            x: gameCoords.x,
                            y: gameCoords.y,
                            key: Date.now() + Math.random()
                        }]);
                    }
                }
            });
        };

        const playerBoard = gameState.players[currentPlayerId]?.board || [];
        const opponentBoard = gameState.players[opponentPlayerId]?.board || [];

        checkBaneDeaths(playerBoard, prevPlayerBoardRef.current, currentPlayerId);
        checkBaneDeaths(opponentBoard, prevOpponentBoardRef.current, opponentPlayerId);

        // Update refs for next comparison
        prevPlayerBoardRef.current = playerBoard.map((c: any) => c ? { ...c } : null);
        prevOpponentBoardRef.current = opponentBoard.map((c: any) => c ? { ...c } : null);
    }, [gameState.players, currentPlayerId, opponentPlayerId]);

    // --- Draw Animation State (Single batch for simultaneous display) ---
    const DRAW_ANIMATION_DURATION = 600; // ms for animation
    const [drawAnimation, setDrawAnimation] = React.useState<{
        isPlayer: boolean;
        count: number; // Number of cards to show simultaneously
    } | null>(null);
    const prevHandSizeRef = React.useRef<{ player: number, opponent: number }>({ player: 0, opponent: 0 });

    const [audioSettings, setAudioSettings] = React.useState(() => {
        try {
            const saved = localStorage.getItem('audioSettings');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Migration: if 'enabled' exists, use it for both bgmEnabled and seEnabled
                if (parsed.enabled !== undefined) {
                    const { enabled, ...rest } = parsed;
                    return { ...rest, bgmEnabled: enabled, seEnabled: enabled };
                }
                return parsed;
            }
            return { bgm: 0.3, se: 0.5, voice: 0.5, bgmEnabled: true, seEnabled: true };
        } catch (e) {
            return { bgm: 0.3, se: 0.5, voice: 0.5, bgmEnabled: true, seEnabled: true };
        }
    });

    const playSE = React.useCallback((file: string, volume: number = 0.5) => {
        if (!audioSettings.seEnabled) return;
        const audio = new Audio(getAssetUrl(`/se/${file}`));
        audio.volume = audioSettings.se * volume;
        audio.play().catch(e => console.warn("SE Play prevented", e));
    }, [audioSettings]);

    // マーカー表示時にSE再生（ドラッグ中かつ新しいターゲットにホバーした時）
    const markerHoveredRef = React.useRef<any>(null);
    React.useEffect(() => {
        if (dragState && hoveredTarget && !markerHoveredRef.current) {
            // 新しくマーカーが表示された
            playSE('Buon.mp3', 0.25);
        } else if (dragState && hoveredTarget && markerHoveredRef.current) {
            // 別のターゲットにホバーした
            const prev = markerHoveredRef.current;
            if (prev.instanceId !== hoveredTarget.instanceId ||
                prev.index !== hoveredTarget.index ||
                prev.playerId !== hoveredTarget.playerId) {
                playSE('Buon.mp3', 0.25);
            }
        }
        markerHoveredRef.current = hoveredTarget;
    }, [hoveredTarget, dragState, playSE]);

    const bgmRef = React.useRef<HTMLAudioElement | null>(null);
    const [showSettings, setShowSettings] = React.useState(false);

    // BGM Management
    React.useEffect(() => {
        localStorage.setItem('audioSettings', JSON.stringify(audioSettings));
        if (bgmRef.current) {
            bgmRef.current.volume = audioSettings.bgmEnabled ? audioSettings.bgm : 0;
            if (!audioSettings.bgmEnabled) {
                bgmRef.current.pause();
            } else if (bgmRef.current.paused) {
                bgmRef.current.play().catch(e => console.warn("Auto-play prevented", e));
            }
        }
    }, [audioSettings]);
    const [showMenu, setShowMenu] = React.useState(false);
    const [showHelp, setShowHelp] = React.useState(false);
    // coinTossPhase, coinTossResult, isGameStartAnim are declared earlier (near line 1145)
    const [isHandExpanded, setIsHandExpanded] = React.useState(false);
    const handJustExpandedRef = React.useRef(false); // 手札を展開した直後かどうか

    // --- Board Stability Helper ---
    const [shake, setShake] = React.useState(false); // Screen Shake State

    const [targetingState, setTargetingState] = React.useState<{
        type: 'PLAY' | 'EVOLVE';
        sourceIndex: number; // Actual board index for engine processing
        sourceInstanceId?: string; // Card instance ID for accurate lookup
        sourceVisualIndex?: number; // Visual board index for animation position
        useSep?: boolean;
        allowedTargetPlayerId?: string; // Validated target side
        excludeInstanceId?: string; // For SELECT_OTHER_ALLY_FOLLOWER - exclude source card from valid targets
    } | null>(null);

    // Refs
    // const handRef = React.useRef<HTMLDivElement>(null); // Removed unused ref
    const boardRef = React.useRef<HTMLDivElement>(null);
    const opponentLeaderRef = React.useRef<HTMLDivElement>(null);
    const opponentBoardRefs = React.useRef<(HTMLDivElement | null)[]>([]);
    const playerBoardRefs = React.useRef<(HTMLDivElement | null)[]>([]);
    const playerLeaderRef = React.useRef<HTMLDivElement>(null);

    // --- Damage Tracking Logic ---
    const [damageNumbers, setDamageNumbers] = React.useState<{ id: number, value: string | number, x: number, y: number, color?: string }[]>([]);

    // --- Battle Statistics Tracking ---
    const prevLeaderHPRef = React.useRef<{ player: number, opponent: number }>({ player: 20, opponent: 20 });
    const prevBoardCountRef = React.useRef<{ player: number, opponent: number }>({ player: 0, opponent: 0 });
    // カード座標のキャッシュ（死亡時にも正しい位置にダメージ表記を出すため）
    const cardPositionsRef = React.useRef<Map<string, { x: number, y: number }>>(new Map());

    React.useEffect(() => {
        if (!player || !opponent) return;

        // Track damage dealt to opponent's leader
        const opponentHPDiff = prevLeaderHPRef.current.opponent - opponent.hp;
        if (opponentHPDiff > 0) {
            setBattleStats(prev => ({
                ...prev,
                damageDealtToOpponent: prev.damageDealtToOpponent + opponentHPDiff
            }));
        }

        // Track damage received from opponent
        const playerHPDiff = prevLeaderHPRef.current.player - player.hp;
        if (playerHPDiff > 0) {
            setBattleStats(prev => ({
                ...prev,
                damageReceivedFromOpponent: prev.damageReceivedFromOpponent + playerHPDiff
            }));
        }

        // Track followers destroyed (opponent's board decreased = our kills)
        const opponentBoardDiff = prevBoardCountRef.current.opponent - (opponent.board?.filter(c => c).length || 0);
        if (opponentBoardDiff > 0) {
            setBattleStats(prev => ({
                ...prev,
                followersDestroyed: prev.followersDestroyed + opponentBoardDiff
            }));
        }

        // Track our followers destroyed
        const playerBoardDiff = prevBoardCountRef.current.player - (player.board?.filter(c => c).length || 0);
        if (playerBoardDiff > 0) {
            setBattleStats(prev => ({
                ...prev,
                myFollowersDestroyed: prev.myFollowersDestroyed + playerBoardDiff
            }));
        }

        // Update refs
        prevLeaderHPRef.current = { player: player.hp, opponent: opponent.hp };
        prevBoardCountRef.current = {
            player: player.board?.filter(c => c).length || 0,
            opponent: opponent.board?.filter(c => c).length || 0
        };
    }, [player?.hp, opponent?.hp, player?.board?.length, opponent?.board?.length]);

    // --- Effect Queue Processing ---
    const effectTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // BGM Selection with Non-Repeating Logic
    const lastBgmKey = 'lastPlayedBgm';
    const selectBgm = React.useCallback((className: string) => {
        const bgmPools: Record<string, string[]> = {
            'AJA': [getAssetUrl('/bgm/Green Misty Mountains.mp3'), getAssetUrl('/bgm/Jade Moon.mp3'), getAssetUrl('/bgm/amaama.mp3'), getAssetUrl('/bgm/kingetsu.mp3')],
            'SENKA': [getAssetUrl('/bgm/ouka.mp3'), getAssetUrl('/bgm/Jade Moon.mp3'), getAssetUrl('/bgm/amaama.mp3'), getAssetUrl('/bgm/kingetsu.mp3')]
        };
        const currentPool = bgmPools[className] || bgmPools['SENKA'];
        const lastPlayed = sessionStorage.getItem(lastBgmKey);

        // Filter out the last played BGM if pool size allows
        const availablePool = currentPool.length > 1
            ? currentPool.filter(path => path !== lastPlayed)
            : currentPool;

        const selected = availablePool[Math.floor(Math.random() * availablePool.length)];
        sessionStorage.setItem(lastBgmKey, selected);

        // Ensure path spaces are encoded for new Audio()
        return encodeURI(selected);
    }, []);

    const [bgmLoadedForClass, setBgmLoadedForClass] = React.useState<string | null>(null);

    React.useEffect(() => {
        // Debug: Log pending effects state
        console.log(`[PendingEffects] useEffect fired. isProcessingEffect=${isProcessingEffect}, pendingEffects.length=${gameState.pendingEffects?.length || 0}`);

        // If we're already busy with an animation, wait for the timeout/callback to clear it
        if (isProcessingEffect) {
            console.log('[PendingEffects] Early return: isProcessingEffect=true');
            return;
        }

        if (gameState.pendingEffects && gameState.pendingEffects.length > 0) {
            const current = gameState.pendingEffects[0];
            console.log(`[PendingEffects] Processing effect: ${current.effect.type} from ${current.sourceCard.name}`);

            // Prevent re-processing the exact same effect object.
            if (processingHandledRef.current === current) {
                console.log('[PendingEffects] Early return: same effect already processed');
                return;
            }
            processingHandledRef.current = current;

            setIsProcessingEffect(true);
            isProcessingEffectRef.current = true;

            // case A: GENERATE_CARD with animation - batch process consecutive GENERATE_CARDs from same source
            if (current.effect.type === 'GENERATE_CARD' && current.effect.targetCardId) {
                // Collect all consecutive GENERATE_CARD effects from the same source
                const generateEffects = [current];
                const pendingEffects = gameState.pendingEffects || [];
                for (let i = 1; i < pendingEffects.length; i++) {
                    const nextEffect = pendingEffects[i];
                    if (nextEffect.effect.type === 'GENERATE_CARD' &&
                        nextEffect.sourceCard.id === current.sourceCard.id &&
                        nextEffect.sourcePlayerId === current.sourcePlayerId) {
                        generateEffects.push(nextEffect);
                    } else {
                        break; // Stop at first non-matching effect
                    }
                }

                // Calculate card positions for simultaneous display
                const cardWidth = 120;
                const cardGap = 20;
                const totalWidth = generateEffects.length * cardWidth + (generateEffects.length - 1) * cardGap;
                const startOffset = -(totalWidth - cardWidth) / 2;

                const isForPlayer = current.sourcePlayerId === currentPlayerId;
                const flyTargetX = isForPlayer ? window.innerWidth - 200 * scale : 200 * scale;
                const flyTargetY = isForPlayer ? window.innerHeight - 100 * scale : 100 * scale;

                // Create all animating cards with X offsets
                const newAnimatingCards = generateEffects.map((eff, idx) => {
                    const cardDef = getCardDefinition(eff.effect.targetCardId!);
                    return {
                        card: cardDef!,
                        status: 'APPEAR' as const,
                        targetX: flyTargetX,
                        targetY: flyTargetY,
                        xOffset: startOffset + idx * (cardWidth + cardGap)
                    };
                }).filter(c => c.card); // Filter out undefined cards

                if (newAnimatingCards.length > 0) {
                    setAnimatingCards(newAnimatingCards);

                    if (effectTimeoutRef.current) clearTimeout(effectTimeoutRef.current);
                    effectTimeoutRef.current = setTimeout(() => {
                        setAnimatingCards(prev => prev.map(c => ({ ...c, status: 'FLY' as const })));
                        effectTimeoutRef.current = setTimeout(() => {
                            setAnimatingCards([]);
                            setIsProcessingEffect(false);
                            isProcessingEffectRef.current = false;
                            // Resolve ALL batched effects at once
                            if (gameMode === 'CPU' || gameMode === 'HOST') {
                                generateEffects.forEach(eff => {
                                    dispatch({ type: 'RESOLVE_EFFECT', playerId: eff.sourcePlayerId, payload: { targetId: eff.targetId } });
                                });

                                if (gameMode === 'HOST' && connected && adapter) {
                                    setTimeout(() => {
                                        const updatedState = gameStateRef.current;
                                        adapter.send({ type: 'GAME_STATE', payload: updatedState });
                                    }, 50);
                                }
                            }
                            effectTimeoutRef.current = null;
                        }, 600);
                    }, 800); // Reduced from 1000ms for snappier feel
                    return;
                }
            }

            // case B: Visual Effects (Damage, Destroy, Heal, Buff)
            const isDamageEffect = current.effect.type === 'DAMAGE' || current.effect.type === 'AOE_DAMAGE' || current.effect.type === 'RANDOM_DAMAGE';
            const isDestroyEffect = current.effect.type === 'DESTROY' || current.effect.type === 'RANDOM_DESTROY';
            const isHealEffect = current.effect.type === 'HEAL_LEADER';
            const isSetHpEffect = current.effect.type === 'RANDOM_SET_HP';
            const isSetMaxHpEffect = current.effect.type === 'SET_MAX_HP';
            const isBounceEffect = current.effect.type === 'RETURN_TO_HAND';
            const isSummonEffect = current.effect.type === 'SUMMON_CARD' || current.effect.type === 'SUMMON_CARD_RUSH';
            const isBuffEffectType = current.effect.type === 'BUFF_STATS';

            const delay = (isHealEffect || isBounceEffect || isSummonEffect || isBuffEffectType) ? 600 : 50;

            if (isDamageEffect) {
                // Default effect type from card's attackEffectType
                let effectType = current.sourceCard.attackEffectType || 'SLASH';

                // Card-specific effect overrides for evolve triggers
                // ありす (c_alice): 進化時のダメージエフェクトはWATER
                if ((current.sourceCard as any).id === 'c_alice' && current.effect.targetType === 'SELECT_FOLLOWER') {
                    effectType = 'WATER';
                }

                const targetPid = current.sourcePlayerId === currentPlayerId ? opponentPlayerId : currentPlayerId;
                const vBoard = targetPid === currentPlayerId ? visualPlayerBoard : visualOpponentBoard;

                if (current.effect.type === 'AOE_DAMAGE') {
                    const oppBoard = gameState.players[targetPid].board;
                    oppBoard.forEach((c) => {
                        if (c) {
                            const vIdx = vBoard.findIndex(v => v?.instanceId === c.instanceId);
                            if (vIdx !== -1) playEffect(effectType, targetPid, vIdx);
                        }
                    });
                } else if ((current as any).targetIds) {
                    (current as any).targetIds.forEach((tid: string) => {
                        const vIdx = vBoard.findIndex(v => v?.instanceId === tid);
                        if (vIdx !== -1) playEffect(effectType, targetPid, vIdx);
                    });
                } else if (current.effect.targetType === 'OPPONENT') {
                    // OPPONENT targets the enemy leader - play effect on leader
                    playEffect(effectType, targetPid, -1); // -1 indicates leader
                    triggerShake();
                } else if (current.targetId) {
                    const vIdx = vBoard.findIndex(v => v?.instanceId === current.targetId);
                    if (vIdx !== -1) playEffect(effectType, targetPid, vIdx);
                }
            } else if (isDestroyEffect) {
                // Default effect type from card's attackEffectType
                let effectType = current.sourceCard.attackEffectType || 'IMPACT';

                // Card-specific effect overrides
                // かすが (c_kasuga): 全体破壊エフェクトはRAY
                if ((current.sourceCard as any).id === 'c_kasuga') {
                    effectType = 'RAY';
                }

                const targetPid = current.sourcePlayerId === currentPlayerId ? opponentPlayerId : currentPlayerId;
                const vBoard = targetPid === currentPlayerId ? visualPlayerBoard : visualOpponentBoard;

                if (current.effect.targetType === 'ALL_OTHER_FOLLOWERS') {
                    // Board clear visual
                    vBoard.forEach((v, vIdx) => {
                        if (v && v.instanceId !== (current.sourceCard as any).instanceId) {
                            playEffect(effectType, targetPid, vIdx);
                        }
                    });
                    // Also play effect on own board (かすが destroys ALL followers)
                    const selfPid = current.sourcePlayerId;
                    const selfBoard = selfPid === currentPlayerId ? visualPlayerBoard : visualOpponentBoard;
                    selfBoard.forEach((v, vIdx) => {
                        if (v && v.instanceId !== (current.sourceCard as any).instanceId) {
                            playEffect(effectType, selfPid, vIdx);
                        }
                    });
                    triggerShake();
                } else if ((current as any).targetIds) {
                    (current as any).targetIds.forEach((tid: string) => {
                        const vIdx = vBoard.findIndex(v => v?.instanceId === tid);
                        if (vIdx !== -1) playEffect(effectType, targetPid, vIdx);
                    });
                } else if (current.targetId) {
                    const vIdx = vBoard.findIndex(v => v?.instanceId === current.targetId);
                    if (vIdx !== -1) playEffect(effectType, targetPid, vIdx);
                }
            } else if (isHealEffect) {
                // Trigger HEAL visual effect for leader recovery
                const targetPid = current.sourcePlayerId; // HEAL_LEADER heals source
                playEffect('HEAL', targetPid);
            } else if (isSetMaxHpEffect) {
                // 天下布舞・ファイナルキャノン: RAY effect on opponent leader
                const targetPid = current.sourcePlayerId === currentPlayerId ? opponentPlayerId : currentPlayerId;
                playEffect('RAY', targetPid, -1); // -1 indicates leader
                triggerShake();
            }

            // case C: Buff Effects (BUFF_STATS)
            const isBuffEffect = current.effect.type === 'BUFF_STATS';
            if (isBuffEffect) {
                const atkBuff = current.effect.value ?? 0;
                const hpBuff = current.effect.value2 ?? 0;
                const targetPid = current.sourcePlayerId; // Buff typically applies to own followers

                // Determine target based on targetType
                if (current.effect.targetType === 'SELF') {
                    // Buff self (the source card)
                    const vBoard = targetPid === currentPlayerId ? visualPlayerBoard : visualOpponentBoard;
                    const vIdx = vBoard.findIndex(v => v?.instanceId === (current.sourceCard as any).instanceId);
                    if (vIdx !== -1) {
                        playBuffEffect(targetPid, vIdx, atkBuff, hpBuff, (current.sourceCard as any).instanceId);
                    }
                } else if (current.effect.targetType === 'ALL_FOLLOWERS') {
                    // Buff all own followers (with optional conditions like nameIn)
                    const vBoard = targetPid === currentPlayerId ? visualPlayerBoard : visualOpponentBoard;
                    const board = gameState.players[targetPid].board;
                    const conditions = current.effect.conditions;
                    board.forEach((c) => {
                        if (c) {
                            // Apply conditions if present
                            if (conditions?.tag && !c.tags?.includes(conditions.tag)) return;
                            if (conditions?.nameIn && !conditions.nameIn.includes(c.name)) return;

                            const vIdx = vBoard.findIndex(v => v?.instanceId === c.instanceId);
                            if (vIdx !== -1) {
                                playBuffEffect(targetPid, vIdx, atkBuff, hpBuff, c.instanceId);
                            }
                        }
                    });
                } else if (current.effect.targetType === 'ALL_OTHER_FOLLOWERS') {
                    // Buff all own followers except source (with optional conditions)
                    const vBoard = targetPid === currentPlayerId ? visualPlayerBoard : visualOpponentBoard;
                    const board = gameState.players[targetPid].board;
                    const conditions = current.effect.conditions;
                    board.forEach((c) => {
                        if (c && c.instanceId !== (current.sourceCard as any).instanceId) {
                            // Apply conditions if present
                            if (conditions?.tag && !c.tags?.includes(conditions.tag)) return;
                            if (conditions?.nameIn && !conditions.nameIn.includes(c.name)) return;

                            const vIdx = vBoard.findIndex(v => v?.instanceId === c.instanceId);
                            if (vIdx !== -1) {
                                playBuffEffect(targetPid, vIdx, atkBuff, hpBuff, c.instanceId);
                            }
                        }
                    });
                } else if (current.targetId) {
                    // Single target buff
                    const vBoard = targetPid === currentPlayerId ? visualPlayerBoard : visualOpponentBoard;
                    const vIdx = vBoard.findIndex(v => v?.instanceId === current.targetId);
                    if (vIdx !== -1) {
                        playBuffEffect(targetPid, vIdx, atkBuff, hpBuff, current.targetId);
                    }
                }
            }

            if (effectTimeoutRef.current) clearTimeout(effectTimeoutRef.current);

            // Timeline:
            // 0ms: Animation Starts
            // 1000ms: Impact / Damage Applied (Gap is zero relative to impact)
            // 2000ms: Done / Next Effect (1s pause after damage)
            const isDamageOrDestroy = isDamageEffect || isDestroyEffect || isSetHpEffect || isSetMaxHpEffect;
            const stateUpdateDelay = isDamageOrDestroy ? 1000 : delay;
            const postActionDelay = isDamageOrDestroy ? 1000 : 0;

            effectTimeoutRef.current = setTimeout(() => {
                // Online mode synchronization:
                // - HOST (or CPU) processes RESOLVE_EFFECT and sends updated state to JOIN
                // - JOIN waits for state sync from HOST to avoid RNG desync
                if (gameMode === 'CPU' || gameMode === 'HOST') {
                    // HOST/CPU: dispatch locally and send updated state to network
                    dispatch({ type: 'RESOLVE_EFFECT', playerId: current.sourcePlayerId, payload: { targetId: current.targetId } });

                    // Send updated state to JOIN after processing
                    if (gameMode === 'HOST' && connected && adapter) {
                        // Use setTimeout to ensure dispatch is processed first
                        setTimeout(() => {
                            const updatedState = gameStateRef.current;
                            adapter.send({ type: 'GAME_STATE', payload: updatedState });
                        }, 50);
                    }
                }
                // JOIN mode: don't dispatch locally - wait for GAME_STATE from HOST
                // The GAME_STATE message handler will update our state

                if (postActionDelay > 0) {
                    effectTimeoutRef.current = setTimeout(() => {
                        setIsProcessingEffect(false);
                        isProcessingEffectRef.current = false;
                        effectTimeoutRef.current = null;
                    }, postActionDelay);
                } else {
                    setIsProcessingEffect(false);
                    isProcessingEffectRef.current = false;
                    effectTimeoutRef.current = null;
                }
            }, stateUpdateDelay);
        } else {
            // No more effects to process
            processingHandledRef.current = null;
            if (effectTimeoutRef.current) {
                clearTimeout(effectTimeoutRef.current);
                effectTimeoutRef.current = null;
            }
        }
    }, [gameState.pendingEffects, isProcessingEffect, currentPlayerId, opponentPlayerId, gameMode, connected, adapter]);

    // Turn Notification Check
    React.useEffect(() => {
        // Only show when it's the current local player's turn to act
        if (gameState.activePlayerId !== currentPlayerId) return;

        const isFirstPlayer = currentPlayerId === gameState.firstPlayerId;
        const turn = gameState.turnCount;

        // Shadowverse standard:
        // First Player (P1): Evolve Turn 5, Super Evolve Turn 7
        // Second Player (P2): Evolve Turn 4, Super Evolve Turn 6
        const unlockEvolveTurn = isFirstPlayer ? 5 : 4;
        const unlockSuperEvolveTurn = isFirstPlayer ? 7 : 6;

        // Show ONLY on the exact turn it becomes available
        if (turn === unlockSuperEvolveTurn) {
            if (notifiedTurn === turn) return;
            setTurnNotification('SUPER_EVOLVE_READY');
            setNotifiedTurn(turn);
            setTimeout(() => setTurnNotification(null), 2500);
        } else if (turn === unlockEvolveTurn) {
            if (notifiedTurn === turn) return;
            setTurnNotification('EVOLVE_READY');
            setNotifiedTurn(turn);
            setTimeout(() => setTurnNotification(null), 2500);
        }
    }, [gameState.turnCount, gameState.activePlayerId, currentPlayerId, notifiedTurn, gameState.firstPlayerId]);

    const prevPlayersRef = React.useRef<Record<string, Player>>(gameState.players); // Initial State

    // Detect Special Summons (cards appearing on board not from hand)
    React.useEffect(() => {
        const prevPlayers = prevPlayersRef.current;
        const newSummonIds = new Set<string>();

        Object.keys(gameState.players).forEach(pid => {
            const currPlayer = gameState.players[pid];
            const prevPlayer = prevPlayers[pid];
            if (!prevPlayer) return;

            const prevBoardIds = new Set(prevPlayer.board.filter(c => c).map(c => (c as any).instanceId));
            const prevHandIds = new Set(prevPlayer.hand.filter(c => c).map(c => (c as any).instanceId));

            currPlayer.board.forEach(card => {
                if (!card) return;
                const instanceId = (card as any).instanceId;
                if (!prevBoardIds.has(instanceId) && !prevHandIds.has(instanceId)) {
                    newSummonIds.add(instanceId);
                }
            });
        });

        if (newSummonIds.size > 0) {
            setSummonedCardIds(prev => {
                const merged = new Set([...prev, ...newSummonIds]);
                return merged;
            });
            const timer = setTimeout(() => {
                setSummonedCardIds(new Set());
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [gameState.players]);

    React.useEffect(() => {
        const prevPlayers = prevPlayersRef.current;
        const currentPlayers = gameState.players;
        let newDamages: { id: number, value: number | string, x: number, y: number, color?: string }[] = [];

        // Helper to get screen coordinates from element
        const getScreenCoordsFromElement = (el: HTMLElement) => {
            const rect = el.getBoundingClientRect();
            return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        };

        Object.keys(currentPlayers).forEach(pid => {
            const curr = currentPlayers[pid];
            const prev = prevPlayers[pid];

            // 1. Leader Damage
            if (prev && curr.hp < prev.hp) {
                const diff = prev.hp - curr.hp;
                const isMe = pid === currentPlayerId;
                const ref = isMe ? playerLeaderRef.current : opponentLeaderRef.current;

                if (ref) {
                    const coords = getScreenCoordsFromElement(ref);
                    newDamages.push({
                        id: Date.now() + Math.random(),
                        value: diff,
                        x: coords.x,
                        y: coords.y,
                        color: '#e53e3e' // Red for Damage
                    });
                }
            } else if (prev && curr.hp > prev.hp) { // Heal Detection
                const diff = curr.hp - prev.hp;
                const isMe = pid === currentPlayerId;
                const ref = isMe ? playerLeaderRef.current : opponentLeaderRef.current;
                if (ref) {
                    const coords = getScreenCoordsFromElement(ref);
                    newDamages.push({
                        id: Date.now() + Math.random(),
                        value: '+' + diff,
                        x: coords.x,
                        y: coords.y,
                        color: '#48bb78' // Green for Heal
                    });
                }
            }

            // 2. Board Damage & Death Tracking
            // Check previous board for damage or death
            prev?.board.forEach((prevCard) => {
                if (!prevCard) return;

                // Search for this card in current board
                const currCard = curr.board.find(c => c?.instanceId === prevCard.instanceId);

                if (currCard) {
                    // Still on board. Check HP.
                    const currIdx = curr.board.findIndex(c => c?.instanceId === currCard.instanceId);
                    const isMe = pid === currentPlayerId;
                    const refs = isMe ? playerBoardRefs.current : opponentBoardRefs.current;
                    const el = refs[currIdx];

                    if (el) {
                        const coords = getScreenCoordsFromElement(el);
                        // 生存カードの座標をキャッシュに保存（次回の死亡判定用）
                        cardPositionsRef.current.set(prevCard.instanceId, coords);

                        if (currCard.currentHealth < prevCard.currentHealth) {
                            const damage = prevCard.currentHealth - currCard.currentHealth;
                            newDamages.push({ id: Date.now() + Math.random(), value: damage, x: coords.x, y: coords.y, color: '#e53e3e' });
                        } else if (currCard.currentHealth > prevCard.currentHealth) {
                            // Heal - but skip if this is from evolution (hasEvolved changed to true)
                            const isEvolution = currCard.hasEvolved && !prevCard.hasEvolved;
                            // Skip heal effect if this is from a buff (attack or maxHealth changed)
                            const isBuff = currCard.currentAttack !== prevCard.currentAttack || currCard.maxHealth !== prevCard.maxHealth;
                            if (!isEvolution && !isBuff) {
                                const heal = currCard.currentHealth - prevCard.currentHealth;
                                newDamages.push({ id: Date.now() + Math.random(), value: '+' + heal, x: coords.x, y: coords.y, color: '#48bb78' });
                            }
                        }
                    }
                } else {
                    // Not found -> Check Graveyard (card was destroyed)
                    const inGraveyard = curr.graveyard.find(g => (g as any).instanceId === prevCard.instanceId);

                    // If in graveyard (or just missing), assume damage if it was on board.
                    // For AoE visibility, we want to see damage numbers on dying units.
                    let damage = 0;
                    if (inGraveyard) {
                        const finalHP = (inGraveyard as any).currentHealth || 0;
                        // User Request: Show overkill damage (prevHP - finalHP)
                        if (finalHP <= 0) {
                            damage = prevCard.currentHealth - finalHP;
                        } else {
                            damage = 0; // Destroy effect, no red damage text
                        }
                    } else {
                        // Not in graveyard? Maybe banished or just missing.
                        damage = prevCard.currentHealth;
                    }

                    if (damage > 0) {
                        // 死亡したカードの座標をキャッシュから取得（refs[idx]は既に無効）
                        const cachedCoords = cardPositionsRef.current.get(prevCard.instanceId);

                        if (cachedCoords && (cachedCoords.x !== 0 || cachedCoords.y !== 0)) {
                            newDamages.push({ id: Date.now() + Math.random(), value: damage, x: cachedCoords.x, y: cachedCoords.y, color: '#e53e3e' });
                        }
                        // キャッシュから座標を取得できない場合はダメージ表示をスキップ
                    }

                    // 死亡したカードはキャッシュから削除
                    cardPositionsRef.current.delete(prevCard.instanceId);
                }
            });
        });

        // Add Damage Texts
        if (newDamages.length > 0) {
            setDamageNumbers(prev => [...prev, ...newDamages]);
            // Only shake if any of the new numbers are damage (not green recovery numbers)
            const hasDamage = newDamages.some(d => d.color !== '#48bb78');
            if (hasDamage) triggerShake();
        }

        prevPlayersRef.current = currentPlayers;
    }, [gameState.players, currentPlayerId, opponentPlayerId]);

    // --- Destruction Effect (IMPACT on death) ---
    // REMOVED: Replaced by CSS animation 'cardDie' (glowing fade out)
    /*
    const prevDyingIdsRef = React.useRef<Set<string>>(new Set());
    React.useEffect(() => {
        const currentDyingIds = new Set<string>();

        // Collect dying cards from both boards
        visualPlayerBoard.forEach((card, idx) => {
            if (card?.isDying) {
                currentDyingIds.add(card.instanceId);
                // Play IMPACT effect if newly dying
                if (!prevDyingIdsRef.current.has(card.instanceId)) {
                    const el = playerBoardRefs.current[idx];
                    if (el) {
                        const rect = el.getBoundingClientRect();
                        setActiveEffects(prev => [...prev, {
                            type: 'IMPACT',
                            x: rect.left + rect.width / 2,
                            y: rect.top + rect.height / 2,
                            key: Date.now() + Math.random()
                        }]);
                    }
                }
            }
        });

        visualOpponentBoard.forEach((card, idx) => {
            if (card?.isDying) {
                currentDyingIds.add(card.instanceId);
                // Play IMPACT effect if newly dying
                if (!prevDyingIdsRef.current.has(card.instanceId)) {
                    const el = opponentBoardRefs.current[idx];
                    if (el) {
                        const rect = el.getBoundingClientRect();
                        setActiveEffects(prev => [...prev, {
                            type: 'IMPACT',
                            x: rect.left + rect.width / 2,
                            y: rect.top + rect.height / 2,
                            key: Date.now() + Math.random()
                        }]);
                    }
                }
            }
        });

        prevDyingIdsRef.current = currentDyingIds;
    }, [visualPlayerBoard, visualOpponentBoard]);
    */

    // --- Visual Effect Helpers ---


    // Helper: Screen Shake (with Debounce)
    const shakeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const triggerShake = () => {
        if (shakeTimeoutRef.current) return; // Prevent double shake overlap
        setShake(true);
        shakeTimeoutRef.current = setTimeout(() => {
            setShake(false);
            shakeTimeoutRef.current = null;
        }, 300);
    };

    // Helper: Start rematch (shared between CPU and online modes)
    // newDeckType: Optional - if provided, use this deck type for the rematch
    const startRematch = useCallback((newDeckType?: ClassType) => {
        // 1. Reset visual and logic artifacts IMMEDIATELY
        setDamageNumbers([]);
        setActiveEffects([]);
        setAnimatingCards([]);
        setPlayingCardAnim(null);
        setEvolveAnimation(null);
        setDrawAnimation(null);
        setSummonedCardIds(new Set());
        aiProcessing.current = false;
        lastProcessedTurn.current = null;

        // 2. Reset battle stats for new game
        setBattleStats({
            turnCount: 0,
            damageDealtToOpponent: 0,
            damageReceivedFromOpponent: 0,
            followersDestroyed: 0,
            myFollowersDestroyed: 0
        });
        // Reset battle stats tracking refs
        prevLeaderHPRef.current = { player: 20, opponent: 20 };
        prevBoardCountRef.current = { player: 0, opponent: 0 };
        // Reset result card info
        setResultCardInfo(null);

        // 3. Reset rematch states
        setMyRematchRequested(false);
        setOpponentRematchRequested(false);

        // 3. Update player class if new deck type is provided
        const deckToUse = newDeckType || currentPlayerClass;
        if (newDeckType) {
            setCurrentPlayerClass(newDeckType);
        }

        // 4. Determine opponent class based on new player class
        // CPUは自分と違うクラスをランダムで選択（YORUKAの場合はSENKAかAJA）
        let newOpponentClass: ClassType = opponentClass;
        if (opponentType === 'CPU') {
            if (deckToUse === 'YORUKA') {
                newOpponentClass = Math.random() < 0.5 ? 'SENKA' : 'AJA';
            } else {
                newOpponentClass = deckToUse === 'SENKA' ? 'AJA' : 'SENKA';
            }
        }

        // 5. Suppress immediate diff detection by clearing and then resetting the Ref
        const freshState = initializeGame('You', deckToUse, opponentType === 'ONLINE' ? 'ENEMY' : 'CPU', newOpponentClass);
        prevPlayersRef.current = freshState.players;
        prevHandSizeRef.current = { player: freshState.players.p1.hand.length, opponent: freshState.players.p2.hand.length };

        // 6. Force BGM re-roll and restart
        setBgmLoadedForClass(null);

        // 7. Reset coin toss for new game
        setCoinTossPhase('IDLE');
        setCoinTossResult(null);
        setIsGameStartAnim(false);

        // 8. For online rematch, HOST needs to send new game state after coin toss completes
        if (gameMode === 'HOST') {
            initialStateSentRef.current = false;
        }

        // 9. Update Game State
        dispatch({ type: 'SYNC_STATE', payload: freshState });
    }, [currentPlayerClass, opponentClass, opponentType, gameMode]);

    // Coin Toss and Game Start Animation Sequence
    // JOIN mode: Skip coin toss, wait for INIT_GAME from HOST
    // HOST mode: Wait for JOIN to connect before starting coin toss
    useEffect(() => {
        // CPU: Start immediately
        // HOST: Wait for connection (so JOIN can see the coin toss)
        // JOIN: Skip (will receive game state from HOST via INIT_GAME)
        const canStartCoinToss = gameMode === 'CPU' || (gameMode === 'HOST' && connected);

        if (gameState.phase === 'INIT' && coinTossPhase === 'IDLE' && canStartCoinToss) {
            // Start coin toss animation (HOST and CPU only)
            setCoinTossPhase('TOSSING');
            playSE('coin.mp3', 0.7); // Coin toss sound

            // Determine result (random for all modes)
            const isFirst = Math.random() > 0.5; // Random coin toss for all modes

            // After toss animation, show result
            setTimeout(() => {
                setCoinTossResult(isFirst ? 'FIRST' : 'SECOND');
                setCoinTossPhase('RESULT');

                // If going second, swap turn order
                if (!isFirst) {
                    // Directly update game state to swap active player and PP
                    // Also update firstPlayerId to 'p2' since p2 is now the first player
                    const newState = {
                        ...gameState,
                        activePlayerId: 'p2',
                        firstPlayerId: 'p2', // CRITICAL: Update firstPlayerId for evolve turn calculation
                        players: {
                            p1: {
                                ...gameState.players.p1,
                                maxPp: 0,
                                pp: 0
                            },
                            p2: {
                                ...gameState.players.p2,
                                maxPp: 1,
                                pp: 1
                            }
                        },
                        logs: [`ターン 1 - ${gameState.players.p2.name} のターン`]
                    };
                    // Force update via a special action or direct state manipulation
                    // Since we're using useReducer, we need to dispatch an action
                    // For now, we'll use a workaround by re-initializing
                    dispatch({ type: 'SYNC_STATE', payload: newState });
                }

                // After showing result, show GAME START
                setTimeout(() => {
                    setCoinTossPhase('DONE');
                    setIsGameStartAnim(true);

                    // Hide GAME START after short display
                    setTimeout(() => {
                        setIsGameStartAnim(false);
                    }, 1200);
                }, 1500);
            }, 800);
        }
    }, [gameState.phase, coinTossPhase, gameMode, playSE, connected]);


    // BGM Auto-Play - Initialize based on player class and game start
    React.useEffect(() => {
        // Only load if the BGM isn't already set up for this session/rematch
        if (bgmLoadedForClass === player.class && bgmRef.current) return;

        const selectedBgmPath = selectBgm(player.class);
        console.log(`[BGM] Initializing track: ${selectedBgmPath} for class: ${player.class}`);

        // Cleanup previous BGM if exists
        if (bgmRef.current) {
            bgmRef.current.pause();
            bgmRef.current = null;
        }

        const bgm = new Audio(selectedBgmPath);
        bgm.loop = true;
        bgm.volume = audioSettings.bgm;
        bgmRef.current = bgm;
        setBgmLoadedForClass(player.class);
    }, [player.class, selectBgm, bgmLoadedForClass]);

    // BGM Cleanup on Unmount
    React.useEffect(() => {
        return () => {
            if (bgmRef.current) {
                console.log('[GameScreen] Stopping BGM on unmount');
                bgmRef.current.pause();
                bgmRef.current = null;
            }
        };
    }, []);

    // BGM Playback Control & Interaction Listeners
    React.useEffect(() => {
        if (!bgmRef.current) return;
        const bgm = bgmRef.current;

        const tryPlay = () => {
            if (bgm.paused && audioSettings.bgmEnabled) { // Changed audioSettings.enabled to audioSettings.bgmEnabled
                console.log("[BGM] Attempting play on interaction...");
                bgm.play()
                    .then(() => {
                        console.log("[BGM] Play success");
                        removeListeners();
                    })
                    .catch(e => console.warn("[BGM] Play failed on interaction:", e));
            }
        };

        const removeListeners = () => {
            document.removeEventListener('click', tryPlay);
            document.removeEventListener('keydown', tryPlay);
            document.removeEventListener('touchstart', tryPlay);
        };

        if (audioSettings.bgmEnabled) { // Changed audioSettings.enabled to audioSettings.bgmEnabled
            document.addEventListener('click', tryPlay);
            document.addEventListener('keydown', tryPlay);
            document.addEventListener('touchstart', tryPlay);

            // Immediate attempt
            bgm.play()
                .then(() => {
                    console.log("[BGM] Immediate play success");
                    removeListeners();
                })
                .catch(() => console.log("[BGM] Immediate play blocked, waiting for interaction"));
        } else {
            bgm.pause();
            removeListeners();
        }

        return () => {
            removeListeners();
        };
    }, [audioSettings.bgmEnabled, audioSettings.bgm, bgmLoadedForClass]); // Changed audioSettings.enabled to audioSettings.bgmEnabled
    useEffect(() => {
        if (!adapter) return;

        const handleMessage = (msg: any) => {
            console.log('[GameScreen] Received message:', msg.type, msg);

            // INIT_GAME: JOIN receives initial game state from HOST
            if (msg.type === 'INIT_GAME') {
                console.log('[GameScreen] JOIN: Received initial game state from HOST');
                dispatch({ type: 'SYNC_STATE', payload: msg.payload } as any);
                setGameSynced(true);

                // Show coin toss result for JOIN (JOIN is p2, so check who goes first)
                const isJoinFirst = msg.payload.firstPlayerId === 'p2';
                setCoinTossResult(isJoinFirst ? 'FIRST' : 'SECOND');
                setCoinTossPhase('RESULT');
                playSE('coin.mp3', 0.7);

                // After showing result, transition to GAME START
                setTimeout(() => {
                    setCoinTossPhase('DONE');
                    setIsGameStartAnim(true);
                    setTimeout(() => {
                        setIsGameStartAnim(false);
                    }, 1200);
                }, 1500);
                return;
            }

            // GAME_STATE: Full state sync from HOST
            // JOIN relies on this for pendingEffects resolution to avoid RNG desync
            if (msg.type === 'GAME_STATE') {
                console.log('[GameScreen] JOIN: Received GAME_STATE sync from HOST');
                dispatch({ type: 'SYNC_STATE', payload: msg.payload } as any);
                // Reset processing flags since state is now synced from HOST
                setIsProcessingEffect(false);
                isProcessingEffectRef.current = false;
                processingHandledRef.current = null;
                // CRITICAL FIX: Clear animatingCards and its timeout to prevent frozen card display
                // This ensures the card animation doesn't get stuck when HOST syncs state
                setAnimatingCards([]);
                if (effectTimeoutRef.current) {
                    clearTimeout(effectTimeoutRef.current);
                    effectTimeoutRef.current = null;
                }
                // CRITICAL FIX: Reset card play lock to prevent stuck state in online play
                // Only reset if there's no ongoing animation to prevent interrupting card play
                if (!playingCardAnimRef.current && !evolveAnimationRef.current) {
                    cardPlayLockRef.current = false;
                }
                return;
            }

            // EVOLVE_ANIM: Remote evolve animation start (before game state changes)
            if (msg.type === 'EVOLVE_ANIM') {
                const { playerId, followerIndex, useSep, targetId, instanceId: remoteInstanceId } = msg.payload;
                const targetFollower = gameState.players[playerId]?.board[followerIndex];
                if (targetFollower) {
                    // Use card's evolvedImageUrl directly, or fallback to definition
                    const evolvedImageUrl = targetFollower.evolvedImageUrl || getCardDefinition(targetFollower.id)?.evolvedImageUrl;

                    // CRITICAL: Find visual index by matching instanceId in visualOpponentBoard
                    // followerIndex is the actual board index, but opponentBoardRefs uses visual board indices
                    // Prefer instanceId from network message for accuracy, fallback to local lookup
                    const targetInstanceId = remoteInstanceId || (targetFollower as any).instanceId;
                    const visualIndex = visualOpponentBoard.findIndex(
                        (c: any) => c && c.instanceId === targetInstanceId
                    );

                    // Get opponent's board element for accurate position (use visual index)
                    // Since playerId is the remote player, their board is shown as opponentBoard (top of screen)
                    const cardEl = visualIndex >= 0 ? opponentBoardRefs.current[visualIndex] : null;
                    const currentScale = scaleInfoRef.current.scale;
                    const screenCenterY = window.innerHeight / 2;

                    // Fallback position: center of opponent's board area
                    // Opponent board Y = screenCenterY - 70 * scale (center of card slot)
                    let startX = window.innerWidth / 2;
                    let startY = screenCenterY - 70 * currentScale;

                    if (cardEl) {
                        const rect = cardEl.getBoundingClientRect();
                        startX = rect.left + rect.width / 2;
                        startY = rect.top + rect.height / 2;
                    }

                    setEvolveAnimation({
                        card: targetFollower,
                        evolvedImageUrl,
                        startX,
                        startY,
                        phase: 'ZOOM_IN',
                        followerIndex, // Keep actual board index for engine processing
                        sourcePlayerId: playerId,
                        useSep: useSep || false,
                        targetId,
                        isRemote: true
                    });

                    playSE('fon.mp3', 0.7);
                }
                return;
            }

            // PLAY_CARD_ANIM: Remote card play animation start
            if (msg.type === 'PLAY_CARD_ANIM') {
                const { playerId, card } = msg.payload;
                if (card) {
                    // Get opponent's board for final position calculation
                    const opponentBoard = gameState.players[playerId]?.board || [];
                    const boardIndex = opponentBoard.filter((c: any) => c !== null).length;

                    // Use screen coordinates with scale
                    const currentScale = scaleInfoRef.current.scale;
                    const screenCenterX = window.innerWidth / 2;
                    const screenCenterY = window.innerHeight / 2;

                    // Start from opponent's hand area (top of screen, scaled with 0.6 transform)
                    const startX = screenCenterX;
                    const startY = 80 * currentScale; // Approximate center of opponent's hand
                    const targetX = screenCenterX;
                    const targetY = screenCenterY - 100 * currentScale;

                    // Calculate final board position in screen coordinates
                    // Opponent board is at: top = screenCenterY - CARD_HEIGHT * scale / 2 - 70 * scale
                    // Center of card = top + CARD_HEIGHT * scale / 2 = screenCenterY - 70 * scale
                    const boardCount = Math.max(1, boardIndex + 1);
                    const totalWidth = (boardCount - 1) * CARD_SPACING * currentScale;
                    const startOffset = -totalWidth / 2;
                    const offsetX = startOffset + boardIndex * CARD_SPACING * currentScale;
                    const finalX = screenCenterX + offsetX;
                    const finalY = screenCenterY - 70 * currentScale; // Opponent's board Y position (center of card)

                    if (card.type === 'SPELL') {
                        // Spell animation - show card flying to center then fade
                        setPlayingCardAnim({
                            card,
                            sourceIndex: -1, // Remote player's card
                            startX,
                            startY,
                            targetX,
                            targetY,
                            playerClass: opponent?.class || 'SENKA',
                            onComplete: () => {
                                setPlayingCardAnim(null);
                            }
                        });
                    } else {
                        // Follower animation
                        setPlayingCardAnim({
                            card,
                            sourceIndex: -1, // Remote player's card
                            startX,
                            startY,
                            targetX,
                            targetY,
                            finalX,
                            finalY,
                            playerClass: opponent?.class || 'SENKA',
                            onComplete: () => {
                                playSE('gan.mp3', 0.6);
                                triggerShake();
                                setPlayingCardAnim(null);
                            }
                        });
                    }
                }
                return;
            }

            // REMATCH_REQUEST: Opponent wants a rematch
            if (msg.type === 'REMATCH_REQUEST') {
                console.log('[GameScreen] Opponent requested rematch');
                setOpponentRematchRequested(true);
                return;
            }

            // REMATCH_ACCEPT: Opponent accepted rematch - start new game
            if (msg.type === 'REMATCH_ACCEPT') {
                console.log('[GameScreen] Opponent accepted rematch - starting new game');
                // Both players agreed - start rematch with currently selected deck
                startRematch(currentPlayerClass);
                return;
            }

            // STAMP: Opponent sent a stamp
            // ※ スタンプはゲーム状態に一切影響を与えない独立した処理
            if (msg.type === 'STAMP') {
                console.log('[GameScreen] Opponent sent stamp:', msg.stampId);

                // 前のタイマーをクリア（連続受信対応）
                if (stampDisplayTimerRef.current) {
                    clearTimeout(stampDisplayTimerRef.current);
                    stampDisplayTimerRef.current = null;
                }

                // スタンプSEを再生
                const stampSE = getStampSE(msg.stampId);
                if (stampSE) {
                    playSE(stampSE, 0.6);
                }

                const stamp: StampDisplay = {
                    stampId: msg.stampId,
                    playerId: opponentPlayerId,
                    playerClass: msg.playerClass || opponent?.class || 'SENKA',
                    timestamp: Date.now()
                };
                // 一度nullにしてから設定（連続受信時のアニメーションリセット用）
                setDisplayedStamp(null);
                requestAnimationFrame(() => {
                    setDisplayedStamp(stamp);
                });
                // 一定時間後に非表示
                stampDisplayTimerRef.current = setTimeout(() => {
                    setDisplayedStamp(prev => prev?.timestamp === stamp.timestamp ? null : prev);
                    stampDisplayTimerRef.current = null;
                }, 3000);
                return;
            }

            // ACTION: Individual game actions
            if (msg.type === 'ACTION') {
                const action = msg.payload;
                console.log('[GameScreen] Processing remote action:', action.type, 'from player:', action.playerId);

                // Dispatch the action with isRemote flag
                dispatch({ ...action, isRemote: true } as any);

                // Handle Remote Visual Effects
                if (action.type === 'ATTACK') {
                    const { playerId, payload } = action;
                    const attackerPlayer = gameState.players[playerId];
                    const attackerCard = attackerPlayer?.board[payload.attackerIndex];
                    const targetIdx = payload.targetIsLeader ? -1 : payload.targetIndex;
                    const targetPid = playerId === 'p1' ? 'p2' : 'p1';
                    if (attackerCard) {
                        // Get target instanceId for accurate visual positioning
                        const targetPlayer = gameState.players[targetPid];
                        const targetCard = payload.targetIsLeader ? null : targetPlayer?.board[payload.targetIndex];
                        const targetInstanceId = targetCard ? (targetCard as any).instanceId : undefined;
                        playEffect(attackerCard.attackEffectType, targetPid, targetIdx, targetInstanceId);
                    }
                } else if (action.type === 'PLAY_CARD') {
                    // Note: Animation is now handled by PLAY_CARD_ANIM message
                    // This just applies the game state change
                } else if (action.type === 'EVOLVE') {
                    // Note: Animation is now handled by EVOLVE_ANIM message
                    // This just applies the game state change
                } else if (action.type === 'END_TURN') {
                    console.log('[GameScreen] Remote END_TURN received, turn switching to:',
                        action.playerId === 'p1' ? 'p2' : 'p1');
                    // CRITICAL FIX: Reset isEndingTurnRef when receiving remote END_TURN
                    // This prevents a stuck handleEndTurn from dispatching END_TURN again
                    // after the turn has already switched
                    isEndingTurnRef.current = false;
                }
            }
        };

        adapter.onMessage(handleMessage);

        adapter.onClose(() => {
            alert('相手との接続が切断されました。\nタイトルに戻ります。');
            onLeave();
        });

        // Cleanup: PeerJS doesn't have removeListener, but we can set a new one
        return () => {
            // Note: PeerJS replaces the callback when onMessage is called again
        };
    }, [adapter, gameState, playSE, playEffect, gameMode, onLeave]);  // Removed 'connected' from deps to avoid re-registering

    // AI Logic State
    const aiProcessing = React.useRef(false);
    const lastProcessedTurn = React.useRef<string | null>(null);

    // Generic Effect Processing Flag - MOVED UP

    // --- Drag State Ref for Smooth Performance ---
    const dragStateRef = React.useRef<{
        sourceType: 'HAND' | 'BOARD' | 'EVOLVE';
        sourceIndex: number;
        sourceInstanceId?: string; // Add instanceId
        startX: number; // Screen coordinates
        startY: number; // Screen coordinates
        currentX: number; // Screen coordinates
        currentY: number; // Screen coordinates
        offsetX: number;
        offsetY: number;
        useSep?: boolean;
    } | null>(null);

    // Card Play Animation State
    const [playingCardAnim, setPlayingCardAnim] = React.useState<{
        card: any;
        sourceIndex: number; // Index in hand (to hide during animation)
        startX: number; // Screen coordinates
        startY: number; // Screen coordinates
        targetX: number; // Screen coordinates (intermediate flying point)
        targetY: number; // Screen coordinates (intermediate flying point)
        finalX?: number; // Screen coordinates (Board destination X)
        finalY?: number; // Screen coordinates (Board destination Y)
        playerClass: ClassType; // Class of the player playing the card (for sleeve)
        onComplete: () => void;
    } | null>(null);

    // Evolution Animation State
    const [evolveAnimation, setEvolveAnimation] = React.useState<{
        card: any;
        evolvedImageUrl?: string;
        startX: number; // Screen coordinates
        startY: number; // Screen coordinates
        phase: 'ZOOM_IN' | 'WHITE_FADE' | 'FLIP' | 'REVEAL' | 'ZOOM_OUT' | 'LAND';
        followerIndex: number;
        useSep: boolean;
        targetId?: string;
        isRemote?: boolean;
        sourcePlayerId?: string;
    } | null>(null);

    // --- Card Play Lock to prevent double play ---
    const cardPlayLockRef = React.useRef(false);
    const lastPlayedInstanceIdRef = React.useRef<string | null>(null);
    // --- End Turn Lock (moved here for access in handleMessage) ---
    const isEndingTurnRef = React.useRef(false);

    // --- State Refs for AI Timing (Moved here to ensure access to all states) ---
    const activeEffectsRef = React.useRef(activeEffects);
    const animatingCardsRef = React.useRef(animatingCards);
    const playingCardAnimRef = React.useRef(playingCardAnim);
    const evolveAnimationRef = React.useRef(evolveAnimation);

    useEffect(() => {
        activeEffectsRef.current = activeEffects;
        animatingCardsRef.current = animatingCards;
        playingCardAnimRef.current = playingCardAnim;
        evolveAnimationRef.current = evolveAnimation;
    }, [activeEffects, animatingCards, playingCardAnim, evolveAnimation]);

    // --- Final Cannon Special SE ---
    useEffect(() => {
        if (playingCardAnim && playingCardAnim.card.name === '天下布舞・ファイナルキャノン') {
            if (audioSettings.seEnabled) {
                const beamAudio = new Audio(getAssetUrl('/se/beam.mp3'));
                beamAudio.volume = audioSettings.se * 0.8;
                beamAudio.play().catch(e => console.warn("SE Play prevented", e));
            }
        }
    }, [playingCardAnim, audioSettings]);

    useEffect(() => {
        visualPlayerBoardRef.current = visualPlayerBoard;
        visualOpponentBoardRef.current = visualOpponentBoard;
    }, [visualPlayerBoard, visualOpponentBoard]);

    // カード座標キャッシュの更新（AoEダメージ表示用）
    // ボードのカードが変更された時に、全カードの座標をキャッシュする
    useEffect(() => {
        // ローカルな座標取得関数
        const getCoordsFromElement = (el: HTMLElement) => {
            const rect = el.getBoundingClientRect();
            return { x: rect.left + rect.width / 2, y: rect.top };
        };

        // プレイヤーボードのカード座標をキャッシュ
        visualPlayerBoard.forEach((card, idx) => {
            if (card && card.instanceId) {
                const el = playerBoardRefs.current[idx];
                if (el) {
                    const coords = getCoordsFromElement(el);
                    if (coords.x !== 0 || coords.y !== 0) {
                        cardPositionsRef.current.set(card.instanceId, coords);
                    }
                }
            }
        });
        // 相手ボードのカード座標をキャッシュ
        visualOpponentBoard.forEach((card, idx) => {
            if (card && card.instanceId) {
                const el = opponentBoardRefs.current[idx];
                if (el) {
                    const coords = getCoordsFromElement(el);
                    if (coords.x !== 0 || coords.y !== 0) {
                        cardPositionsRef.current.set(card.instanceId, coords);
                    }
                }
            }
        });
    }, [visualPlayerBoard, visualOpponentBoard]);

    // Handle Evolve with Animation
    // CRITICAL: Use instanceId to ensure animation and processing target the same card
    const handleEvolveWithAnimation = (visualIndex: number, useSep: boolean, targetId?: string, instanceId?: string) => {
        const playerBoard = playerRef.current.board;

        // Find actual board index using instanceId (critical for correct targeting)
        const actualFollowerIndex = instanceId
            ? playerBoard.findIndex(c => c && (c as any).instanceId === instanceId)
            : visualIndex;

        const card = actualFollowerIndex >= 0 ? playerBoard[actualFollowerIndex] : null;
        if (!card) return;

        // Already evolved cards cannot evolve or super-evolve again
        if (card.hasEvolved) {
            console.log('[GameScreen] Cannot evolve: card already evolved');
            return;
        }

        // Get the card's current position on the board (using visual index for display position)
        const cardEl = playerBoardRefs.current[visualIndex];

        // Default to board center if card element is missing
        let startX = window.innerWidth / 2;
        let startY = window.innerHeight / 2;

        if (cardEl) {
            const rect = cardEl.getBoundingClientRect();
            startX = rect.left + rect.width / 2;
            startY = rect.top + rect.height / 2;
        }

        // Send animation start message to opponent immediately (for sync)
        // CRITICAL: Send actualFollowerIndex (real board index) for engine processing
        // Also send instanceId for accurate visual positioning on opponent's screen
        const cardInstanceId = (card as any).instanceId;
        if (gameMode !== 'CPU' && connected && adapter) {
            adapter.send({
                type: 'EVOLVE_ANIM',
                payload: { playerId: currentPlayerId, followerIndex: actualFollowerIndex, useSep, targetId, instanceId: cardInstanceId }
            });
        }

        setEvolveAnimation({
            card,
            evolvedImageUrl: card.evolvedImageUrl,
            startX,
            startY,
            phase: 'ZOOM_IN',
            followerIndex: actualFollowerIndex, // Use actual board index for engine processing
            useSep,
            targetId,
            sourcePlayerId: currentPlayerId
        });
        playSE('fon.mp3', 0.7); // Evolve sound
    };

    // Ref for pending evolve action (to dispatch after animation completes)
    const pendingEvolveRef = React.useRef<{
        followerIndex: number;
        useSep: boolean;
        targetId?: string;
        isRemote?: boolean;
        playerId: string; // Add playerId
        sourcePlayerId?: string;
    } | null>(null);

    // Handle Evolution Animation Phase Change - use useCallback to prevent unnecessary re-renders
    const handleEvolvePhaseChange = React.useCallback((newPhase: 'ZOOM_IN' | 'WHITE_FADE' | 'FLIP' | 'REVEAL' | 'ZOOM_OUT' | 'LAND' | 'DONE') => {
        console.log('[GameScreen] handleEvolvePhaseChange:', newPhase);
        if (newPhase === 'WHITE_FADE') {
            playSE('fon.mp3', 0.7); // Evolve sound for all (including opponent)
        }
        if (newPhase === 'LAND') {
            playSE('gan.mp3', 0.6);
        }
        if (newPhase === 'DONE') {
            // Animation complete - Execute Evolve Action
            const currentAnim = evolveAnimationRef.current;
            if (currentAnim && !currentAnim.isRemote) {
                const executePlayerId = currentAnim.sourcePlayerId || currentPlayerId;
                const action = {
                    type: 'EVOLVE' as const,
                    playerId: executePlayerId,
                    payload: {
                        followerIndex: currentAnim.followerIndex,
                        useSep: currentAnim.useSep,
                        targetId: currentAnim.targetId
                    }
                };

                // Local Apply
                dispatch(action as any);

                // Network Send
                if (adapter && gameMode !== 'CPU') {
                    adapter.send({ type: 'ACTION', payload: action });
                }
            }
            // Clear animation
            setEvolveAnimation(null);
        } else {
            setEvolveAnimation(prev => prev ? { ...prev, phase: newPhase } : null);
        }
    }, [adapter, dispatch, gameMode, currentPlayerId, playSE]);

    // Handle Play Card with Animation
    const handlePlayCard = (index: number, startX: number, startY: number) => {
        // Use Ref to ensure we have the latest player state
        const currentPlayer = playerRef.current;
        const card = currentPlayer.hand[index];

        // CRITICAL: Prevent double card play
        if (!card) {
            console.warn('[handlePlayCard] Card not found at index:', index);
            return;
        }

        // Check if this exact card was already played (using instanceId)
        if (card.instanceId && lastPlayedInstanceIdRef.current === card.instanceId) {
            console.warn('[handlePlayCard] Duplicate play blocked for instanceId:', card.instanceId);
            return;
        }

        // Check card play lock
        if (cardPlayLockRef.current) {
            console.warn('[handlePlayCard] Card play locked, ignoring duplicate call');
            return;
        }

        // Set lock and track played card
        cardPlayLockRef.current = true;
        lastPlayedInstanceIdRef.current = card.instanceId || null;

        // カードをプレイする瞬間にSE再生
        playSE('card.mp3', 0.5);

        // Check if card needs a target and identify which side
        const fanfareTrigger = card.triggers?.find(t => t.trigger === 'FANFARE');
        const firstEffect = fanfareTrigger?.effects[0];

        // Extended logic: identify target side based on effect type or targetType
        let allowedTargetPlayerId = opponentPlayerId; // Default to Enemy
        const isAllyTarget = firstEffect?.targetType === 'SELECT_ALLY_FOLLOWER' || firstEffect?.targetType === 'SELECT_OTHER_ALLY_FOLLOWER';
        if (firstEffect) {
            // SELECT_ALLY_FOLLOWER and SELECT_OTHER_ALLY_FOLLOWER explicitly target own followers
            if (isAllyTarget) {
                allowedTargetPlayerId = currentPlayerId;
            } else if (['GRANT_PASSIVE', 'BUFF_STATS', 'HEAL_FOLLOWER'].includes(firstEffect.type)) {
                // Legacy check for effect types that typically target self
                allowedTargetPlayerId = currentPlayerId;
            }
        }

        const targetTypes = ['SELECT_FOLLOWER', 'SELECT_ALLY_FOLLOWER', 'SELECT_OTHER_ALLY_FOLLOWER'];
        const needsTarget =
            (card.type === 'SPELL' && card.triggers?.some(t => t.effects.some(e => e.targetType && targetTypes.includes(e.targetType)))) ||
            (card.type === 'FOLLOWER' && (
                (card.triggerAbilities?.FANFARE?.targetType && targetTypes.includes(card.triggerAbilities.FANFARE.targetType)) ||
                card.triggers?.some(t => t.trigger === 'FANFARE' && t.effects.some(e => e.targetType && targetTypes.includes(e.targetType)))
            ));

        // Check valid targets on the appropriate board
        // AURA: 相手のカード効果で選べない
        // STEALTH: 相手から攻撃対象に選べない＆相手のカード効果で選べない
        const targetBoard = gameStateRef.current.players[allowedTargetPlayerId].board;
        const hasValidTargets = targetBoard.some(c =>
            c && (
                allowedTargetPlayerId === currentPlayerId || // Own units are usually always valid
                (!c.passiveAbilities?.includes('STEALTH') && !c.passiveAbilities?.includes('AURA')) // STEALTH and AURA prevent targeting
            )
        );

        console.log(`[handlePlayCard] needsTarget: ${needsTarget}, allowedTarget: ${allowedTargetPlayerId}, hasValidTargets: ${hasValidTargets}`);

        if (needsTarget && hasValidTargets) {
            setTargetingState({ type: 'PLAY', sourceIndex: index, sourceInstanceId: card.instanceId, allowedTargetPlayerId });
            setDragState(null); // Stop dragging
            return;
        }

        // Determine target position in screen coordinates (Center of game area - aligned with leader)
        const targetX = window.innerWidth / 2;
        const targetY = window.innerHeight / 2;

        // Calculate board position for landing (Followers only)
        let finalX: number | undefined;
        let finalY: number | undefined;

        if (card.type === 'FOLLOWER') {
            const currentBoard = gameStateRef.current.players[currentPlayerId].board;
            const validCards = currentBoard.filter(c => c !== null);
            const newBoardSize = validCards.length + 1;
            const newIndex = validCards.length;

            const spacing = CARD_SPACING * scale; // Use correct constant
            const offsetX = (newIndex - (newBoardSize - 1) / 2) * spacing;

            // Calculate Board Center in screen coordinates
            const boardAreaRect = boardRef.current?.getBoundingClientRect();
            const boardCenterX = boardAreaRect ? boardAreaRect.left + boardAreaRect.width / 2 : window.innerWidth / 2;

            finalX = boardCenterX + offsetX;

            // Determine Y: Player slots are centered in board area
            finalY = (window.innerHeight / 2) + (70 * scale);
        }

        const onComplete = () => {
            if (card.type !== 'SPELL') {
                playSE('gan.mp3', 0.6); // Land sound
                triggerShake(); // Trigger Shake on Land ONLY if not Spell
            }
            // Dispatch only once
            // Note: targetId should be retrieved from the current interaction state if applicable
            dispatchAndSend({ type: 'PLAY_CARD', playerId: currentPlayerId, payload: { cardIndex: index, instanceId: card.instanceId } });
            setPlayingCardAnim(null);

            // Release card play lock after processing
            setTimeout(() => {
                cardPlayLockRef.current = false;
            }, 100); // Small delay to prevent rapid re-triggering
        };

        // Send PLAY_CARD_ANIM to opponent for synchronized animation
        if (gameMode !== 'CPU' && connected && adapter) {
            adapter.send({
                type: 'PLAY_CARD_ANIM',
                payload: { playerId: currentPlayerId, cardIndex: index, card }
            });
        }

        setPlayingCardAnim({
            card,
            sourceIndex: index,
            startX,
            startY,
            targetX,
            targetY,
            finalX,
            finalY,
            playerClass: player?.class || 'SENKA',
            onComplete
        });

        // Safety fallback (2s)
        setTimeout(() => {
            setPlayingCardAnim(prev => {
                if (prev?.card.id === card.id) {
                    // If still playing same card, force complete
                    onComplete();
                    return null;
                }
                return prev;
            });
        }, 2000);
    };

    // Dispatch Helper
    const dispatchAndSend = (action: any) => {
        dispatch(action);
        if (gameMode !== 'CPU' && connected && !action.isRemote) {
            adapter?.send({ type: 'ACTION', payload: action });
        }
    };

    // Process pending evolve action when animation completes
    React.useEffect(() => {
        if (!evolveAnimation && pendingEvolveRef.current) {
            const pending = pendingEvolveRef.current;
            pendingEvolveRef.current = null;
            console.log('[GameScreen] Dispatching pending evolve action for:', pending.playerId);
            dispatchAndSend({
                type: 'EVOLVE',
                playerId: pending.playerId, // Use stored playerId
                payload: {
                    followerIndex: pending.followerIndex,
                    useSep: pending.useSep,
                    targetId: pending.targetId
                }
            });
        }
    }, [evolveAnimation, currentPlayerId, dispatchAndSend]);

    // Refs for stable access in event handlers
    const playerRef = React.useRef(player);
    const gameStateRef = React.useRef(gameState);
    React.useEffect(() => {
        playerRef.current = player;
        gameStateRef.current = gameState;
    }, [player, gameState]);

    // Removed Duplicate gameStateRef
    // gameStateRef is defined above now.



    const ignoreClickRef = React.useRef(false);

    // --- Detect Draw (Hand Size Increase) ---
    React.useEffect(() => {
        const prev = prevHandSizeRef.current;
        const currP = player.hand.length;
        const currO = opponent.hand.length;

        if (currP > prev.player) {
            // Player Drew - show all cards simultaneously
            const count = currP - prev.player;
            setDrawAnimation({ isPlayer: true, count });
            playSE('card.mp3', 0.5);
            setTimeout(() => setDrawAnimation(null), DRAW_ANIMATION_DURATION);
        }
        if (currO > prev.opponent) {
            // Opponent Drew - show all cards simultaneously
            const count = currO - prev.opponent;
            setDrawAnimation({ isPlayer: false, count });
            playSE('card.mp3', 0.5);
            setTimeout(() => setDrawAnimation(null), DRAW_ANIMATION_DURATION);
        }

        prevHandSizeRef.current = { player: currP, opponent: currO };
    }, [player.hand.length, opponent.hand.length, audioSettings, playSE]);

    // --- AI Logic (Restored) ---

    // Reset card play lock when turn changes to player's turn
    // Also reset isEndingTurn to prevent stale state from blocking next turn
    useEffect(() => {
        if (gameState.activePlayerId === currentPlayerId) {
            // Reset locks at the start of player's turn
            console.log('[GameScreen] Player turn started - resetting card play lock and ending turn state');
            cardPlayLockRef.current = false;
            lastPlayedInstanceIdRef.current = null;
            // CRITICAL FIX: Also reset isEndingTurnRef to prevent stale async handlers
            isEndingTurnRef.current = false;
        }
    }, [gameState.activePlayerId, gameState.turnCount, currentPlayerId]);

    // Additional safety: Reset lock if it's been stuck for too long (failsafe for online play)
    useEffect(() => {
        if (gameMode === 'CPU') return; // Only for online play

        const lockCheckInterval = setInterval(() => {
            // If lock is held but no animations are running, release it
            if (cardPlayLockRef.current &&
                !playingCardAnimRef.current &&
                !evolveAnimationRef.current &&
                !targetingState &&
                gameState.activePlayerId === currentPlayerId) {
                console.warn('[GameScreen] Safety release: Card play lock was stuck, releasing');
                cardPlayLockRef.current = false;
            }
        }, 3000); // Check every 3 seconds

        return () => clearInterval(lockCheckInterval);
    }, [gameMode, targetingState, gameState.activePlayerId, currentPlayerId]);

    useEffect(() => {
        if (gameMode !== 'CPU') return;

        const currentTurnKey = `${gameState.turnCount}-${gameState.activePlayerId}`;

        // Reset processing flag if turn changed to player
        if (gameState.activePlayerId === currentPlayerId) {
            aiProcessing.current = false;
            // Don't reset lastProcessedTurn yet, or we might re-process if ID flips quickly?
            // Actually, if it's player turn, we don't care.
            return;
        }

        // AI Turn
        if (gameState.activePlayerId === opponentPlayerId) {
            // Check if already running or already processed this specific turn instance
            if (aiProcessing.current || lastProcessedTurn.current === currentTurnKey) return;

            const runAiTurn = async () => {
                aiProcessing.current = true;
                lastProcessedTurn.current = currentTurnKey;

                // Helper to wait for all visual and logical effects to settle
                const waitForIdle = async (initialDelay = 300) => {
                    // Initial wait for state propagation
                    await new Promise(r => setTimeout(r, initialDelay));

                    const checkIdle = () => {
                        const state = gameStateRef.current;
                        const hasPending = state.pendingEffects && state.pendingEffects.length > 0;
                        const hasActiveEffects = activeEffectsRef.current.length > 0;
                        const isAnimatingCards = animatingCardsRef.current.length > 0;
                        const isPlayingCard = playingCardAnimRef.current !== null;
                        const isEvolving = evolveAnimationRef.current !== null;

                        return !hasPending && !hasActiveEffects && !isAnimatingCards && !isPlayingCard && !isEvolving;
                    };

                    // Wait until idle (with timeout to prevent infinite loop - increased for evolution animations)
                    let waitCount = 0;
                    while (!checkIdle() && waitCount < 60) { // 60 * 100ms = 6 seconds max wait
                        await new Promise(r => setTimeout(r, 100));
                        waitCount++;

                        // pendingEffectsが滞留している場合、useEffectが発火していない可能性があるので
                        // 強制的にRESOLVE_EFFECTをdispatchして処理を進める
                        const state = gameStateRef.current;
                        if (state.pendingEffects && state.pendingEffects.length > 0 && !isProcessingEffectRef.current) {
                            console.log('[waitForIdle] Forcing RESOLVE_EFFECT for stuck pending effect');
                            const current = state.pendingEffects[0];
                            dispatch({
                                type: 'RESOLVE_EFFECT',
                                playerId: current.sourcePlayerId,
                                payload: { targetId: current.targetId }
                            });
                            await new Promise(r => setTimeout(r, 200)); // 処理待ち
                        }
                    }
                };

                // --- AI Helper Functions ---

                // Check if target is immune to follower damage (for attack decisions)
                const isImmuneToFollowerAttack = (target: any, _state: any): boolean => {
                    if (!target) return false;
                    // IMMUNE_TO_FOLLOWER_DAMAGE: Always immune to follower attacks
                    if (target.passiveAbilities?.includes('IMMUNE_TO_FOLLOWER_DAMAGE')) return true;
                    // IMMUNE_TO_DAMAGE_MY_TURN: Only immune during owner's turn
                    // AI is attacking during AI's turn, so target's "my turn" is player's turn (not now)
                    // So this immunity doesn't apply when AI attacks
                    return false;
                };

                // Check if attacker would die attacking target (including BANE)
                const wouldDieAttacking = (attacker: any, target: any): boolean => {
                    if (!target || !attacker) return false;
                    // BANE kills on any damage (unless attacker has BARRIER)
                    if (target.passiveAbilities?.includes('BANE') && !attacker.hasBarrier) {
                        return true; // BANE always kills attacker
                    }
                    return (target.currentAttack || 0) >= attacker.currentHealth;
                };

                // Check if attacker can kill target
                const canKillTarget = (attacker: any, target: any): boolean => {
                    if (!target || !attacker) return false;
                    // Check BANE (instant kill) but consider BARRIER
                    if (attacker.passiveAbilities?.includes('BANE')) {
                        return !target.hasBarrier;
                    }
                    return attacker.currentAttack >= target.currentHealth;
                };

                // Score a card for playing (higher = better)
                const scoreCardForPlaying = (card: any, state: any): number => {
                    let score = card.cost * 10; // Base score from cost
                    const enemyBoard = state.players[currentPlayerId].board.filter((c: any) => c !== null);
                    const aiBoard = state.players[opponentPlayerId].board.filter((c: any) => c !== null);

                    // Bonus for removal effects when enemy has board
                    if (enemyBoard.length > 0) {
                        const triggers = card.triggers || [];
                        for (const trig of triggers) {
                            if (trig.trigger === 'FANFARE') {
                                for (const eff of trig.effects || []) {
                                    if (['DESTROY', 'RANDOM_DESTROY', 'DAMAGE', 'SELECT_DAMAGE', 'AOE_DAMAGE'].includes(eff.type)) {
                                        score += 30;
                                    }
                                }
                            }
                        }
                    }

                    // Bonus for STORM when enemy leader is low HP
                    const playerHp = state.players[currentPlayerId].hp;
                    if (card.passiveAbilities?.includes('STORM') && playerHp <= 10) {
                        score += 50;
                    }

                    // Penalty if board is full
                    if (card.type === 'FOLLOWER' && aiBoard.length >= 5) {
                        score -= 100;
                    }

                    // Bonus for WARD when enemy has threats
                    if (card.passiveAbilities?.includes('WARD') && enemyBoard.length > 0) {
                        score += 20;
                    }

                    return score;
                };

                // Score evolution target (higher = better)
                const scoreEvolveTarget = (card: any, _idx: number, state: any, useSuperEvolve: boolean): number => {
                    let score = 0;
                    const enemyBoard = state.players[currentPlayerId].board.filter((c: any) => c !== null);

                    // Base: Cards with evolve effects are priority
                    const triggers = card.triggers || [];
                    for (const trig of triggers) {
                        const trigType = useSuperEvolve ? 'SUPER_EVOLVE' : 'EVOLVE';
                        if (trig.trigger === trigType) {
                            for (const eff of trig.effects || []) {
                                // Damage/Destroy effects are valuable when enemy has board
                                if (['DESTROY', 'RANDOM_DESTROY', 'DAMAGE', 'SELECT_DAMAGE', 'AOE_DAMAGE'].includes(eff.type)) {
                                    score += enemyBoard.length > 0 ? 50 : 10;
                                }
                                // Summon effects are always good
                                if (['SUMMON_CARD', 'SUMMON_CARD_RUSH'].includes(eff.type)) {
                                    score += 40;
                                }
                                // Buff effects
                                if (eff.type === 'BUFF_STATS') {
                                    score += 30;
                                }
                                // Draw
                                if (eff.type === 'DRAW') {
                                    score += 25;
                                }
                                // Generate card
                                if (eff.type === 'GENERATE_CARD') {
                                    score += 20;
                                }
                            }
                        }
                    }

                    // Cards that can attack immediately get +2/+2 value
                    if (card.canAttack) {
                        score += 20;
                    }

                    // Higher attack cards benefit more from +2/+2
                    score += (card.currentAttack || 0) * 3;

                    return score;
                };

                // Find best target for attack
                const findBestAttackTarget = (attacker: any, playerBoard: any[], state: any): { index: number, isLeader: boolean } => {
                    const canAttackLeader = attacker.passiveAbilities?.includes('STORM') || attacker.turnPlayed !== state.turnCount;

                    // Filter targetable enemies
                    const targetableEnemies = playerBoard
                        .map((c, i) => ({ c, i }))
                        .filter(({ c }) => c !== null && !c.passiveAbilities?.includes('STEALTH') && !c.passiveAbilities?.includes('AURA'));

                    // Check for WARD - must attack Ward first (unless attacker has STEALTH/hadStealth)
                    const attackerIgnoresWard = attacker.passiveAbilities?.includes('STEALTH') || attacker.hadStealth;
                    if (!attackerIgnoresWard) {
                        const wardTarget = targetableEnemies.find(({ c }) => c.passiveAbilities?.includes('WARD'));
                        if (wardTarget) {
                            // Must attack ward, but check if it's immune
                            if (!isImmuneToFollowerAttack(wardTarget.c, state)) {
                                return { index: wardTarget.i, isLeader: false };
                            }
                            // Ward is immune - we can't attack anything useful, skip this attacker
                            return { index: -1, isLeader: false };
                        }
                    }

                    // No ward or ignoring ward - find best target
                    let bestTarget = { index: -1, isLeader: canAttackLeader, score: canAttackLeader ? 0 : -1000 };

                    for (const { c: target, i } of targetableEnemies) {
                        // Skip immune targets
                        if (isImmuneToFollowerAttack(target, state)) continue;

                        let targetScore = 0;
                        const attackerIsEvolved = attacker.isEvolved;
                        const targetHasBane = target.passiveAbilities?.includes('BANE');
                        const willDie = wouldDieAttacking(attacker, target);

                        // Can we kill it?
                        if (canKillTarget(attacker, target)) {
                            targetScore += 50;
                            // Bonus for killing high-value targets
                            targetScore += (target.currentAttack || 0) * 5;
                            // Extra bonus for killing without dying
                            if (!willDie) {
                                targetScore += 30;
                            } else {
                                // Dying to kill - consider if it's worth it
                                // Heavy penalty for evolved followers dying to BANE
                                if (targetHasBane && attackerIsEvolved) {
                                    targetScore -= 60; // Very bad trade
                                } else if (targetHasBane) {
                                    targetScore -= 30; // Still bad trade unless target is very valuable
                                }
                            }
                            // Target has dangerous abilities (bonus only if we survive or target is worth it)
                            if (targetHasBane && !willDie) targetScore += 40; // Safe BANE kill is great
                            if (target.passiveAbilities?.includes('STORM')) targetScore += 30;
                            if (target.passiveAbilities?.includes('DOUBLE_ATTACK')) targetScore += 35;
                        } else {
                            // Can't kill the target
                            if (!willDie && attacker.currentAttack >= target.currentHealth / 2) {
                                // We survive and deal significant damage - maybe worth it
                                targetScore += 10;
                            } else if (willDie) {
                                // We die without killing - very bad
                                targetScore -= 50;
                                // Even worse if we're evolved
                                if (attackerIsEvolved) {
                                    targetScore -= 40;
                                }
                                // Slightly less bad if target is very valuable
                                if ((target.currentAttack || 0) >= 5) targetScore += 10;
                            }
                        }

                        if (targetScore > bestTarget.score) {
                            bestTarget = { index: i, isLeader: false, score: targetScore };
                        }
                    }

                    // If no good follower target and can attack leader
                    if (canAttackLeader && (bestTarget.index === -1 || bestTarget.score <= 0)) {
                        // Aggro: Attack face
                        return { index: -1, isLeader: true };
                    }

                    return bestTarget;
                };

                // 1. Thinking time (short pause, shorter for HARD)
                const thinkingTime = aiDifficulty === 'EASY' ? 1200 : aiDifficulty === 'HARD' ? 400 : 800;
                await new Promise(resolve => setTimeout(resolve, thinkingTime));
                if (!aiProcessing.current) return;

                // 2. Play Cards (Multiple cards if PP allows - NORMAL/HARD only)
                let cardsPlayedThisTurn = 0;
                const maxCardsToPlay = aiDifficulty === 'EASY' ? 1 : aiDifficulty === 'HARD' ? 5 : 3;

                while (cardsPlayedThisTurn < maxCardsToPlay) {
                    const state = gameStateRef.current;
                    const aiHand = state.players[opponentPlayerId].hand;
                    const aiPp = state.players[opponentPlayerId].pp;
                    const aiBoard = state.players[opponentPlayerId].board.filter((c: any) => c !== null);

                    // Check board space for followers
                    const boardIsFull = aiBoard.length >= 5;

                    // Get playable cards
                    let playable = aiHand
                        .map((c, i) => ({ ...c, originalIndex: i }))
                        .filter(c => c.cost <= aiPp)
                        .filter(c => !(c.type === 'FOLLOWER' && boardIsFull)); // Don't play followers if board is full

                    if (playable.length === 0) break;

                    // Sort by score (HARD) or just cost (EASY/NORMAL)
                    if (aiDifficulty === 'HARD') {
                        playable = playable.sort((a, b) => scoreCardForPlaying(b, state) - scoreCardForPlaying(a, state));
                    } else {
                        playable = playable.sort((a, b) => b.cost - a.cost);
                    }

                    // EASY: Sometimes skip playing
                    if (aiDifficulty === 'EASY' && Math.random() < 0.3 && cardsPlayedThisTurn > 0) {
                        break;
                    }

                    const bestCard = playable[0];

                    // Find best target for card effects
                    let targetId = undefined;
                    const enemyBoard = state.players[currentPlayerId].board;
                    const targetableEnemies = enemyBoard.filter((c: any) =>
                        c &&
                        !c.passiveAbilities?.includes('STEALTH') &&
                        !c.passiveAbilities?.includes('AURA')
                    );

                    if (targetableEnemies.length > 0) {
                        // HARD: Choose best target based on card effect
                        if (aiDifficulty === 'HARD') {
                            // Prefer high-value targets for removal
                            const sortedTargets = [...targetableEnemies].sort((a: any, b: any) => {
                                let scoreA = (a.currentAttack || 0) + (a.currentHealth || 0);
                                let scoreB = (b.currentAttack || 0) + (b.currentHealth || 0);
                                if (a.passiveAbilities?.includes('BANE')) scoreA += 10;
                                if (b.passiveAbilities?.includes('BANE')) scoreB += 10;
                                return scoreB - scoreA;
                            });
                            targetId = sortedTargets[0]!.instanceId;
                        } else {
                            targetId = targetableEnemies[0]!.instanceId;
                        }
                    }

                    // Animation First
                    const startX = window.innerWidth - (20 * scale) - (80 * scale / 2);
                    const startY = (20 * scale) + (110 * scale / 2);
                    const targetX = window.innerWidth / 2;
                    const targetY = window.innerHeight / 2;

                    let finalX: number | undefined;
                    let finalY: number | undefined;

                    if (bestCard.type === 'FOLLOWER') {
                        const currentBoard = gameStateRef.current.players[opponentPlayerId].board;
                        const validCards = currentBoard.filter(c => c !== null);
                        const newBoardSize = validCards.length + 1;
                        const newIndex = validCards.length;

                        const spacing = CARD_SPACING * scale;
                        const offsetX = (newIndex - (newBoardSize - 1) / 2) * spacing;

                        const boardAreaRect = boardRef.current?.getBoundingClientRect();
                        const boardCenterX = boardAreaRect ? boardAreaRect.left + boardAreaRect.width / 2 : window.innerWidth / 2;

                        finalX = boardCenterX + offsetX;
                        finalY = (window.innerHeight / 2) - (70 * scale);
                    }

                    setPlayingCardAnim({
                        card: bestCard,
                        sourceIndex: -1, // CPU player's card (no hiding needed)
                        startX, startY,
                        targetX, targetY,
                        finalX,
                        finalY,
                        playerClass: opponent?.class || 'SENKA',
                        onComplete: () => {
                            if (bestCard.type !== 'SPELL') {
                                playSE('gan.mp3', 0.6); // Land sound for CPU card (Follower only)
                                triggerShake();
                            }
                            dispatch({
                                type: 'PLAY_CARD',
                                playerId: opponentPlayerId,
                                payload: { cardIndex: bestCard.originalIndex, targetId, instanceId: bestCard.instanceId }
                            });

                            // --- AI amandava FANFARE Visuals ---
                            if (bestCard.id === 'c_amandava') {
                                const playerBoard = gameStateRef.current.players[currentPlayerId].board;
                                playerBoard.forEach((c, i) => {
                                    if (c) {
                                        const cardInstanceId = (c as any).instanceId;
                                        setTimeout(() => {
                                            playEffect('SHOT', currentPlayerId, i, cardInstanceId);
                                        }, 200);
                                    }
                                });
                            }

                            // --- AI Azya FANFARE Visuals ---
                            if (bestCard.id === 'c_azya') {
                                setTimeout(() => {
                                    playEffect('THUNDER', currentPlayerId, -1);
                                }, 200);

                                if (targetId) {
                                    const playerBoard = gameStateRef.current.players[currentPlayerId].board;
                                    const targetIdx = playerBoard.findIndex(c => c?.instanceId === targetId);
                                    if (targetIdx !== -1) {
                                        setTimeout(() => {
                                            playEffect('ICE', currentPlayerId, targetIdx, targetId);
                                        }, 400);
                                    }
                                }

                                setTimeout(() => {
                                    const pBoard = gameStateRef.current.players[currentPlayerId].board;
                                    const validTargets = pBoard.filter(c => c !== null);
                                    if (validTargets.length > 0) {
                                        const randomCard = validTargets[Math.floor(Math.random() * validTargets.length)];
                                        const vIdx = pBoard.findIndex(c => c?.instanceId === randomCard?.instanceId);
                                        if (vIdx !== -1) {
                                            playEffect('WATER', currentPlayerId, vIdx, randomCard?.instanceId);
                                        }
                                    }
                                }, 600);
                            }

                            setPlayingCardAnim(null);
                        }
                    });

                    await waitForIdle(600);
                    cardsPlayedThisTurn++;
                }

                // 2.5 Evolve Phase
                {
                    const state = gameStateRef.current;
                    const aiPlayer = state.players[opponentPlayerId];
                    const isFirstPlayer = opponentPlayerId === state.firstPlayerId;
                    const turnCount = state.turnCount;

                    const canSuperEvolveCheck = canSuperEvolve(aiPlayer, turnCount, isFirstPlayer);
                    const canEvolveCheck = canEvolve(aiPlayer, turnCount, isFirstPlayer);

                    if ((canEvolveCheck || canSuperEvolveCheck) && aiPlayer.board.length > 0) {
                        const candidates = aiPlayer.board
                            .map((c, i) => ({ c, i }))
                            .filter(({ c }) => c && c.type === 'FOLLOWER' && !c.hasEvolved);

                        if (candidates.length > 0) {
                            // EASY: Random or last card. NORMAL/HARD: Best card based on effects
                            let target;
                            const useSuper = canSuperEvolveCheck;

                            if (aiDifficulty === 'EASY') {
                                // Random selection
                                target = candidates[Math.floor(Math.random() * candidates.length)];
                            } else {
                                // Score-based selection
                                const scored = candidates.map(({ c, i }) => ({
                                    c, i, score: scoreEvolveTarget(c!, i, state, useSuper)
                                }));
                                scored.sort((a, b) => b.score - a.score);
                                target = scored[0];
                            }

                            // Find best target for evolve effects
                            let targetId = undefined;
                            const enemyBoard = state.players[currentPlayerId].board;
                            const validTargets = enemyBoard.filter((c: any) =>
                                c !== null &&
                                !c.passiveAbilities?.includes('STEALTH') &&
                                !c.passiveAbilities?.includes('AURA')
                            );

                            if (validTargets.length > 0) {
                                if (aiDifficulty === 'HARD') {
                                    // Choose highest value target
                                    const sortedTargets = [...validTargets].sort((a: any, b: any) => {
                                        let scoreA = (a.currentAttack || 0) + (a.currentHealth || 0);
                                        let scoreB = (b.currentAttack || 0) + (b.currentHealth || 0);
                                        return scoreB - scoreA;
                                    });
                                    targetId = sortedTargets[0]!.instanceId;
                                } else {
                                    targetId = validTargets[0]!.instanceId;
                                }
                            }

                            const cardRect = opponentBoardRefs.current[target.i]?.getBoundingClientRect();

                            if (cardRect) {
                                setEvolveAnimation({
                                    card: target.c!,
                                    evolvedImageUrl: target.c!.evolvedImageUrl,
                                    startX: cardRect.left + cardRect.width / 2,
                                    startY: cardRect.top + cardRect.height / 2,
                                    useSep: useSuper,
                                    phase: 'ZOOM_IN',
                                    followerIndex: target.i,
                                    sourcePlayerId: opponentPlayerId,
                                    targetId: targetId
                                });

                                await waitForIdle(800);
                            } else {
                                dispatchAndSend({
                                    type: 'EVOLVE',
                                    playerId: opponentPlayerId,
                                    payload: {
                                        followerIndex: target.i,
                                        useSep: useSuper,
                                        targetId: targetId
                                    }
                                });
                                await waitForIdle(400);
                            }
                        }
                    }
                }

                // 3. Attack Phase (Smart targeting based on difficulty)
                {
                    let continueAttacking = true;
                    let attempts = 0;

                    while (continueAttacking && attempts < 15) {
                        attempts++;
                        const state = gameStateRef.current;
                        const aiBoard = state.players[opponentPlayerId].board;
                        const playerBoard = state.players[currentPlayerId].board;

                        let actionTaken = false;

                        for (let i = 0; i < aiBoard.length; i++) {
                            const attacker = aiBoard[i];
                            if (!attacker || !attacker.canAttack) continue;

                            let targetIndex = -1;
                            let targetIsLeader = true;

                            // Check if attacker ignores ward (STEALTH/hadStealth)
                            const attackerIgnoresWard = attacker.passiveAbilities?.includes('STEALTH') || attacker.hadStealth;

                            // Check for ward that must be attacked first (unless attacker ignores ward)
                            const wardTarget = !attackerIgnoresWard
                                ? playerBoard.findIndex((c: any) =>
                                    c && c.passiveAbilities?.includes('WARD') &&
                                    !c.passiveAbilities?.includes('STEALTH') &&
                                    !isImmuneToFollowerAttack(c, state)
                                )
                                : -1;

                            // If ward exists and attacker can't ignore it, must attack ward
                            if (wardTarget !== -1) {
                                targetIndex = wardTarget;
                                targetIsLeader = false;
                            } else if (aiDifficulty === 'EASY') {
                                // EASY: Simple logic - random or face (no ward blocking)
                                const validTargets = playerBoard
                                    .map((c, idx) => ({ c, idx }))
                                    .filter(({ c }) => c && !c.passiveAbilities?.includes('STEALTH') && !c.passiveAbilities?.includes('AURA') && !isImmuneToFollowerAttack(c, state));

                                const canAttackLeaderNow = attacker.passiveAbilities?.includes('STORM') || attacker.turnPlayed !== state.turnCount;

                                if (!canAttackLeaderNow && validTargets.length > 0) {
                                    // Must attack follower (RUSH restriction)
                                    const randomTarget = validTargets[Math.floor(Math.random() * validTargets.length)];
                                    targetIndex = randomTarget.idx;
                                    targetIsLeader = false;
                                } else if (!canAttackLeaderNow && validTargets.length === 0) {
                                    // Can't attack anything - skip this attacker
                                    continue;
                                } else if (canAttackLeaderNow && validTargets.length > 0 && Math.random() < 0.5) {
                                    // 50% chance to attack random follower
                                    const randomTarget = validTargets[Math.floor(Math.random() * validTargets.length)];
                                    targetIndex = randomTarget.idx;
                                    targetIsLeader = false;
                                }
                                // else attack leader (default)
                            } else {
                                // NORMAL/HARD: Smart targeting
                                const result = findBestAttackTarget(attacker, playerBoard, state);
                                targetIndex = result.index;
                                targetIsLeader = result.isLeader;

                                // Skip if no valid target
                                if (targetIndex === -1 && !targetIsLeader) {
                                    continue;
                                }
                            }

                            // Check RUSH restriction
                            const hasStorm = attacker.passiveAbilities?.includes('STORM');
                            const isSummoningSickness = attacker.turnPlayed === state.turnCount;
                            if (!hasStorm && isSummoningSickness && targetIsLeader) {
                                // RUSH can't attack leader - find a follower (prioritize ward)
                                const validTargets = playerBoard
                                    .map((c, idx) => ({ c, idx }))
                                    .filter(({ c }) => c && !c.passiveAbilities?.includes('STEALTH') && !c.passiveAbilities?.includes('AURA') && !isImmuneToFollowerAttack(c, state));

                                if (validTargets.length > 0) {
                                    // Prefer ward target if exists and attacker can't ignore
                                    const wardInValid = attackerIgnoresWard ? null : validTargets.find(({ c }) => c!.passiveAbilities?.includes('WARD'));
                                    if (wardInValid) {
                                        targetIndex = wardInValid.idx;
                                    } else {
                                        targetIndex = validTargets[0].idx;
                                    }
                                    targetIsLeader = false;
                                } else {
                                    continue; // Can't attack anything
                                }
                            }

                            // Visual Feedback
                            const targetCard = targetIsLeader ? null : playerBoard[targetIndex];
                            const targetInstanceId = targetCard ? (targetCard as any).instanceId : undefined;
                            const attackerInstanceId = (attacker as any).instanceId;

                            // Trigger CPU attacker Y-axis rotation animation
                            if (attackerInstanceId) {
                                setAttackingFollowerInstanceId(attackerInstanceId);
                                setTimeout(() => setAttackingFollowerInstanceId(null), 300);
                            }

                            playEffect(attacker.attackEffectType || 'SLASH', currentPlayerId, targetIsLeader ? -1 : targetIndex, targetInstanceId);

                            // Counter-Attack Visuals
                            if (!targetIsLeader && targetIndex >= 0) {
                                const defender = playerBoard[targetIndex];
                                if (defender && (defender.currentAttack || 0) > 0) {
                                    const defenderInstanceId = (defender as any).instanceId;
                                    setTimeout(() => {
                                        // Trigger counter-attack Y-axis rotation animation for defender (player's card)
                                        if (defenderInstanceId) {
                                            setCounterAttackingFollowerInstanceId(defenderInstanceId);
                                            setTimeout(() => setCounterAttackingFollowerInstanceId(null), 300);
                                        }
                                        playEffect(defender.attackEffectType || 'SLASH', opponentPlayerId, i, attackerInstanceId);
                                    }, 200);
                                }
                            }

                            actionTaken = true;

                            await waitForIdle(1000);

                            dispatch({
                                type: 'ATTACK',
                                playerId: opponentPlayerId,
                                payload: { attackerIndex: i, targetIndex, targetIsLeader }
                            });

                            await waitForIdle(1000);
                            break;
                        }
                        if (!actionTaken) continueAttacking = false;
                    }
                }

                // ターン終了前にすべてのpendingEffects（ラストワード等）が処理されるまで待機
                await waitForIdle(300);

                dispatch({ type: 'END_TURN', playerId: opponentPlayerId });
                aiProcessing.current = false;
            };
            runAiTurn();
        }
    }, [gameState.activePlayerId, gameState.turnCount, gameMode, gameState.phase, aiDifficulty]);



    // --- Interaction Handlers ---

    // Hand Click / Drag Start
    const handleHandMouseDown = (e: React.MouseEvent, index: number) => {
        // --- PREVENTION: Do not start a new drag if one is active ---
        if (dragStateRef.current || playingCardAnim || animatingCards.length > 0) return;

        const card = player.hand[index];
        e.stopPropagation();

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

        // CRITICAL FIX: Always allow hand expansion (even when card play is locked or on opponent's turn)
        // This ensures the hand can always be viewed regardless of game state
        if (!isHandExpanded) {
            setIsHandExpanded(true);
            setSelectedCard({ card, owner: 'PLAYER' });
            // 展開した直後フラグを立てる（次のクリックまで折りたたまない）
            handJustExpandedRef.current = true;
            return;
        }

        // If already expanded, update selected card (also always allowed)
        setSelectedCard({ card, owner: 'PLAYER' });

        // Only allow drag (to play) on player's turn
        if (gameState.activePlayerId !== currentPlayerId) return;

        // --- PREVENTION: Block drag if card play is in progress ---
        if (cardPlayLockRef.current) {
            console.warn('[handleHandMouseDown] Card play in progress, blocking drag start');
            return;
        }

        // Block card play while pendingEffects are being processed
        const currentState = gameStateRef.current;
        if (currentState.pendingEffects && currentState.pendingEffects.length > 0) {
            console.log("UI: Card play drag blocked - pendingEffects still processing");
            return;
        }

        const info = {
            sourceType: 'HAND' as const,
            sourceIndex: index,
            sourceInstanceId: card.instanceId,
            startX: rect.left + rect.width / 2, // Center of Card in screen coords
            startY: rect.top + rect.height / 2, // Center of Card in screen coords
            currentX: e.clientX,
            currentY: e.clientY,
            offsetX: 0,
            offsetY: 0,
            canDrag: true // Already expanded, allow drag
        };

        setDragState(info);
        dragStateRef.current = info;
    };

    // Board Drag (Attack)
    // CRITICAL: Use instanceId to find the actual board index, since visualPlayerBoard may have different indices
    const handleBoardMouseDown = (e: React.MouseEvent, visualIndex: number, instanceId?: string) => {
        e.stopPropagation();

        // Use fresh state for validation to fix evolution-attack sync issues
        const currentState = gameStateRef.current;
        const playerBoard = currentState.players[currentPlayerId].board;

        // Find actual board index using instanceId (critical for correct targeting when board has nulls)
        const actualIndex = instanceId
            ? playerBoard.findIndex(c => c && (c as any).instanceId === instanceId)
            : visualIndex;

        const currentCard = actualIndex >= 0 ? playerBoard[actualIndex] : null;

        // If in targeting mode and targeting ally followers, handle target selection
        if (targetingState && targetingState.allowedTargetPlayerId === currentPlayerId && currentCard) {
            handleTargetClick('FOLLOWER', actualIndex, currentPlayerId, instanceId);
            return;
        }

        // Inspect - set selected card
        if (currentCard) setSelectedCard({ card: currentCard, owner: 'PLAYER' });

        // Block attack drag while pendingEffects are being processed
        if (currentState.pendingEffects && currentState.pendingEffects.length > 0) {
            console.log("UI: Attack drag blocked - pendingEffects still processing");
            return;
        }

        if (currentState.activePlayerId === currentPlayerId && (currentCard as any)?.canAttack) {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            // Use Screen Coords directly
            const startGameCoords = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            const newState = {
                sourceType: 'BOARD' as const,
                sourceIndex: actualIndex, // Use actual board index, not visual index
                sourceInstanceId: (currentCard as any).instanceId, // Use fresh instanceId
                startX: startGameCoords.x,

                startY: startGameCoords.y,
                currentX: e.clientX,
                currentY: e.clientY,
                offsetX: 0,
                offsetY: 0
            };
            setDragState(newState);
            dragStateRef.current = newState;
        }
    };

    // Evolve Drag
    const handleEvolveMouseDown = (e: React.MouseEvent, useSepFlag: boolean = false) => {
        if (gameState.activePlayerId !== currentPlayerId) return;
        e.stopPropagation();

        // Block evolve while pendingEffects are being processed
        const currentState = gameStateRef.current;
        if (currentState.pendingEffects && currentState.pendingEffects.length > 0) {
            console.log("UI: Evolve drag blocked - pendingEffects still processing");
            return;
        }

        // Client-side visual check
        const isFirstPlayer = currentPlayerId === gameState.firstPlayerId;
        if (useSepFlag) {
            // Check super evolve conditions (includes canEvolveThisTurn check)
            if (!canSuperEvolve(player, gameState.turnCount, isFirstPlayer)) return;
        } else {
            // Check normal evolve conditions (includes canEvolveThisTurn check)
            if (!canEvolve(player, gameState.turnCount, isFirstPlayer)) return;
        }

        // Use Screen Coords directly
        const newState = {
            sourceType: 'EVOLVE' as const,
            sourceIndex: 0, // Dummy index
            startX: e.clientX,
            startY: e.clientY,
            currentX: e.clientX,
            currentY: e.clientY,
            offsetX: 0,
            offsetY: 0,
            useSep: useSepFlag
        };
        setDragState(newState);
        dragStateRef.current = newState;
    };

    // ===== スタンプ機能ハンドラー =====
    // スタンプ送信処理
    const sendStamp = useCallback((stampId: StampId) => {
        // 前のタイマーをクリア（連続送信対応）
        if (stampDisplayTimerRef.current) {
            clearTimeout(stampDisplayTimerRef.current);
            stampDisplayTimerRef.current = null;
        }

        const stamp: StampDisplay = {
            stampId,
            playerId: currentPlayerId,
            playerClass: currentPlayerClass,
            timestamp: Date.now()
        };

        // スタンプSEを再生
        const stampSE = getStampSE(stampId);
        if (stampSE) {
            playSE(stampSE, 0.6);
        }

        // 一度nullにしてから設定（アニメーションリセット用）
        setDisplayedStamp(null);
        // 次のフレームで新しいスタンプを設定（Reactの再レンダリングを確実に発火させる）
        requestAnimationFrame(() => {
            setDisplayedStamp(stamp);
        });

        // オンライン時は相手にも送信
        if (opponentType === 'ONLINE' && adapter) {
            adapter.send({ type: 'STAMP', stampId, playerClass: currentPlayerClass });
        }

        // 一定時間後に非表示
        stampDisplayTimerRef.current = setTimeout(() => {
            setDisplayedStamp(prev => prev?.timestamp === stamp.timestamp ? null : prev);
            stampDisplayTimerRef.current = null;
        }, 3000);
    }, [currentPlayerId, currentPlayerClass, opponentType, adapter]);

    // リーダードラッグ開始（スタンプ選択UI表示）
    const handleLeaderMouseDown = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        // リーダーの中心座標を取得
        if (playerLeaderRef.current) {
            const rect = playerLeaderRef.current.getBoundingClientRect();
            stampDragStartRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        } else {
            stampDragStartRef.current = { x: e.clientX, y: e.clientY };
        }
        setIsStampSelectorOpen(true);
        setHoveredStampId(null);
    }, []);

    // スタンプ選択中のホバーIDをrefで追跡（イベントリスナー内で最新値を参照するため）
    const hoveredStampIdRef = React.useRef<StampId | null>(null);
    React.useEffect(() => {
        hoveredStampIdRef.current = hoveredStampId;
    }, [hoveredStampId]);

    // スタンプ選択のグローバルイベントリスナー
    useEffect(() => {
        if (!isStampSelectorOpen) return;

        const handleStampMouseMove = (e: MouseEvent) => {
            if (!stampDragStartRef.current) return;

            const dx = e.clientX - stampDragStartRef.current.x;
            const dy = e.clientY - stampDragStartRef.current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);

            // 距離が一定以上（80px = innerRadius）離れ、かつ上半円内（-180度〜0度、つまりdy < 0）
            if (distance > 60 && dy < 0) {
                // 角度からスタンプIDを計算（上半円を8等分）
                // Math.atan2で上方向: -180度（左上）〜 -90度（真上）〜 0度（右上）
                // SVG描画では: 180度（左）〜 90度（真上）〜 0度（右）
                // したがって、-angle を使って変換する
                const svgAngle = -angle; // 0度（右）〜 90度（真上）〜 180度（左）
                // 左（180度）からスタンプ1、右（0度）でスタンプ8
                // normalizedAngle: 180度=0, 0度=180となるように反転
                const normalizedAngle = 180 - svgAngle; // 左(180度)→0, 右(0度)→180
                const stampIndex = Math.floor(normalizedAngle / 22.5);
                const clampedIndex = Math.max(0, Math.min(7, stampIndex));
                const stampId = (clampedIndex + 1) as StampId;
                setHoveredStampId(stampId);
            } else {
                setHoveredStampId(null);
            }
        };

        const handleStampMouseUp = () => {
            const currentHoveredId = hoveredStampIdRef.current;
            if (currentHoveredId) {
                sendStamp(currentHoveredId);
            }
            setIsStampSelectorOpen(false);
            setHoveredStampId(null);
            stampDragStartRef.current = null;
        };

        window.addEventListener('mousemove', handleStampMouseMove);
        window.addEventListener('mouseup', handleStampMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleStampMouseMove);
            window.removeEventListener('mouseup', handleStampMouseUp);
        };
    }, [isStampSelectorOpen, sendStamp]);

    // Global Drag Listeners (Window Level) - OPTIMIZED w/ REF
    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!dragStateRef.current) return;

            // Only update current coords if allowed to drag or if it's board/evolve
            const { canDrag, sourceType } = dragStateRef.current as any;
            if (sourceType === 'HAND' && !canDrag) return;

            // Update with raw screen coordinates
            dragStateRef.current = {
                ...dragStateRef.current,
                currentX: e.clientX,
                currentY: e.clientY
            };

            // Sync state for React Render
            setDragState(prev => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);

            // Update Hover Target logic could go here if needed, but usually handled by mouseEnter on elements
            // For now, elements update `hoveredTarget` state via onMouseEnter
        };

        window.addEventListener('mousemove', handleGlobalMouseMove);

        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
        };
    }, []);

    // Ref for Hovered Target to access in stable event listener
    const hoveredTargetRef = React.useRef<any>(null);
    const prevHoveredTargetRef = React.useRef<any>(null);
    useEffect(() => {
        hoveredTargetRef.current = hoveredTarget;
        prevHoveredTargetRef.current = hoveredTarget;
    }, [hoveredTarget]);

    // Separate Effect for MouseUp to ensure we have fresh closures OR use the Ref strategy fully.
    // Ref strategy is safer for performance.
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            const currentDrag = dragStateRef.current;
            const currentHover = hoveredTargetRef.current;

            if (currentDrag) {
                // Hand Drag Logic (Arrow to Board)
                if (currentDrag.sourceType === 'HAND') {
                    // CRITICAL: Block if card play is already in progress
                    if (cardPlayLockRef.current) {
                        console.warn('[handleGlobalMouseUp] Card play in progress, cancelling drag');
                        dragStateRef.current = null;
                        setDragState(null);
                        return;
                    }

                    const dragDistanceTotal = Math.sqrt(Math.pow(currentDrag.startX - currentDrag.currentX, 2) + Math.pow(currentDrag.startY - currentDrag.currentY, 2));

                    // Use "Board Rect" detection (Basic: Y < handY and not too far left/right? Or just "Is Y < 60% of screen")
                    // Let's use a Y threshold: If Arrow Head is "above" the Hand area.
                    const isOverBoard = currentDrag.currentY < (window.innerHeight - (200 * scale)); // Hand area height is 200*scale

                    // Threshold for action > 30px to prevent accidental clicks becoming drags
                    if ((currentDrag as any).canDrag && dragDistanceTotal > 30 && isOverBoard) {
                        const card = playerRef.current.hand[currentDrag.sourceIndex];
                        if (playerRef.current.pp >= card.cost) {
                            // Check for Target Selection Requirement (Play Trigger)
                            const needsEnemyTarget = card.triggerAbilities?.FANFARE?.targetType === 'SELECT_FOLLOWER' ||
                                card.triggers?.some(t => t.trigger === 'FANFARE' && t.effects.some(e => e.targetType === 'SELECT_FOLLOWER'));
                            const needsAllyTarget = card.triggerAbilities?.FANFARE?.targetType === 'SELECT_ALLY_FOLLOWER' ||
                                card.triggers?.some(t => t.trigger === 'FANFARE' && t.effects.some(e => e.targetType === 'SELECT_ALLY_FOLLOWER'));
                            const needsOtherAllyTarget = card.triggerAbilities?.FANFARE?.targetType === 'SELECT_OTHER_ALLY_FOLLOWER' ||
                                card.triggers?.some(t => t.trigger === 'FANFARE' && t.effects.some(e => e.targetType === 'SELECT_OTHER_ALLY_FOLLOWER'));
                            const needsTarget = needsEnemyTarget || needsAllyTarget || needsOtherAllyTarget;

                            if (needsTarget) {
                                // Determine which player's board to target
                                const allowedTargetPlayerId = (needsAllyTarget || needsOtherAllyTarget) ? currentPlayerId : opponentPlayerId;

                                // Check if there are valid targets on the target board
                                // AURA: 相手のカード効果で選べない
                                // STEALTH: 相手から攻撃対象に選べない＆相手のカード効果で選べない
                                const targetBoard = gameStateRef.current.players[allowedTargetPlayerId].board;
                                const hasValidTargets = targetBoard.some(c => {
                                    if (!c) return false;
                                    // For enemy targets, check STEALTH and AURA
                                    if (allowedTargetPlayerId !== currentPlayerId) {
                                        if ((c as any).passiveAbilities?.includes('STEALTH')) {
                                            return false;
                                        }
                                        if ((c as any).passiveAbilities?.includes('AURA')) {
                                            return false;
                                        }
                                    }
                                    return true;
                                });

                                if (hasValidTargets) {
                                    // CRITICAL: Set lock when entering targeting mode to prevent other cards from being played
                                    cardPlayLockRef.current = true;
                                    lastPlayedInstanceIdRef.current = card.instanceId || null;
                                    setTargetingState({ type: 'PLAY', sourceIndex: currentDrag.sourceIndex, sourceInstanceId: card.instanceId, allowedTargetPlayerId });
                                    // Don't collapse hand - only collapse on background click
                                    // Keep selected card visible during targeting
                                    ignoreClickRef.current = true; // Prevent quick close
                                    setTimeout(() => { ignoreClickRef.current = false; }, 100);
                                } else {
                                    // No valid targets - skip target selection and play card directly
                                    console.log('[handleGlobalMouseUp] No valid targets, skipping target selection');
                                    handlePlayCard(currentDrag.sourceIndex, currentDrag.startX, currentDrag.startY);
                                    setSelectedCard(null);
                                    ignoreClickRef.current = true;
                                    setTimeout(() => { ignoreClickRef.current = false; }, 100);
                                }
                            } else {
                                handlePlayCard(currentDrag.sourceIndex, currentDrag.startX, currentDrag.startY);
                                // Don't collapse hand - only collapse on background click
                                // Clear selection after playing a card
                                setSelectedCard(null);
                                ignoreClickRef.current = true;
                                setTimeout(() => { ignoreClickRef.current = false; }, 100);
                            }

                            // CRITICAL FIX: Clear dragStateRef IMMEDIATELY to prevent double processing
                            // if multiple mouseup events fire or logic loops.
                            dragStateRef.current = null;
                            setDragState(null);
                            return; // Exit function immediately
                        }
                    } else if (!(currentDrag as any).canDrag) {
                        // If cannot drag (collapsed), expand hand
                        setIsHandExpanded(true);
                    }
                    // If simple click/small drag while expanded, kept as selection/no-op
                }

                // Board Drag Logic (Attack)
                else if (currentDrag.sourceType === 'BOARD') {
                    if (currentHover && currentHover.playerId === opponentPlayerId) {
                        // Check WARD (UI Side)
                        const state = gameStateRef.current;
                        const opponent = state.players[opponentPlayerId]; // Use opponentPlayerId from closure (stable?)
                        // Note: opponentPlayerId in closure might be stable if useEffect dependency is correct.
                        // But verifying with gameStateRef is safer.
                        // Note: Stealthed Ward units cannot be targeted, so they don't protect
                        const wardUnits = opponent.board.filter(c =>
                            c &&
                            (c as any).passiveAbilities?.includes('WARD') &&
                            !(c as any).passiveAbilities?.includes('STEALTH')
                        );
                        let isBlocked = false;

                        // Get actual board index from instanceId (critical for correct targeting)
                        const getActualBoardIndex = (instanceId?: string): number => {
                            if (!instanceId) return -1;
                            return opponent.board.findIndex(c => c && (c as any).instanceId === instanceId);
                        };
                        const actualTargetIndex = currentHover.type === 'LEADER' ? -1 : getActualBoardIndex(currentHover.instanceId);

                        // Check Attacker for STEALTH or hadStealth (Ignores Ward even after Stealth is removed)
                        const visualAttackerCard = playerRef.current.board[currentDrag.sourceIndex] as any;
                        const ignoresWard = visualAttackerCard?.passiveAbilities?.includes('STEALTH') || visualAttackerCard?.hadStealth;

                        if (wardUnits.length > 0 && !ignoresWard) {
                            if (currentHover.type === 'LEADER') {
                                isBlocked = true;
                            } else if (currentHover.type === 'FOLLOWER' && actualTargetIndex >= 0) {
                                const targetCard = opponent.board[actualTargetIndex];
                                if (targetCard && !(targetCard as any).passiveAbilities?.includes('WARD')) {
                                    isBlocked = true;
                                }
                            }
                        }

                        if (isBlocked) {
                            console.log("UI: Attack blocked by WARD");
                            // Keep card selected - don't clear selection when blocked
                        } else {
                            // Get actual attacker index using sourceInstanceId (reliable)
                            const actualAttackerIndex = playerRef.current.board.findIndex(
                                (c: any) => c && c.instanceId === currentDrag.sourceInstanceId
                            );
                            const attackerCard = actualAttackerIndex >= 0 ? playerRef.current.board[actualAttackerIndex] as any : null;

                            // RUSH Check Logic (UI)
                            const hasRush = attackerCard?.passiveAbilities?.includes('RUSH');
                            const hasStorm = attackerCard?.passiveAbilities?.includes('STORM');
                            const isSummoningSickness = attackerCard?.turnPlayed === gameStateRef.current.turnCount;
                            const targetIsLeader = currentHover.type === 'LEADER';
                            const targetIndex = actualTargetIndex;

                            if (targetIsLeader && hasRush && !hasStorm && isSummoningSickness) {
                                console.log("UI: Attack blocked by RUSH rule (Cannot attack leader)");
                                // Keep card selected - don't clear selection when blocked by RUSH
                                // Could add specific visual feedback here
                            } else {

                                // Check if we have valid attacker
                                if (actualAttackerIndex < 0 || !attackerCard) {
                                    console.log("UI: Attack blocked - invalid attacker");
                                    return;
                                }

                                // CRITICAL: Block attack while pendingEffects are being processed
                                // This ensures spell effects (like SET_MAX_HP) resolve before attacks
                                const currentState = gameStateRef.current;
                                if (currentState.pendingEffects && currentState.pendingEffects.length > 0) {
                                    console.log("UI: Attack blocked - pendingEffects still processing");
                                    return;
                                }

                                // Get instanceIds for accurate visual effect positioning
                                const targetInstanceId = currentHover.instanceId;
                                const attackerInstanceId = currentDrag.sourceInstanceId;

                                // Get defender card for counter-attack
                                const defender = !targetIsLeader && targetIndex >= 0 ? opponent.board[targetIndex] : null;

                                // Capture attack parameters IMMEDIATELY before any async operations
                                const attackParams = {
                                    attackerIndex: actualAttackerIndex,
                                    targetIndex: targetIsLeader ? -1 : targetIndex,
                                    targetIsLeader: targetIsLeader
                                };

                                // CRITICAL FIX: Dispatch attack IMMEDIATELY to prevent race conditions
                                // The engine will process the damage, and we show animations concurrently
                                // This ensures the attack ALWAYS happens if the user initiated it
                                dispatchAndSend({
                                    type: 'ATTACK',
                                    playerId: currentPlayerId,
                                    payload: attackParams
                                });

                                // Trigger attack Y-axis rotation animation
                                if (attackerInstanceId) {
                                    setAttackingFollowerInstanceId(attackerInstanceId);
                                    setTimeout(() => setAttackingFollowerInstanceId(null), 300);
                                }

                                // Correctly pass target info to playEffect with instanceId for accurate positioning
                                const attackType = attackerCard?.attackEffectType || 'SLASH';
                                playEffect(attackType, opponentPlayerId, targetIsLeader ? -1 : targetIndex, targetInstanceId);
                                triggerShake();

                                // Counter-Attack Visuals for Player Attack
                                if (!targetIsLeader && defender && (defender.currentAttack || 0) > 0) {
                                    // Defender (Opponent) attacks Attacker (Player)
                                    // Use instanceIds for accurate visual positioning
                                    const defenderInstanceId = (defender as any).instanceId;
                                    setTimeout(() => {
                                        // Trigger counter-attack Y-axis rotation animation for defender
                                        if (defenderInstanceId) {
                                            setCounterAttackingFollowerInstanceId(defenderInstanceId);
                                            setTimeout(() => setCounterAttackingFollowerInstanceId(null), 300);
                                        }
                                        playEffect(defender.attackEffectType || 'SLASH', currentPlayerId, actualAttackerIndex, attackerInstanceId);
                                    }, 200);
                                }
                            }
                        }
                    } else {
                        // If released without selecting a target, keep card selected
                        // User can click elsewhere to deselect if needed
                    }
                }
                // Evolve Logic
                else if (currentDrag.sourceType === 'EVOLVE' && currentHover && currentHover.type === 'FOLLOWER' && currentHover.playerId === currentPlayerId) {
                    const visualFollowerIndex = currentHover.index!;

                    // CRITICAL FIX: Get instanceId from visual board at the hovered index
                    // This ensures we target the card the user is visually seeing, not the stale hover state
                    // During card slide animations, hoveredTarget.instanceId may be outdated
                    const visualBoard = visualPlayerBoardRef.current;
                    const visualCard = visualBoard[visualFollowerIndex];
                    const followerInstanceId = visualCard?.instanceId || currentHover.instanceId;

                    // CRITICAL: Find actual board index using instanceId for consistent processing
                    const playerBoard = playerRef.current.board;
                    const actualFollowerIndex = followerInstanceId
                        ? playerBoard.findIndex(c => c && (c as any).instanceId === followerInstanceId)
                        : visualFollowerIndex;

                    const card = actualFollowerIndex >= 0 ? playerBoard[actualFollowerIndex] : null;
                    if (!card) return;

                    // Already evolved cards cannot evolve or super-evolve again
                    if (card.hasEvolved) {
                        console.log('[GameScreen] Cannot evolve: card already evolved (drag drop)');
                        return;
                    }

                    // Check for Target Selection Requirement (Evolve or Super Evolve Trigger)
                    const isSuper = (currentDrag as any).useSep;
                    // When super evolving, check both SUPER_EVOLVE and EVOLVE triggers (engine fires both)
                    const triggersToCheck = isSuper ? ['SUPER_EVOLVE', 'EVOLVE'] : ['EVOLVE'];

                    // Check which target type is needed
                    const getTargetTypeFromTrigger = () => {
                        const legacyType = card?.triggerAbilities?.EVOLVE?.targetType;
                        if (legacyType) return legacyType;

                        for (const trigger of card?.triggers || []) {
                            if (triggersToCheck.includes(trigger.trigger)) {
                                for (const effect of trigger.effects) {
                                    if (effect.targetType && ['SELECT_FOLLOWER', 'SELECT_ALLY_FOLLOWER', 'SELECT_OTHER_ALLY_FOLLOWER'].includes(effect.targetType)) {
                                        return effect.targetType;
                                    }
                                }
                            }
                        }
                        return null;
                    };

                    const targetTypeNeeded = getTargetTypeFromTrigger();
                    const needsTarget = !!targetTypeNeeded;
                    const needsAllyTarget = targetTypeNeeded === 'SELECT_ALLY_FOLLOWER' || targetTypeNeeded === 'SELECT_OTHER_ALLY_FOLLOWER';
                    const excludeSelf = targetTypeNeeded === 'SELECT_OTHER_ALLY_FOLLOWER';

                    // Check valid targets based on target type
                    // AURA: 相手のカード効果で選べない
                    // STEALTH: 相手から攻撃対象に選べない＆相手のカード効果で選べない
                    const targetPlayerIdForValidation = needsAllyTarget ? currentPlayerId : opponentPlayerId;
                    const targetBoardForValidation = gameStateRef.current.players[targetPlayerIdForValidation].board;
                    const hasValidTargets = targetBoardForValidation.some(c => {
                        if (!c) return false;
                        // For ally targets, exclude self if SELECT_OTHER_ALLY_FOLLOWER
                        if (needsAllyTarget && excludeSelf && (c as any).instanceId === followerInstanceId) return false;
                        // For enemy targets, check STEALTH and AURA
                        if (!needsAllyTarget) {
                            if (c.passiveAbilities?.includes('STEALTH')) return false;
                            if (c.passiveAbilities?.includes('AURA')) return false;
                        }
                        return true;
                    });

                    if (needsTarget && hasValidTargets) {
                        // Store both visual index and instanceId for targeting state
                        setTargetingState({
                            type: 'EVOLVE',
                            sourceIndex: actualFollowerIndex,
                            sourceInstanceId: followerInstanceId,
                            sourceVisualIndex: visualFollowerIndex,
                            useSep: (currentDrag as any).useSep,
                            allowedTargetPlayerId: targetPlayerIdForValidation,
                            excludeInstanceId: excludeSelf ? followerInstanceId : undefined
                        });
                        ignoreClickRef.current = true;
                        setTimeout(() => { ignoreClickRef.current = false; }, 100);
                    } else {
                        // Start evolution animation instead of direct dispatch
                        // Pass both visual index (for position) and instanceId (for correct targeting)
                        handleEvolveWithAnimation(visualFollowerIndex, (currentDrag as any).useSep, undefined, followerInstanceId);
                        ignoreClickRef.current = true;
                        setTimeout(() => { ignoreClickRef.current = false; }, 100);
                    }
                }
            }

            // Trigger ease-in falling animation for cancelled hand drag
            if (currentDrag && currentDrag.sourceType === 'HAND' && (currentDrag as any).canDrag) {
                // Drag was active but cancelled (not over board or action didn't complete)
                setCancellingDragIndex(currentDrag.sourceIndex);
                setTimeout(() => setCancellingDragIndex(null), 300);
            }

            // Reset
            setDragState(null);
            dragStateRef.current = null;
            setHoveredTarget(null);
        };

        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [opponentPlayerId, currentPlayerId, isHandExpanded, scale]); // Added scale to dependencies

    // Background click to close expanded hand OR Cancel Targeting
    const handleBackgroundClick = () => {
        if (ignoreClickRef.current) return;
        if (targetingState) {
            // Release card play lock if targeting was for PLAY
            if (targetingState.type === 'PLAY') {
                cardPlayLockRef.current = false;
                // Don't clear lastPlayedInstanceIdRef - keep it to prevent re-play
            }
            setTargetingState(null);
            return;
        }
        // Only close hand if it's expanded AND we're clicking outside (not selecting a card)
        if (isHandExpanded) {
            // 展開直後のクリックでは折りたたまない
            if (handJustExpandedRef.current) {
                handJustExpandedRef.current = false;
                return;
            }
            setIsHandExpanded(false);
            setSelectedCard(null);
            setSelectedHandIndex(null); // Clear selection on background click
        }
    };

    // --- Arrow Path ---
    const getArrowPath = () => {
        if (!dragState || (dragState.sourceType !== 'BOARD' && dragState.sourceType !== 'EVOLVE')) return '';
        // HAND source removed from arrow logic
        // Calculate distance for dynamic curve intensity
        const dx = dragState.currentX - dragState.startX;
        const dy = dragState.currentY - dragState.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 10) return ''; // Too short to draw

        // Midpoint of the line
        const midX = (dragState.startX + dragState.currentX) / 2;
        const midY = (dragState.startY + dragState.currentY) / 2;

        // Base curve intensity (always have some curve even when dx is small)
        // Distance-based minimum ensures curves are visible for all directions
        const baseCurve = Math.min(200, distance * 0.3);

        // Additional curve based on horizontal offset (dx)
        // The more horizontal the drag, the bigger the additional curve
        const horizontalOffset = Math.abs(dx);
        const additionalCurve = Math.min(150, horizontalOffset * 0.4);

        // Total curve intensity
        const curveIntensity = baseCurve + additionalCurve;

        // Curve direction: always bulge in the same direction (e.g., left/up) for stability
        // Use a smooth transition based on dx to avoid sudden direction changes
        // When dx is near 0, curve slightly to the left (negative X direction)
        // When dx is positive (target to the right), curve to the left
        // When dx is negative (target to the left), curve to the right
        // Use a smooth transition function to prevent "flipping"
        const normalizedDx = dx / (distance + 1); // Normalize to [-1, 1] range
        const horizontalCurve = -normalizedDx * curveIntensity * 0.5; // Opposite direction for nice arc

        // Vertical curve: always go upward
        const verticalCurve = -curveIntensity * 0.8;

        const cx = midX + horizontalCurve;
        const cy = midY + verticalCurve;

        // 線を先端まで伸ばす（endOffsetは不要になった）
        return `M${dragState.startX},${dragState.startY} Q${cx},${cy} ${dragState.currentX},${dragState.currentY}`;
    };

    // --- Target Selection Handler ---
    const handleTargetClick = (targetType: 'LEADER' | 'FOLLOWER', targetIndex: number, targetPlayerId: string, instanceId?: string) => {
        if (!targetingState) return;

        // Note: cardPlayLockRef is intentionally set when entering targeting mode,
        // so we should NOT block here. The lock prevents NEW card plays, not target selection.

        // Validating target side
        if (targetingState.allowedTargetPlayerId && targetingState.allowedTargetPlayerId !== targetPlayerId) {
            console.log("Invalid target side");
            return;
        }

        // Check if this target is excluded (for SELECT_OTHER_ALLY_FOLLOWER)
        if (targetingState.excludeInstanceId && instanceId === targetingState.excludeInstanceId) {
            console.log("Cannot target self (SELECT_OTHER_ALLY_FOLLOWER)");
            triggerShake();
            return;
        }

        // 1. Get Target ID - use instanceId if provided for accurate board lookup
        let targetId: string | undefined = undefined;
        let actualTargetIndex = targetIndex;
        if (targetType === 'FOLLOWER') {
            // Get actual board index from instanceId
            if (instanceId) {
                actualTargetIndex = gameState.players[targetPlayerId].board.findIndex(
                    c => c && (c as any).instanceId === instanceId
                );
                if (actualTargetIndex < 0) return;
            }
            const targetValues = gameState.players[targetPlayerId].board[actualTargetIndex];
            if (!targetValues) return;
            targetId = targetValues.instanceId;

            // Check STEALTH and AURA (Cannot target opponent followers with Stealth or Aura)
            // AURA: 相手のカード効果で選べない
            // STEALTH: 相手から攻撃対象に選べない＆相手のカード効果で選べない
            if (targetPlayerId !== currentPlayerId) {
                const abilities = (targetValues as any).passiveAbilities || [];
                if (abilities.includes('STEALTH')) {
                    console.log("Cannot target unit with STEALTH");
                    playSE('cancel');
                    triggerShake();
                    return;
                }
                if (abilities.includes('AURA')) {
                    console.log("Cannot target unit with AURA");
                    playSE('cancel');
                    triggerShake();
                    return;
                }
            }
        } else {
            // Leader targeting (if implemented in future for spells)
            // targetId = ...? Engine expects targetType 'OPPONENT' usually without ID.
            // But if we select a specific enemy for a "Select Target" effect that accepts anything...
            // For now, only SELECT_FOLLOWER is used.
            return;
        }

        // 2. Dispatch Action
        if (targetingState.type === 'PLAY') {
            // Use sourceInstanceId to find the actual card index
            const currentPlayer = playerRef.current;
            let index = targetingState.sourceIndex;
            let animCard = currentPlayer.hand[index];

            // If sourceInstanceId is available, use it to find the correct card
            if (targetingState.sourceInstanceId) {
                const foundIndex = currentPlayer.hand.findIndex(c => c.instanceId === targetingState.sourceInstanceId);
                if (foundIndex >= 0) {
                    index = foundIndex;
                    animCard = currentPlayer.hand[foundIndex];
                    console.log(`[handleTargetClick] Using sourceInstanceId ${targetingState.sourceInstanceId}, found at index ${foundIndex} (was ${targetingState.sourceIndex})`);
                } else {
                    console.error('[handleTargetClick] Card not found with instanceId:', targetingState.sourceInstanceId);
                    setTargetingState(null);
                    return;
                }
            }

            if (!animCard) {
                console.error('[handleTargetClick] Card not found at index:', index);
                setTargetingState(null);
                cardPlayLockRef.current = false;
                return;
            }

            // Note: We don't check lastPlayedInstanceIdRef here because:
            // 1. The card was already validated when entering targeting mode
            // 2. lastPlayedInstanceIdRef was set when entering targeting mode
            // The lock is already held, so we can proceed with the play

            // Ensure lock is set (should already be set from entering targeting mode)
            cardPlayLockRef.current = true;
            // Update lastPlayedInstanceIdRef to confirm this card is being played
            lastPlayedInstanceIdRef.current = animCard.instanceId || null;

            // --- C_Y Visuals Trigger ---
            if (animCard.id === 'c_y') {
                // 1. Lightning on Target (Now SUMI)
                playEffect('SUMI', 'p2', actualTargetIndex, targetId);

                // 2. AOE on all OTHER enemies
                const opponentBoard = gameStateRef.current.players[opponentPlayerId].board; // Safe access via Ref
                opponentBoard.forEach((c, i) => {
                    if (c) {
                        const cardInstanceId = (c as any).instanceId;
                        // Delay slightly for dramatic effect?
                        setTimeout(() => {
                            playEffect('SUMI', opponentPlayerId, i, cardInstanceId);
                        }, 300);
                    }
                });
            }

            // --- 退職代行 (s_resignation_proxy) Visuals ---
            if (animCard.id === 's_resignation_proxy') {
                // 1. Target enemy destruction effect
                playEffect('SUMI', targetPlayerId, actualTargetIndex, targetId);

                // 2. Self random destruction effect (Delayed slightly)
                setTimeout(() => {
                    const selfBoard = gameStateRef.current.players[currentPlayerId].board;
                    const validSelfIndices: { index: number; instanceId: string }[] = [];
                    selfBoard.forEach((c, i) => {
                        if (c) validSelfIndices.push({ index: i, instanceId: (c as any).instanceId });
                    });
                    if (validSelfIndices.length > 0) {
                        const randomTarget = validSelfIndices[Math.floor(Math.random() * validSelfIndices.length)];
                        playEffect('SUMI', currentPlayerId, randomTarget.index, randomTarget.instanceId);
                    }
                }, 500);
            }

            // --- あじゃ (c_azya) Visuals ---
            if (animCard.id === 'c_azya') {
                // 1. Leader damage effect - THUNDER (immediate)
                playEffect('THUNDER', opponentPlayerId, -1);

                // 2. Target follower destruction effect - ICE (delayed)
                setTimeout(() => {
                    playEffect('ICE', targetPlayerId, actualTargetIndex, targetId);
                }, 300);

                // 3. Random bounce effect - WATER (further delayed)
                // Note: bounce effect is handled by pendingEffects, but visual effect can be shown
                setTimeout(() => {
                    const oppBoard = gameStateRef.current.players[opponentPlayerId].board;
                    const validTargets = oppBoard.filter(c => c !== null);
                    if (validTargets.length > 0) {
                        const randomCard = validTargets[Math.floor(Math.random() * validTargets.length)];
                        const vIdx = oppBoard.findIndex(c => c?.instanceId === randomCard?.instanceId);
                        if (vIdx !== -1) {
                            playEffect('WATER', opponentPlayerId, vIdx, randomCard?.instanceId);
                        }
                    }
                }, 600);
            }

            // Animation for spell/card
            // Start from player's hand area
            const startX = window.innerWidth / 2; // Center of screen
            const startY = window.innerHeight - (200 * scale / 2); // Bottom of hand area

            // Intermediate flying target (center of screen)
            const targetX = window.innerWidth / 2;
            const targetY = window.innerHeight / 2;

            // Create onComplete handler that captures necessary values
            const onComplete = () => {
                const isSpell = animCard.type === 'SPELL';
                if (!isSpell) triggerShake();
                dispatchAndSend({
                    type: 'PLAY_CARD',
                    playerId: currentPlayerId,
                    payload: { cardIndex: index, targetId, instanceId: animCard.instanceId }
                });

                // --- Player amandava FANFARE Visuals ---
                if (animCard.id === 'c_amandava') {
                    const opponentBoard = gameStateRef.current.players[opponentPlayerId].board;
                    opponentBoard.forEach((c, i) => {
                        if (c) {
                            const cardInstanceId = (c as any).instanceId;
                            setTimeout(() => {
                                playEffect('SHOT', opponentPlayerId, i, cardInstanceId);
                            }, 200);
                        }
                    });
                }

                // --- Player Azya FANFARE Visuals ---
                // (Moved to before onComplete to avoid duplicate effects)

                setPlayingCardAnim(null);

                // Release card play lock after processing
                setTimeout(() => {
                    cardPlayLockRef.current = false;
                }, 100);
            };

            let finalX: number | undefined;
            let finalY: number | undefined;

            if (animCard.type === 'FOLLOWER') {
                const currentBoard = gameStateRef.current.players[currentPlayerId].board;
                const validCards = currentBoard.filter(c => c !== null);
                const newBoardSize = validCards.length + 1;
                const newIndex = validCards.length;

                const spacing = CARD_SPACING * scale;
                const offsetX = (newIndex - (newBoardSize - 1) / 2) * spacing;

                const boardAreaRect = boardRef.current?.getBoundingClientRect();
                const boardCenterX = boardAreaRect ? boardAreaRect.left + boardAreaRect.width / 2 : window.innerWidth / 2;

                finalX = boardCenterX + offsetX;

                finalY = (window.innerHeight / 2) + (70 * scale);
            }

            // Send PLAY_CARD_ANIM to opponent for synchronized animation
            if (gameMode !== 'CPU' && connected && adapter) {
                adapter.send({
                    type: 'PLAY_CARD_ANIM',
                    payload: { playerId: currentPlayerId, cardIndex: index, card: animCard }
                });
            }

            setPlayingCardAnim({
                card: animCard,
                sourceIndex: targetingState.sourceIndex ?? -1, // Index of card being played
                startX, startY,
                targetX, targetY,
                finalX,
                finalY,
                playerClass: player?.class || 'SENKA',
                onComplete
            });

            // Safety fallback (2s) - Same as handlePlayCard
            setTimeout(() => {
                setPlayingCardAnim(prev => {
                    if (prev?.card.id === animCard.id) {
                        // If still playing same card, force complete
                        onComplete();
                        return null;
                    }
                    return prev;
                });
            }, 2000);
        } else if (targetingState.type === 'EVOLVE') {
            // Start evolution animation with target
            // Use sourceVisualIndex for position and sourceInstanceId for correct targeting
            const visualIndex = targetingState.sourceVisualIndex ?? targetingState.sourceIndex;
            handleEvolveWithAnimation(visualIndex, !!targetingState.useSep, targetId, targetingState.sourceInstanceId);
        }

        // 3. Reset
        setTargetingState(null);
    };

    // --- Use Button Handler ---
    const handleUseButtonClick = () => {
        if (!selectedCard || selectedCard.owner !== 'PLAYER') return;

        // CRITICAL: Block if card play is in progress
        if (cardPlayLockRef.current) {
            console.warn('[handleUseButtonClick] Card play in progress, ignoring');
            return;
        }

        const cardIndex = player.hand.findIndex(c => c.id === selectedCard.card.id);
        if (cardIndex === -1) return;

        // If card needs target, we shouldn't simple-play it.
        // Reuse handlePlayCard logic which checks for targeting needs.
        // Start animation from bottom center of BOARD in screen coordinates
        const startX = window.innerWidth / 2;
        const startY = window.innerHeight - (200 * scale / 2); // Bottom of hand area

        handlePlayCard(cardIndex, startX, startY);
        // Don't collapse hand - only collapse on background click
        setSelectedCard(null);
    };

    // --- End Turn Handler with Wait ---
    const [isEndingTurn, setIsEndingTurn] = React.useState(false);
    const [isEndTurnPressed, setIsEndTurnPressed] = React.useState(false); // ターン終了ボタン押下中
    // Note: isEndingTurnRef is defined earlier (near cardPlayLockRef) for access in handleMessage

    // ターン終了ボタンのクリックエフェクト
    interface EndTurnParticle {
        id: number;
        x: number;
        y: number;
        vx: number;
        vy: number;
        opacity: number;
        createdAt: number;
    }
    const [endTurnEffect, setEndTurnEffect] = React.useState<{
        active: boolean;
        x: number;
        y: number;
        ringRadius: number;
        particles: EndTurnParticle[];
    } | null>(null);
    const endTurnParticleIdRef = React.useRef(0);

    // ターン終了エフェクトのアニメーション
    React.useEffect(() => {
        if (!endTurnEffect?.active) return;

        const startTime = Date.now();
        const duration = 800; // 800ms

        const animate = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed >= duration) {
                setEndTurnEffect(null);
                return;
            }

            const progress = elapsed / duration;
            setEndTurnEffect(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    ringRadius: 20 + progress * 100, // 20 -> 120
                    particles: prev.particles.map(p => ({
                        ...p,
                        x: p.x + p.vx,
                        y: p.y + p.vy,
                        opacity: 1 - progress
                    }))
                };
            });

            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }, [endTurnEffect?.active]);

    const triggerEndTurnEffect = (buttonX: number, buttonY: number) => {
        // パーティクルを生成
        const particles: EndTurnParticle[] = [];
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            particles.push({
                id: endTurnParticleIdRef.current++,
                x: buttonX,
                y: buttonY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                opacity: 1,
                createdAt: Date.now()
            });
        }

        setEndTurnEffect({
            active: true,
            x: buttonX,
            y: buttonY,
            ringRadius: 20,
            particles
        });
    };

    const handleEndTurn = async () => {
        // CRITICAL: Check using ref for accurate async state
        if (gameState.activePlayerId !== currentPlayerId) {
            console.log('[handleEndTurn] Not my turn, ignoring');
            return;
        }
        if (isEndingTurnRef.current) {
            console.log('[handleEndTurn] Already ending turn, ignoring');
            return; // Already ending turn
        }

        isEndingTurnRef.current = true;
        setIsEndingTurn(true);

        // Capture the turn count at the start of the operation
        const turnCountAtStart = gameStateRef.current.turnCount;
        const activePlayerAtStart = gameStateRef.current.activePlayerId;

        // Wait for all animations and effects to complete
        const waitForAllProcessing = async () => {
            const checkIdle = () => {
                const state = gameStateRef.current;
                const hasPending = state.pendingEffects && state.pendingEffects.length > 0;
                const hasActiveEffects = activeEffectsRef.current.length > 0;
                const isAnimatingCards = animatingCardsRef.current.length > 0;
                const isPlayingCard = playingCardAnimRef.current !== null;
                const isEvolving = evolveAnimationRef.current !== null;
                // CRITICAL: Use ref instead of state to get current value in async context
                const isProcessing = isProcessingEffectRef.current;
                const hasCardLock = cardPlayLockRef.current;

                // Debug log to help identify what's blocking
                if (!hasPending && !hasActiveEffects && !isAnimatingCards && !isPlayingCard && !isEvolving && !isProcessing && !hasCardLock) {
                    return true; // All idle
                }
                return false;
            };

            // Wait up to 3 seconds for processing to complete (reduced from 10)
            const maxWait = 3000;
            const checkInterval = 50; // Check more frequently
            let waited = 0;
            let consecutiveIdleCount = 0;

            while (waited < maxWait) {
                // CRITICAL: Abort if turn has changed during wait (e.g., remote END_TURN received)
                if (gameStateRef.current.turnCount !== turnCountAtStart ||
                    gameStateRef.current.activePlayerId !== activePlayerAtStart) {
                    console.log('[handleEndTurn] Turn changed during wait, aborting local END_TURN');
                    return false; // Signal to abort
                }

                if (checkIdle()) {
                    consecutiveIdleCount++;
                    // Require 2 consecutive idle checks to confirm processing is done
                    if (consecutiveIdleCount >= 2) {
                        break;
                    }
                } else {
                    consecutiveIdleCount = 0;
                }
                await new Promise(r => setTimeout(r, checkInterval));
                waited += checkInterval;
            }

            if (waited >= maxWait) {
                console.warn('[handleEndTurn] Timeout waiting for processing to complete - forcing end turn');
            }
            return true; // Signal to proceed
        };

        const shouldProceed = await waitForAllProcessing();

        // CRITICAL: Re-check turn state before dispatching
        // This prevents double END_TURN when remote END_TURN is received during wait
        if (!shouldProceed ||
            gameStateRef.current.turnCount !== turnCountAtStart ||
            gameStateRef.current.activePlayerId !== activePlayerAtStart ||
            gameStateRef.current.activePlayerId !== currentPlayerId) {
            console.log('[handleEndTurn] Turn state changed, aborting END_TURN dispatch');
            isEndingTurnRef.current = false;
            setIsEndingTurn(false);
            return;
        }

        // Now dispatch END_TURN
        console.log('[handleEndTurn] Dispatching END_TURN');
        dispatchAndSend({ type: 'END_TURN', playerId: currentPlayerId });
        isEndingTurnRef.current = false;
        setIsEndingTurn(false);
    };

    const remainingEvolves = 2 - (player?.evolutionsUsed || 0);
    const isPlayerFirstPlayer = currentPlayerId === gameState.firstPlayerId;

    // CRITICAL FIX: Calculate player's own turn count (not total game turn count)
    // EP/SEP should unlock when the PLAYER's turn count reaches the threshold,
    // not when the game's total turn count reaches it.
    // This fixes the bug where second player's EP unlocks on opponent's 4th turn instead of their own 4th turn.
    const getPlayerTurnCount = (_playerId: string, isFirst: boolean): number => {
        // Total turnCount increments at the start of each player's turn
        // First player: turns 1, 3, 5, 7... -> player turn 1, 2, 3, 4...
        // Second player: turns 2, 4, 6, 8... -> player turn 1, 2, 3, 4...
        if (isFirst) {
            // First player's turn count = ceil(turnCount / 2)
            return Math.ceil(gameState.turnCount / 2);
        } else {
            // Second player's turn count = floor(turnCount / 2)
            return Math.floor(gameState.turnCount / 2);
        }
    };

    const playerOwnTurnCount = getPlayerTurnCount(currentPlayerId, isPlayerFirstPlayer);

    // Evolution unlocks:
    // First player: can evolve from their 3rd turn onward (game turn 5)
    // Second player: can evolve from their 2nd turn onward (game turn 4) -> but calculated as playerOwnTurnCount >= 2
    // However, the UI visual (EP glow) should show when it's THEIR turn and they've reached the threshold
    const playerEvolveThreshold = isPlayerFirstPlayer ? 3 : 2; // Player's own turn count when EP unlocks
    const playerSuperEvolveThreshold = isPlayerFirstPlayer ? 4 : 3; // Player's own turn count when SEP unlocks

    // EP/SEP unlocked: player's own turn count has reached threshold
    const isEvolveUnlocked = playerOwnTurnCount >= playerEvolveThreshold;
    const isSuperEvolveUnlocked = playerOwnTurnCount >= playerSuperEvolveThreshold;

    // Check if evolution is currently usable (on player's turn with remaining evolves)
    const canEvolveUI = player?.canEvolveThisTurn && remainingEvolves > 0 && gameState.activePlayerId === currentPlayerId && isEvolveUnlocked;
    const canSuperEvolveUI = player?.canEvolveThisTurn && player.sep > 0 && gameState.activePlayerId === currentPlayerId && isSuperEvolveUnlocked;

    // Opponent's evolve unlock status
    const isOpponentFirstPlayer = opponentPlayerId === gameState.firstPlayerId;
    const opponentOwnTurnCount = getPlayerTurnCount(opponentPlayerId, isOpponentFirstPlayer);
    const opponentEvolveThreshold = isOpponentFirstPlayer ? 3 : 2;
    const opponentSuperEvolveThreshold = isOpponentFirstPlayer ? 4 : 3;
    const isOpponentEvolveUnlocked = opponentOwnTurnCount >= opponentEvolveThreshold;
    const isOpponentSuperEvolveUnlocked = opponentOwnTurnCount >= opponentSuperEvolveThreshold;

    // Check if LEADER_DAMAGE_CAP (あじゃ effect) is active
    const playerHasLeaderDamageCap = player?.board?.some(c => c?.passiveAbilities?.includes('LEADER_DAMAGE_CAP')) ?? false;
    const opponentHasLeaderDamageCap = opponent?.board?.some(c => c?.passiveAbilities?.includes('LEADER_DAMAGE_CAP')) ?? false;

    // Force scroll prevention - runs once on mount and sets up scroll listener
    useLayoutEffect(() => {
        // Initial scroll reset
        window.scrollTo(0, 0);
        if (boardRef.current) {
            boardRef.current.scrollTop = 0;
        }

        // Prevent any scroll events from moving the page
        const preventScroll = () => {
            window.scrollTo(0, 0);
        };

        // Listen for scroll events and immediately reset
        window.addEventListener('scroll', preventScroll, { passive: false });

        return () => {
            window.removeEventListener('scroll', preventScroll);
        };
    }, []); // Only run once on mount

    // JOIN: Wait for game state sync from HOST
    // This must be AFTER all hooks to maintain consistent hook order
    if (gameMode === 'JOIN' && !gameSynced) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                color: 'white',
                gap: '1rem'
            }}>
                <div style={{
                    width: '50px',
                    height: '50px',
                    border: '4px solid rgba(233, 69, 96, 0.3)',
                    borderTop: '4px solid #e94560',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
                <p>ゲーム状態を同期中...</p>
                <button onClick={onLeave} style={{
                    marginTop: '1rem',
                    padding: '0.5rem 1rem',
                    background: 'transparent',
                    border: '1px solid #888',
                    color: '#888',
                    cursor: 'pointer',
                    borderRadius: '4px'
                }}>
                    キャンセル
                </button>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    // Scale-adjusted base dimensions for 4K support
    // Now uses independent X/Y scaling to fill entire viewport without black bars
    // At base resolution (1920x1080), scaleX = scaleY = 1
    // At 4K (3840x2160), scaleX = scaleY = 2

    return (
        <div className="game-screen-wrapper"
            style={{
                width: '100vw',
                height: '100vh',
                overflow: 'hidden',
                background: '#000',
                position: 'relative'
            }}
        >
            <div className="game-screen"
                style={{
                    width: '100%',
                    height: '100%',
                    // Transform removed, layout now responsive
                    display: 'flex',
                    overflow: 'hidden',
                    background: 'radial-gradient(circle at center, #1a202c 0%, #000 100%)',
                    fontFamily: "'Helvetica Neue', sans-serif",
                    userSelect: 'none',
                    color: '#fff',
                    position: 'absolute',
                    top: 0,
                    left: 0
                }}
                // REMOVED local onMouseMove/Up listeners to avoid conflict/lag
                onClick={handleBackgroundClick} // Close hand on bg click
            >
                <style>{`
                    html, body {
                        margin: 0; padding: 0; height: 100%; background: #000;
                        overflow: hidden !important;
                        position: fixed !important;
                        width: 100% !important;
                        top: 0 !important;
                        left: 0 !important;
                    }
                    * { box-sizing: border-box; }
                    .shake-target { animation: shake 0.3s cubic-bezier(.36,.07,.19,.97) both; }
                    @keyframes shake {
                        10%, 90% { transform: translate3d(-1px, 0, 0); }
                        20%, 80% { transform: translate3d(2px, 0, 0); }
                        30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                        40%, 60% { transform: translate3d(4px, 0, 0); }
                    }
                    @keyframes attackRotate {
                        0% { transform: rotateY(0deg); }
                        100% { transform: rotateY(360deg); }
                    }
                    .attack-rotating {
                        animation: attackRotate 0.2s linear forwards !important;
                        transform-style: preserve-3d;
                    }
                    @keyframes cardDie {
                        0% { transform: scale(1); filter: brightness(1) drop-shadow(0 0 0 white); opacity: 1; }
                        40% { transform: scale(1.15); filter: brightness(3) drop-shadow(0 0 20px white); opacity: 0.9; }
                        100% { transform: scale(0.4) rotate(8deg); filter: brightness(5) drop-shadow(0 0 40px white); opacity: 0; }
                    }
                    .card-dying { animation: cardDie 0.7s forwards; }
                    /* Necromance effect animations */
                    @keyframes necromanceFloat {
                        0% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
                        50% { transform: translateX(-50%) translateY(-20px) scale(1.2); opacity: 1; }
                        100% { transform: translateX(-50%) translateY(-40px) scale(0.8); opacity: 0; }
                    }
                    @keyframes necromanceFloatOpponent {
                        0% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
                        50% { transform: translateX(-50%) translateY(15px) scale(1.2); opacity: 1; }
                        100% { transform: translateX(-50%) translateY(30px) scale(0.8); opacity: 0; }
                    }
                    @keyframes necroPulse {
                        0%, 100% { box-shadow: 0 0 10px #d946ef, 0 0 20px #a855f7, inset 0 0 15px rgba(217, 70, 239, 0.3); }
                        50% { box-shadow: 0 0 25px #d946ef, 0 0 40px #a855f7, 0 0 60px #7c3aed, inset 0 0 25px rgba(217, 70, 239, 0.5); }
                    }
                    @keyframes leaderDamageCapPulse {
                        0%, 100% {
                            box-shadow: 0 0 20px rgba(103, 232, 249, 0.6), 0 0 40px rgba(103, 232, 249, 0.4), inset 0 0 30px rgba(103, 232, 249, 0.3);
                            border-color: #67e8f9;
                        }
                        50% {
                            box-shadow: 0 0 35px rgba(103, 232, 249, 0.9), 0 0 60px rgba(103, 232, 249, 0.6), 0 0 80px rgba(103, 232, 249, 0.3), inset 0 0 40px rgba(103, 232, 249, 0.5);
                            border-color: #a5f3fc;
                        }
                    }
                `}</style>

                {/* <BattleLog logs={gameState.logs || []} /> */}

                {/* Target Selection Overlay Message */}
                {targetingState && (
                    <div style={{
                        position: 'absolute', top: '15%', left: '50%', transform: 'translate(-50%, -50%)',
                        background: 'rgba(0, 0, 0, 0.7)', color: '#fff', padding: '10px 20px', borderRadius: 20,
                        pointerEvents: 'none', zIndex: 1000, fontWeight: 'bold',
                        border: targetingState.allowedTargetPlayerId === currentPlayerId ? '2px solid #48bb78' : '2px solid #f56565'
                    }}>
                        {targetingState.allowedTargetPlayerId === currentPlayerId ? '味方のフォロワーを選択してください' : '相手のフォロワーを選択してください'}
                    </div>
                )}

                {/* --- Help Modal --- */}
                {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

                {/* --- Menu Overlay --- */}
                {showMenu && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 4000,
                        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }} onClick={() => setShowMenu(false)}>
                        <div style={{ background: '#2d3748', padding: 40, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 300, border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
                            <h2 style={{ margin: 0, textAlign: 'center', borderBottom: '1px solid #4a5568', paddingBottom: 10, color: '#fff' }}>メニュー</h2>

                            {!showSettings ? (
                                <>
                                    <button onClick={() => setShowMenu(false)} style={{ padding: 15, background: '#4a5568', border: 'none', color: 'white', borderRadius: 8, cursor: 'pointer', fontSize: '1.2rem' }}>再開</button>
                                    <button onClick={() => setShowSettings(true)} style={{ padding: 15, background: '#2b6cb0', border: 'none', color: 'white', borderRadius: 8, cursor: 'pointer', fontSize: '1.2rem' }}>設定</button>
                                    <button onClick={onLeave} style={{ padding: 15, background: '#e53e3e', border: 'none', color: 'white', borderRadius: 8, cursor: 'pointer', fontSize: '1.2rem' }}>降参して終了</button>
                                </>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                                    <h3 style={{ margin: 0, color: '#cbd5e0' }}>音声設定</h3>
                                    {/* BGM Toggle */}
                                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
                                        BGM再生
                                        <input type="checkbox" checked={audioSettings.bgmEnabled} onChange={e => setAudioSettings((prev: any) => ({ ...prev, bgmEnabled: e.target.checked }))}
                                            style={{ width: 20, height: 20 }}
                                        />
                                    </label>

                                    {/* SE Toggle */}
                                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
                                        SE再生
                                        <input type="checkbox" checked={audioSettings.seEnabled} onChange={e => setAudioSettings((prev: any) => ({ ...prev, seEnabled: e.target.checked }))}
                                            style={{ width: 20, height: 20 }}
                                        />
                                    </label>

                                    {/* BGM Volume */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a0aec0', marginBottom: 5 }}>
                                            <span>BGM</span>
                                            <span>{Math.round(audioSettings.bgm * 100)}%</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="1" step="0.01"
                                            value={audioSettings.bgm}
                                            onChange={e => setAudioSettings((prev: any) => ({ ...prev, bgm: parseFloat(e.target.value) }))}
                                            style={{ width: '100%' }}
                                        />
                                    </div>

                                    {/* SE Volume */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a0aec0', marginBottom: 5 }}>
                                            <span>SE</span>
                                            <span>{Math.round(audioSettings.se * 100)}%</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="1" step="0.01"
                                            value={audioSettings.se}
                                            onChange={e => setAudioSettings((prev: any) => ({ ...prev, se: parseFloat(e.target.value) }))}
                                            style={{ width: '100%' }}
                                        />
                                    </div>

                                    {/* Voice Volume */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a0aec0', marginBottom: 5 }}>
                                            <span>ボイス</span>
                                            <span>{Math.round(audioSettings.voice * 100)}%</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="1" step="0.01"
                                            value={audioSettings.voice}
                                            onChange={e => setAudioSettings((prev: any) => ({ ...prev, voice: parseFloat(e.target.value) }))}
                                            style={{ width: '100%' }}
                                        />
                                    </div>

                                    <button onClick={() => setShowSettings(false)} style={{ padding: 10, background: '#4a5568', border: 'none', color: 'white', borderRadius: 8, cursor: 'pointer', marginTop: 10 }}>戻る</button>
                                </div>
                            )}

                        </div>
                    </div>
                )}



                {/* --- Left Sidebar: Card Info & Menu (Responsive width) --- */}
                <div className={shake ? 'shake-target' : ''} style={{ width: 340 * scale, borderRight: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', padding: `${20 * scale}px ${20 * scale}px ${20 * scale}px`, display: 'flex', flexDirection: 'column', zIndex: 20, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    {/* Menu Button */}
                    <div style={{ marginBottom: 12 * scale }}>
                        <button onClick={() => setShowMenu(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 5 }}>
                            <div style={{ width: 30 * scale, height: 3 * scale, background: '#cbd5e0', marginBottom: 6 * scale }}></div>
                            <div style={{ width: 30 * scale, height: 3 * scale, background: '#cbd5e0', marginBottom: 6 * scale }}></div>
                            <div style={{ width: 30 * scale, height: 3 * scale, background: '#cbd5e0' }}></div>
                        </button>
                    </div>

                    <h3 style={{ color: '#a0aec0', borderBottom: '1px solid #4a5568', paddingBottom: 8, marginTop: 0, marginBottom: 0 }}>カード情報</h3>
                    {selectedCard ? (
                        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', flex: 1 }}>
                            {/* Main Card Info */}
                            <div>
                                {/* Art Only */}
                                <div style={{
                                    width: '100%', aspectRatio: '1/1', marginBottom: 12,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Card card={selectedCard.card} style={{ width: '100%', height: '100%' }} variant="art-only" />
                                </div>

                                {/* Name */}
                                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: 6, textAlign: 'center' }}>{selectedCard.card.name}</div>

                                {/* Stats with Icons */}
                                {selectedCard.card.type === 'FOLLOWER' && (
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 10 }}>
                                        {/* Attack Spade */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                                <polygon points="12,2 22,22 2,22" fill="#63b3ed" stroke="none" />
                                            </svg>
                                            <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#4299e1' }}>
                                                {'currentAttack' in selectedCard.card ? (selectedCard.card as any).currentAttack : selectedCard.card.attack}
                                            </span>
                                        </div>
                                        {/* Health Heart */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="#f56565">
                                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                            </svg>
                                            <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#f56565' }}>
                                                {'currentHealth' in selectedCard.card ? (selectedCard.card as any).currentHealth : selectedCard.card.health}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div style={{ fontSize: '0.95rem', color: '#cbd5e0', lineHeight: '1.5', whiteSpace: 'pre-wrap', borderTop: '1px solid #4a5568', paddingTop: 8 }}>
                                    {selectedCard.card.description}
                                </div>
                            </div>

                            {/* Flavor Text - Bottom Aligned */}
                            {selectedCard.card.flavorText && (
                                <div style={{
                                    marginTop: 'auto',
                                    paddingTop: 15,
                                    paddingBottom: 10,
                                }}>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: 'rgba(160, 174, 192, 0.6)',
                                        lineHeight: '1.5',
                                        fontStyle: 'italic',
                                        whiteSpace: 'pre-wrap',
                                        textAlign: 'right',
                                    }}>
                                        {selectedCard.card.flavorText}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ marginTop: 20, color: '#718096', fontStyle: 'italic', flex: 1 }}>カードを選択して詳細を表示</div>
                    )}
                </div>

                {/* --- Right Main Area (80%) --- */}
                <div ref={boardRef} className={shake ? 'shake-target' : ''} style={{ flex: 1, height: '100%', position: 'relative', background: 'rgba(0,0,0,0.1)', overflow: 'hidden' }}>

                    {/* ========================================== */}
                    {/* OPPONENT LEADER - Fixed at top center */}
                    {/* Size: 240px, UI mirrored from player (EP/SEP at bottom, HP left of EP) */}
                    {/* ========================================== */}
                    <div ref={opponentLeaderRef}
                        onMouseEnter={() => setHoveredTarget({ type: 'LEADER', playerId: opponentPlayerId })}
                        onMouseLeave={() => setHoveredTarget(null)}
                        onClick={(e) => { e.stopPropagation(); if (targetingState) handleTargetClick('LEADER', -1, opponentPlayerId); }}
                        style={{
                            position: 'absolute', top: -20 * scale, left: '50%', transform: 'translateX(-50%)', // Adjusted translateY
                            width: LEADER_SIZE * scale, height: LEADER_SIZE * scale, borderRadius: '50%',
                            background: `url(${getLeaderImg(opponent.class)}) center/cover`,
                            border: opponentHasLeaderDamageCap
                                ? '4px solid #67e8f9'
                                : (hoveredTarget?.type === 'LEADER' && hoveredTarget.playerId === opponentPlayerId && !targetingState) ? '4px solid #f56565' : '4px solid #4a5568',
                            boxShadow: opponentHasLeaderDamageCap
                                ? '0 0 20px rgba(103, 232, 249, 0.6), 0 0 40px rgba(103, 232, 249, 0.4), inset 0 0 30px rgba(103, 232, 249, 0.3)'
                                : '0 0 20px rgba(0,0,0,0.5)',
                            zIndex: 100,
                            cursor: 'default',
                            transition: 'all 0.3s',
                            animation: opponentHasLeaderDamageCap ? 'leaderDamageCapPulse 1.5s ease-in-out infinite' : 'none'
                        }}>
                        {/* Opponent HP - Mirrored Player Position (Screen Left relative to center) */}
                        <div style={{
                            position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%) translateX(-140px)',
                            width: 55 * scale, height: 55 * scale, background: 'radial-gradient(circle at 30% 30%, #feb2b2, #c53030)', borderRadius: '50%',
                            border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.6rem', fontWeight: 900, color: 'white', textShadow: '0 2px 2px rgba(0,0,0,0.5)', zIndex: 10,
                            boxShadow: '0 4px 6px rgba(0,0,0,0.4)'
                        }}>{opponent.hp}</div>

                        {/* Opponent EP - Circular Frame */}
                        <div style={{
                            position: 'absolute', bottom: 10 * scale, left: '50%', transform: 'translateX(-50%) translateX(-80px)',
                            width: 45 * scale, height: 45 * scale, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)',
                            background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
                            opacity: isOpponentEvolveUnlocked ? 1 : 0.5, filter: isOpponentEvolveUnlocked ? 'none' : 'grayscale(0.8)'
                        }}>
                            <div style={{ display: 'flex', gap: 3 * scale }}>
                                {Array(2).fill(0).map((_, i) => {
                                    const hasEP = i < (2 - opponent.evolutionsUsed);
                                    return <div key={i} style={{
                                        width: 12 * scale, height: 12 * scale, borderRadius: '50%',
                                        background: hasEP ? '#ecc94b' : '#2d3748',
                                        boxShadow: hasEP && isOpponentEvolveUnlocked ? '0 0 8px #ecc94b, 0 0 15px #ecc94b' : 'none',
                                        border: '2px solid rgba(0,0,0,0.5)'
                                    }} />;
                                })}
                            </div>
                        </div>

                        {/* Opponent SEP - Circular Frame */}
                        <div style={{
                            position: 'absolute', bottom: 10 * scale, left: '50%', transform: 'translateX(-50%) translateX(80px)',
                            width: 45 * scale, height: 45 * scale, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)',
                            background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
                            opacity: isOpponentSuperEvolveUnlocked ? 1 : 0.5, filter: isOpponentSuperEvolveUnlocked ? 'none' : 'grayscale(0.8)'
                        }}>
                            <div style={{ display: 'flex', gap: 3 * scale }}>
                                {Array(2).fill(0).map((_, i) => {
                                    const hasSEP = i < opponent.sep;
                                    return <div key={i} style={{
                                        width: 12 * scale, height: 12 * scale, borderRadius: '50%',
                                        background: hasSEP ? '#9f7aea' : '#2d3748',
                                        boxShadow: hasSEP && isOpponentSuperEvolveUnlocked ? '0 0 8px #9f7aea, 0 0 15px #9f7aea' : 'none',
                                        border: '2px solid rgba(0,0,0,0.5)'
                                    }} />;
                                })}
                            </div>
                        </div>

                        {/* Attack Target Marker for Leader - Cyan glow */}
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: LEADER_SIZE * scale * 0.75,
                            height: LEADER_SIZE * scale * 0.75,
                            pointerEvents: 'none',
                            zIndex: 20,
                            opacity: (hoveredTarget?.type === 'LEADER' && hoveredTarget.playerId === opponentPlayerId && dragState) ? 1 : 0,
                            transition: 'opacity 0.1s ease-out'
                        }}>
                            <svg width="100%" height="100%" viewBox="0 0 100 100">
                                <defs>
                                    <filter id="leaderCyanMarkerGlow" x="-50%" y="-50%" width="200%" height="200%">
                                        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                                        <feMerge>
                                            <feMergeNode in="blur" />
                                            <feMergeNode in="blur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                </defs>
                                {/* Rotating group for circle and arrows */}
                                <g style={{
                                    transformOrigin: '50% 50%',
                                    animation: 'leaderMarkerSpin 2s linear infinite'
                                }}>
                                    <circle cx="50" cy="50" r="45"
                                        fill="none"
                                        stroke="rgba(100, 200, 255, 0.9)"
                                        strokeWidth="3"
                                        strokeDasharray="15 8"
                                        filter="url(#leaderCyanMarkerGlow)"
                                    />
                                    {/* Corner Arrows with glow - slightly larger */}
                                    <polygon points="50,5 44,18 56,18"
                                        fill="rgba(150, 220, 255, 1)"
                                        filter="url(#leaderCyanMarkerGlow)" />
                                    <polygon points="95,50 82,44 82,56"
                                        fill="rgba(150, 220, 255, 1)"
                                        filter="url(#leaderCyanMarkerGlow)" />
                                    <polygon points="50,95 56,82 44,82"
                                        fill="rgba(150, 220, 255, 1)"
                                        filter="url(#leaderCyanMarkerGlow)" />
                                    <polygon points="5,50 18,56 18,44"
                                        fill="rgba(150, 220, 255, 1)"
                                        filter="url(#leaderCyanMarkerGlow)" />
                                </g>
                            </svg>
                            <style>{`
                                @keyframes leaderMarkerSpin {
                                    0% { transform: rotate(0deg); }
                                    100% { transform: rotate(360deg); }
                                }
                            `}</style>
                        </div>
                    </div>

                    {/* Opponent Deck - Top Left (with sleeve image) */}
                    <div style={{ position: 'absolute', top: 20 * scale, left: 20 * scale, width: 60 * scale, height: 85 * scale, zIndex: 50 }}>
                        {[...Array(Math.min(5, Math.ceil(opponent.deck.length / 5)))].map((_, i) => (
                            <div key={i} style={{
                                position: 'absolute',
                                inset: 0,
                                transform: `translate(${i * 2 * scale}px, ${-i * 2 * scale}px)`,
                                borderRadius: 6,
                                border: '1px solid #718096',
                                overflow: 'hidden'
                            }}>
                                <img
                                    src={getSleeveImg(opponent?.class || 'SENKA')}
                                    alt="Deck"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).parentElement!.style.background = 'linear-gradient(45deg, #2d3748, #1a202c)';
                                    }}
                                />
                            </div>
                        ))}
                        <div style={{ position: 'absolute', bottom: -20 * scale, width: '100%', textAlign: 'center', fontWeight: 'bold', color: '#a0aec0', fontSize: '0.9rem' }}>{opponent.deck.length}</div>
                    </div>

                    {/* Opponent Hand & Graveyard Count - Top Right (墓地の近くに手札を配置) */}
                    <div style={{ position: 'absolute', top: 20 * scale, right: 20 * scale, display: 'flex', alignItems: 'center', gap: 10, zIndex: 50, pointerEvents: 'none' }}>
                        {/* Opponent Hand Icon - Stacked Cards (自分の手札アイコンと同じスタイル) */}
                        <div style={{ position: 'relative', width: 32, height: 40 }}>
                            <div style={{ position: 'absolute', inset: 0, background: '#4a192c', borderRadius: 3, border: '1px solid #742a3a', transform: 'rotate(-15deg) translate(-4px, 0)' }} />
                            <div style={{ position: 'absolute', inset: 0, background: '#3d1525', borderRadius: 3, border: '1px solid #742a3a', transform: 'rotate(-5deg) translate(-2px, 0)' }} />
                            <div style={{ position: 'absolute', inset: 0, background: '#2d1a20', borderRadius: 3, border: '1px solid #8b3a4a', transform: 'rotate(5deg)' }} />
                        </div>
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(74, 25, 44, 0.8), rgba(45, 26, 32, 0.9))',
                            padding: '4px 10px',
                            borderRadius: 6,
                            color: '#f0b8c4',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            border: '1px solid rgba(116, 42, 58, 0.5)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.4)'
                        }}>
                            手札 {opponent.hand.length}
                        </div>
                        {/* Opponent Graveyard Count */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                            <div style={{
                                fontSize: '1.2rem',
                                filter: 'drop-shadow(0 0 2px rgba(128, 90, 213, 0.6)) grayscale(30%)'
                            }}>
                                💀
                            </div>
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(128, 90, 213, 0.7), rgba(76, 29, 149, 0.8))',
                                padding: '4px 10px',
                                borderRadius: 6,
                                color: '#c4b5fd',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                border: '1px solid rgba(167, 139, 250, 0.4)',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                                position: 'relative'
                            }}>
                                墓地 {opponent.graveyard.length}
                                {/* Necromance Effect - Purple -X animation */}
                                {necromanceEffects.filter(e => e.playerId === opponentPlayerId).map(effect => (
                                    <div
                                        key={effect.key}
                                        style={{
                                            position: 'absolute',
                                            bottom: -25,
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            color: '#d946ef',
                                            fontSize: '1.2rem',
                                            fontWeight: 'bold',
                                            textShadow: '0 0 8px #d946ef, 0 0 15px #a855f7, 0 0 25px #7c3aed',
                                            animation: 'necromanceFloatOpponent 1.5s ease-out forwards',
                                            pointerEvents: 'none',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        -{effect.amount}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ========================================== */}
                    {/* BATTLE FIELD - Fixed Areas with smooth sliding cards */}
                    {/* ========================================== */}

                    {/* Opponent Slots - Scaled Position */}
                    <div style={{
                        position: 'absolute', top: `calc(50% - ${CARD_HEIGHT * scale / 2}px - ${70 * scale}px)`, left: '0', width: '100%', height: CARD_HEIGHT * scale, // Adjusted top margin to 70
                        pointerEvents: 'none', zIndex: 10
                    }}>
                        <div style={{
                            position: 'relative', width: '100%', height: '100%',
                            display: 'flex', justifyContent: 'center'
                        }}>
                            {visualOpponentBoard.map((c: any, i: number) => {
                                const boardSize = visualOpponentBoard.length;
                                const offsetX = (i - (boardSize - 1) / 2) * CARD_SPACING * scale;

                                return (
                                    <div key={c?.instanceId || `empty-opp-${i}`}
                                        ref={el => opponentBoardRefs.current[i] = el}
                                        onMouseEnter={() => {
                                            // Only set hover target during drag operations (not on mouse-over)
                                            if (dragState) {
                                                setHoveredTarget({ type: 'FOLLOWER', index: i, playerId: opponentPlayerId, instanceId: c?.instanceId });
                                            }
                                        }}
                                        onMouseLeave={() => {
                                            if (dragState) {
                                                setHoveredTarget(null);
                                            }
                                        }}
                                        onClick={(e) => { e.stopPropagation(); if (targetingState) { if (!c) return; handleTargetClick('FOLLOWER', i, opponentPlayerId, c?.instanceId); } else { c && setSelectedCard({ card: c, owner: 'OPPONENT' }) } }}
                                        style={{
                                            position: 'absolute',
                                            left: '50%',
                                            top: 0,
                                            transform: `translateX(calc(-50% + ${offsetX}px))`,
                                            transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), left 0.4s ease',
                                            border: (targetingState && c && targetingState.allowedTargetPlayerId === opponentPlayerId) ? '2px solid #f56565' : 'none',
                                            boxShadow: (targetingState && c && targetingState.allowedTargetPlayerId === opponentPlayerId) ? '0 0 15px #f56565' : 'none',
                                            borderRadius: 8,
                                            cursor: targetingState ? 'crosshair' : 'default',
                                            width: CARD_WIDTH * scale,
                                            height: CARD_HEIGHT * scale,
                                            pointerEvents: 'auto',
                                            opacity: (evolveAnimation && evolveAnimation.sourcePlayerId === opponentPlayerId && evolveAnimation.followerIndex === i) ? 0 : (c as any)?.isDying ? 0.8 : 1,
                                            transitionProperty: (evolveAnimation && evolveAnimation.sourcePlayerId === opponentPlayerId && evolveAnimation.followerIndex === i) ? 'none' : 'transform, left, opacity'
                                        }}>
                                        {/* Card wrapper for 3D flip structure with sleeve (opponent's cards) */}
                                        <div style={{ width: '100%', height: '100%', perspective: '800px' }}>
                                            <div
                                                className={(attackingFollowerInstanceId === c?.instanceId || counterAttackingFollowerInstanceId === c?.instanceId) ? 'attack-rotating' : ''}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    position: 'relative',
                                                    transformStyle: 'preserve-3d'
                                                }}>
                                                {/* Front - Card */}
                                                <div style={{
                                                    position: 'absolute',
                                                    width: '100%',
                                                    height: '100%',
                                                    backfaceVisibility: 'hidden',
                                                    WebkitBackfaceVisibility: 'hidden'
                                                }}>
                                                    {c ? <Card card={c} turnCount={gameState.turnCount} className={c.isDying ? 'card-dying' : ''} style={{ width: CARD_WIDTH * scale, height: CARD_HEIGHT * scale, opacity: 1 /* opacity handled by parent */, filter: (c as any).isDying ? 'grayscale(0.5) brightness(2)' : 'none', boxShadow: (hoveredTarget?.type === 'FOLLOWER' && hoveredTarget.index === i && dragState?.sourceType === 'BOARD') ? '0 0 20px #f56565' : (dragState?.sourceType === 'BOARD' ? '0 0 20px #f6e05e' : undefined) }} isOnBoard={true} isSpecialSummoning={summonedCardIds.has((c as any).instanceId)} /> : <div style={{ width: CARD_WIDTH * scale, height: CARD_HEIGHT * scale, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 8 }} />}
                                                </div>
                                                {/* Back - Sleeve (opponent's cards use opponent's class sleeve) */}
                                                {c && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        width: '100%',
                                                        height: '100%',
                                                        backfaceVisibility: 'hidden',
                                                        WebkitBackfaceVisibility: 'hidden',
                                                        transform: 'rotateY(180deg)',
                                                        borderRadius: 12,
                                                        overflow: 'hidden'
                                                    }}>
                                                        <img
                                                            src={getSleeveImg(opponent?.class || 'SENKA')}
                                                            alt="Card Sleeve"
                                                            style={{
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'cover'
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Attack Target Marker - Cyan glow (no outer ellipse) - Always rendered for fade transition */}
                                        {c && dragState?.sourceType === 'BOARD' && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '50%',
                                                left: '50%',
                                                width: '100%',
                                                height: '100%',
                                                transform: 'translate(-50%, -50%)',
                                                pointerEvents: 'none',
                                                zIndex: 20,
                                                opacity: (hoveredTarget?.type === 'FOLLOWER' && hoveredTarget.index === i && hoveredTarget.playerId === opponentPlayerId) ? 1 : 0,
                                                transition: 'opacity 0.1s ease-out'
                                            }}>
                                                <svg viewBox="0 0 100 100" style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    filter: 'drop-shadow(0 0 12px rgba(100, 200, 255, 0.9))'
                                                }}>
                                                    <defs>
                                                        <filter id="cyanMarkerGlow" x="-50%" y="-50%" width="200%" height="200%">
                                                            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                                                            <feMerge>
                                                                <feMergeNode in="blur" />
                                                                <feMergeNode in="blur" />
                                                                <feMergeNode in="SourceGraphic" />
                                                            </feMerge>
                                                        </filter>
                                                    </defs>
                                                    {/* Rotating group for circle and arrows */}
                                                    <g style={{
                                                        transformOrigin: '50px 50px',
                                                        animation: 'attackMarkerSpin 1.5s linear infinite reverse'
                                                    }}>
                                                        {/* Inner dashed circle */}
                                                        <circle cx="50" cy="50" r="40" fill="none"
                                                            stroke="rgba(100, 200, 255, 0.95)"
                                                            strokeWidth="4"
                                                            strokeDasharray="12 6"
                                                            filter="url(#cyanMarkerGlow)"
                                                        />
                                                        {/* Corner Arrows with glow */}
                                                        <polygon points="50,10 45,20 55,20"
                                                            fill="rgba(150, 220, 255, 1)"
                                                            filter="url(#cyanMarkerGlow)" />
                                                        <polygon points="90,50 80,45 80,55"
                                                            fill="rgba(150, 220, 255, 1)"
                                                            filter="url(#cyanMarkerGlow)" />
                                                        <polygon points="50,90 55,80 45,80"
                                                            fill="rgba(150, 220, 255, 1)"
                                                            filter="url(#cyanMarkerGlow)" />
                                                        <polygon points="10,50 20,55 20,45"
                                                            fill="rgba(150, 220, 255, 1)"
                                                            filter="url(#cyanMarkerGlow)" />
                                                    </g>
                                                </svg>
                                                <style>{`
                                                    @keyframes attackMarkerSpin {
                                                        0% { transform: rotate(0deg); }
                                                        100% { transform: rotate(360deg); }
                                                    }
                                                `}</style>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Player Slots - Scaled Position */}
                    <div style={{
                        position: 'absolute', bottom: `calc(50% - ${CARD_HEIGHT * scale / 2}px - ${70 * scale}px)`, left: '0', width: '100%', height: CARD_HEIGHT * scale, // Adjusted bottom margin to 70
                        pointerEvents: 'none', zIndex: 10
                    }}>
                        <div style={{
                            position: 'relative', width: '100%', height: '100%',
                            display: 'flex', justifyContent: 'center'
                        }}>
                            {visualPlayerBoard.map((c: any, i: number) => {
                                const boardSize = visualPlayerBoard.length;
                                const offsetX = (i - (boardSize - 1) / 2) * CARD_SPACING * scale;

                                return (
                                    <div key={c?.instanceId || `empty-plr-${i}`}
                                        ref={el => playerBoardRefs.current[i] = el}
                                        onMouseDown={(e) => handleBoardMouseDown(e, i, c?.instanceId)}
                                        onClick={(e) => e.stopPropagation()} // Prevent background click from validating selection
                                        onMouseEnter={() => {
                                            // Only set hover target during drag operations (not on mouse-over)
                                            if (dragState) {
                                                setHoveredTarget({ type: 'FOLLOWER', index: i, playerId: currentPlayerId, instanceId: c?.instanceId });
                                            }
                                        }}
                                        onMouseLeave={() => {
                                            if (dragState) {
                                                setHoveredTarget(null);
                                            }
                                        }}
                                        style={{
                                            position: 'absolute',
                                            left: '50%',
                                            top: 0,
                                            '--offsetX': `calc(-50% + ${offsetX}px)`,
                                            transform: `translateX(calc(-50% + ${offsetX}px)) ${dragState?.sourceType === 'BOARD' && dragState.sourceIndex === i ? 'translateY(-20px) scale(1.1)' : ''}`,
                                            transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), left 0.4s ease',
                                            cursor: 'pointer',
                                            pointerEvents: 'auto',
                                            width: CARD_WIDTH * scale,
                                            height: CARD_HEIGHT * scale,
                                            border: (targetingState && c && targetingState.allowedTargetPlayerId === currentPlayerId) ? '2px solid #48bb78' : 'none',
                                            boxShadow: (targetingState && c && targetingState.allowedTargetPlayerId === currentPlayerId) ? '0 0 15px #48bb78' : 'none',
                                            borderRadius: 8,
                                            zIndex: dragState?.sourceType === 'BOARD' && dragState.sourceIndex === i ? 10 : 1,
                                            opacity: (evolveAnimation && evolveAnimation.sourcePlayerId === currentPlayerId && evolveAnimation.followerIndex === i) ? 0 : (c as any)?.isDying ? 0.8 : 1,
                                            transitionProperty: (evolveAnimation && evolveAnimation.sourcePlayerId === currentPlayerId && evolveAnimation.followerIndex === i) ? 'none' : 'transform, left, opacity'
                                        } as React.CSSProperties}
                                        >
                                        {/* Card wrapper for attack rotation - 3D flip structure with sleeve */}
                                        <div style={{ width: '100%', height: '100%', perspective: '800px' }}>
                                            <div
                                                className={(attackingFollowerInstanceId === c?.instanceId || counterAttackingFollowerInstanceId === c?.instanceId) ? 'attack-rotating' : ''}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    position: 'relative',
                                                    transformStyle: 'preserve-3d'
                                                }}
                                            >
                                                {/* Front - Card */}
                                                <div style={{
                                                    position: 'absolute',
                                                    width: '100%',
                                                    height: '100%',
                                                    backfaceVisibility: 'hidden',
                                                    WebkitBackfaceVisibility: 'hidden'
                                                }}>
                                                    {c ? <Card card={c} turnCount={gameState.turnCount} className={c.isDying ? 'card-dying' : ''} style={{ width: CARD_WIDTH * scale, height: CARD_HEIGHT * scale, opacity: 1 /* opacity handled by parent */, filter: (c as any).isDying ? 'grayscale(0.5) brightness(2)' : 'none', boxShadow: (dragState?.sourceType === 'BOARD' && dragState.sourceIndex === i && hoveredTarget?.type === 'FOLLOWER') ? '0 0 30px #f56565' : (dragState?.sourceType === 'BOARD' && dragState.sourceIndex === i ? '0 20px 30px rgba(0,0,0,0.6)' : undefined), pointerEvents: dragState?.sourceType === 'BOARD' && dragState.sourceIndex === i ? 'none' : 'auto' }} isSelected={selectedCard?.card === c} isOnBoard={true} isSpecialSummoning={summonedCardIds.has((c as any).instanceId)} isMyTurn={gameState.activePlayerId === currentPlayerId} /> : <div style={{ width: CARD_WIDTH * scale, height: CARD_HEIGHT * scale, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 8 }} />}
                                                </div>
                                                {/* Back - Sleeve (only for player's cards) */}
                                                {c && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        width: '100%',
                                                        height: '100%',
                                                        backfaceVisibility: 'hidden',
                                                        WebkitBackfaceVisibility: 'hidden',
                                                        transform: 'rotateY(180deg)',
                                                        borderRadius: 12,
                                                        overflow: 'hidden'
                                                    }}>
                                                        <img
                                                            src={getSleeveImg(player?.class || 'SENKA')}
                                                            alt="Card Sleeve"
                                                            style={{
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'cover'
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Evolve Target Marker - Always rendered for fade transition */}
                                        {c && dragState?.sourceType === 'EVOLVE' && !c.hasEvolved && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '50%',
                                                left: '50%',
                                                width: '120%',
                                                height: '120%',
                                                transform: 'translate(-50%, -50%)',
                                                pointerEvents: 'none',
                                                border: dragState.useSep ? '2px dashed rgba(183, 148, 244, 0.9)' : '2px dashed rgba(255, 230, 100, 0.9)',
                                                borderRadius: '50%',
                                                boxShadow: dragState.useSep ? '0 0 15px rgba(159, 122, 234, 0.8)' : '0 0 15px rgba(255, 200, 50, 0.8)',
                                                animation: 'evolveMarkerSpin 1.5s linear infinite',
                                                zIndex: 20,
                                                opacity: (hoveredTarget?.type === 'FOLLOWER' && hoveredTarget.index === i && hoveredTarget.playerId === currentPlayerId) ? 1 : 0,
                                                transition: 'opacity 0.1s ease-out'
                                            }}>
                                                <svg viewBox="0 0 100 100" style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    filter: 'drop-shadow(0 0 8px currentColor)'
                                                }}>
                                                    <defs>
                                                        <filter id={dragState.useSep ? 'purpleMarkerGlow' : 'yellowMarkerGlow'} x="-30%" y="-30%" width="160%" height="160%">
                                                            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                                                            <feMerge>
                                                                <feMergeNode in="blur" />
                                                                <feMergeNode in="SourceGraphic" />
                                                            </feMerge>
                                                        </filter>
                                                    </defs>
                                                    <circle cx="50" cy="50" r="45" fill="none"
                                                        stroke={dragState.useSep ? '#b794f4' : '#f6e05e'}
                                                        strokeWidth="4"
                                                        strokeDasharray="15 8"
                                                        filter={`url(#${dragState.useSep ? 'purpleMarkerGlow' : 'yellowMarkerGlow'})`}
                                                        opacity="0.95"
                                                    />
                                                    {/* Corner Arrows with glow */}
                                                    <polygon points="50,5 45,15 55,15"
                                                        fill={dragState.useSep ? '#b794f4' : '#f6e05e'}
                                                        filter={`url(#${dragState.useSep ? 'purpleMarkerGlow' : 'yellowMarkerGlow'})`} />
                                                    <polygon points="95,50 85,45 85,55"
                                                        fill={dragState.useSep ? '#b794f4' : '#f6e05e'}
                                                        filter={`url(#${dragState.useSep ? 'purpleMarkerGlow' : 'yellowMarkerGlow'})`} />
                                                    <polygon points="50,95 55,85 45,85"
                                                        fill={dragState.useSep ? '#b794f4' : '#f6e05e'}
                                                        filter={`url(#${dragState.useSep ? 'purpleMarkerGlow' : 'yellowMarkerGlow'})`} />
                                                    <polygon points="5,50 15,55 15,45"
                                                        fill={dragState.useSep ? '#b794f4' : '#f6e05e'}
                                                        filter={`url(#${dragState.useSep ? 'purpleMarkerGlow' : 'yellowMarkerGlow'})`} />
                                                </svg>
                                                <style>{`
                                                @keyframes evolveMarkerSpin {
                                                    0% { transform: translate(-50%, -50%) rotate(0deg); }
                                                    100% { transform: translate(-50%, -50%) rotate(360deg); }
                                                }
                                            `}</style>
                                            </div>
                                        )}
                                    </div>
                                );

                            })}
                        </div>
                    </div>

                    {/* ========================================== */}
                    {/* RIGHT SIDE CONTROLS - Centered vertically (UPSIZED 2X) */}
                    {/* ========================================== */}
                    <div style={{ position: 'absolute', right: 30 * scale, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 30 * scale, zIndex: 50 }}>
                        {/* Opponent PP */}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: `${1.8 * scale}rem`, fontWeight: 900, color: '#f6e05e', fontFamily: '"游明朝", "Yu Mincho", "ヒラギノ明朝 ProN", "Hiragino Mincho ProN", serif' }}>{opponent.pp}/{opponent.maxPp}</div>
                            <div style={{ display: 'flex', gap: 4 * scale, justifyContent: 'center' }}>{Array(Math.min(10, opponent.maxPp)).fill(0).map((_, i) => <div key={i} style={{ width: 10 * scale, height: 10 * scale, borderRadius: '50%', background: i < opponent.pp ? '#f6e05e' : '#2d3748' }} />)}</div>
                        </div>
                        {/* End Turn Button */}
                        <button
                            disabled={gameState.activePlayerId !== currentPlayerId || isEndingTurn}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                if (gameState.activePlayerId === currentPlayerId && !isEndingTurn) {
                                    setIsEndTurnPressed(true);
                                }
                            }}
                            onMouseUp={(e) => {
                                e.stopPropagation();
                                if (isEndTurnPressed && gameState.activePlayerId === currentPlayerId && !isEndingTurn) {
                                    setIsEndTurnPressed(false);
                                    // SE再生
                                    playSE('sisiodosi.mp3', 0.6);
                                    // ボタン中央の座標を取得してエフェクト発火
                                    const rect = (e.target as HTMLElement).closest('button')?.getBoundingClientRect();
                                    if (rect) {
                                        triggerEndTurnEffect(rect.left + rect.width / 2, rect.top + rect.height / 2);
                                    }
                                    handleEndTurn();
                                }
                            }}
                            onMouseLeave={() => {
                                // マウスがボタン外に出たら押下状態をリセット
                                setIsEndTurnPressed(false);
                            }}
                            style={{
                                width: 160 * scale,
                                height: 160 * scale,
                                borderRadius: '50%',
                                border: '4px solid rgba(255,255,255,0.2)',
                                background: isEndingTurn
                                    ? 'linear-gradient(135deg, #805ad5, #6b46c1)'
                                    : isEndTurnPressed
                                        ? 'linear-gradient(135deg, #5a9bd5, #4a7fb0)' // 押下中は明るめに
                                        : (gameState.activePlayerId === currentPlayerId ? 'linear-gradient(135deg, #3182ce, #2b6cb0)' : '#2d3748'),
                                color: 'white',
                                fontWeight: 900,
                                fontSize: `${2 * scale}rem`,
                                fontFamily: '"游明朝", "Yu Mincho", "ヒラギノ明朝 ProN", "Hiragino Mincho ProN", serif',
                                boxShadow: gameState.activePlayerId === currentPlayerId
                                    ? (isEndTurnPressed ? '0 0 20px rgba(66, 153, 225, 0.5)' : '0 0 40px rgba(66, 153, 225, 0.8)')
                                    : 'none',
                                opacity: isEndTurnPressed ? 0.8 : 1, // 押下中は少し薄く
                                cursor: (gameState.activePlayerId === currentPlayerId && !isEndingTurn) ? 'pointer' : 'default',
                                transition: 'all 0.1s', // 押下反応を早くする
                                position: 'relative',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                lineHeight: 1.2
                            }}
                        >
                            {/* 紋章背景 */}
                            <img
                                src={getAssetUrl('/assets/tenfubu_mark.png')}
                                alt=""
                                style={{
                                    position: 'absolute',
                                    width: '80%',
                                    height: '80%',
                                    objectFit: 'contain',
                                    opacity: 0.25, // 0.15 → 0.25 くっきり表示
                                    pointerEvents: 'none'
                                }}
                            />
                            {isEndingTurn ? (
                                <span style={{ position: 'relative', zIndex: 1 }}>処理中...</span>
                            ) : (
                                <>
                                    <span style={{ position: 'relative', zIndex: 1 }}>ターン</span>
                                    <span style={{ position: 'relative', zIndex: 1 }}>終了</span>
                                </>
                            )}
                        </button>
                        {/* Player PP */}
                        <div style={{ textAlign: 'center' }}>
                            {/* PP数値表示 - エクストラPP有効時は「PP + 1」表示 */}
                            <div style={{ fontSize: `${2.4 * scale}rem`, fontWeight: 900, color: '#f6e05e', fontFamily: '"游明朝", "Yu Mincho", "ヒラギノ明朝 ProN", "Hiragino Mincho ProN", serif' }}>
                                {player.extraPpActive ? (
                                    <span>{Math.max(0, player.pp - 1)}/{player.maxPp} <span style={{ color: '#ed8936' }}>+1</span></span>
                                ) : (
                                    <span>{player.pp}/{player.maxPp}</span>
                                )}
                            </div>
                            {/* PP丸表示 - 常に10個を1行で表示 */}
                            <div style={{ display: 'flex', gap: 3 * scale, justifyContent: 'center' }}>
                                {Array(10).fill(0).map((_, i) => {
                                    const isFilled = i < player.pp;
                                    const isUnlocked = i < player.maxPp; // 解放済み枠

                                    let bgColor: string;
                                    if (isFilled) {
                                        bgColor = '#f6e05e'; // 黄色（使用可能PP）
                                    } else if (isUnlocked) {
                                        bgColor = '#744210'; // 濃いオレンジ（使用済みPP）
                                    } else {
                                        bgColor = '#2d3748'; // 暗い灰色（未解放枠）
                                    }

                                    return (
                                        <div
                                            key={i}
                                            style={{
                                                width: 11 * scale,
                                                height: 11 * scale,
                                                borderRadius: '50%',
                                                background: bgColor,
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                        {/* Extra PP Button - 後攻プレイヤーのみ表示 */}
                        {(() => {
                            const isSecondPlayer = currentPlayerId !== gameState.firstPlayerId;
                            const isMyTurn = gameState.activePlayerId === currentPlayerId;
                            const turn = gameState.turnCount;
                            const canUseEarly = turn <= 5 && !player.extraPpUsedEarly;
                            const canUseLate = turn >= 6 && !player.extraPpUsedLate;
                            // エクストラPPがアクティブでない場合のみ新たに使用可能
                            const canUse = isSecondPlayer && isMyTurn && !player.extraPpActive && (canUseEarly || canUseLate);
                            const isActive = player.extraPpActive;

                            if (!isSecondPlayer) return null;

                            // 使用済み（Early/Late両方使用済みか、現ターンの条件を満たさない）かつ非アクティブなら完全に非活性
                            const isFullyUsed = (turn <= 5 && player.extraPpUsedEarly) || (turn >= 6 && player.extraPpUsedLate);
                            const isDisabled = !canUse && !isActive;

                            return (
                                <button
                                    disabled={isDisabled}
                                    onClick={(e) => {
                                        e.stopPropagation(); // 手札折りたたみを防止
                                        if (!isDisabled) {
                                            dispatchAndSend({ type: 'TOGGLE_EXTRA_PP', playerId: currentPlayerId });
                                        }
                                    }}
                                    style={{
                                        width: 160 * scale, // ターン終了ボタンと同じ横幅
                                        height: 45 * scale,
                                        borderRadius: 12 * scale,
                                        border: isActive ? '3px solid #ed8936' : '3px solid rgba(255,255,255,0.2)',
                                        background: isActive
                                            ? 'linear-gradient(135deg, #ed8936, #dd6b20)'
                                            : (canUse ? 'linear-gradient(135deg, #744210, #5a3510)' : '#2d3748'),
                                        color: isActive ? 'white' : (canUse ? '#f6e05e' : '#718096'),
                                        fontWeight: 700,
                                        fontSize: '1rem',
                                        boxShadow: isActive ? '0 0 20px rgba(237, 137, 54, 0.6)' : 'none',
                                        cursor: isDisabled ? 'default' : 'pointer',
                                        transition: 'all 0.3s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6 * scale,
                                        opacity: isFullyUsed && !isActive ? 0.5 : 1
                                    }}
                                >
                                    <span>PP</span>
                                    <span style={{ fontSize: '1.3rem' }}>+1</span>
                                    {isActive && <span style={{ fontSize: '0.8rem' }}>ON</span>}
                                    {isFullyUsed && !isActive && <span style={{ fontSize: '0.7rem', marginLeft: 2 }}>済</span>}
                                </button>
                            );
                        })()}
                    </div>

                    {/* ========================================== */}
                    {/* BATTLE LOG & HELP BUTTON - Centered */}
                    {/* ========================================== */}
                    {/* Help Button - Above Battle Log (fixed position above log's max height) */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowHelp(true); }}
                        style={{
                            position: 'absolute',
                            left: 15,
                            top: 'calc(50% - 175px)', // バトルログの上端（50% - 125px）よりさらに50px上
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)',
                            border: '2px solid #63b3ed',
                            color: '#63b3ed',
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 16,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'scale(1.1)';
                            e.currentTarget.style.boxShadow = '0 0 15px rgba(99, 179, 237, 0.5)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
                        }}
                    >
                        ?
                    </button>
                    <BattleLog logs={gameState.logs || []} onCardNameClick={handleCardNameClickFromLog} scale={scale} />

                    {/* Coin Toss Overlay */}
                    {(coinTossPhase === 'TOSSING' || coinTossPhase === 'RESULT') && (
                        <div style={{
                            position: 'absolute', inset: 0, zIndex: 4000,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(0,0,0,0.85)',
                            pointerEvents: 'none'
                        }}>
                            <div style={{ textAlign: 'center' }}>
                                {/* Coin */}
                                <div style={{
                                    width: 120 * scale, height: 120 * scale, margin: `0 auto ${30 * scale}px`,
                                    borderRadius: '50%',
                                    background: coinTossPhase === 'RESULT'
                                        ? (coinTossResult === 'FIRST' ? 'linear-gradient(135deg, #ffd700, #ff8c00)' : 'linear-gradient(135deg, #c0c0c0, #808080)')
                                        : 'linear-gradient(135deg, #ffd700, #ff8c00)',
                                    boxShadow: coinTossPhase === 'RESULT'
                                        ? `0 0 ${40 * scale}px ${coinTossResult === 'FIRST' ? '#ffd700' : '#c0c0c0'}, 0 0 ${80 * scale}px ${coinTossResult === 'FIRST' ? 'rgba(255,215,0,0.5)' : 'rgba(192,192,192,0.5)'}`
                                        : `0 0 ${30 * scale}px #ffd700`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '3rem', fontWeight: 900, color: '#1a202c',
                                    textShadow: '0 2px 2px rgba(0,0,0,0.5)',
                                    animation: coinTossPhase === 'TOSSING' ? 'coinFlip 0.3s ease-in-out infinite' : 'coinLand 0.5s ease-out',
                                    border: '4px solid rgba(255,255,255,0.3)'
                                }}>
                                    {coinTossPhase === 'RESULT' ? (coinTossResult === 'FIRST' ? '先' : '後') : '?'}
                                </div>

                                {/* Text */}
                                <div style={{
                                    fontSize: coinTossPhase === 'RESULT' ? '2.5rem' : '1.8rem',
                                    fontWeight: 900,
                                    color: coinTossResult === 'FIRST' ? '#ffd700' : (coinTossResult === 'SECOND' ? '#c0c0c0' : 'white'),
                                    textShadow: '0 0 20px currentColor, 0 2px 4px black',
                                    animation: coinTossPhase === 'RESULT' ? 'textPop 0.5s ease-out' : 'none'
                                }}>
                                    {coinTossPhase === 'TOSSING' && 'コイントス中...'}
                                    {coinTossPhase === 'RESULT' && (coinTossResult === 'FIRST' ? '先攻' : '後攻')}
                                </div>

                                {coinTossPhase === 'RESULT' && (
                                    <div style={{
                                        fontSize: '1rem', color: '#a0aec0', marginTop: 10 * scale,
                                        animation: 'fadeIn 0.5s ease-out 0.3s both'
                                    }}>
                                        {coinTossResult === 'FIRST' ? 'あなたの先攻です' : '相手の先攻です'}
                                    </div>
                                )}
                            </div>

                            <style>{`
                            @keyframes coinFlip {
                                0%, 100% { transform: rotateY(0deg) scale(1); }
                                50% { transform: rotateY(180deg) scale(1.1); }
                            }
                            @keyframes coinLand {
                                0% { transform: rotateY(720deg) scale(0.5); }
                                70% { transform: rotateY(0deg) scale(1.2); }
                                100% { transform: rotateY(0deg) scale(1); }
                            }
                            @keyframes textPop {
                                0% { transform: scale(0.5); opacity: 0; }
                                70% { transform: scale(1.2); }
                                100% { transform: scale(1); opacity: 1; }
                            }
                        `}</style>
                        </div>
                    )}

                    {/* GAME START overlay - Rich Animation */}
                    {isGameStartAnim && (
                        <div style={{
                            position: 'absolute', inset: 0, zIndex: 3000,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(0,0,0,0.7)',
                            pointerEvents: 'none',
                            animation: 'fadeIn 0.2s ease-out'
                        }}>
                            <div style={{
                                fontSize: '5rem', fontWeight: 900,
                                fontFamily: 'Tamanegi, sans-serif',
                                background: 'linear-gradient(135deg, #ffd700, #ff6b6b, #ffd700)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                textShadow: 'none',
                                filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.8)) drop-shadow(0 0 40px rgba(255,107,107,0.5))',
                                animation: 'gameStartPop 0.8s ease-out',
                                letterSpacing: '0.2em'
                            }}>
                                決闘 開始！
                            </div>

                            <style>{`
                            @keyframes gameStartPop {
                                0% { transform: scale(0.3) rotate(-10deg); opacity: 0; }
                                50% { transform: scale(1.2) rotate(5deg); opacity: 1; }
                                70% { transform: scale(0.95) rotate(-2deg); }
                                100% { transform: scale(1) rotate(0deg); opacity: 1; }
                            }
                        `}</style>
                        </div>
                    )}

                    {/* ========================================== */}
                    {/* PLAYER LEADER - Bottom center */}
                    <div ref={playerLeaderRef} style={{
                        position: 'absolute', bottom: -20 * scale, left: '50%', transform: 'translateX(-50%)', // Adjusted translateY
                        width: LEADER_SIZE * scale, height: LEADER_SIZE * scale, borderRadius: '50%',
                        zIndex: 200
                    }}>
                        <div
                            onMouseDown={handleLeaderMouseDown}
                            style={{
                                width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden',
                                border: playerHasLeaderDamageCap ? '4px solid #67e8f9' : '4px solid #3182ce',
                                boxShadow: playerHasLeaderDamageCap
                                    ? '0 0 20px rgba(103, 232, 249, 0.6), 0 0 40px rgba(103, 232, 249, 0.4), inset 0 0 30px rgba(103, 232, 249, 0.3)'
                                    : '0 0 20px rgba(49, 130, 206, 0.4)',
                                background: '#1a202c',
                                cursor: 'grab',
                                animation: playerHasLeaderDamageCap ? 'leaderDamageCapPulse 1.5s ease-in-out infinite' : 'none'
                            }}
                        >
                            <img src={getLeaderImg(player.class)} style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                        </div>

                        {/* Player HP - Top Left (Center - 140px) */}
                        <div style={{
                            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%) translateX(-140px)',
                            width: 55 * scale, height: 55 * scale, background: 'radial-gradient(circle at 30% 30%, #feb2b2, #c53030)', borderRadius: '50%',
                            border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.6rem', fontWeight: 900, color: 'white', textShadow: '0 2px 2px rgba(0,0,0,0.5)',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.4)', zIndex: 10
                        }}>{player.hp}</div>

                        {/* Player EP - Circular Frame */}
                        <div onMouseDown={(e) => handleEvolveMouseDown(e, false)} style={{
                            position: 'absolute', top: 10 * scale, left: '50%', transform: 'translateX(-50%) translateX(-80px)',
                            width: 45 * scale, height: 45 * scale, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)',
                            background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: canEvolveUI ? 'grab' : 'default', zIndex: 10,
                            opacity: isEvolveUnlocked ? 1 : 0.5, filter: isEvolveUnlocked ? 'none' : 'grayscale(0.8)',
                            transition: 'opacity 0.3s, filter 0.3s'
                        }}>
                            <div style={{ display: 'flex', gap: 3 * scale }}>
                                {Array(2).fill(0).map((_, i) => {
                                    const hasEP = i < remainingEvolves;
                                    // グレーアウト時は光らない、アンロック後は光る（アクティブ時はより強く光る）
                                    let glowStyle = 'none';
                                    if (hasEP && isEvolveUnlocked) {
                                        glowStyle = canEvolveUI
                                            ? '0 0 12px #ecc94b, 0 0 25px #ecc94b, 0 0 35px #ecc94b'
                                            : '0 0 8px #ecc94b, 0 0 15px #ecc94b';
                                    }
                                    return <div key={i} style={{
                                        width: 12 * scale, height: 12 * scale, borderRadius: '50%',
                                        background: hasEP ? '#ecc94b' : '#2d3748',
                                        boxShadow: glowStyle,
                                        border: '2px solid rgba(0,0,0,0.5)',
                                        transition: 'box-shadow 0.3s'
                                    }} />;
                                })}
                            </div>
                        </div>

                        {/* Player SEP - Circular Frame */}
                        <div onMouseDown={(e) => handleEvolveMouseDown(e, true)} style={{
                            position: 'absolute', top: 10 * scale, left: '50%', transform: 'translateX(-50%) translateX(80px)',
                            width: 45 * scale, height: 45 * scale, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)',
                            background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 10, cursor: canSuperEvolveUI ? 'grab' : 'default',
                            opacity: isSuperEvolveUnlocked ? 1 : 0.5, filter: isSuperEvolveUnlocked ? 'none' : 'grayscale(0.8)',
                            transition: 'opacity 0.3s, filter 0.3s'
                        }}>
                            <div style={{ display: 'flex', gap: 3 * scale }}>
                                {Array(2).fill(0).map((_, i) => {
                                    const hasSEP = i < player.sep;
                                    // グレーアウト時は光らない、アンロック後は光る（アクティブ時はより強く光る）
                                    let glowStyle = 'none';
                                    if (hasSEP && isSuperEvolveUnlocked) {
                                        glowStyle = canSuperEvolveUI
                                            ? '0 0 12px #9f7aea, 0 0 25px #9f7aea, 0 0 35px #9f7aea'
                                            : '0 0 8px #9f7aea, 0 0 15px #9f7aea';
                                    }
                                    return <div key={i} style={{
                                        width: 12 * scale, height: 12 * scale, borderRadius: '50%',
                                        background: hasSEP ? '#9f7aea' : '#2d3748',
                                        boxShadow: glowStyle,
                                        border: '2px solid rgba(0,0,0,0.5)',
                                        transition: 'box-shadow 0.3s'
                                    }} />;
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Player Deck - Bottom Right (with sleeve image) */}
                    <div style={{ position: 'absolute', bottom: 10 * scale, right: 15 * scale, width: 60 * scale, height: 85 * scale, zIndex: 50 }}>
                        {[...Array(Math.min(5, Math.ceil(player.deck.length / 5)))].map((_, i) => (
                            <div key={i} style={{
                                position: 'absolute',
                                inset: 0,
                                transform: `translate(${i * 2 * scale}px, ${-i * 2 * scale}px)`,
                                borderRadius: 6,
                                border: '1px solid #718096',
                                boxShadow: '1px 1px 3px rgba(0,0,0,0.5)',
                                overflow: 'hidden'
                            }}>
                                <img
                                    src={getSleeveImg(player?.class || 'SENKA')}
                                    alt="Deck"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).parentElement!.style.background = 'linear-gradient(45deg, #2d3748, #1a202c)';
                                    }}
                                />
                            </div>
                        ))}
                        <div style={{ position: 'absolute', top: -20 * scale, width: '100%', textAlign: 'center', color: '#a0aec0', fontSize: '0.9rem', fontWeight: 'bold', textShadow: '0 1px 2px black' }}>{player.deck.length}</div>
                    </div>

                    {/* ========================================== */}
                    {/* PLAYER HAND - Cards slide from right to center */}
                    {/* Collapsed: midpoint between center and right edge */}
                    {/* Expanded: centered on board center (leader axis) */}
                    {/* ========================================== */}
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        width: '100%', // Full width, fixed - prevents layout shift
                        height: 200 * scale,
                        display: 'flex',
                        justifyContent: 'center', // Center alignment for positioning reference
                        alignItems: 'flex-end',
                        pointerEvents: 'none',
                        zIndex: 500
                    }}>
                        {player.hand.map((c, i) => {
                            // Hide card in hand if it's currently being animated (playing)
                            const isBeingPlayed = playingCardAnim !== null && playingCardAnim.sourceIndex === i;
                            if (isBeingPlayed) {
                                return null; // Don't render this card - it's shown in the animation overlay
                            }

                            const handSize = player.hand.length;
                            let offsetX = 0;
                            let translateY = 0;
                            let rotate = 0;

                            if (!isHandExpanded) {
                                // Collapsed: Position from right end.
                                const maxSpacing = 45 * scale;
                                // We want to maintain RIGHT alignment relative to window edge.
                                // Rightmost Card Center X = ScreenWidth/2 + OffsetX
                                // We want Rightmost Card Right Edge <= WindowWidth - Margin

                                const rightEdgeMargin = 160 * scale; // INCREASED Margin to prevent clipping (User reported 2 cards clipped)
                                const cardHalfWidth = CARD_WIDTH * scale / 2;

                                // Calculate the X coordinate of the rightmost card's center, relative to the screen's center (0)
                                // Screen Right Edge is at +window.innerWidth/2 relative to center.
                                const rightMostX = (window.innerWidth / 2) - rightEdgeMargin - cardHalfWidth;

                                // Calculate spacing based on available width.
                                // The available width for the hand is from the sidebar's right edge to the screen's right edge.
                                const availableWidthForHand = window.innerWidth - (340 * scale) - rightEdgeMargin;

                                // Calculate the total width the hand would occupy if using maxSpacing
                                const requiredWidthForMaxSpacing = (handSize - 1) * maxSpacing + (CARD_WIDTH * scale);

                                let spacing = maxSpacing;
                                if (requiredWidthForMaxSpacing > availableWidthForHand) {
                                    // If maxSpacing makes the hand too wide, reduce spacing to fit
                                    spacing = (availableWidthForHand - (CARD_WIDTH * scale)) / Math.max(1, handSize - 1);
                                }

                                // Calculate offsetX for each card, anchoring to the rightmost card
                                // offsetX(last) = rightMostX
                                offsetX = rightMostX - ((handSize - 1) - i) * spacing;

                                translateY = 0;
                                rotate = (i - (handSize - 1) / 2) * 3;
                            } else {
                                // Expanded: Center of screen
                                const maxSpacing = 100 * scale; // Reduced from 115 to make cards slightly closer
                                // Constrain total width to screen width minus padding
                                const availableWidth = window.innerWidth - (40 * scale);
                                const requiredWidthForMaxSpacing = (handSize - 1) * maxSpacing + (CARD_WIDTH * scale);

                                let spacing = maxSpacing;
                                if (requiredWidthForMaxSpacing > availableWidth) {
                                    spacing = (availableWidth - (CARD_WIDTH * scale)) / Math.max(1, handSize - 1);
                                }

                                offsetX = (i - (handSize - 1) / 2) * spacing;
                                translateY = selectedHandIndex === i ? -8 * scale : 0; // 選択時の持ち上げ量（半分に）
                                rotate = 0;
                            }


                            const isPlayable = player.pp >= c.cost && gameState.activePlayerId === currentPlayerId;

                            return (
                                <div key={c.instanceId}
                                    onMouseDown={(e) => {
                                        // Click to select/lift
                                        handleHandMouseDown(e, i); // Pass event to drag handler
                                        if (isHandExpanded) {
                                            // Toggle selection
                                            setSelectedHandIndex(i === selectedHandIndex ? null : i);
                                        }
                                    }}
                                    style={{
                                        position: 'absolute',
                                        // The container is centered (left: 0, width: 100%, justifyContent: center)
                                        // So offsetX=0 means center of screen.
                                        left: '50%',
                                        bottom: 5 * scale, // Slightly higher to avoid cut-off
                                        transform: `translateX(calc(-50% + ${offsetX}px)) translateY(${translateY}px) rotate(${rotate}deg) ${dragState?.sourceType === 'HAND' && dragState.sourceIndex === i ? 'scale(1.05) translateY(-15px)' : (isHandExpanded ? 'translateY(-5px)' : '')}`,
                                        transition: cancellingDragIndex === i
                                            ? 'all 0.3s ease-in' // Ease-in for falling animation
                                            : (dragState?.sourceType === 'HAND' && dragState.sourceIndex === i ? 'none' : 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'),
                                        zIndex: dragState?.sourceType === 'HAND' && dragState.sourceIndex === i ? 1000 : i + 100,
                                        width: CARD_WIDTH * scale,
                                        height: CARD_HEIGHT * scale,
                                        pointerEvents: 'auto',
                                        cursor: isPlayable ? 'grab' : 'not-allowed'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Card
                                        card={c}
                                        turnCount={gameState.turnCount}
                                        isMyTurn={gameState.activePlayerId === currentPlayerId}
                                        isPlayable={isPlayable} // Make sure Green Glow shows!
                                        style={{
                                            width: CARD_WIDTH * scale,
                                            height: CARD_HEIGHT * scale,
                                            boxShadow: (dragState?.sourceType === 'HAND' && dragState.sourceIndex === i) ? '0 0 40px rgba(49, 130, 206, 0.8)' : (isPlayable ? '0 0 15px rgba(40, 180, 100, 0.6)' : 'none')
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* Play Button - Left side, below hand count badge */}
                    {selectedCard && selectedCard.owner === 'PLAYER' && isHandExpanded && (
                        <div style={{ position: 'absolute', left: 15, bottom: 155 * scale, zIndex: 600, pointerEvents: 'auto' }}>
                            <button
                                disabled={player.pp < selectedCard.card.cost}
                                onClick={(e) => { e.stopPropagation(); handleUseButtonClick(); }}
                                className={player.pp >= selectedCard.card.cost ? 'play-button-active' : ''}
                                style={{
                                    background: player.pp >= selectedCard.card.cost ? 'linear-gradient(to bottom, #48bb78, #38a169)' : '#718096',
                                    color: 'white', border: '2px solid rgba(255,255,255,0.2)', padding: '10px 20px', borderRadius: 20,
                                    fontSize: '1rem', fontWeight: 'bold', cursor: player.pp >= selectedCard.card.cost ? 'pointer' : 'not-allowed',
                                    boxShadow: player.pp >= selectedCard.card.cost ? '0 0 20px rgba(72, 187, 120, 0.6)' : '0 4px 10px rgba(0,0,0,0.5)',
                                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseDown={e => e.stopPropagation()}
                            >
                                プレイ
                                <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: 2 }}>pp {selectedCard.card.cost}</div>
                            </button>
                            <style>{`
                            @keyframes playGlowPulse {
                                0% { box-shadow: 0 0 10px rgba(72, 187, 120, 0.4); }
                                50% { box-shadow: 0 0 25px rgba(72, 187, 120, 0.8); }
                                100% { box-shadow: 0 0 10px rgba(72, 187, 120, 0.4); }
                            }
                            .play-button-active {
                                animation: playGlowPulse 2s infinite ease-in-out;
                            }
                        `}</style>
                        </div>
                    )}

                    {/* Hand Count Badge & Graveyard Count - Far Left near boundary */}
                    <div style={{ position: 'absolute', bottom: Math.max(180, 220 * scale), left: 15 * scale, display: 'flex', alignItems: 'center', gap: 8 * scale, zIndex: 601, pointerEvents: 'none' }}>
                        {/* Hand Icon - Stacked Cards */}
                        <div style={{ position: 'relative', width: 32 * scale, height: 40 * scale }}>
                            <div style={{ position: 'absolute', inset: 0, background: '#4a5568', borderRadius: 4 * scale, border: '1px solid #718096', transform: 'rotate(-15deg) translate(-5px, 0)' }} />
                            <div style={{ position: 'absolute', inset: 0, background: '#2d3748', borderRadius: 4 * scale, border: '1px solid #718096', transform: 'rotate(-5deg) translate(-2px, 0)' }} />
                            <div style={{ position: 'absolute', inset: 0, background: '#1a202c', borderRadius: 4 * scale, border: '1px solid #cbd5e0', transform: 'rotate(5deg)' }} />
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.7)', padding: `${4 * scale}px ${10 * scale}px`, borderRadius: 6 * scale, color: '#e2e8f0', fontSize: `${0.85 * scale}rem`, fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>
                            手札 {player.hand.length}
                        </div>
                        {/* Graveyard Count - 墓地枚数表示 (手札の右に配置) */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 4 * scale,
                            marginLeft: 6 * scale
                        }}>
                            <div style={{
                                fontSize: `${1.2 * scale}rem`,
                                filter: 'drop-shadow(0 0 3px rgba(128, 90, 213, 0.8))'
                            }}>
                                💀
                            </div>
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(128, 90, 213, 0.8), rgba(76, 29, 149, 0.9))',
                                padding: `${4 * scale}px ${10 * scale}px`,
                                borderRadius: 6 * scale,
                                color: '#e2e8f0',
                                fontSize: `${0.85 * scale}rem`,
                                fontWeight: 'bold',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.5), inset 0 1px rgba(255,255,255,0.1)',
                                border: '1px solid rgba(167, 139, 250, 0.5)',
                                position: 'relative'
                            }}>
                                墓地 {player.graveyard.length}
                                {/* Necromance Effect - Purple -X animation */}
                                {necromanceEffects.filter(e => e.playerId === currentPlayerId).map(effect => (
                                    <div
                                        key={effect.key}
                                        style={{
                                            position: 'absolute',
                                            top: -30,
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            color: '#d946ef',
                                            fontSize: '1.5rem',
                                            fontWeight: 'bold',
                                            textShadow: '0 0 10px #d946ef, 0 0 20px #a855f7, 0 0 30px #7c3aed',
                                            animation: 'necromanceFloat 1.5s ease-out forwards',
                                            pointerEvents: 'none',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        -{effect.amount}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Draw Animation Overlay - Show all cards simultaneously with X offset (with sleeve image) */}
                    {
                        drawAnimation && Array.from({ length: drawAnimation.count }, (_, idx) => {
                            const cardWidth = 80;
                            const cardGap = 20; // Gap between cards
                            const totalWidth = drawAnimation.count * cardWidth + (drawAnimation.count - 1) * cardGap;
                            const startOffset = -(totalWidth - cardWidth) / 2; // Center the group
                            const xOffset = startOffset + idx * (cardWidth + cardGap);
                            // Use player or opponent sleeve based on who is drawing
                            const sleeveImg = drawAnimation.isPlayer
                                ? getSleeveImg(player?.class || 'SENKA')
                                : getSleeveImg(opponent?.class || 'SENKA');

                            return (
                                <div key={idx} style={{
                                    position: 'absolute',
                                    left: drawAnimation.isPlayer ? 'calc(100% - 90px)' : 90,
                                    top: drawAnimation.isPlayer ? 'calc(100% - 105px)' : 105,
                                    width: cardWidth, height: 110,
                                    borderRadius: 8,
                                    border: '2px solid white',
                                    overflow: 'hidden',
                                    // All cards animate together, just offset in X
                                    transform: `translateX(${xOffset}px)`,
                                    animation: `drawCard${drawAnimation.isPlayer ? 'Player' : 'Opponent'} ${DRAW_ANIMATION_DURATION}ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards`,
                                    zIndex: 9000 + idx,
                                    boxShadow: '0 0 10px rgba(255,255,255,0.5)'
                                }}>
                                    <img
                                        src={sleeveImg}
                                        alt="Card Back"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                            (e.target as HTMLImageElement).parentElement!.style.background = 'repeating-linear-gradient(45deg, #2d3748, #2d3748 10px, #1a202c 10px, #1a202c 20px)';
                                        }}
                                    />
                                </div>
                            );
                        })
                    }
                    {/* Draw Animation Keyframes */}
                    <style>{`
                        @keyframes drawCardPlayer {
                            0% { opacity: 1; }
                            100% { transform: translate(-50vw, -100px) scale(0.5) rotate(-10deg); opacity: 0; }
                        }
                        @keyframes drawCardOpponent {
                            0% { opacity: 1; }
                            100% { transform: translate(50vw, 200px) scale(0.5) rotate(10deg); opacity: 0; }
                        }
                    `}</style>

                    {/* CLOSE RIGHT MAIN AREA HERE - Overlays follow outside to avoid Shake offset */}
                </div>

                {/* Evolve Drag Light Orb - REMOVED: 先端の光はSVGの白い光で統一（BOARDと同様） */}

                {/* FLOATING DAMAGE TEXT */}
                {
                    damageNumbers.map(d => (
                        <DamageText key={d.id} value={d.value} x={d.x} y={d.y} color={d.color} onComplete={() => setDamageNumbers(prev => prev.filter(p => p.id !== d.id))} />
                    ))
                }

                {/* ===== スタンプ選択UI（上半円・扇型）===== */}
                {isStampSelectorOpen && stampDragStartRef.current && (() => {
                    const centerX = stampDragStartRef.current.x;
                    const centerY = stampDragStartRef.current.y;
                    const innerRadius = 200; // リーダー枠の外側（内側をさらに外へ）
                    const outerRadius = 320; // 外側の半径
                    const stampCount = 8;
                    const anglePerStamp = 180 / stampCount; // 22.5度

                    // 扇型のSVGパスを生成する関数（角度は通常の数学座標系：右が0度、反時計回り）
                    // 上半円なので、180度（左）から0度（右）へ描画
                    const createArcPath = (startAngleDeg: number, endAngleDeg: number, inner: number, outer: number) => {
                        // 度をラジアンに変換
                        const startRad = startAngleDeg * Math.PI / 180;
                        const endRad = endAngleDeg * Math.PI / 180;

                        const x1 = Math.cos(startRad) * outer;
                        const y1 = -Math.sin(startRad) * outer; // Y軸反転（画面座標系）
                        const x2 = Math.cos(endRad) * outer;
                        const y2 = -Math.sin(endRad) * outer;
                        const x3 = Math.cos(endRad) * inner;
                        const y3 = -Math.sin(endRad) * inner;
                        const x4 = Math.cos(startRad) * inner;
                        const y4 = -Math.sin(startRad) * inner;

                        // 時計回りに描画するためsweep-flagを0に
                        return `M ${x1} ${y1} A ${outer} ${outer} 0 0 0 ${x2} ${y2} L ${x3} ${y3} A ${inner} ${inner} 0 0 1 ${x4} ${y4} Z`;
                    };

                    return (
                        <div style={{
                            position: 'fixed',
                            left: centerX,
                            top: centerY,
                            zIndex: 2000,
                            pointerEvents: 'none',
                            animation: 'stampUIFadeIn 0.15s ease-out'
                        }}>
                            <svg
                                width={outerRadius * 2 + 20}
                                height={outerRadius + 20}
                                style={{
                                    position: 'absolute',
                                    left: -(outerRadius + 10),
                                    top: -(outerRadius + 10), // 上方向に配置（半円が上に表示される）
                                    overflow: 'visible'
                                }}
                            >
                                {/* 原点をSVGの下辺中央に配置（上半円を描画するため） */}
                                <g transform={`translate(${outerRadius + 10}, ${outerRadius + 10})`}>
                                    {/* 8つの扇型スタンプエリア（左から右へ：180度→0度）*/}
                                    {STAMP_DEFINITIONS.map((stamp, index) => {
                                        // 左端（180度）から右端（0度）へ配置
                                        const startAngle = 180 - index * anglePerStamp;
                                        const endAngle = startAngle - anglePerStamp;
                                        const isHovered = hoveredStampId === stamp.id;
                                        const midAngle = (startAngle + endAngle) / 2;
                                        const midRad = midAngle * Math.PI / 180;
                                        const imgRadius = (innerRadius + outerRadius) / 2;
                                        const imgX = Math.cos(midRad) * imgRadius;
                                        const imgY = -Math.sin(midRad) * imgRadius; // Y軸反転
                                        const imgSize = 85; // スタンプ画像サイズ（スペースに合わせて大きく）

                                        return (
                                            <g key={stamp.id}>
                                                {/* 扇型の背景 */}
                                                <path
                                                    d={createArcPath(startAngle, endAngle, innerRadius, outerRadius)}
                                                    fill={isHovered ? 'rgba(255, 215, 0, 0.4)' : 'rgba(0, 0, 0, 0.7)'}
                                                    stroke={isHovered ? '#ffd700' : 'rgba(255, 255, 255, 0.3)'}
                                                    strokeWidth={isHovered ? 3 : 1}
                                                    style={{ transition: 'all 0.1s ease-out' }}
                                                />
                                                {/* スタンプ画像（clipPathで円形にクリップ） */}
                                                <defs>
                                                    <clipPath id={`stampClip-${stamp.id}`}>
                                                        <circle cx={imgX} cy={imgY} r={imgSize / 2} />
                                                    </clipPath>
                                                </defs>
                                                <image
                                                    href={getAssetUrl(getStampImagePath(stamp.id, currentPlayerClass))}
                                                    x={imgX - imgSize / 2}
                                                    y={imgY - imgSize / 2}
                                                    width={imgSize}
                                                    height={imgSize}
                                                    clipPath={`url(#stampClip-${stamp.id})`}
                                                    style={{
                                                        transform: isHovered ? `scale(1.15)` : 'scale(1)',
                                                        transformOrigin: `${imgX}px ${imgY}px`,
                                                        transition: 'transform 0.1s ease-out'
                                                    }}
                                                />
                                                {/* 円形の枠線 */}
                                                <circle
                                                    cx={imgX}
                                                    cy={imgY}
                                                    r={imgSize / 2}
                                                    fill="none"
                                                    stroke={isHovered ? '#ffd700' : 'rgba(255, 255, 255, 0.5)'}
                                                    strokeWidth={isHovered ? 2 : 1}
                                                />
                                            </g>
                                        );
                                    })}
                                </g>
                            </svg>

                            <style>{`
                                @keyframes stampUIFadeIn {
                                    from { opacity: 0; transform: scale(0.8); }
                                    to { opacity: 1; transform: scale(1); }
                                }
                            `}</style>
                        </div>
                    );
                })()}

                {/* ===== スタンプ表示 ===== */}
                {displayedStamp && (
                    <div key={displayedStamp.timestamp} style={{
                        position: 'fixed',
                        left: '50%',
                        top: '40%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 2500,
                        pointerEvents: 'none',
                        animation: 'stampDisplay 3s ease-out forwards'
                    }}>
                        <div style={{
                            width: 250,
                            height: 250,
                            borderRadius: 20,
                            overflow: 'hidden',
                            boxShadow: '0 0 40px rgba(0,0,0,0.5), 0 0 60px rgba(255,255,255,0.2)',
                            border: '4px solid rgba(255,255,255,0.3)'
                        }}>
                            <img
                                src={getAssetUrl(getStampImagePath(displayedStamp.stampId, displayedStamp.playerClass))}
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        </div>

                        {/* 送信者表示（相手のスタンプの場合） */}
                        {displayedStamp.playerId !== currentPlayerId && (
                            <div style={{
                                position: 'absolute',
                                bottom: -30,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'rgba(0,0,0,0.7)',
                                padding: '5px 15px',
                                borderRadius: 15,
                                color: '#fff',
                                fontSize: '0.9rem',
                                whiteSpace: 'nowrap'
                            }}>
                                相手
                            </div>
                        )}

                        <style>{`
                            @keyframes stampDisplay {
                                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                                10% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
                                20% { transform: translate(-50%, -50%) scale(1); }
                                80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
                            }
                        `}</style>
                    </div>
                )}

                {/* SVG Overlay for Dragging Arrow - Now uses game coordinates */}
                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1000 }}>
                    {dragState && (dragState.sourceType === 'BOARD' || dragState.sourceType === 'EVOLVE') && (
                        <>
                            <defs>
                                {/* Cyan glow filter for attack line - SourceGraphic removed to avoid sharp edge */}
                                <filter id="cyanGlow" x="-100%" y="-100%" width="300%" height="300%">
                                    <feGaussianBlur stdDeviation="10" result="blur1" />
                                    <feFlood floodColor="rgba(100, 200, 255, 0.7)" result="color1" />
                                    <feComposite in="color1" in2="blur1" operator="in" result="glow1" />
                                    <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur2" />
                                    <feFlood floodColor="rgba(150, 220, 255, 0.5)" result="color2" />
                                    <feComposite in="color2" in2="blur2" operator="in" result="glow2" />
                                    <feMerge>
                                        <feMergeNode in="glow1" />
                                        <feMergeNode in="glow2" />
                                    </feMerge>
                                </filter>
                                {/* Yellow glow filter for evolution - stronger blur to hide endpoint */}
                                <filter id="yellowGlow" x="-100%" y="-100%" width="300%" height="300%">
                                    <feGaussianBlur stdDeviation="10" result="blur1" />
                                    <feFlood floodColor="rgba(255, 255, 50, 0.7)" result="color1" />
                                    <feComposite in="color1" in2="blur1" operator="in" result="glow1" />
                                    <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur2" />
                                    <feFlood floodColor="rgba(255, 240, 100, 0.5)" result="color2" />
                                    <feComposite in="color2" in2="blur2" operator="in" result="glow2" />
                                    <feMerge>
                                        <feMergeNode in="glow1" />
                                        <feMergeNode in="glow2" />
                                    </feMerge>
                                </filter>
                                {/* Soft white glow filter for drag endpoint - stronger blur and opacity */}
                                <filter id="softWhiteGlow" x="-300%" y="-300%" width="700%" height="700%">
                                    <feGaussianBlur stdDeviation="20" result="blur" />
                                    <feFlood floodColor="rgba(255, 255, 255, 0.9)" result="color" />
                                    <feComposite in="color" in2="blur" operator="in" result="glow" />
                                    <feMerge>
                                        <feMergeNode in="glow" />
                                        <feMergeNode in="glow" />
                                        <feMergeNode in="glow" />
                                    </feMerge>
                                </filter>
                                {/* Inner core glow - weaker blur for center */}
                                <filter id="innerCoreGlow" x="-100%" y="-100%" width="300%" height="300%">
                                    <feGaussianBlur stdDeviation="4" result="blur" />
                                    <feFlood floodColor="rgba(255, 255, 255, 0.8)" result="color" />
                                    <feComposite in="color" in2="blur" operator="in" result="glow" />
                                    <feMerge>
                                        <feMergeNode in="glow" />
                                    </feMerge>
                                </filter>
                                {/* Colored glow filter for endpoint ball - preserves source color with blur */}
                                <filter id="coloredBallGlow" x="-150%" y="-150%" width="400%" height="400%">
                                    <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                                    <feMerge>
                                        <feMergeNode in="blur" />
                                        <feMergeNode in="blur" />
                                    </feMerge>
                                </filter>
                                {/* Light particle glow - weaker blur */}
                                <filter id="particleGlow" x="-100%" y="-100%" width="300%" height="300%">
                                    <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                                    <feMerge>
                                        <feMergeNode in="blur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                                {/* Purple glow filter for super evolution - stronger blur to hide endpoint */}
                                <filter id="purpleGlow" x="-100%" y="-100%" width="300%" height="300%">
                                    <feGaussianBlur stdDeviation="10" result="blur1" />
                                    <feFlood floodColor="rgba(183, 148, 244, 0.7)" result="color1" />
                                    <feComposite in="color1" in2="blur1" operator="in" result="glow1" />
                                    <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur2" />
                                    <feFlood floodColor="rgba(200, 170, 255, 0.5)" result="color2" />
                                    <feComposite in="color2" in2="blur2" operator="in" result="glow2" />
                                    <feMerge>
                                        <feMergeNode in="glow1" />
                                        <feMergeNode in="glow2" />
                                    </feMerge>
                                </filter>
                            </defs>
                            {/* Attack/Board drag: Cyan glowing line (no arrow) */}
                            {dragState.sourceType === 'BOARD' && (
                                <>
                                    {/* Outer glow layer - strokeLinecap="butt" to avoid ball at endpoint */}
                                    <path
                                        d={getArrowPath()}
                                        fill="none"
                                        stroke="rgba(100, 200, 255, 0.3)"
                                        strokeWidth="20"
                                        strokeLinecap="butt"
                                        filter="url(#cyanGlow)"
                                    />
                                    {/* Middle glow layer */}
                                    <path
                                        d={getArrowPath()}
                                        fill="none"
                                        stroke="rgba(150, 220, 255, 0.5)"
                                        strokeWidth="10"
                                        strokeLinecap="butt"
                                    />
                                    {/* Core bright line */}
                                    <path
                                        d={getArrowPath()}
                                        fill="none"
                                        stroke="rgba(200, 240, 255, 0.9)"
                                        strokeWidth="4"
                                        strokeLinecap="butt"
                                    />
                                    {/* Innermost white core */}
                                    <path
                                        d={getArrowPath()}
                                        fill="none"
                                        stroke="rgba(255, 255, 255, 1)"
                                        strokeWidth="2"
                                        strokeLinecap="butt"
                                    />
                                </>
                            )}
                            {/* Evolve drag: Glowing light line (yellow for EP, purple for SEP) */}
                            {dragState.sourceType === 'EVOLVE' && (
                                <>
                                    {/* Outer glow layer - same opacity as BOARD (0.3) */}
                                    <path
                                        d={getArrowPath()}
                                        fill="none"
                                        stroke={(dragState as any).useSep ? 'rgba(159, 122, 234, 0.3)' : 'rgba(236, 201, 75, 0.3)'}
                                        strokeWidth="20"
                                        strokeLinecap="butt"
                                        filter={(dragState as any).useSep ? 'url(#purpleGlow)' : 'url(#yellowGlow)'}
                                    />
                                    {/* Middle glow layer - no filter, same as BOARD */}
                                    <path
                                        d={getArrowPath()}
                                        fill="none"
                                        stroke={(dragState as any).useSep ? 'rgba(183, 148, 244, 0.5)' : 'rgba(246, 224, 94, 0.5)'}
                                        strokeWidth="10"
                                        strokeLinecap="butt"
                                    />
                                    {/* Core bright line - no filter, same as BOARD */}
                                    <path
                                        d={getArrowPath()}
                                        fill="none"
                                        stroke={(dragState as any).useSep ? 'rgba(214, 188, 250, 0.9)' : 'rgba(250, 240, 137, 0.9)'}
                                        strokeWidth="4"
                                        strokeLinecap="butt"
                                    />
                                    {/* Innermost white core */}
                                    <path
                                        d={getArrowPath()}
                                        fill="none"
                                        stroke="rgba(255, 255, 255, 1)"
                                        strokeWidth="2"
                                        strokeLinecap="butt"
                                    />
                                </>
                            )}
                            {/* 根本の光 - より目立つように */}
                            {(dragState.sourceType === 'BOARD' || dragState.sourceType === 'EVOLVE') && (
                                <>
                                    <circle
                                        cx={dragState.startX}
                                        cy={dragState.startY}
                                        r="15"
                                        fill="rgba(255, 255, 255, 0.3)"
                                        filter="url(#softWhiteGlow)"
                                    />
                                    <circle
                                        cx={dragState.startX}
                                        cy={dragState.startY}
                                        r="8"
                                        fill="rgba(255, 255, 255, 0.4)"
                                        filter="url(#softWhiteGlow)"
                                    />
                                </>
                            )}
                            {/* 先端の白い光 - 線の太さに合わせたサイズ */}
                            {(dragState.sourceType === 'BOARD' || dragState.sourceType === 'EVOLVE') && (
                                <>
                                    {/* 外側の拡散光 */}
                                    <circle
                                        cx={dragState.currentX}
                                        cy={dragState.currentY}
                                        r="18"
                                        fill="rgba(255, 255, 255, 0.25)"
                                        filter="url(#softWhiteGlow)"
                                    />
                                    {/* 中間の光 */}
                                    <circle
                                        cx={dragState.currentX}
                                        cy={dragState.currentY}
                                        r="8"
                                        fill="rgba(255, 255, 255, 0.35)"
                                        filter="url(#softWhiteGlow)"
                                    />
                                    {/* 中心の明るい光 - より小さく内側に、ぼかし弱め */}
                                    <circle
                                        cx={dragState.currentX}
                                        cy={dragState.currentY}
                                        r="3"
                                        fill="rgba(255, 255, 255, 0.7)"
                                        filter="url(#innerCoreGlow)"
                                    />
                                </>
                            )}
                            {/* パーティクル（軽いグロー付き） */}
                            {dragParticles.map(p => {
                                const particleColor = dragState.sourceType === 'EVOLVE'
                                    ? (dragState.useSep
                                        ? `rgba(230, 220, 255, ${p.opacity})` // 薄紫系
                                        : `rgba(255, 255, 230, ${p.opacity})`) // 薄黄色系
                                    : `rgba(220, 245, 255, ${p.opacity})`; // 薄水色系
                                return (
                                    <circle
                                        key={p.id}
                                        cx={p.x}
                                        cy={p.y}
                                        r={p.radius}
                                        fill={particleColor}
                                        filter="url(#particleGlow)"
                                    />
                                );
                            })}
                        </>
                    )}
                </svg>

                {/* ターン終了ボタンのクリックエフェクト */}
                {endTurnEffect && (
                    <svg
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100vw',
                            height: '100vh',
                            pointerEvents: 'none',
                            zIndex: 99999
                        }}
                    >
                        <defs>
                            <filter id="endTurnGlow" x="-100%" y="-100%" width="300%" height="300%">
                                <feGaussianBlur stdDeviation="6" result="blur" />
                                <feFlood floodColor="rgba(100, 200, 255, 0.8)" result="color" />
                                <feComposite in="color" in2="blur" operator="in" result="glow" />
                                <feMerge>
                                    <feMergeNode in="glow" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>
                        {/* 拡散する光の輪 */}
                        <circle
                            cx={endTurnEffect.x}
                            cy={endTurnEffect.y}
                            r={endTurnEffect.ringRadius}
                            fill="none"
                            stroke={`rgba(100, 200, 255, ${Math.max(0, 1 - endTurnEffect.ringRadius / 120) * 0.8})`}
                            strokeWidth="4"
                            filter="url(#endTurnGlow)"
                        />
                        <circle
                            cx={endTurnEffect.x}
                            cy={endTurnEffect.y}
                            r={endTurnEffect.ringRadius * 0.8}
                            fill="none"
                            stroke={`rgba(255, 255, 255, ${Math.max(0, 1 - endTurnEffect.ringRadius / 120) * 0.6})`}
                            strokeWidth="2"
                        />
                        {/* 中央の光 */}
                        <circle
                            cx={endTurnEffect.x}
                            cy={endTurnEffect.y}
                            r={20}
                            fill={`rgba(255, 255, 255, ${Math.max(0, 1 - endTurnEffect.ringRadius / 120) * 0.9})`}
                        />
                        {/* パーティクル */}
                        {endTurnEffect.particles.map(p => (
                            <circle
                                key={p.id}
                                cx={p.x}
                                cy={p.y}
                                r={4}
                                fill={`rgba(255, 255, 255, ${p.opacity * 0.8})`}
                            />
                        ))}
                    </svg>
                )}

                {/* Play Card Animation Overlay - Now uses game coordinates */}
                {
                    playingCardAnim && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            zIndex: 9999,
                            pointerEvents: 'auto',
                            background: 'rgba(0,0,0,0.5)',
                            perspective: '1200px' // Perspective on parent container
                        }}>
                            <style>{`
                                @keyframes playCardSequence {
                                    ${playingCardAnim.finalX !== undefined ? `
                                    /* Phase 1: Start at hand position (0%) */
                                    0% {
                                        transform: translate(${playingCardAnim.startX - playingCardAnim.targetX}px, ${playingCardAnim.startY - playingCardAnim.targetY}px) translate(-50%, -50%) scale(1.0) rotateY(0deg);
                                        opacity: 1;
                                        animation-timing-function: linear;
                                    }
                                    /* Phase 1b: Mid-rotation during move (12.5%) - CRITICAL: explicit 180deg to force rotation direction */
                                    12.5% {
                                        transform: translate(${(playingCardAnim.startX - playingCardAnim.targetX) * 0.5}px, ${(playingCardAnim.startY - playingCardAnim.targetY) * 0.5}px) translate(-50%, -50%) scale(1.5) rotateY(180deg);
                                        opacity: 1;
                                        animation-timing-function: linear;
                                    }
                                    /* Phase 2: Arrive at center with rotation complete (25%) */
                                    25% {
                                        transform: translate(-50%, -50%) scale(1.8) rotateY(360deg);
                                        opacity: 1;
                                        animation-timing-function: ease-out;
                                    }
                                    /* Phase 3: Hold at center (25%-80%) */
                                    80% {
                                        transform: translate(-50%, -50%) scale(2.4) rotateY(360deg);
                                        opacity: 1;
                                    }
                                    /* Phase 4: Move to board position (80%-100%) */
                                    100% {
                                        transform: translate(calc(-50% + ${playingCardAnim.finalX - playingCardAnim.targetX}px), calc(-50% + ${playingCardAnim.finalY! - playingCardAnim.targetY}px)) scale(1.0) rotateY(360deg);
                                        opacity: 1;
                                    }
                                    ` : `
                                    /* Spell: Move to center while rotating, then fade */
                                    0% {
                                        transform: translate(${playingCardAnim.startX - playingCardAnim.targetX}px, ${playingCardAnim.startY - playingCardAnim.targetY}px) translate(-50%, -50%) scale(1.0) rotateY(0deg);
                                        opacity: 1;
                                        animation-timing-function: linear;
                                    }
                                    /* Mid-rotation during move (15%) - CRITICAL: explicit 180deg */
                                    15% {
                                        transform: translate(${(playingCardAnim.startX - playingCardAnim.targetX) * 0.5}px, ${(playingCardAnim.startY - playingCardAnim.targetY) * 0.5}px) translate(-50%, -50%) scale(1.7) rotateY(180deg);
                                        opacity: 1;
                                        animation-timing-function: linear;
                                    }
                                    30% {
                                        transform: translate(-50%, -50%) scale(2.2) rotateY(360deg);
                                        opacity: 1;
                                        animation-timing-function: ease-out;
                                    }
                                    80% {
                                        transform: translate(-50%, -50%) scale(2.4) rotateY(360deg);
                                        opacity: 1;
                                    }
                                    100% {
                                        transform: translate(-50%, -50%) scale(3.0) rotateY(360deg);
                                        opacity: 0;
                                    }
                                    `}
                                }
                                @keyframes playSpellSequence {
                                    /* Move from hand to center while rotating (0-30%) */
                                    0% {
                                        transform: translate(${playingCardAnim.startX - playingCardAnim.targetX}px, ${playingCardAnim.startY - playingCardAnim.targetY}px) translate(-50%, -50%) scale(1.0) rotateY(0deg);
                                        opacity: 1;
                                        animation-timing-function: linear;
                                    }
                                    /* Mid-rotation during move (15%) - CRITICAL: explicit 180deg to force rotation direction */
                                    15% {
                                        transform: translate(${(playingCardAnim.startX - playingCardAnim.targetX) * 0.5}px, ${(playingCardAnim.startY - playingCardAnim.targetY) * 0.5}px) translate(-50%, -50%) scale(1.7) rotateY(180deg);
                                        opacity: 1;
                                        filter: brightness(1);
                                        animation-timing-function: linear;
                                    }
                                    /* Arrive at center with rotation complete (30%) */
                                    30% {
                                        transform: translate(-50%, -50%) scale(2.2) rotateY(360deg);
                                        opacity: 1;
                                        filter: brightness(1);
                                        animation-timing-function: ease-out;
                                    }
                                    /* Hold at center (30%-75%) */
                                    75% {
                                        transform: translate(-50%, -50%) scale(2.4) rotateY(360deg);
                                        opacity: 1;
                                        filter: brightness(1.2);
                                    }
                                    /* Fade out (75%-100%) */
                                    100% {
                                        transform: translate(-50%, -50%) scale(3.0) rotateY(360deg);
                                        opacity: 0;
                                        filter: brightness(3);
                                    }
                                }
                                .play-card-flipper {
                                    transform-style: preserve-3d !important;
                                }
                                .play-card-front, .play-card-back {
                                    backface-visibility: hidden !important;
                                    -webkit-backface-visibility: hidden !important;
                                    position: absolute;
                                    width: 100%;
                                    height: 100%;
                                }
                                .play-card-back {
                                    transform: rotateY(180deg) translateZ(1px);
                                }
                            `}</style>
                            {/* 3D Flip Card Container - This element receives the animation */}
                            <div
                                className="play-card-flipper"
                                onAnimationEnd={playingCardAnim.onComplete}
                                style={{
                                    position: 'absolute',
                                    left: playingCardAnim.targetX,
                                    top: playingCardAnim.targetY,
                                    width: CARD_WIDTH * scale,
                                    height: CARD_HEIGHT * scale,
                                    transformStyle: 'preserve-3d',
                                    animation: playingCardAnim.card.type === 'SPELL'
                                        ? 'playSpellSequence 1s forwards'
                                        : 'playCardSequence 0.8s forwards'
                                }}
                            >
                                {/* Front Face - Card */}
                                <div
                                    className="play-card-front"
                                >
                                    <Card card={playingCardAnim.card} isOnBoard={true} suppressPassives={true} style={{ width: CARD_WIDTH * scale, height: CARD_HEIGHT * scale, boxShadow: '0 0 50px rgba(255,215,0,0.8)' } as React.CSSProperties} />
                                </div>
                                {/* Back Face - Sleeve Image */}
                                <div
                                    className="play-card-back"
                                    style={{
                                        borderRadius: 12,
                                        boxShadow: '0 0 50px rgba(255,215,0,0.8)',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <img
                                        src={getSleeveImg(playingCardAnim.playerClass)}
                                        alt="Card Sleeve"
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            borderRadius: 12
                                        }}
                                        onError={(e) => {
                                            // Fallback to gradient if image fails to load
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                            if (target.parentElement) {
                                                target.parentElement.style.background = 'linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 50%, #1e3a5f 100%)';
                                            }
                                        }}
                                    />
                                </div>
                                {playingCardAnim.card.type === 'SPELL' && (
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                        <SparkleBurst x={0} y={0} />
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }

                {/* --- Card Generation Animation Overlay - Multiple cards with X offset --- */}
                {
                    animatingCards.length > 0 && animatingCards.map((animCard, idx) => (
                        <div key={idx} style={{
                            position: 'absolute',
                            left: animCard.status === 'FLY' && animCard.targetX !== undefined
                                ? animCard.targetX
                                : window.innerWidth / 2 + animCard.xOffset,
                            top: animCard.status === 'FLY' && animCard.targetY !== undefined
                                ? animCard.targetY
                                : window.innerHeight / 2,
                            transform: animCard.status === 'APPEAR'
                                ? 'translate(-50%, -50%) scale(1.2)'
                                : 'translate(-50%, -50%) scale(0.2)', // Shrink to hand
                            zIndex: 7000 + idx,
                            pointerEvents: 'none',
                            transition: animCard.status === 'FLY'
                                ? 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                : 'none',
                            opacity: animCard.status === 'FLY' ? 0.3 : 1, // Fade out as it reaches hand
                            animation: animCard.status === 'APPEAR' ? 'cardAppear 0.8s ease-out' : undefined
                        }}>
                            <Card card={animCard.card as any} style={{ width: CARD_WIDTH * scale, height: CARD_HEIGHT * scale }} />
                        </div>
                    ))
                }
                {/* Card Appear Animation Keyframes */}
                <style>{`
                    @keyframes cardAppear {
                        0% { transform: translate(-50%, -50%) scale(0) rotate(-10deg); opacity: 0; }
                        50% { transform: translate(-50%, -50%) scale(1.3) rotate(5deg); opacity: 1; }
                        100% { transform: translate(-50%, -50%) scale(1.2) rotate(0deg); opacity: 1; }
                    }
                `}</style>

                {/* --- Active Effects (Now using cached coordinates) --- */}
                {
                    activeEffects.map(effect => (
                        effect.type === 'BUFF' ? (
                            <BuffEffectVisual
                                key={effect.key}
                                x={effect.x}
                                y={effect.y}
                                atkBuff={effect.atkBuff ?? 0}
                                hpBuff={effect.hpBuff ?? 0}
                                onComplete={() => setActiveEffects(prev => prev.filter(e => e.key !== effect.key))}
                            />
                        ) : (
                            <AttackEffect
                                key={effect.key}
                                type={effect.type}
                                x={effect.x}
                                y={effect.y}
                                onComplete={() => setActiveEffects(prev => prev.filter(e => e.key !== effect.key))}
                                audioSettings={audioSettings}
                            />
                        )
                    ))
                }

                {/* --- Evolution Animation Overlay --- */}
                {
                    evolveAnimation && (
                        <EvolutionAnimation
                            card={evolveAnimation.card}
                            evolvedImageUrl={evolveAnimation.evolvedImageUrl}
                            startX={evolveAnimation.startX}
                            startY={evolveAnimation.startY}
                            phase={evolveAnimation.phase}
                            onPhaseChange={handleEvolvePhaseChange}
                            onShake={triggerShake}
                            useSep={evolveAnimation.useSep}
                            playSE={playSE}
                            scale={scale} // Pass scale
                        />
                    )
                }



                {/* --- Turn Notification Overlay --- */}
                {turnNotification && (
                    <div style={{
                        position: 'fixed',
                        top: '45%', // Slightly higher
                        // Offset by log pane width (340px * scale) to center in the board area
                        left: `${340 * scale}px`,
                        width: `calc(100% - ${340 * scale}px)`,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        transform: 'translateY(-50%)',
                        zIndex: 9000,
                        pointerEvents: 'none',
                        animation: 'notificationFade 2.5s forwards'
                    }}>
                        <div style={{
                            padding: '30px 140px',
                            background: 'rgba(0, 0, 0, 0.75)',
                            backdropFilter: 'blur(16px)',
                            borderTop: turnNotification === 'EVOLVE_READY' ? '4px solid rgba(255, 215, 0, 0.7)' : '4px solid rgba(180, 0, 255, 0.7)',
                            borderBottom: turnNotification === 'EVOLVE_READY' ? '4px solid rgba(255, 215, 0, 0.7)' : '4px solid rgba(180, 0, 255, 0.7)',
                            boxShadow: turnNotification === 'EVOLVE_READY'
                                ? '0 0 70px rgba(255, 180, 0, 0.5), inset 0 0 40px rgba(255, 215, 0, 0.2)'
                                : '0 0 70px rgba(180, 0, 255, 0.5), inset 0 0 40px rgba(180, 0, 255, 0.2)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px'
                        }}>
                            <span style={{
                                fontSize: '8rem', // Larger font
                                fontWeight: '900',
                                fontFamily: '"YuMincho", "Hiragino Mincho ProN", "MS Mincho", serif',
                                color: '#fff',
                                letterSpacing: '1.2rem',
                                whiteSpace: 'nowrap',
                                textShadow: turnNotification === 'EVOLVE_READY'
                                    ? '0 0 20px rgba(255, 215, 0, 1), 0 0 40px rgba(255, 180, 0, 0.8), 3px 3px 6px rgba(0,0,0,0.9)'
                                    : '0 0 20px rgba(180, 0, 255, 1), 0 0 40px rgba(140, 0, 255, 0.8), 3px 3px 6px rgba(0,0,0,0.9)',
                                WebkitTextStroke: turnNotification === 'EVOLVE_READY' ? '2px #ffd700' : '2px #b400ff'
                            }}>
                                {turnNotification === 'EVOLVE_READY' ? '進化可能' : '超進化可能'}
                            </span>
                        </div>
                        <style>{`
                            @keyframes notificationFade {
                                0% { opacity: 0; transform: translateY(-40%) scale(0.8); filter: blur(15px); }
                                10% { opacity: 1; transform: translateY(-50%) scale(1); filter: blur(0px); }
                                90% { opacity: 1; transform: translateY(-50%) scale(1); filter: blur(0px); }
                                100% { opacity: 0; transform: translateY(-60%) scale(1.15); filter: blur(20px); }
                            }
                        `}</style>
                    </div>
                )}

                {/* --- Game Over Overlay --- */}
                {
                    gameState.winnerId && (
                        <GameOverScreen
                            winnerId={gameState.winnerId}
                            playerId={currentPlayerId}
                            playerClass={player?.class || 'SENKA'}
                            isOnline={opponentType === 'ONLINE'}
                            myRematchRequested={myRematchRequested}
                            opponentRematchRequested={opponentRematchRequested}
                            battleStats={{
                                turnCount: gameState.turnCount,
                                damageDealtToOpponent: battleStats.damageDealtToOpponent,
                                damageReceivedFromOpponent: battleStats.damageReceivedFromOpponent,
                                followersDestroyed: battleStats.followersDestroyed,
                                myFollowersDestroyed: battleStats.myFollowersDestroyed
                            }}
                            selectedCardInfo={resultCardInfo}
                            onCardInfoClick={setResultCardInfo}
                            onRematch={(deckType: ClassType) => {
                                if (opponentType === 'ONLINE') {
                                    // Online mode: Send rematch request to opponent
                                    setMyRematchRequested(true);

                                    if (opponentRematchRequested) {
                                        // Both players want rematch - send accept and start
                                        adapter?.send({ type: 'REMATCH_ACCEPT' });
                                        startRematch(deckType);
                                    } else {
                                        // Only I want rematch - send request and wait
                                        // Note: In online mode, deck change may need additional sync
                                        adapter?.send({ type: 'REMATCH_REQUEST' });
                                        // Store the selected deck for when opponent accepts
                                        setCurrentPlayerClass(deckType);
                                    }
                                } else {
                                    // CPU mode: Start new game with selected deck
                                    startRematch(deckType);
                                }
                            }}
                            onLeave={onLeave}
                        />
                    )
                }
            </div>
        </div>
    );
};
