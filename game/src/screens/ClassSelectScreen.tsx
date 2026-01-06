import React, { useState, useEffect } from 'react';
import { ClassType, AIDifficulty } from '../core/types';
import { getAllClassRatings } from '../firebase/playerData';
import { getRankFromRating, RANK_DISPLAY_NAMES, ClassRating, RankType } from '../firebase/rating';

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

interface ClassSelectScreenProps {
    onSelectClass: (cls: ClassType) => void;
    onBack: () => void;
    gameMode?: 'CPU' | 'HOST' | 'JOIN' | 'CASUAL_MATCH' | 'RANKED_MATCH' | 'RANDOM_MATCH';
    aiDifficulty?: AIDifficulty;
    onDifficultyChange?: (difficulty: AIDifficulty) => void;
    playerName: string;
    onPlayerNameChange: (name: string) => void;
    timerEnabled?: boolean;
    onTimerEnabledChange?: (enabled: boolean) => void;
    playerId?: string | null;
}

// ランクの色
const RANK_COLORS: Record<RankType, string> = {
    BRONZE: '#cd7f32',
    SILVER: '#c0c0c0',
    GOLD: '#ffd700',
    PLATINUM: '#e5e4e2',
    DIAMOND: '#b9f2ff',
    MASTER: '#ff4500',
};

