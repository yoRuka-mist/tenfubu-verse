import { useState } from 'react';
import { TitleScreen } from './screens/TitleScreen';
import { ClassSelectScreen } from './screens/ClassSelectScreen';
import { GameScreen } from './screens/GameScreen';
import { ClassType } from './core/types';

type Screen = 'TITLE' | 'CLASS_SELECT' | 'GAME';
type GameMode = 'CPU' | 'HOST' | 'JOIN';

function App() {
    const [currentScreen, setCurrentScreen] = useState<Screen>('TITLE');
    const [selectedClass, setSelectedClass] = useState<ClassType>('SENKA');
    const [gameMode, setGameMode] = useState<GameMode>('CPU');
    const [roomId, setRoomId] = useState<string>('');

    const handleTitleConfig = (mode: GameMode, id?: string) => {
        setGameMode(mode);
        if (id) setRoomId(id);
        setCurrentScreen('CLASS_SELECT');
    };

    const startGame = (cls: ClassType) => {
        setSelectedClass(cls);
        setCurrentScreen('GAME');
    };

    const backToTitle = () => {
        setCurrentScreen('TITLE');
        // Reset state if needed
        setRoomId('');
    };

    return (
        <div className="app-container">
            {currentScreen === 'TITLE' && <TitleScreen onStartConfig={handleTitleConfig} />}
            {currentScreen === 'CLASS_SELECT' && <ClassSelectScreen onSelectClass={startGame} onBack={backToTitle} />}
            {currentScreen === 'GAME' && (
                <GameScreen
                    playerClass={selectedClass}
                    opponentType={gameMode === 'CPU' ? 'CPU' : 'ONLINE'}
                    gameMode={gameMode}
                    targetRoomId={roomId}
                    onLeave={backToTitle}
                />
            )}
        </div>
    );
}

export default App;
