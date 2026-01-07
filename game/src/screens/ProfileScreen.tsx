import React, { useState, useEffect } from 'react';
import { updatePlayerName } from '../firebase/playerData';

// Base dimensions for scaling
const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;

interface ProfileScreenProps {
    playerId: string | null;
    currentPlayerName: string;
    onUpdateSuccess: (newName: string) => void;
    onBack: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
    playerId,
    currentPlayerName,
    onUpdateSuccess,
    onBack
}) => {
    const [playerName, setPlayerName] = useState(currentPlayerName);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

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

    const handleUpdate = async () => {
        setError('');
        setSuccess(false);

        // バリデーション
        if (!playerName.trim()) {
            setError('プレイヤー名を入力してください');
            return;
        }

        if (playerName.length > 20) {
            setError('プレイヤー名は20文字以内にしてください');
            return;
        }

        if (!playerId) {
            setError('プレイヤーIDが見つかりません');
            return;
        }

        setLoading(true);

        try {
            await updatePlayerName(playerId, playerName.trim());
            setSuccess(true);
            setTimeout(() => {
                onUpdateSuccess(playerName.trim());
            }, 1000);
        } catch (err: any) {
            console.error('Failed to update player name:', err);
            setError('プレイヤー名の更新に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !loading) {
            handleUpdate();
        }
    };

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            overflow: 'hidden'
        }}>
            <div style={{
                width: BASE_WIDTH * scale,
                height: BASE_HEIGHT * scale,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
            }}>
                {/* タイトル */}
                <h1 style={{
                    fontSize: 48 * scale,
                    fontWeight: 'bold',
                    color: '#fff',
                    marginBottom: 40 * scale,
                    textShadow: '0 4px 8px rgba(0,0,0,0.5)'
                }}>
                    プロフィール設定
                </h1>

                {/* フォーム */}
                <div style={{
                    width: 400 * scale,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20 * scale
                }}>
                    {/* プレイヤー名 */}
                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: 16 * scale,
                            color: '#fff',
                            marginBottom: 8 * scale,
                            fontWeight: 'bold'
                        }}>
                            プレイヤー名
                        </label>
                        <input
                            type="text"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="プレイヤー"
                            disabled={loading}
                            maxLength={20}
                            style={{
                                width: '100%',
                                padding: `${12 * scale}px ${16 * scale}px`,
                                fontSize: 16 * scale,
                                borderRadius: 8 * scale,
                                border: '2px solid #444',
                                background: '#2a2a3e',
                                color: '#fff',
                                outline: 'none',
                                transition: 'border-color 0.3s',
                                boxSizing: 'border-box'
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = '#4a9eff'}
                            onBlur={(e) => e.currentTarget.style.borderColor = '#444'}
                        />
                        <p style={{
                            fontSize: 12 * scale,
                            color: '#888',
                            marginTop: 4 * scale,
                            marginBottom: 0
                        }}>
                            オンライン対戦で表示される名前（20文字以内）
                        </p>
                    </div>

                    {/* エラーメッセージ */}
                    {error && (
                        <div style={{
                            padding: `${12 * scale}px ${16 * scale}px`,
                            borderRadius: 8 * scale,
                            background: 'rgba(255, 80, 80, 0.2)',
                            border: '2px solid #ff5050',
                            color: '#ff5050',
                            fontSize: 14 * scale,
                            textAlign: 'center'
                        }}>
                            {error}
                        </div>
                    )}

                    {/* 成功メッセージ */}
                    {success && (
                        <div style={{
                            padding: `${12 * scale}px ${16 * scale}px`,
                            borderRadius: 8 * scale,
                            background: 'rgba(80, 255, 120, 0.2)',
                            border: '2px solid #50ff78',
                            color: '#50ff78',
                            fontSize: 14 * scale,
                            textAlign: 'center'
                        }}>
                            ✓ 更新しました
                        </div>
                    )}

                    {/* ボタン */}
                    <div style={{
                        display: 'flex',
                        gap: 16 * scale,
                        marginTop: 20 * scale
                    }}>
                        <button
                            onClick={onBack}
                            disabled={loading}
                            style={{
                                flex: 1,
                                padding: `${16 * scale}px ${32 * scale}px`,
                                fontSize: 18 * scale,
                                fontWeight: 'bold',
                                borderRadius: 8 * scale,
                                border: 'none',
                                background: '#555',
                                color: '#fff',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.3s',
                                opacity: loading ? 0.5 : 1
                            }}
                            onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#666')}
                            onMouseLeave={(e) => !loading && (e.currentTarget.style.background = '#555')}
                        >
                            戻る
                        </button>
                        <button
                            onClick={handleUpdate}
                            disabled={loading}
                            style={{
                                flex: 1,
                                padding: `${16 * scale}px ${32 * scale}px`,
                                fontSize: 18 * scale,
                                fontWeight: 'bold',
                                borderRadius: 8 * scale,
                                border: 'none',
                                background: loading ? '#555' : 'linear-gradient(135deg, #4a9eff 0%, #357abd 100%)',
                                color: '#fff',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.3s',
                                boxShadow: loading ? 'none' : '0 4px 8px rgba(0,0,0,0.3)'
                            }}
                            onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = `scale(1.05)`)}
                            onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'scale(1)')}
                        >
                            {loading ? '更新中...' : '更新'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
