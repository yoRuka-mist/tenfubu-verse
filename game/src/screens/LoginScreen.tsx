import React, { useState, useEffect } from 'react';
import { signInWithEmail } from '../firebase/auth';

// Base dimensions for scaling
const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;

interface LoginScreenProps {
    onLoginSuccess: () => void;
    onBack: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onBack }) => {
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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

    const userIdToEmail = (id: string): string => {
        return `${id}@tenfubu-game.local`;
    };

    const handleLogin = async () => {
        setError('');

        // バリデーション
        if (!userId || !password) {
            setError('ユーザーIDとパスワードを入力してください');
            return;
        }

        setLoading(true);

        try {
            const email = userIdToEmail(userId);
            await signInWithEmail(email, password);
            onLoginSuccess();
        } catch (err: any) {
            // Firebase Auth エラーコードを日本語メッセージに変換
            const errorCode = err?.code || '';
            if (errorCode === 'auth/user-not-found') {
                setError('アカウントが見つかりません');
            } else if (errorCode === 'auth/wrong-password') {
                setError('パスワードが正しくありません');
            } else if (errorCode === 'auth/invalid-email') {
                setError('ユーザーIDの形式が正しくありません');
            } else if (errorCode === 'auth/invalid-credential') {
                setError('ユーザーIDまたはパスワードが正しくありません');
            } else {
                setError('ログインに失敗しました');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !loading) {
            handleLogin();
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
                    ログイン
                </h1>

                {/* フォーム */}
                <div style={{
                    width: 400 * scale,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20 * scale
                }}>
                    {/* ユーザーID */}
                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: 16 * scale,
                            color: '#fff',
                            marginBottom: 8 * scale,
                            fontWeight: 'bold'
                        }}>
                            ユーザーID
                        </label>
                        <input
                            type="text"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="player123"
                            disabled={loading}
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
                    </div>

                    {/* パスワード */}
                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: 16 * scale,
                            color: '#fff',
                            marginBottom: 8 * scale,
                            fontWeight: 'bold'
                        }}>
                            パスワード
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="••••••"
                            disabled={loading}
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
                            onClick={handleLogin}
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
                            {loading ? 'ログイン中...' : 'ログイン'}
                        </button>
                    </div>

                    {/* 警告 */}
                    <div style={{
                        marginTop: 20 * scale,
                        padding: `${12 * scale}px ${16 * scale}px`,
                        borderRadius: 8 * scale,
                        background: 'rgba(255, 200, 80, 0.1)',
                        border: '1px solid rgba(255, 200, 80, 0.3)',
                        fontSize: 13 * scale,
                        color: '#ffcc80',
                        textAlign: 'center',
                        lineHeight: 1.6
                    }}>
                        ⚠ ログインすると、登録済みアカウントのデータに切り替わります
                    </div>
                </div>
            </div>
        </div>
    );
};
