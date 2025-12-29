import { useState, useRef, useEffect } from 'react';
import { TitleScreen } from './screens/TitleScreen';
import { ClassSelectScreen } from './screens/ClassSelectScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { GameScreen } from './screens/GameScreen';
import { ClassType, AIDifficulty } from './core/types';
import { NetworkAdapter } from './network/types';

// Helper function to resolve asset paths with base URL for GitHub Pages deployment
const getAssetUrl = (path: string): string => {
    const base = import.meta.env.BASE_URL || '/';
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${base}${cleanPath}`;
};

// BGM URL
const titleBgmUrl = getAssetUrl('/bgm/tenfubu.mp3');

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

    // Title BGM management (plays on TITLE and CLASS_SELECT screens)
    const titleBgmRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Create audio element once
        const audio = new Audio(titleBgmUrl);
        audio.loop = true;
        audio.volume = 0.3;
        titleBgmRef.current = audio;

        return () => {
            audio.pause();
            audio.src = '';
        };
    }, []);

    // Control BGM based on current screen
    useEffect(() => {
        const audio = titleBgmRef.current;
        if (!audio) return;

        if (currentScreen === 'TITLE' || currentScreen === 'CLASS_SELECT') {
            // Play title BGM on title and class select screens
            if (audio.paused) {
                audio.play().catch(() => {
                    // Autoplay blocked, will play on user interaction
                });
            }
        } else {
            // Stop title BGM on other screens
            audio.pause();
            audio.currentTime = 0;
        }
    }, [currentScreen]);

    // Handle user interaction for autoplay policy
    useEffect(() => {
        const handleClick = () => {
            const audio = titleBgmRef.current;
            if (audio && audio.paused && (currentScreen === 'TITLE' || currentScreen === 'CLASS_SELECT')) {
                audio.play().catch(() => {});
            }
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [currentScreen]);

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
            {currentScreen === 'TITLE' && <TitleScreen onStartConfig={handleTitleConfig} />}
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
