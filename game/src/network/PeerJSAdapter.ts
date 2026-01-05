import Peer, { DataConnection } from 'peerjs';
import { NetworkAdapter, NetworkMessage } from './types';

/**
 * PeerJSAdapter - 既存のPeerとDataConnectionを使ってNetworkAdapterを実装
 * MatchmakingScreenなど、外部で既にPeer接続が確立されている場合に使用
 */
export class PeerJSAdapter implements NetworkAdapter {
    private peer: Peer;
    private conn: DataConnection;
    public isHost: boolean = false;
    private messageCallback: ((msg: NetworkMessage) => void) | null = null;
    private closeCallback: (() => void) | null = null;

    constructor(peer: Peer, conn: DataConnection, isHost: boolean = false) {
        this.peer = peer;
        this.conn = conn;
        this.isHost = isHost;

        // Setup connection event handlers
        conn.on('data', (data) => {
            if (this.messageCallback) {
                this.messageCallback(data as NetworkMessage);
            }
        });

        conn.on('close', () => {
            console.log('[PeerJSAdapter] Connection closed');
            if (this.closeCallback) {
                this.closeCallback();
            }
        });

        conn.on('error', (err) => console.error('[PeerJSAdapter] Connection Error:', err));
    }

    async connect(_targetId?: string): Promise<string> {
        // Already connected - just return the peer ID
        return this.peer.id;
    }

    onConnection(_callback: () => void): void {
        // Already connected, no-op
    }

    onClose(callback: () => void): void {
        this.closeCallback = callback;
    }

    isConnected(): boolean {
        return this.conn !== null && this.conn.open;
    }

    send(message: NetworkMessage): void {
        if (this.conn && this.conn.open) {
            this.conn.send(message);
        } else {
            console.warn('[PeerJSAdapter] Connection not open, cannot send message');
        }
    }

    onMessage(callback: (msg: NetworkMessage) => void): void {
        this.messageCallback = callback;
    }

    disconnect(): void {
        this.conn?.close();
        this.peer?.destroy();
    }
}
