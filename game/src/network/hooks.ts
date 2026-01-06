import { useEffect, useState } from 'react';
import { P2PAdapter } from './P2PAdapter';
import { NetworkAdapter } from './types';

export function useGameNetwork(mode: 'HOST' | 'JOIN' | 'CPU' | 'CASUAL_MATCH' | 'RANKED_MATCH', targetId?: string) {
    const [adapter, setAdapter] = useState<NetworkAdapter | null>(null);
    const [myId, setMyId] = useState<string>('');
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [connecting, setConnecting] = useState(false);

    useEffect(() => {
        if (mode === 'CPU') return;

        const net = new P2PAdapter();
        setConnecting(true);

        const init = async () => {
            try {
                const id = await net.connect(mode === 'JOIN' ? targetId : undefined);
                setMyId(id);
                setAdapter(net);

                // Set up connection callback for both HOST and JOIN modes
                net.onConnection(() => {
                    console.log('[useGameNetwork] Connection established!');
                    setConnected(true);
                    setConnecting(false);
                });

                // For JOIN mode, connection happens during connect()
                // For HOST mode, we wait for onConnection callback

            } catch (e: any) {
                setError(e.toString());
                setConnecting(false);
            }
        };

        init();

        return () => {
            net.disconnect();
        };
    }, [mode, targetId]);

    return { adapter, myId, connected, connecting, error, setConnected };
}
