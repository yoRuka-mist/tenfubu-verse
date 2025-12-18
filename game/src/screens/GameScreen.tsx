import React, { useReducer, useEffect } from 'react';
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
const AttackEffect = ({ type, x, y, onComplete }: { type: string, x: number, y: number, onComplete: () => void }) => {
    // Sprite Configuration for Thunder (Updated: 8x8)
    const spriteConfig = {
        cols: 8,
        rows: 8,
        fps: 60, // Faster FPS for 64 frames to keep it snappy
        scale: 1.5
    };

    React.useEffect(() => {
        // Duration based on animation type
        const duration = type === 'LIGHTNING'
            ? (spriteConfig.cols * spriteConfig.rows) / spriteConfig.fps * 1000
            : 800;

        const timer = setTimeout(onComplete, duration);
        return () => clearTimeout(timer);
    }, [onComplete, type]);

    const style: React.CSSProperties = {
        position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)',
        width: 150, height: 150, pointerEvents: 'none', zIndex: 5000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    };

    if (type === 'LIGHTNING' || type === 'IMPACT' || type === 'SHOT' || type === 'SUMI') {
        const isImpact = type === 'IMPACT';
        const isShot = type === 'SHOT';
        const isSumi = type === 'SUMI';

        // Map Type to Image
        let bgImage = '/effects/thunder.png';
        if (isImpact) bgImage = '/effects/impact.png';
        if (isShot) bgImage = '/effects/shot.png';
        if (isSumi) bgImage = '/effects/sumi.png';

        const steps = spriteConfig.cols * spriteConfig.rows;

        return (
            <div style={{
                ...style,
                width: 256, height: 256, // Fixed size for sprite frame
                // transform: style?.transform // Just Use the passed transform (which centers it)
                // Actually, if x/y are top-left, we need translate.
                // But playEffect seems to calculate center.
                // Let's enforce centering here to be sure.
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
            position: 'absolute', left: x, top: y,
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

export const GameScreen: React.FC<GameScreenProps> = ({ playerClass, opponentType, gameMode, targetRoomId, onLeave }) => {
    const { adapter, connected } = useGameNetwork(gameMode, targetRoomId);

    const [gameState, dispatch] = useReducer(gameReducer, null, () =>
        initializeGame('You', playerClass, opponentType === 'ONLINE' ? 'Opponent' : 'CPU', 'AJA')
    );

    const currentPlayerId = 'p1';
    const opponentPlayerId = 'p2';

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
    } | null>(null);

    const [hoveredTarget, setHoveredTarget] = React.useState<{
        type: 'LEADER' | 'FOLLOWER';
        index?: number;
        playerId: string;
    } | null>(null);

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

        let x = window.innerWidth / 2;
        let y = window.innerHeight / 2;

        const isOpponentTarget = targetPlayerId === opponentPlayerId;
        const isLeader = targetIndex === undefined || targetIndex === -1;

        if (isLeader) {
            const ref = isOpponentTarget ? opponentLeaderRef : playerLeaderRef;
            if (ref.current) {
                const rect = ref.current.getBoundingClientRect();
                x = rect.left + rect.width / 2;
                y = rect.top + rect.height / 2;
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
            }
        }

        setActiveEffects(prev => [...prev, {
            type: effectType,
            x,
            y,
            key: Date.now() + Math.random()
        }]);
    };
    const [animatingCard, setAnimatingCard] = React.useState<{ card: CardModel, status: 'APPEAR' | 'FLY' } | null>(null);

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
    const [isGameStartAnim, setIsGameStartAnim] = React.useState(true);
    const [isHandExpanded, setIsHandExpanded] = React.useState(false);

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

    // --- Effect Queue Processing (with Animation Support) ---
    React.useEffect(() => {
        // Skip if we're already animating a card
        if (animatingCard) return;

        if (gameState.pendingEffects && gameState.pendingEffects.length > 0) {
            const current = gameState.pendingEffects[0];

            // Handle GENERATE_CARD with animation
            if (current.effect.type === 'GENERATE_CARD' && current.effect.targetCardId) {
                const cardDef = getCardDefinition(current.effect.targetCardId);
                if (cardDef) {
                    // Start Animation: APPEAR at center
                    setAnimatingCard({ card: cardDef, status: 'APPEAR' });

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

                let targetIdx = -1;
                const oppBoard = gameState.players[targetPid].board;

                if (current.targetId) {
                    targetIdx = oppBoard.findIndex(c => c?.instanceId === current.targetId);
                }

                if (current.effect.type === 'AOE_DAMAGE') {
                    // For AOE, play effect on ALL valid targets on the board
                    oppBoard.forEach((c, i) => {
                        if (c) {
                            // Stagger slightly or play all at once?
                            // Play all at once for impact.
                            playEffect(effectType, targetPid, i);
                        }
                    });
                } else {
                    // Single Target (or derived from targetId)
                    playEffect(effectType, targetPid, targetIdx);
                }
            }

            // Default: Resolve after delay
            const timer = setTimeout(() => {
                dispatchAndSend({ type: 'RESOLVE_EFFECT', playerId: currentPlayerId });
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [gameState.pendingEffects, currentPlayerId, opponentPlayerId, animatingCard]);

    const prevPlayersRef = React.useRef<Record<string, Player>>(gameState.players); // Initial State

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
                        // Heal
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
                        const finalHP = (inGraveyard as any).currentHealth <= 0 ? (inGraveyard as any).currentHealth : 0;
                        damage = prevCard.currentHealth - finalHP;
                    } else {
                        // Just missing? Assume destroyed?
                        damage = prevCard.currentHealth;
                    }

                    if (damage > 0) {
                        const isMe = pid === currentPlayerId;
                        const refs = isMe ? playerBoardRefs.current : opponentBoardRefs.current;
                        const el = refs[idx]; // Use OLD index
                        if (el) {
                            const rect = el.getBoundingClientRect();
                            newDamages.push({ id: Date.now() + Math.random(), value: damage, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, color: '#e53e3e' });
                        }
                    }
                }
            });
        });

        if (newDamages.length > 0) {
            setDamageNumbers(prev => [...prev, ...newDamages]);
        }

        prevPlayersRef.current = JSON.parse(JSON.stringify(currentPlayers)); // Deep copy state history? 
        // Simple assignment might reference same object if reducer mutates. 
        // Engine seems to spread {...state} so shallow copy per level. 
        // JSON parse is safest for diffing deeply nested 'board' arrays if references are reused.
    }, [gameState]);


    // --- Visual Effect Helpers ---


    // Helper: Screen Shake
    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 300);
    };

    // Initial Game Start Animation (No changes)
    useEffect(() => {
        if (gameState.phase === 'INIT') {
            const timer = setTimeout(() => {
                setIsGameStartAnim(false);
                // Transition to Turn 1 (Normally handled by reducer state, but here just visual)
                // In a real engine, we'd dispatch 'START_MATCH'
            }, 3000);
            return () => clearTimeout(timer);
        } else {
            setIsGameStartAnim(false);
        }
    }, []);

    // BGM Auto-Play (User Interaction Required usually)
    // BGM Init
    React.useEffect(() => {
        const bgm = new Audio('/bgm/Green Misty Mountains.mp3');
        bgm.loop = true;
        bgm.volume = audioSettings.enabled ? audioSettings.bgm : 0;
        bgmRef.current = bgm;

        if (audioSettings.enabled) {
            const playPromise = bgm.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Auto-play prevented (BGM). Click to interact first.", error);
                });
            }
        }
        return () => {
            bgm.pause();
            bgm.currentTime = 0;
        };
    }, []);
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
    // const aiProcessing = React.useRef(false); // Already defined? check.
    // Wait, I need to remove the duplicates. The file has 2 blocks. I will keep one.

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
        isSuper?: boolean;
    } | null>(null);

    // Card Play Animation State
    const [playingCardAnim, setPlayingCardAnim] = React.useState<{
        card: any;
        startX: number;
        startY: number;
        targetX: number;
        targetY: number;
        onComplete: () => void;
    } | null>(null);

    // Handle Play Card with Animation
    const handlePlayCard = (index: number, startX: number, startY: number) => {
        // Use Ref to ensure we have the latest player state
        const currentPlayer = playerRef.current;
        const card = currentPlayer.hand[index];

        console.log(`[handlePlayCard] index: ${index}, card: ${card?.name}, needsTarget check...`);

        // Check for Target Selection Requirement (Fanfare or Triggers)
        const needsTarget =
            (card.type === 'SPELL' && card.triggers?.some(t => t.effects.some(e => e.targetType === 'SELECT_FOLLOWER'))) ||
            (card.type === 'FOLLOWER' && (
                card.triggerAbilities?.FANFARE?.targetType === 'SELECT_FOLLOWER' ||
                card.triggers?.some(t => t.trigger === 'FANFARE' && t.effects.some(e => e.targetType === 'SELECT_FOLLOWER'))
            ));

        console.log(`[handlePlayCard] needsTarget: ${needsTarget}`);

        if (needsTarget) {
            setTargetingState({ type: 'PLAY', sourceIndex: index });
            setDragState(null); // Stop dragging
            return;
        }

        // Determine target position (Center of screen approx)
        const targetX = window.innerWidth / 2;
        const targetY = window.innerHeight / 2;

        const onComplete = () => {
            triggerShake(); // Trigger Shake on Land
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

    const player = gameState.players[currentPlayerId];
    const opponent = gameState.players[opponentPlayerId];

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
            setTimeout(() => setDrawAnimation(null), 800);
        }
        if (currO > prev.opponent) {
            // Opponent Drew
            setDrawAnimation({ isPlayer: false, count: currO - prev.opponent, status: 'FLYING' });
            setTimeout(() => setDrawAnimation(null), 800);
        }

        prevHandSizeRef.current = { player: currP, opponent: currO };
    }, [player.hand.length, opponent.hand.length]);

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

                // 1. Thinking time
                await new Promise(resolve => setTimeout(resolve, 1500));
                if (!aiProcessing.current) return;

                // 2. Play MAX Cost Card
                // Use FRESH state via Ref if possible, but for initial play, closure is fine (start of turn).
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
                        // Simple Target Logic: Pick first enemy follower if exists, else undefined
                        let targetId = undefined;
                        const enemyBoard = state.players[currentPlayerId].board;
                        if (enemyBoard.length > 0 && enemyBoard[0]) {
                            targetId = enemyBoard[0].instanceId;
                        }

                        dispatch({
                            type: 'PLAY_CARD',
                            playerId: opponentPlayerId,
                            payload: { cardIndex: bestCard.originalIndex, targetId }
                        });

                        // Animation
                        setPlayingCardAnim({
                            card: bestCard,
                            startX: window.innerWidth / 2, startY: 100,
                            targetX: window.innerWidth / 2, targetY: window.innerHeight / 2,
                            onComplete: () => { triggerShake(); setPlayingCardAnim(null); }
                        });

                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }

                // 2.5 Evolve Phase (New!)
                {
                    const state = gameStateRef.current;
                    const aiPlayer = state.players[opponentPlayerId];
                    const isFirstPlayer = (opponentPlayerId as string) === 'p1';
                    const turnCount = state.turnCount;

                    // Can Evolve?
                    const canEvolveCheck = canEvolve(aiPlayer, turnCount, isFirstPlayer);
                    if (canEvolveCheck && aiPlayer.board.length > 0) {
                        // Greedily Evolve the highest attack unit that hasn't evolved?
                        // Or just random for now?
                        // Let's evolve the LAST played unit (likely index board.length-1) or Strongest.
                        // Filter for can Evolve? (Usually any follower).
                        const candidates = aiPlayer.board
                            .map((c, i) => ({ c, i }))
                            .filter(({ c }) => c && c.type === 'FOLLOWER'); // Simplified check

                        if (candidates.length > 0) {
                            // Pick one (random or last)
                            const target = candidates[candidates.length - 1]; // Last one usually latest played

                            // 50% chance to evolve if we have points, or 100% if full?
                            // Let's effectively use it.
                            dispatchAndSend({
                                type: 'EVOLVE',
                                playerId: opponentPlayerId,
                                payload: {
                                    followerIndex: target.i,
                                    useSep: aiPlayer.sep > 0 // Use SEP if available
                                }
                            });
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }
                }

                // 3. Attack (Greedy Trade) - USING FRESH STATE
                {
                    const state = gameStateRef.current;
                    const aiBoard = state.players[opponentPlayerId].board;
                    const playerBoard = state.players[currentPlayerId].board;
                    const activeWards = playerBoard.filter(c => c && c.passiveAbilities?.includes('WARD'));

                    for (let i = 0; i < aiBoard.length; i++) {
                        const attacker = aiBoard[i];
                        if (!attacker || !attacker.canAttack) continue;

                        let targetIndex = -1;
                        let targetIsLeader = true;

                        // WARD Logic
                        if (activeWards.length > 0) {
                            const wardIdx = playerBoard.findIndex(c => c && c.passiveAbilities?.includes('WARD'));
                            if (wardIdx !== -1) {
                                targetIndex = wardIdx;
                                targetIsLeader = false;
                            }
                        } else {
                            // Smart Trade Logic
                            let bestTarget = -1;
                            for (let t = 0; t < playerBoard.length; t++) {
                                const target = playerBoard[t];
                                if (!target) continue;
                                // Free Kill: Kill target, Surive
                                if (attacker.currentAttack >= target.currentHealth && target.currentAttack < attacker.currentHealth) {
                                    bestTarget = t;
                                    break;
                                }
                                // Value Trade: Kill target, target cost > attacker cost mechanism? (Ignored for MVP)
                            }

                            if (bestTarget !== -1) {
                                targetIndex = bestTarget;
                                targetIsLeader = false;
                            }
                        }

                        dispatch({
                            type: 'ATTACK',
                            playerId: opponentPlayerId,
                            payload: { attackerIndex: i, targetIndex, targetIsLeader }
                        });

                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }

                // 4. End Turn
                dispatch({ type: 'END_TURN', playerId: opponentPlayerId });
                aiProcessing.current = false;
            };

            runAiTurn();
        }
    }, [gameState.activePlayerId, gameState.turnCount, gameMode, gameState.phase, gameState.players]); // Add players to dependency if we want reactive AI? No, keep it stable per turn start.


    // --- Interaction Handlers ---

    // Hand Click / Drag Start
    const handleHandMouseDown = (e: React.MouseEvent, index: number) => {
        if (gameState.activePlayerId !== currentPlayerId) return;
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
        // Strict Selection Only if click, but Drag starts arrow immediately
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
    const handleEvolveMouseDown = (e: React.MouseEvent, isSuper: boolean = false) => {
        if (gameState.activePlayerId !== currentPlayerId) return;
        e.stopPropagation();

        // Client-side visual check
        const isFirstPlayer = currentPlayerId === 'p1';
        if (isSuper) {
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
            isSuper
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
                            // Could trigger a visual "Blocked" feedback here
                        } else {
                            const attackerCard = playerRef.current.board[currentDrag.sourceIndex] as any;
                            // Correctly pass target info to playEffect
                            playEffect(
                                attackerCard?.attackEffectType || 'SLASH', // Default
                                opponentPlayerId,
                                currentHover.type === 'LEADER' ? -1 : currentHover.index!
                            );

                            dispatchAndSend({
                                type: 'ATTACK',
                                playerId: currentPlayerId,
                                payload: {
                                    attackerIndex: currentDrag.sourceIndex,
                                    targetIndex: currentHover.type === 'LEADER' ? -1 : currentHover.index!,
                                    targetIsLeader: currentHover.type === 'LEADER'
                                }
                            });
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

                    if (needsTarget) {
                        setTargetingState({ type: 'EVOLVE', sourceIndex: followerIndex });
                        ignoreClickRef.current = true;
                        setTimeout(() => { ignoreClickRef.current = false; }, 100);
                    } else {
                        dispatchAndSend({
                            type: 'EVOLVE',
                            playerId: currentPlayerId,
                            payload: {
                                followerIndex: followerIndex,
                                useSep: (currentDrag as any).isSuper
                            }
                        });
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
        setIsHandExpanded(false);
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
                    // visual feedback?
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
            const card = player.hand[index];

            // --- C_Y Visuals Trigger ---
            if (card.id === 'c_y') {
                // 1. Lightning on Target (Now SUMI)
                playEffect('SUMI', 'p2', targetIndex);

                // 2. AOE on all OTHER enemies (Logic: Y targets 1, AOE hits others? No, AOE hits ALL enemies)
                // engine.ts: "AOE_DAMAGE value: 2 targetType: 'ALL_FOLLOWERS'"
                // Wait, engine logic (AOE_DAMAGE) usually hits All *Other*? Or All?
                // Text: "逶ｸ謇九・繝輔か繝ｭ繝ｯ繝ｼ1菴薙↓4繝繝｡繝ｼ繧ｸ縲ら嶌謇九・繝輔か繝ｭ繝ｯ繝ｼ縺吶∋縺ｦ縺ｫ2繝繝｡繝ｼ繧ｸ縲・
                // So it hits the target 4, then hits *everyone* (including target) 2? Or hits *others* 2?
                // Engine definition: { type: 'AOE_DAMAGE', value: 2, targetType: 'ALL_FOLLOWERS' }
                // Implementation in processSingleEffect (likely viewed previously) usually hits ALL valid targets.
                // So visually, we should hit ALL enemy followers.

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

            // Animation for spell/card
            const startX = window.innerWidth / 2;
            const startY = window.innerHeight - 100;
            // We can reuse play animation logic here or simplfy
            setPlayingCardAnim({
                card: player.hand[index],
                startX, startY,
                targetX: window.innerWidth / 2, // Or target location?
                targetY: window.innerHeight / 2,
                onComplete: () => {
                    triggerShake();
                    dispatchAndSend({
                        type: 'PLAY_CARD',
                        playerId: currentPlayerId,
                        payload: { cardIndex: index, targetId }
                    });
                    setPlayingCardAnim(null);
                }
            });
        } else if (targetingState.type === 'EVOLVE') {
            dispatchAndSend({
                type: 'EVOLVE',
                playerId: currentPlayerId,
                payload: {
                    followerIndex: targetingState.sourceIndex,
                    targetId
                }
            });
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
        // Start animation from bottom center
        const startX = window.innerWidth / 2;
        const startY = window.innerHeight - 100;

        handlePlayCard(cardIndex, startX, startY);
        setIsHandExpanded(false);
        setSelectedCard(null);
    };

    if (gameMode !== 'CPU' && !connected && gameMode === 'JOIN') return <div>Connecting... <button onClick={onLeave}>Cancel</button></div>;

    const remainingEvolves = 2 - player.evolutionsUsed;
    const canEvolveUI = player.canEvolveThisTurn && remainingEvolves > 0 && gameState.activePlayerId === currentPlayerId && gameState.turnCount >= (currentPlayerId === 'p1' ? 5 : 4);

    return (
        <div
            style={{
                height: '100vh', display: 'flex',
                background: 'radial-gradient(circle at center, #1a202c 0%, #000 100%)',
                overflow: 'hidden', fontFamily: "'Helvetica Neue', sans-serif", userSelect: 'none', color: '#fff'
            }}
            // REMOVED local onMouseMove/Up listeners to avoid conflict/lag
            onClick={handleBackgroundClick} // Close hand on bg click
            className={shake ? 'shake-screen' : ''}
        >
            <style>{`
                .shake-screen { animation: shake 0.3s cubic-bezier(.36,.07,.19,.97) both; }
                @keyframes shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }
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
            {/* Play Card Animation Overlay */}
            {playingCardAnim && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'auto'
                }}>
                    <div
                        onAnimationEnd={playingCardAnim.onComplete}
                        style={{
                            // Spells fade out with sparkles, Followers slam
                            animation: playingCardAnim.card.type === 'SPELL'
                                ? 'playSpellSequence 1s forwards'
                                : 'playCardSequence 0.8s forwards'
                        }}
                    >
                        <style>{`
                            @keyframes playCardSequence {
                                0% { transform: translate(${playingCardAnim.startX - playingCardAnim.targetX}px, ${playingCardAnim.startY - playingCardAnim.targetY}px) scale(0.2); opacity: 1; }
                                50% { transform: translate(0, 0) scale(0.8); opacity: 1; }
                                70% { transform: translate(0, 0) scale(0.9); opacity: 1; }
                                100% { transform: translate(0, 0) scale(1.0); opacity: 0; }
                            }
                            @keyframes playSpellSequence {
                                0% { transform: translate(${playingCardAnim.startX - playingCardAnim.targetX}px, ${playingCardAnim.startY - playingCardAnim.targetY}px) scale(0.2); opacity: 1; }
                                40% { transform: translate(0, 0) scale(1.0); opacity: 1; filter: brightness(1); }
                                80% { transform: translate(0, 0) scale(1.1); opacity: 1; filter: brightness(1.2); }
                                100% { transform: translate(0, 0) scale(1.5); opacity: 0; filter: brightness(3); }
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
                                    BGM 譛牙柑
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
                                        <span>SE (蜉ｹ譫憺浹)</span>
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
                                        <span>繝懊う繧ｹ</span>
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

            {/* --- SVG Overlay for Arrows --- */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 999 }}>
                {(dragState?.sourceType === 'BOARD' || dragState?.sourceType === 'EVOLVE') && (
                    <g>
                        <path d={getArrowPath()} stroke={dragState.sourceType === 'EVOLVE' ? '#ecc94b' : "#e53e3e"} strokeWidth="6" fill="none" strokeDasharray="10,5" opacity="0.8" />
                        <circle cx={dragState.currentX} cy={dragState.currentY} r="8" fill={dragState.sourceType === 'EVOLVE' ? '#ecc94b' : "#e53e3e"} />
                    </g>
                )}
            </svg>

            {/* --- Left Sidebar: Card Info & Menu (20%) --- */}
            <div style={{ width: '20%', minWidth: 250, borderRight: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', padding: 20, display: 'flex', flexDirection: 'column', zIndex: 20 }} onClick={e => e.stopPropagation()}>
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
            <div ref={boardRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', background: 'rgba(0,0,0,0.1)' }}>

                {/* --- Game Start Overlay (Moved Here) --- */}
                {isGameStartAnim && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 3000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        animation: 'fadeOut 0.5s ease-in 2.5s forwards',
                        pointerEvents: 'none'
                    }}>
                        <div style={{
                            fontSize: '5rem', fontWeight: 900, color: '#f6e05e',
                            textShadow: '0 0 20px rgba(246, 224, 94, 0.8), 0 0 10px black',
                            background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.8), transparent)',
                            padding: '20px 50px', width: '100%', textAlign: 'center'
                        }}>
                            GAME START
                            <div style={{ fontSize: "1.5rem", color: "white", marginTop: 10, letterSpacing: 5 }}>対戦開始</div>
                        </div>
                    </div>
                )}

                {/* Opponent Area (Top) */}
                <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: '100%' }}>

                    {/* Opponent Hand (Left of Leader) */}
                    <div style={{
                        position: 'absolute',
                        left: '10%',
                        top: 20,
                        display: 'flex',
                        gap: -40,
                        transform: 'scale(0.7)',
                        transformOrigin: 'top left'
                    }}>
                        {opponent.hand.map((_, i) => (
                            <div key={i} style={{
                                width: 100, height: 140,
                                background: 'linear-gradient(135deg, #4a192c 0%, #2d1a20 100%)',
                                border: '1px solid #742a3a',
                                borderRadius: 8,
                                marginLeft: i > 0 ? -60 : 0,
                                boxShadow: '0 4px 6px rgba(0,0,0,0.5)'
                            }}></div>
                        ))}
                    </div>

                    {/* Opponent Leader Unit */}
                    <div
                        ref={opponentLeaderRef}
                        onMouseEnter={() => setHoveredTarget({ type: 'LEADER', playerId: opponentPlayerId })}
                        onMouseLeave={() => setHoveredTarget(null)}
                        style={{
                            width: 240, height: 240,
                            borderRadius: '50%',
                            background: `url(${opponent.class === 'AJA' ? azyaLeaderImg : senkaLeaderImg}) center/cover`,
                            border: (hoveredTarget?.type === 'LEADER' && hoveredTarget.playerId === opponentPlayerId) || (targetingState && opponentType !== 'CPU') ? '4px solid #f56565' : '4px solid #4a5568',
                            boxShadow: '0 0 20px rgba(0,0,0,0.5)',
                            position: 'relative',
                            transition: 'all 0.3s',
                            cursor: targetingState ? 'crosshair' : 'default',
                            transform: (hoveredTarget?.type === 'LEADER' && hoveredTarget.playerId === opponentPlayerId) ? 'scale(1.1)' : 'scale(1)',
                            zIndex: 10
                        }}
                        onClick={() => targetingState && handleTargetClick('LEADER', -1, opponentPlayerId)}
                    >
                        {/* Opponent Hand Count (Right Side) */}
                        <div style={{
                            position: 'absolute', top: 50, right: -120, // Right of leader
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: 8,
                            color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 'bold'
                        }}>
                            {/* Deck-like icon */}
                            <div style={{ position: 'relative', width: 20, height: 24, marginRight: 2 }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, width: 16, height: 22, background: '#cbd5e0', border: '1px solid #2d3748', borderRadius: 2, transform: 'rotate(-10deg)' }} />
                                <div style={{ position: 'absolute', top: 2, left: 4, width: 16, height: 22, background: '#edf2f7', border: '1px solid #2d3748', borderRadius: 2, transform: 'rotate(10deg)' }} />
                            </div>
                            手札: {opponent.hand.length}
                        </div>

                        {/* Damage Number Anchor */}
                        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)' }} />

                        {/* Status Effects Container */}
                        <div style={{
                            position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)',
                            display: 'flex', gap: 4, zIndex: 10
                        }}>
                            {/* SEP moved here or keep? Keep SEP to right-bottom */}
                        </div>

                        {/* Opponent EP (Bottom-Left) - Moved Inward (Symmetric to Player -100px from center) */}
                        <div style={{
                            position: 'absolute', bottom: 10, left: 20, // 20 + -120 = -100 offset
                            display: 'flex', gap: 4, zIndex: 10
                        }}>
                            {/* Opponent Evolution Points (Yellow) - Fixed 2 max? Using logic */}
                            {Array(2).fill(0).map((_, i) => (
                                <div key={i} style={{
                                    width: 16, height: 16, borderRadius: '50%',
                                    background: i < (2 - opponent.evolutionsUsed) ? '#ecc94b' : '#2d3748',
                                    boxShadow: i < (2 - opponent.evolutionsUsed) ? '0 0 10px #ecc94b' : 'none',
                                    border: '2px solid rgba(0,0,0,0.5)'
                                }} />
                            ))}
                        </div>

                        <div style={{
                            position: 'absolute', bottom: 10, right: 20, // Symmetric
                            display: 'flex', gap: 4, zIndex: 10
                        }}>
                            {/* Super Evolution Points (Purple) - Mocked 2 active */}
                            {Array(2).fill(0).map((_, i) => (
                                <div key={i} style={{
                                    width: 16, height: 16, borderRadius: '50%',
                                    background: '#9f7aea', // Purple
                                    boxShadow: '0 0 10px #9f7aea',
                                    border: '2px solid rgba(0,0,0,0.5)'
                                }} />
                            ))}
                        </div>

                        {/* Opponent HP (Symmetric to Player: Left -30 equivalent) */}
                        <div style={{
                            position: 'absolute', bottom: 0, left: -50, // -50 + -120 = -170 offset (Player is -30 + -140 = -170)
                            width: 50, height: 50,
                            background: 'radial-gradient(circle at 30% 30%, #feb2b2, #c53030)',
                            borderRadius: '50%',
                            border: '3px solid #fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.5rem', fontWeight: 900, color: 'white',
                            textShadow: '0 2px 2px rgba(0,0,0,0.5)',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.4)',
                            zIndex: 20
                        }}>
                            {opponent.hp}
                        </div>

                        {/* Name Label */}
                        <div style={{
                            position: 'absolute', bottom: -30,
                            background: 'rgba(0,0,0,0.6)', padding: '2px 10px', borderRadius: 10,
                            color: '#cbd5e0', fontSize: '0.8rem'
                        }}>
                            {opponent.name === 'Opponent' ? '相手' : opponent.name}
                        </div>
                    </div>
                </div>

                {/* Middle: Battle Field + Controls */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>

                    {/* Field (Center) - Pinned Vertical Positions */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 20, padding: '40px 20px' }}>
                        {/* Opponent Slots */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 15 }}>
                            {opponent.board.map((c, i) => (
                                <div key={i}
                                    ref={el => opponentBoardRefs.current[i] = el}
                                    onMouseEnter={() => setHoveredTarget({ type: 'FOLLOWER', index: i, playerId: opponentPlayerId })}
                                    onMouseLeave={() => setHoveredTarget(null)}
                                    onClick={() => {
                                        if (targetingState) {
                                            if (!c) return;
                                            handleTargetClick('FOLLOWER', i, opponentPlayerId);
                                        } else {
                                            c && setSelectedCard({ card: c, owner: 'OPPONENT' })
                                        }
                                    }}
                                    style={{
                                        transform: (hoveredTarget?.type === 'FOLLOWER' && hoveredTarget.index === i) || (targetingState && c) ? 'scale(1.05)' : 'scale(1)',
                                        transition: 'transform 0.2s',
                                        cursor: targetingState ? 'crosshair' : 'pointer',
                                        border: (targetingState && c) ? '2px solid #f56565' : 'none',
                                        borderRadius: 8
                                    }}
                                >
                                    {c ? <Card card={c} style={{
                                        width: 100, height: 130,
                                        // Attack Target Feedback (Yellow)
                                        boxShadow: dragState?.sourceType === 'BOARD'
                                            ? '0 0 20px #f6e05e'
                                            : undefined
                                    }}
                                        isOnBoard={true}
                                    />
                                        : <div style={{ width: 100, height: 130, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 8 }} />
                                    }
                                </div>
                            ))}
                        </div>
                        {/* Player Slots */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 15 }}>
                            {player.board.map((c, i) => (
                                <div key={i}
                                    ref={el => playerBoardRefs.current[i] = el}
                                    onMouseDown={(e) => handleBoardMouseDown(e, i)}
                                    onMouseEnter={() => setHoveredTarget({ type: 'FOLLOWER', index: i, playerId: currentPlayerId })}
                                    onMouseLeave={() => setHoveredTarget(null)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {c ? <Card
                                        card={c}
                                        turnCount={gameState.turnCount}
                                        style={{
                                            width: 100, height: 130,
                                            // Lift effect when attacking
                                            transform: dragState?.sourceType === 'BOARD' && dragState.sourceIndex === i ? 'translateY(-20px) scale(1.1)' : 'none',
                                            boxShadow: dragState?.sourceType === 'BOARD' && dragState.sourceIndex === i ? '0 20px 30px rgba(0,0,0,0.6)' : undefined,
                                            transition: 'transform 0.2s, box-shadow 0.2s',
                                            zIndex: dragState?.sourceType === 'BOARD' && dragState.sourceIndex === i ? 10 : 1,
                                            // Disable pointer events when dragging so we can hover targets underneath
                                            pointerEvents: dragState?.sourceType === 'BOARD' && dragState.sourceIndex === i ? 'none' : 'auto'
                                        }}
                                        isSelected={selectedCard?.card === c}
                                        isOnBoard={true}
                                    />
                                        : <div style={{ width: 100, height: 130, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 8 }} />
                                    }
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Controls (Right Side of Middle) */}
                    <div style={{ width: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, paddingRight: 20 }}>

                        {/* Opponent PP Display */}
                        <div style={{ textAlign: 'center', opacity: 0.8 }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f6e05e' }}>{opponent.pp}/{opponent.maxPp}</div>
                            <div style={{ display: 'flex', gap: 2, marginTop: 2, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 100 }}>
                                {Array(Math.min(10, opponent.maxPp)).fill(0).map((_, i) => (
                                    <div key={i} style={{
                                        width: 6, height: 6, borderRadius: '50%',
                                        background: i < opponent.pp ? '#f6e05e' : '#2d3748'
                                    }} />
                                ))}
                            </div>
                        </div>

                        {/* END TURN BUTTON */}
                        <button
                            disabled={gameState.activePlayerId !== currentPlayerId}
                            onClick={() => dispatchAndSend({ type: 'END_TURN', playerId: currentPlayerId })}
                            style={{
                                width: 100, height: 100, borderRadius: '50%', border: '4px solid rgba(255,255,255,0.1)',
                                background: gameState.activePlayerId === currentPlayerId ? 'linear-gradient(135deg, #3182ce, #2b6cb0)' : '#2d3748',
                                color: 'white', fontSize: '1rem', fontWeight: 900,
                                boxShadow: gameState.activePlayerId === currentPlayerId ? '0 0 30px rgba(66, 153, 225, 0.6)' : 'none',
                                cursor: gameState.activePlayerId === currentPlayerId ? 'pointer' : 'default',
                                transition: 'all 0.3s'
                            }}
                        >
                            ターン<br />終了
                        </button>

                        {/* Player PP Gauge */}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f6e05e', lineHeight: 1 }}>{player.pp}/{player.maxPp}</div>
                            <div style={{ display: 'flex', gap: 3, marginTop: 5, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 120 }}>
                                {Array(10).fill(0).map((_, i) => (
                                    <div key={i} style={{
                                        width: 8, height: 8, borderRadius: '50%',
                                        background: i < player.pp ? '#f6e05e' : (i < player.maxPp ? '#744210' : '#2d3748'),
                                        boxShadow: i < player.pp ? '0 0 5px #f6e05e' : 'none'
                                    }} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom: Player Area (Leader & Hand) - Centered & Full Width */}
                <div style={{ width: '100%', height: 160, display: 'flex', justifyContent: 'center', position: 'relative' }} onClick={e => e.stopPropagation()}>

                    {/* Use Button (Sidebar-adjacent) */}
                    {selectedCard && selectedCard.owner === 'PLAYER' && isHandExpanded && (
                        <div style={{
                            position: 'absolute',
                            left: 0, // Far left of player area
                            bottom: 20,
                            zIndex: 100
                        }}>
                            <button
                                disabled={player.pp < selectedCard.card.cost}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleUseButtonClick();
                                }}
                                style={{
                                    background: player.pp >= selectedCard.card.cost ? 'linear-gradient(to bottom, #48bb78, #38a169)' : '#718096',
                                    color: 'white', border: '2px solid rgba(255,255,255,0.2)', padding: '12px 24px', borderRadius: 25,
                                    fontSize: '1.2rem', fontWeight: 'bold',
                                    cursor: player.pp >= selectedCard.card.cost ? 'pointer' : 'not-allowed',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                                    transition: 'transform 0.1s',
                                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                                    minWidth: 120
                                }}
                                onMouseDown={e => e.stopPropagation()}
                            >
                                プレイ
                                <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: 2 }}>pp {selectedCard.card.cost}</div>
                            </button>
                        </div>
                    )}

                    {/* Player Leader Unit */}
                    <div ref={playerLeaderRef} style={{
                        position: 'relative',
                        width: 280, height: 280,
                        marginTop: 0,
                        top: -100, // Moved up 100px
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 10
                    }}>
                        {/* Leader Image */}
                        <div style={{
                            width: 260, height: 260, borderRadius: '50%', overflow: 'hidden',
                            border: '4px solid #3182ce',
                            boxShadow: '0 0 20px rgba(49, 130, 206, 0.4)',
                            background: '#1a202c',
                            position: 'relative',
                            zIndex: 1
                        }}>
                            <img src={player.class === 'AJA' ? azyaLeaderImg : senkaLeaderImg} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>

                        {/* Player EP (Top-Left) */}
                        <div
                            onMouseDown={(e) => handleEvolveMouseDown(e, false)}
                            style={{
                                position: 'absolute', top: 0, left: 40, // Moved Inward
                                display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center',
                                cursor: canEvolveUI ? 'grab' : 'default',
                                zIndex: 500
                            }}
                        >
                            <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#ecc94b', textShadow: '0 0 3px black' }}>EP</div>
                            <div style={{ display: 'flex', gap: 4 }}>
                                {Array(2).fill(0).map((_, i) => (
                                    <div key={i} style={{
                                        width: 16, height: 16, borderRadius: '50%',
                                        background: i < remainingEvolves ? '#ecc94b' : '#2d3748',
                                        boxShadow: i < remainingEvolves
                                            ? (canEvolveUI ? '0 0 10px #ecc94b, 0 0 20px #ecc94b' : '0 0 5px #ecc94b')
                                            : 'none',
                                        border: '2px solid rgba(0,0,0,0.5)'
                                    }} />
                                ))}
                            </div>
                        </div>

                        {/* Player SEP (Super EP) (Top-Right) */}

                        <div
                            onMouseDown={(e) => handleEvolveMouseDown(e, true)}
                            style={{
                                position: 'absolute', top: 15, right: 40, // Moved Inward
                                display: 'flex', gap: 4, zIndex: 500,
                                cursor: player.sep > 0 ? 'grab' : 'default'
                            }}>
                            {/* Super Evolution Points (Purple) */}
                            {Array(2).fill(0).map((_, i) => (
                                <div key={i} style={{
                                    width: 16, height: 16, borderRadius: '50%',
                                    background: i < player.sep ? '#9f7aea' : '#2d3748',
                                    boxShadow: i < player.sep ? '0 0 10px #9f7aea' : 'none',
                                    border: '2px solid rgba(0,0,0,0.5)'
                                }} />
                            ))}
                        </div>

                        {/* Player HP (Lowered into empty space) */}
                        {/* Player HP (Left of EP - "Coco" Position) */}
                        <div style={{
                            position: 'absolute', top: 0, left: -30, // Left of EP
                            width: 60, height: 60,
                            background: 'radial-gradient(circle at 30% 30%, #feb2b2, #c53030)',
                            borderRadius: '50%',
                            border: '3px solid #fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.8rem', fontWeight: 900, color: 'white',
                            textShadow: '0 2px 2px rgba(0,0,0,0.5)',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.4)',
                            zIndex: 500
                        }}>
                            {player.hp}
                        </div>

                        {/* Player Hand Count (Left Side) */}
                        <div style={{
                            position: 'absolute', top: 60, left: -240,
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: 8,
                            color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 'bold',
                            zIndex: 500
                        }}>
                            {/* Deck-like icon */}
                            <div style={{ position: 'relative', width: 20, height: 24, marginRight: 2 }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, width: 16, height: 22, background: '#cbd5e0', border: '1px solid #2d3748', borderRadius: 2, transform: 'rotate(-10deg)' }} />
                                <div style={{ position: 'absolute', top: 2, left: 4, width: 16, height: 22, background: '#edf2f7', border: '1px solid #2d3748', borderRadius: 2, transform: 'rotate(10deg)' }} />
                            </div>
                            手札: {player.hand.length}
                        </div>
                    </div>

                    {/* Hand (Responsive: Expanded vs Collapsed) */}
                    <div style={{
                        position: 'absolute',
                        bottom: isHandExpanded ? -20 : 0, // Raised retracted hand
                        right: isHandExpanded ? '50%' : 180,
                        transform: isHandExpanded ? 'translateX(50%)' : 'none',
                        display: 'flex', alignItems: 'flex-end', height: 160,
                        pointerEvents: 'none',
                        transition: 'all 0.3s ease-out',
                        padding: isHandExpanded ? 20 : 0,
                        zIndex: 30
                    }}>
                        {player.hand.map((c, i) => {
                            // SPRING PHYSICS CALCULATION
                            let transform = isHandExpanded ? 'translateY(0) scale(1.1)' : 'translateY(0)';
                            let transition = 'transform 0.3s';

                            if (dragState?.sourceType === 'HAND' && dragState.sourceIndex === i && (dragState as any).canDrag) {
                                // Drag Style CHANGED: Now using Arrow, card stays put (maybe lift slightly)
                                transform = 'translateY(-5px) scale(1.1)'; // Gentler lift
                            }

                            return (
                                <div key={c.id}
                                    style={{
                                        marginLeft: isHandExpanded ? 10 : (i > 0 ? -60 : 0),
                                        zIndex: i + 100,
                                        transition: transition,
                                        pointerEvents: 'auto',
                                        opacity: 1,
                                        transform: transform,
                                        cursor: 'pointer'
                                    }}
                                    onMouseDown={(e) => handleHandMouseDown(e, i)}
                                >
                                    <Card
                                        card={c}
                                        style={{ width: 110, height: 150, boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}
                                        isSelected={selectedCard?.card === c}
                                        isPlayable={player.pp >= c.cost && gameState.activePlayerId === currentPlayerId}
                                    />
                                </div>
                            );
                        })}
                    </div>
                    {/* End of Player Area */}
                </div>
                {/* Hand Ghost Removed */}

                {/* Board Ghost Removed - using arrow only */}
                {
                    dragState?.sourceType === 'EVOLVE' && (
                        <div style={{ position: 'absolute', left: dragState.currentX, top: dragState.currentY, transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 1000, opacity: 0.8, width: 60, height: 60, borderRadius: '50%', background: '#ECC94B', boxShadow: '0 0 20px #ECC94B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.2rem', color: 'white' }}>EP</div>
                    )
                }

                {/* FLOATING DAMAGE TEXT */}
                {
                    damageNumbers.map(d => (
                        <DamageText key={d.id} value={d.value} x={d.x} y={d.y} color={d.color} onComplete={() => setDamageNumbers(prev => prev.filter(p => p.id !== d.id))} />
                    ))
                }

                {/* SVG Overlay for Dragging Arrow */}
                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 999 }}>
                    {dragState && (dragState.sourceType === 'BOARD' || dragState.sourceType === 'EVOLVE') && (
                        <>
                            <defs>
                                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" fill={
                                        (dragState.sourceType === 'EVOLVE' && (dragState as any).useSep) ? '#9f7aea' :
                                            (dragState.sourceType === 'EVOLVE' ? '#ecc94b' :
                                                (hoveredTarget?.type === 'LEADER' && dragState.sourceType === 'BOARD' ? '#48bb78' : '#e53e3e'))
                                    } />
                                </marker>
                            </defs>
                            <path
                                d={getArrowPath()}
                                fill="none"
                                stroke={
                                    (dragState.sourceType === 'EVOLVE' && (dragState as any).useSep) ? '#9f7aea' :
                                        (dragState.sourceType === 'EVOLVE' ? '#ecc94b' :
                                            (hoveredTarget?.type === 'LEADER' && dragState.sourceType === 'BOARD' ? '#48bb78' : '#e53e3e'))
                                }
                                strokeWidth="4"
                                markerEnd="url(#arrowhead)"
                                style={{ filter: 'drop-shadow(0 0 5px rgba(0,0,0,0.5))' }}
                            />
                        </>
                    )}
                </svg>


                {/* --- Decks & Draw Animation --- */}
                {/* Player Deck (Stacked for 3D effect) */}
                <div style={{ position: 'absolute', bottom: 120, right: 50, width: 80, height: 110, zIndex: 0 }}>
                    {[...Array(Math.min(5, Math.ceil(player.deck.length / 5)))].map((_, i) => (
                        <div key={i} style={{
                            position: 'absolute', inset: 0,
                            transform: `translate(${i * 2}px, ${-i * 2}px)`,
                            background: 'linear-gradient(45deg, #2d3748, #1a202c)',
                            borderRadius: 8, border: '1px solid #718096',
                            boxShadow: '1px 1px 3px rgba(0,0,0,0.5)'
                        }} />
                    ))}
                    <div style={{
                        position: 'absolute', top: '100%', width: '100%', textAlign: 'center',
                        color: '#a0aec0', fontSize: '1.2rem', marginTop: 8, fontWeight: 'bold',
                        textShadow: '0 1px 2px black'
                    }}>
                        {player.deck.length}
                    </div>
                </div>

                {/* Opponent Deck (Right Top) - 3D Stacked Look */}
                <div style={{
                    position: 'absolute',
                    top: 20, right: 10,
                    width: 70, height: 100,
                    zIndex: 0
                }}>
                    {[...Array(Math.min(5, Math.ceil(opponent.deck.length / 5)))].map((_, i) => (
                        <div key={i} style={{
                            position: 'absolute', inset: 0,
                            transform: `translate(${i * -2}px, ${i * 2}px)`, // Stack down-left
                            background: 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)',
                            borderRadius: 6, border: '1px solid #4a5568',
                            boxShadow: '1px 1px 3px rgba(0,0,0,0.5)'
                        }} />
                    ))}
                    <div style={{
                        position: 'absolute', top: '100%', width: '100%', textAlign: 'center',
                        color: '#a0aec0', fontSize: '0.8rem', marginTop: 4, fontWeight: 'bold'
                    }}>
                        {opponent.deck.length}
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

                {/* --- Card Generation Animation Overlay --- */}
                {
                    animatingCard && (
                        <div style={{
                            position: 'fixed',
                            left: '50%',
                            top: animatingCard.status === 'APPEAR' ? '50%' : '85%',
                            transform: animatingCard.status === 'APPEAR'
                                ? 'translate(-50%, -50%) scale(1.2)'
                                : 'translate(-50%, 0) scale(0.6)',
                            zIndex: 7000,
                            pointerEvents: 'none',
                            transition: animatingCard.status === 'FLY'
                                ? 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                : 'none',
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
                        />
                    ))
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
            </div>
        </div>
    );
};
