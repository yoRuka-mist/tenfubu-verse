import { auth } from './config';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';

let currentUser: User | null = null;

// 匿名認証でサインイン
export const signInAnonymousUser = async (): Promise<string> => {
    const result = await signInAnonymously(auth);
    currentUser = result.user;
    return result.user.uid;
};

// 現在のユーザーIDを取得
export const getCurrentUserId = (): string | null => {
    return currentUser?.uid ?? null;
};

// 認証状態の監視
export const onAuthStateChange = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, (user) => {
        currentUser = user;
        callback(user);
    });
};
