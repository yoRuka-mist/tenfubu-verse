import React from 'react';
import { Card as CardType } from '../core/types';
import './Card.css';

interface CardProps {
    card: CardType;
    onClick?: () => void;
    style?: React.CSSProperties;
    isSelected?: boolean;
    isPlayable?: boolean;
    variant?: 'normal' | 'art-only';
    canAttack?: boolean; // For manual override if needed
    isOnBoard?: boolean; // New prop to distinguish Board vs Hand context
    turnCount?: number; // Current game turn count from engine
    className?: string; // For custom animations
}

export const Card: React.FC<CardProps> = ({ card, onClick, style, isSelected, isPlayable, variant = 'normal', turnCount, isOnBoard, className }) => {
    // Determine stats to show
    const attack = 'currentAttack' in card ? (card as any).currentAttack : card.attack;
    const health = 'currentHealth' in card ? (card as any).currentHealth : card.health;
    const maxHealth = 'maxHealth' in card ? (card as any).maxHealth : card.health;
    const isReady = 'canAttack' in card ? (card as any).canAttack : false;
    const turnPlayed = 'turnPlayed' in card ? (card as any).turnPlayed : undefined;

    // Check if stats are buffed
    const baseAttack = 'baseAttack' in card ? (card as any).baseAttack : undefined;
    const baseHealth = 'baseHealth' in card ? (card as any).baseHealth : undefined;
    const isAttackBuffed = baseAttack !== undefined && attack > baseAttack;
    const isHealthBuffed = baseHealth !== undefined && (health > baseHealth || maxHealth > baseHealth);

    // Determine which image to show (evolved or base)
    const hasEvolved = 'hasEvolved' in card ? (card as any).hasEvolved : false;
    const evolvedImageUrl = 'evolvedImageUrl' in card ? (card as any).evolvedImageUrl : undefined;
    const displayImageUrl = (hasEvolved && evolvedImageUrl) ? evolvedImageUrl : card.imageUrl;

    // Determine Glow Color
    let glowColor = style?.boxShadow;
    let borderColor = undefined;

    // Use proper property check
    const abilities: string[] = (card as any).passiveAbilities || (card as any).abilities || [];
    const isWard = abilities.includes('WARD');
    const isAura = abilities.includes('AURA');
    const isStealth = abilities.includes('STEALTH');
    const hasBarrier = (card as any).hasBarrier === true;

    if (isSelected) {
        glowColor = '0 0 15px rgba(255, 255, 255, 0.8)';
    } else if (isPlayable) {
        glowColor = '0 0 10px #48bb78'; // Green for Playable
        borderColor = '2px solid #48bb78';
    } else if (isReady) {
        // Check for Storm (Green) vs Rush (Yellow)
        // Assume Green mostly, but Yellow if RUSH is present and NO STORM
        const hasStorm = abilities.includes('STORM');
        const isRushOnly = abilities.includes('RUSH') && !hasStorm;

        // Logic:
        // Storm -> Always Green (Can attack leader)
        // Rush Only -> Yellow IF played this turn (Cannot attack leader). Green if played previous turn.

        let showYellow = false;
        if (isRushOnly) {
            if (turnCount !== undefined && turnPlayed !== undefined && turnPlayed === turnCount) {
                showYellow = true;
            } else if (turnCount === undefined || turnPlayed === undefined) {
                showYellow = true; // Default to yellow if unknown
            }
        }

        if (showYellow) {
            glowColor = '0 0 10px #f6e05e'; // Yellow
        } else {
            glowColor = '0 0 10px #48bb78'; // Green
        }
    }

    const isDamaged = health < maxHealth;

    // --- Art Only Variant (For Left Panel) ---
    if (variant === 'art-only') {
        return (
            <div
                className="card"
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

    // --- Normal Variant (On Board / Hand) ---
    return (
        <div
            className={`card card-container ${isReady ? 'ready' : ''} ${className || ''}`}
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
                overflow: 'visible' // Allow effects to render outside card bounds
            }}
            onClick={onClick}
        >
            {/* 1. Name Bar (Top, Thin) */}
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
            }}>
                {card.name}
            </div>

            {/* 2. Content Area (Contains image, cost, stats, and effects) */}
            <div style={{ flex: 1, position: 'relative', width: '100%', background: '#2d3748', borderRadius: '0 0 8px 8px', minHeight: 0 }}>
                {/* 2a. Visual Content (Clipped) */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', borderRadius: '0 0 8px 8px', zIndex: 1 }}>
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

                {/* 2b. Overlaid Cost (Not Clipped) */}
                <div style={{
                    position: 'absolute', top: 2, left: 2,
                    width: 24, height: 24, borderRadius: '50%',
                    background: '#48bb78', border: '2px solid #fff',
                    color: 'white', fontSize: '0.9rem', fontWeight: 900,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.5), inset 0 2px 5px rgba(255,255,255,0.3)',
                    zIndex: 10
                }}>
                    {card.cost}
                </div>

                {/* 2c. Stats (Bottom Corners, Not Clipped) */}
                {card.type === 'FOLLOWER' && (
                    <>
                        {/* Attack */}
                        <div style={{
                            position: 'absolute',
                            bottom: isOnBoard ? 2 : 40,
                            left: 2,
                            width: 32, height: 32, zIndex: 10,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ position: 'absolute', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.8))' }}>
                                <defs>
                                    <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#63b3ed" />
                                        <stop offset="100%" stopColor="#4299e1" />
                                    </linearGradient>
                                </defs>
                                <polygon points="12,2 22,22 2,22" fill="url(#blueGrad)" stroke="white" strokeWidth="1" strokeLinejoin="round" />
                            </svg>
                            <span style={{ zIndex: 11, color: isAttackBuffed ? '#faf089' : 'white', fontWeight: 'bold', fontSize: '1.2rem', textShadow: '0 2px 2px black' }}>{attack}</span>
                        </div>

                        {/* Health */}
                        <div style={{
                            position: 'absolute',
                            bottom: 2,
                            right: isOnBoard ? 2 : 'auto',
                            left: isOnBoard ? 'auto' : 2,
                            width: 32, height: 32, zIndex: 10,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <svg width="36" height="36" viewBox="0 0 24 24" style={{ position: 'absolute', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.8))' }}>
                                <defs>
                                    <linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#f56565" />
                                        <stop offset="100%" stopColor="#c53030" />
                                    </linearGradient>
                                </defs>
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="url(#redGrad)" stroke="white" strokeWidth="1.5" />
                            </svg>
                            <span style={{ zIndex: 11, color: isHealthBuffed ? '#faf089' : isDamaged ? '#fc8181' : 'white', fontWeight: 'bold', fontSize: '1.2rem', textShadow: '0 2px 2px black' }}>{health}</span>
                        </div>
                    </>
                )}

                {/* 2d. Effects (Outside clipping container) */}
                {/* WARD EFFECT */}
                {isWard && isOnBoard && (
                    <div style={{
                        position: 'absolute',
                        top: -15, left: -15, right: -15, bottom: -15,
                        zIndex: 50,
                        pointerEvents: 'none'
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            animation: 'wardPulseLoop 2.5s infinite ease-in-out'
                        }}>
                            <svg viewBox="0 0 100 120" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                                <defs>
                                    <filter id="wardGlow" x="-50%" y="-50%" width="200%" height="200%">
                                        <feGaussianBlur stdDeviation="3" result="blur" />
                                        <feMerge>
                                            <feMergeNode in="blur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                </defs>
                                <path d="M50 2 L96 20 V60 C96 90 50 116 50 116 C50 116 4 90 4 60 V20 Z"
                                    fill="rgba(255, 255, 255, 0.15)" stroke="#ECC94B" strokeWidth="4" filter="url(#wardGlow)" />
                            </svg>
                        </div>
                    </div>
                )}

                {/* BARRIER EFFECT */}
                {hasBarrier && (
                    <div style={{
                        position: 'absolute',
                        top: -12, left: -12, right: -12, bottom: -12,
                        zIndex: 21,
                        pointerEvents: 'none'
                    }}>
                        {/* Outer glow layer */}
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            borderRadius: '50%',
                            background: 'radial-gradient(ellipse at center, rgba(99, 179, 237, 0.15) 0%, transparent 60%)',
                            animation: 'barrierGlowLoop 3s infinite ease-in-out'
                        }} />
                        {/* Main barrier line - crisp and visible */}
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            borderRadius: '50%',
                            border: '2.5px solid rgba(99, 179, 237, 0.9)',
                            boxShadow: '0 0 8px rgba(66, 153, 225, 0.6), inset 0 0 10px rgba(99, 179, 237, 0.2)',
                            animation: 'barrierPulseLoop 3s infinite ease-in-out'
                        }} />
                    </div>
                )}

                {/* AURA EFFECT */}
                {isAura && isOnBoard && (
                    <div style={{
                        position: 'absolute',
                        top: -15, left: -15, right: -15, bottom: -15,
                        zIndex: 22,
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
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
                                        <feGaussianBlur stdDeviation="2" result="blur" />
                                        <feMerge>
                                            <feMergeNode in="blur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                </defs>
                                <path d="M40 5 L60 5 L60 30 L95 30 L95 45 L60 45 L60 95 L40 95 L40 45 L5 45 L5 30 L40 30 Z"
                                    fill="rgba(255, 204, 0, 0.25)" stroke="#f6ad55" strokeWidth="3" filter="url(#auraGlow)" />
                            </svg>
                        </div>
                    </div>
                )}

                {/* STEALTH EFFECT */}
                {isStealth && isOnBoard && (
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        zIndex: 13,
                        pointerEvents: 'none',
                        overflow: 'hidden',
                        borderRadius: '0 0 8px 8px'
                    }}>
                        {/* Central Inky Circle (Black) */}
                        <div style={{
                            position: 'absolute',
                            top: '50%', left: '50%',
                            width: '120%', height: '120%',
                            transform: 'translate(-50%, -50%)',
                            background: 'radial-gradient(circle, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 30%, transparent 70%)',
                            filter: 'blur(20px)',
                            animation: 'stealthInkMove 6s infinite ease-in-out',
                            mixBlendMode: 'multiply'
                        }} />

                        {/* Central Misty Circle (White/Cloudy) */}
                        <div style={{
                            position: 'absolute',
                            top: '50%', left: '50%',
                            width: '100%', height: '100%',
                            transform: 'translate(-50%, -50%)',
                            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(200, 200, 200, 0.2) 20%, transparent 60%)',
                            filter: 'blur(15px)',
                            animation: 'stealthMistMove 8s infinite ease-in-out',
                            mixBlendMode: 'screen'
                        }} />

                        {/* Outer Edge Glow */}
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.7), 0 0 20px rgba(0, 0, 0, 0.5)',
                            animation: 'stealthPulse 3s infinite ease-in-out'
                        }} />
                    </div>
                )}
            </div>

            <style>{`
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
                    0%, 100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 0.6; }
                    33% { transform: translate(-45%, -55%) scale(1.1) rotate(5deg); opacity: 0.8; }
                    66% { transform: translate(-55%, -45%) scale(0.9) rotate(-5deg); opacity: 0.7; }
                }
                @keyframes stealthMistMove {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.4; }
                    50% { transform: translate(-52%, -48%) scale(1.2); opacity: 0.6; }
                }
                @keyframes stealthPulse {
                    0%, 100% { opacity: 0.7; }
                    50% { opacity: 1; }
                }
            `}</style>
        </div >
    );
};
