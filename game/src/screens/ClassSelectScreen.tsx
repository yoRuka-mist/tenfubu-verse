import React, { useState, useEffect } from 'react';
import { ClassType, AIDifficulty } from '../core/types';

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
const yorukaSecretImg = getAssetUrl('/leaders/yoruka_secret.png');

// Base dimensions for scaling (same as GameScreen)
const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;

interface ClassSelectScreenProps {
    onSelectClass: (cls: ClassType) => void;
    onBack: () => void;
    gameMode?: 'CPU' | 'HOST' | 'JOIN';
    aiDifficulty?: AIDifficulty;
    onDifficultyChange?: (difficulty: AIDifficulty) => void;
}

export const ClassSelectScreen: React.FC<ClassSelectScreenProps> = ({
    onSelectClass,
    onBack,
    gameMode = 'CPU',
    aiDifficulty = 'NORMAL',
    onDifficultyChange
}) => {
    // Responsive scaling (same approach as GameScreen)
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const updateScale = () => {
            const scaleX = window.innerWidth / BASE_WIDTH;
            const scaleY = window.innerHeight / BASE_HEIGHT;
            setScale(Math.min(scaleX, scaleY));
        };
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    // Base sizes
    const cardWidth = 250 * scale;
    const cardHeight = 350 * scale;
    const titleSize = 2.5 * scale;
    const classNameSize = 2 * scale;
    const subtitleSize = 0.9 * scale;
    const descSize = 0.8 * scale;
    const gap = 2 * scale;
    const buttonPadding = `${10 * scale}px ${20 * scale}px`;

    return (
        <div className="screen" style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1a1a2e',
            color: 'white'
        }}>
            <h2 style={{ fontSize: `${titleSize}rem`, marginBottom: `${3 * scale}rem` }}>クラスを選択</h2>

            <div style={{ display: 'flex', gap: `${gap}rem`, marginBottom: `${3 * scale}rem` }}>
                {/* Senka Class */}
                <div
                    onClick={() => onSelectClass('SENKA')}
                    style={{
                        width: cardWidth,
                        height: cardHeight,
                        border: '1px solid #444',
                        borderRadius: 12 * scale,
                        background: 'linear-gradient(180deg, #2c0b0e 0%, #1a1a2e 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        boxShadow: '0 4px 20px rgba(233, 69, 96, 0.2)',
                        overflow: 'hidden',
                        position: 'relative'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <img src={senkaLeaderImg} alt="Senka" style={{ width: '100%', height: '60%', objectFit: 'cover' }} />
                    <div style={{ padding: `${10 * scale}px`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h3 style={{ fontSize: `${classNameSize}rem`, color: '#e94560', margin: 0 }}>盞華</h3>
                        <p style={{ color: '#aaa', margin: `${5 * scale}px 0`, fontSize: `${subtitleSize}rem`, fontFamily: 'Tamanegi, sans-serif' }}>アグロ / ラッシュ</p>
                        <p style={{ padding: `0 ${1 * scale}rem`, textAlign: 'center', fontSize: `${descSize}rem`, opacity: 0.8, fontFamily: 'Tamanegi, sans-serif' }}>
                            突進フォロワーと多面展開で<br />相手を圧倒する。
                        </p>
                    </div>
                </div>

                {/* Aja Class */}
                <div
                    onClick={() => onSelectClass('AJA')}
                    style={{
                        width: cardWidth,
                        height: cardHeight,
                        border: '1px solid #444',
                        borderRadius: 12 * scale,
                        background: 'linear-gradient(180deg, #0f1c2e 0%, #1a1a2e 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        boxShadow: '0 4px 20px rgba(69, 162, 233, 0.2)',
                        overflow: 'hidden',
                        position: 'relative'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <img src={azyaLeaderImg} alt="Azya" style={{ width: '100%', height: '60%', objectFit: 'cover' }} />
                    <div style={{ padding: `${10 * scale}px`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h3 style={{ fontSize: `${classNameSize}rem`, color: '#45a2e9', margin: 0 }}>あじゃ</h3>
                        <p style={{ color: '#aaa', margin: `${5 * scale}px 0`, fontSize: `${subtitleSize}rem`, fontFamily: 'Tamanegi, sans-serif' }}>コントロール / テクニカル</p>
                        <p style={{ padding: `0 ${1 * scale}rem`, textAlign: 'center', fontSize: `${descSize}rem`, opacity: 0.8, fontFamily: 'Tamanegi, sans-serif' }}>
                            強力な除去と堅牢な守護で<br />盤面を支配する。
                        </p>
                    </div>
                </div>
            </div>

            {/* Difficulty Selector - Only show for CPU mode */}
            {gameMode === 'CPU' && onDifficultyChange && (
                <div style={{
                    marginBottom: `${2 * scale}rem`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: `${0.5 * scale}rem`
                }}>
                    <p style={{ fontSize: `${1 * scale}rem`, opacity: 0.8, fontFamily: 'Tamanegi, sans-serif', marginBottom: `${0.5 * scale}rem` }}>
                        難易度を選択
                    </p>
                    <div style={{ display: 'flex', gap: `${1 * scale}rem` }}>
                        {(['EASY', 'NORMAL', 'HARD'] as AIDifficulty[]).map((diff) => (
                            <button
                                key={diff}
                                onClick={() => onDifficultyChange(diff)}
                                style={{
                                    padding: `${8 * scale}px ${20 * scale}px`,
                                    fontSize: `${0.9 * scale}rem`,
                                    background: aiDifficulty === diff
                                        ? (diff === 'EASY' ? '#48bb78' : diff === 'NORMAL' ? '#e94560' : '#9f7aea')
                                        : 'transparent',
                                    border: `2px solid ${diff === 'EASY' ? '#48bb78' : diff === 'NORMAL' ? '#e94560' : '#9f7aea'}`,
                                    color: '#fff',
                                    cursor: 'pointer',
                                    borderRadius: 4 * scale,
                                    fontFamily: 'Tamanegi, sans-serif',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {diff === 'EASY' ? 'かんたん' : diff === 'NORMAL' ? 'ふつう' : 'むずかしい'}
                            </button>
                        ))}
                    </div>
                    <p style={{
                        fontSize: `${0.75 * scale}rem`,
                        opacity: 0.6,
                        fontFamily: 'Tamanegi, sans-serif',
                        marginTop: `${0.3 * scale}rem`
                    }}>
                        {aiDifficulty === 'EASY' && '初心者向け。CPUは単純な行動をとります。'}
                        {aiDifficulty === 'NORMAL' && '標準的な難易度。CPUは基本的な戦略を使います。'}
                        {aiDifficulty === 'HARD' && '上級者向け。CPUは効果的な戦略で挑んできます。'}
                    </p>
                </div>
            )}

            <button onClick={onBack} style={{ background: '#333', padding: buttonPadding, fontSize: `${1 * scale}rem`, marginBottom: `${1.5 * scale}rem` }}>タイトルに戻る</button>

            {/* Hidden Character - yoRuka Secret Entry */}
            <div
                onClick={() => onSelectClass('YORUKA')}
                style={{
                    position: 'absolute',
                    bottom: 20 * scale,
                    right: 20 * scale,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    opacity: 0.6,
                }}
            >
                <img
                    src={yorukaSecretImg}
                    alt="?"
                    style={{
                        width: 80 * scale,
                        height: 80 * scale,
                        objectFit: 'contain',
                    }}
                />
                <div style={{
                    marginTop: 8 * scale,
                    padding: `${4 * scale}px ${10 * scale}px`,
                    background: 'rgba(0, 0, 0, 0.7)',
                    borderRadius: 8 * scale,
                    fontSize: `${0.7 * scale}rem`,
                    color: '#e2e8f0',
                    fontFamily: 'Tamanegi, sans-serif',
                    whiteSpace: 'nowrap',
                }}>
                    ほぼAIで作りました
                </div>
            </div>
        </div>
    );
};
