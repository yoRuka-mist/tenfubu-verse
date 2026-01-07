import React, { useState, useEffect } from 'react';
import { ClassType } from '../core/types';
import { MOCK_CARDS, SENKA_DECK_TEMPLATE, AJA_DECK_TEMPLATE, YORUKA_DECK_TEMPLATE } from '../core/engine';

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

interface GalleryCardListScreenProps {
    classType: ClassType;
    onSelectCard: (cardId: string) => void;
}

// クラスごとの色設定
const CLASS_COLORS = {
    SENKA: {
        primary: '#e94560',
        gradient: 'linear-gradient(135deg, #2c0b0e 0%, #1a1a2e 100%)',
        shadow: 'rgba(233, 69, 96, 0.3)'
    },
    AJA: {
        primary: '#45a2e9',
        gradient: 'linear-gradient(135deg, #0f1c2e 0%, #1a1a2e 100%)',
        shadow: 'rgba(69, 162, 233, 0.3)'
    },
    YORUKA: {
        primary: '#a855f7',
        gradient: 'linear-gradient(135deg, #1a0f2e 0%, #1a1a2e 100%)',
        shadow: 'rgba(168, 85, 247, 0.3)'
    }
};

// クラス名の日本語表記
const CLASS_NAMES = {
    SENKA: '盞華',
    AJA: 'あじゃ',
    YORUKA: 'Y'
};

// リーダー画像のマッピング
const LEADER_IMAGES: Record<ClassType, string> = {
    SENKA: senkaLeaderImg,
    AJA: azyaLeaderImg,
    YORUKA: yorukaLeaderImg
};

// 全クラスのリスト
const ALL_CLASSES: ClassType[] = ['SENKA', 'AJA', 'YORUKA'];

