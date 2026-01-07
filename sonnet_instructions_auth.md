# Sonnet向け実装指示書 - アカウント認証機能

## 概要

Firebase Authentication を使用したアカウント管理機能を実装する。

**目的**:
- 初回起動時は匿名認証で即プレイ可能
- 設定画面からアカウント登録（メールアドレス/パスワード）可能
- 別端末からログインしてデータ引き継ぎ可能

---

## 実装タスク

### Task 1: Firebase config に auth を追加

**対象ファイル**: `game/src/firebase/config.ts`

**作業内容**:
- `getAuth` を import
- `export const auth = getAuth(app);` を追加

---

### Task 2: Firebase Auth モジュール作成

**対象ファイル**: `game/src/firebase/auth.ts`（新規作成）

```typescript
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
```

---

### Task 3: App.tsx で認証初期化

**対象ファイル**: `game/src/App.tsx`

**変更内容**:

1. import追加:
```typescript
import { onAuthStateChange, signInAnonymousUser } from './firebase/auth';
```

2. state追加:
```typescript
const [playerId, setPlayerId] = useState<string | null>(null);
const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
const [userEmail, setUserEmail] = useState<string | null>(null);
const [authLoading, setAuthLoading] = useState<boolean>(true);
```

3. useEffect追加（認証状態監視）:
```typescript
useEffect(() => {
  const unsubscribe = onAuthStateChange(async (user) => {
    if (user) {
      setPlayerId(user.uid);
      setIsAnonymous(user.isAnonymous);
      setUserEmail(user.email);
    } else {
      // 未ログイン → 匿名ログイン
      const anonymousUser = await signInAnonymousUser();
      setPlayerId(anonymousUser.uid);
      setIsAnonymous(true);
      setUserEmail(null);
    }
    setAuthLoading(false);
  });
  return () => unsubscribe();
}, []);
```

4. 認証完了までローディング表示:
```typescript
if (authLoading) {
  return <div>Loading...</div>;  // 適切なローディングUIに置き換え
}
```

5. 画面遷移state追加:
```typescript
const [currentScreen, setCurrentScreen] = useState<string>('title');
// 'register', 'login' を追加
```

6. 各画面コンポーネントに必要なpropsを渡す

---

### Task 4: アカウント登録画面

**対象ファイル**: `game/src/screens/RegisterScreen.tsx`（新規作成）

**仕様**:
- メールアドレス入力フィールド
- パスワード入力フィールド
- パスワード確認入力フィールド
- 「登録」ボタン
- エラーメッセージ表示
- 戻るボタン
- 既存画面と同じダークテーマ
- レスポンシブ対応（BASE_WIDTH: 1280, BASE_HEIGHT: 720）

**Props**:
```typescript
interface RegisterScreenProps {
  onRegisterSuccess: () => void;
  onBack: () => void;
}
```

**処理フロー**:
1. 入力バリデーション
   - メールアドレス形式チェック
   - パスワード6文字以上
   - パスワード一致確認
2. `linkAnonymousToEmail()` 呼び出し
3. 成功 → `onRegisterSuccess()` コールバック
4. 失敗 → エラーメッセージ表示
   - `auth/email-already-in-use`: このメールアドレスは既に使用されています
   - `auth/invalid-email`: メールアドレスの形式が正しくありません
   - `auth/weak-password`: パスワードは6文字以上にしてください
   - その他: 登録に失敗しました

---

### Task 5: ログイン画面

**対象ファイル**: `game/src/screens/LoginScreen.tsx`（新規作成）

**仕様**:
- メールアドレス入力フィールド
- パスワード入力フィールド
- 「ログイン」ボタン
- エラーメッセージ表示
- 戻るボタン
- 既存画面と同じダークテーマ
- レスポンシブ対応

**Props**:
```typescript
interface LoginScreenProps {
  onLoginSuccess: () => void;
  onBack: () => void;
}
```

**処理フロー**:
1. `signInWithEmail()` 呼び出し
2. 成功 → `onLoginSuccess()` コールバック
3. 失敗 → エラーメッセージ表示
   - `auth/user-not-found`: アカウントが見つかりません
   - `auth/wrong-password`: パスワードが正しくありません
   - `auth/invalid-email`: メールアドレスの形式が正しくありません
   - その他: ログインに失敗しました

**注意**: ログイン成功時、現在の匿名アカウントは破棄される

---

### Task 6: 設定画面にアカウント機能を追加

**対象ファイル**: `game/src/screens/SettingsScreen.tsx`

**変更内容**:

1. Props追加:
```typescript
interface SettingsScreenProps {
  // ... 既存props
  isAnonymous: boolean;
  userEmail: string | null;
  onNavigateToRegister: () => void;
  onNavigateToLogin: () => void;
  onLogout: () => void;
}
```

2. アカウントセクションを追加:

**匿名ユーザーの場合**:
```
【アカウント】
ログインしていません

[アカウント登録]    [ログイン]

※アカウント登録すると、別の端末からデータを引き継げます
```

**登録済みユーザーの場合**:
```
【アカウント】
ログイン中: user@example.com

[ログアウト]
```

3. ログアウト処理:
   - 確認ダイアログ表示（「ログアウトしますか？」）
   - OK → `onLogout()` コールバック
   - App.tsx側で `logOut()` を呼び出し → 自動的に匿名アカウントで再ログイン

---

## 画面遷移フロー

```
タイトル画面
    ↓ 設定ボタン
設定画面
    ├─ [アカウント登録] → 登録画面 → 成功 → 設定画面に戻る
    ├─ [ログイン] → ログイン画面 → 成功 → タイトル画面に戻る
    └─ [ログアウト] → 確認 → タイトル画面に戻る
```

---

## 注意事項

1. **既存機能を壊さない**: 認証機能追加後も、既存のゲームプレイには影響しないこと
2. **エラーハンドリング**: Firebase Auth のエラーコードを適切に日本語メッセージに変換
3. **UIデザイン**: 既存画面のダークテーマに合わせる
4. **レスポンシブ**: BASE_WIDTH/BASE_HEIGHT ベースのスケーリングを使用

---

## 実装順序

1. Task 1: Firebase config 修正
2. Task 2: auth.ts 作成
3. Task 3: App.tsx 認証初期化
4. Task 4: RegisterScreen 作成
5. Task 5: LoginScreen 作成
6. Task 6: SettingsScreen 修正

各Task完了後に動作確認を行うこと。

---

## 動作確認チェックリスト

- [ ] アプリ起動時に匿名認証でログインされる
- [ ] 設定画面でアカウント状態（匿名/登録済み）が正しく表示される
- [ ] アカウント登録が正常に動作する
- [ ] 登録後、設定画面にメールアドレスが表示される
- [ ] ログアウトが正常に動作する
- [ ] ログアウト後、新しい匿名アカウントで再ログインされる
- [ ] 別ブラウザ/シークレットモードからログインしてデータ引き継ぎできる
- [ ] 各種エラーメッセージが適切に表示される
