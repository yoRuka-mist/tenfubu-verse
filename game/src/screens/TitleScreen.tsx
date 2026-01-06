import React, { useState, useEffect } from 'react';
import { AudioSettings } from '../core/types';

// Helper function to resolve asset paths with base URL for GitHub Pages deployment
const getAssetUrl = (path: string): string => {
    const base = import.meta.env.BASE_URL || '/';
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${base}${cleanPath}`;
};

// Base dimensions for scaling
const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;

interface TitleScreenProps {
    onStartConfig: (mode: 'CPU' | 'HOST' | 'JOIN' | 'CASUAL_MATCH' | 'RANKED_MATCH', roomId?: string) => void;
    audioSettings: AudioSettings;
    onAudioSettingsChange: (settings: Partial<AudioSettings>) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStartConfig, audioSettings, onAudioSettingsChange }) => {
    const [showJoinInput, setShowJoinInput] = useState(false);
    const [joinId, setJoinId] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [showMatchTypeSelect, setShowMatchTypeSelect] = useState(false); // ランダムマッチのタイプ選択
    const [showRoomMatchMenu, setShowRoomMatchMenu] = useState(false); // ルームマッチのサブメニュー

    // Responsive scaling
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const updateScale = () => {
            const scaleX = window.innerWidth / BASE_WIDTH;
            const scaleY = window.innerHeight / BASE_HEIGHT;
            setScale(Math.min(scaleX, scaleY));
        };
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    // Scaled sizes
    const titleFontSize = 9 * scale;
    const buttonWidth = 300 * scale;
    const buttonFontSize = 1.2 * scale;
    const buttonPadding = `${1 * scale}rem 0`;

    const btnStyle: React.CSSProperties = {
        fontSize: `${buttonFontSize}rem`,
        padding: buttonPadding,
        background: 'transparent',
        border: '2px solid #e94560',
        color: '#fff',
        cursor: 'pointer',
        transition: 'all 0.3s',
        borderRadius: 4 * scale,
        fontWeight: 'bold',
        letterSpacing: '1px',
        width: '100%'
    };

    return (
        <div className="screen title-screen" style={{
            height: '100dvh',
            width: '100vw',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            color: 'white'
        }}>
            {/* Background Layer - will show background image when added */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${getAssetUrl('/title/background.png')})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                zIndex: 0
            }} />

            {/* Fallback gradient background */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                zIndex: -1
            }} />

            {/* Dark overlay for readability */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.3)',
                zIndex: 1
            }} />

            {/* Content - Full height flex container */}
            <div style={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                height: '100%',
                width: '100%',
                paddingBottom: `${1 * scale}rem`,
                boxSizing: 'border-box'
            }}>
                {/* Title Area - Positioned at bottom area to avoid covering faces */}
                <div style={{
                    fontFamily: 'Tamanegi, sans-serif',
                    fontSize: `${titleFontSize}rem`,
                    color: '#fff',
                    textShadow: '0 0 30px rgba(233, 69, 96, 0.9), 0 0 60px rgba(233, 69, 96, 0.5), 3px 3px 6px rgba(0,0,0,0.9)',
                    letterSpacing: `${0.5 * scale}rem`,
                    whiteSpace: 'nowrap',
                    marginBottom: `${0.5 * scale}rem`
                }}>
                    てんふぶバース
                </div>

                {/* Menu Buttons - At very bottom */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {!showJoinInput && !showMatchTypeSelect && !showRoomMatchMenu ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: `${1 * scale}rem`, width: buttonWidth }}>
                            <button
                                onClick={() => onStartConfig('CPU')}
                                style={btnStyle}
                                onMouseOver={(e) => e.currentTarget.style.background = '#e94560'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                ひとりで遊ぶ
                            </button>

                            {/* ランダムマッチボタン */}
                            <button
                                onClick={() => setShowMatchTypeSelect(true)}
                                style={{
                                    ...btnStyle,
                                    border: '2px solid #4ade80',
                                    background: 'rgba(74, 222, 128, 0.1)'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#4ade80'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(74, 222, 128, 0.1)'}
                            >
                                ランダムマッチ
                            </button>

                            {/* ルームマッチボタン */}
                            <button
                                onClick={() => setShowRoomMatchMenu(true)}
                                style={{
                                    ...btnStyle,
                                    border: '2px solid #60a5fa',
                                    background: 'rgba(96, 165, 250, 0.1)'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#60a5fa'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(96, 165, 250, 0.1)'}
                            >
                                ルームマッチ
                            </button>
                        </div>
                    ) : showRoomMatchMenu ? (
                        /* ルームマッチサブメニュー */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: `${1 * scale}rem`, width: buttonWidth }}>
                            <p style={{
                                textAlign: 'center',
                                fontSize: `${1.2 * scale}rem`,
                                marginBottom: `${0.5 * scale}rem`,
                                color: '#fff'
                            }}>
                                ルームマッチ
                            </p>

                            <button
                                onClick={() => {
                                    setShowRoomMatchMenu(false);
                                    onStartConfig('HOST');
                                }}
                                style={{
                                    ...btnStyle,
                                    border: '2px solid #60a5fa'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#60a5fa'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                部屋を作る
                            </button>

                            <button
                                onClick={() => {
                                    setShowRoomMatchMenu(false);
                                    setShowJoinInput(true);
                                }}
                                style={{
                                    ...btnStyle,
                                    border: '2px solid #60a5fa'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#60a5fa'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                部屋に入る
                            </button>

                            <button
                                onClick={() => setShowRoomMatchMenu(false)}
                                style={{ ...btnStyle, border: 'none', fontSize: `${1 * scale}rem`, color: '#888' }}
                            >
                                戻る
                            </button>
                        </div>
                    ) : showMatchTypeSelect ? (
                        /* マッチタイプ選択UI */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: `${1 * scale}rem`, width: buttonWidth }}>
                            <p style={{
                                textAlign: 'center',
                                fontSize: `${1.2 * scale}rem`,
                                marginBottom: `${0.5 * scale}rem`,
                                color: '#fff'
                            }}>
                                マッチタイプを選択
                            </p>

                            {/* カジュアルマッチ */}
                            <button
                                onClick={() => {
                                    setShowMatchTypeSelect(false);
                                    onStartConfig('CASUAL_MATCH');
                                }}
                                style={{
                                    ...btnStyle,
                                    border: '2px solid #4ade80'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#4ade80'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                カジュアル
                            </button>
                            <p style={{
                                textAlign: 'center',
                                fontSize: `${0.8 * scale}rem`,
                                color: '#888',
                                marginTop: `-${0.5 * scale}rem`,
                                marginBottom: `${0.5 * scale}rem`
                            }}>
                                勝敗記録なし・気軽に対戦
                            </p>

                            {/* ランクマッチ（グレーアウト） */}
                            <button
                                disabled
                                style={{
                                    ...btnStyle,
                                    border: '2px solid #666',
                                    color: '#666',
                                    cursor: 'not-allowed',
                                    opacity: 0.5
                                }}
                            >
                                ランクマッチ
                            </button>
                            <p style={{
                                textAlign: 'center',
                                fontSize: `${0.8 * scale}rem`,
                                color: '#666',
                                marginTop: `-${0.5 * scale}rem`,
                                marginBottom: `${0.5 * scale}rem`
                            }}>
                                Coming Soon...
                            </p>

                            <button
                                onClick={() => setShowMatchTypeSelect(false)}
                                style={{ ...btnStyle, border: 'none', fontSize: `${1 * scale}rem`, color: '#888' }}
                            >
                                戻る
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: `${1 * scale}rem`, width: buttonWidth }}>
                            <input
                                type="text"
                                placeholder="ルームIDを入力"
                                value={joinId}
                                onChange={(e) => setJoinId(e.target.value)}
                                style={{
                                    padding: `${1 * scale}rem`,
                                    fontSize: `${1.2 * scale}rem`,
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid #444',
                                    color: 'white',
                                    borderRadius: 4 * scale,
                                    textAlign: 'center'
                                }}
                            />
                            <button
                                onClick={() => onStartConfig('JOIN', joinId)}
                                disabled={!joinId}
                                style={{ ...btnStyle, opacity: joinId ? 1 : 0.5 }}
                            >
                                接続
                            </button>
                            <button
                                onClick={() => setShowJoinInput(false)}
                                style={{ ...btnStyle, border: 'none', fontSize: `${1 * scale}rem`, color: '#888' }}
                            >
                                戻る
                            </button>
                        </div>
                    )}

                    <p style={{ marginTop: `${1.5 * scale}rem`, opacity: 0.5, fontSize: `${0.8 * scale}rem` }}>Ver 1.03 Beta</p>
                </div>
            </div>

            {/* Settings Button - Top Right Corner */}
            <button
                onClick={() => setShowSettings(true)}
                style={{
                    position: 'absolute',
                    top: 20 * scale,
                    right: 20 * scale,
                    zIndex: 10,
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: 8 * scale,
                    padding: `${0.6 * scale}rem ${1 * scale}rem`,
                    color: 'white',
                    fontSize: `${1 * scale}rem`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8 * scale,
                    transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(233, 69, 96, 0.6)';
                    e.currentTarget.style.borderColor = '#e94560';
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                }}
            >
                <span style={{ fontSize: `${1.2 * scale}rem` }}>⚙</span>
                設定
            </button>

            {/* Settings Modal */}
            {showSettings && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    onClick={() => setShowSettings(false)}
                >
                    <div
                        style={{
                            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                            borderRadius: 12 * scale,
                            padding: `${2 * scale}rem`,
                            minWidth: 400 * scale,
                            maxWidth: 500 * scale,
                            border: '2px solid rgba(255, 255, 255, 0.2)',
                            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 style={{
                            margin: 0,
                            marginBottom: `${1.5 * scale}rem`,
                            fontSize: `${1.8 * scale}rem`,
                            color: 'white',
                            textAlign: 'center'
                        }}>
                            音声設定
                        </h2>

                        {/* BGM Section */}
                        <div style={{ marginBottom: `${1.5 * scale}rem` }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: `${0.5 * scale}rem`
                            }}>
                                <span style={{ color: 'white', fontSize: `${1 * scale}rem` }}>BGM</span>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8 * scale, cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={audioSettings.bgmEnabled}
                                        onChange={(e) => onAudioSettingsChange({ bgmEnabled: e.target.checked })}
                                        style={{ width: 18 * scale, height: 18 * scale, cursor: 'pointer' }}
                                    />
                                    <span style={{ color: audioSettings.bgmEnabled ? '#4ade80' : '#888', fontSize: `${0.9 * scale}rem` }}>
                                        {audioSettings.bgmEnabled ? 'ON' : 'OFF'}
                                    </span>
                                </label>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.05}
                                value={audioSettings.bgm}
                                onChange={(e) => onAudioSettingsChange({ bgm: parseFloat(e.target.value) })}
                                disabled={!audioSettings.bgmEnabled}
                                style={{
                                    width: '100%',
                                    height: 8 * scale,
                                    cursor: audioSettings.bgmEnabled ? 'pointer' : 'not-allowed',
                                    opacity: audioSettings.bgmEnabled ? 1 : 0.5
                                }}
                            />
                        </div>

                        {/* SE Section */}
                        <div style={{ marginBottom: `${1.5 * scale}rem` }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: `${0.5 * scale}rem`
                            }}>
                                <span style={{ color: 'white', fontSize: `${1 * scale}rem` }}>効果音</span>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8 * scale, cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={audioSettings.seEnabled}
                                        onChange={(e) => onAudioSettingsChange({ seEnabled: e.target.checked })}
                                        style={{ width: 18 * scale, height: 18 * scale, cursor: 'pointer' }}
                                    />
                                    <span style={{ color: audioSettings.seEnabled ? '#4ade80' : '#888', fontSize: `${0.9 * scale}rem` }}>
                                        {audioSettings.seEnabled ? 'ON' : 'OFF'}
                                    </span>
                                </label>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.05}
                                value={audioSettings.se}
                                onChange={(e) => onAudioSettingsChange({ se: parseFloat(e.target.value) })}
                                disabled={!audioSettings.seEnabled}
                                style={{
                                    width: '100%',
                                    height: 8 * scale,
                                    cursor: audioSettings.seEnabled ? 'pointer' : 'not-allowed',
                                    opacity: audioSettings.seEnabled ? 1 : 0.5
                                }}
                            />
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={() => setShowSettings(false)}
                            style={{
                                width: '100%',
                                padding: `${0.8 * scale}rem`,
                                fontSize: `${1 * scale}rem`,
                                background: '#e94560',
                                border: 'none',
                                borderRadius: 6 * scale,
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                marginTop: `${0.5 * scale}rem`
                            }}
                        >
                            閉じる
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
