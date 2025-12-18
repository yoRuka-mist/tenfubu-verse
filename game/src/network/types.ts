import { GameAction, GameState, ClassType } from '../core/types';

// Protocol Types
export type NetworkMessage =
    | { type: 'HANDSHAKE'; payload: { name: string; class: ClassType } }
    | { type: 'GAME_STATE'; payload: GameState }
    | { type: 'ACTION'; payload: GameAction };

export interface NetworkAdapter {
    isHost: boolean;
    connect(targetId?: string): Promise<string>; // Returns own ID or connection status
    send(message: NetworkMessage): void;
    onMessage(callback: (msg: NetworkMessage) => void): void;
    disconnect(): void;
}
