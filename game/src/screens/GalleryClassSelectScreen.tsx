import React, { useState, useEffect } from 'react';
import { ClassType } from '../core/types';

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

// Base dimensions for scaling (same as GameScreen)
const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;

interface GalleryClassSelectScreenProps {
    onSelectClass: (classType: ClassType) => void;
    onBack: () => void;
}

export const GalleryClassSelectScreen: React.FC<GalleryClassSelectScreenProps> = ({
    onSelectClass,
    onBack
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
    const cardWidth = 200 * scale;
    const cardHeight = 280 * scale;
    const titleSize = 2 * scale;
    const classNameSize = 1.4 * scale;
    const gap = 1.2 * scale;
    const buttonPadding = `${8 * scale}px ${16 * scale}px`;

    return (
        <div className="screen" style={{
            height: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.9) 0%, rgba(22, 33, 62, 0.9) 50%, rgba(15, 52, 96, 0.9) 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            color: 'white',
            position: 'relative'
        }}>
            {/* Back Button - Top Left */}
            <button
                onClick={onBack}
                style={{
                    position: 'absolute',
                    top: `${20 * scale}px`,
                    left: `${20 * scale}px`,
                    background: '#333',
                    padding: buttonPadding,
                    fontSize: `${0.9 * scale}rem`,
                    border: '1px solid #555',
                    borderRadius: 6 * scale,
                    color: 'white',
                    cursor: 'pointer',
                    fontFamily: 'Tamanegi, sans-serif',
                    transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#444'}
                onMouseOut={(e) => e.currentTarget.style.background = '#333'}
            >
                タイトルに戻る
            </button>

            {/* Title */}
            <h2 style={{
                fontSize: `${titleSize}rem`,
                marginBottom: `${1.5 * scale}rem`,
                marginTop: 0,
                fontFamily: 'Tamanegi, sans-serif'
            }}>
                ギャラリー - クラス選択
            </h2>

            {/* Class Cards */}
            <div style={{
                display: 'flex',
                gap: `${gap}rem`,
                marginBottom: `${1 * scale}rem`
            }}>
                {/* Senka Class */}
                <div
                    onClick={() => onSelectClass('SENKA')}
                    style={{
                        width: cardWidth,
                        height: cardHeight,
                        border: '1px solid #444',
                        borderRadius: 10 * scale,
                        background: 'linear-gradient(180deg, #2c0b0e 0%, #1a1a2e 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        boxShadow: '0 4px 20px rgba(233, 69, 96, 0.2)',
                        overflow: 'hidden',
                        position: 'relative'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 8px 30px rgba(233, 69, 96, 0.4)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(233, 69, 96, 0.2)';
                    }}
                >
                    <img
                        src={senkaLeaderImg}
                        alt="Senka"
                        style={{
                            width: '100%',
                            height: '75%',
                            objectFit: 'cover'
                        }}
                    />
                    <div style={{
                        padding: `${8 * scale}px`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: '100%',
                        justifyContent: 'center',
                        flex: 1
                    }}>
                        <h3 style={{
                            fontSize: `${classNameSize}rem`,
                            color: '#e94560',
                            margin: 0,
                            fontFamily: 'Tamanegi, sans-serif'
                        }}>
                            盞華
                        </h3>
                    </div>
                </div>

                {/* Aja Class */}
                <div
                    onClick={() => onSelectClass('AJA')}
                    style={{
                        width: cardWidth,
                        height: cardHeight,
                        border: '1px solid #444',
                        borderRadius: 10 * scale,
                        background: 'linear-gradient(180deg, #0f1c2e 0%, #1a1a2e 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        boxShadow: '0 4px 20px rgba(69, 162, 233, 0.2)',
                        overflow: 'hidden',
                        position: 'relative'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 8px 30px rgba(69, 162, 233, 0.4)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(69, 162, 233, 0.2)';
                    }}
                >
                    <img
                        src={azyaLeaderImg}
                        alt="Azya"
                        style={{
                            width: '100%',
                            height: '75%',
                            objectFit: 'cover',
                            objectPosition: 'center top'
                        }}
                    />
                    <div style={{
                        padding: `${8 * scale}px`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: '100%',
                        justifyContent: 'center',
                        flex: 1
                    }}>
                        <h3 style={{
                            fontSize: `${classNameSize}rem`,
                            color: '#45a2e9',
                            margin: 0,
                            fontFamily: 'Tamanegi, sans-serif'
                        }}>
                            あじゃ
                        </h3>
                    </div>
                </div>

                {/* Yoruka Class */}
                <div
                    onClick={() => onSelectClass('YORUKA')}
                    style={{
                        width: cardWidth,
                        height: cardHeight,
                        border: '1px solid #444',
                        borderRadius: 10 * scale,
                        background: 'linear-gradient(180deg, #1a0f2e 0%, #1a1a2e 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        boxShadow: '0 4px 20px rgba(168, 85, 247, 0.2)',
                        overflow: 'hidden',
                        position: 'relative'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 8px 30px rgba(168, 85, 247, 0.4)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(168, 85, 247, 0.2)';
                    }}
                >
                    <img
                        src={yorukaLeaderImg}
                        alt="Yoruka"
                        style={{
                            width: '100%',
                            height: '75%',
                            objectFit: 'cover'
                        }}
                    />
                    <div style={{
                        padding: `${8 * scale}px`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: '100%',
                        justifyContent: 'center',
                        flex: 1
                    }}>
                        <h3 style={{
                            fontSize: `${classNameSize}rem`,
                            color: '#a855f7',
                            margin: 0,
                            fontFamily: 'Tamanegi, sans-serif'
                        }}>
                            Y
                        </h3>
                    </div>
                </div>
            </div>
        </div>
    );
};
