import React from 'react';
import { ClassType } from './core/types';

export interface GameMetadata {
    mode: 'CPU' | 'ONLINE' | 'HOST';
    playerClass: ClassType;
    roomId?: string; // For joining
}

export const GameContext = React.createContext<{
    metadata: GameMetadata;
    setMetadata: (m: GameMetadata) => void;
}>({
    metadata: { mode: 'CPU', playerClass: 'SENKA' },
    setMetadata: () => { }
});
