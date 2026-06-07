import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

import { getAnalytics } from "firebase/analytics";
const firebaseConfig = {
    apiKey: "AIzaSyDLHUB-DGP_pnkOZJijAih3CU7BJB2lwaw",
    authDomain: "kencreations-studio.firebaseapp.com",
    projectId: "kencreations-studio",
    storageBucket: "kencreations-studio.firebasestorage.app",
    messagingSenderId: "1040603204099",
    appId: "1:1040603204099:web:52a9a4d6c56f86f72c9c36",
    measurementId: "G-Y3KE81Y7T1",
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
