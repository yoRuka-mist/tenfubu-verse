import React, { useState, useEffect } from 'react';
import { MOCK_CARDS } from '../core/engine';

// Helper function to resolve asset paths with base URL for GitHub Pages deployment
const getAssetUrl = (path: string): string => {
    const base = import.meta.env.BASE_URL || '/';
    // Remove leading slash from path if base already ends with /
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${base}${cleanPath}`;
};

// Base dimensions for scaling
const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;

interface GalleryCardDetailScreenProps {
    cardId: string;
    onOpenRelatedCard: (cardId: string) => void;
    onBack: () => void;
}

export const GalleryCardDetailScreen: React.FC<GalleryCardDetailScreenProps> = ({
    cardId,
    onOpenRelatedCard,
    onBack
}) => {
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

    // カードデータ取得
    const card = MOCK_CARDS.find(c => c.id === cardId);

    if (!card) {
        return (
            <div style={{
                minHeight: '100dvh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                color: 'white',
                fontFamily: 'sans-serif',
                fontSize: `${1.5 * scale}rem`
            }}>
                カードが見つかりませんでした
            </div>
        );
    }

    // イラスト画像URL取得
    const getImageUrl = (imageUrl: string | undefined, defaultPath: string): string => {
        return getAssetUrl(imageUrl || defaultPath);
    };

    // 通常イラスト
    const normalImageUrl = getImageUrl(card.imageUrl, `/cards/${card.id}.png`);
    // 進化後イラスト（FOLLOWERのみ）
    const evolvedImageUrl = card.type === 'FOLLOWER'
        ? getImageUrl(card.evolvedImageUrl, `/cards/${card.id}_evolved.png`)
        : null;

    // イラストサイズ
    const cardImageWidth = 250 * scale;
    const cardImageHeight = 350 * scale;
    const imageGap = 1.5 * scale;

    // グラデーション背景
    const gradientBg = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)';

    return (
        <div style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            background: gradientBg,
            color: 'white',
            fontFamily: 'sans-serif',
            overflow: 'auto'
        }}>
            {/* 戻るボタン（左上固定） */}
            <div style={{
                position: 'sticky',
                top: 0,
                left: 0,
                padding: `${20 * scale}px`,
                zIndex: 100,
                background: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(10px)'
            }}>
                <button
                    onClick={onBack}
                    style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        padding: `${10 * scale}px ${20 * scale}px`,
                        fontSize: `${1 * scale}rem`,
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: `${8 * scale}px`,
                        color: 'white',
                        cursor: 'pointer',
                        fontFamily: 'sans-serif',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                >
                    戻る
                </button>
            </div>

            {/* メインコンテンツ: 左右レイアウト */}
            <div style={{
                display: 'flex',
                gap: `${3 * scale}rem`,
                padding: `${30 * scale}px`,
                flex: 1,
                justifyContent: 'center',
                alignItems: 'flex-start',
                maxWidth: `${1100 * scale}px`,
                width: '100%',
                margin: '0 auto'
            }}>
                {/* 左側: イラスト表示エリア */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: `${imageGap}rem`,
                    flex: '0 0 auto'
                }}>
                    {card.type === 'FOLLOWER' ? (
                        <>
                            {/* 通常イラスト */}
                            <div style={{
                                width: cardImageWidth,
                                height: cardImageHeight,
                                border: '2px solid rgba(255, 255, 255, 0.3)',
                                borderRadius: `${12 * scale}px`,
                                overflow: 'hidden',
                                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
                                background: 'rgba(0, 0, 0, 0.3)'
                            }}>
                                <img
                                    src={normalImageUrl}
                                    alt={`${card.name} 通常`}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                    }}
                                />
                            </div>
                            <div style={{
                                fontSize: `${0.8 * scale}rem`,
                                color: '#aaa',
                                textAlign: 'center'
                            }}>
                                通常
                            </div>
                            {/* 進化後イラスト */}
                            <div style={{
                                width: cardImageWidth,
                                height: cardImageHeight,
                                border: '2px solid rgba(255, 215, 0, 0.5)',
                                borderRadius: `${12 * scale}px`,
                                overflow: 'hidden',
                                boxShadow: '0 8px 30px rgba(255, 215, 0, 0.3)',
                                background: 'rgba(0, 0, 0, 0.3)'
                            }}>
                                <img
                                    src={evolvedImageUrl || normalImageUrl}
                                    alt={`${card.name} 進化後`}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                    }}
                                />
                            </div>
                            <div style={{
                                fontSize: `${0.8 * scale}rem`,
                                color: '#ffd700',
                                textAlign: 'center'
                            }}>
                                進化後
                            </div>
                        </>
                    ) : (
                        // SPELL: 1枚のみ
                        <>
                            <div style={{
                                width: cardImageWidth,
                                height: cardImageHeight,
                                border: '2px solid rgba(138, 43, 226, 0.5)',
                                borderRadius: `${12 * scale}px`,
                                overflow: 'hidden',
                                boxShadow: '0 8px 30px rgba(138, 43, 226, 0.3)',
                                background: 'rgba(0, 0, 0, 0.3)'
                            }}>
                                <img
                                    src={normalImageUrl}
                                    alt={card.name}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                    }}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* 右側: カード情報エリア */}
                <div style={{
                    flex: 1,
                    background: 'rgba(0, 0, 0, 0.5)',
                    padding: `${30 * scale}px`,
                    borderRadius: `${12 * scale}px`,
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: `${20 * scale}px`,
                    minHeight: `${500 * scale}px`,
                    maxHeight: `${600 * scale}px`,
                    overflowY: 'auto'
                }}>
                    {/* カード名 */}
                    <h2 style={{
                        fontSize: `${2 * scale}rem`,
                        fontWeight: 'bold',
                        margin: 0,
                        color: '#fff',
                        textAlign: 'left'
                    }}>
                        {card.name}
                    </h2>

                    {/* コスト・攻撃力・体力 */}
                    <div style={{
                        display: 'flex',
                        gap: `${25 * scale}px`,
                        fontSize: `${1.3 * scale}rem`,
                        flexWrap: 'wrap'
                    }}>
                        <div style={{ color: '#ffd700' }}>
                            コスト: <span style={{ fontWeight: 'bold' }}>{card.cost}</span>
                        </div>
                        {card.type === 'FOLLOWER' && (
                            <>
                                <div style={{ color: '#ff6b6b' }}>
                                    攻撃力: <span style={{ fontWeight: 'bold' }}>{card.attack}</span>
                                </div>
                                <div style={{ color: '#4ecdc4' }}>
                                    体力: <span style={{ fontWeight: 'bold' }}>{card.health}</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* 区切り線 */}
                    <div style={{
                        height: '1px',
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)'
                    }} />

                    {/* 効果テキスト */}
                    <div>
                        <h3 style={{
                            fontSize: `${1.2 * scale}rem`,
                            margin: `0 0 ${10 * scale}px 0`,
                            color: '#aaa'
                        }}>
                            効果
                        </h3>
                        <p style={{
                            fontSize: `${1.05 * scale}rem`,
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.8,
                            color: '#fff'
                        }}>
                            {card.description}
                        </p>
                    </div>

                    {/* フレーバーテキスト */}
                    {card.flavorText && (
                        <>
                            <div style={{
                                height: '1px',
                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)'
                            }} />
                            <div>
                                <h3 style={{
                                    fontSize: `${1.2 * scale}rem`,
                                    margin: `0 0 ${10 * scale}px 0`,
                                    color: '#aaa'
                                }}>
                                    フレーバーテキスト
                                </h3>
                                <p style={{
                                    fontSize: `${1 * scale}rem`,
                                    margin: 0,
                                    fontStyle: 'italic',
                                    opacity: 0.7,
                                    lineHeight: 1.8,
                                    whiteSpace: 'pre-wrap',
                                    color: '#ccc'
                                }}>
                                    {card.flavorText}
                                </p>
                            </div>
                        </>
                    )}

                    {/* 関連カードボタン */}
                    {card.relatedCards && card.relatedCards.length > 0 && (
                        <>
                            <div style={{
                                height: '1px',
                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)'
                            }} />
                            <div style={{
                                display: 'flex',
                                justifyContent: 'flex-start'
                            }}>
                                <button
                                    onClick={() => onOpenRelatedCard(cardId)}
                                    style={{
                                        padding: `${1 * scale}rem ${2 * scale}rem`,
                                        background: '#4ade80',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: `${8 * scale}px`,
                                        fontSize: `${1.1 * scale}rem`,
                                        fontWeight: 'bold',
                                        fontFamily: 'sans-serif',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 4px 15px rgba(74, 222, 128, 0.3)'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = '#22c55e';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(74, 222, 128, 0.4)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = '#4ade80';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(74, 222, 128, 0.3)';
                                    }}
                                >
                                    関連カード ({card.relatedCards.length})
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
