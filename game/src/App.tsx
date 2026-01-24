import { useState, useRef, useEffect, useCallback } from 'react';
import { TitleScreen } from './screens/TitleScreen';
import { ClassSelectScreen } from './screens/ClassSelectScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { MatchmakingScreen } from './screens/MatchmakingScreen';
import { GameScreen } from './screens/GameScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { LoginScreen } from './screens/LoginScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ClassType, AIDifficulty, AudioSettings } from './core/types';
import { NetworkAdapter } from './network/types';
import { signInAnonymousUser, onAuthStateChange, logOut } from './firebase/auth';
import { getOrCreatePlayerData } from './firebase/playerData';

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
                'REGISTER' | 'LOGIN' | 'PROFILE';
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
    const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
    const [_userEmail, setUserEmail] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [authLoading, setAuthLoading] = useState<boolean>(true);

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
    const [opponentName, setOpponentName] = useState<string | undefined>(undefined);

    // ゲームセッションID（GameScreenをリマウントさせるためのkey）
    const [gameSessionId, setGameSessionId] = useState<number>(0);

    // 戦闘終了後にホームタブに直接遷移するフラグ
    const [returnToHome, setReturnToHome] = useState<boolean>(false);

    // Portrait mode detection
    const isPortrait = useIsPortrait();

    // Shared network adapter for online play
    const networkAdapterRef = useRef<NetworkAdapter | null>(null);
    const [networkConnected, setNetworkConnected] = useState(false);

    // Audio settings (shared across screens)
    const [audioSettings, setAudioSettings] = useState<AudioSettings>(loadAudioSettings);

    // Home card state (persisted to localStorage)
    const [homeCardId, setHomeCardId] = useState<string | null>(() => {
        return localStorage.getItem('homeCardId');
    });

    // メールアドレスからユーザーIDを抽出
    const extractUserId = (email: string | null): string | null => {
        if (!email) return null;
        // メールアドレスが{userId}@tenfubu-game.local形式の場合、userIdを抽出
        if (email.endsWith('@tenfubu-game.local')) {
            return email.replace('@tenfubu-game.local', '');
        }
        return null;
    };

    // Firebase Auth: 認証処理
    useEffect(() => {
        // 認証状態の監視
        const unsubscribe = onAuthStateChange(async (user) => {
            console.log('🔐 Auth state changed:', {
                uid: user?.uid,
                email: user?.email,
                isAnonymous: user?.isAnonymous
            });

            if (user) {
                setPlayerId(user.uid);
                setIsAnonymous(user.isAnonymous);
                setUserEmail(user.email);
                setUserId(extractUserId(user.email));

                const extractedUserId = extractUserId(user.email);
                console.log('📝 State updated:', {
                    playerId: user.uid,
                    isAnonymous: user.isAnonymous,
                    userId: extractedUserId
                });

                // プレイヤーデータを取得/作成
                try {
                    // localStorageから現在のプレイヤー名を取得
                    const currentLocalName = localStorage.getItem('playerName') || '';
                    const playerData = await getOrCreatePlayerData(
                        user.uid,
                        extractedUserId || 'anonymous',
                        currentLocalName || 'プレイヤー'
                    );
                    // Firebaseからプレイヤー名を復元（ただし、ローカルに有効な名前がある場合は上書きしない）
                    // ローカルが空 or デフォルト値で、Firebaseに有効な名前がある場合のみ復元
                    if (playerData.playerName && playerData.playerName !== 'プレイヤー') {
                        if (!currentLocalName || currentLocalName === 'プレイヤー') {
                            setPlayerName(playerData.playerName);
                            localStorage.setItem('playerName', playerData.playerName);
                        }
                    }
                } catch (error) {
                    console.error('Failed to create player data:', error);
                }
            } else {
                // 未認証の場合は匿名認証を実行
                try {
                    const anonymousUser = await signInAnonymousUser();
                    setPlayerId(anonymousUser.uid);
                    setIsAnonymous(true);
                    setUserEmail(null);
                    setUserId(null);
                    // localStorageから現在のプレイヤー名を取得
                    const currentLocalName = localStorage.getItem('playerName') || '';
                    const playerData = await getOrCreatePlayerData(
                        anonymousUser.uid,
                        'anonymous',
                        currentLocalName || 'プレイヤー'
                    );
                    // Firebaseからプレイヤー名を復元（ただし、ローカルに有効な名前がある場合は上書きしない）
                    if (playerData.playerName && playerData.playerName !== 'プレイヤー') {
                        if (!currentLocalName || currentLocalName === 'プレイヤー') {
                            setPlayerName(playerData.playerName);
                            localStorage.setItem('playerName', playerData.playerName);
                        }
                    }
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
        // 新しいゲームセッションを開始（GameScreenをリマウント）
        setGameSessionId(prev => prev + 1);
        setCurrentScreen('GAME');
    }, []);

    // Matchmaking game start callback
    const handleMatchmakingGameStart = useCallback((
        adapter: NetworkAdapter,
        oppClass: ClassType,
        _isHost: boolean,
        oppPlayerId?: string,
        oppRating?: number,
        oppName?: string
    ) => {
        networkAdapterRef.current = adapter;
        setNetworkConnected(true);
        setOpponentClass(oppClass);
        setOpponentPlayerId(oppPlayerId);
        setOpponentRating(oppRating);
        setOpponentName(oppName);
        // 新しいゲームセッションを開始（GameScreenをリマウント）
        setGameSessionId(prev => prev + 1);
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

    const handleTitleConfig = useCallback((mode: GameMode, id?: string, classType?: ClassType, aiDifficulty?: AIDifficulty, cpuClass?: ClassType) => {
        setGameMode(mode);
        if (id) setRoomId(id);
        if (aiDifficulty) setAiDifficulty(aiDifficulty);
        // ホーム画面からゲームを開始したら、returnToHomeフラグをリセット
        setReturnToHome(false);

        // classTypeが指定されている場合は、ClassSelectScreenをスキップ
        if (classType) {
            setSelectedClass(classType);
            // CPU対戦でopponentClassが指定されている場合は設定
            if (mode === 'CPU' && cpuClass) {
                setOpponentClass(cpuClass);
            }
            // 直接適切な画面に遷移
            if (mode === 'CPU') {
                // 新しいゲームセッションを開始（GameScreenをリマウント）
                setGameSessionId(prev => prev + 1);
                setCurrentScreen('GAME');
            } else if (mode === 'CASUAL_MATCH' || mode === 'RANKED_MATCH') {
                setCurrentScreen('MATCHMAKING');
            } else {
                // HOST/JOIN → ロビー画面へ
                setCurrentScreen('LOBBY');
            }
        } else {
            // classTypeが指定されていない場合は従来通りClassSelectScreenへ
            setCurrentScreen('CLASS_SELECT');
        }
    }, []);

    const startGame = useCallback((cls: ClassType, cpuClass?: ClassType) => {
        setSelectedClass(cls);
        // CPU戦でopponentClassが指定されている場合は設定
        if (gameMode === 'CPU' && cpuClass) {
            setOpponentClass(cpuClass);
        }
        // CPU mode: go directly to game
        // CASUAL_MATCH/RANKED_MATCH: go to matchmaking screen
        // HOST/JOIN mode: go to lobby first to wait for connection
        if (gameMode === 'CPU') {
            // 新しいゲームセッションを開始（GameScreenをリマウント）
            setGameSessionId(prev => prev + 1);
            setCurrentScreen('GAME');
        } else if (gameMode === 'CASUAL_MATCH' || gameMode === 'RANKED_MATCH') {
            // カジュアル/ランクマッチ → マッチメイキング画面へ
            setCurrentScreen('MATCHMAKING');
        } else {
            // HOST/JOIN → ロビー画面へ
            setCurrentScreen('LOBBY');
        }
    }, [gameMode]);

    const backToTitle = useCallback((toHomeScreen: boolean = false) => {
        // Disconnect network if connected
        if (networkAdapterRef.current) {
            networkAdapterRef.current.disconnect();
            networkAdapterRef.current = null;
        }
        setNetworkConnected(false);
        setCurrentScreen('TITLE');
        // 戦闘終了後はホーム画面に直接遷移
        setReturnToHome(toHomeScreen);
        // Reset state
        setRoomId('');
        setGameMode('CPU');
        setOpponentClass(undefined);
        setOpponentPlayerId(undefined);
        setOpponentRating(undefined);
    }, []);

    // ホームカード設定ハンドラー
    const handleSetHomeCard = useCallback((cardId: string) => {
        console.log('🎴 App handleSetHomeCard called with cardId:', cardId);
        setHomeCardId(cardId);
        localStorage.setItem('homeCardId', cardId);
        console.log('🎴 localStorage updated:', localStorage.getItem('homeCardId'));
    }, []);

    // アカウント関連のハンドラー
    const handleNavigateToRegister = useCallback(() => {
        setCurrentScreen('REGISTER');
    }, []);

    const handleNavigateToLogin = useCallback(() => {
        setCurrentScreen('LOGIN');
    }, []);

    const handleRegisterSuccess = useCallback(() => {
        // 登録成功 → 設定画面またはタイトル画面に戻る
        setCurrentScreen('TITLE');
    }, []);

    const handleLoginSuccess = useCallback(() => {
        // ログイン成功 → タイトル画面に戻る
        setCurrentScreen('TITLE');
    }, []);

    const handleLogout = useCallback(async () => {
        try {
            await logOut();
            // ログアウト後は自動的に匿名認証される（onAuthStateChangeで処理）
            setCurrentScreen('TITLE');
        } catch (error) {
            console.error('Failed to logout:', error);
        }
    }, []);

    const backFromRegister = useCallback(() => {
        setCurrentScreen('TITLE');
    }, []);

    const backFromLogin = useCallback(() => {
        setCurrentScreen('TITLE');
    }, []);

    const handleNavigateToProfile = useCallback(() => {
        setCurrentScreen('PROFILE');
    }, []);

    const handleProfileUpdateSuccess = useCallback((newName: string) => {
        setPlayerName(newName);
        localStorage.setItem('playerName', newName);
        setCurrentScreen('TITLE');
    }, []);

    const backFromProfile = useCallback(() => {
        setCurrentScreen('TITLE');
    }, []);

    // 認証完了までローディング表示
    if (authLoading) {
        return (
            <div style={{
                width: '100vw',
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                color: 'white',
                fontSize: '1.5rem',
                fontWeight: 'bold'
            }}>
                Loading...
            </div>
        );
    }

    return (
        <div className="app-container" style={{ userSelect: 'none' }}>
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
                    onSetHomeCard={handleSetHomeCard}
                    homeCardId={homeCardId}
                    isAnonymous={isAnonymous}
                    userId={userId}
                    currentPlayerName={playerName}
                    onPlayerNameUpdate={(newName) => setPlayerName(newName)}
                    onNavigateToRegister={handleNavigateToRegister}
                    onNavigateToLogin={handleNavigateToLogin}
                    onNavigateToProfile={handleNavigateToProfile}
                    onLogout={handleLogout}
                    returnToHome={returnToHome}
                />
            )}
            {currentScreen === 'CLASS_SELECT' && (
                <ClassSelectScreen
                    onSelectClass={startGame}
                    onBack={() => backToTitle(true)}
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
                    onBack={() => backToTitle(true)}
                />
            )}
            {currentScreen === 'MATCHMAKING' && (
                <MatchmakingScreen
                    matchType={gameMode === 'CASUAL_MATCH' ? 'casual' : 'ranked'}
                    playerClass={selectedClass}
                    playerName={playerName || 'プレイヤー'}
                    playerId={playerId}
                    onGameStart={handleMatchmakingGameStart}
                    onCancel={() => backToTitle(true)}
                />
            )}
            {currentScreen === 'GAME' && (
                <GameScreen
                    key={gameSessionId}
                    playerClass={selectedClass}
                    opponentType={gameMode === 'CPU' ? 'CPU' : 'ONLINE'}
                    gameMode={gameMode}
                    targetRoomId={roomId}
                    onLeave={() => backToTitle(true)}
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
                    opponentName={opponentName}
                />
            )}
            {currentScreen === 'REGISTER' && (
                <RegisterScreen
                    onRegisterSuccess={handleRegisterSuccess}
                    onBack={backFromRegister}
                />
            )}
            {currentScreen === 'LOGIN' && (
                <LoginScreen
                    onLoginSuccess={handleLoginSuccess}
                    onBack={backFromLogin}
                />
            )}
            {currentScreen === 'PROFILE' && (
                <ProfileScreen
                    playerId={playerId}
                    currentPlayerName={playerName}
                    onUpdateSuccess={handleProfileUpdateSuccess}
                    onBack={backFromProfile}
                />
            )}
        </div>
    );
}

export default App;
