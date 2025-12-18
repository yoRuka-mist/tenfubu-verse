import React, { useState } from 'react';

interface TitleScreenProps {
    onStartConfig: (mode: 'CPU' | 'HOST' | 'JOIN', roomId?: string) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStartConfig }) => {
    const [showJoinInput, setShowJoinInput] = useState(false);
    const [joinId, setJoinId] = useState('');

    return (
        <div className="screen title-screen" style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            color: 'white'
        }}>
            <h1 style={{ fontSize: '4rem', marginBottom: '3rem', textShadow: '0 0 10px #e94560', fontFamily: 'Impact, sans-serif', letterSpacing: '2px' }}>
                DIGITAL<br />CARD<br />GAME
            </h1>

            {!showJoinInput ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: 300 }}>
                    <button
                        onClick={() => onStartConfig('CPU')}
                        style={btnStyle}
                        onMouseOver={(e) => e.currentTarget.style.background = '#e94560'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        SOLO PLAY (CPU)
                    </button>

                    <button
                        onClick={() => onStartConfig('HOST')}
                        style={btnStyle}
                        onMouseOver={(e) => e.currentTarget.style.background = '#e94560'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        CREATE ROOM (HOST)
                    </button>

                    <button
                        onClick={() => setShowJoinInput(true)}
                        style={btnStyle}
                        onMouseOver={(e) => e.currentTarget.style.background = '#e94560'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        JOIN ROOM
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: 300 }}>
                    <input
                        type="text"
                        placeholder="Enter Room ID"
                        value={joinId}
                        onChange={(e) => setJoinId(e.target.value)}
                        style={{
                            padding: '1rem',
                            fontSize: '1.2rem',
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid #444',
                            color: 'white',
                            borderRadius: 4,
                            textAlign: 'center'
                        }}
                    />
                    <button
                        onClick={() => onStartConfig('JOIN', joinId)}
                        disabled={!joinId}
                        style={{ ...btnStyle, opacity: joinId ? 1 : 0.5 }}
                    >
                        CONNECT
                    </button>
                    <button
                        onClick={() => setShowJoinInput(false)}
                        style={{ ...btnStyle, border: 'none', fontSize: '1rem', color: '#888' }}
                    >
                        BACK
                    </button>
                </div>
            )}

            <p style={{ marginTop: '3rem', opacity: 0.5, fontSize: '0.8rem' }}>Ver 0.2.0 P2P Alpha</p>
        </div>
    );
};

const btnStyle: React.CSSProperties = {
    fontSize: '1.2rem',
    padding: '1rem 0',
    background: 'transparent',
    border: '2px solid #e94560',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.3s',
    borderRadius: 4,
    fontWeight: 'bold',
    letterSpacing: '1px'
};
