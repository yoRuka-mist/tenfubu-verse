import { useEffect, useState } from 'react';
import { P2PAdapter } from './P2PAdapter';
import { NetworkAdapter } from './types';

export function useGameNetwork(mode: 'HOST' | 'JOIN' | 'CPU', targetId?: string) {
    const [adapter, setAdapter] = useState<NetworkAdapter | null>(null);
    const [myId, setMyId] = useState<string>('');
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (mode === 'CPU') return;

        const net = new P2PAdapter();

        const init = async () => {
            try {
                const id = await net.connect(mode === 'JOIN' ? targetId : undefined);
                setMyId(id);
                setAdapter(net);

                // If we are Host, we are 'connected' when a client joins (handled in adapter event)
                // If we are Client, we are connected immediately after connect resolves (mostly)
                if (mode === 'JOIN') setConnected(true);

                // For Host, we need to listen for connection
                // P2PAdapter needs to expose connection state better, but for MVP:
                if (mode === 'HOST') {
                    // We can't easily know when someone connects without a callback in P2PAdapter
                    // Let's assume the adapter handles it internally or we subscribe to messages
                }

            } catch (e: any) {
                setError(e.toString());
            }
        };

        init();

        return () => {
            net.disconnect();
        };
    }, [mode, targetId]);

    return { adapter, myId, connected, error, setConnected };
}
