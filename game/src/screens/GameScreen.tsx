import React, { useEffect, useLayoutEffect, useReducer } from 'react';
import { initializeGame, gameReducer, getCardDefinition } from '../core/engine';
import { ClassType, Player, Card as CardModel } from '../core/types';
import { Card } from '../components/Card';
import { useGameNetwork } from '../network/hooks';
import { canEvolve } from '../core/abilities';

// Leader Images
const azyaLeaderImg = '/leaders/azya_leader.png';
const senkaLeaderImg = '/leaders/senka_leader.png';

interface GameScreenProps {
    playerClass: ClassType;
    opponentType: 'CPU' | 'ONLINE';
    gameMode: 'CPU' | 'HOST' | 'JOIN';
    targetRoomId?: string;
    onLeave: () => void;
}



// --- Visual Effects ---
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
        const isSprite = ['LIGHTNING', 'THUNDER', 'IMPACT', 'SUMI', 'SHOT', 'ICE', 'WATER', 'RAY', 'FIRE'].includes(type);
        const duration = isSprite
            ? (spriteConfig.cols * spriteConfig.rows) / spriteConfig.fps * 1000
            : (type === 'FIREBALL' ? 500 : 400); // Snappy for FLASH/BEAM/SLASH

        const timer = setTimeout(onComplete, duration);
        return () => clearTimeout(timer);
    }, [onComplete, type, spriteConfig]);

    // SE Trigger Logic
    React.useEffect(() => {
        if (!audioSettings || !audioSettings.enabled) return;

        const playSE = (file: string, volume: number = 0.5, delay: number = 0) => {
            setTimeout(() => {
                const audio = new Audio(`/se/${file}`);
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
        }
    }, [type, audioSettings]);

    const style: React.CSSProperties = {
        position: 'fixed', left: x, top: y, transform: 'translate(-50%, -50%)',
        width: 150, height: 150, pointerEvents: 'none', zIndex: 5000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    };

    const isSpriteType = ['LIGHTNING', 'THUNDER', 'IMPACT', 'SUMI', 'SHOT', 'ICE', 'WATER', 'RAY', 'FIRE'].includes(type);

    if (isSpriteType) {
        // Map Type to Image
        let bgImage = '/effects/thunder.png';
        if (type === 'IMPACT') bgImage = '/effects/impact.png';
        if (type === 'SUMI') bgImage = '/effects/sumi.png';
        if (type === 'SHOT') bgImage = '/effects/shot.png';
        if (type === 'ICE') bgImage = '/effects/ice.png';
        if (type === 'WATER') bgImage = '/effects/water.png';
        if (type === 'RAY') bgImage = '/effects/ray.png';
        if (type === 'FIRE') bgImage = '/effects/fire.png';

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

    if (type === 'SLASH') {
        imgSrc = '/effects/slash.png';
        animation = 'slash 0.4s ease-out forwards';
    } else if (type === 'FIREBALL') {
        imgSrc = '/effects/fireball.png';
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
                @keyframes slash { 0% { transform: scale(0.5) rotate(-45deg); opacity: 0; } 20% { opacity: 1; } 100% { transform: scale(1.5) rotate(-45deg); opacity: 0; } }
                @keyframes explode { 0% { transform: scale(0.5); opacity: 0; } 20% { opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
            `}</style>
        </div>
    );
};

// --- Floating Damage Text ---
const DamageText = ({ value, x, y, color, onComplete }: { value: string | number, x: number, y: number, color?: string, onComplete: () => void }) => {
    React.useEffect(() => {
        const timer = setTimeout(onComplete, 1000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div style={{
            position: 'fixed', left: x, top: y,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none', zIndex: 6000,
            fontSize: '2rem', fontWeight: '900', color: color || '#e53e3e',
            textShadow: '0 0 5px black, 0 0 10px white',
            animation: 'floatUp 1s ease-out forwards'
        }}>
            {value}
            <style>{`
                @keyframes floatUp {
                    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                    20% { transform: translate(-50%, -80%) scale(1.5); opacity: 1; }
                    100% { transform: translate(-50%, -150%) scale(1); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

// --- Sparkle Particle System for Spells ---
const SparkleBurst = ({ x, y }: { x: number, y: number }) => {
    // Generate constant particles for this render
    const particles = React.useMemo(() => {
        return Array(12).fill(0).map((_, i) => ({
            id: i,
            angle: Math.random() * 360,
            dist: 50 + Math.random() * 100,
            size: 10 + Math.random() * 20,
            delay: Math.random() * 0.2
        }));
    }, []);

    return (
        <div style={{ position: 'absolute', left: x, top: y, pointerEvents: 'none', zIndex: 6000 }}>
            {particles.map(p => (
                <div key={p.id} style={{
                    position: 'absolute', left: 0, top: 0,
                    width: p.size, height: p.size,
                    transform: `rotate(${p.angle}deg)`,
                    animation: `sparkleMove 0.8s ease-out ${p.delay}s forwards`
                }}>
                    <img src="/effects/sparkle.png" style={{ width: '100%', height: '100%' }} />
                    <style>{`
                        @keyframes sparkleMove {
                            0% { transform: rotate(${p.angle}deg) translate(0, 0) scale(0); opacity: 0; }
                            20% { opacity: 1; transform: rotate(${p.angle}deg) translate(${p.dist * 0.2}px, 0) scale(1); }
                            100% { transform: rotate(${p.angle}deg) translate(${p.dist}px, 0) scale(0); opacity: 0; }
                        }
                    `}</style>
                </div>
            ))}
        </div>
    );
};

// --- Battle Log Component ---
const BattleLog = ({ logs }: { logs: string[] }) => {
    const endRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        if (endRef.current) {
            endRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs.length]); // Scroll on length change

    return (
        <div style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 250,
            maxHeight: 250,
            overflowY: 'auto',
            background: 'linear-gradient(to right, rgba(0,0,0,0.8), rgba(0,0,0,0.0))',
            color: '#fff',
            fontSize: '0.8rem',
            padding: '10px 10px 10px 15px',
            borderLeft: '3px solid #63b3ed',
            zIndex: 15, // Under menus, over board default
            pointerEvents: 'auto', // Allow scroll
            // Custom Scrollbar styling handled by browser usually, or simple CSS class if available
            scrollbarWidth: 'thin',
        }}
            onMouseDown={e => e.stopPropagation()} // Prevent drag triggering
        >
            <div style={{
                fontWeight: 'bold', marginBottom: 5, color: '#a0aec0',
                borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 2,
                fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1
            }}>
                BATTLE LOG
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {logs.map((log, i) => (
                    <div key={i} style={{
                        opacity: 0.9,
                        lineHeight: '1.4',
                        textShadow: '0 1px 2px black',
                        animation: 'fadeIn 0.3s ease-out'
                    }}>
                        {log}
                    </div>
                ))}
            </div>
            <div ref={endRef} style={{ height: 1 }} />
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
}

const EvolutionAnimation: React.FC<EvolutionAnimationProps> = ({ card, evolvedImageUrl, startX, startY, phase, onPhaseChange, onShake, useSep, playSE }) => {
    const [rotateY, setRotateY] = React.useState(0);
    const [chargeRotate, setChargeRotate] = React.useState(0); // Slow 0-10deg rotation during charge
    const [whiteness, setWhiteness] = React.useState(0);
    const [glowIntensity, setGlowIntensity] = React.useState(0);
    const [scale, setScale] = React.useState(0.25); // Start at board card size
    const [position, setPosition] = React.useState({ x: startX, y: startY });
    const [showParticles, setShowParticles] = React.useState(false);
    // Added dist, duration, and size to charge particles
    const [chargeParticles, setChargeParticles] = React.useState<{ id: number; angle: number; dist: number; delay: number; duration: number; size: number }[]>([]);
    const [burstParticles, setBurstParticles] = React.useState<{ id: number; angle: number; dist: number; size: number; delay: number; }[]>([]);
    const [vibrate, setVibrate] = React.useState(false);
    const burstCreatedRef = React.useRef(false); // Track if burst particles have been created


    // Use refs to avoid stale closures
    const onPhaseChangeRef = React.useRef(onPhaseChange);
    const onShakeRef = React.useRef(onShake);
    const playSERef = React.useRef(playSE);
    React.useEffect(() => {
        onPhaseChangeRef.current = onPhaseChange;
        onShakeRef.current = onShake;
        playSERef.current = playSE;
    }, [onPhaseChange, onShake, playSE]);

    // Card display size (2x larger than before: 180*2=360, 240*2=480)
    const cardWidth = 360;
    const cardHeight = 480;

    // Phase Timing
    React.useEffect(() => {
        console.log('[EvolutionAnimation] Phase:', phase);
        let timer: ReturnType<typeof setTimeout>;
        let intervalId: ReturnType<typeof setInterval> | null = null;

        switch (phase) {
            case 'ZOOM_IN':
                // Start at card position, scale to match board card size initially
                setPosition({ x: startX, y: startY });
                setScale(0.25); // Match board card size (90/360)
                // Small delay to ensure initial position is set before animating
                timer = setTimeout(() => {
                    // Move to left-center of board area (slightly left of center)
                    const boardActualWidth = window.innerWidth - 340;
                    const boardCenterX = 340 + (boardActualWidth * 0.35); // More left of center
                    setPosition({ x: boardCenterX, y: window.innerHeight / 2 - 30 });
                    setScale(1.0); // Full size (2x original)
                }, 50);
                // Play kirakira sound when card arrives
                const kirakiraTimer = setTimeout(() => {
                    playSERef.current?.('kirakira.mp3', 0.7);
                }, 600);
                // Transition to next phase after animation completes
                const zoomTimer = setTimeout(() => {
                    onPhaseChangeRef.current('WHITE_FADE');
                }, 700);
                return () => {
                    clearTimeout(timer);
                    clearTimeout(zoomTimer);
                    clearTimeout(kirakiraTimer);
                };

            case 'WHITE_FADE':
                // Create charge particles that will converge toward the card
                // 80 particles evenly distributed in 360 degrees, various distances
                const particles = Array(80).fill(0).map((_, i) => {
                    // Even distribution across 360 degrees with slight randomness
                    const baseAngle = (i / 80) * 360;
                    const angleVariation = (Math.random() - 0.5) * 10; // ±5 degrees variation
                    const angle = baseAngle + angleVariation;

                    // Distance: 200 to 800 pixels (wide range)
                    const dist = 200 + Math.random() * 600;

                    // Delay: 0 to 1.8 seconds (spread throughout WHITE_FADE phase)
                    // This makes particles appear continuously
                    const delay = Math.random() * 1.8;

                    // Duration inversely proportional to distance (far = fast, near = slow)
                    // Adjusted so that even late-starting particles reach the card before FLIP
                    // WHITE_FADE lasts ~2.4s, so delay + duration should be < 2.4s
                    // Far particles (dist ~800): duration ~0.5s
                    // Near particles (dist ~200): duration ~1.2s
                    const normalizedDist = (dist - 200) / 600; // 0 to 1
                    const baseDuration = 1.2 - normalizedDist * 0.7; // 1.2s to 0.5s

                    // Ensure particle reaches center before phase ends
                    const maxDuration = Math.max(0.3, 2.2 - delay); // Leave 0.2s buffer
                    const duration = Math.min(baseDuration, maxDuration);

                    // Size: 8 to 24 pixels (larger and more varied)
                    const size = 8 + Math.random() * 16;

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
                let whiteProgress = 0;
                intervalId = setInterval(() => {
                    whiteProgress += 0.02; // Slightly slower
                    setWhiteness(Math.min(whiteProgress, 1));
                    setGlowIntensity(Math.min(whiteProgress * 80, 80)); // Stronger glow
                    setChargeRotate(whiteProgress * 15); // Rotate more
                    if (whiteProgress >= 1.2) { // Allow overflow for effect duration
                        if (intervalId) clearInterval(intervalId);
                        setVibrate(false);
                        onPhaseChangeRef.current('FLIP');
                    }
                }, 40);
                return () => { if (intervalId) clearInterval(intervalId); };

            case 'FLIP':
                // Play syakin sound at start of flip
                playSERef.current?.('syakin.mp3', 0.8);
                // Clear charge particles
                setChargeParticles([]);

                // Phase 1: Rapid rotation from 10 to 170 degrees with scale increase
                // Phase 2: Slow rotation from 170 to 180 degrees
                const flipStartTime = Date.now();
                const rapidDuration = 400; // Fast flip to 170
                const slowDuration = 600; // Slow final 10 degrees

                intervalId = setInterval(() => {
                    const elapsed = Date.now() - flipStartTime;

                    if (elapsed < rapidDuration) {
                        // Rapid rotation phase (10 -> 170)
                        const progress = elapsed / rapidDuration;
                        // Ease-out for snappy feel
                        const eased = 1 - Math.pow(1 - progress, 3);
                        const currentRotateY = 10 + eased * 160;

                        setRotateY(currentRotateY); // 10 to 170
                        setScale(1.0 + eased * 0.3); // Scale up during flip

                        // Fade out white light quickly as rotation starts
                        setWhiteness(Math.max(1 - progress * 3, 0));

                        // Burst at 90 degrees (approx halfway through rotation)
                        if (currentRotateY > 90 && !burstCreatedRef.current) {
                            burstCreatedRef.current = true;
                            // 120 particles bursting out in all directions
                            const burst = Array(120).fill(0).map((_, i) => {
                                const baseAngle = (i / 120) * 360;
                                const angleVariation = (Math.random() - 0.5) * 8;
                                // Size increased by 3x
                                const baseSize = 6 + Math.random() * 14;
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

                        // Ensure whiteness is 0
                        setWhiteness(0);

                        // Safety check for burst (if frame skip caused miss)
                        if (!burstCreatedRef.current) {
                            burstCreatedRef.current = true;
                            const burst = Array(120).fill(0).map((_, i) => {
                                const baseAngle = (i / 120) * 360;
                                const angleVariation = (Math.random() - 0.5) * 8;
                                const baseSize = 6 + Math.random() * 14;
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
                // Fade out white effect and scale back (FAST)
                let revealProgress = 0;
                intervalId = setInterval(() => {
                    revealProgress += 0.2; // Much faster (was 0.06)
                    setWhiteness(Math.max(1 - revealProgress, 0));
                    setGlowIntensity(Math.max(60 - revealProgress * 60, 0));
                    setScale(1.3 - revealProgress * 0.3); // Scale back to 1
                    if (revealProgress >= 1) {
                        if (intervalId) clearInterval(intervalId);
                        setBurstParticles([]);
                        // Linger longer at center after reveal (Increased from 200ms to 600ms)
                        setTimeout(() => onPhaseChangeRef.current('ZOOM_OUT'), 600);
                    }
                }, 40);
                return () => { if (intervalId) clearInterval(intervalId); };

            case 'ZOOM_OUT':
                // Gradually return to original position, size, and rotation
                setPosition({ x: startX, y: startY });

                // Animate rotation and scale back to board card state (Much faster)
                const zoomOutStart = Date.now();
                const zoomOutDuration = 250; // Quicker landing (Was 500ms)

                const startScale = scale; // Current scale (should be ~1)

                intervalId = setInterval(() => {
                    const elapsed = Date.now() - zoomOutStart;
                    const progress = Math.min(elapsed / zoomOutDuration, 1);

                    // Ease-out for smooth deceleration
                    const eased = 1 - Math.pow(1 - progress, 3);

                    // Gradually reduce scale to 0.25 (board card size)
                    setScale(startScale - (startScale - 0.25) * eased);

                    if (progress >= 1) {
                        if (intervalId) clearInterval(intervalId);
                        // Keep rotation at 180 (flipped state)
                        setRotateY(180);
                        setChargeRotate(0); // Reset charge rotation
                        setScale(0.25); // Ensure exact board size
                        onPhaseChangeRef.current('LAND');
                    }
                }, 16);
                return () => { if (intervalId) clearInterval(intervalId); };

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
        };
    }, [phase, startX, startY]);

    // Determine which image to show based on rotation
    const showEvolvedImage = rotateY > 90 && evolvedImageUrl;
    const imageUrl = showEvolvedImage ? evolvedImageUrl : card.imageUrl;

    // Correct the rotation for back face
    const displayRotateY = showEvolvedImage ? rotateY - 180 : rotateY;
    const totalRotateY = displayRotateY + chargeRotate;

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
                        opacity: 0
                    }}
                >
                    <style>{`
                        @keyframes chargeParticleIn-${p.id} {
                            0% { opacity: 0; transform: rotate(${p.angle}deg) translateX(${p.dist}px) scale(0.5); }
                            20% { opacity: 0.8; transform: rotate(${p.angle}deg) translateX(${p.dist * 0.8}px) scale(1.2); }
                            100% { opacity: 0; transform: rotate(${p.angle}deg) translateX(0) scale(0.2); }
                        }
                    `}</style>
                </div>
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
                        width: 500, height: 500,
                        border: '4px solid rgba(255, 255, 255, 0.4)',
                        borderRadius: '50%',
                        transform: 'translate(-50%, -50%) rotateX(75deg)',
                        boxShadow: '0 0 20px rgba(255, 255, 255, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.6)',
                        animation: 'ringSpin 2s linear infinite'
                    }} />
                    {/* Ring 2 - Outer with different angle */}
                    <div style={{
                        position: 'absolute',
                        top: '50%', left: '50%',
                        width: 600, height: 600,
                        border: '2px dashed rgba(100, 200, 255, 0.5)',
                        borderRadius: '50%',
                        transform: 'translate(-50%, -50%) rotateX(80deg) rotateY(10deg)',
                        boxShadow: '0 0 30px rgba(100, 200, 255, 0.3)',
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
                        width: p.size,
                        height: p.size,
                        borderRadius: '50%',
                        background: useSep
                            ? `radial-gradient(circle, rgba(183, 148, 244, 1) 0%, rgba(159, 122, 234, 0.8) 50%, transparent 100%)`
                            : `radial-gradient(circle, rgba(255, 251, 235, 1) 0%, rgba(251, 211, 141, 0.8) 50%, transparent 100%)`,
                        boxShadow: useSep
                            ? '0 0 10px #b794f4, 0 0 20px rgba(159,122,234,0.6)'
                            : '0 0 10px #fbd38d, 0 0 20px rgba(251,211,141,0.6)',
                        animation: `burstParticleOut-${p.id} 0.4s ease-out ${p.delay}s forwards`
                    }}
                >
                    <style>{`
                        @keyframes burstParticleOut-${p.id} {
                            0% { opacity: 1; transform: translate(-50%, -50%) rotate(${p.angle}deg) translateX(0) scale(1.5); }
                            100% { opacity: 0; transform: translate(-50%, -50%) rotate(${p.angle}deg) translateX(${p.dist * 1.5}px) scale(0); }
                        }
                    `}</style>
                </div>
            ))}

            {/* Card Container */}
            <div style={{
                position: 'absolute',
                left: position.x + vibrateOffset.x,
                top: position.y + vibrateOffset.y,
                transform: `translate(-50%, -50%) scale(${scale}) perspective(1200px) rotateY(${totalRotateY}deg)`,
                transition: (phase === 'ZOOM_IN' || phase === 'ZOOM_OUT')
                    ? 'left 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    : 'none',
                transformStyle: 'preserve-3d'
            }}>
                {/* Outer Background Glow */}
                <div style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: cardWidth + 150 + glowIntensity * 4,
                    height: cardHeight + 200 + glowIntensity * 4,
                    background: useSep
                        ? `radial-gradient(ellipse, rgba(159, 122, 234, ${glowIntensity / 70}) 0%, rgba(128, 90, 213, ${glowIntensity / 100}) 30%, transparent 70%)`
                        : `radial-gradient(ellipse, rgba(251, 211, 141, ${glowIntensity / 70}) 0%, rgba(236, 201, 75, ${glowIntensity / 100}) 30%, transparent 70%)`,
                    filter: `blur(${25 + glowIntensity / 2}px)`,
                    pointerEvents: 'none',
                    opacity: glowIntensity > 10 ? 1 : 0,
                    transition: 'opacity 0.3s'
                }} />

                {/* Inner Glow Effect */}
                <div style={{
                    position: 'absolute',
                    inset: -50,
                    background: useSep
                        ? `radial-gradient(circle, rgba(183, 148, 244, ${glowIntensity / 50}) 0%, rgba(159, 122, 234, ${glowIntensity / 80}) 40%, transparent 70%)`
                        : `radial-gradient(circle, rgba(255, 251, 235, ${glowIntensity / 50}) 0%, rgba(251, 211, 141, ${glowIntensity / 80}) 40%, transparent 70%)`,
                    borderRadius: 40,
                    filter: `blur(${glowIntensity / 1.5}px)`,
                    pointerEvents: 'none'
                }} />

                {/* Card */}
                <div style={{
                    width: cardWidth,
                    height: cardHeight,
                    borderRadius: 16,
                    overflow: 'hidden',
                    boxShadow: useSep
                        ? `0 0 ${40 + glowIntensity}px rgba(159, 122, 234, 0.9), 0 0 ${70 + glowIntensity * 2}px rgba(128, 90, 213, 0.5)`
                        : `0 0 ${40 + glowIntensity}px rgba(251, 211, 141, 0.9), 0 0 ${70 + glowIntensity * 2}px rgba(236, 201, 75, 0.5)`,
                    position: 'relative'
                }}>
                    {/* Card Image */}
                    <img
                        src={imageUrl}
                        alt={card.name}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            filter: `brightness(${1 + whiteness * 0.5}) contrast(${1 - whiteness * 0.2})`
                        }}
                    />

                    {/* White Overlay */}
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: `rgba(255,255,255,${whiteness * 0.85})`,
                        pointerEvents: 'none'
                    }} />
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
                    {Array(20).fill(0).map((_, i) => {
                        const angle = (i / 20) * 360;
                        const dist = 40 + Math.random() * 100;
                        return (
                            <div key={`land-${i}`} style={{
                                position: 'absolute', left: 0, top: 0,
                                width: 8, height: 8, borderRadius: '50%',
                                background: 'white',
                                animation: `landParticle${i} 0.5s ease-out forwards`
                            }}>
                                <style>{`
                                    @keyframes landParticle${i} {
                                        0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                                        100% { opacity: 0; transform: translate(-50%, -50%) rotate(${angle}deg) translateX(${dist}px) scale(0); }
                                    }
                                `}</style>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};




// Simple internal component for Game Over
const GameOverScreen = ({ winnerId, playerId, onRematch, onLeave }: { winnerId: string, playerId: string, onRematch: () => void, onLeave: () => void }) => {
    const isVictory = winnerId === playerId;
    const [timeLeft, setTimeLeft] = React.useState(15);
    const [rematchRequested, setRematchRequested] = React.useState(false);

    React.useEffect(() => {
        if (rematchRequested) return;
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
    }, [onLeave, rematchRequested]);

    return (
        <div style={{
            position: 'absolute', inset: 0, zIndex: 5000,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.5s ease-out'
        }} onClick={() => { /* background click */ }}>
            <div style={{
                fontSize: '5rem', fontWeight: 900,
                color: isVictory ? '#f6e05e' : '#a0aec0',
                textShadow: isVictory ? '0 0 30px rgba(246, 224, 94, 0.6)' : 'none',
                marginBottom: 20
            }}>
                {isVictory ? 'VICTORY' : 'DEFEAT'}
                <div style={{ fontSize: '2rem', color: 'white', marginTop: 10 }}>{isVictory ? '勝利' : '敗北'}</div>
            </div>

            <div style={{ display: 'flex', gap: 20 }}>
                <button
                    onClick={() => { setRematchRequested(true); onRematch(); }}
                    style={{
                        padding: '15px 40px', fontSize: '1.5rem', fontWeight: 'bold',
                        background: 'linear-gradient(135deg, #48bb78, #38a169)',
                        color: 'white', border: 'none', borderRadius: 12,
                        cursor: 'pointer', boxShadow: '0 4px 15px rgba(72, 187, 120, 0.4)',
                        transform: 'scale(1)', transition: 'transform 0.1s'
                    }}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    再戦
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
                    タイトルへ ({timeLeft})
                </button>
            </div>
        </div>
    );
};

// --- Custom Hook for Visual Board ---
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
                    next.push({ ...real, isDying: false });
                    realMap.delete((v as any).instanceId);
                } else {
                    // Removed from real board -> Mark Dying
                    next.push({ ...v, isDying: true });
                }
            });

            // 2. Add new cards (Appended)
            realMap.forEach(real => {
                next.push({ ...real, isDying: false });
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
            }, 1200); // 1.2s delay for damage text readability
            return () => clearTimeout(timer);
        }
    }, [visualBoard]);

    return visualBoard;
};

export const GameScreen: React.FC<GameScreenProps> = ({ playerClass, opponentType, gameMode, targetRoomId, onLeave }) => {
    const { adapter, connected } = useGameNetwork(gameMode, targetRoomId);

    // CPU対戦時は相手クラスを自分と反対にする
    const opponentClass: ClassType = playerClass === 'SENKA' ? 'AJA' : 'SENKA';

    const [gameState, dispatch] = useReducer(gameReducer, null, () =>
        initializeGame('You', playerClass, opponentType === 'ONLINE' ? 'Opponent' : 'CPU', opponentClass)
    );

    const currentPlayerId = 'p1';
    const opponentPlayerId = 'p2';

    const player = gameState.players[currentPlayerId];
    const opponent = gameState.players[opponentPlayerId];

    // Visual Boards (Delayed Removal)
    const visualPlayerBoard = useVisualBoard(gameState.players[currentPlayerId]?.board || []);
    const visualOpponentBoard = useVisualBoard(gameState.players[opponentPlayerId]?.board || []);

    // Interaction State
    const [dragState, setDragState] = React.useState<{
        sourceType: 'HAND' | 'BOARD' | 'EVOLVE';
        sourceIndex: number;
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
    } | null>(null);

    // Special Summon Tracking (for cards appearing not from hand)
    const [summonedCardIds, setSummonedCardIds] = React.useState<Set<string>>(new Set());

    const [selectedCard, setSelectedCard] = React.useState<{
        card: any;
        owner: 'PLAYER' | 'OPPONENT';
    } | null>(null);

    interface ActiveEffectState {
        type: 'SLASH' | 'FIREBALL' | 'LIGHTNING' | 'IMPACT' | 'SHOT' | 'SUMI';
        x: number;
        y: number;
        key: number;
    }
    const [activeEffects, setActiveEffects] = React.useState<ActiveEffectState[]>([]);

    const playEffect = (effectType: any, targetPlayerId?: string, targetIndex?: number) => {
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

        const sidebarWidth = 340;
        const boardCenterX = sidebarWidth + (window.innerWidth - sidebarWidth) / 2;
        let x = boardCenterX;
        let y = window.innerHeight / 2;

        const isOpponentTarget = targetPlayerId === opponentPlayerId;
        const isLeader = targetIndex === undefined || targetIndex === -1;

        if (isLeader) {
            const ref = isOpponentTarget ? opponentLeaderRef : playerLeaderRef;
            if (ref.current) {
                const rect = ref.current.getBoundingClientRect();
                x = rect.left + rect.width / 2;
                y = rect.top + rect.height / 2;
                // Correct vertical center visually for effects
                // Leader image might have offset, but ref is bounding box.
                // Assuming bounding box is correct. No extra offset needed if CSS handles it.
            } else {
                y = isOpponentTarget ? 150 : window.innerHeight - 250;
            }
        } else if (targetIndex !== undefined && targetIndex >= 0) {
            const refs = isOpponentTarget ? opponentBoardRefs : playerBoardRefs;
            const el = refs.current[targetIndex];
            if (el) {
                const rect = el.getBoundingClientRect();
                x = rect.left + rect.width / 2;
                y = rect.top + rect.height / 2;
                // Vertical Adjustment for cards:
                // Cards are 100x130 (or similar). The effect centers on this.
                // If user reports shifted, it's likely the effect origin.
                // AttackEffect renders translate(-50%, -50%).
                // If anything, we can hardcode a small offset if needed, but rect center is safest.
            }
        }

        setActiveEffects(prev => [...prev, {
            type: effectType,
            x,
            y,
            key: Date.now() + Math.random()
        }]);
    };


    // --- Draw Animation State ---
    const [drawAnimation, setDrawAnimation] = React.useState<{
        isPlayer: boolean;
        count: number;
        status: 'FLYING' | 'DONE';
    } | null>(null);
    const prevHandSizeRef = React.useRef<{ player: number, opponent: number }>({ player: 0, opponent: 0 });

    const [audioSettings, setAudioSettings] = React.useState(() => {
        try {
            const saved = localStorage.getItem('audioSettings');
            return saved ? JSON.parse(saved) : { bgm: 0.3, se: 0.5, voice: 0.5, enabled: true };
        } catch (e) {
            return { bgm: 0.3, se: 0.5, voice: 0.5, enabled: true };
        }
    });

    const playSE = React.useCallback((file: string, volume: number = 0.5) => {
        if (!audioSettings.enabled) return;
        const audio = new Audio(`/se/${file}`);
        audio.volume = audioSettings.se * volume;
        audio.play().catch(e => console.warn("SE Play prevented", e));
    }, [audioSettings]);

    const bgmRef = React.useRef<HTMLAudioElement | null>(null);
    const [showSettings, setShowSettings] = React.useState(false);

    // BGM Management
    React.useEffect(() => {
        localStorage.setItem('audioSettings', JSON.stringify(audioSettings));
        if (bgmRef.current) {
            bgmRef.current.volume = audioSettings.enabled ? audioSettings.bgm : 0;
            if (!audioSettings.enabled) {
                bgmRef.current.pause();
            } else if (bgmRef.current.paused) {
                bgmRef.current.play().catch(e => console.warn("Auto-play prevented", e));
            }
        }
    }, [audioSettings]);
    const [showMenu, setShowMenu] = React.useState(false);
    const [coinTossPhase, setCoinTossPhase] = React.useState<'IDLE' | 'TOSSING' | 'RESULT' | 'DONE'>('IDLE');
    const [coinTossResult, setCoinTossResult] = React.useState<'FIRST' | 'SECOND' | null>(null);
    const [isGameStartAnim, setIsGameStartAnim] = React.useState(false);
    const [isHandExpanded, setIsHandExpanded] = React.useState(false);
    const handJustExpandedRef = React.useRef(false); // 手札を展開した直後かどうか

    // --- Board Stability Helper ---
    const [shake, setShake] = React.useState(false); // Screen Shake State

    // Target Selection State
    const [targetingState, setTargetingState] = React.useState<{
        type: 'PLAY' | 'EVOLVE';
        sourceIndex: number;
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

    // --- Effect Queue Processing ---

    // Generic Card Animation (e.g. Draw, Generate)
    const [animatingCard, setAnimatingCard] = React.useState<{
        card: CardModel;
        status: 'APPEAR' | 'FLY';
        targetX?: number;
        targetY?: number;
    } | null>(null);

    // --- Effect Processing ---
    React.useEffect(() => {
        if (gameState.pendingEffects && gameState.pendingEffects.length > 0) {
            const current = gameState.pendingEffects[0];

            // Handle GENERATE_CARD with animation
            if (current.effect.type === 'GENERATE_CARD' && current.effect.targetCardId) {
                const cardDef = getCardDefinition(current.effect.targetCardId);
                if (cardDef) {

                    // Note: This logic assumes pendingEffects[0] is strictly managed and this effect runs only once per trigger
                    // Ideally check against a processed ID set, but relying on RESOLVE_EFFECT removal for now.

                    // Determine fly target based on who is getting the card
                    // sourcePlayerId gets the card in GENERATE_CARD (usually self-cast or effect owner)
                    const isPlayer = current.sourcePlayerId === currentPlayerId;
                    const flyTargetX = window.innerWidth / 2;
                    const flyTargetY = isPlayer ? window.innerHeight - 100 : 100; // Hand positions

                    // Start Animation: APPEAR at center
                    setAnimatingCard({ card: cardDef, status: 'APPEAR', targetX: flyTargetX, targetY: flyTargetY });

                    // Phase 1: Float at center
                    setTimeout(() => {
                        // Phase 2: Fly to hand
                        setAnimatingCard(prev => prev ? { ...prev, status: 'FLY' } : null);

                        // Phase 3: Complete and resolve
                        setTimeout(() => {
                            setAnimatingCard(null);
                            dispatchAndSend({ type: 'RESOLVE_EFFECT', playerId: currentPlayerId });
                        }, 600); // Fly duration
                    }, 1000); // Float duration

                    return; // Don't set up the default timer
                }
            }

            // Trigger Visual Animation for DAMAGE/AOE
            if (current.effect.type === 'DAMAGE' || current.effect.type === 'AOE_DAMAGE') {
                const effectType = current.sourceCard.attackEffectType || 'SLASH';
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
                } else if (current.targetId) {
                    const vIdx = vBoard.findIndex(v => v?.instanceId === current.targetId);
                    if (vIdx !== -1) playEffect(effectType, targetPid, vIdx);
                }
            }

            // Default: Resolve after animation completes
            // Damage/AOE effects use sprite animation (1066ms), so wait longer for them
            const isDamageEffect = current.effect.type === 'DAMAGE' || current.effect.type === 'AOE_DAMAGE';
            const delay = isDamageEffect ? 1200 : 800; // Wait for animation to complete
            const timer = setTimeout(() => {
                dispatchAndSend({ type: 'RESOLVE_EFFECT', playerId: currentPlayerId });
            }, delay);
            return () => clearTimeout(timer);
        }
    }, [gameState.pendingEffects, currentPlayerId, opponentPlayerId, animatingCard, visualPlayerBoard, visualOpponentBoard]);

    const prevPlayersRef = React.useRef<Record<string, Player>>(gameState.players); // Initial State

    // Detect Special Summons (cards appearing on board not from hand)
    React.useEffect(() => {
        const prevPlayers = prevPlayersRef.current;
        const currentPlayer = gameState.players[currentPlayerId];
        const prevPlayer = prevPlayers[currentPlayerId];

        if (!prevPlayer) return; // First render

        const prevBoard = prevPlayer.board || [];
        const currBoard = currentPlayer.board || [];
        const prevHand = prevPlayer.hand || [];

        const prevBoardIds = new Set(prevBoard.filter(c => c).map(c => (c as any).instanceId));
        const prevHandIds = new Set(prevHand.filter(c => c).map(c => (c as any).instanceId));
        const newSummonIds = new Set<string>();

        // Find cards that are new on board AND were not in previous hand
        currBoard.forEach(card => {
            if (!card) return;
            const instanceId = (card as any).instanceId;

            // Card is new on board (not in prev board)
            if (!prevBoardIds.has(instanceId)) {
                // Check if it was in hand (normal play) or not (special summon)
                if (!prevHandIds.has(instanceId)) {
                    newSummonIds.add(instanceId);
                }
            }
        });

        if (newSummonIds.size > 0) {
            setSummonedCardIds(newSummonIds);
            // Clear after animation completes (1 second)
            const timer = setTimeout(() => {
                setSummonedCardIds(new Set());
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [gameState.players, currentPlayerId]);

    React.useEffect(() => {
        const prevPlayers = prevPlayersRef.current;
        const currentPlayers = gameState.players;
        let newDamages: { id: number, value: number | string, x: number, y: number, color?: string }[] = [];

        Object.keys(currentPlayers).forEach(pid => {
            const curr = currentPlayers[pid];
            const prev = prevPlayers[pid];

            // 1. Leader Damage
            if (prev && curr.hp < prev.hp) {
                const diff = prev.hp - curr.hp;
                const isMe = pid === currentPlayerId;
                const ref = isMe ? playerLeaderRef.current : opponentLeaderRef.current;

                if (ref) {
                    const rect = ref.getBoundingClientRect();
                    newDamages.push({
                        id: Date.now() + Math.random(),
                        value: diff,
                        x: rect.left + rect.width / 2,
                        y: rect.top + rect.height / 2,
                        color: '#e53e3e' // Red for Damage
                    });
                }
            } else if (prev && curr.hp > prev.hp) { // Heal Detection
                const diff = curr.hp - prev.hp;
                const isMe = pid === currentPlayerId;
                const ref = isMe ? playerLeaderRef.current : opponentLeaderRef.current;
                if (ref) {
                    const rect = ref.getBoundingClientRect();
                    newDamages.push({
                        id: Date.now() + Math.random(),
                        value: '+' + diff,
                        x: rect.left + rect.width / 2,
                        y: rect.top + rect.height / 2,
                        color: '#48bb78' // Green for Heal
                    });
                }
            }

            // 2. Board Damage & Death Tracking
            // Check previous board for damage or death
            prev?.board.forEach((prevCard, idx) => {
                if (!prevCard) return;

                // Search for this card in current board
                const currCard = curr.board.find(c => c?.instanceId === prevCard.instanceId);

                if (currCard) {
                    // Still on board. Check HP.
                    if (currCard.currentHealth < prevCard.currentHealth) {
                        const damage = prevCard.currentHealth - currCard.currentHealth;
                        const currIdx = curr.board.findIndex(c => c?.instanceId === currCard.instanceId);
                        const isMe = pid === currentPlayerId;
                        const refs = isMe ? playerBoardRefs.current : opponentBoardRefs.current;
                        const el = refs[currIdx];
                        if (el) {
                            const rect = el.getBoundingClientRect();
                            newDamages.push({ id: Date.now() + Math.random(), value: damage, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, color: '#e53e3e' });
                        }
                    } else if (currCard.currentHealth > prevCard.currentHealth) {
                        // Heal - but skip if this is from evolution (hasEvolved changed to true)
                        const isEvolution = currCard.hasEvolved && !prevCard.hasEvolved;
                        if (!isEvolution) {
                            const heal = currCard.currentHealth - prevCard.currentHealth;
                            const currIdx = curr.board.findIndex(c => c?.instanceId === currCard.instanceId);
                            const isMe = pid === currentPlayerId;
                            const refs = isMe ? playerBoardRefs.current : opponentBoardRefs.current;
                            const el = refs[currIdx];
                            if (el) {
                                const rect = el.getBoundingClientRect();
                                newDamages.push({ id: Date.now() + Math.random(), value: '+' + heal, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, color: '#48bb78' });
                            }
                        }
                    }
                } else {
                    // Not found -> Check Graveyard
                    const inGraveyard = curr.graveyard.find(g => (g as any).instanceId === prevCard.instanceId);

                    // If in graveyard (or just missing), assume damage if it was on board.
                    // For AoE visibility, we want to see damage numbers on dying units.
                    // If it's dead, assume damage = prevCard.currentHealth (or calculate if possible).
                    // We accept that it might be bounce, but usually bounce is specific effect.
                    // Prioritize showing damage for AoE.
                    let damage = 0;
                    if (inGraveyard) {
                        const finalHP = (inGraveyard as any).currentHealth;
                        // If finalHP <= 0, it died from damage. Show full damage (prevHP).
                        // If finalHP > 0, it died from Effect (Destroy). detected by engine.ts logic.
                        // However, engine.ts doesn't change HP on destroy. So finalHP should be > 0.
                        if (finalHP <= 0) {
                            damage = prevCard.currentHealth; // Or prevCard.currentHealth - finalHP? Since finalHP is <= 0.
                            // Better: prevCard.currentHealth is what was lost.
                        } else {
                            damage = 0; // Destroy effect, no red damage text
                        }
                    } else {
                        // Not in graveyard? Maybe banished or just missing. Assume damaged?
                        // If we can't find it, safe to say 0 or full?
                        // Let's assume full damage if missing entirely from board and grave (unlikely unless banished)
                        damage = prevCard.currentHealth;
                    }

                    if (damage > 0) {
                        newDamages.push({ id: Date.now() + Math.random(), value: damage, x: 0, y: 0, color: '#e53e3e' }); // Coords need fix
                        // Fix coords for graveyard item? Use Last known pos from board ref?
                        // We can try to use refs index.
                        // Board index might shift if cards removed.
                        // But prevCard is from prev.board[idx].
                        // If we use idx, refs[idx] might be current card at that slot (different card).
                        // We need "Last Known Position".
                        // Use stored refs?
                        const isMe = pid === currentPlayerId;
                        const refs = isMe ? playerBoardRefs.current : opponentBoardRefs.current;
                        const el = refs[idx]; // idx matches prevCard index if no shift... wait.
                        if (el) {
                            const rect = el.getBoundingClientRect();
                            // Update the damage item pushed above
                            newDamages[newDamages.length - 1].x = rect.left + rect.width / 2;
                            newDamages[newDamages.length - 1].y = rect.top + rect.height / 2;
                        }
                    }
                }
            });
        });

        // Add Damage Texts
        if (newDamages.length > 0) {
            setDamageNumbers(prev => [...prev, ...newDamages]);
            triggerShake();
        }

        prevPlayersRef.current = currentPlayers;
    }, [gameState.players, currentPlayerId, opponentPlayerId]);


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

    // Coin Toss and Game Start Animation Sequence
    useEffect(() => {
        if (gameState.phase === 'INIT' && coinTossPhase === 'IDLE') {
            // Start coin toss animation
            setCoinTossPhase('TOSSING');
            playSE('coin.mp3', 0.7); // Coin toss sound

            // Determine result (random for CPU, or based on host status for online)
            const isFirst = gameMode === 'CPU' ? Math.random() > 0.5 : (gameMode === 'HOST');

            // After toss animation, show result
            setTimeout(() => {
                setCoinTossResult(isFirst ? 'FIRST' : 'SECOND');
                setCoinTossPhase('RESULT');

                // If going second, swap turn order
                if (!isFirst) {
                    // Directly update game state to swap active player and PP
                    const newState = {
                        ...gameState,
                        activePlayerId: 'p2',
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
            }, 1800);
        }
    }, [gameState.phase, coinTossPhase, gameMode, playSE]);


    // BGM Auto-Play - Initialize once based on player class
    const bgmInitializedRef = React.useRef(false);
    React.useEffect(() => {
        if (bgmInitializedRef.current) return;
        bgmInitializedRef.current = true;

        // Use selected background music based on leader
        const selectedBgm = player.class === 'AJA' ? '/bgm/Green Misty Mountains.mp3' : '/bgm/ouka.mp3';
        const bgm = new Audio(selectedBgm);
        bgm.loop = true;
        bgm.volume = audioSettings.bgm;
        bgmRef.current = bgm;

        // Try to play on first user interaction
        const tryPlay = () => {
            if (bgmRef.current && bgmRef.current.paused && audioSettings.enabled) {
                bgmRef.current.play().catch(e => console.warn("BGM play prevented:", e));
            }
            document.removeEventListener('click', tryPlay);
            document.removeEventListener('keydown', tryPlay);
        };

        document.addEventListener('click', tryPlay);
        document.addEventListener('keydown', tryPlay);

        // Also try immediate play
        if (audioSettings.enabled) {
            bgm.play().catch(() => {
                // Autoplay blocked, waiting for user interaction
            });
        }

        return () => {
            bgm.pause();
            bgm.currentTime = 0;
            document.removeEventListener('click', tryPlay);
            document.removeEventListener('keydown', tryPlay);
        };
    }, [player.class]); // Only depends on player.class
    useEffect(() => {
        if (!adapter) return;
        adapter.onMessage((msg) => {
            if (msg.type === 'GAME_STATE') dispatch({ type: 'SYNC_STATE', payload: msg.payload } as any);
            else if (msg.type === 'ACTION') {
                dispatch({ ...msg.payload, isRemote: true } as any);

                // Handle Remote Effects
                if (msg.payload.type === 'ATTACK') {
                    const { playerId, payload } = msg.payload;
                    const attackerPlayer = gameState.players[playerId];
                    const attackerCard = attackerPlayer.board[payload.attackerIndex];
                    const targetIdx = payload.targetIsLeader ? -1 : payload.targetIndex;
                    const targetPid = playerId === 'p1' ? 'p2' : 'p1';
                    playEffect(attackerCard?.attackEffectType, targetPid, targetIdx);
                }
            }
        });
    }, [adapter, connected]);  // Removed gameState from dependencies

    // AI Logic State
    const aiProcessing = React.useRef(false);
    const lastProcessedTurn = React.useRef<string | null>(null);

    // --- Drag State Ref for Smooth Performance ---
    const dragStateRef = React.useRef<{
        sourceType: 'HAND' | 'BOARD' | 'EVOLVE';
        sourceIndex: number;
        startX: number;
        startY: number;
        currentX: number;
        currentY: number;
        offsetX: number;
        offsetY: number;
        useSep?: boolean;
    } | null>(null);

    // Card Play Animation State
    const [playingCardAnim, setPlayingCardAnim] = React.useState<{
        card: any;
        startX: number;
        startY: number;
        targetX: number;
        targetY: number;
        finalX?: number; // Board destination X
        finalY?: number; // Board destination Y
        onComplete: () => void;
    } | null>(null);

    // Evolution Animation State
    const [evolveAnimation, setEvolveAnimation] = React.useState<{
        card: any;
        evolvedImageUrl?: string;
        startX: number;
        startY: number;
        phase: 'ZOOM_IN' | 'WHITE_FADE' | 'FLIP' | 'REVEAL' | 'ZOOM_OUT' | 'LAND';
        followerIndex: number;
        useSep: boolean;
        targetId?: string;
        isRemote?: boolean;
        sourcePlayerId?: string;
    } | null>(null);

    // --- State Refs for AI Timing (Moved here to ensure access to all states) ---
    const activeEffectsRef = React.useRef(activeEffects);
    const animatingCardRef = React.useRef(animatingCard);
    const playingCardAnimRef = React.useRef(playingCardAnim);
    const evolveAnimationRef = React.useRef(evolveAnimation);

    useEffect(() => {
        activeEffectsRef.current = activeEffects;
        animatingCardRef.current = animatingCard;
        playingCardAnimRef.current = playingCardAnim;
        evolveAnimationRef.current = evolveAnimation;
    }, [activeEffects, animatingCard, playingCardAnim, evolveAnimation]);

    // Handle Evolve with Animation
    const handleEvolveWithAnimation = (followerIndex: number, useSep: boolean, targetId?: string) => {
        const card = playerRef.current.board[followerIndex];
        if (!card) return;

        // Get the card's current position on the board
        const cardEl = playerBoardRefs.current[followerIndex];

        // Default to board center if card element is missing
        let startX = 0;
        let startY = 0;

        if (boardRef.current) {
            const boardRect = boardRef.current.getBoundingClientRect();
            startX = boardRect.left + boardRect.width / 2;
            startY = boardRect.top + boardRect.height / 2;
        } else {
            startX = window.innerWidth / 2;
            startY = window.innerHeight / 2;
        }

        if (cardEl) {
            const rect = cardEl.getBoundingClientRect();
            startX = rect.left + rect.width / 2;
            startY = rect.top + rect.height / 2;
        }

        setEvolveAnimation({
            card,
            evolvedImageUrl: card.evolvedImageUrl,
            startX,
            startY,
            phase: 'ZOOM_IN',
            followerIndex,
            useSep,
            targetId
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
            // Animation complete - store pending action in ref and clear animation
            setEvolveAnimation(prev => {
                if (prev && !prev.isRemote) {
                    pendingEvolveRef.current = {
                        followerIndex: prev.followerIndex,
                        useSep: prev.useSep,
                        targetId: prev.targetId,
                        playerId: prev.sourcePlayerId || currentPlayerId // Use sourcePlayerId if available, else current
                    };
                }
                return null; // Clear animation
            });
        } else {
            setEvolveAnimation(prev => prev ? { ...prev, phase: newPhase } : null);
        }
    }, [currentPlayerId, playSE]);

    // Handle Play Card with Animation
    const handlePlayCard = (index: number, startX: number, startY: number) => {
        // Use Ref to ensure we have the latest player state
        const currentPlayer = playerRef.current;
        const card = currentPlayer.hand[index];

        console.log(`[handlePlayCard] index: ${index}, card: ${card?.name}, needsTarget check...`);

        const needsTarget =
            (card.type === 'SPELL' && card.triggers?.some(t => t.effects.some(e => e.targetType === 'SELECT_FOLLOWER'))) ||
            (card.type === 'FOLLOWER' && (
                card.triggerAbilities?.FANFARE?.targetType === 'SELECT_FOLLOWER' ||
                card.triggers?.some(t => t.trigger === 'FANFARE' && t.effects.some(e => e.targetType === 'SELECT_FOLLOWER'))
            ));

        // Check if there are ANY valid targets on opponent's board (not Stealthed and not Aura)
        const opponentBoard = gameStateRef.current.players[opponentPlayerId].board;
        const hasValidTargets = opponentBoard.some(c =>
            c &&
            !c.passiveAbilities?.includes('STEALTH') &&
            !c.passiveAbilities?.includes('AURA')
        );

        console.log(`[handlePlayCard] needsTarget: ${needsTarget}, hasValidTargets: ${hasValidTargets}`);

        if (needsTarget && hasValidTargets) {
            setTargetingState({ type: 'PLAY', sourceIndex: index });
            setDragState(null); // Stop dragging
            return;
        }

        // Determine target position (Center of screen - aligned with leader)
        const targetX = window.innerWidth / 2; // Leader's center axis
        const targetY = window.innerHeight / 2;

        // Calculate board position for landing (Followers only)
        let finalX: number | undefined;
        let finalY: number | undefined;

        if (card.type === 'FOLLOWER') {
            const currentBoard = gameStateRef.current.players[currentPlayerId].board;
            const validCards = currentBoard.filter(c => c !== null);
            const newBoardSize = validCards.length + 1;
            const newIndex = validCards.length;

            const spacing = 102; // Card width 90 + gap 12 (Align with render logic)
            const offsetX = (newIndex - (newBoardSize - 1) / 2) * spacing;

            // Calculate Board Center
            let boardCenterX = window.innerWidth / 2;
            if (boardRef.current) {
                const rect = boardRef.current.getBoundingClientRect();
                boardCenterX = rect.left + rect.width / 2;
            } else {
                const sidebarWidth = 340;
                boardCenterX = sidebarWidth + (window.innerWidth - sidebarWidth) / 2;
            }

            finalX = boardCenterX + offsetX;

            // Determine Y: Player slots are at top: 'calc(50% + 5px)' relative to boardArea
            // Card center is window.innerHeight / 2 + 5 + 60
            finalY = window.innerHeight / 2 + 65;
        }

        const onComplete = () => {
            if (card.type !== 'SPELL') {
                playSE('gan.mp3', 0.6); // Land sound
                triggerShake(); // Trigger Shake on Land ONLY if not Spell
            }
            // Dispatch only once
            dispatchAndSend({ type: 'PLAY_CARD', playerId: currentPlayerId, payload: { cardIndex: index } });
            setPlayingCardAnim(null);
        };

        setPlayingCardAnim({
            card,
            startX,
            startY,
            targetX,
            targetY,
            finalX,
            finalY,
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
            // Player Drew
            setDrawAnimation({ isPlayer: true, count: currP - prev.player, status: 'FLYING' });
            playSE('card.mp3', 0.5);
            setTimeout(() => setDrawAnimation(null), 800);
        }
        if (currO > prev.opponent) {
            // Opponent Drew
            setDrawAnimation({ isPlayer: false, count: currO - prev.opponent, status: 'FLYING' });
            playSE('card.mp3', 0.5);
            setTimeout(() => setDrawAnimation(null), 800);
        }

        prevHandSizeRef.current = { player: currP, opponent: currO };
    }, [player.hand.length, opponent.hand.length, audioSettings, playSE]);

    // --- AI Logic (Restored) ---

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
                        const isAnimatingCard = animatingCardRef.current !== null;
                        const isPlayingCard = playingCardAnimRef.current !== null;
                        const isEvolving = evolveAnimationRef.current !== null;

                        return !hasPending && !hasActiveEffects && !isAnimatingCard && !isPlayingCard && !isEvolving;
                    };

                    // Wait until idle (with timeout to prevent infinite loop - increased for evolution animations)
                    let waitCount = 0;
                    while (!checkIdle() && waitCount < 60) { // 60 * 100ms = 6 seconds max wait
                        await new Promise(r => setTimeout(r, 100));
                        waitCount++;
                    }
                };

                // 1. Thinking time (short pause)
                await new Promise(resolve => setTimeout(resolve, 800));
                if (!aiProcessing.current) return;

                // 2. Play MAX Cost Card
                {
                    const state = gameStateRef.current;
                    const aiHand = state.players[opponentPlayerId].hand;
                    const aiPp = state.players[opponentPlayerId].pp;

                    // Sort by Cost Descending
                    const playable = aiHand
                        .map((c, i) => ({ ...c, originalIndex: i }))
                        .filter(c => c.cost <= aiPp)
                        .sort((a, b) => b.cost - a.cost);

                    if (playable.length > 0) {
                        const bestCard = playable[0];
                        let targetId = undefined;
                        const enemyBoard = state.players[currentPlayerId].board;
                        // Filter targetable enemies (No Stealth/Aura)
                        const targetableEnemies = enemyBoard.filter(c =>
                            c &&
                            !c.passiveAbilities?.includes('STEALTH') &&
                            !c.passiveAbilities?.includes('AURA')
                        );

                        if (targetableEnemies.length > 0) {
                            targetId = targetableEnemies[0]!.instanceId;
                        }

                        // Animation First
                        const sidebarWidth = 340;
                        const startX = sidebarWidth + (window.innerWidth - sidebarWidth) / 2;
                        const startY = 100;

                        let finalX: number | undefined;
                        let finalY: number | undefined;

                        if (bestCard.type === 'FOLLOWER') {
                            const currentBoard = gameStateRef.current.players[opponentPlayerId].board;
                            const validCards = currentBoard.filter(c => c !== null);
                            const newBoardSize = validCards.length + 1;
                            const newIndex = validCards.length;

                            const spacing = 102;
                            const offsetX = (newIndex - (newBoardSize - 1) / 2) * spacing;

                            let boardCenterX = window.innerWidth / 2;
                            if (boardRef.current) {
                                const rect = boardRef.current.getBoundingClientRect();
                                boardCenterX = rect.left + rect.width / 2;
                            } else {
                                const sidebarWidth = 340;
                                boardCenterX = sidebarWidth + (window.innerWidth - sidebarWidth) / 2;
                            }
                            finalX = boardCenterX + offsetX;
                            finalY = window.innerHeight / 2 - 65;
                        }

                        setPlayingCardAnim({
                            card: bestCard,
                            startX, startY,
                            targetX: startX, targetY: window.innerHeight / 2, // Center of right side
                            finalX,
                            finalY,
                            onComplete: () => {
                                triggerShake();
                                dispatch({
                                    type: 'PLAY_CARD',
                                    playerId: opponentPlayerId,
                                    payload: { cardIndex: bestCard.originalIndex, targetId }
                                });

                                // --- AI amandava FANFARE Visuals ---
                                if (bestCard.id === 'c_amandava') {
                                    const playerBoard = gameStateRef.current.players[currentPlayerId].board;
                                    playerBoard.forEach((c, i) => {
                                        if (c) {
                                            // Since it's random 2, we just show effects on the board or guess
                                            // For visuals, showing it on 2 random valid targets is fine
                                            setTimeout(() => {
                                                playEffect('SHOT', currentPlayerId, i);
                                            }, 200);
                                        }
                                    });
                                }

                                // --- AI Azya FANFARE Visuals ---
                                if (bestCard.id === 'c_azya') {
                                    // 1. Damage to Player Leader
                                    setTimeout(() => {
                                        playEffect('THUNDER', currentPlayerId, -1);
                                    }, 200);

                                    // 2. Destroy Target (if targetId was set)
                                    if (targetId) {
                                        const playerBoard = gameStateRef.current.players[currentPlayerId].board;
                                        const targetIdx = playerBoard.findIndex(c => c?.instanceId === targetId);
                                        if (targetIdx !== -1) {
                                            setTimeout(() => {
                                                playEffect('THUNDER', currentPlayerId, targetIdx);
                                            }, 400);
                                        }
                                    }
                                }

                                setPlayingCardAnim(null);
                            }
                        });

                        // Wait for idle (Animation + Effects)
                        await waitForIdle(600);
                    }
                }

                // 2.5 Evolve Phase
                {
                    const state = gameStateRef.current;
                    const aiPlayer = state.players[opponentPlayerId];
                    const isFirstPlayer = (opponentPlayerId as string) === 'p1';
                    const turnCount = state.turnCount;

                    const canEvolveCheck = canEvolve(aiPlayer, turnCount, isFirstPlayer);
                    if (canEvolveCheck && aiPlayer.board.length > 0) {
                        const candidates = aiPlayer.board
                            .map((c, i) => ({ c, i }))
                            .filter(({ c }) => c && c.type === 'FOLLOWER' && !c.hasEvolved);

                        if (candidates.length > 0) {
                            const target = candidates[candidates.length - 1];
                            let targetId = undefined;
                            const enemyBoard = state.players[currentPlayerId].board;
                            // Filter targets for Evolve effect (No Stealth/Aura)
                            const validTargets = enemyBoard.filter(c =>
                                c !== null &&
                                !c.passiveAbilities?.includes('STEALTH') &&
                                !c.passiveAbilities?.includes('AURA')
                            );
                            if (validTargets.length > 0) {
                                targetId = validTargets[0]!.instanceId;
                            }

                            // Trigger Animation for AI
                            const useSuper = (aiPlayer.sep > 0 && turnCount >= 6);
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
                                // Note: We do NOT set pendingEvolveRef here. 
                                // handleEvolvePhaseChange will set it when animation completes (DONE phase).

                                // Wait for animation sequence (~2s)
                                await waitForIdle(800);
                            } else {
                                // Fallback if no visual ref (should be rare)
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

                // 3. Attack (Greedy Trade) - USING FRESH STATE
                {
                    // Refresh state loop for multi-attack
                    // Since we await inside loop, stateRef updates?
                    // No, `state` var is stale. Must re-read `gameStateRef.current` each iter.
                    // But we can't simple-loop. We need `while` loop.

                    let continueAttacking = true;
                    // Limit iterations to prevent infinite loops
                    let attempts = 0;

                    while (continueAttacking && attempts < 10) {
                        attempts++;
                        const state = gameStateRef.current;
                        const aiBoard = state.players[opponentPlayerId].board;
                        const playerBoard = state.players[currentPlayerId].board;
                        const activeWards = playerBoard.filter(c => c && c.passiveAbilities?.includes('WARD'));

                        // Find FIRST valid attacker that hasn't attacked?
                        // Or calculate all moves?
                        // Simple greedy: Find first available attacker.

                        let actionTaken = false;

                        for (let i = 0; i < aiBoard.length; i++) {
                            const attacker = aiBoard[i];
                            if (!attacker || !attacker.canAttack) continue;

                            let targetIndex = -1;
                            let targetIsLeader = true;

                            // WARD Logic
                            if (activeWards.length > 0) {
                                // Filter out Stealth Wards (Technically Stealth + Ward is weird, but usually Ward breaks Stealth or Stealth overrides Ward blocking?)
                                // Rules: Stealth unit cannot be targeted. So if a Ward unit has Stealth, it cannot be targeted, so it doesn't protect?
                                // Usually Stealth negates Ward. "Ward" means "Enemies MUST attack this". "Stealth" means "Enemies CANNOT attack this".
                                // In most games, Stealth disables Ward.
                                // Let's assume Stealth units cannot be selected as Ward targets.
                                const wardIdx = playerBoard.findIndex(c => c && c.passiveAbilities?.includes('WARD') && !c.passiveAbilities?.includes('STEALTH'));

                                if (wardIdx !== -1) {
                                    targetIndex = wardIdx;
                                    targetIsLeader = false;
                                } else {
                                    // No valid Ward (all stealthed? or none). Treat as no Ward.
                                    // Fall through to normal logic
                                }
                            }

                            if (targetIndex === -1) { // If Ward didn't set target
                                // RUSH Check: If RUSH and played this turn (and no STORM), CANNOT target leader
                                // const hasRush = attacker.passiveAbilities?.includes('RUSH'); // Unused
                                const hasStorm = attacker.passiveAbilities?.includes('STORM');
                                const isSummoningSickness = attacker.turnPlayed === state.turnCount;

                                const canAttackLeader = !isSummoningSickness || hasStorm;

                                if (!canAttackLeader) {
                                    // Must attack follower. If no follower, cannot attack.
                                    let bestTarget = -1;
                                    for (let t = 0; t < playerBoard.length; t++) {
                                        const target = playerBoard[t];
                                        if (!target) continue;
                                        if (target.passiveAbilities?.includes('STEALTH') || target.passiveAbilities?.includes('AURA')) continue; // Skip Stealth/Aura
                                        // Simple Logic: Kill small things or trade
                                        bestTarget = t;
                                        break;
                                    }

                                    if (bestTarget !== -1) {
                                        targetIndex = bestTarget;
                                        targetIsLeader = false;
                                    } else {
                                        // No valid target
                                        continue;
                                    }
                                } else {
                                    // Can attack leader. Smart Trade or Face?
                                    // For now: Smart Trade Logic but prefer Face if no good trade
                                    let bestTarget = -1;
                                    for (let t = 0; t < playerBoard.length; t++) {
                                        const target = playerBoard[t];
                                        if (!target) continue;
                                        if (target.passiveAbilities?.includes('STEALTH') || target.passiveAbilities?.includes('AURA')) continue; // Skip Stealth/Aura

                                        if (attacker.currentAttack >= target.currentHealth && (target.currentAttack || 0) < attacker.currentHealth) {
                                            bestTarget = t;
                                            break;
                                        }
                                    }

                                    if (bestTarget !== -1) {
                                        targetIndex = bestTarget;
                                        targetIsLeader = false;
                                    }
                                    // Else default targetIsLeader = true
                                }
                            }

                            // Visual Feedback
                            // Visual Feedback - ATTACKER
                            playEffect(attacker.attackEffectType || 'SLASH', currentPlayerId, targetIsLeader ? -1 : targetIndex);

                            // Counter-Attack Visuals
                            if (!targetIsLeader && targetIndex >= 0) {
                                const defender = playerBoard[targetIndex];
                                if (defender && (defender.currentAttack || 0) > 0) {
                                    // Defender attacks Attacker (who is at index 'i' on Opponent Board)
                                    // Delayed for overlap effect
                                    setTimeout(() => {
                                        // Use defender's effect type, targeting the attacker (index i on opponent board)
                                        playEffect(defender.attackEffectType || 'SLASH', opponentPlayerId, i);
                                    }, 200); // Shorter overlap
                                }
                            }

                            actionTaken = true;

                            // Check for Counter to optimize wait
                            let hasCounter = false;
                            if (!targetIsLeader && targetIndex >= 0) {
                                const defender = playerBoard[targetIndex];
                                if (defender && (defender.currentAttack || 0) > 0) hasCounter = true;
                            }

                            await waitForIdle(hasCounter ? 350 : 250);

                            dispatch({
                                type: 'ATTACK',
                                playerId: opponentPlayerId,
                                payload: { attackerIndex: i, targetIndex, targetIsLeader }
                            });

                            await waitForIdle(200); // Wait for damage text
                            break;
                        }
                        if (!actionTaken) continueAttacking = false;
                    }
                }

                dispatch({ type: 'END_TURN', playerId: opponentPlayerId });
                aiProcessing.current = false;
            };
            runAiTurn();
        }
    }, [gameState.activePlayerId, gameState.turnCount, gameMode, gameState.phase]);



    // --- Interaction Handlers ---

    // Hand Click / Drag Start
    const handleHandMouseDown = (e: React.MouseEvent, index: number) => {
        if (gameState.activePlayerId !== currentPlayerId) return;

        // --- PREVENTION: Do not start a new drag if one is active ---
        if (dragStateRef.current) return;

        const card = player.hand[index];
        e.stopPropagation();

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const info = {
            sourceType: 'HAND' as const,
            sourceIndex: index,
            startX: rect.left + rect.width / 2, // Center of Card
            startY: rect.top + rect.height / 2,
            currentX: e.clientX,
            currentY: e.clientY,
            offsetX: 0,
            offsetY: 0,
            canDrag: isHandExpanded // Only allow drag if already expanded
        };
        if (!isHandExpanded) {
            setIsHandExpanded(true);
            setSelectedCard({ card, owner: 'PLAYER' });
            // 展開した直後フラグを立てる（次のクリックまで折りたたまない）
            handJustExpandedRef.current = true;
            return;
        }

        // If already expanded, update selected card
        setSelectedCard({ card, owner: 'PLAYER' });

        setDragState(info);
        dragStateRef.current = info;
    };

    // Board Drag (Attack)
    const handleBoardMouseDown = (e: React.MouseEvent, index: number) => {
        // Inspect
        const card = player.board[index];
        if (card) setSelectedCard({ card, owner: 'PLAYER' });
        e.stopPropagation();

        if (gameState.activePlayerId === currentPlayerId && (card as any)?.canAttack) {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const newState = {
                sourceType: 'BOARD' as const,
                sourceIndex: index,
                startX: rect.left + rect.width / 2, // Start from center of card
                startY: rect.top + rect.height / 2,
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

        // Client-side visual check
        const isFirstPlayer = currentPlayerId === 'p1';
        if (useSepFlag) {
            if (player.sep <= 0) return;
        } else {
            if (!canEvolve(player, gameState.turnCount, isFirstPlayer)) return;
        }

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

    // Global Drag Listeners (Window Level) - OPTIMIZED w/ REF
    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!dragStateRef.current) return;

            // Only update current coords if allowed to drag or if it's board/evolve
            const { canDrag, sourceType } = dragStateRef.current as any;
            if (sourceType === 'HAND' && !canDrag) return;

            // Apply immediately to ref for logic
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
    useEffect(() => {
        hoveredTargetRef.current = hoveredTarget;
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
                    const dragDistanceTotal = Math.sqrt(Math.pow(currentDrag.startX - currentDrag.currentX, 2) + Math.pow(currentDrag.startY - currentDrag.currentY, 2));

                    // Use "Board Rect" detection (Basic: Y < handY and not too far left/right? Or just "Is Y < 60% of screen")
                    // Since Board is technically most of the screen except Hand area.
                    // Let's use a Y threshold: If Arrow Head is "above" the Hand area.
                    const isOverBoard = currentDrag.currentY < (window.innerHeight - 200);

                    // Threshold for action > 30px to prevent accidental clicks becoming drags
                    // Threshold for action > 30px to prevent accidental clicks becoming drags
                    if ((currentDrag as any).canDrag && dragDistanceTotal > 30 && isOverBoard) {
                        const card = playerRef.current.hand[currentDrag.sourceIndex];
                        if (playerRef.current.pp >= card.cost) {
                            // Check for Target Selection Requirement (Play Trigger)
                            const needsTarget = card.triggerAbilities?.FANFARE?.targetType === 'SELECT_FOLLOWER' ||
                                card.triggers?.some(t => t.trigger === 'FANFARE' && t.effects.some(e => e.targetType === 'SELECT_FOLLOWER'));

                            if (needsTarget) {
                                setTargetingState({ type: 'PLAY', sourceIndex: currentDrag.sourceIndex });
                                setIsHandExpanded(false);
                                setSelectedCard(null);
                                ignoreClickRef.current = true; // Prevent quick close
                                setTimeout(() => { ignoreClickRef.current = false; }, 100);
                            } else {
                                handlePlayCard(currentDrag.sourceIndex, currentDrag.startX, currentDrag.startY);
                                setIsHandExpanded(false);
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
                        const wardUnits = opponent.board.filter(c => c && (c as any).passiveAbilities?.includes('WARD'));
                        let isBlocked = false;

                        if (wardUnits.length > 0) {
                            if (currentHover.type === 'LEADER') {
                                isBlocked = true;
                            } else if (currentHover.type === 'FOLLOWER' && currentHover.index !== undefined) {
                                const targetCard = opponent.board[currentHover.index];
                                if (targetCard && !(targetCard as any).passiveAbilities?.includes('WARD')) {
                                    isBlocked = true;
                                }
                            }
                        }

                        if (isBlocked) {
                            console.log("UI: Attack blocked by WARD");
                            setSelectedCard(null);
                        } else {
                            const attackerCard = playerRef.current.board[currentDrag.sourceIndex] as any;
                            // RUSH Check Logic (UI)
                            const hasRush = attackerCard?.passiveAbilities?.includes('RUSH');
                            const hasStorm = attackerCard?.passiveAbilities?.includes('STORM');
                            const isSummoningSickness = attackerCard?.turnPlayed === gameStateRef.current.turnCount;
                            const targetIsLeader = currentHover.type === 'LEADER';
                            const targetIndex = currentHover.type === 'LEADER' ? -1 : currentHover.index!;

                            if (targetIsLeader && hasRush && !hasStorm && isSummoningSickness) {
                                console.log("UI: Attack blocked by RUSH rule (Cannot attack leader)");
                                setSelectedCard(null);
                                // Could add specific visual feedback here
                            } else {

                                // Correctly pass target info to playEffect
                                const attackType = attackerCard?.attackEffectType || 'SLASH';
                                playEffect(attackType, opponentPlayerId, targetIsLeader ? -1 : targetIndex);
                                triggerShake();

                                // Counter-Attack Visuals for Player Attack
                                if (!targetIsLeader && targetIndex >= 0) {
                                    const defender = opponent.board[targetIndex];
                                    if (defender && (defender.currentAttack || 0) > 0) {
                                        // Defender (Opponent) attacks Attacker (Player index sourceIndex)
                                        setTimeout(() => {
                                            playEffect(defender.attackEffectType || 'SLASH', currentPlayerId, currentDrag.sourceIndex);
                                        }, 200);
                                    }
                                }

                                // Delay Dispatch to match animation impact point (approx 300-350ms)
                                setTimeout(() => {
                                    dispatchAndSend({
                                        type: 'ATTACK',
                                        playerId: currentPlayerId,
                                        payload: {
                                            attackerIndex: currentDrag.sourceIndex,
                                            targetIndex: targetIsLeader ? -1 : targetIndex, // Use calculated index
                                            targetIsLeader: targetIsLeader
                                        }
                                    });
                                }, 350); // Wait 350ms for animation impact (snappier)
                            }
                        }
                    } else {
                        // If released without selecting a target, reset selection to return to "resting" state
                        setSelectedCard(null);
                    }
                }
                // Evolve Logic
                else if (currentDrag.sourceType === 'EVOLVE' && currentHover && currentHover.type === 'FOLLOWER' && currentHover.playerId === currentPlayerId) {
                    const followerIndex = currentHover.index!;
                    const card = playerRef.current.board[followerIndex];

                    // Check for Target Selection Requirement (Evolve Trigger)
                    const needsTarget = card?.triggerAbilities?.EVOLVE?.targetType === 'SELECT_FOLLOWER' ||
                        card?.triggers?.some(t => t.trigger === 'EVOLVE' && t.effects.some(e => e.targetType === 'SELECT_FOLLOWER'));

                    // Check valid targets
                    const opponentBoard = gameStateRef.current.players[opponentPlayerId].board;
                    const hasValidTargets = opponentBoard.some(c =>
                        c &&
                        !c.passiveAbilities?.includes('STEALTH') &&
                        !c.passiveAbilities?.includes('AURA')
                    );

                    if (needsTarget && hasValidTargets) {
                        setTargetingState({ type: 'EVOLVE', sourceIndex: followerIndex });
                        ignoreClickRef.current = true;
                        setTimeout(() => { ignoreClickRef.current = false; }, 100);
                    } else {
                        // Start evolution animation instead of direct dispatch
                        handleEvolveWithAnimation(followerIndex, (currentDrag as any).useSep);
                        ignoreClickRef.current = true;
                        setTimeout(() => { ignoreClickRef.current = false; }, 100);
                    }
                }
            }

            // Reset
            setDragState(null);
            dragStateRef.current = null;
            setHoveredTarget(null);
        };

        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [opponentPlayerId, currentPlayerId, isHandExpanded]); // Removed gameState and player to prevent double registration

    // Background click to close expanded hand OR Cancel Targeting
    const handleBackgroundClick = () => {
        if (ignoreClickRef.current) return;
        if (targetingState) {
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
        }
    };

    // --- Arrow Path ---
    const getArrowPath = () => {
        if (!dragState || (dragState.sourceType !== 'BOARD' && dragState.sourceType !== 'EVOLVE')) return '';
        // HAND source removed from arrow logic
        const cx = (dragState.startX + dragState.currentX) / 2;
        const cy = (dragState.startY + dragState.currentY) / 2 - 50;
        return `M${dragState.startX},${dragState.startY} Q${cx},${cy} ${dragState.currentX},${dragState.currentY}`;
    };

    // --- Target Selection Handler ---
    const handleTargetClick = (targetType: 'LEADER' | 'FOLLOWER', targetIndex: number, targetPlayerId: string) => {
        if (!targetingState) return;

        // Determine validity (Simplified: assume all opponent followers are valid if targetingState is active for now)
        // In full engine, checks would filter specific target requirements (e.g. "Select Allied Follower")

        // 1. Get Target ID
        let targetId: string | undefined = undefined;
        if (targetType === 'FOLLOWER') {
            const targetValues = gameState.players[targetPlayerId].board[targetIndex];
            if (!targetValues) return;
            targetId = targetValues.instanceId;

            // Check AURA (Cannot target opponent followers with Aura)
            // Assuming AURA prevents ALL targeting from opponent effects/spells/attacks during selection
            if (targetPlayerId !== currentPlayerId) {
                const abilities = (targetValues as any).passiveAbilities || [];
                if (abilities.includes('AURA')) {
                    console.log("Cannot target unit with AURA");
                    triggerShake();
                    return;
                }
                if (abilities.includes('STEALTH')) {
                    console.log("Cannot target unit with STEALTH");
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
            const index = targetingState.sourceIndex;

            // Use playerRef to ensure we have the latest state
            const currentPlayer = playerRef.current;
            const animCard = currentPlayer.hand[index];

            if (!animCard) {
                console.error('[handleTargetClick] Card not found at index:', index);
                setTargetingState(null);
                return;
            }

            // --- C_Y Visuals Trigger ---
            if (animCard.id === 'c_y') {
                // 1. Lightning on Target (Now SUMI)
                playEffect('SUMI', 'p2', targetIndex);

                // 2. AOE on all OTHER enemies
                const opponentBoard = gameStateRef.current.players[opponentPlayerId].board; // Safe access via Ref
                opponentBoard.forEach((c, i) => {
                    if (c) {
                        // Delay slightly for dramatic effect?
                        setTimeout(() => {
                            playEffect('SUMI', opponentPlayerId, i);
                        }, 300);
                    }
                });
            }

            // --- 退職代行 (s_resignation_proxy) Visuals ---
            if (animCard.id === 's_resignation_proxy') {
                // 1. Target enemy destruction effect
                playEffect('SUMI', targetPlayerId, targetIndex);

                // 2. Self random destruction effect (Delayed slightly)
                setTimeout(() => {
                    const selfBoard = gameStateRef.current.players[currentPlayerId].board;
                    const validSelfIndices = selfBoard.map((c, i) => c ? i : -1).filter(i => i !== -1);
                    if (validSelfIndices.length > 0) {
                        const randomIdx = validSelfIndices[Math.floor(Math.random() * validSelfIndices.length)];
                        playEffect('SUMI', currentPlayerId, randomIdx);
                    }
                }, 500);
            }

            // Animation for spell/card
            const sidebarWidth = 340;
            const startX = sidebarWidth + (window.innerWidth - sidebarWidth) / 2;
            const startY = window.innerHeight - 100;

            // Create onComplete handler that captures necessary values
            const onComplete = () => {
                const isSpell = animCard.type === 'SPELL';
                if (!isSpell) triggerShake();
                dispatchAndSend({
                    type: 'PLAY_CARD',
                    playerId: currentPlayerId,
                    payload: { cardIndex: index, targetId }
                });

                // --- Player amandava FANFARE Visuals ---
                if (animCard.id === 'c_amandava') {
                    const opponentBoard = gameStateRef.current.players[opponentPlayerId].board;
                    opponentBoard.forEach((c, i) => {
                        if (c) {
                            setTimeout(() => {
                                playEffect('SHOT', opponentPlayerId, i);
                            }, 200);
                        }
                    });
                }

                // --- Player Azya FANFARE Visuals ---
                if (animCard.id === 'c_azya') {
                    // 1. Damage to Leader
                    setTimeout(() => {
                        playEffect('THUNDER', opponentPlayerId, -1);
                    }, 200);

                    // 2. Destroy Target
                    setTimeout(() => {
                        playEffect('THUNDER', targetPlayerId, targetIndex);
                    }, 400);
                }

                setPlayingCardAnim(null);
            };

            let finalX: number | undefined;
            let finalY: number | undefined;

            if (animCard.type === 'FOLLOWER') {
                const currentBoard = gameStateRef.current.players[currentPlayerId].board;
                const validCards = currentBoard.filter(c => c !== null);
                const newBoardSize = validCards.length + 1;
                const newIndex = validCards.length;

                const spacing = 102;
                const offsetX = (newIndex - (newBoardSize - 1) / 2) * spacing;

                let boardCenterX = window.innerWidth / 2;
                if (boardRef.current) {
                    const rect = boardRef.current.getBoundingClientRect();
                    boardCenterX = rect.left + rect.width / 2;
                } else {
                    const sidebarWidth = 340;
                    boardCenterX = sidebarWidth + (window.innerWidth - sidebarWidth) / 2;
                }
                finalX = boardCenterX + offsetX;
                finalY = window.innerHeight / 2 + 65;
            }

            setPlayingCardAnim({
                card: animCard,
                startX, startY,
                targetX: sidebarWidth + (window.innerWidth - sidebarWidth) / 2, // Center of Board
                targetY: window.innerHeight / 2,
                finalX,
                finalY,
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
            handleEvolveWithAnimation(targetingState.sourceIndex, false, targetId);
        }

        // 3. Reset
        setTargetingState(null);
    };

    // --- Use Button Handler ---
    const handleUseButtonClick = () => {
        if (!selectedCard || selectedCard.owner !== 'PLAYER') return;
        const cardIndex = player.hand.findIndex(c => c.id === selectedCard.card.id);
        if (cardIndex === -1) return;

        // If card needs target, we shouldn't simple-play it. 
        // Reuse handlePlayCard logic which checks for targeting needs.
        // Start animation from bottom center of BOARD
        let startX = window.innerWidth / 2;
        let startY = window.innerHeight - 100;

        if (boardRef.current) {
            const rect = boardRef.current.getBoundingClientRect();
            startX = rect.left + rect.width / 2;
            startY = rect.bottom - 50; // Near bottom of board
        }

        handlePlayCard(cardIndex, startX, startY);
        setIsHandExpanded(false);
        setSelectedCard(null);
    };

    if (gameMode !== 'CPU' && !connected && gameMode === 'JOIN') return <div>Connecting... <button onClick={onLeave}>Cancel</button></div>;

    const remainingEvolves = 2 - player.evolutionsUsed;
    const canEvolveUI = player.canEvolveThisTurn && remainingEvolves > 0 && gameState.activePlayerId === currentPlayerId && gameState.turnCount >= (currentPlayerId === 'p1' ? 5 : 4);

    // Force re-render log
    console.log("GameScreen Layout Updated: Layer 3 Implemented");

    // Force scroll to top on every render to prevent layout shift
    useLayoutEffect(() => {
        if (boardRef.current) {
            boardRef.current.scrollTop = 0;
        }
        window.scrollTo(0, 0);
    });

    return (
        <div className="game-screen"
            style={{
                width: '100%', height: '100%', display: 'flex', overflow: 'hidden',
                background: 'radial-gradient(circle at center, #1a202c 0%, #000 100%)',
                fontFamily: "'Helvetica Neue', sans-serif", userSelect: 'none', color: '#fff'
            }}
            // REMOVED local onMouseMove/Up listeners to avoid conflict/lag
            onClick={handleBackgroundClick} // Close hand on bg click
        >
            <style>{`
                html, body { margin: 0; padding: 0; height: 100%; background: #000; overflow: hidden; }
                * { box-sizing: border-box; }
                .shake-target { animation: shake 0.3s cubic-bezier(.36,.07,.19,.97) both; }
                @keyframes shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }
                @keyframes cardDie {
                    0% { transform: scale(1); filter: brightness(1) drop-shadow(0 0 0 white); opacity: 1; }
                    50% { transform: scale(1.1); filter: brightness(3) drop-shadow(0 0 20px white); opacity: 0.8; }
                    100% { transform: scale(0.5) rotate(5deg); filter: brightness(5) drop-shadow(0 0 40px white); opacity: 0; }
                }
                .card-dying { animation: cardDie 1.2s forwards; }
             `}</style>

            {/* <BattleLog logs={gameState.logs || []} /> */}

            {/* Target Selection Overlay Message */}
            {targetingState && (
                <div style={{
                    position: 'absolute', top: '15%', left: '50%', transform: 'translate(-50%, -50%)',
                    background: 'rgba(0, 0, 0, 0.7)', color: '#fff', padding: '10px 20px', borderRadius: 20,
                    pointerEvents: 'none', zIndex: 1000, fontWeight: 'bold'
                }}>
                    対象を選択してください
                </div>
            )}





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
                                    <input type="checkbox" checked={audioSettings.enabled} onChange={e => setAudioSettings((prev: any) => ({ ...prev, enabled: e.target.checked }))}
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



            {/* --- Left Sidebar: Card Info & Menu (20%) --- */}
            <div className={shake ? 'shake-target' : ''} style={{ width: '20%', minWidth: 250, borderRight: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', padding: '50px 20px 20px 20px', display: 'flex', flexDirection: 'column', zIndex: 20 }} onClick={e => e.stopPropagation()}>
                {/* Menu Button */}
                <div style={{ marginBottom: 30 }}>
                    <button onClick={() => setShowMenu(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 5 }}>
                        <div style={{ width: 30, height: 3, background: '#cbd5e0', marginBottom: 6 }}></div>
                        <div style={{ width: 30, height: 3, background: '#cbd5e0', marginBottom: 6 }}></div>
                        <div style={{ width: 30, height: 3, background: '#cbd5e0' }}></div>
                    </button>
                </div>

                <h3 style={{ color: '#a0aec0', borderBottom: '1px solid #4a5568', paddingBottom: 10, marginTop: 0 }}>カード情報</h3>
                {selectedCard ? (
                    <div style={{ marginTop: 20 }}>
                        {/* Art Only */}
                        <div style={{
                            width: '100%', aspectRatio: '1/1', marginBottom: 20,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Card card={selectedCard.card} style={{ width: '100%', height: '100%' }} variant="art-only" />
                        </div>

                        {/* Name */}
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }}>{selectedCard.card.name}</div>

                        {/* Stats with Icons */}
                        {selectedCard.card.type === 'FOLLOWER' && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 20 }}>
                                {/* Attack Spade */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <polygon points="12,2 22,22 2,22" fill="#63b3ed" stroke="none" />
                                    </svg>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4299e1' }}>
                                        {'currentAttack' in selectedCard.card ? (selectedCard.card as any).currentAttack : selectedCard.card.attack}
                                    </span>
                                </div>
                                {/* Health Heart */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#f56565">
                                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                    </svg>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#f56565' }}>
                                        {'currentHealth' in selectedCard.card ? (selectedCard.card as any).currentHealth : selectedCard.card.health}
                                    </span>
                                </div>
                            </div>
                        )}



                        <div style={{ fontSize: '0.9rem', color: '#cbd5e0', lineHeight: '1.5', whiteSpace: 'pre-wrap', borderTop: '1px solid #4a5568', paddingTop: 10 }}>
                            {selectedCard.card.description}
                        </div>
                    </div>
                ) : (
                    <div style={{ marginTop: 20, color: '#718096', fontStyle: 'italic' }}>カードを選択して詳細を表示</div>
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
                    onClick={() => targetingState && handleTargetClick('LEADER', -1, opponentPlayerId)}
                    style={{
                        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                        width: 240, height: 240, borderRadius: '50%',
                        background: `url(${opponent.class === 'AJA' ? azyaLeaderImg : senkaLeaderImg}) center/cover`,
                        border: (hoveredTarget?.type === 'LEADER' && hoveredTarget.playerId === opponentPlayerId) || (targetingState && opponentType !== 'CPU') ? '4px solid #f56565' : '4px solid #4a5568',
                        boxShadow: '0 0 20px rgba(0,0,0,0.5)', zIndex: 100,
                        cursor: targetingState ? 'crosshair' : 'default',
                        transition: 'all 0.3s'
                    }}>
                    {/* Opponent HP - Mirrored Player Position (Screen Left relative to center) */}
                    <div style={{
                        position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%) translateX(-140px)',
                        width: 50, height: 50, background: 'radial-gradient(circle, #feb2b2, #c53030)', borderRadius: '50%',
                        border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.4rem', fontWeight: 900, color: 'white', textShadow: '0 2px 2px rgba(0,0,0,0.5)', zIndex: 10
                    }}>{opponent.hp}</div>

                    {/* Opponent EP - Circular Frame */}
                    <div style={{
                        position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%) translateX(-80px)',
                        width: 45, height: 45, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)',
                        background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
                    }}>
                        <div style={{ display: 'flex', gap: 3 }}>
                            {Array(2).fill(0).map((_, i) => <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: i < (2 - opponent.evolutionsUsed) ? '#ecc94b' : '#2d3748', boxShadow: i < (2 - opponent.evolutionsUsed) ? '0 0 5px #ecc94b' : 'none', border: '2px solid rgba(0,0,0,0.5)' }} />)}
                        </div>
                    </div>

                    {/* Opponent SEP - Circular Frame */}
                    <div style={{
                        position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%) translateX(80px)',
                        width: 45, height: 45, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)',
                        background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
                    }}>
                        <div style={{ display: 'flex', gap: 3 }}>
                            {Array(2).fill(0).map((_, i) => <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: i < opponent.sep ? '#9f7aea' : '#2d3748', boxShadow: i < opponent.sep ? '0 0 5px #9f7aea' : 'none', border: '2px solid rgba(0,0,0,0.5)' }} />)}
                        </div>
                    </div>
                </div>

                {/* Opponent Deck - Top Left */}
                <div style={{ position: 'absolute', top: 10, left: 20, width: 60, height: 85, zIndex: 50 }}>
                    {[...Array(Math.min(5, Math.ceil(opponent.deck.length / 5)))].map((_, i) => (
                        <div key={i} style={{ position: 'absolute', inset: 0, transform: `translate(${i * 2}px, ${-i * 2}px)`, background: 'linear-gradient(45deg, #2d3748, #1a202c)', borderRadius: 6, border: '1px solid #718096' }} />
                    ))}
                    <div style={{ position: 'absolute', bottom: -20, width: '100%', textAlign: 'center', fontWeight: 'bold', color: '#a0aec0', fontSize: '0.9rem' }}>{opponent.deck.length}</div>
                </div>

                {/* Opponent Hand - Top Right */}
                <div style={{ position: 'absolute', top: 10, right: 20, display: 'flex', transform: 'scale(0.6)', transformOrigin: 'top right', zIndex: 50 }}>
                    {opponent.hand.map((_, i) => (
                        <div key={i} style={{
                            width: 80, height: 110,
                            background: 'linear-gradient(135deg, #4a192c 0%, #2d1a20 100%)',
                            border: '1px solid #742a3a', borderRadius: 6,
                            marginLeft: i > 0 ? -50 : 0, boxShadow: '0 4px 6px rgba(0,0,0,0.5)'
                        }}></div>
                    ))}
                </div>

                {/* ========================================== */}
                {/* BATTLE FIELD - Fixed Areas with smooth sliding cards */}
                {/* ========================================== */}

                {/* Opponent Slots - Fixed Y (Gap center at 50%) */}
                <div style={{
                    position: 'absolute', top: 'calc(50% - 125px)', left: '0', width: '100%', height: 120,
                    pointerEvents: 'none', zIndex: 10
                }}>
                    <div style={{
                        position: 'relative', width: '100%', height: '100%',
                        display: 'flex', justifyContent: 'center'
                    }}>
                        {visualOpponentBoard.map((c: any, i: number) => {
                            const boardSize = visualOpponentBoard.length;
                            const spacing = 102; // Card width 90 + gap 12
                            const offsetX = (i - (boardSize - 1) / 2) * spacing;

                            return (
                                <div key={c?.instanceId || `empty-opp-${i}`}
                                    ref={el => opponentBoardRefs.current[i] = el}
                                    onMouseEnter={() => setHoveredTarget({ type: 'FOLLOWER', index: i, playerId: opponentPlayerId })}
                                    onMouseLeave={() => setHoveredTarget(null)}
                                    onClick={() => { if (targetingState) { if (!c) return; handleTargetClick('FOLLOWER', i, opponentPlayerId); } else { c && setSelectedCard({ card: c, owner: 'OPPONENT' }) } }}
                                    style={{
                                        position: 'absolute',
                                        left: '50%',
                                        top: 0,
                                        transform: `translateX(calc(-50% + ${offsetX}px)) ${(hoveredTarget?.type === 'FOLLOWER' && hoveredTarget.index === i) ? 'scale(1.05)' : 'scale(1)'}`,
                                        transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), left 0.4s ease',
                                        border: (targetingState && c) ? '2px solid #f56565' : 'none', borderRadius: 8,
                                        cursor: targetingState ? 'crosshair' : 'pointer',
                                        pointerEvents: 'auto'
                                    }}>
                                    {c ? <Card card={c} className={c.isDying ? 'card-dying' : ''} style={{ width: 90, height: 120, opacity: (evolveAnimation && evolveAnimation.sourcePlayerId === opponentPlayerId && evolveAnimation.followerIndex === i) ? 0 : (c as any).isDying ? 0.8 : 1, filter: (c as any).isDying ? 'grayscale(0.5) brightness(2)' : 'none', boxShadow: dragState?.sourceType === 'BOARD' ? '0 0 20px #f6e05e' : undefined }} isOnBoard={true} /> : <div style={{ width: 90, height: 120, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 8 }} />}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Player Slots - Fixed Y (Gap center at 50%) */}
                <div style={{
                    position: 'absolute', top: 'calc(50% + 5px)', left: '0', width: '100%', height: 120,
                    pointerEvents: 'none', zIndex: 10
                }}>
                    <div style={{
                        position: 'relative', width: '100%', height: '100%',
                        display: 'flex', justifyContent: 'center'
                    }}>
                        {visualPlayerBoard.map((c: any, i: number) => {
                            const boardSize = visualPlayerBoard.length;
                            const spacing = 102; // Card width 90 + gap 12
                            const offsetX = (i - (boardSize - 1) / 2) * spacing;

                            return (
                                <div key={c?.instanceId || `empty-plr-${i}`}
                                    ref={el => playerBoardRefs.current[i] = el}
                                    onMouseDown={(e) => handleBoardMouseDown(e, i)}
                                    onMouseEnter={() => setHoveredTarget({ type: 'FOLLOWER', index: i, playerId: currentPlayerId })}
                                    onMouseLeave={() => setHoveredTarget(null)}
                                    style={{
                                        position: 'absolute',
                                        left: '50%',
                                        top: 0,
                                        transform: `translateX(calc(-50% + ${offsetX}px)) ${dragState?.sourceType === 'BOARD' && dragState.sourceIndex === i ? 'translateY(-20px) scale(1.1)' : ''}`,
                                        transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), left 0.4s ease',
                                        cursor: 'pointer',
                                        pointerEvents: 'auto',
                                        zIndex: dragState?.sourceType === 'BOARD' && dragState.sourceIndex === i ? 10 : 1
                                    }}>
                                    {/* Evolve Target Marker */}
                                    {c && dragState?.sourceType === 'EVOLVE' && hoveredTarget?.type === 'FOLLOWER' && hoveredTarget.index === i && hoveredTarget.playerId === currentPlayerId && !c.hasEvolved && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '50%', // Center vertically
                                            left: '50%', // Center horizontally
                                            transform: 'translate(-50%, -50%)',
                                            width: 120,
                                            height: 120,
                                            pointerEvents: 'none',
                                            zIndex: 100
                                        }}>
                                            <svg viewBox="0 0 100 100" style={{
                                                width: '100%',
                                                height: '100%',
                                                animation: 'evolveMarkerSpin 1.5s linear infinite',
                                                filter: 'drop-shadow(0 0 8px currentColor)'
                                            }}>
                                                <defs>
                                                    <filter id={dragState.useSep ? 'purpleMarkerGlow' : 'yellowMarkerGlow'} x="-50%" y="-50%" width="200%" height="200%">
                                                        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
                                                        <feMerge>
                                                            <feMergeNode in="blur" />
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
                                    {c ? <Card card={c} turnCount={gameState.turnCount} className={c.isDying ? 'card-dying' : ''} style={{ width: 90, height: 120, opacity: (evolveAnimation && evolveAnimation.sourcePlayerId === currentPlayerId && evolveAnimation.followerIndex === i) ? 0 : (c as any).isDying ? 0.8 : 1, filter: (c as any).isDying ? 'grayscale(0.5) brightness(2)' : 'none', boxShadow: dragState?.sourceType === 'BOARD' && dragState.sourceIndex === i ? '0 20px 30px rgba(0,0,0,0.6)' : undefined, pointerEvents: dragState?.sourceType === 'BOARD' && dragState.sourceIndex === i ? 'none' : 'auto' }} isSelected={selectedCard?.card === c} isOnBoard={true} isSpecialSummoning={summonedCardIds.has((c as any).instanceId)} /> : <div style={{ width: 90, height: 120, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 8 }} />}
                                </div>
                            );

                        })}
                    </div>
                </div>

                {/* ========================================== */}
                {/* RIGHT SIDE CONTROLS - Centered vertically (UPSIZED 2X) */}
                {/* ========================================== */}
                <div style={{ position: 'absolute', right: 30, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 30, zIndex: 50 }}>
                    {/* Opponent PP */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f6e05e' }}>{opponent.pp}/{opponent.maxPp}</div>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>{Array(Math.min(10, opponent.maxPp)).fill(0).map((_, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i < opponent.pp ? '#f6e05e' : '#2d3748' }} />)}</div>
                    </div>
                    {/* End Turn Button */}
                    <button disabled={gameState.activePlayerId !== currentPlayerId} onClick={() => dispatchAndSend({ type: 'END_TURN', playerId: currentPlayerId })} style={{ width: 160, height: 160, borderRadius: '50%', border: '4px solid rgba(255,255,255,0.2)', background: gameState.activePlayerId === currentPlayerId ? 'linear-gradient(135deg, #3182ce, #2b6cb0)' : '#2d3748', color: 'white', fontWeight: 900, fontSize: '1.6rem', boxShadow: gameState.activePlayerId === currentPlayerId ? '0 0 40px rgba(66, 153, 225, 0.8)' : 'none', cursor: gameState.activePlayerId === currentPlayerId ? 'pointer' : 'default', transition: 'all 0.3s' }}>ターン<br />終了</button>
                    {/* Player PP */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#f6e05e' }}>{player.pp}/{player.maxPp}</div>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>{Array(10).fill(0).map((_, i) => <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: i < player.pp ? '#f6e05e' : (i < player.maxPp ? '#744210' : '#2d3748') }} />)}</div>
                    </div>
                </div>

                {/* ========================================== */}
                {/* BATTLE LOG & GAME START - Centered */}
                {/* ========================================== */}
                <BattleLog logs={gameState.logs || []} />

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
                                width: 120, height: 120, margin: '0 auto 30px',
                                borderRadius: '50%',
                                background: coinTossPhase === 'RESULT'
                                    ? (coinTossResult === 'FIRST' ? 'linear-gradient(135deg, #ffd700, #ff8c00)' : 'linear-gradient(135deg, #c0c0c0, #808080)')
                                    : 'linear-gradient(135deg, #ffd700, #ff8c00)',
                                boxShadow: coinTossPhase === 'RESULT'
                                    ? `0 0 40px ${coinTossResult === 'FIRST' ? '#ffd700' : '#c0c0c0'}, 0 0 80px ${coinTossResult === 'FIRST' ? 'rgba(255,215,0,0.5)' : 'rgba(192,192,192,0.5)'}`
                                    : '0 0 30px #ffd700',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '3rem', fontWeight: 900, color: '#1a202c',
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
                                    fontSize: '1rem', color: '#a0aec0', marginTop: 10,
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
                            background: 'linear-gradient(135deg, #ffd700, #ff6b6b, #ffd700)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            textShadow: 'none',
                            filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.8)) drop-shadow(0 0 40px rgba(255,107,107,0.5))',
                            animation: 'gameStartPop 0.8s ease-out',
                            letterSpacing: '0.2em'
                        }}>
                            GAME START
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
                {/* PLAYER LEADER - Fixed at bottom center */}
                {/* Size: 240px, EP/SEP at top, HP left of EP */}
                {/* ========================================== */}
                <div ref={playerLeaderRef} style={{
                    position: 'absolute', bottom: -40, left: '50%', transform: 'translateX(-50%)',
                    width: 240, height: 240, borderRadius: '50%',
                    zIndex: 200
                }}>
                    <div style={{
                        width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden',
                        border: '4px solid #3182ce', boxShadow: '0 0 20px rgba(49, 130, 206, 0.4)', background: '#1a202c'
                    }}>
                        <img src={player.class === 'AJA' ? azyaLeaderImg : senkaLeaderImg} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>

                    {/* Player HP - Top Left (Center - 140px) */}
                    <div style={{
                        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%) translateX(-140px)',
                        width: 55, height: 55, background: 'radial-gradient(circle at 30% 30%, #feb2b2, #c53030)', borderRadius: '50%',
                        border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.6rem', fontWeight: 900, color: 'white', textShadow: '0 2px 2px rgba(0,0,0,0.5)',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.4)', zIndex: 10
                    }}>{player.hp}</div>

                    {/* Player EP - Circular Frame */}
                    <div onMouseDown={(e) => handleEvolveMouseDown(e, false)} style={{
                        position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%) translateX(-80px)',
                        width: 45, height: 45, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)',
                        background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: canEvolveUI ? 'grab' : 'default', zIndex: 10
                    }}>
                        <div style={{ display: 'flex', gap: 3 }}>
                            {Array(2).fill(0).map((_, i) => <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: i < remainingEvolves ? '#ecc94b' : '#2d3748', boxShadow: i < remainingEvolves ? (canEvolveUI ? '0 0 10px #ecc94b, 0 0 20px #ecc94b' : '0 0 5px #ecc94b') : 'none', border: '2px solid rgba(0,0,0,0.5)' }} />)}
                        </div>
                    </div>

                    {/* Player SEP - Circular Frame */}
                    <div onMouseDown={(e) => handleEvolveMouseDown(e, true)} style={{
                        position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%) translateX(80px)',
                        width: 45, height: 45, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)',
                        background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 10, cursor: player.sep > 0 ? 'grab' : 'default'
                    }}>
                        <div style={{ display: 'flex', gap: 3 }}>
                            {Array(2).fill(0).map((_, i) => <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: i < player.sep ? '#9f7aea' : '#2d3748', boxShadow: i < player.sep ? '0 0 10px #9f7aea' : 'none', border: '2px solid rgba(0,0,0,0.5)' }} />)}
                        </div>
                    </div>
                </div>

                {/* Player Deck - Bottom Right */}
                <div style={{ position: 'absolute', bottom: 10, right: 15, width: 60, height: 85, zIndex: 50 }}>
                    {[...Array(Math.min(5, Math.ceil(player.deck.length / 5)))].map((_, i) => (
                        <div key={i} style={{ position: 'absolute', inset: 0, transform: `translate(${i * 2}px, ${-i * 2}px)`, background: 'linear-gradient(45deg, #2d3748, #1a202c)', borderRadius: 6, border: '1px solid #718096', boxShadow: '1px 1px 3px rgba(0,0,0,0.5)' }} />
                    ))}
                    <div style={{ position: 'absolute', top: -20, width: '100%', textAlign: 'center', color: '#a0aec0', fontSize: '0.9rem', fontWeight: 'bold', textShadow: '0 1px 2px black' }}>{player.deck.length}</div>
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
                    height: 200,
                    display: 'flex',
                    justifyContent: 'center', // Center alignment for positioning reference
                    alignItems: 'flex-end',
                    pointerEvents: 'none',
                    zIndex: 500
                }}>
                    {player.hand.map((c, i) => {
                        const handSize = player.hand.length;
                        let offsetX = 0;
                        let translateY = 0;
                        let rotate = 0;

                        if (!isHandExpanded) {
                            // Collapsed: positioned at midpoint between center (50%) and right edge (100%)
                            // Midpoint = 75% from left = 25% from right
                            // In pixels from center: +25% of board width
                            const boardWidth = typeof window !== 'undefined' ? window.innerWidth * 0.8 : 1000;
                            const rightQuadrantCenter = boardWidth * 0.25; // 25% right of center

                            const spacing = Math.min(45, 300 / handSize);
                            offsetX = rightQuadrantCenter + (i - (handSize - 1) / 2) * spacing;
                            translateY = 0; // User requested 0 for collapsed too
                            rotate = (i - (handSize - 1) / 2) * 3;
                        } else {
                            // Expanded: centered on board center (leader's center axis)
                            const spacing = Math.min(115, 600 / handSize);
                            offsetX = (i - (handSize - 1) / 2) * spacing;
                            translateY = 0; // NO Y offset - cards at bottom
                            rotate = 0;
                        }

                        // Selected card rises ONLY when expanded
                        if (isHandExpanded && selectedCard?.card === c) {
                            translateY = -10;
                        }

                        return (
                            <div key={c.id + i}
                                style={{
                                    position: 'absolute',
                                    bottom: 0, // Absolutely at bottom - no gap
                                    left: '50%', // Start from center
                                    transform: `translateX(calc(-50% + ${offsetX}px)) translateY(${translateY}px) rotate(${rotate}deg)`,
                                    transformOrigin: 'bottom center',
                                    zIndex: i,
                                    transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
                                    cursor: 'pointer',
                                    pointerEvents: 'auto'
                                }}
                                onMouseDown={(e) => handleHandMouseDown(e, i)}
                                onClick={(e) => e.stopPropagation()} // Prevent background click from firing
                            >
                                <Card card={c} style={{ width: 100, height: 140, boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }} isSelected={selectedCard?.card === c} isPlayable={player.pp >= c.cost && gameState.activePlayerId === currentPlayerId} />
                            </div>
                        );
                    })}
                </div>

                {/* Play Button - Bottom Left (Moved above hand count) */}
                {selectedCard && selectedCard.owner === 'PLAYER' && isHandExpanded && (
                    <div style={{ position: 'absolute', left: 15, bottom: 100, zIndex: 600, pointerEvents: 'auto' }}>
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

                {/* Hand Count Badge & Card Icon - Far Left near boundary */}
                <div style={{ position: 'absolute', bottom: 30, left: 15, display: 'flex', alignItems: 'center', gap: 10, zIndex: 601, pointerEvents: 'none' }}>
                    {/* Hand Icon - Stacked Cards */}
                    <div style={{ position: 'relative', width: 40, height: 50 }}>
                        <div style={{ position: 'absolute', inset: 0, background: '#4a5568', borderRadius: 4, border: '1px solid #718096', transform: 'rotate(-15deg) translate(-5px, 0)' }} />
                        <div style={{ position: 'absolute', inset: 0, background: '#2d3748', borderRadius: 4, border: '1px solid #718096', transform: 'rotate(-5deg) translate(-2px, 0)' }} />
                        <div style={{ position: 'absolute', inset: 0, background: '#1a202c', borderRadius: 4, border: '1px solid #cbd5e0', transform: 'rotate(5deg)' }} />
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.7)', padding: '5px 12px', borderRadius: 8, color: '#e2e8f0', fontSize: '1rem', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>
                        手札 {player.hand.length}
                    </div>
                </div>

                {/* Draw Animation Overlay */}
                {
                    drawAnimation && (
                        <div style={{
                            position: 'absolute',
                            left: drawAnimation.isPlayer ? 'calc(100% - 90px)' : 90,
                            top: drawAnimation.isPlayer ? 'calc(100% - 105px)' : 105,
                            width: 80, height: 110,
                            background: '#4a5568',
                            borderRadius: 8,
                            border: '2px solid white',
                            // Use CSS Animation for Fly Effect
                            animation: `drawCard${drawAnimation.isPlayer ? 'Player' : 'Opponent'} 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards`,
                            zIndex: 9000,
                            boxShadow: '0 0 10px rgba(255,255,255,0.5)'
                        }}>
                            <div style={{
                                width: '100%', height: '100%',
                                background: 'repeating-linear-gradient(45deg, #2d3748, #2d3748 10px, #1a202c 10px, #1a202c 20px)',
                                opacity: 0.5
                            }} />
                            <style>{`
                        @keyframes drawCardPlayer {
                            0% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 1; }
                            100% { transform: translate(-50vw, -100px) scale(0.5) rotate(-10deg); opacity: 0; }
                        }
                        @keyframes drawCardOpponent {
                            0% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 1; }
                            100% { transform: translate(50vw, 200px) scale(0.5) rotate(10deg); opacity: 0; }
                        }
                    `}</style>
                        </div>
                    )
                }

                {/* CLOSE RIGHT MAIN AREA HERE - Overlays follow outside to avoid Shake offset */}
            </div>

            {/* Evolve Drag Light Orb - Enhanced Glow */}
            {
                dragState?.sourceType === 'EVOLVE' && (
                    <>
                        {/* Outer glow layer */}
                        <div style={{
                            position: 'fixed', left: dragState.currentX, top: dragState.currentY,
                            transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 999,
                            width: 80, height: 80, borderRadius: '50%',
                            background: (dragState as any).useSep
                                ? 'radial-gradient(circle, rgba(159, 122, 234, 0.4) 0%, rgba(159, 122, 234, 0.1) 50%, transparent 70%)'
                                : 'radial-gradient(circle, rgba(236, 201, 75, 0.4) 0%, rgba(236, 201, 75, 0.1) 50%, transparent 70%)',
                            filter: 'blur(10px)',
                            animation: 'evolveOrbPulse 1s ease-in-out infinite'
                        }} />
                        {/* Main orb */}
                        <div style={{
                            position: 'fixed', left: dragState.currentX, top: dragState.currentY,
                            transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 1000,
                            width: 45, height: 45, borderRadius: '50%',
                            background: (dragState as any).useSep
                                ? 'radial-gradient(circle at 30% 30%, #fff 0%, #d6bcfa 20%, #b794f4 50%, #9f7aea 100%)'
                                : 'radial-gradient(circle at 30% 30%, #fff 0%, #faf089 20%, #f6e05e 50%, #ecc94b 100%)',
                            boxShadow: (dragState as any).useSep
                                ? '0 0 15px #b794f4, 0 0 30px rgba(159, 122, 234, 0.8), 0 0 50px rgba(159, 122, 234, 0.5), 0 0 80px rgba(159, 122, 234, 0.3), inset 0 0 15px rgba(255,255,255,0.5)'
                                : '0 0 15px #f6e05e, 0 0 30px rgba(236, 201, 75, 0.8), 0 0 50px rgba(236, 201, 75, 0.5), 0 0 80px rgba(236, 201, 75, 0.3), inset 0 0 15px rgba(255,255,255,0.5)',
                            border: '2px solid rgba(255,255,255,0.8)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            {/* Inner bright core */}
                            <div style={{
                                width: 18, height: 18, borderRadius: '50%',
                                background: 'radial-gradient(circle at 40% 40%, #fff 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.3) 100%)',
                                boxShadow: '0 0 15px white, 0 0 25px rgba(255,255,255,0.8)'
                            }} />
                        </div>
                        <style>{`
                            @keyframes evolveOrbPulse {
                                0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
                                50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
                            }
                        `}</style>
                    </>
                )
            }

            {/* FLOATING DAMAGE TEXT */}
            {
                damageNumbers.map(d => (
                    <DamageText key={d.id} value={d.value} x={d.x} y={d.y} color={d.color} onComplete={() => setDamageNumbers(prev => prev.filter(p => p.id !== d.id))} />
                ))
            }

            {/* SVG Overlay for Dragging Arrow */}
            <svg style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 999 }}>
                {dragState && (dragState.sourceType === 'BOARD' || dragState.sourceType === 'EVOLVE') && (
                    <>
                        <defs>
                            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill={
                                    (dragState.sourceType === 'EVOLVE' && (dragState as any).useSep) ? '#b794f4' :
                                        (dragState.sourceType === 'EVOLVE' ? '#f6e05e' :
                                            (hoveredTarget?.type === 'LEADER' && dragState.sourceType === 'BOARD' ? '#48bb78' : '#e53e3e'))
                                } />
                            </marker>
                            <filter id="yellowGlow" x="-100%" y="-100%" width="300%" height="300%">
                                <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
                                <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
                                <feFlood floodColor="#ffd700" floodOpacity="1" result="color1" />
                                <feFlood floodColor="#ecc94b" floodOpacity="0.6" result="color2" />
                                <feComposite in="color1" in2="blur1" operator="in" result="glow1" />
                                <feComposite in="color2" in2="blur2" operator="in" result="glow2" />
                                <feMerge>
                                    <feMergeNode in="glow2" />
                                    <feMergeNode in="glow1" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                            <filter id="purpleGlow" x="-100%" y="-100%" width="300%" height="300%">
                                <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
                                <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
                                <feFlood floodColor="#b794f4" floodOpacity="1" result="color1" />
                                <feFlood floodColor="#9f7aea" floodOpacity="0.6" result="color2" />
                                <feComposite in="color1" in2="blur1" operator="in" result="glow1" />
                                <feComposite in="color2" in2="blur2" operator="in" result="glow2" />
                                <feMerge>
                                    <feMergeNode in="glow2" />
                                    <feMergeNode in="glow1" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>
                        <path
                            d={getArrowPath()}
                            fill="none"
                            stroke={
                                (dragState.sourceType === 'EVOLVE' && (dragState as any).useSep) ? '#9f7aea' :
                                    (dragState.sourceType === 'EVOLVE' ? '#ecc94b' :
                                        (hoveredTarget?.type === 'LEADER' && dragState.sourceType === 'BOARD' ? '#48bb78' : '#e53e3e'))
                            }
                            strokeWidth="6"
                            strokeDasharray="10,5"
                            markerEnd="url(#arrowhead)"
                            filter={
                                (dragState.sourceType === 'EVOLVE' && (dragState as any).useSep) ? 'url(#purpleGlow)' :
                                    (dragState.sourceType === 'EVOLVE' ? 'url(#yellowGlow)' : 'none')
                            }
                        />
                    </>
                )}
            </svg>

            {/* Play Card Animation Overlay */}
            {
                playingCardAnim && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        pointerEvents: 'auto',
                        background: 'rgba(0,0,0,0.5)'
                    }}>
                        <div
                            onAnimationEnd={playingCardAnim.onComplete}
                            style={{
                                position: 'absolute',
                                left: playingCardAnim.targetX,
                                top: playingCardAnim.targetY,
                                transform: 'translate(-50%, -50%)',
                                animation: playingCardAnim.card.type === 'SPELL'
                                    ? 'playSpellSequence 1s forwards'
                                    : 'playCardSequence 0.8s forwards'
                            }}
                        >
                            <style>{`
                                @keyframes playCardSequence {
                                    ${playingCardAnim.finalX !== undefined ? `
                                    0% { transform: translate(${playingCardAnim.startX - playingCardAnim.targetX}px, ${playingCardAnim.startY - playingCardAnim.targetY}px) translate(-50%, -50%) scale(0.2); opacity: 1; }
                                    25% { transform: translate(-50%, -50%) scale(1.8); opacity: 1; }
                                    85% { transform: translate(-50%, -50%) scale(2.0); opacity: 1; }
                                    100% { 
                                        transform: translate(calc(-50% + ${playingCardAnim.finalX - playingCardAnim.targetX}px), calc(-50% + ${playingCardAnim.finalY! - playingCardAnim.targetY}px)) scale(0.65); 
                                        opacity: 1;
                                    }
                                    ` : `
                                    0% { transform: translate(${playingCardAnim.startX - playingCardAnim.targetX}px, ${playingCardAnim.startY - playingCardAnim.targetY}px) translate(-50%, -50%) scale(0.2); opacity: 1; }
                                    30% { transform: translate(-50%, -50%) scale(2.0); opacity: 1; }
                                    85% { transform: translate(-50%, -50%) scale(2.0); opacity: 1; }
                                    100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
                                    `}
                                }
                                /* Add stronger ease-in for snappy takeoff and cushioned landing */
                                div[style*="playCardSequence"] {
                                    animation-timing-function: cubic-bezier(0.5, 0, 0.75, 0); /* Faster exit from center */
                                }
                                @keyframes playSpellSequence {
                                    0% { transform: translate(${playingCardAnim.startX - playingCardAnim.targetX}px, ${playingCardAnim.startY - playingCardAnim.targetY}px) translate(-50%, -50%) scale(0.2); opacity: 1; }
                                    40% { transform: translate(-50%, -50%) scale(2.0); opacity: 1; filter: brightness(1); }
                                    80% { transform: translate(-50%, -50%) scale(2.2); opacity: 1; filter: brightness(1.2); }
                                    100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; filter: brightness(3); }
                                }
                            `}</style>
                            <Card card={playingCardAnim.card} style={{ boxShadow: '0 0 50px rgba(255,215,0,0.8)' }} />
                            {playingCardAnim.card.type === 'SPELL' && (
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <SparkleBurst x={0} y={0} />
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* --- Card Generation Animation Overlay --- */}
            {
                animatingCard && (
                    <div style={{
                        position: 'fixed',
                        left: animatingCard.status === 'FLY' && animatingCard.targetX !== undefined ? animatingCard.targetX : '50%',
                        top: animatingCard.status === 'FLY' && animatingCard.targetY !== undefined ? animatingCard.targetY : '50%',
                        transform: animatingCard.status === 'APPEAR'
                            ? 'translate(-50%, -50%) scale(1.2)'
                            : 'translate(-50%, -50%) scale(0.2)', // Shrink to hand
                        zIndex: 7000,
                        pointerEvents: 'none',
                        transition: animatingCard.status === 'FLY'
                            ? 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                            : 'none',
                        opacity: animatingCard.status === 'FLY' ? 0.3 : 1, // Fade out as it reaches hand
                        animation: animatingCard.status === 'APPEAR' ? 'cardAppear 1s ease-out' : undefined
                    }}>
                        <Card card={animatingCard.card as any} />
                        <style>{`
                        @keyframes cardAppear {
                            0% { transform: translate(-50%, -50%) scale(0) rotate(-10deg); opacity: 0; }
                            50% { transform: translate(-50%, -50%) scale(1.3) rotate(5deg); opacity: 1; }
                            100% { transform: translate(-50%, -50%) scale(1.2) rotate(0deg); opacity: 1; }
                        }
                    `}</style>
                    </div>
                )
            }

            {/* --- Active Effects (Now using cached coordinates) --- */}
            {
                activeEffects.map(effect => (
                    <AttackEffect
                        key={effect.key}
                        type={effect.type}
                        x={effect.x}
                        y={effect.y}
                        onComplete={() => setActiveEffects(prev => prev.filter(e => e.key !== effect.key))}
                        audioSettings={audioSettings}
                    />
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
                    />
                )
            }


            {/* --- Game Over Overlay --- */}
            {
                gameState.winnerId && (
                    <GameOverScreen
                        winnerId={gameState.winnerId}
                        playerId={currentPlayerId}
                        onRematch={() => {
                            window.location.reload();
                        }}
                        onLeave={onLeave}
                    />
                )
            }
        </div >
    );
};
