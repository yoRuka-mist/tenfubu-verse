import { database } from './config';
import { ref, push, set, onValue, remove, get, onDisconnect } from 'firebase/database';
import { ClassType } from '../core/types';

export type MatchType = 'casual' | 'ranked';

export interface WaitingPlayer {
    id: string;
    peerId: string;
    playerName: string;
    playerClass: ClassType;
    matchType: MatchType;
    timestamp: number;
}

export interface MatchResult {
    peerId: string;
    playerName: string;
    playerClass: ClassType;
    isHost: boolean;
}

// マッチング状態
export type MatchmakingStatus = 'idle' | 'searching' | 'matched' | 'error';

// マッチメイキングマネージャークラス
export class MatchmakingManager {
    private myEntryRef: ReturnType<typeof ref> | null = null;
    private listenerUnsubscribe: (() => void) | null = null;
    private myId: string = '';
    private myPeerId: string = '';
    private hasMatched: boolean = false; // 複数回マッチング防止フラグ

    // 待機リストに登録してマッチングを開始
    async startMatchmaking(
        peerId: string,
        playerName: string,
        playerClass: ClassType,
        matchType: MatchType,
        onStatusChange: (status: MatchmakingStatus) => void,
        onMatch: (result: MatchResult) => void
    ): Promise<void> {
        this.myPeerId = peerId;
        this.hasMatched = false; // マッチングフラグをリセット

        const waitingListRef = ref(database, `matchmaking/${matchType}`);

        try {
            // まず、既存の待機プレイヤーを確認
            const snapshot = await get(waitingListRef);
            const waitingPlayers: { key: string; data: WaitingPlayer }[] = [];

            if (snapshot.exists()) {
                snapshot.forEach((child) => {
                    const data = child.val() as WaitingPlayer;
                    // 自分自身や古いエントリ（5分以上前）は除外
                    const isRecent = Date.now() - data.timestamp < 5 * 60 * 1000;
                    if (data.peerId !== peerId && isRecent) {
                        waitingPlayers.push({ key: child.key!, data });
                    }
                });
            }

            // 待機中のプレイヤーがいる場合、マッチング
            if (waitingPlayers.length > 0) {
                // 最も古い待機プレイヤーとマッチング
                const opponent = waitingPlayers.sort((a, b) => a.data.timestamp - b.data.timestamp)[0];

                // 相手を待機リストから削除
                await remove(ref(database, `matchmaking/${matchType}/${opponent.key}`));

                onStatusChange('matched');
                onMatch({
                    peerId: opponent.data.peerId,
                    playerName: opponent.data.playerName,
                    playerClass: opponent.data.playerClass,
                    isHost: false // 後から来た方がJOIN側
                });
                return;
            }

            // 待機中のプレイヤーがいない場合、自分を登録して待機
            onStatusChange('searching');

            const newEntryRef = push(waitingListRef);
            this.myEntryRef = newEntryRef;
            this.myId = newEntryRef.key!;

            const playerData: WaitingPlayer = {
                id: this.myId,
                peerId,
                playerName,
                playerClass,
                matchType,
                timestamp: Date.now()
            };

            await set(newEntryRef, playerData);

            // 切断時に自動でエントリを削除
            onDisconnect(newEntryRef).remove();

            // 自分のエントリが削除されたかを監視（マッチングされた場合）
            // および新しいプレイヤーが来たかを監視
            const currentMatchType = matchType; // クロージャ用にローカルコピー
            this.listenerUnsubscribe = onValue(waitingListRef, async (snapshot) => {
                // 既にマッチング済みの場合は処理をスキップ
                if (this.hasMatched) {
                    return;
                }

                if (!snapshot.exists()) {
                    // リストが空になった = 自分が削除された可能性
                    return;
                }

                let myEntryExists = false;
                let foundOpponent: { key: string; data: WaitingPlayer } | null = null;

                snapshot.forEach((child) => {
                    const data = child.val() as WaitingPlayer;
                    if (child.key === this.myId) {
                        myEntryExists = true;
                    } else if (data.peerId !== this.myPeerId) {
                        // 自分以外のプレイヤーを発見
                        if (!foundOpponent || data.timestamp > foundOpponent.data.timestamp) {
                            foundOpponent = { key: child.key!, data };
                        }
                    }
                });

                // 自分のエントリが消えている = 相手がマッチングしてきた（自分がHOST側）
                if (!myEntryExists && this.myEntryRef) {
                    // 複数回呼び出し防止
                    if (this.hasMatched) return;
                    this.hasMatched = true;

                    // この場合、相手が接続してくるのを待つ
                    // PeerJSのconnectionイベントで処理される
                    onStatusChange('matched');
                    this.cleanup();
                    // isHost: true - 待っていた側がHOST
                    // 相手の情報は PeerJS 接続時に取得
                    return;
                }

                // 新しいプレイヤーが来た場合、先に待っていた方がHOSTとしてマッチング
                if (foundOpponent !== null && myEntryExists) {
                    // 自分が先に待っていた場合のみマッチング処理
                    const myEntry = snapshot.child(this.myId).val() as WaitingPlayer;
                    // TypeScriptのnarrowingがasyncコールバック内で効かないため明示的にコピー
                    const opponent: { key: string; data: WaitingPlayer } = foundOpponent as { key: string; data: WaitingPlayer };
                    if (myEntry && myEntry.timestamp < opponent.data.timestamp) {
                        // 複数回呼び出し防止
                        if (this.hasMatched) return;
                        this.hasMatched = true;

                        // 自分が先に待っていた → 自分がHOST
                        // 相手を待機リストから削除
                        await remove(ref(database, `matchmaking/${currentMatchType}/${opponent.key}`));
                        // 自分も削除
                        await remove(ref(database, `matchmaking/${currentMatchType}/${this.myId}`));

                        this.cleanup();
                        onStatusChange('matched');
                        onMatch({
                            peerId: opponent.data.peerId,
                            playerName: opponent.data.playerName,
                            playerClass: opponent.data.playerClass,
                            isHost: true
                        });
                    }
                }
            });

        } catch (error) {
            console.error('[Matchmaking] Error:', error);
            onStatusChange('error');
            this.cleanup();
        }
    }

    // マッチングをキャンセル
    async cancelMatchmaking(): Promise<void> {
        if (this.myEntryRef) {
            try {
                await remove(this.myEntryRef);
            } catch (error) {
                console.error('[Matchmaking] Error removing entry:', error);
            }
        }
        this.cleanup();
    }

    // クリーンアップ
    private cleanup(): void {
        if (this.listenerUnsubscribe) {
            this.listenerUnsubscribe();
            this.listenerUnsubscribe = null;
        }
        this.myEntryRef = null;
        this.myId = '';
    }
}

// シングルトンインスタンス
export const matchmakingManager = new MatchmakingManager();
