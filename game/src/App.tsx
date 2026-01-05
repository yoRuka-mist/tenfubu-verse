import { useState, useRef, useEffect, useCallback } from 'react';
import { TitleScreen } from './screens/TitleScreen';
import { ClassSelectScreen } from './screens/ClassSelectScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { MatchmakingScreen } from './screens/MatchmakingScreen';
import { GameScreen } from './screens/GameScreen';
import { ClassType, AIDifficulty, AudioSettings } from './core/types';
import { NetworkAdapter } from './network/types';

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

type Screen = 'TITLE' | 'CLASS_SELECT' | 'LOBBY' | 'MATCHMAKING' | 'GAME';
type GameMode = 'CPU' | 'HOST' | 'JOIN' | 'CASUAL_MATCH' | 'RANKED_MATCH';

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

    // Turn timer setting (persisted to localStorage)
    const [timerEnabled, setTimerEnabled] = useState<boolean>(() => {
        const saved = localStorage.getItem('timerEnabled');
        return saved !== null ? JSON.parse(saved) : true;
    });

    // Player name state (persisted to localStorage)
    const [playerName, setPlayerName] = useState<string>(() => {
        return localStorage.getItem('playerName') || '';
    });

    // Portrait mode detection
    const isPortrait = useIsPortrait();

    // Shared network adapter for online play
    const networkAdapterRef = useRef<NetworkAdapter | null>(null);
    const [networkConnected, setNetworkConnected] = useState(false);

    // Audio settings (shared across screens)
    const [audioSettings, setAudioSettings] = useState<AudioSettings>(loadAudioSettings);

    // Save audio settings to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('audioSettings', JSON.stringify(audioSettings));
    }, [audioSettings]);

    // Update audio settings callback
    const updateAudioSettings = useCallback((newSettings: Partial<AudioSettings>) => {
        setAudioSettings(prev => ({ ...prev, ...newSettings }));
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
            // Play title BGM on title, class select, and lobby screens if enabled
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

    const handleTitleConfig = (mode: GameMode, id?: string) => {
        setGameMode(mode);
        if (id) setRoomId(id);
        setCurrentScreen('CLASS_SELECT');
    };

    const startGame = (cls: ClassType) => {
        setSelectedClass(cls);
        // CPU mode: go directly to game
        // Casual/Ranked match: go to matchmaking screen
        // HOST/JOIN mode: go to lobby first to wait for connection
        if (gameMode === 'CPU') {
            setCurrentScreen('GAME');
        } else if (gameMode === 'CASUAL_MATCH' || gameMode === 'RANKED_MATCH') {
            setCurrentScreen('MATCHMAKING');
        } else {
            setCurrentScreen('LOBBY');
        }
    };

    const handleLobbyGameStart = (adapter: NetworkAdapter, oppClass?: ClassType) => {
        networkAdapterRef.current = adapter;
        setNetworkConnected(true);
        if (oppClass) setOpponentClass(oppClass);
        setCurrentScreen('GAME');
    };

    // マッチメイキング成功時のハンドラ
    const handleMatchmakingGameStart = (adapter: NetworkAdapter, oppClass: ClassType, _isHost: boolean) => {
        networkAdapterRef.current = adapter;
        setNetworkConnected(true);
        setOpponentClass(oppClass);
        // カジュアルマッチではタイマー強制ON
        // Note: timerEnabled stateは変更せず、GameScreenに渡すときに強制的にtrueにする
        setCurrentScreen('GAME');
    };

    const backToTitle = () => {
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
    };

    // ランダムマッチの再マッチング処理
    const handleRematching = (deckType: ClassType) => {
        // 現在の接続を切断
        if (networkAdapterRef.current) {
            networkAdapterRef.current.disconnect();
            networkAdapterRef.current = null;
        }
        setNetworkConnected(false);
        setOpponentClass(undefined);
        // 選択したクラスを設定してマッチメイキング画面へ
        setSelectedClass(deckType);
        setCurrentScreen('MATCHMAKING');
    };

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
                />
            )}
        </div>
    );
}

export default App;
