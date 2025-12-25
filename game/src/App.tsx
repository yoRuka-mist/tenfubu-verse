import { useState, useRef } from 'react';
import { TitleScreen } from './screens/TitleScreen';
import { ClassSelectScreen } from './screens/ClassSelectScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { GameScreen } from './screens/GameScreen';
import { ClassType } from './core/types';
import { NetworkAdapter } from './network/types';

type Screen = 'TITLE' | 'CLASS_SELECT' | 'LOBBY' | 'GAME';
type GameMode = 'CPU' | 'HOST' | 'JOIN';

function App() {
    const [currentScreen, setCurrentScreen] = useState<Screen>('TITLE');
    const [selectedClass, setSelectedClass] = useState<ClassType>('SENKA');
    const [gameMode, setGameMode] = useState<GameMode>('CPU');
    const [roomId, setRoomId] = useState<string>('');
    const [opponentClass, setOpponentClass] = useState<ClassType | undefined>(undefined);

    // Shared network adapter for online play
    const networkAdapterRef = useRef<NetworkAdapter | null>(null);
    const [networkConnected, setNetworkConnected] = useState(false);

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
            {currentScreen === 'CLASS_SELECT' && <ClassSelectScreen onSelectClass={startGame} onBack={backToTitle} />}
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
                />
            )}
        </div>
    );
}

export default App;