export const ClassSelectScreen: React.FC<ClassSelectScreenProps> = ({
    onSelectClass,
    onBack,
    gameMode = 'CPU',
    aiDifficulty = 'NORMAL',
    onDifficultyChange,
    playerName,
    onPlayerNameChange,
    timerEnabled = true,
    onTimerEnabledChange,
    playerId
}) => {
    // Responsive scaling (same approach as GameScreen)
    const [scale, setScale] = useState(1);

    // クラス別レーティング
    const [classRatings, setClassRatings] = useState<Partial<Record<ClassType, ClassRating>>>({});
    const [loadingRatings, setLoadingRatings] = useState(false);

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

    // レーティング取得
    useEffect(() => {
        const fetchRatings = async () => {
            if (!playerId) {
                setLoadingRatings(false);
                return;
            }
            setLoadingRatings(true);
            try {
                const ratings = await getAllClassRatings(playerId);
                setClassRatings(ratings);
            } catch (error) {
                console.error('Failed to fetch class ratings:', error);
            } finally {
                setLoadingRatings(false);
            }
        };
        fetchRatings();
    }, [playerId]);

    // Base sizes - reduced for 3 cards fit
    const cardWidth = 200 * scale;
    const cardHeight = 280 * scale;
    const titleSize = 2 * scale;
    const classNameSize = 1.4 * scale;
    const subtitleSize = 0.75 * scale;
    const descSize = 0.65 * scale;
    const gap = 1.2 * scale;
    const buttonPadding = `${8 * scale}px ${16 * scale}px`;

    // レート表示コンポーネント（ランクマッチ時のみ表示）
    const renderRatingBadge = (classType: ClassType) => {
        // ランクマッチ以外ではレート表示しない
        if (gameMode !== 'RANKED_MATCH') {
            return null;
        }
        if (!playerId || loadingRatings) {
            return null;
        }
        const rating = classRatings[classType];
        if (!rating) {
            return null;
        }
        const rank = getRankFromRating(rating.rating);
        const rankName = RANK_DISPLAY_NAMES[rank];
        const rankColor = RANK_COLORS[rank];

        return (
            <div style={{
                marginTop: `${4 * scale}px`,
                padding: `${4 * scale}px ${8 * scale}px`,
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: 4 * scale,
                display: 'flex',
                alignItems: 'center',
                gap: `${6 * scale}px`,
            }}>
                <span style={{
                    fontSize: `${0.7 * scale}rem`,
                    fontWeight: 'bold',
                    color: rankColor,
                    fontFamily: 'Tamanegi, sans-serif',
                }}>
                    {rankName}
                </span>
                <span style={{
                    fontSize: `${0.75 * scale}rem`,
                    color: '#fff',
                    fontFamily: 'Tamanegi, sans-serif',
                }}>
                    {rating.rating}
                </span>
            </div>
        );
    };

    return (
        <div className="screen" style={{
            height: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1a1a2e',
            color: 'white'
        }}>
            <h2 style={{ fontSize: `${titleSize}rem`, marginBottom: `${0.5 * scale}rem`, marginTop: 0 }}>クラスを選択</h2>

            {/* Player Name Input */}
            <div style={{
                marginBottom: `${0.8 * scale}rem`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: `${0.3 * scale}rem`
            }}>
                <label style={{
                    fontSize: `${0.9 * scale}rem`,
                    opacity: 0.8,
                    fontFamily: 'Tamanegi, sans-serif'
                }}>
                    プレイヤー名
                </label>
                <input
                    type="text"
                    value={playerName}
                    onChange={(e) => onPlayerNameChange(e.target.value)}
                    maxLength={12}
                    placeholder="名前を入力"
                    style={{
                        padding: `${6 * scale}px ${12 * scale}px`,
                        fontSize: `${0.9 * scale}rem`,
                        background: '#2d3748',
                        border: '2px solid #4a5568',
                        borderRadius: 6 * scale,
                        color: 'white',
                        outline: 'none',
                        width: 180 * scale,
                        textAlign: 'center',
                        fontFamily: 'Tamanegi, sans-serif'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#63b3ed'}
                    onBlur={(e) => e.target.style.borderColor = '#4a5568'}
                />
            </div>

            <div style={{ display: 'flex', gap: `${gap}rem`, marginBottom: `${1 * scale}rem` }}>
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
                        transition: 'transform 0.2s',
                        boxShadow: '0 4px 20px rgba(233, 69, 96, 0.2)',
                        overflow: 'hidden',
                        position: 'relative'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <img src={senkaLeaderImg} alt="Senka" style={{ width: '100%', height: '60%', objectFit: 'cover' }} />
                    <div style={{ padding: `${6 * scale}px`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h3 style={{ fontSize: `${classNameSize}rem`, color: '#e94560', margin: 0 }}>盞華</h3>
                        <p style={{ color: '#aaa', margin: `${3 * scale}px 0`, fontSize: `${subtitleSize}rem`, fontFamily: 'Tamanegi, sans-serif' }}>アグロ / ラッシュ</p>
                        <p style={{ padding: `0 ${0.5 * scale}rem`, textAlign: 'center', fontSize: `${descSize}rem`, opacity: 0.8, fontFamily: 'Tamanegi, sans-serif', lineHeight: 1.3 }}>
                            突進フォロワーと多面展開で<br />相手を圧倒する。
                        </p>
                        {renderRatingBadge('SENKA')}
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
                        transition: 'transform 0.2s',
                        boxShadow: '0 4px 20px rgba(69, 162, 233, 0.2)',
                        overflow: 'hidden',
                        position: 'relative'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <img src={azyaLeaderImg} alt="Azya" style={{ width: '100%', height: '60%', objectFit: 'cover', objectPosition: 'center top' }} />
                    <div style={{ padding: `${6 * scale}px`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h3 style={{ fontSize: `${classNameSize}rem`, color: '#45a2e9', margin: 0 }}>あじゃ</h3>
                        <p style={{ color: '#aaa', margin: `${3 * scale}px 0`, fontSize: `${subtitleSize}rem`, fontFamily: 'Tamanegi, sans-serif' }}>コントロール / テクニカル</p>
                        <p style={{ padding: `${0.5 * scale}rem`, textAlign: 'center', fontSize: `${descSize}rem`, opacity: 0.8, fontFamily: 'Tamanegi, sans-serif', lineHeight: 1.3 }}>
                            強力な除去と堅牢な守護で<br />盤面を支配する。
                        </p>
                        {renderRatingBadge('AJA')}
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
                        transition: 'transform 0.2s',
                        boxShadow: '0 4px 20px rgba(168, 85, 247, 0.2)',
                        overflow: 'hidden',
                        position: 'relative'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <img src={yorukaLeaderImg} alt="Yoruka" style={{ width: '100%', height: '60%', objectFit: 'cover' }} />
                    <div style={{ padding: `${6 * scale}px`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h3 style={{ fontSize: `${classNameSize}rem`, color: '#a855f7', margin: 0 }}>Y</h3>
                        <p style={{ color: '#aaa', margin: `${3 * scale}px 0`, fontSize: `${subtitleSize}rem`, fontFamily: 'Tamanegi, sans-serif' }}>ミッドレンジ / トリッキー</p>
                        <p style={{ padding: `0 ${0.5 * scale}rem`, textAlign: 'center', fontSize: `${descSize}rem`, opacity: 0.8, fontFamily: 'Tamanegi, sans-serif', lineHeight: 1.3 }}>
                            墓地をリソースにする変則的な戦法で<br />相手を翻弄する。
                        </p>
                        {renderRatingBadge('YORUKA')}
                    </div>
                </div>
            </div>

            {/* Difficulty Selector - Only show for CPU mode */}
            {gameMode === 'CPU' && onDifficultyChange && (
                <div style={{
                    marginBottom: `${0.6 * scale}rem`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: `${0.3 * scale}rem`
                }}>
                    <p style={{ fontSize: `${0.85 * scale}rem`, opacity: 0.8, fontFamily: 'Tamanegi, sans-serif', margin: 0 }}>
                        難易度を選択
                    </p>
                    <div style={{ display: 'flex', gap: `${0.6 * scale}rem` }}>
                        {(['EASY', 'NORMAL', 'HARD'] as AIDifficulty[]).map((diff) => (
                            <button
                                key={diff}
                                onClick={() => onDifficultyChange(diff)}
                                style={{
                                    padding: `${6 * scale}px ${14 * scale}px`,
                                    fontSize: `${0.8 * scale}rem`,
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
                                {diff === 'EASY' ? 'かんたん' : diff === 'NORMAL' ? 'ふつう' : 'オニ'}
                            </button>
                        ))}
                    </div>
                    <p style={{
                        fontSize: `${0.65 * scale}rem`,
                        opacity: 0.6,
                        fontFamily: 'Tamanegi, sans-serif',
                        margin: 0
                    }}>
                        {aiDifficulty === 'EASY' && '初心者向け。CPUは単純な行動をとります。'}
                        {aiDifficulty === 'NORMAL' && '標準的な難易度。CPUは基本的な戦略を使います。'}
                        {aiDifficulty === 'HARD' && '上級者向け。CPUは最適な行動を計算してきます。'}
                    </p>
                </div>
            )}

            {/* Turn Timer Toggle */}
            {onTimerEnabledChange && (
                <div style={{
                    marginBottom: `${0.6 * scale}rem`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: `${0.3 * scale}rem`
                }}>
                    <p style={{ fontSize: `${0.85 * scale}rem`, opacity: 0.8, fontFamily: 'Tamanegi, sans-serif', margin: 0 }}>
                        ターンタイマー
                    </p>
                    <div style={{ display: 'flex', gap: `${0.6 * scale}rem` }}>
                        <button
                            onClick={() => onTimerEnabledChange(true)}
                            style={{
                                padding: `${6 * scale}px ${14 * scale}px`,
                                fontSize: `${0.8 * scale}rem`,
                                background: timerEnabled ? '#3182ce' : 'transparent',
                                border: `2px solid #3182ce`,
                                color: '#fff',
                                cursor: 'pointer',
                                borderRadius: 4 * scale,
                                fontFamily: 'Tamanegi, sans-serif',
                                transition: 'all 0.2s'
                            }}
                        >
                            ON (60秒)
                        </button>
                        <button
                            onClick={() => onTimerEnabledChange(false)}
                            style={{
                                padding: `${6 * scale}px ${14 * scale}px`,
                                fontSize: `${0.8 * scale}rem`,
                                background: !timerEnabled ? '#718096' : 'transparent',
                                border: `2px solid #718096`,
                                color: '#fff',
                                cursor: 'pointer',
                                borderRadius: 4 * scale,
                                fontFamily: 'Tamanegi, sans-serif',
                                transition: 'all 0.2s'
                            }}
                        >
                            OFF
                        </button>
                    </div>
                    <p style={{
                        fontSize: `${0.65 * scale}rem`,
                        opacity: 0.6,
                        fontFamily: 'Tamanegi, sans-serif',
                        margin: 0
                    }}>
                        {timerEnabled
                            ? '各ターン60秒の制限時間。0秒で自動ターン終了。'
                            : '制限時間なし。じっくりプレイできます。'}
                    </p>
                </div>
            )}

            <button onClick={onBack} style={{ background: '#333', padding: buttonPadding, fontSize: `${0.9 * scale}rem`, marginBottom: `${0.5 * scale}rem` }}>タイトルに戻る</button>
        </div>
    );
};
