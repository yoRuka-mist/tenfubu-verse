import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyCqXssa5oOaWY3CiN7ti53Qt1F_AGpBrVE",
    authDomain: "tenfubu-verse.firebaseapp.com",
    databaseURL: "https://tenfubu-verse-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "tenfubu-verse",
    storageBucket: "tenfubu-verse.firebasestorage.app",
    messagingSenderId: "1047996014362",
    appId: "1:1047996014362:web:729f6b715d929087e296a3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
export const database = getDatabase(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

export default app;
