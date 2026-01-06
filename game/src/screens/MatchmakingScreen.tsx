import React, { useState, useEffect, useRef } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { ClassType } from '../core/types';
import { matchmakingManager, MatchResult, MatchmakingStatus, MatchType } from '../firebase/matchmaking';
import { NetworkAdapter } from '../network/types';
import { PeerJSAdapter } from '../network/PeerJSAdapter';
import { getClassRating } from '../firebase/playerData';
import { getRankFromRating, RANK_DISPLAY_NAMES, RankType } from '../firebase/rating';

// Base dimensions for scaling
const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;

// ランクの色
const RANK_COLORS: Record<RankType, string> = {
    BRONZE: '#cd7f32',
    SILVER: '#c0c0c0',
    GOLD: '#ffd700',
    PLATINUM: '#e5e4e2',
    DIAMOND: '#b9f2ff',
    MASTER: '#ff4500',
};

interface MatchmakingScreenProps {
    matchType: MatchType;
    playerClass: ClassType;
    playerName: string;
    playerId: string | null;
    onGameStart: (adapter: NetworkAdapter, opponentClass: ClassType, isHost: boolean, opponentPlayerId?: string, opponentRating?: number) => void;
    onCancel: () => void;
}

export const MatchmakingScreen: React.FC<MatchmakingScreenProps> = ({
    matchType,
    playerClass,
    playerName,
    playerId,
    onGameStart,
    onCancel
}) => {
    const [status, setStatus] = useState<MatchmakingStatus>('idle');
    const [statusMessage, setStatusMessage] = useState('接続準備中...');
    const [searchTime, setSearchTime] = useState(0);
    const peerRef = useRef<Peer | null>(null);
    const connectionRef = useRef<DataConnection | null>(null);
    const matchResultRef = useRef<MatchResult | null>(null);
    const isHostRef = useRef(false);
    const isGameStartingRef = useRef(false); // ゲーム開始フラグ（cleanup時にPeer破棄をスキップするため）

    // レーティング（ランクマッチ用）
    const [myRating, setMyRating] = useState<number>(0);
    const [opponentRating, setOpponentRating] = useState<number | undefined>(undefined);

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

    // 検索時間のカウントアップ + タイムアウト処理
    useEffect(() => {
        if (status !== 'searching') return;

        const interval = setInterval(() => {
            setSearchTime(prev => {
                const newTime = prev + 1;
                // 60秒でタイムアウト
                if (newTime >= 60) {
                    setStatus('error');
                    setStatusMessage('マッチングがタイムアウトしました');
                    matchmakingManager.cancelMatchmaking();
                    if (connectionRef.current) {
                        connectionRef.current.close();
                    }
                    if (peerRef.current) {
                        peerRef.current.destroy();
                    }
                }
                return newTime;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [status]);

    // PeerJS初期化とマッチメイキング開始
    useEffect(() => {
        let isMounted = true;
        let currentMyRating = 0; // 自分のレート（ランクマッチ用）

        const initMatchmaking = async () => {
            try {
                // ランクマッチの場合、自分のレートを取得
                if (matchType === 'ranked' && playerId) {
                    try {
                        const classRating = await getClassRating(playerId, playerClass);
                        currentMyRating = classRating.rating;
                        setMyRating(currentMyRating);
                    } catch (error) {
                        console.error('[Matchmaking] Failed to get rating:', error);
                    }
                }

                // PeerJS初期化
                const peer = new Peer({
                    debug: 1,
                    config: {
                        iceServers: [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:stun1.l.google.com:19302' }
                        ]
                    }
                });

                peerRef.current = peer;

                // Peer準備完了を待つ
                await new Promise<void>((resolve, reject) => {
                    peer.on('open', () => resolve());
                    peer.on('error', (err) => reject(err));
                });

                if (!isMounted) return;

                const myPeerId = peer.id;
                console.log('[Matchmaking] My PeerJS ID:', myPeerId);

                // HOSTとして待っている場合、相手からの接続を受け付ける
                peer.on('connection', (conn) => {
                    console.log('[Matchmaking] Incoming connection from:', conn.peer);
                    connectionRef.current = conn;

                    conn.on('open', () => {
                        console.log('[Matchmaking] Connection opened (as HOST)');
                        // 相手の情報を受信
                        conn.on('data', (data: any) => {
                            if (data.type === 'PLAYER_INFO') {
                                console.log('[Matchmaking] Received player info:', data);
                                // 自分の情報を送信
                                conn.send({
                                    type: 'PLAYER_INFO',
                                    playerName,
                                    playerClass,
                                    playerId: matchType === 'ranked' ? playerId : undefined,
                                    rating: matchType === 'ranked' ? currentMyRating : undefined
                                });

                                // 相手のレートを保存
                                if (isMounted && matchType === 'ranked') {
                                    setOpponentRating(data.rating);
                                }

                                // ゲーム開始
                                isGameStartingRef.current = true; // cleanup時にPeer破棄をスキップ
                                const adapter = new PeerJSAdapter(peer, conn, true);
                                onGameStart(adapter, data.playerClass, true, data.playerId, data.rating);
                            }
                        });
                    });
                });

                // マッチメイキング開始
                matchmakingManager.startMatchmaking(
                    myPeerId,
                    playerName,
                    playerClass,
                    matchType,
                    (newStatus) => {
                        if (!isMounted) return;
                        setStatus(newStatus);
                        switch (newStatus) {
                            case 'searching':
                                setStatusMessage('対戦相手を探しています...');
                                break;
                            case 'matched':
                                setStatusMessage('マッチング成功！接続中...');
                                break;
                            case 'error':
                                setStatusMessage('エラーが発生しました');
                                break;
                        }
                    },
                    async (result) => {
                        if (!isMounted) return;
                        console.log('[Matchmaking] Match found:', result);
                        matchResultRef.current = result;
                        isHostRef.current = result.isHost;

                        if (result.isHost) {
                            // HOST側: 相手からの接続を待つ（上のpeer.on('connection')で処理）
                            setStatusMessage('相手の接続を待っています...');
                        } else {
                            // JOIN側: 相手に接続
                            setStatusMessage('相手に接続中...');
                            const conn = peer.connect(result.peerId, { reliable: true });
                            connectionRef.current = conn;

                            conn.on('open', () => {
                                console.log('[Matchmaking] Connection opened (as JOIN)');
                                // 自分の情報を送信
                                conn.send({
                                    type: 'PLAYER_INFO',
                                    playerName,
                                    playerClass,
                                    playerId: matchType === 'ranked' ? playerId : undefined,
                                    rating: matchType === 'ranked' ? currentMyRating : undefined
                                });

                                // 相手の情報を受信
                                conn.on('data', (data: any) => {
                                    if (data.type === 'PLAYER_INFO') {
                                        console.log('[Matchmaking] Received player info:', data);

                                        // 相手のレートを保存
                                        if (isMounted && matchType === 'ranked') {
                                            setOpponentRating(data.rating);
                                        }

                                        isGameStartingRef.current = true; // cleanup時にPeer破棄をスキップ
                                        const adapter = new PeerJSAdapter(peer, conn, false);
                                        onGameStart(adapter, data.playerClass, false, data.playerId, data.rating);
                                    }
                                });
                            });

                            conn.on('error', (err) => {
                                console.error('[Matchmaking] Connection error:', err);
                                setStatus('error');
                                setStatusMessage('接続に失敗しました');
                            });
                        }
                    },
                    matchType === 'ranked' && playerId ? playerId : undefined,
                    matchType === 'ranked' ? currentMyRating : undefined
                );

            } catch (error) {
                console.error('[Matchmaking] Init error:', error);
                if (isMounted) {
                    setStatus('error');
                    setStatusMessage('初期化に失敗しました');
                }
            }
        };

        initMatchmaking();

        return () => {
            isMounted = false;
            matchmakingManager.cancelMatchmaking();
            // ゲーム開始時はPeer接続を維持（GameScreenに引き継ぐため）
            if (!isGameStartingRef.current) {
                if (connectionRef.current) {
                    connectionRef.current.close();
                }
                if (peerRef.current) {
                    peerRef.current.destroy();
                }
            }
        };
    }, [matchType, playerClass, playerName, playerId, onGameStart]);

    const handleCancel = async () => {
        await matchmakingManager.cancelMatchmaking();
        if (connectionRef.current) {
            connectionRef.current.close();
        }
        if (peerRef.current) {
            peerRef.current.destroy();
        }
        onCancel();
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="screen" style={{
            height: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            color: 'white'
        }}>
            {/* マッチタイプ表示 */}
            <div style={{
                fontSize: `${1.2 * scale}rem`,
                color: '#4ade80',
                marginBottom: `${1 * scale}rem`,
                fontWeight: 'bold'
            }}>
                {matchType === 'casual' ? 'カジュアルマッチ' : 'ランクマッチ'}
            </div>

            {/* ステータスメッセージ */}
            <div style={{
                fontSize: `${2 * scale}rem`,
                fontWeight: 'bold',
                marginBottom: `${1 * scale}rem`,
                textAlign: 'center'
            }}>
                {statusMessage}
            </div>

            {/* 検索時間 */}
            {status === 'searching' && (
                <div style={{
                    fontSize: `${1.5 * scale}rem`,
                    color: '#888',
                    marginBottom: `${2 * scale}rem`
                }}>
                    検索時間: {formatTime(searchTime)}
                </div>
            )}

            {/* ローディングアニメーション */}
            {(status === 'searching' || status === 'matched') && (
                <div style={{
                    width: 80 * scale,
                    height: 80 * scale,
                    border: `4px solid rgba(255,255,255,0.2)`,
                    borderTop: `4px solid #4ade80`,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginBottom: `${2 * scale}rem`
                }} />
            )}

            {/* プレイヤー情報 */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: `${0.5 * scale}rem`,
                marginBottom: `${2 * scale}rem`,
                padding: `${1 * scale}rem`,
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 8 * scale
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: `${1 * scale}rem`,
                }}>
                    <div style={{ fontSize: `${1 * scale}rem` }}>
                        {playerName || 'プレイヤー'}
                    </div>
                    <div style={{
                        fontSize: `${0.9 * scale}rem`,
                        color: playerClass === 'SENKA' ? '#e94560' : playerClass === 'AJA' ? '#45a2e9' : '#a855f7'
                    }}>
                        {playerClass === 'SENKA' ? '盞華' : playerClass === 'AJA' ? 'あじゃ' : 'Y'}
                    </div>
                </div>
                {/* ランクマッチ時のレート表示 */}
                {matchType === 'ranked' && myRating > 0 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: `${0.5 * scale}rem`,
                        fontSize: `${0.85 * scale}rem`,
                        color: '#aaa',
                    }}>
                        <span style={{
                            fontWeight: 'bold',
                            color: RANK_COLORS[getRankFromRating(myRating)],
                            fontFamily: 'Tamanegi, sans-serif',
                        }}>
                            {RANK_DISPLAY_NAMES[getRankFromRating(myRating)]}
                        </span>
                        <span style={{ fontFamily: 'Tamanegi, sans-serif' }}>
                            {myRating}
                        </span>
                    </div>
                )}
                {/* マッチング完了時の相手レート表示 */}
                {matchType === 'ranked' && status === 'matched' && opponentRating !== undefined && (
                    <div style={{
                        marginTop: `${0.5 * scale}rem`,
                        padding: `${0.5 * scale}rem ${1 * scale}rem`,
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: 4 * scale,
                        fontSize: `${0.8 * scale}rem`,
                        color: '#aaa',
                    }}>
                        対戦相手: <span style={{
                            fontWeight: 'bold',
                            color: RANK_COLORS[getRankFromRating(opponentRating)],
                            fontFamily: 'Tamanegi, sans-serif',
                        }}>
                            {RANK_DISPLAY_NAMES[getRankFromRating(opponentRating)]}
                        </span> {opponentRating}
                    </div>
                )}
            </div>

            {/* キャンセルボタン */}
            {status !== 'error' && (
                <button
                    onClick={handleCancel}
                    style={{
                        padding: `${0.8 * scale}rem ${2 * scale}rem`,
                        fontSize: `${1 * scale}rem`,
                        background: 'transparent',
                        border: '2px solid #e94560',
                        color: '#e94560',
                        borderRadius: 8 * scale,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.background = '#e94560';
                        e.currentTarget.style.color = 'white';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#e94560';
                    }}
                >
                    キャンセル
                </button>
            )}

            {/* エラー時の戻るボタン */}
            {status === 'error' && (
                <button
                    onClick={onCancel}
                    style={{
                        padding: `${0.8 * scale}rem ${2 * scale}rem`,
                        fontSize: `${1 * scale}rem`,
                        background: '#e94560',
                        border: 'none',
                        color: 'white',
                        borderRadius: 8 * scale,
                        cursor: 'pointer'
                    }}
                >
                    タイトルに戻る
                </button>
            )}

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};
