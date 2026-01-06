import React, { useState, useEffect } from 'react';
import { ClassType } from '../core/types';
import { MatchType } from '../firebase/matchmaking';
import { RankType, RANK_DISPLAY_NAMES, getRankFromRating, ClassRating } from '../firebase/rating';
import { getClassRating } from '../firebase/playerData';

// Base dimensions for scaling
const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;

// ランクの色
const RANK_COLORS: Record<RankType, string> = {
    BRONZE: '#cd7f32',
    SILVER: '#c0c0c0',
    GOLD: '#ffd700',
    PLATINUM: '#e5e4e2',
    DIAMOND: '#b9f2ff',
    MASTER: '#ff4500',
};

interface MatchTypeSelectScreenProps {
    playerClass: ClassType;
    playerId: string | null;
    onSelectMatchType: (matchType: MatchType) => void;
    onBack: () => void;
}

export const MatchTypeSelectScreen: React.FC<MatchTypeSelectScreenProps> = ({
    playerClass,
    playerId,
    onSelectMatchType,
    onBack,
}) => {
    const [scale, setScale] = useState(1);
    const [classRating, setClassRating] = useState<ClassRating | null>(null);
    const [loading, setLoading] = useState(true);

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

    // レーティングを取得
    useEffect(() => {
        const fetchRating = async () => {
            if (!playerId) {
                setLoading(false);
                return;
            }
            try {
                const rating = await getClassRating(playerId, playerClass);
                setClassRating(rating);
            } catch (error) {
                console.error('Failed to fetch rating:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchRating();
    }, [playerId, playerClass]);

    const rank = classRating ? getRankFromRating(classRating.rating) : 'BRONZE';
    const rankColor = RANK_COLORS[rank];
    const rankName = RANK_DISPLAY_NAMES[rank];

    // クラス名の日本語表記
    const classNames: Record<ClassType, string> = {
        SENKA: '盞華',
        AJA: 'あじゃ',
        YORUKA: 'Y',
    };

    // クラスカラー
    const classColors: Record<ClassType, string> = {
        SENKA: '#e94560',
        AJA: '#45a2e9',
        YORUKA: '#a855f7',
    };

    const cardWidth = 280 * scale;
    const cardHeight = 200 * scale;
    const titleSize = 2 * scale;
    const buttonFontSize = 1.2 * scale;
    const descSize = 0.75 * scale;
    const gap = 2 * scale;

    return (
        <div className="screen" style={{
            height: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1a1a2e',
            color: 'white',
        }}>
            <h2 style={{
                fontSize: `${titleSize}rem`,
                marginBottom: `${0.5 * scale}rem`,
                marginTop: 0,
            }}>
                マッチタイプを選択
            </h2>

            <p style={{
                fontSize: `${0.9 * scale}rem`,
                opacity: 0.7,
                marginBottom: `${1.5 * scale}rem`,
                fontFamily: 'Tamanegi, sans-serif',
            }}>
                使用クラス: <span style={{ color: classColors[playerClass] }}>{classNames[playerClass]}</span>
            </p>

            <div style={{ display: 'flex', gap: `${gap}rem` }}>
                {/* カジュアルマッチ */}
                <div
                    onClick={() => onSelectMatchType('casual')}
                    style={{
                        width: cardWidth,
                        height: cardHeight,
                        border: '2px solid #48bb78',
                        borderRadius: 12 * scale,
                        background: 'linear-gradient(180deg, #1a2e1a 0%, #1a1a2e 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        boxShadow: '0 4px 20px rgba(72, 187, 120, 0.3)',
                        padding: `${16 * scale}px`,
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 8px 30px rgba(72, 187, 120, 0.5)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(72, 187, 120, 0.3)';
                    }}
                >
                    <h3 style={{
                        fontSize: `${buttonFontSize}rem`,
                        color: '#48bb78',
                        margin: 0,
                        marginBottom: `${8 * scale}px`,
                    }}>
                        カジュアル
                    </h3>
                    <p style={{
                        fontSize: `${descSize}rem`,
                        opacity: 0.8,
                        textAlign: 'center',
                        fontFamily: 'Tamanegi, sans-serif',
                        margin: 0,
                        lineHeight: 1.5,
                    }}>
                        レートに影響なし<br />
                        気軽に対戦を楽しめます
                    </p>
                </div>

                {/* ランクマッチ */}
                <div
                    onClick={() => onSelectMatchType('ranked')}
                    style={{
                        width: cardWidth,
                        height: cardHeight,
                        border: '2px solid #e94560',
                        borderRadius: 12 * scale,
                        background: 'linear-gradient(180deg, #2e1a1a 0%, #1a1a2e 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        boxShadow: '0 4px 20px rgba(233, 69, 96, 0.3)',
                        padding: `${16 * scale}px`,
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 8px 30px rgba(233, 69, 96, 0.5)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(233, 69, 96, 0.3)';
                    }}
                >
                    <h3 style={{
                        fontSize: `${buttonFontSize}rem`,
                        color: '#e94560',
                        margin: 0,
                        marginBottom: `${8 * scale}px`,
                    }}>
                        ランクマッチ
                    </h3>
                    <p style={{
                        fontSize: `${descSize}rem`,
                        opacity: 0.8,
                        textAlign: 'center',
                        fontFamily: 'Tamanegi, sans-serif',
                        margin: 0,
                        lineHeight: 1.5,
                        marginBottom: `${12 * scale}px`,
                    }}>
                        勝敗でレートが変動<br />
                        真剣勝負で腕試し
                    </p>

                    {/* レート表示 */}
                    {!loading && classRating && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: `${8 * scale}px`,
                            padding: `${6 * scale}px ${12 * scale}px`,
                            background: 'rgba(0, 0, 0, 0.3)',
                            borderRadius: 6 * scale,
                        }}>
                            <span style={{
                                fontSize: `${0.8 * scale}rem`,
                                fontWeight: 'bold',
                                color: rankColor,
                                fontFamily: 'Tamanegi, sans-serif',
                            }}>
                                {rankName}
                            </span>
                            <span style={{
                                fontSize: `${0.9 * scale}rem`,
                                color: '#fff',
                                fontFamily: 'Tamanegi, sans-serif',
                            }}>
                                {classRating.rating}
                            </span>
                        </div>
                    )}
                    {loading && (
                        <div style={{
                            fontSize: `${0.7 * scale}rem`,
                            opacity: 0.5,
                            fontFamily: 'Tamanegi, sans-serif',
                        }}>
                            読み込み中...
                        </div>
                    )}
                </div>
            </div>

            <button
                onClick={onBack}
                style={{
                    marginTop: `${2 * scale}rem`,
                    padding: `${10 * scale}px ${24 * scale}px`,
                    fontSize: `${0.9 * scale}rem`,
                    background: '#333',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    borderRadius: 6 * scale,
                    fontFamily: 'Tamanegi, sans-serif',
                    transition: 'background 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#444'}
                onMouseOut={(e) => e.currentTarget.style.background = '#333'}
            >
                クラス選択に戻る
            </button>
        </div>
    );
};
