// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC3bmbFR7jwc0__efM39v-aczFtEG8yZRE",
  authDomain: "uberclone-35505.firebaseapp.com",
  projectId: "uberclone-35505",
  storageBucket: "uberclone-35505.firebasestorage.app",
  messagingSenderId: "47614919315",
  appId: "1:47614919315:web:962b81089d1815250b8366",
  measurementId: "G-5WSFH5E933"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const storage = getStorage(app);