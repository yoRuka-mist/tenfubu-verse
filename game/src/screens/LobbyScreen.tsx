import React, { useState, useEffect, useRef } from 'react';
import { ClassType } from '../core/types';
import { P2PAdapter } from '../network/P2PAdapter';
import { NetworkAdapter } from '../network/types';

interface LobbyScreenProps {
    gameMode: 'HOST' | 'JOIN';
    targetRoomId?: string;
    playerClass: ClassType;
    onGameStart: (adapter: NetworkAdapter, opponentClass?: ClassType) => void;
    onBack: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
    gameMode,
    targetRoomId,
    playerClass,
    onGameStart,
    onBack
}) => {
    const [myId, setMyId] = useState<string>('');
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [opponentClass, setOpponentClass] = useState<ClassType | null>(null);
    const [classSent, setClassSent] = useState(false);

    const adapterRef = useRef<P2PAdapter | null>(null);

    // Initialize network connection
    useEffect(() => {
        const adapter = new P2PAdapter();
        adapterRef.current = adapter;

        const init = async () => {
            try {
                const id = await adapter.connect(gameMode === 'JOIN' ? targetRoomId : undefined);
                setMyId(id);
                setConnecting(false);

                // Set up message handler for class exchange
                adapter.onMessage((msg: any) => {
                    console.log('[LobbyScreen] Received message:', msg);
                    if (msg.type === 'CLASS_INFO') {
                        console.log('[LobbyScreen] Received opponent class:', msg.playerClass);
                        setOpponentClass(msg.playerClass as ClassType);
                    }
                });

                // Set up connection callback
                adapter.onConnection(() => {
                    console.log('[LobbyScreen] Connection established!');
                    setConnected(true);
                });
            } catch (e: any) {
                console.error('[LobbyScreen] Connection error:', e);
                setError(e.toString());
                setConnecting(false);
            }
        };

        init();

        return () => {
            // Only disconnect if not connected (i.e., user backed out before connecting)
            // If connected, the adapter will be passed to GameScreen
            if (!adapterRef.current?.isConnected()) {
                adapter.disconnect();
            }
        };
    }, [gameMode, targetRoomId]);

    // Send class info when connected
    useEffect(() => {
        if (connected && adapterRef.current && !classSent) {
            console.log('[LobbyScreen] Sending class info:', playerClass);
            // Small delay to ensure both sides have their message handlers ready
            setTimeout(() => {
                adapterRef.current?.send({ type: 'CLASS_INFO', playerClass });
                setClassSent(true);
            }, 100);
        }
    }, [connected, playerClass, classSent]);

    // When connection is established AND class info exchanged, start the game
    useEffect(() => {
        if (connected && adapterRef.current && opponentClass) {
            // Short delay to show "Connected!" message before transitioning
            const timer = setTimeout(() => {
                console.log('[LobbyScreen] Starting game with opponent class:', opponentClass);
                onGameStart(adapterRef.current!, opponentClass);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [connected, onGameStart, opponentClass]);

    const handleCopy = async () => {
        if (myId) {
            try {
                // Try modern Clipboard API first
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(myId);
                } else {
                    // Fallback for non-HTTPS or older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = myId;
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-999999px';
                    textArea.style.top = '-999999px';
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                }
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (e) {
                console.error('Failed to copy:', e);
                // Show ID in alert as last resort
                alert(`Room ID: ${myId}\n\n(コピーに失敗しました。手動でコピーしてください)`);
            }
        }
    };

    const handleBack = () => {
        // Disconnect before going back
        if (adapterRef.current) {
            adapterRef.current.disconnect();
            adapterRef.current = null;
        }
        onBack();
    };

    return (
        <div className="screen lobby-screen" style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            color: 'white',
            gap: '2rem'
        }}>
            <h1 style={{
                fontSize: '2.5rem',
                marginBottom: '1rem',
                textShadow: '0 0 10px #e94560',
                fontFamily: 'Tamanegi, sans-serif',
                letterSpacing: '2px'
            }}>
                {gameMode === 'HOST' ? '対戦相手を待っています' : '接続中...'}
            </h1>

            {/* Status Display */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.5rem',
                padding: '2rem',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '10px',
                minWidth: '400px'
            }}>
                {/* Error State */}
                {error && (
                    <div style={{ color: '#ff6b6b', fontSize: '1.2rem', textAlign: 'center', fontFamily: 'Tamanegi, sans-serif' }}>
                        <p>接続エラーが発生しました</p>
                        <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>{error}</p>
                    </div>
                )}

                {/* Connecting State */}
                {connecting && !error && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <div className="loading-spinner" style={{
                            width: '50px',
                            height: '50px',
                            border: '4px solid rgba(233, 69, 96, 0.3)',
                            borderTop: '4px solid #e94560',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }} />
                        <p style={{ opacity: 0.8, fontFamily: 'Tamanegi, sans-serif' }}>
                            {gameMode === 'HOST' ? 'ルームを作成中...' : 'ルームに接続中...'}
                        </p>
                    </div>
                )}

                {/* HOST: Waiting for opponent with Room ID */}
                {gameMode === 'HOST' && myId && !connecting && !connected && !error && (
                    <>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <p style={{ fontSize: '1rem', opacity: 0.7, fontFamily: 'Tamanegi, sans-serif' }}>ルームID:</p>
                            <div style={{
                                fontSize: '2rem',
                                fontFamily: 'monospace',
                                fontWeight: 'bold',
                                padding: '0.5rem 1rem',
                                background: 'rgba(233, 69, 96, 0.2)',
                                borderRadius: '8px',
                                border: '1px solid #e94560',
                                letterSpacing: '2px'
                            }}>
                                {myId}
                            </div>
                        </div>

                        <button
                            onClick={handleCopy}
                            style={{
                                fontSize: '1rem',
                                padding: '0.8rem 2rem',
                                background: copied ? '#48bb78' : 'transparent',
                                border: '2px solid ' + (copied ? '#48bb78' : '#e94560'),
                                color: '#fff',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                fontFamily: 'Tamanegi, sans-serif'
                            }}
                        >
                            {copied ? '✓ コピーしました！' : 'ルームIDをコピー'}
                        </button>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginTop: '1rem',
                            opacity: 0.7
                        }}>
                            <div className="loading-spinner" style={{
                                width: '20px',
                                height: '20px',
                                border: '2px solid rgba(233, 69, 96, 0.3)',
                                borderTop: '2px solid #e94560',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }} />
                            <span style={{ fontFamily: 'Tamanegi, sans-serif' }}>相手の接続を待っています...</span>
                        </div>
                    </>
                )}

                {/* JOIN: Waiting for connection */}
                {gameMode === 'JOIN' && !connecting && !connected && !error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="loading-spinner" style={{
                            width: '20px',
                            height: '20px',
                            border: '2px solid rgba(233, 69, 96, 0.3)',
                            borderTop: '2px solid #e94560',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }} />
                        <span style={{ fontFamily: 'Tamanegi, sans-serif' }}>ルーム {targetRoomId} に接続中...</span>
                    </div>
                )}

                {/* Connected State */}
                {connected && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1rem'
                    }}>
                        <p style={{ fontSize: '1.5rem', color: '#48bb78', fontFamily: 'Tamanegi, sans-serif' }}>✓ 接続完了！</p>
                        <p style={{ fontFamily: 'Tamanegi, sans-serif' }}>ゲームを開始します...</p>
                    </div>
                )}

                {/* Player Class Info */}
                <div style={{
                    marginTop: '1rem',
                    padding: '0.5rem 1rem',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    opacity: 0.7,
                    fontFamily: 'Tamanegi, sans-serif'
                }}>
                    クラス: {playerClass === 'SENKA' ? 'せんか' : playerClass === 'AJA' ? 'あじゃ' : 'yoRuka'}
                </div>
            </div>

            {/* Back Button */}
            <button
                onClick={handleBack}
                style={{
                    fontSize: '1rem',
                    padding: '0.8rem 2rem',
                    background: 'transparent',
                    border: '1px solid #888',
                    color: '#888',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    borderRadius: '4px',
                    marginTop: '1rem',
                    fontFamily: 'Tamanegi, sans-serif'
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.borderColor = '#fff';
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.color = '#888';
                    e.currentTarget.style.borderColor = '#888';
                }}
            >
                ← タイトルに戻る
            </button>

            {/* CSS for spinner animation */}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};
