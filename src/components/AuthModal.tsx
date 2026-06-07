import React, { useState } from "react";
import { auth, db } from "../firebaseConfig";
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

export const AuthModal = ({
    onClose,
    onUnlock,
}: {
    onClose: () => void;
    onUnlock: () => void;
}) => {
    const [step, setStep] = useState("login"); // "login" or "key"
    const [key, setKey] = useState("");

    const handleGoogle = async () => {
        await signInWithPopup(auth, new GoogleAuthProvider());
        setStep("key"); // After login, move to key verification
    };

    const verifyKey = async () => {
        // 1. Safety check: Ensure key isn't empty/undefined
        if (!key || key.trim() === "") {
            setError("Please enter a valid activation key.");
            return;
        }

        try {
            // 2. Query Firestore
            const keysRef = collection(db, "valid_keys");
            const q = query(
                keysRef,
                where("key", "==", key.trim().toUpperCase()), // Standardize input
                where("used", "==", false),
            );

            const snap = await getDocs(q);

            if (!snap.empty) {
                const keyDoc = snap.docs[0];

                // 3. Perform atomic update
                await updateDoc(keyDoc.ref, { used: true });
                await updateDoc(doc(db, "users", auth.currentUser!.uid), {
                    isPaid: true,
                });

                onUnlock(); // Close modal and grant access
            } else {
                setError("Invalid or already used key.");
            }
        } catch (e) {
            console.error(e);
            setError("Connection error. Please try again.");
        }
    };
    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: "rgba(0,0,0,0.9)",
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <div
                style={{
                    background: "#111",
                    padding: 40,
                    borderRadius: 20,
                    border: "1px solid #333",
                    width: 400,
                }}
            >
                {step === "login" ? (
                    <>
                        <h2>Get Started</h2>
                        <button
                            onClick={handleGoogle}
                            style={{ width: "100%", padding: 15 }}
                        >
                            Continue with Google
                        </button>
                    </>
                ) : (
                    <>
                        <h2>Enter Activation Key</h2>
                        <input
                            onChange={(e) => setKey(e.target.value)}
                            placeholder="KC-XXXXXX"
                            style={{
                                width: "100%",
                                padding: 10,
                                marginBottom: 10,
                            }}
                        />
                        <button
                            onClick={verifyKey}
                            style={{ width: "100%", padding: 15 }}
                        >
                            Activate Pro Access
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
