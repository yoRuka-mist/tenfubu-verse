import { GameAction, GameState, ClassType } from '../core/types';

// Protocol Types
export type NetworkMessage =
    | { type: 'HANDSHAKE'; payload: { name: string; class: ClassType } }
    | { type: 'GAME_STATE'; payload: GameState }
    | { type: 'ACTION'; payload: GameAction }
    | { type: 'CLASS_INFO'; playerClass: ClassType }
    | { type: 'INIT_GAME'; payload: GameState }
    | { type: 'EVOLVE_ANIM'; payload: { playerId: string; followerIndex: number; useSep: boolean; targetId?: string; instanceId?: string } }
    | { type: 'PLAY_CARD_ANIM'; payload: { playerId: string; cardIndex: number; card: any; targetBoardIndex?: number } }
    | { type: 'EFFECT'; payload: { effectType: string; targetPlayerId: string; targetIndex: number; targetInstanceId?: string; isBuff?: boolean; atkBuff?: number; hpBuff?: number } }
    | { type: 'REMATCH_REQUEST' }
    | { type: 'REMATCH_ACCEPT' };

export interface NetworkAdapter {
    isHost: boolean;
    connect(targetId?: string): Promise<string>; // Returns own ID or connection status
    send(message: NetworkMessage): void;
    onMessage(callback: (msg: NetworkMessage) => void): void;
    onConnection(callback: () => void): void; // Called when connection is established
    onClose(callback: () => void): void; // Called when connection is closed
    isConnected(): boolean;
    disconnect(): void;
}
