import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseApiKey = import.meta.env.VITE_FIREBASE_API_KEY;

if (!firebaseApiKey) {
    throw new Error("VITE_FIREBASE_API_KEY is not set");
}

const firebaseConfig = {
    apiKey: firebaseApiKey,
    authDomain: "tenfubu-verse.firebaseapp.com",
    databaseURL: "https://tenfubu-verse-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "tenfubu-verse",
    storageBucket: "tenfubu-verse.firebasestorage.app",
    messagingSenderId: "1047996014362",
    appId: "1:1047996014362:web:729f6b715d929087e296a3",
};

const app = initializeApp(firebaseConfig);

export const database = getDatabase(app);
export const auth = getAuth(app);

export default app;
