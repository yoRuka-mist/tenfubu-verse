import { useState, useRef, useEffect, useCallback } from 'react';
import { TitleScreen } from './screens/TitleScreen';
import { ClassSelectScreen } from './screens/ClassSelectScreen';
import { LobbyScreen } from './screens/LobbyScreen';
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

type Screen = 'TITLE' | 'CLASS_SELECT' | 'LOBBY' | 'GAME';
type GameMode = 'CPU' | 'HOST' | 'JOIN';

function App() {
    const [currentScreen, setCurrentScreen] = useState<Screen>('TITLE');
    const [selectedClass, setSelectedClass] = useState<ClassType>('SENKA');
    const [gameMode, setGameMode] = useState<GameMode>('CPU');
    const [roomId, setRoomId] = useState<string>('');
    const [opponentClass, setOpponentClass] = useState<ClassType | undefined>(undefined);
    const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('NORMAL');

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

        if (currentScreen === 'TITLE' || currentScreen === 'CLASS_SELECT') {
            // Play title BGM on title and class select screens if enabled
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
            if (audio && audio.paused && audioSettings.bgmEnabled && (currentScreen === 'TITLE' || currentScreen === 'CLASS_SELECT')) {
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
        // HOST/JOIN mode: go to lobby first to wait for connection
        if (gameMode === 'CPU') {
            setCurrentScreen('GAME');
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

    return (
        <div className="app-container">
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
            {currentScreen === 'GAME' && (
                <GameScreen
                    playerClass={selectedClass}
                    opponentType={gameMode === 'CPU' ? 'CPU' : 'ONLINE'}
                    gameMode={gameMode}
                    targetRoomId={roomId}
                    onLeave={backToTitle}
                    networkAdapter={networkAdapterRef.current}
                    networkConnected={networkConnected}
                    opponentClass={opponentClass}
                    aiDifficulty={aiDifficulty}
                />
            )}
        </div>
    );
}

export default App;
