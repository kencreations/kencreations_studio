import React, { useState, useEffect } from "react";
import { auth, db } from "../firebaseConfig";
import { serverTimestamp, setDoc } from "firebase/firestore";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import {
    doc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
} from "firebase/firestore";
import { Sparkles, Key, Lock, AlertCircle } from "lucide-react";

export const AuthOverlay: React.FC<{
    onUnlock: () => void;
    isFreeFeature?: boolean;
}> = ({ onUnlock, isFreeFeature }) => {
    const [step, setStep] = useState<"login" | "key">(
        auth.currentUser ? "key" : "login",
    );
    const [key, setKey] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user && step === "login") {
                if (isFreeFeature) {
                    onUnlock();
                } else {
                    setStep("key");
                }
            }
        });
        return () => unsubscribe();
    }, [isFreeFeature, onUnlock, step]);

    const handleGoogle = async () => {
        try {
            const result = await signInWithPopup(
                auth,
                new GoogleAuthProvider(),
            );
            const user = result.user;

            // Instantly mirrors the account profile to Firestore database collection
            await setDoc(
                doc(db, "users", user.uid),
                {
                    email: user.email,
                    createdAt: serverTimestamp(),
                },
                { merge: true },
            );
            if (isFreeFeature) {
                onUnlock();
            } else {
                setStep("key");
            }
        } catch (e) {
            setError("Authentication failed. Please check popup blockers.");
        }
    };

    const verifyKey = async () => {
        const q = query(
            collection(db, "valid_keys"),
            where("key", "==", key),
            where("used", "==", false),
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
            await updateDoc(snap.docs[0].ref, { used: true });
            await updateDoc(doc(db, "users", auth.currentUser!.uid), {
                isPaid: true,
            });
            onUnlock();
        } else {
            setError("Invalid or already used key.");
        }
    };

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(3, 7, 18, 0.7)",
                backdropFilter: "blur(5px)",
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <div
                style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    padding: "40px",
                    borderRadius: "24px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    width: "100%",
                    maxWidth: "400px",
                    textAlign: "center",
                }}
            >
                {step === "login" ? (
                    <>
                        <Lock
                            size={40}
                            color="#06b6d4"
                            style={{ marginBottom: "20px" }}
                        />
                        <h2 style={{ color: "#fff" }}>Access Required</h2>
                        <p style={{ color: "#9ca3af", marginBottom: "30px" }}>
                            Sign in to continue to the design studio.
                        </p>
                        <button
                            onClick={handleGoogle}
                            style={{
                                width: "100%",
                                padding: "14px",
                                borderRadius: "12px",
                                background: "#fff",
                                color: "#000",
                                fontWeight: 600,
                                border: "none",
                                cursor: "pointer",
                            }}
                        >
                            Continue with Google
                        </button>
                    </>
                ) : (
                    <>
                        <Key
                            size={40}
                            color="#10b981"
                            style={{ marginBottom: "20px" }}
                        />
                        <h2 style={{ color: "#fff" }}>Activation Key</h2>
                        <input
                            onChange={(e) => setKey(e.target.value)}
                            placeholder="Enter your key"
                            style={{
                                width: "100%",
                                padding: "14px",
                                marginBottom: "15px",
                                borderRadius: "10px",
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: "#fff",
                            }}
                        />
                        <button
                            onClick={verifyKey}
                            style={{
                                width: "100%",
                                padding: "14px",
                                borderRadius: "12px",
                                background: "#10b981",
                                color: "#fff",
                                fontWeight: 600,
                                border: "none",
                                cursor: "pointer",
                            }}
                        >
                            Unlock Editor
                        </button>
                    </>
                )}
                {error && (
                    <p
                        style={{
                            color: "#ef4444",
                            fontSize: "0.8rem",
                            marginTop: "15px",
                        }}
                    >
                        <AlertCircle size={14} style={{ marginRight: 5 }} />{" "}
                        {error}
                    </p>
                )}
            </div>
        </div>
    );
};
