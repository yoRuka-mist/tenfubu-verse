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
}

export const Card: React.FC<CardProps> = ({ card, onClick, style, isSelected, isPlayable, variant = 'normal', turnCount, isOnBoard }) => {
    // Determine stats to show
    const attack = 'currentAttack' in card ? (card as any).currentAttack : card.attack;
    const health = 'currentHealth' in card ? (card as any).currentHealth : card.health;
    const maxHealth = 'maxHealth' in card ? (card as any).maxHealth : card.health;
    const isReady = 'canAttack' in card ? (card as any).canAttack : false;
    const turnPlayed = 'turnPlayed' in card ? (card as any).turnPlayed : undefined;

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
                style={{
                    ...style,
                    borderRadius: 8,
                    overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#2d3748',
                    position: 'relative',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                }}
            >
                {card.imageUrl ? (
                    <img src={card.imageUrl} alt={card.name} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <div style={{ fontSize: '1.5rem', opacity: 0.5, color: 'white', fontWeight: 'bold' }}>{card.type}</div>
                )}
            </div>
        );
    }

    // --- Normal Variant (On Board / Hand) ---
    return (
        <div
            className={`card-container ${isReady ? 'ready' : ''}`}
            style={{
                ...style,
                cursor: onClick ? 'pointer' : 'default',
                transform: isSelected ? 'translateY(-20px)' : style?.transform, // Lift if selected
                boxShadow: glowColor || (isReady
                    ? '0 0 10px #f6e05e'
                    : style?.boxShadow),
                border: borderColor || (isPlayable ? '2px solid #48bb78' : undefined),
                transition: 'transform 0.2s, box-shadow 0.2s',
                display: 'flex', flexDirection: 'column',
                background: '#1a202c', // Fallback bg
                overflow: 'hidden' // Ensure contents encompass border radius
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

            {/* 2. Full Art Area (Fills rest) */}
            <div style={{ flex: 1, position: 'relative', width: '100%', overflow: 'hidden' }}>
                {card.imageUrl ? (
                    <>
                        <img
                            src={card.imageUrl}
                            alt={card.name}
                            draggable={false}
                            style={{
                                width: '100%', height: '100%', objectFit: 'cover',
                                transition: 'opacity 0.3s',
                                opacity: 1 // We could use state, but simple browser caching often works. 
                                // User requested: "Animation after loading". 
                                // We can use a ref and onLoad.
                            }}
                            onLoad={(e) => {
                                (e.target as HTMLImageElement).style.opacity = '1';
                            }}
                            ref={img => {
                                if (img && !img.complete) {
                                    img.style.opacity = '0';
                                }
                            }}
                        />
                        {/* Placeholder behind */}
                        <div style={{
                            position: 'absolute', inset: 0, zIndex: -1,
                            background: '#2d3748', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            ...
                        </div>
                    </>
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#4a5568', color: '#a0aec0', fontSize: '0.8rem' }}>
                        {card.type}
                    </div>
                )}

                {/* Overlaid Cost (Top Left) */}
                <div style={{
                    position: 'absolute', top: 2, left: 2,
                    width: 24, height: 24, borderRadius: '50%',
                    background: '#48bb78', border: '2px solid #fff',
                    color: 'white', fontSize: '0.9rem', fontWeight: 900,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.5), inset 0 2px 5px rgba(255,255,255,0.3)',
                    zIndex: 5
                }}>
                    {card.cost}
                </div>

                {/* Overlaid Description (Bottom Overlay - Optional, minimal visibility) */}
                {/* User requested "From there down ALL ILLUSTRATION", so we hide normal text box. */}
                {/* Maybe a very subtle gradient at bottom for stats legibility */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 40, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', pointerEvents: 'none', zIndex: 3 }} />

                {/* Stats (Bottom Corners) */}
                {/* Stats (Bottom Corners) */}
                {card.type === 'FOLLOWER' && (
                    <>
                        {/* Attack */}
                        <div style={{
                            position: 'absolute',
                            // If on board: Bottom Left. If in hand: Left side (above health)
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
                            <span style={{ zIndex: 11, color: 'white', fontWeight: 'bold', fontSize: '1.2rem', textShadow: '0 2px 2px black' }}>{attack}</span>
                        </div>

                        {/* Health */}
                        <div style={{
                            position: 'absolute',
                            // If on board: Bottom Right. If in hand: Bottom Left (Stacked under Attack)
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
                            <span style={{ zIndex: 11, color: isDamaged ? '#fc8181' : 'white', fontWeight: 'bold', fontSize: '1.2rem', textShadow: '0 2px 2px black' }}>{health}</span>
                        </div>
                    </>
                )}

                {/* WARD EFFECT - Only on Board */}
                {isWard && isOnBoard && (
                    <div style={{
                        position: 'absolute', inset: -8, zIndex: 10, pointerEvents: 'none',
                        filter: 'drop-shadow(0 0 8px rgba(236, 201, 75, 0.8))'
                    }}>
                        <svg viewBox="0 0 100 120" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                            <path d="M50 2 L96 20 V60 C96 90 50 116 50 116 C50 116 4 90 4 60 V20 Z"
                                fill="none" stroke="#ECC94B" strokeWidth="4" />
                            <path d="M50 2 L96 20 V60 C96 90 50 116 50 116 C50 116 4 90 4 60 V20 Z"
                                fill="rgba(236, 201, 75, 0.15)" stroke="none" />
                        </svg>
                    </div>
                )}

                {/* VISUAL: BARRIER (Vertical Oval Blue Glow) */}
                {hasBarrier && (
                    <div style={{
                        position: 'absolute',
                        inset: -10,
                        zIndex: 12,
                        pointerEvents: 'none',
                        borderRadius: '50%', // Vertical ovalish shape because card is vertical
                        border: '2px solid rgba(135, 206, 250, 0.4)',
                        background: 'radial-gradient(ellipse at center, rgba(176, 224, 230, 0.1) 0%, transparent 80%)',
                        boxShadow: '0 0 20px rgba(0, 191, 255, 0.6), inset 0 0 15px rgba(0, 191, 255, 0.4)',
                        animation: 'barrierPulseInner 2.5s infinite ease-in-out'
                    }}>
                        <style>{`
                            @keyframes barrierPulseInner {
                                0% { opacity: 0.5; transform: scale(1); box-shadow: 0 0 15px rgba(0, 191, 255, 0.5); }
                                50% { opacity: 0.9; transform: scale(1.02); box-shadow: 0 0 30px rgba(176, 224, 230, 0.8); }
                                100% { opacity: 0.5; transform: scale(1); box-shadow: 0 0 15px rgba(0, 191, 255, 0.5); }
                            }
                        `}</style>
                    </div>
                )}

                {/* VISUAL: AURA (Orange Pulsing Cross Icon) */}
                {isAura && (
                    <div style={{
                        position: 'absolute',
                        top: 5,
                        right: 5,
                        zIndex: 14,
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'auraIconPulse 2s infinite ease-in-out'
                    }}>
                        <div style={{
                            width: 20,
                            height: 20,
                            background: '#ed8936',
                            clipPath: 'polygon(35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%)',
                            filter: 'drop-shadow(0 0 8px #f6ad55)'
                        }} />
                        <style>{`
                            @keyframes auraIconPulse {
                                0% { filter: drop-shadow(0 0 5px #ed8936); transform: scale(0.95); opacity: 0.8; }
                                50% { filter: drop-shadow(0 0 15px #f6ad55); transform: scale(1.1); opacity: 1; }
                                100% { filter: drop-shadow(0 0 5px #ed8936); transform: scale(0.95); opacity: 0.8; }
                            }
                        `}</style>
                    </div>
                )}

                {/* VISUAL: STEALTH (Thin Semi-transparent Black Misty Effect) */}
                {isStealth && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 13,
                        pointerEvents: 'none',
                        background: 'linear-gradient(135deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0) 100%)',
                        backgroundColor: 'rgba(0,0,0,0.25)',
                        overflow: 'hidden',
                        borderRadius: 8
                    }}>
                        {/* Moving Smoke/Mist Layer */}
                        <div style={{
                            position: 'absolute',
                            inset: -50,
                            background: 'radial-gradient(circle at 50% 50%, rgba(50,50,50,0.2) 0%, transparent 60%)',
                            filter: 'blur(15px)',
                            animation: 'stealthFlow 8s infinite linear'
                        }} />
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            boxShadow: 'inset 0 0 25px rgba(0,0,0,0.7)',
                            opacity: 0.6
                        }} />
                        <style>{`
                            @keyframes stealthFlow {
                                0% { transform: translate(-10%, -10%) rotate(0deg); opacity: 0.4; }
                                50% { transform: translate(10%, 10%) rotate(180deg); opacity: 0.7; }
                                100% { transform: translate(-10%, -10%) rotate(360deg); opacity: 0.4; }
                            }
                        `}</style>
                    </div>
                )}
            </div>
        </div >
    );
};
