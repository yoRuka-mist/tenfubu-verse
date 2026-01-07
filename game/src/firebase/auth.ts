import { auth } from './config';
import {
  signInAnonymously,
  signInWithEmailAndPassword,
  linkWithCredential,
  EmailAuthProvider,
  onAuthStateChanged,
  signOut,
  User
} from 'firebase/auth';

// 匿名認証でサインイン
export const signInAnonymousUser = async (): Promise<User> => {
  const result = await signInAnonymously(auth);
  return result.user;
};

// メール/パスワードでログイン
export const signInWithEmail = async (email: string, password: string): Promise<User> => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

// 新規アカウント登録（匿名アカウントを昇格）
export const linkAnonymousToEmail = async (email: string, password: string): Promise<User> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('No user logged in');
  }

  const credential = EmailAuthProvider.credential(email, password);
  const result = await linkWithCredential(currentUser, credential);
  return result.user;
};

// ログアウト
export const logOut = async (): Promise<void> => {
  await signOut(auth);
};

// 現在のユーザーを取得
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// 認証状態の監視
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// ユーザーが匿名かどうか
export const isAnonymousUser = (): boolean => {
  return auth.currentUser?.isAnonymous ?? true;
};
