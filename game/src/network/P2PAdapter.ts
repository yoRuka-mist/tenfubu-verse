import Peer, { DataConnection } from 'peerjs';
import { NetworkAdapter, NetworkMessage } from './types';

export class P2PAdapter implements NetworkAdapter {
    private peer: Peer | null = null;
    private conn: DataConnection | null = null;
    public isHost: boolean = false;
    private messageCallback: ((msg: NetworkMessage) => void) | null = null;

    constructor() { }

    async connect(targetId?: string): Promise<string> {
        this.peer = new Peer(); // Auto-generate ID from PeerJS server

        return new Promise((resolve, reject) => {
            if (!this.peer) return reject('Peer not initialized');

            this.peer.on('open', (id) => {
                console.log('My Peer ID is:', id);

                if (targetId) {
                    // Client mode: Connect to Host
                    this.isHost = false;
                    this.connectToPeer(targetId);
                    resolve(id);
                } else {
                    // Host mode: Wait for connection
                    this.isHost = true;
                    this.peer!.on('connection', (conn) => {
                        console.log('Incoming connection...');
                        this.setupConnection(conn);
                    });
                    resolve(id);
                }
            });

            this.peer.on('error', (err) => {
                console.error(err);
                reject(err);
            });
        });
    }

    private connectToPeer(id: string) {
        if (!this.peer) return;
        const conn = this.peer.connect(id);
        this.setupConnection(conn);
    }

    private setupConnection(conn: DataConnection) {
        this.conn = conn;

        conn.on('open', () => {
            console.log('Connection established!');
        });

        conn.on('data', (data) => {
            if (this.messageCallback) {
                this.messageCallback(data as NetworkMessage);
            }
        });

        conn.on('error', (err) => console.error('Connection Error:', err));
    }

    send(message: NetworkMessage): void {
        if (this.conn && this.conn.open) {
            this.conn.send(message);
        } else {
            console.warn('Connection not open, cannot send message');
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
