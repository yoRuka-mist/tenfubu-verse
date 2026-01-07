import React, { useState, useEffect, useRef } from 'react';
import { AudioSettings, ClassType } from '../core/types';
import { GalleryCardListScreen } from './GalleryCardListScreen';
import { GalleryCardDetailScreen } from './GalleryCardDetailScreen';
import { GalleryRelatedCardScreen } from './GalleryRelatedCardScreen';
import { MOCK_CARDS } from '../core/engine';
import { getAllClassRatings } from '../firebase/playerData';
import { getRankFromRating, RANK_DISPLAY_NAMES, ClassRating, RankType } from '../firebase/rating';

// Helper function to resolve asset paths with base URL for GitHub Pages deployment
const getAssetUrl = (path: string): string => {
    const base = import.meta.env.BASE_URL || '/';
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${base}${cleanPath}`;
};

// Base dimensions for scaling
const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;

// Leader Images
const azyaLeaderImg = getAssetUrl('/leaders/azya_leader.png');
const senkaLeaderImg = getAssetUrl('/leaders/senka_leader.png');
const yorukaLeaderImg = getAssetUrl('/leaders/yoRuka_leader.png');

// ランクの色
const RANK_COLORS: Record<RankType, string> = {
    BRONZE: '#cd7f32',
    SILVER: '#c0c0c0',
    GOLD: '#ffd700',
    PLATINUM: '#e5e4e2',
    DIAMOND: '#b9f2ff',
    MASTER: '#ff4500',
};

// メニュー項目の型
type MenuTab = 'solo' | 'room' | 'random' | 'home' | 'ranking' | 'gallery' | 'settings';

// ギャラリーのビューステート
type GalleryView = 'class' | 'card-list' | 'card-detail' | 'related-card';

interface TitleScreenProps {
    onStartConfig: (mode: 'CPU' | 'HOST' | 'JOIN' | 'CASUAL_MATCH' | 'RANKED_MATCH' | 'RANDOM_MATCH', roomId?: string, classType?: ClassType) => void;
    audioSettings: AudioSettings;
    onAudioSettingsChange: (settings: Partial<AudioSettings>) => void;
    playerId?: string | null; // 将来的にレート表示等で使用予定
    onSetHomeCard?: (cardId: string) => void; // ホームカード設定用
    homeCardId?: string | null; // ホームカードID
    isAnonymous?: boolean; // ユーザーが匿名かどうか
    userId?: string | null; // ユーザーID
    onNavigateToRegister?: () => void; // アカウント登録画面への遷移
    onNavigateToLogin?: () => void; // ログイン画面への遷移
    onNavigateToProfile?: () => void; // プロフィール設定画面への遷移
    onLogout?: () => void; // ログアウト処理
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
    onStartConfig,
    audioSettings,
    onAudioSettingsChange,
    playerId: _playerId,
    onSetHomeCard,
    homeCardId = null,
    isAnonymous = true,
    userId = null,
    onNavigateToRegister,
    onNavigateToLogin,
    onNavigateToProfile,
    onLogout
}) => {
    // 画面フェーズ: 'title' = GAME START画面, 'home' = ホーム画面
    const [phase, setPhase] = useState<'title' | 'home'>('title');
    const [titleAnimating, setTitleAnimating] = useState(false);

    // デバッグ用：設定タブの状態を確認
    useEffect(() => {
        console.log('👤 TitleScreen auth state:', { isAnonymous, userId });
    }, [isAnonymous, userId]);

    // デバッグ用：ホームカードIDの変更を確認
    useEffect(() => {
        console.log('🎴 TitleScreen homeCardId changed:', homeCardId);
    }, [homeCardId]);

    // ホーム画面の状態
    const [activeTab, setActiveTab] = useState<MenuTab>('home');
    const [displayedTab, setDisplayedTab] = useState<MenuTab>('home'); // 実際に表示されているタブ（フェード用）
    const [isFading, setIsFading] = useState(false); // タブ切り替えのフェードアニメーション用
    const [showJoinInput, setShowJoinInput] = useState(false);
    const [joinId, setJoinId] = useState('');
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // ギャラリーの状態
    const [galleryView, setGalleryView] = useState<GalleryView>('class');
    const [selectedGalleryClass, setSelectedGalleryClass] = useState<ClassType | null>(null);
    const [selectedGalleryCard, setSelectedGalleryCard] = useState<string | null>(null);
    const [galleryRelatedCardIds, setGalleryRelatedCardIds] = useState<string[]>([]);

    // クラス選択の状態
    const [showingClassSelect, setShowingClassSelect] = useState(false);
    const [classSelectMode, setClassSelectMode] = useState<'CPU' | 'HOST' | 'JOIN' | 'CASUAL_MATCH' | 'RANKED_MATCH'>('CPU');
    const [classRatings, setClassRatings] = useState<Partial<Record<ClassType, ClassRating>>>({});
    const [loadingRatings, setLoadingRatings] = useState(false);

    // カード回転の状態
    const [cardRotation, setCardRotation] = useState(25); // Y軸回転角度
    const [isDragging, setIsDragging] = useState(false);
    const [isAutoRotating, setIsAutoRotating] = useState(false);
    const dragStartX = useRef(0);
    const dragStartRotation = useRef(0);
    const lastMoveTime = useRef(0);
    const lastMoveX = useRef(0);
    const velocityRef = useRef(0);
    const inertiaAnimationRef = useRef<number | null>(null);
    const autoRotationRef = useRef<number | null>(null);
    const lastInteractionTime = useRef(Date.now());

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

    // レーティング取得（ランクマッチ用）
    useEffect(() => {
        const fetchRatings = async () => {
            if (!_playerId) {
                setLoadingRatings(false);
                return;
            }
            setLoadingRatings(true);
            try {
                const ratings = await getAllClassRatings(_playerId);
                setClassRatings(ratings);
            } catch (error) {
                console.error('Failed to fetch class ratings:', error);
            } finally {
                setLoadingRatings(false);
            }
        };
        fetchRatings();
    }, [_playerId]);

    // タイトル→ホームへの遷移
    const handleGameStart = () => {
        setTitleAnimating(true);
        setTimeout(() => {
            setPhase('home');
            setTitleAnimating(false);
        }, 600);
    };

    // タブ切り替えハンドラー（クロスフェードアニメーション付き）
    const handleTabChange = (newTab: MenuTab) => {
        if (newTab === activeTab || isFading) return; // 同じタブまたはフェード中は無視

        // タブボタンの状態は即座に切り替え
        setActiveTab(newTab);

        // フェードアウト開始
        setIsFading(true);

        // 150ms後に表示タブを切り替え、同時にフェードイン開始
        setTimeout(() => {
            setDisplayedTab(newTab);
            setIsFading(false); // 新しいコンテンツと同時にフェードイン開始
        }, 150);
    };

    // 角度を0~360度の範囲に正規化
    const normalizeRotation = (rotation: number): number => {
        const normalized = rotation % 360;
        return normalized < 0 ? normalized + 360 : normalized;
    };

    // 慣性アニメーションをクリア
    const clearInertiaAnimation = () => {
        if (inertiaAnimationRef.current !== null) {
            cancelAnimationFrame(inertiaAnimationRef.current);
            inertiaAnimationRef.current = null;
        }
    };

    // 自動回転をクリア
    const clearAutoRotation = () => {
        if (autoRotationRef.current !== null) {
            cancelAnimationFrame(autoRotationRef.current);
            autoRotationRef.current = null;
        }
        setIsAutoRotating(false);
    };

    // 自動回転を開始
    const startAutoRotation = () => {
        clearAutoRotation();
        setIsAutoRotating(true);

        const rotationSpeed = 0.2; // 回転速度（度/フレーム）

        const rotate = () => {
            setCardRotation(prev => normalizeRotation(prev + rotationSpeed));
            autoRotationRef.current = requestAnimationFrame(rotate);
        };

        autoRotationRef.current = requestAnimationFrame(rotate);
    };

    // カードドラッグ処理
    const handleMouseDown = (e: React.MouseEvent) => {
        clearInertiaAnimation();
        clearAutoRotation();
        lastInteractionTime.current = Date.now();
        setIsDragging(true);
        dragStartX.current = e.clientX;
        dragStartRotation.current = cardRotation;
        lastMoveTime.current = Date.now();
        lastMoveX.current = e.clientX;
        velocityRef.current = 0;
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;

        const currentTime = Date.now();
        const deltaTime = currentTime - lastMoveTime.current;
        const deltaX = e.clientX - lastMoveX.current;

        // 速度を計算（ピクセル/ミリ秒）
        if (deltaTime > 0) {
            velocityRef.current = deltaX / deltaTime;
        }

        const delta = e.clientX - dragStartX.current;
        const newRotation = dragStartRotation.current + delta * 0.5;
        setCardRotation(normalizeRotation(newRotation));

        lastMoveTime.current = currentTime;
        lastMoveX.current = e.clientX;
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        lastInteractionTime.current = Date.now();

        // 慣性アニメーション開始
        let currentVelocity = velocityRef.current * 0.5; // 回転速度に変換
        const friction = 0.95; // 摩擦係数
        const minVelocity = 0.1; // 最小速度閾値

        const animate = () => {
            if (Math.abs(currentVelocity) > minVelocity) {
                setCardRotation(prev => normalizeRotation(prev + currentVelocity));
                currentVelocity *= friction;
                inertiaAnimationRef.current = requestAnimationFrame(animate);
            } else {
                inertiaAnimationRef.current = null;
                lastInteractionTime.current = Date.now(); // 慣性終了時も更新
            }
        };

        if (Math.abs(currentVelocity) > minVelocity) {
            animate();
        }
    };

    // コンポーネントアンマウント時にアニメーションをクリア
    useEffect(() => {
        return () => {
            clearInertiaAnimation();
            clearAutoRotation();
        };
    }, []);

    // 2秒間非アクティブ時に自動回転開始
    useEffect(() => {
        if (activeTab !== 'home') return;

        const checkInterval = setInterval(() => {
            const timeSinceLastInteraction = Date.now() - lastInteractionTime.current;
            if (timeSinceLastInteraction >= 2000 && !isDragging && !inertiaAnimationRef.current && !isAutoRotating) {
                startAutoRotation();
            }
        }, 100);

        return () => clearInterval(checkInterval);
    }, [activeTab, isDragging, isAutoRotating]);

    // ランダムマッチタイプ選択
    const handleMatchTypeSelect = (matchType: 'casual' | 'ranked') => {
        if (matchType === 'casual') {
            handleStartClassSelect('CASUAL_MATCH');
        } else {
            handleStartClassSelect('RANKED_MATCH');
        }
    };

    // ログアウト確認
    const handleLogoutClick = () => {
        setShowLogoutConfirm(true);
    };

    const handleLogoutConfirm = () => {
        setShowLogoutConfirm(false);
        if (onLogout) {
            onLogout();
        }
    };

    const handleLogoutCancel = () => {
        setShowLogoutConfirm(false);
    };

    // ギャラリー関連のハンドラー
    const handleGalleryClassSelect = (classType: ClassType) => {
        setSelectedGalleryClass(classType);
        setGalleryView('card-list');
    };

    const handleGalleryCardSelect = (cardId: string) => {
        setSelectedGalleryCard(cardId);
        setGalleryView('card-detail');
    };

    const handleGalleryRelatedCardOpen = (parentCardId: string) => {
        const parentCard = MOCK_CARDS.find(c => c.id === parentCardId);
        if (parentCard && parentCard.relatedCards && parentCard.relatedCards.length > 0) {
            setSelectedGalleryCard(parentCardId);
            setGalleryRelatedCardIds(parentCard.relatedCards);
            setGalleryView('related-card');
        }
    };

    const handleBackFromCardDetail = () => {
        setSelectedGalleryCard(null);
        setGalleryView('card-list');
    };

    const handleBackFromRelatedCard = () => {
        setGalleryRelatedCardIds([]);
        setGalleryView('card-detail');
    };

    // クラス選択の開始ハンドラー
    const handleStartClassSelect = (mode: 'CPU' | 'HOST' | 'JOIN' | 'CASUAL_MATCH' | 'RANKED_MATCH', roomId?: string) => {
        setClassSelectMode(mode);
        if (roomId) {
            setJoinId(roomId);
        }
        setShowingClassSelect(true);
    };

    // クラス選択完了ハンドラー
    const handleClassSelected = (classType: ClassType) => {
        setShowingClassSelect(false);
        // クラスを選択してゲーム開始
        const roomIdToPass = classSelectMode === 'JOIN' ? joinId : undefined;
        onStartConfig(classSelectMode, roomIdToPass, classType);
        // ルームID入力状態をリセット
        setShowJoinInput(false);
    };

    // クラス選択をキャンセル
    const handleCancelClassSelect = () => {
        setShowingClassSelect(false);
    };

    // ギャラリータブが変更された時にリセット
    useEffect(() => {
        if (activeTab !== 'gallery') {
            setGalleryView('class');
            setSelectedGalleryClass(null);
            setSelectedGalleryCard(null);
            setGalleryRelatedCardIds([]);
        }
    }, [activeTab]);

    // Scaled sizes
    const titleFontSize = 9 * scale;

    // タイトル画面 (GAME START)
    if (phase === 'title') {
        return (
            <div
                className="screen title-screen"
                onClick={handleGameStart}
                style={{
                    height: '100dvh',
                    width: '100vw',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    color: 'white',
                    cursor: 'pointer'
                }}
            >
                {/* Background */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url(${getAssetUrl('/title/background.png')})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    zIndex: 0
                }} />
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                    zIndex: -1
                }} />
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.3)',
                    zIndex: 1
                }} />

                {/* Title */}
                <div style={{
                    position: 'relative',
                    zIndex: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    transform: titleAnimating ? 'translateY(-100vh)' : 'translateY(0)',
                    transition: titleAnimating ? 'transform 0.6s ease-out' : 'none',
                }}>
                    <div style={{
                        fontFamily: 'Tamanegi, sans-serif',
                        fontSize: `${titleFontSize}rem`,
                        color: '#fff',
                        textShadow: '0 0 30px rgba(233, 69, 96, 0.9), 0 0 60px rgba(233, 69, 96, 0.5), 3px 3px 6px rgba(0,0,0,0.9)',
                        letterSpacing: `${0.5 * scale}rem`,
                        whiteSpace: 'nowrap',
                        marginBottom: `${2 * scale}rem`
                    }}>
                        てんふぶバース
                    </div>

                    {/* GAME START - 点滅アニメーション */}
                    <div style={{
                        fontSize: `${2 * scale}rem`,
                        color: '#fff',
                        fontWeight: 'bold',
                        letterSpacing: `${0.3 * scale}rem`,
                        animation: 'blink 1.5s ease-in-out infinite',
                        textShadow: '0 0 10px rgba(255, 255, 255, 0.8)',
                    }}>
                        GAME START
                    </div>
                </div>

                <p style={{
                    position: 'absolute',
                    bottom: 20 * scale,
                    opacity: 0.5,
                    fontSize: `${0.8 * scale}rem`,
                    zIndex: 2
                }}>
                    Ver 1.04 Beta
                </p>

                <style>{`
                    @keyframes blink {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.3; }
                    }
                `}</style>
            </div>
        );
    }

    // ホーム画面
    const menuItems: { id: MenuTab; label: string; color: string }[] = [
        { id: 'solo', label: 'ひとりで遊ぶ', color: '#e94560' },
        { id: 'room', label: 'ルームマッチ', color: '#60a5fa' },
        { id: 'random', label: 'ランダムマッチ', color: '#4ade80' },
        { id: 'home', label: 'ホーム', color: '#f59e0b' },
        { id: 'ranking', label: 'ランキング', color: '#a855f7' },
        { id: 'gallery', label: 'ギャラリー', color: '#ec4899' },
        { id: 'settings', label: '設定', color: '#6b7280' },
    ];

    return (
        <div
            className="screen home-screen"
            style={{
                height: '100dvh',
                width: '100vw',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                color: 'white',
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Background Layer - タイトル画面と同じ背景 */}
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
            {/* Dark overlay - ホーム画面は少し暗く */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                zIndex: 1
            }} />

            {/* メインコンテンツエリア */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingBottom: 80 * scale, // メニューバーの高さ分
                position: 'relative',
                zIndex: 2,
            }}>
                {/* 左側: お気に入りカード表示 - ホームタブでのみ表示 */}
                {displayedTab === 'home' && (() => {
                    console.log('🎴 Rendering home card, homeCardId:', homeCardId);
                    // カードデータを取得
                    const homeCard = homeCardId ? MOCK_CARDS.find(c => c.id === homeCardId) : null;
                    const normalImageUrl = homeCard?.imageUrl || `/cards/${homeCardId}.png`;
                    const evolvedImageUrl = homeCard?.type === 'FOLLOWER' ? (homeCard?.evolvedImageUrl || `/cards/${homeCardId}_evolved.png`) : null;
                    return (
                <div style={{
                    position: 'absolute',
                    left: 150 * scale,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    perspective: 1000,
                }}>
                    <div
                        onMouseDown={handleMouseDown}
                        style={{
                            width: 439 * scale,
                            height: 615 * scale,
                            transformStyle: 'preserve-3d',
                            transform: `rotateY(${cardRotation}deg)`,
                            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
                            cursor: isDragging ? 'grabbing' : 'grab',
                        }}
                    >
                        {/* カード表面 */}
                        <div style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            backfaceVisibility: 'hidden',
                            borderRadius: 12 * scale,
                            background: homeCardId
                                ? `#2d3748 url(${getAssetUrl(normalImageUrl)}) center/cover no-repeat`
                                : 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)',
                            border: `3px solid ${homeCardId ? '#e94560' : '#4a5568'}`,
                            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            {!homeCardId && (
                                <span style={{
                                    fontSize: `${0.9 * scale}rem`,
                                    color: '#718096',
                                    textAlign: 'center',
                                    padding: 20 * scale,
                                }}>
                                    ギャラリーで<br />ホームカードを<br />設定してください
                                </span>
                            )}
                        </div>
                        {/* カード裏面 */}
                        <div style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                            borderRadius: 12 * scale,
                            background: homeCardId && evolvedImageUrl
                                ? `#2d3748 url(${getAssetUrl(evolvedImageUrl)}) center/cover no-repeat`
                                : homeCardId
                                ? `#2d3748 url(${getAssetUrl(normalImageUrl)}) center/cover no-repeat`
                                : `url(${getAssetUrl('/cards/sleeve_default.png')}) center/cover no-repeat`,
                            border: `3px solid ${homeCardId ? '#a855f7' : '#4a5568'}`,
                            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            {!homeCardId && (
                                <span style={{
                                    fontSize: `${0.8 * scale}rem`,
                                    color: '#718096',
                                }}>
                                    スリーブ
                                </span>
                            )}
                        </div>
                    </div>
                    <p style={{
                        textAlign: 'center',
                        marginTop: 10 * scale,
                        fontSize: `${0.75 * scale}rem`,
                        color: '#888',
                    }}>
                        ドラッグで回転
                    </p>
                </div>
                    );
                })()}

                {/* 右側: プロフィール情報エリア - ホームタブでのみ表示 */}
                {displayedTab === 'home' && (
                    <div style={{
                        position: 'absolute',
                        right: 100 * scale,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: `${2 * scale}rem`,
                        width: 350 * scale,
                    }}>
                        {/* 上部: プロフィール */}
                        <div style={{
                            background: 'rgba(0, 0, 0, 0.6)',
                            border: '2px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: `${12 * scale}px`,
                            padding: `${20 * scale}px`,
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
                        }}>
                            <h3 style={{
                                margin: 0,
                                marginBottom: `${10 * scale}px`,
                                fontSize: `${1.2 * scale}rem`,
                                color: '#fff',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                                paddingBottom: `${8 * scale}px`,
                            }}>
                                プロフィール
                            </h3>
                            <div style={{
                                fontSize: `${1 * scale}rem`,
                                color: '#e2e8f0',
                            }}>
                                <div style={{ marginBottom: `${8 * scale}px` }}>
                                    <span style={{ color: '#aaa' }}>表示名:</span> {userId || 'ゲスト'}
                                </div>
                            </div>
                        </div>

                        {/* 下部: ランクとレート */}
                        <div style={{
                            background: 'rgba(0, 0, 0, 0.6)',
                            border: '2px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: `${12 * scale}px`,
                            padding: `${20 * scale}px`,
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
                        }}>
                            <h3 style={{
                                margin: 0,
                                marginBottom: `${10 * scale}px`,
                                fontSize: `${1.2 * scale}rem`,
                                color: '#fff',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                                paddingBottom: `${8 * scale}px`,
                            }}>
                                ランク・レート
                            </h3>
                            <div style={{
                                fontSize: `${1 * scale}rem`,
                                color: '#e2e8f0',
                            }}>
                                <div style={{ marginBottom: `${8 * scale}px` }}>
                                    <span style={{ color: '#aaa' }}>ランク:</span> <span style={{ color: '#ffd700', fontWeight: 'bold' }}>BRONZE</span>
                                </div>
                                <div>
                                    <span style={{ color: '#aaa' }}>レート:</span> <span style={{ color: '#4ade80', fontWeight: 'bold', fontSize: `${1.2 * scale}rem` }}>1000</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 中央: タブ別コンテンツ */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    maxWidth: 600 * scale,
                    opacity: isFading ? 0 : 1,
                    transition: 'opacity 0.3s ease-in-out',
                }}>
                    {/* ホームタブ */}
                    {displayedTab === 'home' && (
                        <div style={{ textAlign: 'center' }}>
                            <h2 style={{ fontSize: `${1.8 * scale}rem`, marginBottom: `${1 * scale}rem` }}>
                                ようこそ！
                            </h2>
                            <p style={{ fontSize: `${1 * scale}rem`, color: '#aaa' }}>
                                下のメニューから遊びたいモードを選んでください
                            </p>
                        </div>
                    )}

                    {/* ひとりで遊ぶ */}
                    {displayedTab === 'solo' && (
                        <div style={{ textAlign: 'center' }}>
                            <h2 style={{ fontSize: `${1.8 * scale}rem`, marginBottom: `${1 * scale}rem`, color: '#e94560' }}>
                                ひとりで遊ぶ
                            </h2>
                            <button
                                onClick={() => handleStartClassSelect('CPU')}
                                style={{
                                    padding: `${1 * scale}rem ${3 * scale}rem`,
                                    fontSize: `${1.2 * scale}rem`,
                                    background: '#e94560',
                                    border: 'none',
                                    borderRadius: 8 * scale,
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                }}
                            >
                                CPU対戦を始める
                            </button>
                        </div>
                    )}

                    {/* ルームマッチ - ドア風パネル */}
                    {displayedTab === 'room' && (
                        <div style={{ textAlign: 'center' }}>
                            <h2 style={{ fontSize: `${1.8 * scale}rem`, marginBottom: `${1.5 * scale}rem`, color: '#60a5fa' }}>
                                ルームマッチ
                            </h2>
                            {!showJoinInput ? (
                                <div style={{
                                    display: 'flex',
                                    gap: `${3 * scale}rem`,
                                    perspective: 1200,
                                }}>
                                    {/* 部屋を作るパネル - 左側なので右に傾ける */}
                                    <div
                                        onClick={() => handleStartClassSelect('HOST')}
                                        style={{
                                            width: 200 * scale,
                                            height: 280 * scale,
                                            background: 'linear-gradient(135deg, #1a2a3a 0%, #0d1a2a 100%)',
                                            border: '3px solid #60a5fa',
                                            borderRadius: 16 * scale,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            transform: 'rotateY(15deg)',
                                            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                                            boxShadow: '0 10px 30px rgba(96, 165, 250, 0.3)',
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.transform = 'rotateY(0deg) scale(1.05)';
                                            e.currentTarget.style.boxShadow = '0 15px 40px rgba(96, 165, 250, 0.5)';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.transform = 'rotateY(15deg)';
                                            e.currentTarget.style.boxShadow = '0 10px 30px rgba(96, 165, 250, 0.3)';
                                        }}
                                    >
                                        <div style={{
                                            fontSize: `${3 * scale}rem`,
                                            marginBottom: `${0.5 * scale}rem`,
                                        }}>
                                            🏠
                                        </div>
                                        <h3 style={{
                                            fontSize: `${1.4 * scale}rem`,
                                            color: '#60a5fa',
                                            margin: 0,
                                            marginBottom: `${0.5 * scale}rem`,
                                        }}>
                                            部屋を作る
                                        </h3>
                                        <p style={{
                                            fontSize: `${0.8 * scale}rem`,
                                            color: '#aaa',
                                            textAlign: 'center',
                                            padding: `0 ${1 * scale}rem`,
                                        }}>
                                            ルームIDを発行<br />友達を招待
                                        </p>
                                    </div>

                                    {/* 部屋に入るパネル - 右側なので左に傾ける */}
                                    <div
                                        onClick={() => setShowJoinInput(true)}
                                        style={{
                                            width: 200 * scale,
                                            height: 280 * scale,
                                            background: 'linear-gradient(135deg, #2a1a3a 0%, #1a0d2a 100%)',
                                            border: '3px solid #a855f7',
                                            borderRadius: 16 * scale,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            transform: 'rotateY(-15deg)',
                                            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                                            boxShadow: '0 10px 30px rgba(168, 85, 247, 0.3)',
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.transform = 'rotateY(0deg) scale(1.05)';
                                            e.currentTarget.style.boxShadow = '0 15px 40px rgba(168, 85, 247, 0.5)';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.transform = 'rotateY(-15deg)';
                                            e.currentTarget.style.boxShadow = '0 10px 30px rgba(168, 85, 247, 0.3)';
                                        }}
                                    >
                                        <div style={{
                                            fontSize: `${3 * scale}rem`,
                                            marginBottom: `${0.5 * scale}rem`,
                                        }}>
                                            🚪
                                        </div>
                                        <h3 style={{
                                            fontSize: `${1.4 * scale}rem`,
                                            color: '#a855f7',
                                            margin: 0,
                                            marginBottom: `${0.5 * scale}rem`,
                                        }}>
                                            部屋に入る
                                        </h3>
                                        <p style={{
                                            fontSize: `${0.8 * scale}rem`,
                                            color: '#aaa',
                                            textAlign: 'center',
                                            padding: `0 ${1 * scale}rem`,
                                        }}>
                                            ルームIDを入力<br />友達と対戦
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: `${1 * scale}rem`, alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        placeholder="ルームIDを入力"
                                        value={joinId}
                                        onChange={(e) => setJoinId(e.target.value)}
                                        style={{
                                            padding: `${0.8 * scale}rem`,
                                            fontSize: `${1 * scale}rem`,
                                            width: 250 * scale,
                                            background: 'rgba(255,255,255,0.1)',
                                            border: '2px solid #a855f7',
                                            borderRadius: 8 * scale,
                                            color: 'white',
                                            textAlign: 'center',
                                            userSelect: 'text',
                                        }}
                                    />
                                    <div style={{ display: 'flex', gap: `${0.5 * scale}rem` }}>
                                        <button
                                            onClick={() => setShowJoinInput(false)}
                                            style={{
                                                padding: `${0.6 * scale}rem ${1.5 * scale}rem`,
                                                fontSize: `${1 * scale}rem`,
                                                background: 'transparent',
                                                border: '1px solid #666',
                                                borderRadius: 6 * scale,
                                                color: '#888',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            戻る
                                        </button>
                                        <button
                                            onClick={() => handleStartClassSelect('JOIN', joinId)}
                                            disabled={!joinId}
                                            style={{
                                                padding: `${0.6 * scale}rem ${1.5 * scale}rem`,
                                                fontSize: `${1 * scale}rem`,
                                                background: joinId ? '#a855f7' : '#333',
                                                border: 'none',
                                                borderRadius: 6 * scale,
                                                color: 'white',
                                                cursor: joinId ? 'pointer' : 'not-allowed',
                                                opacity: joinId ? 1 : 0.5,
                                            }}
                                        >
                                            接続
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ランダムマッチ - ドア風パネル */}
                    {displayedTab === 'random' && (
                        <div style={{ textAlign: 'center' }}>
                            <h2 style={{ fontSize: `${1.8 * scale}rem`, marginBottom: `${1.5 * scale}rem`, color: '#4ade80' }}>
                                ランダムマッチ
                            </h2>
                            <div style={{
                                display: 'flex',
                                gap: `${3 * scale}rem`,
                                perspective: 1200,
                            }}>
                                {/* カジュアルパネル - 左側なので右に傾ける */}
                                <div
                                    onClick={() => handleMatchTypeSelect('casual')}
                                    style={{
                                        width: 200 * scale,
                                        height: 280 * scale,
                                        background: 'linear-gradient(135deg, #1a3a1a 0%, #0d2d0d 100%)',
                                        border: '3px solid #4ade80',
                                        borderRadius: 16 * scale,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        transform: 'rotateY(15deg)',
                                        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                                        boxShadow: '0 10px 30px rgba(74, 222, 128, 0.3)',
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.transform = 'rotateY(0deg) scale(1.05)';
                                        e.currentTarget.style.boxShadow = '0 15px 40px rgba(74, 222, 128, 0.5)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.transform = 'rotateY(15deg)';
                                        e.currentTarget.style.boxShadow = '0 10px 30px rgba(74, 222, 128, 0.3)';
                                    }}
                                >
                                    <div style={{
                                        fontSize: `${3 * scale}rem`,
                                        marginBottom: `${0.5 * scale}rem`,
                                    }}>
                                        🎮
                                    </div>
                                    <h3 style={{
                                        fontSize: `${1.4 * scale}rem`,
                                        color: '#4ade80',
                                        margin: 0,
                                        marginBottom: `${0.5 * scale}rem`,
                                    }}>
                                        カジュアル
                                    </h3>
                                    <p style={{
                                        fontSize: `${0.8 * scale}rem`,
                                        color: '#aaa',
                                        textAlign: 'center',
                                        padding: `0 ${1 * scale}rem`,
                                    }}>
                                        レート変動なし<br />気軽に対戦
                                    </p>
                                </div>

                                {/* ランクマッチパネル - 右側なので左に傾ける */}
                                <div
                                    onClick={() => handleMatchTypeSelect('ranked')}
                                    style={{
                                        width: 200 * scale,
                                        height: 280 * scale,
                                        background: 'linear-gradient(135deg, #3a1a1a 0%, #2d0d0d 100%)',
                                        border: '3px solid #e94560',
                                        borderRadius: 16 * scale,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        transform: 'rotateY(-15deg)',
                                        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                                        boxShadow: '0 10px 30px rgba(233, 69, 96, 0.3)',
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.transform = 'rotateY(0deg) scale(1.05)';
                                        e.currentTarget.style.boxShadow = '0 15px 40px rgba(233, 69, 96, 0.5)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.transform = 'rotateY(-15deg)';
                                        e.currentTarget.style.boxShadow = '0 10px 30px rgba(233, 69, 96, 0.3)';
                                    }}
                                >
                                    <div style={{
                                        fontSize: `${3 * scale}rem`,
                                        marginBottom: `${0.5 * scale}rem`,
                                    }}>
                                        ⚔️
                                    </div>
                                    <h3 style={{
                                        fontSize: `${1.4 * scale}rem`,
                                        color: '#e94560',
                                        margin: 0,
                                        marginBottom: `${0.5 * scale}rem`,
                                    }}>
                                        ランクマッチ
                                    </h3>
                                    <p style={{
                                        fontSize: `${0.8 * scale}rem`,
                                        color: '#aaa',
                                        textAlign: 'center',
                                        padding: `0 ${1 * scale}rem`,
                                    }}>
                                        勝敗でレート変動<br />真剣勝負
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ランキング（未実装） */}
                    {displayedTab === 'ranking' && (
                        <div style={{ textAlign: 'center' }}>
                            <h2 style={{ fontSize: `${1.8 * scale}rem`, marginBottom: `${1 * scale}rem`, color: '#a855f7' }}>
                                ランキング
                            </h2>
                            <p style={{ fontSize: `${1 * scale}rem`, color: '#888' }}>
                                Coming Soon...
                            </p>
                        </div>
                    )}

                    {/* ギャラリー */}
                    {displayedTab === 'gallery' && (
                        <>
                            {galleryView === 'class' && (
                                <div style={{ textAlign: 'center' }}>
                                    <h2 style={{ fontSize: `${1.8 * scale}rem`, marginBottom: `${1.5 * scale}rem`, color: '#ec4899' }}>
                                        ギャラリー - クラス選択
                                    </h2>

                                    {/* Class Cards */}
                                    <div style={{
                                        display: 'flex',
                                        gap: `${1.2 * scale}rem`,
                                        justifyContent: 'center',
                                        marginBottom: `${1 * scale}rem`
                                    }}>
                                        {/* Senka Class */}
                                        <div
                                            onClick={() => handleGalleryClassSelect('SENKA')}
                                    style={{
                                        width: 200 * scale,
                                        height: 280 * scale,
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
                                            fontSize: `${1.4 * scale}rem`,
                                            color: '#e94560',
                                            margin: 0,
                                            fontFamily: 'sans-serif'
                                        }}>
                                            盞華
                                        </h3>
                                    </div>
                                </div>

                                {/* Aja Class */}
                                <div
                                    onClick={() => handleGalleryClassSelect('AJA')}
                                    style={{
                                        width: 200 * scale,
                                        height: 280 * scale,
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
                                            fontSize: `${1.4 * scale}rem`,
                                            color: '#45a2e9',
                                            margin: 0,
                                            fontFamily: 'sans-serif'
                                        }}>
                                            あじゃ
                                        </h3>
                                    </div>
                                </div>

                                {/* Yoruka Class */}
                                <div
                                    onClick={() => handleGalleryClassSelect('YORUKA')}
                                    style={{
                                        width: 200 * scale,
                                        height: 280 * scale,
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
                                            fontSize: `${1.4 * scale}rem`,
                                            color: '#a855f7',
                                            margin: 0,
                                            fontFamily: 'sans-serif'
                                        }}>
                                            Y
                                        </h3>
                                    </div>
                                </div>
                            </div>
                                </div>
                            )}

                            {galleryView === 'card-list' && selectedGalleryClass && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    overflow: 'auto'
                                }}>
                                    <GalleryCardListScreen
                                        classType={selectedGalleryClass}
                                        onSelectCard={handleGalleryCardSelect}
                                    />
                                </div>
                            )}

                            {galleryView === 'card-detail' && selectedGalleryCard && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    overflow: 'auto'
                                }}>
                                    <GalleryCardDetailScreen
                                        cardId={selectedGalleryCard}
                                        onOpenRelatedCard={handleGalleryRelatedCardOpen}
                                        onBack={handleBackFromCardDetail}
                                        onSetHomeCard={onSetHomeCard}
                                    />
                                </div>
                            )}

                            {galleryView === 'related-card' && selectedGalleryCard && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    overflow: 'auto'
                                }}>
                                    <GalleryRelatedCardScreen
                                        parentCardId={selectedGalleryCard}
                                        relatedCardIds={galleryRelatedCardIds}
                                        onBack={handleBackFromRelatedCard}
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {/* 設定 */}
                    {displayedTab === 'settings' && (
                        <div style={{
                            background: 'rgba(0, 0, 0, 0.3)',
                            borderRadius: 12 * scale,
                            padding: `${2 * scale}rem`,
                            minWidth: 400 * scale,
                        }}>
                            <h2 style={{
                                fontSize: `${1.8 * scale}rem`,
                                marginBottom: `${1.5 * scale}rem`,
                                color: '#6b7280',
                                textAlign: 'center',
                            }}>
                                設定
                            </h2>

                            {/* BGM */}
                            <div style={{ marginBottom: `${1.5 * scale}rem` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: `${0.5 * scale}rem` }}>
                                    <span style={{ fontSize: `${1 * scale}rem` }}>BGM</span>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 * scale, cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={audioSettings.bgmEnabled}
                                            onChange={(e) => onAudioSettingsChange({ bgmEnabled: e.target.checked })}
                                            style={{ width: 18 * scale, height: 18 * scale }}
                                        />
                                        <span style={{ color: audioSettings.bgmEnabled ? '#4ade80' : '#888', fontSize: `${0.9 * scale}rem` }}>
                                            {audioSettings.bgmEnabled ? 'ON' : 'OFF'}
                                        </span>
                                    </label>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    value={audioSettings.bgm}
                                    onChange={(e) => onAudioSettingsChange({ bgm: parseFloat(e.target.value) })}
                                    disabled={!audioSettings.bgmEnabled}
                                    style={{ width: '100%', opacity: audioSettings.bgmEnabled ? 1 : 0.5 }}
                                />
                            </div>

                            {/* SE */}
                            <div style={{ marginBottom: `${1.5 * scale}rem` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: `${0.5 * scale}rem` }}>
                                    <span style={{ fontSize: `${1 * scale}rem` }}>効果音</span>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 * scale, cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={audioSettings.seEnabled}
                                            onChange={(e) => onAudioSettingsChange({ seEnabled: e.target.checked })}
                                            style={{ width: 18 * scale, height: 18 * scale }}
                                        />
                                        <span style={{ color: audioSettings.seEnabled ? '#4ade80' : '#888', fontSize: `${0.9 * scale}rem` }}>
                                            {audioSettings.seEnabled ? 'ON' : 'OFF'}
                                        </span>
                                    </label>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    value={audioSettings.se}
                                    onChange={(e) => onAudioSettingsChange({ se: parseFloat(e.target.value) })}
                                    disabled={!audioSettings.seEnabled}
                                    style={{ width: '100%', opacity: audioSettings.seEnabled ? 1 : 0.5 }}
                                />
                            </div>

                            {/* プロフィール設定 */}
                            <div style={{
                                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                                paddingTop: `${1.5 * scale}rem`,
                                marginTop: `${1 * scale}rem`,
                                marginBottom: `${1.5 * scale}rem`
                            }}>
                                <h3 style={{
                                    fontSize: `${1.2 * scale}rem`,
                                    marginBottom: `${1 * scale}rem`,
                                    color: '#fff'
                                }}>
                                    プロフィール
                                </h3>

                                <button
                                    onClick={onNavigateToProfile}
                                    style={{
                                        width: '100%',
                                        padding: `${0.6 * scale}rem ${1 * scale}rem`,
                                        fontSize: `${0.9 * scale}rem`,
                                        background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                                        border: 'none',
                                        borderRadius: 6 * scale,
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        transition: 'all 0.3s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    プレイヤー名を変更
                                </button>
                            </div>

                            {/* アカウント */}
                            <div style={{
                                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                                paddingTop: `${1.5 * scale}rem`,
                                marginTop: `${1 * scale}rem`
                            }}>
                                <h3 style={{
                                    fontSize: `${1.2 * scale}rem`,
                                    marginBottom: `${1 * scale}rem`,
                                    color: '#fff'
                                }}>
                                    アカウント
                                </h3>

                                {isAnonymous ? (
                                    // 匿名ユーザーの場合
                                    <div>
                                        <p style={{
                                            fontSize: `${0.9 * scale}rem`,
                                            color: '#aaa',
                                            marginBottom: `${1 * scale}rem`
                                        }}>
                                            ログインしていません
                                        </p>

                                        <div style={{
                                            display: 'flex',
                                            gap: 10 * scale,
                                            marginBottom: `${1 * scale}rem`
                                        }}>
                                            <button
                                                onClick={onNavigateToRegister}
                                                style={{
                                                    flex: 1,
                                                    padding: `${0.6 * scale}rem ${1 * scale}rem`,
                                                    fontSize: `${0.9 * scale}rem`,
                                                    background: 'linear-gradient(135deg, #4a9eff 0%, #357abd 100%)',
                                                    border: 'none',
                                                    borderRadius: 6 * scale,
                                                    color: 'white',
                                                    cursor: 'pointer',
                                                    fontWeight: 'bold',
                                                    transition: 'all 0.3s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                            >
                                                アカウント登録
                                            </button>
                                            <button
                                                onClick={onNavigateToLogin}
                                                style={{
                                                    flex: 1,
                                                    padding: `${0.6 * scale}rem ${1 * scale}rem`,
                                                    fontSize: `${0.9 * scale}rem`,
                                                    background: '#555',
                                                    border: 'none',
                                                    borderRadius: 6 * scale,
                                                    color: 'white',
                                                    cursor: 'pointer',
                                                    fontWeight: 'bold',
                                                    transition: 'all 0.3s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#666'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = '#555'}
                                            >
                                                ログイン
                                            </button>
                                        </div>

                                        <p style={{
                                            fontSize: `${0.75 * scale}rem`,
                                            color: '#888',
                                            textAlign: 'center',
                                            lineHeight: 1.4
                                        }}>
                                            ※アカウント登録すると、別の端末からデータを引き継げます
                                        </p>
                                    </div>
                                ) : (
                                    // 登録済みユーザーの場合
                                    <div>
                                        <p style={{
                                            fontSize: `${0.9 * scale}rem`,
                                            color: '#4ade80',
                                            marginBottom: `${0.5 * scale}rem`,
                                            fontWeight: 'bold'
                                        }}>
                                            ログイン中
                                        </p>
                                        <p style={{
                                            fontSize: `${0.85 * scale}rem`,
                                            color: '#fff',
                                            marginBottom: `${0.3 * scale}rem`
                                        }}>
                                            ユーザーID: <span style={{ color: '#4a9eff', fontWeight: 'bold' }}>{userId || '不明'}</span>
                                        </p>

                                        <button
                                            onClick={handleLogoutClick}
                                            style={{
                                                width: '100%',
                                                padding: `${0.6 * scale}rem ${1 * scale}rem`,
                                                fontSize: `${0.9 * scale}rem`,
                                                background: '#d32f2f',
                                                border: 'none',
                                                borderRadius: 6 * scale,
                                                color: 'white',
                                                cursor: 'pointer',
                                                fontWeight: 'bold',
                                                transition: 'all 0.3s',
                                                marginTop: `${0.5 * scale}rem`
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = '#b71c1c'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = '#d32f2f'}
                                        >
                                            ログアウト
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 下部メニューバー */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 70 * scale,
                background: 'rgba(0, 0, 0, 0.8)',
                borderTop: '2px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: `${0.5 * scale}rem`,
                padding: `0 ${1 * scale}rem`,
                zIndex: 3,
            }}>
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => handleTabChange(item.id)}
                        style={{
                            flex: 1,
                            maxWidth: 140 * scale,
                            padding: `${0.6 * scale}rem ${0.5 * scale}rem`,
                            fontSize: `${0.85 * scale}rem`,
                            background: activeTab === item.id ? item.color : 'transparent',
                            border: activeTab === item.id ? 'none' : `2px solid ${item.color}`,
                            borderRadius: 8 * scale,
                            color: activeTab === item.id ? 'white' : item.color,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontWeight: activeTab === item.id ? 'bold' : 'normal',
                        }}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <p style={{
                position: 'absolute',
                bottom: 75 * scale,
                right: 20 * scale,
                opacity: 0.5,
                fontSize: `${0.7 * scale}rem`,
                zIndex: 2,
            }}>
                Ver 1.04 Beta
            </p>

            {/* ログアウト確認ダイアログ */}
            {showLogoutConfirm && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0, 0, 0, 0.7)',
                    zIndex: 100
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                        borderRadius: 12 * scale,
                        padding: `${2 * scale}rem`,
                        minWidth: 300 * scale,
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
                    }}>
                        <h3 style={{
                            fontSize: `${1.2 * scale}rem`,
                            marginBottom: `${1 * scale}rem`,
                            color: '#fff',
                            textAlign: 'center'
                        }}>
                            ログアウトしますか？
                        </h3>

                        <div style={{
                            display: 'flex',
                            gap: 10 * scale,
                            marginTop: `${1.5 * scale}rem`
                        }}>
                            <button
                                onClick={handleLogoutCancel}
                                style={{
                                    flex: 1,
                                    padding: `${0.6 * scale}rem ${1 * scale}rem`,
                                    fontSize: `${0.9 * scale}rem`,
                                    background: '#555',
                                    border: 'none',
                                    borderRadius: 6 * scale,
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    transition: 'all 0.3s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#666'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#555'}
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleLogoutConfirm}
                                style={{
                                    flex: 1,
                                    padding: `${0.6 * scale}rem ${1 * scale}rem`,
                                    fontSize: `${0.9 * scale}rem`,
                                    background: '#d32f2f',
                                    border: 'none',
                                    borderRadius: 6 * scale,
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    transition: 'all 0.3s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#b71c1c'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#d32f2f'}
                            >
                                ログアウト
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* クラス選択オーバーレイ */}
            {showingClassSelect && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0, 0, 0, 0.85)',
                    zIndex: 200,
                    padding: `${2 * scale}rem`,
                }}>
                    {/* タイトル */}
                    <h2 style={{
                        fontSize: `${2 * scale}rem`,
                        marginBottom: `${2 * scale}rem`,
                        color: '#fff',
                    }}>
                        クラスを選択
                    </h2>

                    {/* クラスカード */}
                    <div style={{
                        display: 'flex',
                        gap: `${1.5 * scale}rem`,
                        marginBottom: `${1 * scale}rem`,
                    }}>
                        {/* 盞華 */}
                        <div
                            onClick={() => handleClassSelected('SENKA')}
                            style={{
                                width: 200 * scale,
                                borderRadius: 12 * scale,
                                overflow: 'hidden',
                                cursor: 'pointer',
                                border: '3px solid rgba(255, 255, 255, 0.3)',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
                                background: 'linear-gradient(180deg, #2c0b0e 0%, #1a1a2e 100%)',
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-10px) scale(1.05)';
                                e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 100, 100, 0.5)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.5)';
                            }}
                        >
                            <img src={senkaLeaderImg} alt="盞華" style={{ width: '100%', height: 168 * scale, objectFit: 'cover' }} />
                            <div style={{ padding: `${8 * scale}px`, textAlign: 'center' }}>
                                <h3 style={{ fontSize: `${1.4 * scale}rem`, color: '#e94560', margin: 0 }}>盞華</h3>
                                <p style={{ color: '#aaa', margin: `${4 * scale}px 0`, fontSize: `${0.75 * scale}rem` }}>アグロ / ラッシュ</p>
                                <p style={{ fontSize: `${0.65 * scale}rem`, opacity: 0.8, lineHeight: 1.3, margin: 0 }}>
                                    突進フォロワーと多面展開で<br />相手を圧倒する。
                                </p>
                            </div>
                        </div>

                        {/* あじゃ */}
                        <div
                            onClick={() => handleClassSelected('AJA')}
                            style={{
                                width: 200 * scale,
                                borderRadius: 12 * scale,
                                overflow: 'hidden',
                                cursor: 'pointer',
                                border: '3px solid rgba(255, 255, 255, 0.3)',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
                                background: 'linear-gradient(180deg, #0f1c2e 0%, #1a1a2e 100%)',
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-10px) scale(1.05)';
                                e.currentTarget.style.boxShadow = '0 8px 25px rgba(100, 200, 255, 0.5)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.5)';
                            }}
                        >
                            <img src={azyaLeaderImg} alt="あじゃ" style={{ width: '100%', height: 168 * scale, objectFit: 'cover', objectPosition: 'center top' }} />
                            <div style={{ padding: `${8 * scale}px`, textAlign: 'center' }}>
                                <h3 style={{ fontSize: `${1.4 * scale}rem`, color: '#45a2e9', margin: 0 }}>あじゃ</h3>
                                <p style={{ color: '#aaa', margin: `${4 * scale}px 0`, fontSize: `${0.75 * scale}rem` }}>コントロール / テクニカル</p>
                                <p style={{ fontSize: `${0.65 * scale}rem`, opacity: 0.8, lineHeight: 1.3, margin: 0 }}>
                                    強力な除去と堅牢な守護で<br />盤面を支配する。
                                </p>
                            </div>
                        </div>

                        {/* Y */}
                        <div
                            onClick={() => handleClassSelected('YORUKA')}
                            style={{
                                width: 200 * scale,
                                borderRadius: 12 * scale,
                                overflow: 'hidden',
                                cursor: 'pointer',
                                border: '3px solid rgba(255, 255, 255, 0.3)',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
                                background: 'linear-gradient(180deg, #1a0f2e 0%, #1a1a2e 100%)',
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-10px) scale(1.05)';
                                e.currentTarget.style.boxShadow = '0 8px 25px rgba(200, 100, 255, 0.5)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.5)';
                            }}
                        >
                            <img src={yorukaLeaderImg} alt="Y" style={{ width: '100%', height: 168 * scale, objectFit: 'cover' }} />
                            <div style={{ padding: `${8 * scale}px`, textAlign: 'center' }}>
                                <h3 style={{ fontSize: `${1.4 * scale}rem`, color: '#a855f7', margin: 0 }}>Y</h3>
                                <p style={{ color: '#aaa', margin: `${4 * scale}px 0`, fontSize: `${0.75 * scale}rem` }}>ミッドレンジ / トリッキー</p>
                                <p style={{ fontSize: `${0.65 * scale}rem`, opacity: 0.8, lineHeight: 1.3, margin: 0 }}>
                                    墓地をリソースにする変則的な戦法で<br />相手を翻弄する。
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ランクマッチの場合、レート表示 */}
                    {classSelectMode === 'RANKED_MATCH' && !loadingRatings && (
                        <div style={{
                            display: 'flex',
                            gap: `${1.5 * scale}rem`,
                            marginBottom: `${2 * scale}rem`,
                        }}>
                            {(['SENKA', 'AJA', 'YORUKA'] as ClassType[]).map((classType) => {
                                const rating = classRatings[classType];
                                const ratingValue = rating?.rating ?? 0;
                                const rank = getRankFromRating(ratingValue);
                                const rankColor = RANK_COLORS[rank];
                                const rankName = RANK_DISPLAY_NAMES[rank];

                                return (
                                    <div key={classType} style={{
                                        width: 200 * scale,
                                        textAlign: 'center',
                                        color: '#fff',
                                    }}>
                                        <div style={{
                                            fontSize: `${1 * scale}rem`,
                                            color: rankColor,
                                            fontWeight: 'bold',
                                        }}>
                                            {rankName}
                                        </div>
                                        <div style={{
                                            fontSize: `${1.2 * scale}rem`,
                                            color: '#4ade80',
                                            fontWeight: 'bold',
                                        }}>
                                            {ratingValue}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* 戻るボタン */}
                    <button
                        onClick={handleCancelClassSelect}
                        style={{
                            padding: `${0.8 * scale}rem ${2 * scale}rem`,
                            fontSize: `${1 * scale}rem`,
                            background: 'transparent',
                            border: '2px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: 8 * scale,
                            color: 'white',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                        }}
                    >
                        戻る
                    </button>
                </div>
            )}
        </div>
    );
};