export const GalleryCardListScreen: React.FC<GalleryCardListScreenProps> = ({
    classType,
    onSelectCard
}) => {
    // Responsive scaling
    const [scale, setScale] = useState(1);

    // 現在のクラスインデックス
    const [currentClassIndex, setCurrentClassIndex] = useState(
        ALL_CLASSES.indexOf(classType)
    );

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

    // デッキテンプレートを取得
    const getDeckTemplate = (cls: ClassType) => {
        return cls === 'SENKA' ? SENKA_DECK_TEMPLATE :
               cls === 'AJA' ? AJA_DECK_TEMPLATE : YORUKA_DECK_TEMPLATE;
    };

    // 現在のクラス
    const currentClass = ALL_CLASSES[currentClassIndex];
    const template = getDeckTemplate(currentClass);

    // カードデータと枚数を取得（トークンを除外し、コスト順でソート）
    const cardsWithCount = template
        .filter(entry => !entry.cardId.startsWith('TOKEN_'))
        .map(entry => ({
            card: MOCK_CARDS.find(c => c.id === entry.cardId)!,
            count: entry.count
        }))
        .filter(item => item.card) // undefinedを除外
        .sort((a, b) => a.card.cost - b.card.cost); // コスト順でソート

    // コスト帯別の枚数を集計
    const costCounts: { [cost: number]: number } = {};
    cardsWithCount.forEach(({ card, count }) => {
        costCounts[card.cost] = (costCounts[card.cost] || 0) + count;
    });

    // コストの最大値を取得（グラフのX軸範囲用）
    const maxCost = Math.max(...Object.keys(costCounts).map(Number), 10);
    // 枚数の最大値を取得（グラフのY軸スケール用）
    const maxCount = Math.max(...Object.values(costCounts), 1);

    // クラスカラー取得
    const classColor = CLASS_COLORS[currentClass];
    const className = CLASS_NAMES[currentClass];
    const leaderImage = LEADER_IMAGES[currentClass];

    // サイズ設定
    const leaderCardWidth = 180 * scale;
    const leaderCardHeight = 250 * scale;
    const cardWidth = 110 * scale;
    const cardHeight = 155 * scale;
    const gap = 0.6 * scale;
    const titleSize = 1.8 * scale;

    // リーダー切り替え
    const handlePrevClass = () => {
        setCurrentClassIndex((prev) => (prev - 1 + ALL_CLASSES.length) % ALL_CLASSES.length);
    };

    const handleNextClass = () => {
        setCurrentClassIndex((prev) => (prev + 1) % ALL_CLASSES.length);
    };

    return (
        <div style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            background: classColor.gradient,
            color: 'white',
            position: 'relative',
            paddingTop: `${10 * scale}px`,
            paddingBottom: `${120 * scale}px` // タブ分のスペース確保
        }}>
            {/* タイトル */}
            <h2 style={{
                fontSize: `${titleSize}rem`,
                marginTop: `${0}px`,
                marginBottom: `${10 * scale}px`,
                fontFamily: 'sans-serif',
                color: classColor.primary,
                textShadow: `0 0 20px ${classColor.shadow}`
            }}>
                {className} - カード一覧
            </h2>

            {/* メインコンテンツ: 左側リーダー + 右側カードグリッド */}
            <div style={{
                display: 'flex',
                gap: `${2 * scale}rem`,
                width: '95%',
                maxWidth: `${1100 * scale}px`,
                alignItems: 'flex-start',
                justifyContent: 'center'
            }}>
                {/* 左側: リーダー表示（左右にボタン配置） + コスト帯グラフ */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: `${1.5 * scale}rem`
                }}>
                    {/* リーダーカード + ボタン */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: `${0.8 * scale}rem`
                    }}>
                    {/* 前のクラスボタン */}
                    <button
                        onClick={handlePrevClass}
                        style={{
                            width: `${45 * scale}px`,
                            height: `${45 * scale}px`,
                            background: 'rgba(0, 0, 0, 0.5)',
                            border: `2px solid ${classColor.primary}`,
                            borderRadius: '50%',
                            color: classColor.primary,
                            fontSize: `${1.5 * scale}rem`,
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = classColor.primary;
                            e.currentTarget.style.color = 'white';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)';
                            e.currentTarget.style.color = classColor.primary;
                        }}
                    >
                        &lt;
                    </button>

                    {/* リーダーカード */}
                    <div style={{
                        width: leaderCardWidth,
                        height: leaderCardHeight,
                        border: `3px solid ${classColor.primary}`,
                        borderRadius: 10 * scale,
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.8) 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        boxShadow: `0 8px 30px ${classColor.shadow}`,
                        overflow: 'hidden',
                        position: 'relative'
                    }}>
                        <img
                            src={leaderImage}
                            alt={className}
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
                                fontSize: `${1.2 * scale}rem`,
                                color: classColor.primary,
                                margin: 0,
                                fontFamily: 'sans-serif'
                            }}>
                                {className}
                            </h3>
                        </div>
                    </div>

                    {/* 次のクラスボタン */}
                    <button
                        onClick={handleNextClass}
                        style={{
                            width: `${45 * scale}px`,
                            height: `${45 * scale}px`,
                            background: 'rgba(0, 0, 0, 0.5)',
                            border: `2px solid ${classColor.primary}`,
                            borderRadius: '50%',
                            color: classColor.primary,
                            fontSize: `${1.5 * scale}rem`,
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = classColor.primary;
                            e.currentTarget.style.color = 'white';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)';
                            e.currentTarget.style.color = classColor.primary;
                        }}
                    >
                        &gt;
                    </button>
                </div>

                    {/* コスト帯別枚数グラフ */}
                    <div style={{
                        width: leaderCardWidth + 45 * 2 * scale + 0.8 * 2 * scale * 16, // リーダーカード幅 + ボタン2つ + gap
                        padding: `${12 * scale}px`,
                        background: 'rgba(0, 0, 0, 0.5)',
                        borderRadius: 8 * scale,
                        border: `1px solid ${classColor.primary}30`,
                    }}>
                        <h4 style={{
                            fontSize: `${0.8 * scale}rem`,
                            margin: `0 0 ${8 * scale}px 0`,
                            color: classColor.primary,
                            textAlign: 'center',
                            fontFamily: 'sans-serif'
                        }}>
                            コスト帯分布
                        </h4>
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'space-between',
                            height: `${100 * scale}px`,
                            gap: `${2 * scale}px`,
                            borderBottom: `1px solid ${classColor.primary}40`,
                            paddingBottom: `${4 * scale}px`
                        }}>
                            {Array.from({ length: maxCost + 1 }, (_, i) => {
                                const count = costCounts[i] || 0;
                                const barHeight = maxCount > 0 ? (count / maxCount) * 80 * scale : 0;
                                return (
                                    <div
                                        key={i}
                                        style={{
                                            flex: 1,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: `${2 * scale}px`
                                        }}
                                    >
                                        {/* 枚数ラベル */}
                                        {count > 0 && (
                                            <div style={{
                                                fontSize: `${0.6 * scale}rem`,
                                                color: classColor.primary,
                                                fontWeight: 'bold',
                                                fontFamily: 'sans-serif'
                                            }}>
                                                {count}
                                            </div>
                                        )}
                                        {/* 棒 */}
                                        <div
                                            style={{
                                                width: '100%',
                                                height: `${barHeight}px`,
                                                background: count > 0 ? `linear-gradient(180deg, ${classColor.primary} 0%, ${classColor.primary}80 100%)` : 'transparent',
                                                borderRadius: `${2 * scale}px`,
                                                transition: 'all 0.3s',
                                                boxShadow: count > 0 ? `0 0 8px ${classColor.shadow}` : 'none'
                                            }}
                                        />
                                        {/* コストラベル */}
                                        <div style={{
                                            fontSize: `${0.65 * scale}rem`,
                                            color: '#aaa',
                                            fontFamily: 'sans-serif'
                                        }}>
                                            {i}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 右側: カードグリッド（3行表示） */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: `${1 * scale}rem`
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}px, 1fr))`,
                        gap: `${gap}rem`,
                        width: '100%',
                        padding: `${10 * scale}px`,
                        maxHeight: `${(cardHeight + gap * 16) * 3 + 40 * scale}px`, // 約3行分
                        overflowY: 'auto',
                        overflowX: 'hidden'
                    }}>
                        {cardsWithCount.map(({ card, count }) => (
                            <div
                                key={card.id}
                                onClick={() => onSelectCard(card.id)}
                                style={{
                                    width: cardWidth,
                                    height: cardHeight,
                                    border: `2px solid ${classColor.primary}`,
                                    borderRadius: 8 * scale,
                                    background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.9) 100%)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'flex-start',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: `0 4px 15px ${classColor.shadow}`,
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-5px) scale(1.05)';
                                    e.currentTarget.style.boxShadow = `0 8px 25px ${classColor.shadow}`;
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                    e.currentTarget.style.boxShadow = `0 4px 15px ${classColor.shadow}`;
                                }}
                            >
                                {/* カード画像 */}
                                <div style={{
                                    width: '100%',
                                    height: '65%',
                                    overflow: 'hidden',
                                    borderBottom: `1px solid ${classColor.primary}`
                                }}>
                                    <img
                                        src={getAssetUrl(card.imageUrl || `/cards/${card.id}.png`)}
                                        alt={card.name}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                        }}
                                        onError={(e) => {
                                            // 画像読み込みエラー時はプレースホルダー色
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                </div>

                                {/* カード情報 */}
                                <div style={{
                                    padding: `${5 * scale}px`,
                                    textAlign: 'center',
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    width: '100%'
                                }}>
                                    <h3 style={{
                                        fontSize: `${0.7 * scale}rem`,
                                        margin: `0 0 ${3 * scale}px 0`,
                                        fontFamily: 'sans-serif',
                                        color: classColor.primary,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {card.name}
                                    </h3>
                                    <p style={{
                                        fontSize: `${0.6 * scale}rem`,
                                        color: '#ffcc00',
                                        margin: 0,
                                        fontFamily: 'sans-serif',
                                        fontWeight: 'bold'
                                    }}>
                                        コスト: {card.cost}
                                    </p>
                                </div>

                                {/* 枚数バッジ（右下） */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: `${5 * scale}px`,
                                    right: `${5 * scale}px`,
                                    background: 'rgba(0, 0, 0, 0.8)',
                                    color: 'white',
                                    borderRadius: 50,
                                    width: `${22 * scale}px`,
                                    height: `${22 * scale}px`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: `${0.7 * scale}rem`,
                                    fontWeight: 'bold',
                                    fontFamily: 'sans-serif',
                                    border: `2px solid ${classColor.primary}`,
                                    boxShadow: `0 0 10px ${classColor.shadow}`
                                }}>
                                    {count}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* カード総数表示 */}
                    <div style={{
                        fontSize: `${0.85 * scale}rem`,
                        color: '#aaa',
                        fontFamily: 'sans-serif',
                        textAlign: 'center'
                    }}>
                        全 {cardsWithCount.length} 種類のカード
                    </div>
                </div>
            </div>
        </div>
    );
};
