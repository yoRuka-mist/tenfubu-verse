import React, { useState, useEffect } from 'react';

// Helper function to resolve asset paths with base URL for GitHub Pages deployment
const getAssetUrl = (path: string): string => {
    const base = import.meta.env.BASE_URL || '/';
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${base}${cleanPath}`;
};

// Base dimensions for scaling
const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;

interface TitleScreenProps {
    onStartConfig: (mode: 'CPU' | 'HOST' | 'JOIN', roomId?: string) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStartConfig }) => {
    const [showJoinInput, setShowJoinInput] = useState(false);
    const [joinId, setJoinId] = useState('');

    // Responsive scaling
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

    // Scaled sizes
    const logoSize = 500 * scale; // 3x larger logo
    const titleFontSize = 9 * scale; // Much larger title
    const verseFontSize = 4.5 * scale; // Much larger verse
    const buttonWidth = 300 * scale;
    const buttonFontSize = 1.2 * scale;
    const buttonPadding = `${1 * scale}rem 0`;

    const btnStyle: React.CSSProperties = {
        fontSize: `${buttonFontSize}rem`,
        padding: buttonPadding,
        background: 'transparent',
        border: '2px solid #e94560',
        color: '#fff',
        cursor: 'pointer',
        transition: 'all 0.3s',
        borderRadius: 4 * scale,
        fontWeight: 'bold',
        letterSpacing: '1px',
        width: '100%'
    };

    return (
        <div className="screen title-screen" style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            color: 'white'
        }}>
            {/* Background Layer - will show background image when added */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${getAssetUrl('/title/background.png')})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                zIndex: 0
            }} />

            {/* Fallback gradient background */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                zIndex: -1
            }} />

            {/* Dark overlay for readability */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.3)',
                zIndex: 1
            }} />

            {/* Content */}
            <div style={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {/* Title Logo Area - Logo behind text, centered between 下 and 布 */}
                <div style={{
                    position: 'relative',
                    marginBottom: `${1 * scale}rem`
                }}>
                    {/* Logo - positioned absolutely behind text, centered between 下 and 布 */}
                    <img
                        src={getAssetUrl('/title/logo.png')}
                        alt="Logo"
                        style={{
                            position: 'absolute',
                            width: logoSize,
                            height: logoSize,
                            objectFit: 'contain',
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.6))',
                            zIndex: 0
                        }}
                    />

                    {/* 天下布舞 - equal spacing, on top of logo */}
                    <div style={{
                        position: 'relative',
                        zIndex: 1,
                        fontFamily: 'Tamanegi, sans-serif',
                        fontSize: `${titleFontSize}rem`,
                        color: '#fff',
                        textShadow: '0 0 30px rgba(233, 69, 96, 0.9), 0 0 60px rgba(233, 69, 96, 0.5), 3px 3px 6px rgba(0,0,0,0.9)',
                        letterSpacing: `${0.5 * scale}rem`,
                        whiteSpace: 'nowrap'
                    }}>
                        天下布舞
                    </div>
                </div>

                {/* verse subtitle */}
                <div style={{
                    fontFamily: 'Tamanegi, sans-serif',
                    fontSize: `${verseFontSize}rem`,
                    color: '#e94560',
                    textShadow: '0 0 20px rgba(233, 69, 96, 0.8), 0 0 40px rgba(233, 69, 96, 0.4), 3px 3px 6px rgba(0,0,0,0.9)',
                    letterSpacing: `${0.8 * scale}rem`,
                    marginTop: `${0.5 * scale}rem`,
                    marginBottom: `${2.5 * scale}rem`
                }}>
                    verse
                </div>

                {/* Menu Buttons */}
                {!showJoinInput ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: `${1.5 * scale}rem`, width: buttonWidth }}>
                        <button
                            onClick={() => onStartConfig('CPU')}
                            style={btnStyle}
                            onMouseOver={(e) => e.currentTarget.style.background = '#e94560'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            ひとりで遊ぶ
                        </button>

                        <button
                            onClick={() => onStartConfig('HOST')}
                            style={btnStyle}
                            onMouseOver={(e) => e.currentTarget.style.background = '#e94560'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            部屋を作る
                        </button>

                        <button
                            onClick={() => setShowJoinInput(true)}
                            style={btnStyle}
                            onMouseOver={(e) => e.currentTarget.style.background = '#e94560'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            部屋に入る
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: `${1 * scale}rem`, width: buttonWidth }}>
                        <input
                            type="text"
                            placeholder="ルームIDを入力"
                            value={joinId}
                            onChange={(e) => setJoinId(e.target.value)}
                            style={{
                                padding: `${1 * scale}rem`,
                                fontSize: `${1.2 * scale}rem`,
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid #444',
                                color: 'white',
                                borderRadius: 4 * scale,
                                textAlign: 'center'
                            }}
                        />
                        <button
                            onClick={() => onStartConfig('JOIN', joinId)}
                            disabled={!joinId}
                            style={{ ...btnStyle, opacity: joinId ? 1 : 0.5 }}
                        >
                            接続
                        </button>
                        <button
                            onClick={() => setShowJoinInput(false)}
                            style={{ ...btnStyle, border: 'none', fontSize: `${1 * scale}rem`, color: '#888' }}
                        >
                            戻る
                        </button>
                    </div>
                )}

                <p style={{ marginTop: `${3 * scale}rem`, opacity: 0.5, fontSize: `${0.8 * scale}rem` }}>Ver 0.2.0 P2P Alpha</p>
            </div>
        </div>
    );
};
