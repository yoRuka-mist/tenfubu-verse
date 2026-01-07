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

interface GalleryRelatedCardScreenProps {
    parentCardId: string;       // 元カードのID
    relatedCardIds: string[];   // 関連カードのID配列
    onBack: () => void;
}

export const GalleryRelatedCardScreen: React.FC<GalleryRelatedCardScreenProps> = ({
    parentCardId: _parentCardId,
    relatedCardIds,
    onBack
}) => {
    // Responsive scaling
    const [scale, setScale] = useState(1);

    // ページ管理
    const [currentPage, setCurrentPage] = useState(0);

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

    // 現在のカードID
    const currentCardId = relatedCardIds[currentPage];
    const card = MOCK_CARDS.find(c => c.id === currentCardId);

    // ページ送り関数
    const goToPrevPage = () => {
        setCurrentPage(prev =>
            prev > 0 ? prev - 1 : relatedCardIds.length - 1
        );
    };

    const goToNextPage = () => {
        setCurrentPage(prev =>
            prev < relatedCardIds.length - 1 ? prev + 1 : 0
        );
    };

    if (!card) {
        return (
            <div style={{
                minHeight: '100dvh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                color: 'white',
                fontFamily: 'Tamanegi, sans-serif',
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
    const cardImageWidth = 200 * scale;
    const cardImageHeight = 280 * scale;
    const imageGap = 1 * scale;

    // グラデーション背景
    const gradientBg = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)';

    // 矢印ボタンスタイル（詳細画面に合わせてコンパクト化）
    const arrowButtonStyle: React.CSSProperties = {
        fontSize: `${2 * scale}rem`,
        background: 'rgba(0, 0, 0, 0.5)',
        padding: `${0.8 * scale}rem ${1.2 * scale}rem`,
        borderRadius: `${8 * scale}px`,
        cursor: 'pointer',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        color: 'white',
        transition: 'all 0.2s',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    };

    return (
        <div style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            background: gradientBg,
            color: 'white',
            fontFamily: 'sans-serif',
            overflow: 'auto',
            paddingTop: `${20 * scale}px`
        }}>
            {/* 戻るボタン（左上、コンパクト化） */}
            <div style={{
                position: 'absolute',
                top: `${15 * scale}px`,
                left: `${15 * scale}px`,
                zIndex: 100
            }}>
                <button
                    onClick={onBack}
                    style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        padding: `${8 * scale}px ${16 * scale}px`,
                        fontSize: `${0.9 * scale}rem`,
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: `${6 * scale}px`,
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

            {/* ページ番号（右上） */}
            <div style={{
                position: 'absolute',
                top: `${15 * scale}px`,
                right: `${15 * scale}px`,
                zIndex: 100,
                fontSize: `${1 * scale}rem`,
                opacity: 0.8,
                fontWeight: 'bold',
                background: 'rgba(0, 0, 0, 0.5)',
                padding: `${8 * scale}px ${16 * scale}px`,
                borderRadius: `${6 * scale}px`,
                border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
                {currentPage + 1} / {relatedCardIds.length}
            </div>

            {/* メインコンテンツ: 左右レイアウト（イラスト優先） */}
            <div style={{
                display: 'flex',
                gap: `${2 * scale}rem`,
                padding: `${20 * scale}px ${30 * scale}px`,
                flex: 1,
                justifyContent: 'center',
                alignItems: 'flex-start',
                maxWidth: `${1200 * scale}px`,
                width: '100%',
                margin: '0 auto'
            }}>
                {/* 左矢印ボタン */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    flex: '0 0 auto'
                }}>
                    <button
                        onClick={goToPrevPage}
                        style={arrowButtonStyle}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)'}
                    >
                        &lt;
                    </button>
                </div>

                {/* 中央: イラスト表示エリア（横2列配置または中央配置、固定幅） */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: `${1 * scale}rem`,
                    flex: '0 0 auto',
                    width: `${(cardImageWidth * 2 + imageGap * 16)}px` // 固定幅（2枚分）
                }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        justifyContent: card.type === 'SPELL' ? 'center' : 'flex-start',
                        gap: `${imageGap}rem`,
                        width: '100%'
                    }}>
                    {card.type === 'FOLLOWER' ? (
                        <>
                            {/* 通常イラスト */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: `${0.5 * scale}rem` }}>
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
                                    fontSize: `${0.75 * scale}rem`,
                                    color: '#aaa',
                                    textAlign: 'center'
                                }}>
                                    通常
                                </div>
                            </div>
                            {/* 進化後イラスト */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: `${0.5 * scale}rem` }}>
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
                                    fontSize: `${0.75 * scale}rem`,
                                    color: '#ffd700',
                                    textAlign: 'center'
                                }}>
                                    進化後
                                </div>
                            </div>
                        </>
                    ) : (
                        // SPELL: 1枚のみ
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: `${0.5 * scale}rem` }}>
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
                        </div>
                    )}
                    </div>
                </div>

                {/* 右矢印ボタン */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    flex: '0 0 auto'
                }}>
                    <button
                        onClick={goToNextPage}
                        style={arrowButtonStyle}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)'}
                    >
                        &gt;
                    </button>
                </div>

                {/* 右側: カード情報エリア（固定幅） */}
                <div style={{
                    flex: '0 0 auto',
                    width: `${450 * scale}px`,
                    background: 'rgba(0, 0, 0, 0.5)',
                    padding: `${25 * scale}px`,
                    borderRadius: `${12 * scale}px`,
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: `${18 * scale}px`,
                    minHeight: `${450 * scale}px`,
                    maxHeight: `${550 * scale}px`,
                    overflowY: 'auto'
                }}>
                    {/* カード名 */}
                    <h2 style={{
                        fontSize: `${1.8 * scale}rem`,
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
                        gap: `${20 * scale}px`,
                        fontSize: `${1.2 * scale}rem`,
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
                            fontSize: `${1.1 * scale}rem`,
                            margin: `0 0 ${8 * scale}px 0`,
                            color: '#aaa'
                        }}>
                            効果
                        </h3>
                        <p style={{
                            fontSize: `${1 * scale}rem`,
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.7,
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
                                    fontSize: `${1.1 * scale}rem`,
                                    margin: `0 0 ${8 * scale}px 0`,
                                    color: '#aaa'
                                }}>
                                    フレーバーテキスト
                                </h3>
                                <p style={{
                                    fontSize: `${0.95 * scale}rem`,
                                    margin: 0,
                                    fontStyle: 'italic',
                                    opacity: 0.7,
                                    lineHeight: 1.7,
                                    whiteSpace: 'pre-wrap',
                                    color: '#ccc'
                                }}>
                                    {card.flavorText}
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
