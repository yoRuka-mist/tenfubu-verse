import { useState, useRef, useEffect, useCallback } from 'react';
import { TitleScreen } from './screens/TitleScreen';
import { ClassSelectScreen } from './screens/ClassSelectScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { MatchmakingScreen } from './screens/MatchmakingScreen';
import { GameScreen } from './screens/GameScreen';
import { GalleryClassSelectScreen } from './screens/GalleryClassSelectScreen';
import { GalleryCardListScreen } from './screens/GalleryCardListScreen';
import { GalleryCardDetailScreen } from './screens/GalleryCardDetailScreen';
import { GalleryRelatedCardScreen } from './screens/GalleryRelatedCardScreen';
import { ClassType, AIDifficulty, AudioSettings } from './core/types';
import { NetworkAdapter } from './network/types';
import { signInAnonymousUser, onAuthStateChange } from './firebase/auth';
import { getOrCreatePlayerData } from './firebase/playerData';
import { MOCK_CARDS } from './core/engine';

// Helper function to resolve asset paths with base URL for GitHub Pages deployment
const getAssetUrl = (path: string): string => {
    const base = import.meta.env.BASE_URL || '/';
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${base}${cleanPath}`;
};

// BGM URL
const titleBgmUrl = getAssetUrl('/bgm/tenfubu.mp3');

// Default audio settings
const defaultAudioSettings: AudioSettings = {
    bgm: 0.3,
    se: 0.5,
    voice: 0.5,
    bgmEnabled: true,
    seEnabled: true
};

// Load audio settings from localStorage
const loadAudioSettings = (): AudioSettings => {
    try {
        const saved = localStorage.getItem('audioSettings');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Migration: if 'enabled' exists, use it for both bgmEnabled and seEnabled
            if (parsed.enabled !== undefined) {
                const { enabled, ...rest } = parsed;
                return { ...defaultAudioSettings, ...rest, bgmEnabled: enabled, seEnabled: enabled };
            }
            return { ...defaultAudioSettings, ...parsed };
        }
        return defaultAudioSettings;
    } catch (e) {
        return defaultAudioSettings;
    }
};

type Screen = 'TITLE' | 'CLASS_SELECT' | 'LOBBY' | 'MATCHMAKING' | 'GAME' |
                'GALLERY_CLASS_SELECT' | 'GALLERY_CARD_LIST' | 'GALLERY_CARD_DETAIL' | 'GALLERY_RELATED_CARD';
type GameMode = 'CPU' | 'HOST' | 'JOIN' | 'CASUAL_MATCH' | 'RANKED_MATCH' | 'RANDOM_MATCH';

// Portrait mode detection hook
const useIsPortrait = () => {
    const [isPortrait, setIsPortrait] = useState(false);

    useEffect(() => {
        const checkOrientation = () => {
            // Only check on mobile devices (screen width < 1024 in portrait mode or touch device)
            const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const isPortraitOrientation = window.innerHeight > window.innerWidth;
            setIsPortrait(isMobile && isPortraitOrientation);
        };

        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);

        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);

    return isPortrait;
};


function App() {
    const [currentScreen, setCurrentScreen] = useState<Screen>('TITLE');
    const [selectedClass, setSelectedClass] = useState<ClassType>('SENKA');
    const [gameMode, setGameMode] = useState<GameMode>('CPU');
    const [roomId, setRoomId] = useState<string>('');
    const [opponentClass, setOpponentClass] = useState<ClassType | undefined>(undefined);
    const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('NORMAL');

    // Firebase Auth: プレイヤーID
    const [playerId, setPlayerId] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_authLoading, setAuthLoading] = useState(true);

    // Turn timer setting (persisted to localStorage)
    const [timerEnabled, setTimerEnabled] = useState<boolean>(() => {
        const saved = localStorage.getItem('timerEnabled');
        return saved !== null ? JSON.parse(saved) : true;
    });

    // Player name state (persisted to localStorage)
    const [playerName, setPlayerName] = useState<string>(() => {
        return localStorage.getItem('playerName') || '';
    });

    // 相手のプレイヤー情報（ランクマッチ用）
    const [opponentPlayerId, setOpponentPlayerId] = useState<string | undefined>(undefined);
    const [opponentRating, setOpponentRating] = useState<number | undefined>(undefined);

    // Portrait mode detection
    const isPortrait = useIsPortrait();

    // Shared network adapter for online play
    const networkAdapterRef = useRef<NetworkAdapter | null>(null);
    const [networkConnected, setNetworkConnected] = useState(false);

    // Audio settings (shared across screens)
    const [audioSettings, setAudioSettings] = useState<AudioSettings>(loadAudioSettings);

    // Gallery flow states
    const [galleryClassType, setGalleryClassType] = useState<ClassType | null>(null);
    const [galleryCardId, setGalleryCardId] = useState<string | null>(null);
    const [galleryRelatedCardIds, setGalleryRelatedCardIds] = useState<string[]>([]);

    // Firebase Auth: 認証処理
    useEffect(() => {
        // 認証状態の監視
        const unsubscribe = onAuthStateChange(async (user) => {
            if (user) {
                setPlayerId(user.uid);
                // プレイヤーデータを取得/作成
                try {
                    await getOrCreatePlayerData(user.uid, playerName || 'プレイヤー');
                } catch (error) {
                    console.error('Failed to create player data:', error);
                }
            } else {
                // 未認証の場合は匿名認証を実行
                try {
                    const uid = await signInAnonymousUser();
                    setPlayerId(uid);
                    await getOrCreatePlayerData(uid, playerName || 'プレイヤー');
                } catch (error) {
                    console.error('Failed to sign in:', error);
                }
            }
            setAuthLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Save audio settings to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('audioSettings', JSON.stringify(audioSettings));
    }, [audioSettings]);

    // Update audio settings callback
    const updateAudioSettings = useCallback((newSettings: Partial<AudioSettings>) => {
        setAudioSettings(prev => ({ ...prev, ...newSettings }));
    }, []);

    // Lobby game start callback
    const handleLobbyGameStart = useCallback((adapter: NetworkAdapter, oppClass?: ClassType) => {
        networkAdapterRef.current = adapter;
        setNetworkConnected(true);
        if (oppClass) setOpponentClass(oppClass);
        setCurrentScreen('GAME');
    }, []);

    // Matchmaking game start callback
    const handleMatchmakingGameStart = useCallback((
        adapter: NetworkAdapter,
        oppClass: ClassType,
        _isHost: boolean,
        oppPlayerId?: string,
        oppRating?: number
    ) => {
        networkAdapterRef.current = adapter;
        setNetworkConnected(true);
        setOpponentClass(oppClass);
        setOpponentPlayerId(oppPlayerId);
        setOpponentRating(oppRating);
        setCurrentScreen('GAME');
    }, []);

    // Rematching callback
    const handleRematching = useCallback((deckType: ClassType) => {
        if (networkAdapterRef.current) {
            networkAdapterRef.current.disconnect();
            networkAdapterRef.current = null;
        }
        setNetworkConnected(false);
        setOpponentClass(undefined);
        setOpponentPlayerId(undefined);
        setOpponentRating(undefined);
        setSelectedClass(deckType);
        setCurrentScreen('MATCHMAKING');
    }, []);

    // Title BGM management (plays on TITLE and CLASS_SELECT screens)
    const titleBgmRef = useRef<HTMLAudioElement | null>(null);
    const titleBgmInitialized = useRef(false);

    useEffect(() => {
        // Create audio element once
        const audio = new Audio(titleBgmUrl);
        audio.loop = true;
        audio.volume = audioSettings.bgmEnabled ? audioSettings.bgm : 0;
        titleBgmRef.current = audio;
        titleBgmInitialized.current = true;

        return () => {
            audio.pause();
            audio.src = '';
        };
    }, []);

    // Update BGM volume when audio settings change
    useEffect(() => {
        const audio = titleBgmRef.current;
        if (!audio || !titleBgmInitialized.current) return;

        audio.volume = audioSettings.bgmEnabled ? audioSettings.bgm : 0;

        if (!audioSettings.bgmEnabled) {
            audio.pause();
        } else if (audio.paused && (currentScreen === 'TITLE' || currentScreen === 'CLASS_SELECT')) {
            audio.play().catch(() => {});
        }
    }, [audioSettings.bgm, audioSettings.bgmEnabled, currentScreen]);

    // Control BGM based on current screen
    useEffect(() => {
        const audio = titleBgmRef.current;
        if (!audio) return;

        if (currentScreen === 'TITLE' || currentScreen === 'CLASS_SELECT' || currentScreen === 'LOBBY') {
            // Play title BGM on title, class select, match type select, and lobby screens if enabled
            if (audio.paused && audioSettings.bgmEnabled) {
                audio.play().catch(() => {
                    // Autoplay blocked, will play on user interaction
                });
            }
        } else {
            // Stop title BGM on other screens
            audio.pause();
            audio.currentTime = 0;
        }
    }, [currentScreen, audioSettings.bgmEnabled]);

    // Handle user interaction for autoplay policy
    useEffect(() => {
        const handleClick = () => {
            const audio = titleBgmRef.current;
            if (audio && audio.paused && audioSettings.bgmEnabled && (currentScreen === 'TITLE' || currentScreen === 'CLASS_SELECT' || currentScreen === 'LOBBY')) {
                audio.play().catch(() => {});
            }
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [currentScreen, audioSettings.bgmEnabled]);

    const handleTitleConfig = useCallback((mode: GameMode, id?: string) => {
        setGameMode(mode);
        if (id) setRoomId(id);
        setCurrentScreen('CLASS_SELECT');
    }, []);

    const startGame = useCallback((cls: ClassType) => {
        setSelectedClass(cls);
        // CPU mode: go directly to game
        // CASUAL_MATCH/RANKED_MATCH: go to matchmaking screen
        // HOST/JOIN mode: go to lobby first to wait for connection
        if (gameMode === 'CPU') {
            setCurrentScreen('GAME');
        } else if (gameMode === 'CASUAL_MATCH' || gameMode === 'RANKED_MATCH') {
            // カジュアル/ランクマッチ → マッチメイキング画面へ
            setCurrentScreen('MATCHMAKING');
        } else {
            // HOST/JOIN → ロビー画面へ
            setCurrentScreen('LOBBY');
        }
    }, [gameMode]);

    const backToTitle = useCallback(() => {
        // Disconnect network if connected
        if (networkAdapterRef.current) {
            networkAdapterRef.current.disconnect();
            networkAdapterRef.current = null;
        }
        setNetworkConnected(false);
        setCurrentScreen('TITLE');
        // Reset state
        setRoomId('');
        setGameMode('CPU');
        setOpponentClass(undefined);
        setOpponentPlayerId(undefined);
        setOpponentRating(undefined);
        // Reset gallery state
        setGalleryClassType(null);
        setGalleryCardId(null);
        setGalleryRelatedCardIds([]);
    }, []);

    // Gallery handlers
    const handleGalleryStart = useCallback(() => {
        setCurrentScreen('GALLERY_CLASS_SELECT');
    }, []);

    const handleGalleryClassSelect = useCallback((cls: ClassType) => {
        setGalleryClassType(cls);
        setCurrentScreen('GALLERY_CARD_LIST');
    }, []);

    const handleGalleryCardSelect = useCallback((cardId: string) => {
        setGalleryCardId(cardId);
        setCurrentScreen('GALLERY_CARD_DETAIL');
    }, []);

    const handleGalleryRelatedCardOpen = useCallback((parentCardId: string) => {
        // MOCK_CARDSから親カードを取得
        const parentCard = MOCK_CARDS.find(c => c.id === parentCardId);
        if (parentCard && parentCard.relatedCards && parentCard.relatedCards.length > 0) {
            setGalleryCardId(parentCardId);
            setGalleryRelatedCardIds(parentCard.relatedCards);
            setCurrentScreen('GALLERY_RELATED_CARD');
        }
    }, []);

    const backFromGalleryCardList = useCallback(() => {
        setGalleryClassType(null);
        setCurrentScreen('GALLERY_CLASS_SELECT');
    }, []);

    const backFromGalleryCardDetail = useCallback(() => {
        setGalleryCardId(null);
        setCurrentScreen('GALLERY_CARD_LIST');
    }, []);

    const backFromGalleryRelatedCard = useCallback(() => {
        setGalleryRelatedCardIds([]);
        setCurrentScreen('GALLERY_CARD_DETAIL');
    }, []);

    return (
        <div className="app-container">
            {/* Portrait mode overlay - asks user to rotate device */}
            {isPortrait && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100dvh',
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 99999,
                    color: 'white',
                    textAlign: 'center',
                    padding: 20
                }}>
                    {/* Rotate icon */}
                    <div style={{
                        fontSize: '4rem',
                        marginBottom: 20,
                        animation: 'rotatePhone 2s ease-in-out infinite'
                    }}>
                        📱
                    </div>
                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        marginBottom: 10,
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                    }}>
                        横画面でプレイしてください
                    </h2>
                    <p style={{
                        fontSize: '1rem',
                        opacity: 0.8,
                        maxWidth: 280
                    }}>
                        端末を横向きに回転させてください
                    </p>
                    <style>{`
                        @keyframes rotatePhone {
                            0%, 100% { transform: rotate(0deg); }
                            25% { transform: rotate(-30deg); }
                            75% { transform: rotate(30deg); }
                        }
                    `}</style>
                </div>
            )}

            {currentScreen === 'TITLE' && (
                <TitleScreen
                    onStartConfig={handleTitleConfig}
                    audioSettings={audioSettings}
                    onAudioSettingsChange={updateAudioSettings}
                    playerId={playerId}
                    onGalleryStart={handleGalleryStart}
                />
            )}
            {currentScreen === 'CLASS_SELECT' && (
                <ClassSelectScreen
                    onSelectClass={startGame}
                    onBack={backToTitle}
                    gameMode={gameMode}
                    aiDifficulty={aiDifficulty}
                    onDifficultyChange={setAiDifficulty}
                    playerName={playerName}
                    onPlayerNameChange={(name: string) => {
                        setPlayerName(name);
                        localStorage.setItem('playerName', name);
                    }}
                    timerEnabled={timerEnabled}
                    onTimerEnabledChange={(enabled: boolean) => {
                        setTimerEnabled(enabled);
                        localStorage.setItem('timerEnabled', JSON.stringify(enabled));
                    }}
                    playerId={playerId}
                />
            )}
            {currentScreen === 'LOBBY' && (
                <LobbyScreen
                    gameMode={gameMode as 'HOST' | 'JOIN'}
                    targetRoomId={roomId}
                    playerClass={selectedClass}
                    onGameStart={handleLobbyGameStart}
                    onBack={backToTitle}
                />
            )}
            {currentScreen === 'MATCHMAKING' && (
                <MatchmakingScreen
                    matchType={gameMode === 'CASUAL_MATCH' ? 'casual' : 'ranked'}
                    playerClass={selectedClass}
                    playerName={playerName || 'プレイヤー'}
                    playerId={playerId}
                    onGameStart={handleMatchmakingGameStart}
                    onCancel={backToTitle}
                />
            )}
            {currentScreen === 'GAME' && (
                <GameScreen
                    playerClass={selectedClass}
                    opponentType={gameMode === 'CPU' ? 'CPU' : 'ONLINE'}
                    gameMode={gameMode}
                    targetRoomId={roomId}
                    onLeave={backToTitle}
                    onRematching={handleRematching}
                    networkAdapter={networkAdapterRef.current}
                    networkConnected={networkConnected}
                    opponentClass={opponentClass}
                    aiDifficulty={aiDifficulty}
                    playerName={playerName || 'プレイヤー'}
                    timerEnabled={gameMode === 'CASUAL_MATCH' || gameMode === 'RANKED_MATCH' ? true : timerEnabled}
                    playerId={playerId}
                    opponentPlayerId={opponentPlayerId}
                    opponentRating={opponentRating}
                />
            )}
            {currentScreen === 'GALLERY_CLASS_SELECT' && (
                <GalleryClassSelectScreen
                    onSelectClass={handleGalleryClassSelect}
                    onBack={backToTitle}
                />
            )}
            {currentScreen === 'GALLERY_CARD_LIST' && galleryClassType && (
                <GalleryCardListScreen
                    classType={galleryClassType}
                    onSelectCard={handleGalleryCardSelect}
                    onBack={backFromGalleryCardList}
                />
            )}
            {currentScreen === 'GALLERY_CARD_DETAIL' && galleryCardId && (
                <GalleryCardDetailScreen
                    cardId={galleryCardId}
                    onOpenRelatedCard={handleGalleryRelatedCardOpen}
                    onBack={backFromGalleryCardDetail}
                />
            )}
            {currentScreen === 'GALLERY_RELATED_CARD' && galleryCardId && (
                <GalleryRelatedCardScreen
                    parentCardId={galleryCardId}
                    relatedCardIds={galleryRelatedCardIds}
                    onBack={backFromGalleryRelatedCard}
                />
            )}
        </div>
    );
}

export default App;
