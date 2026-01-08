import React, { useState, useEffect } from 'react';
import { ClassType } from '../core/types';
import { getAllClassRankings, RankingEntry } from '../firebase/playerData';
import { RANK_DISPLAY_NAMES, RankType } from '../firebase/rating';

// Base dimensions for scaling
const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;

// クラス表示名
const CLASS_DISPLAY_NAMES: Record<ClassType, string> = {
    SENKA: '戦禍',
    AJA: 'アジャ',
    YORUKA: 'ヨルカ',
};

// ランク別カラー
const RANK_COLORS: Record<RankType, string> = {
    BRONZE: '#CD7F32',
    SILVER: '#C0C0C0',
    GOLD: '#FFD700',
    PLATINUM: '#E5E4E2',
    DIAMOND: '#B9F2FF',
    MASTER: '#FF6B6B',
};

// 順位別カラー
const POSITION_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32', '#888', '#888'];

interface RankingScreenProps {
    onBack: () => void;
}

export const RankingScreen: React.FC<RankingScreenProps> = ({ onBack }) => {
    const [rankings, setRankings] = useState<Record<ClassType, RankingEntry[]>>({
        SENKA: [],
        AJA: [],
        YORUKA: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [scale, setScale] = useState(1);

    // Responsive scaling
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

    // ランキングデータ取得
    useEffect(() => {
        const fetchRankings = async () => {
            try {
                setLoading(true);
                setError('');
                const data = await getAllClassRankings(5);
                setRankings(data);
            } catch (err) {
                console.error('Failed to fetch rankings:', err);
                setError('ランキングの取得に失敗しました');
            } finally {
                setLoading(false);
            }
        };

        fetchRankings();
    }, []);

    // ランキングテーブルをレンダリング
    const renderRankingTable = (playerClass: ClassType) => {
        const entries = rankings[playerClass];

        return (
            <div style={{
                flex: 1,
                minWidth: 350 * scale,
                background: 'rgba(30, 30, 50, 0.8)',
                borderRadius: 12 * scale,
                padding: 20 * scale,
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
            }}>
                {/* クラス名ヘッダー */}
                <h2 style={{
                    fontSize: 24 * scale,
                    fontWeight: 'bold',
                    color: '#fff',
                    marginBottom: 16 * scale,
                    textAlign: 'center',
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                }}>
                    {CLASS_DISPLAY_NAMES[playerClass]}
                </h2>

                {/* テーブルヘッダー */}
                <div style={{
                    display: 'flex',
                    padding: `${8 * scale}px ${12 * scale}px`,
                    borderBottom: '2px solid rgba(255,255,255,0.2)',
                    marginBottom: 8 * scale,
                }}>
                    <div style={{ width: 40 * scale, fontSize: 12 * scale, color: '#888', fontWeight: 'bold' }}>順位</div>
                    <div style={{ flex: 1, fontSize: 12 * scale, color: '#888', fontWeight: 'bold' }}>プレイヤー</div>
                    <div style={{ width: 80 * scale, fontSize: 12 * scale, color: '#888', fontWeight: 'bold', textAlign: 'center' }}>ランク</div>
                    <div style={{ width: 60 * scale, fontSize: 12 * scale, color: '#888', fontWeight: 'bold', textAlign: 'right' }}>レート</div>
                </div>

                {/* ランキングエントリ */}
                {entries.length === 0 ? (
                    <div style={{
                        padding: 20 * scale,
                        textAlign: 'center',
                        color: '#666',
                        fontSize: 14 * scale,
                    }}>
                        まだランキングデータがありません
                    </div>
                ) : (
                    entries.map((entry, index) => (
                        <div
                            key={entry.playerId}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: `${12 * scale}px ${12 * scale}px`,
                                borderRadius: 8 * scale,
                                marginBottom: 4 * scale,
                                background: index === 0
                                    ? 'linear-gradient(90deg, rgba(255,215,0,0.2) 0%, transparent 100%)'
                                    : index === 1
                                        ? 'linear-gradient(90deg, rgba(192,192,192,0.15) 0%, transparent 100%)'
                                        : index === 2
                                            ? 'linear-gradient(90deg, rgba(205,127,50,0.15) 0%, transparent 100%)'
                                            : 'transparent',
                                transition: 'background 0.3s',
                            }}
                        >
                            {/* 順位 */}
                            <div style={{
                                width: 40 * scale,
                                fontSize: 18 * scale,
                                fontWeight: 'bold',
                                color: POSITION_COLORS[index] || '#888',
                                textShadow: index < 3 ? '0 1px 2px rgba(0,0,0,0.5)' : 'none',
                            }}>
                                {index + 1}
                            </div>

                            {/* プレイヤー名 */}
                            <div style={{
                                flex: 1,
                                fontSize: 16 * scale,
                                color: '#fff',
                                fontWeight: index < 3 ? 'bold' : 'normal',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}>
                                {entry.playerName}
                            </div>

                            {/* ランク */}
                            <div style={{
                                width: 80 * scale,
                                textAlign: 'center',
                            }}>
                                <span style={{
                                    display: 'inline-block',
                                    padding: `${4 * scale}px ${8 * scale}px`,
                                    borderRadius: 4 * scale,
                                    fontSize: 12 * scale,
                                    fontWeight: 'bold',
                                    color: '#fff',
                                    background: RANK_COLORS[entry.rank],
                                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                                }}>
                                    {RANK_DISPLAY_NAMES[entry.rank]}
                                </span>
                            </div>

                            {/* レート */}
                            <div style={{
                                width: 60 * scale,
                                fontSize: 16 * scale,
                                fontWeight: 'bold',
                                color: RANK_COLORS[entry.rank],
                                textAlign: 'right',
                            }}>
                                {entry.rating}
                            </div>
                        </div>
                    ))
                )}
            </div>
        );
    };

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            overflow: 'hidden',
        }}>
            <div style={{
                width: BASE_WIDTH * scale,
                height: BASE_HEIGHT * scale,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: 20 * scale,
                boxSizing: 'border-box',
            }}>
                {/* タイトル */}
                <h1 style={{
                    fontSize: 48 * scale,
                    fontWeight: 'bold',
                    color: '#fff',
                    marginBottom: 30 * scale,
                    textShadow: '0 4px 8px rgba(0,0,0,0.5)',
                }}>
                    ランキング
                </h1>

                {/* ローディング */}
                {loading && (
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 20 * scale,
                    }}>
                        読み込み中...
                    </div>
                )}

                {/* エラー */}
                {error && !loading && (
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ff5050',
                        fontSize: 18 * scale,
                    }}>
                        {error}
                    </div>
                )}

                {/* ランキングテーブル */}
                {!loading && !error && (
                    <div style={{
                        display: 'flex',
                        gap: 20 * scale,
                        width: '100%',
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                    }}>
                        {renderRankingTable('SENKA')}
                        {renderRankingTable('AJA')}
                        {renderRankingTable('YORUKA')}
                    </div>
                )}

                {/* 戻るボタン */}
                <button
                    onClick={onBack}
                    style={{
                        marginTop: 20 * scale,
                        padding: `${16 * scale}px ${48 * scale}px`,
                        fontSize: 18 * scale,
                        fontWeight: 'bold',
                        borderRadius: 8 * scale,
                        border: 'none',
                        background: '#555',
                        color: '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#666'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#555'}
                >
                    戻る
                </button>
            </div>
        </div>
    );
};
