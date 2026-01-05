import React from 'react';
import { Card as CardType } from '../core/types';
import './Card.css';

// Helper function to resolve asset paths with base URL for GitHub Pages deployment
const getAssetUrl = (path: string): string => {
    const base = import.meta.env.BASE_URL || '/';
    // Remove leading slash from path if base already ends with /
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${base}${cleanPath}`;
};

interface CardProps {
    card: CardType;
    onClick?: () => void;
    style?: React.CSSProperties;
    isSelected?: boolean;
    isPlayable?: boolean;
    variant?: 'normal' | 'art-only' | 'mobile-hand';
    canAttack?: boolean; // For manual override if needed
    isOnBoard?: boolean; // New prop to distinguish Board vs Hand context
    isSpecialSummoning?: boolean; // Special summon animation trigger
    turnCount?: number; // Current game turn count from engine
    className?: string; // For custom animations
    suppressPassives?: boolean; // Explicitly hide passive effects (for play animation etc)
    isMyTurn?: boolean; // Current player's turn?
    scale?: number; // Scale factor for responsive sizing (default: 1)
}

export const Card: React.FC<CardProps> = ({ card, onClick, style, isSelected, isPlayable, variant = 'normal', turnCount, isOnBoard, isSpecialSummoning, className, suppressPassives, isMyTurn, scale = 1 }) => {
    // Determine stats to show
    const attack = 'currentAttack' in card ? (card as any).currentAttack : card.attack;
    const health = 'currentHealth' in card ? (card as any).currentHealth : card.health;
    const maxHealth = 'maxHealth' in card ? (card as any).maxHealth : card.health;
    const isReady = 'canAttack' in card ? (card as any).canAttack : false;
    const turnPlayed = 'turnPlayed' in card ? (card as any).turnPlayed : undefined;

    // Special Summon Animation State
    const [playSummonAnim, setPlaySummonAnim] = React.useState(false);

    React.useEffect(() => {
        if (isSpecialSummoning && isOnBoard) {
            setPlaySummonAnim(true);
            // 800ms後にアニメーション終了（1000msより短くして、バリア等のエフェクトが早く表示されるように）
            const timer = setTimeout(() => setPlaySummonAnim(false), 800);
            return () => clearTimeout(timer);
        }
    }, [isSpecialSummoning, isOnBoard]);

    // Check if stats are buffed
    const baseAttack = 'baseAttack' in card ? (card as any).baseAttack : undefined;
    const baseHealth = 'baseHealth' in card ? (card as any).baseHealth : undefined;
    const isAttackBuffed = baseAttack !== undefined && attack > baseAttack;
    const isHealthBuffed = baseHealth !== undefined && (health > baseHealth || maxHealth > baseHealth);

    // Determine which image to show (evolved or base)
    const hasEvolved = 'hasEvolved' in card ? (card as any).hasEvolved : false;
    const evolvedImageUrl = 'evolvedImageUrl' in card ? (card as any).evolvedImageUrl : undefined;
    const rawImageUrl = (hasEvolved && evolvedImageUrl) ? evolvedImageUrl : card.imageUrl;
    // Apply base URL for GitHub Pages deployment
    const displayImageUrl = rawImageUrl ? getAssetUrl(rawImageUrl) : undefined;

    // Determine Glow Color
    let glowColor = style?.boxShadow;
    let borderColor = undefined;

    // Use proper property check - check both hasBarrier property AND passiveAbilities for consistency
    const abilities: string[] = (card as any).passiveAbilities || (card as any).abilities || [];
    const isWard = abilities.includes('WARD');
    const isAura = abilities.includes('AURA');
    const isStealth = abilities.includes('STEALTH');
    // hasBarrier: true if hasBarrier property is true, OR if passiveAbilities includes BARRIER and hasBarrier is not explicitly false
    // This ensures consistency when either property is set
    const hasBarrier = (card as any).hasBarrier === true ||
        (abilities.includes('BARRIER') && (card as any).hasBarrier !== false);

    if (isSelected) {
        glowColor = '0 0 15px rgba(255, 255, 255, 0.8)';
    } else if (isPlayable) {
        glowColor = '0 0 10px #48bb78'; // Green for Playable
        borderColor = '2px solid #48bb78';
    } else if (isReady && isMyTurn) {
        // Determine if can attack leader (Green) or followers only (Yellow)
        // Green (Leader + Followers): STORM ability
        // Yellow (Followers only): RUSH, or evolved/super-evolved this turn without STORM
        const hasStorm = abilities.includes('STORM');
        const hasRush = abilities.includes('RUSH');
        const isPlayedThisTurn = turnCount !== undefined && turnPlayed !== undefined && turnPlayed === turnCount;

        // Logic:
        // Storm -> Always Green (Can attack leader)
        // Rush Only (this turn) -> Yellow (Cannot attack leader this turn)
        // Evolved this turn (no STORM) -> Yellow (Cannot attack leader, like Rush)
        // Previous turns (no STORM) -> Green (Can attack leader after the first turn)

        let showYellow = false;
        if (!hasStorm) {
            // If no STORM:
            // - RUSH on the turn played = Yellow (followers only)
            // - Evolved on the turn played (hasEvolved && isPlayedThisTurn) = Yellow (followers only)
            // - Otherwise = Green (can attack leader)
            if (isPlayedThisTurn) {
                // Played this turn without STORM: can only attack followers (Yellow)
                showYellow = true;
            } else if (turnCount === undefined || turnPlayed === undefined) {
                // Unknown state: default to Yellow if has RUSH
                showYellow = hasRush;
            }
        }

        if (showYellow) {
            glowColor = '0 0 10px #f6e05e'; // Yellow - Followers only
        } else {
            glowColor = '0 0 10px #48bb78'; // Green - Leader + Followers
        }
    }

    const isDamaged = health < maxHealth;

    // --- Art Only Variant (For Left Panel) ---
    if (variant === 'art-only') {
        return (
            <div
                className="card art-only"
                style={{
                    width: 140, height: 200, // Default size
                    ...style,
                    borderRadius: 8,
                    overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#2d3748',
                    position: 'relative',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                }}
            >
                {displayImageUrl ? (
                    <img src={displayImageUrl} alt={card.name} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <div style={{ fontSize: '1.5rem', opacity: 0.5, color: 'white', fontWeight: 'bold' }}>{card.type}</div>
                )}
            </div>
        );
    }

    // --- Mobile Hand Variant (For Mobile Hand - No Name, Stats Vertical on Left) ---
    if (variant === 'mobile-hand') {
        const isSpell = card.type === 'SPELL';
        const topRadius = isSpell ? 16 : 6;
        // Larger icons to utilize full card height (3 icons + gaps must fit in ~115px card)
        const iconSize = 28 * scale;
        const fontSize = 0.85 * scale;
        // For Follower cards: 3 icons + 2 gaps = 28*3 + 6*2 = 96px fits well in 115px card
        // For Spell cards: 1 icon = 28px, plenty of space

        return (
            <div
                className={`card mobile-hand ${className || ''}`}
                style={{
                    width: 80, height: 115, // Larger size for better visibility
                    ...style,
                    position: 'relative',
                    cursor: onClick ? 'pointer' : 'default',
                    transform: isSelected ? 'translateY(-8px)' : style?.transform,
                    boxShadow: glowColor || style?.boxShadow,
                    border: borderColor || (isPlayable ? '2px solid #48bb78' : undefined),
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    background: '#1a202c',
                    overflow: 'hidden',
                    borderRadius: `${topRadius}px ${topRadius}px 6px 6px`,
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                }}
                onClick={onClick}
            >
                {/* Full-bleed Image */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', borderRadius: `${topRadius}px ${topRadius}px 6px 6px` }}>
                    {displayImageUrl ? (
                        <img src={displayImageUrl} alt={card.name} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#4a5568', color: '#a0aec0', fontSize: '0.6rem' }}>
                            {card.type}
                        </div>
                    )}
                </div>

                {/* Stats Column - Left Side, Vertical: Cost, Attack, Health */}
                <div style={{
                    position: 'absolute',
                    top: 3,
                    left: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    zIndex: 10
                }}>
                    {/* Cost - thin border */}
                    <div style={{
                        width: iconSize, height: iconSize, borderRadius: '50%',
                        background: '#48bb78', border: '1px solid rgba(255,255,255,0.8)',
                        color: 'white', fontSize: `${fontSize}rem`, fontWeight: 900,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.6)'
                    }}>
                        {card.cost}
                    </div>

                    {/* Attack (Followers only) */}
                    {card.type === 'FOLLOWER' && (
                        <div style={{
                            width: iconSize, height: iconSize,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            position: 'relative'
                        }}>
                            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" style={{ position: 'absolute', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>
                                <polygon points="12,2 22,22 2,22" fill="#4299e1" stroke="rgba(255,255,255,0.8)" strokeWidth="1" strokeLinejoin="round" />
                            </svg>
                            <span style={{ zIndex: 1, color: isAttackBuffed ? '#faf089' : 'white', fontWeight: 'bold', fontSize: `${fontSize}rem`, textShadow: '0 1px 2px black' }}>{attack}</span>
                        </div>
                    )}

                    {/* Health (Followers only) */}
                    {card.type === 'FOLLOWER' && (
                        <div style={{
                            width: iconSize, height: iconSize,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            position: 'relative'
                        }}>
                            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" style={{ position: 'absolute', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#c53030" stroke="rgba(255,255,255,0.8)" strokeWidth="1" />
                            </svg>
                            <span style={{ zIndex: 1, color: isHealthBuffed ? '#faf089' : isDamaged ? '#fc8181' : 'white', fontWeight: 'bold', fontSize: `${fontSize}rem`, textShadow: '0 1px 2px black' }}>{health}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // スペルカードは手札表示時に上側の角を丸くする
    const isSpellInHand = card.type === 'SPELL' && !isOnBoard;
    const spellTopRadius = isSpellInHand ? 20 : 8;

    // --- Normal Variant (On Board / Hand) ---
    return (
        <div
            className={`card card-container ${isReady ? 'ready' : ''} ${isOnBoard ? 'on-board' : ''} ${className || ''}`}
            style={{
                width: 140, height: 200, // Default size
                ...style,
                position: 'relative', // Needed for absolute positioned effects
                cursor: onClick ? 'pointer' : 'default',
                transform: isSelected ? 'translateY(-10px)' : style?.transform, // Lift if selected (halved from -20px)
                boxShadow: glowColor || (isReady
                    ? '0 0 10px #f6e05e'
                    : style?.boxShadow),
                border: borderColor || (isPlayable ? '2px solid #48bb78' : undefined),
                transition: 'transform 0.2s, box-shadow 0.2s',
                display: 'flex', flexDirection: 'column',
                background: '#1a202c', // Fallback bg
                overflow: 'visible', // Allow effects to render outside card bounds
                animation: playSummonAnim ? 'cardSummonAppear 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards' : style?.animation,
                // 3D flip animation support - ALWAYS hide backface to prevent mirror image during rotation
                // This is critical for proper 3D flip behavior when parent uses transform-style: preserve-3d
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                borderRadius: isSpellInHand ? `${spellTopRadius}px ${spellTopRadius}px 8px 8px` : '8px'
            }}
            onClick={onClick}
        >
            {/* 1. Name Bar (Top, Thin) - Valid only when NOT on Board */}
            {!isOnBoard && (
                <div style={{
                    height: 20,
                    background: 'rgba(0,0,0,0.8)',
                    color: '#e2e8f0',
                    fontSize: card.name.length > 10 ? '0.6rem' : '0.7rem',
                    fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    borderBottom: '1px solid rgba(255,255,255,0.2)',
                    zIndex: 2,
                    transform: card.name.length > 15 ? 'scaleX(0.9)' : 'none',
                    borderRadius: isSpellInHand ? `${spellTopRadius}px ${spellTopRadius}px 0 0` : '8px 8px 0 0',
                }}>
                    {card.name}
                </div>
            )}

            {/* 2. Content Area (Contains image, cost, stats, and effects) */}
            <div style={{ flex: 1, position: 'relative', width: '100%', background: '#2d3748', borderRadius: isOnBoard ? '8px' : '0 0 8px 8px', minHeight: 0 }}>
                {/* 2a. Visual Content (Clipped) */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', borderRadius: isOnBoard ? '8px' : '0 0 8px 8px', zIndex: 1 }}>
                    {displayImageUrl ? (
                        <img
                            src={displayImageUrl}
                            alt={card.name}
                            draggable={false}
                            style={{
                                width: '100%', height: '100%', objectFit: 'cover',
                                display: 'block'
                            }}
                        />
                    ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#4a5568', color: '#a0aec0', fontSize: '0.8rem' }}>
                            {card.type}
                        </div>
                    )}

                    {/* Overlaid Description Gradient */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 40, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', pointerEvents: 'none', zIndex: 3 }} />
                </div>

                {/* 2b. Overlaid Cost (Not Clipped) - Valid only when NOT on Board */}
                {!isOnBoard && (
                    <div style={{
                        position: 'absolute', top: 2 * scale, left: 2 * scale,
                        width: 24 * scale, height: 24 * scale, borderRadius: '50%',
                        background: '#48bb78', border: `${Math.max(1, 2 * scale)}px solid #fff`,
                        color: 'white', fontSize: `${0.9 * scale}rem`, fontWeight: 900,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.5), inset 0 2px 5px rgba(255,255,255,0.3)',
                        zIndex: 10
                    }}>
                        {card.cost}
                    </div>
                )}

                {/* 2c. Stats (Bottom Corners, Not Clipped) */}
                {card.type === 'FOLLOWER' && (
                    <>
                        {/* Attack */}
                        <div style={{
                            position: 'absolute',
                            bottom: isOnBoard ? 2 * scale : 40 * scale,
                            left: 2 * scale,
                            width: 32 * scale, height: 32 * scale, zIndex: 10,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <svg width={40 * scale} height={40 * scale} viewBox="0 0 24 24" fill="none" style={{ position: 'absolute', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.8))' }}>
                                <defs>
                                    <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#63b3ed" />
                                        <stop offset="100%" stopColor="#4299e1" />
                                    </linearGradient>
                                </defs>
                                <polygon points="12,2 22,22 2,22" fill="url(#blueGrad)" stroke="white" strokeWidth="1" strokeLinejoin="round" />
                            </svg>
                            <span style={{ zIndex: 11, color: isAttackBuffed ? '#faf089' : 'white', fontWeight: 'bold', fontSize: `${1.2 * scale}rem`, textShadow: '0 2px 2px black' }}>{attack}</span>
                        </div>

                        {/* Health */}
                        <div style={{
                            position: 'absolute',
                            bottom: 2 * scale,
                            right: isOnBoard ? 2 * scale : 'auto',
                            left: isOnBoard ? 'auto' : 2 * scale,
                            width: 32 * scale, height: 32 * scale, zIndex: 10,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <svg width={36 * scale} height={36 * scale} viewBox="0 0 24 24" style={{ position: 'absolute', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.8))' }}>
                                <defs>
                                    <linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#f56565" />
                                        <stop offset="100%" stopColor="#c53030" />
                                    </linearGradient>
                                </defs>
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="url(#redGrad)" stroke="white" strokeWidth="1.5" />
                            </svg>
                            <span style={{ zIndex: 11, color: isHealthBuffed ? '#faf089' : isDamaged ? '#fc8181' : 'white', fontWeight: 'bold', fontSize: `${1.2 * scale}rem`, textShadow: '0 2px 2px black' }}>{health}</span>
                        </div>
                    </>
                )}

                {/* 2d. Effects (Outside clipping container) */}
                {/* NOTE: 条件付きレンダリングからCSS opacity制御に変更 */}
                {/* DOM要素を常に維持し、表示/非表示をopacityで制御することで */}
                {/* CPU戦での高速連続更新時のエフェクト消失問題を解決 */}

                {/* WARD EFFECT - 常にレンダリング、opacityで表示制御 */}
                {isOnBoard && (
                    <div style={{
                        position: 'absolute',
                        top: -6 * scale, left: -6 * scale, right: -6 * scale, bottom: -6 * scale,
                        zIndex: 50,
                        pointerEvents: 'none',
                        opacity: (isWard && !suppressPassives) ? 1 : 0,
                        transition: 'opacity 0.2s ease-in-out'
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            animation: 'wardPulseLoop 2.5s infinite ease-in-out'
                        }}>
                            <svg viewBox="0 0 100 120" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                                <defs>
                                    <filter id="wardGlow" x="-50%" y="-50%" width="200%" height="200%">
                                        <feGaussianBlur stdDeviation="2" result="blur" />
                                        <feMerge>
                                            <feMergeNode in="blur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                </defs>
                                <path d="M50 2 L96 20 V60 C96 90 50 116 50 116 C50 116 4 90 4 60 V20 Z"
                                    fill="rgba(255, 255, 255, 0.12)" stroke="#ECC94B" strokeWidth="3" filter="url(#wardGlow)" />
                            </svg>
                        </div>
                    </div>
                )}

                {/* BARRIER EFFECT - 常にレンダリング、opacityで表示制御 */}
                {isOnBoard && (
                    <div style={{
                        position: 'absolute',
                        top: -5 * scale, left: -5 * scale, right: -5 * scale, bottom: -5 * scale,
                        zIndex: 21,
                        pointerEvents: 'none',
                        opacity: (hasBarrier && !playSummonAnim && !suppressPassives) ? 1 : 0,
                        transition: 'opacity 0.2s ease-in-out'
                    }}>
                        {/* Outer glow layer */}
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            borderRadius: '50%',
                            background: 'radial-gradient(ellipse at center, rgba(99, 179, 237, 0.12) 0%, transparent 60%)',
                            animation: 'barrierGlowLoop 3s infinite ease-in-out'
                        }} />
                        {/* Main barrier line - crisp and visible */}
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            borderRadius: '50%',
                            border: `${Math.max(1.5, 2 * scale)}px solid rgba(99, 179, 237, 0.9)`,
                            boxShadow: '0 0 6px rgba(66, 153, 225, 0.5), inset 0 0 8px rgba(99, 179, 237, 0.15)',
                            animation: 'barrierPulseLoop 3s infinite ease-in-out'
                        }} />
                    </div>
                )}

                {/* AURA EFFECT - 常にレンダリング、opacityで表示制御 */}
                {isOnBoard && (
                    <div style={{
                        position: 'absolute',
                        top: -6 * scale, left: -6 * scale, right: -6 * scale, bottom: -6 * scale,
                        zIndex: 22,
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: (isAura && !playSummonAnim && !suppressPassives) ? 1 : 0,
                        transition: 'opacity 0.2s ease-in-out'
                    }}>
                        <div style={{
                            width: '100%',
                            height: '100%',
                            position: 'relative',
                            animation: 'auraPulseLoop 3s infinite ease-in-out'
                        }}>
                            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                                <defs>
                                    <filter id="auraGlow" x="-50%" y="-50%" width="200%" height="200%">
                                        <feGaussianBlur stdDeviation="1.5" result="blur" />
                                        <feMerge>
                                            <feMergeNode in="blur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                </defs>
                                <path d="M40 5 L60 5 L60 30 L95 30 L95 45 L60 45 L60 95 L40 95 L40 45 L5 45 L5 30 L40 30 Z"
                                    fill="rgba(255, 204, 0, 0.2)" stroke="#f6ad55" strokeWidth="2.5" filter="url(#auraGlow)" />
                            </svg>
                        </div>
                    </div>
                )}

                {/* STEALTH EFFECT - 常にレンダリング、opacityで表示制御 */}
                {isOnBoard && (
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        zIndex: 13,
                        pointerEvents: 'none',
                        overflow: 'hidden',
                        borderRadius: '0 0 8px 8px',
                        opacity: (isStealth && !playSummonAnim && !suppressPassives) ? 1 : 0,
                        transition: 'opacity 0.2s ease-in-out'
                    }}>
                        {/* Central Inky Circle (Black) - Adjusted blur for scale */}
                        <div style={{
                            position: 'absolute',
                            top: '50%', left: '50%',
                            width: '120%', height: '120%',
                            transform: 'translate(-50%, -50%)',
                            background: 'radial-gradient(circle, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.6) 30%, rgba(0, 0, 0, 0.2) 60%, transparent 80%)',
                            filter: 'blur(10px)',
                            animation: 'stealthInkMove 3s infinite ease-in-out',
                            mixBlendMode: 'multiply'
                        }} />

                        {/* Secondary Ink Layer for stronger effect */}
                        <div style={{
                            position: 'absolute',
                            top: '50%', left: '50%',
                            width: '100%', height: '100%',
                            transform: 'translate(-50%, -50%)',
                            background: 'radial-gradient(circle, rgba(20, 20, 30, 0.85) 0%, rgba(10, 10, 20, 0.4) 40%, transparent 70%)',
                            filter: 'blur(8px)',
                            animation: 'stealthInkPulse 1.5s infinite ease-in-out',
                            mixBlendMode: 'multiply'
                        }} />

                        {/* Central Misty Circle (White/Cloudy) - More visible */}
                        <div style={{
                            position: 'absolute',
                            top: '50%', left: '50%',
                            width: '70%', height: '70%',
                            transform: 'translate(-50%, -50%)',
                            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(200, 200, 200, 0.25) 30%, transparent 60%)',
                            filter: 'blur(8px)',
                            animation: 'stealthMistMove 4s infinite ease-in-out',
                            mixBlendMode: 'screen'
                        }} />

                        {/* Outer Edge Glow - Reduced shadow spread */}
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            boxShadow: 'inset 0 0 30px rgba(0, 0, 0, 0.85), 0 0 20px rgba(0, 0, 0, 0.6)',
                            animation: 'stealthPulse 1.5s infinite ease-in-out'
                        }} />
                    </div>
                )}
            </div>

            {/* Special Summon Overlay */}
            {playSummonAnim && (
                <div style={{
                    position: 'absolute', inset: 0,
                    borderRadius: 8,
                    background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)',
                    mixBlendMode: 'overlay',
                    animation: 'cardSummonFlash 0.8s ease-out forwards',
                    pointerEvents: 'none',
                    zIndex: 100
                }} />
            )}

            <style>{`
                @keyframes cardSummonAppear {
                    0% { opacity: 0; transform: scale(1.5); filter: brightness(2) blur(4px); }
                    100% { opacity: 1; transform: scale(1); filter: brightness(1) blur(0px); }
                }
                @keyframes cardSummonFlash {
                    0% { opacity: 0.8; transform: scale(1.2); }
                    100% { opacity: 0; transform: scale(1); }
                }
                @keyframes wardPulseLoop {
                    0% { transform: scale(1); opacity: 0.9; filter: blur(0px) drop-shadow(0 0 5px rgba(255, 255, 255, 0.5)); }
                    50% { transform: scale(1.08); opacity: 0.5; filter: blur(3px) drop-shadow(0 0 15px rgba(255, 255, 255, 0.8)); }
                    100% { transform: scale(1); opacity: 0.9; filter: blur(0px) drop-shadow(0 0 5px rgba(255, 255, 255, 0.5)); }
                }
                @keyframes barrierPulseLoop {
                    0% { transform: scale(1); opacity: 1; box-shadow: 0 0 8px rgba(66, 153, 225, 0.6), inset 0 0 10px rgba(99, 179, 237, 0.2); }
                    50% { transform: scale(1.03); opacity: 0.85; box-shadow: 0 0 12px rgba(99, 179, 237, 0.8), inset 0 0 15px rgba(99, 179, 237, 0.3); }
                    100% { transform: scale(1); opacity: 1; box-shadow: 0 0 8px rgba(66, 153, 225, 0.6), inset 0 0 10px rgba(99, 179, 237, 0.2); }
                }
                @keyframes barrierGlowLoop {
                    0% { transform: scale(1); opacity: 0.6; }
                    50% { transform: scale(1.05); opacity: 0.4; }
                    100% { transform: scale(1); opacity: 0.6; }
                }
                @keyframes auraPulseLoop {
                    0% { transform: scale(1); opacity: 0.9; filter: blur(0px) drop-shadow(0 0 5px rgba(246, 173, 85, 0.5)); }
                    50% { transform: scale(1.12); opacity: 0.4; filter: blur(4px) drop-shadow(0 0 20px rgba(255, 204, 0, 0.8)); }
                    100% { transform: scale(1); opacity: 0.9; filter: blur(0px) drop-shadow(0 0 5px rgba(246, 173, 85, 0.5)); }
                }
                @keyframes stealthInkMove {
                    0%, 100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 0.7; }
                    25% { transform: translate(-45%, -55%) scale(1.15) rotate(3deg); opacity: 1; }
                    50% { transform: translate(-50%, -50%) scale(0.95) rotate(0deg); opacity: 0.5; }
                    75% { transform: translate(-55%, -45%) scale(1.1) rotate(-3deg); opacity: 0.9; }
                }
                @keyframes stealthInkPulse {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
                    50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.4; }
                }
                @keyframes stealthMistMove {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
                    25% { transform: translate(-48%, -52%) scale(1.1); opacity: 0.8; }
                    50% { transform: translate(-52%, -48%) scale(1.2); opacity: 0.3; }
                    75% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.7; }
                }
                @keyframes stealthPulse {
                    0%, 100% { opacity: 0.6; box-shadow: inset 0 0 50px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 0, 0, 0.7); }
                    50% { opacity: 1; box-shadow: inset 0 0 70px rgba(0, 0, 0, 1), 0 0 40px rgba(0, 0, 0, 0.9); }
                }
                /* 3D flip support - ensure all child elements inherit backface-visibility */
                .card, .card * {
                    backface-visibility: hidden !important;
                    -webkit-backface-visibility: hidden !important;
                }
            `}</style>
        </div >
    );
};
