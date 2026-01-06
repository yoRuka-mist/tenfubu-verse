import React, { useState, useEffect } from 'react';
import { ClassType } from '../core/types';
import { MOCK_CARDS, SENKA_DECK_TEMPLATE, AJA_DECK_TEMPLATE, YORUKA_DECK_TEMPLATE } from '../core/engine';

// Base dimensions for scaling (same as GameScreen)
const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;

interface GalleryCardListScreenProps {
    classType: ClassType;
    onSelectCard: (cardId: string) => void;
    onBack: () => void;
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

export const GalleryCardListScreen: React.FC<GalleryCardListScreenProps> = ({
    classType,
    onSelectCard,
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

    // デッキテンプレートを取得
    const getDeckTemplate = (cls: ClassType) => {
        return cls === 'SENKA' ? SENKA_DECK_TEMPLATE :
               cls === 'AJA' ? AJA_DECK_TEMPLATE : YORUKA_DECK_TEMPLATE;
    };

    // カードデータと枚数を取得（トークンを除外）
    const template = getDeckTemplate(classType);
    const cardsWithCount = template
        .filter(entry => !entry.cardId.startsWith('TOKEN_'))
        .map(entry => ({
            card: MOCK_CARDS.find(c => c.id === entry.cardId)!,
            count: entry.count
        }))
        .filter(item => item.card); // undefinedを除外

    // クラスカラー取得
    const classColor = CLASS_COLORS[classType];
    const className = CLASS_NAMES[classType];

    // サイズ設定
    const cardWidth = 140 * scale;
    const cardHeight = 200 * scale;
    const gap = 1 * scale;
    const titleSize = 2 * scale;
    const buttonPadding = `${8 * scale}px ${16 * scale}px`;

    return (
        <div style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: classColor.gradient,
            color: 'white',
            position: 'relative',
            paddingBottom: `${40 * scale}px`
        }}>
            {/* 戻るボタン（左上固定） */}
            <button
                onClick={onBack}
                style={{
                    position: 'fixed',
                    top: `${20 * scale}px`,
                    left: `${20 * scale}px`,
                    background: 'rgba(0, 0, 0, 0.5)',
                    padding: buttonPadding,
                    fontSize: `${0.9 * scale}rem`,
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 6 * scale,
                    color: 'white',
                    cursor: 'pointer',
                    fontFamily: 'Tamanegi, sans-serif',
                    transition: 'all 0.2s',
                    zIndex: 100
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)'}
            >
                クラス選択に戻る
            </button>

            {/* タイトル */}
            <h2 style={{
                fontSize: `${titleSize}rem`,
                marginTop: `${80 * scale}px`,
                marginBottom: `${20 * scale}px`,
                fontFamily: 'Tamanegi, sans-serif',
                color: classColor.primary,
                textShadow: `0 0 20px ${classColor.shadow}`
            }}>
                {className} - カード一覧
            </h2>

            {/* カードグリッド */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}px, 1fr))`,
                gap: `${gap}rem`,
                maxWidth: `${1100 * scale}px`,
                width: '90%',
                padding: `${20 * scale}px`,
                justifyItems: 'center'
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
                            justifyContent: 'center',
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
                        {/* カード情報（簡易表示） */}
                        <div style={{
                            padding: `${10 * scale}px`,
                            textAlign: 'center',
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            width: '100%'
                        }}>
                            <h3 style={{
                                fontSize: `${0.9 * scale}rem`,
                                margin: `0 0 ${8 * scale}px 0`,
                                fontFamily: 'Tamanegi, sans-serif',
                                color: classColor.primary
                            }}>
                                {card.name}
                            </h3>
                            <p style={{
                                fontSize: `${0.7 * scale}rem`,
                                color: '#aaa',
                                margin: 0,
                                fontFamily: 'Tamanegi, sans-serif'
                            }}>
                                {card.type === 'FOLLOWER' ? 'フォロワー' : 'スペル'}
                            </p>
                            {card.type === 'FOLLOWER' && (
                                <p style={{
                                    fontSize: `${0.8 * scale}rem`,
                                    color: '#fff',
                                    margin: `${5 * scale}px 0 0 0`,
                                    fontFamily: 'Tamanegi, sans-serif'
                                }}>
                                    {card.attack}/{card.health}
                                </p>
                            )}
                            <p style={{
                                fontSize: `${0.7 * scale}rem`,
                                color: '#ffcc00',
                                margin: `${5 * scale}px 0 0 0`,
                                fontFamily: 'Tamanegi, sans-serif',
                                fontWeight: 'bold'
                            }}>
                                コスト: {card.cost}
                            </p>
                        </div>

                        {/* 枚数バッジ（右下） */}
                        <div style={{
                            position: 'absolute',
                            bottom: `${8 * scale}px`,
                            right: `${8 * scale}px`,
                            background: 'rgba(0, 0, 0, 0.8)',
                            color: 'white',
                            borderRadius: 50,
                            width: `${28 * scale}px`,
                            height: `${28 * scale}px`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: `${0.85 * scale}rem`,
                            fontWeight: 'bold',
                            fontFamily: 'Tamanegi, sans-serif',
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
                marginTop: `${20 * scale}px`,
                fontSize: `${0.9 * scale}rem`,
                color: '#aaa',
                fontFamily: 'Tamanegi, sans-serif'
            }}>
                全 {cardsWithCount.length} 種類のカード
            </div>
        </div>
    );
};
