import React, { useState, useEffect } from 'react';
import { linkAnonymousToEmail } from '../firebase/auth';

// Base dimensions for scaling
const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;

interface RegisterScreenProps {
    onRegisterSuccess: () => void;
    onBack: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onRegisterSuccess, onBack }) => {
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
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

    const validateUserId = (id: string): boolean => {
        // 英数字とアンダースコアのみ、3-20文字
        const userIdRegex = /^[a-zA-Z0-9_]{3,20}$/;
        return userIdRegex.test(id);
    };

    const userIdToEmail = (id: string): string => {
        return `${id}@tenfubu-game.local`;
    };

    const handleRegister = async () => {
        setError('');

        // バリデーション
        if (!userId || !password || !confirmPassword) {
            setError('すべての項目を入力してください');
            return;
        }

        if (!validateUserId(userId)) {
            setError('ユーザーIDは英数字とアンダースコアのみ、3-20文字で入力してください');
            return;
        }

        if (password.length < 6) {
            setError('パスワードは6文字以上にしてください');
            return;
        }

        if (password !== confirmPassword) {
            setError('パスワードが一致しません');
            return;
        }

        setLoading(true);

        try {
            const email = userIdToEmail(userId);
            await linkAnonymousToEmail(email, password);
            onRegisterSuccess();
        } catch (err: any) {
            // デバッグ用にエラーの詳細をコンソールに出力
            console.error('Registration error:', err);
            console.error('Error code:', err?.code);
            console.error('Error message:', err?.message);

            // Firebase Auth エラーコードを日本語メッセージに変換
            const errorCode = err?.code || '';
            if (errorCode === 'auth/email-already-in-use') {
                setError('このユーザーIDは既に使用されています');
            } else if (errorCode === 'auth/invalid-email') {
                setError('ユーザーIDの形式が正しくありません');
            } else if (errorCode === 'auth/weak-password') {
                setError('パスワードは6文字以上にしてください');
            } else if (errorCode === 'auth/requires-recent-login') {
                setError('セッションが期限切れです。再度ログインしてください');
            } else if (errorCode === 'auth/provider-already-linked') {
                setError('このアカウントは既にユーザーIDと紐付けられています');
            } else if (errorCode === 'auth/credential-already-in-use') {
                setError('このユーザーIDは既に別のアカウントで使用されています');
            } else {
                setError(`登録に失敗しました (${errorCode || 'unknown error'})`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !loading) {
            handleRegister();
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
                    アカウント登録
                </h1>

                {/* フォーム */}
                <form
                    onSubmit={(e) => { e.preventDefault(); handleRegister(); }}
                    style={{
                        width: 400 * scale,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 20 * scale
                    }}
                >
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
                            name="username"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="player123"
                            disabled={loading}
                            autoComplete="username"
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
                            半角英数字と _ （アンダースコア）のみ、3〜20文字
                        </p>
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
                            name="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="••••••"
                            disabled={loading}
                            autoComplete="new-password"
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
                            6文字以上
                        </p>
                    </div>

                    {/* パスワード確認 */}
                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: 16 * scale,
                            color: '#fff',
                            marginBottom: 8 * scale,
                            fontWeight: 'bold'
                        }}>
                            パスワード（確認）
                        </label>
                        <input
                            type="password"
                            name="confirm-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="••••••"
                            disabled={loading}
                            autoComplete="new-password"
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
                            上と同じパスワードを入力
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
                            onClick={handleRegister}
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
                            {loading ? '登録中...' : '登録'}
                        </button>
                    </div>

                    {/* 説明 */}
                    <div style={{
                        marginTop: 20 * scale,
                        padding: `${12 * scale}px ${16 * scale}px`,
                        borderRadius: 8 * scale,
                        background: 'rgba(74, 158, 255, 0.1)',
                        border: '1px solid rgba(74, 158, 255, 0.3)',
                        fontSize: 13 * scale,
                        color: '#aaa',
                        textAlign: 'center',
                        lineHeight: 1.6
                    }}>
                        ユーザーIDとパスワードを登録すると、<br />
                        別の端末からデータを引き継げます
                    </div>
                </form>
            </div>
        </div>
    );
};
