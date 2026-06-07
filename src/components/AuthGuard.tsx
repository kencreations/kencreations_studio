import React, { useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
} from "firebase/firestore";

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState(auth.currentUser);
    const [isPaid, setIsPaid] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [key, setKey] = useState("");

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                setIsPaid(
                    userDoc.exists() ? userDoc.data()?.isPaid || false : false,
                );
            } else {
                setUser(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleValidateKey = async () => {
        if (!key || key.trim() === "") {
            setError("Please enter a valid activation key.");
            return;
        }

        try {
            const keysRef = collection(db, "valid_keys");
            const q = query(
                keysRef,
                where("key", "==", key.trim().toUpperCase()),
                where("used", "==", false),
            );
            const snap = await getDocs(q);

            if (!snap.empty) {
                const keyDoc = snap.docs[0];
                const uid = auth.currentUser!.uid;

                // 1. Mark key as used AND record audit trail
                await updateDoc(keyDoc.ref, {
                    used: true,
                    usedBy: uid,
                    redeemedAt: new Date(),
                });

                // 2. Upsert user document (Create if missing, update if present)
                const userRef = doc(db, "users", uid);
                await setDoc(
                    userRef,
                    {
                        email: auth.currentUser!.email,
                        isPaid: true,
                        lastUsedKey: keyDoc.data().key,
                    },
                    { merge: true },
                );

                setIsPaid(true);
                setError("");
            } else {
                setError("Invalid or already used key.");
            }
        } catch (e) {
            console.error(e);
            setError("Connection error. Please try again.");
        }
    };

    if (loading)
        return (
            <div
                style={{
                    background: "#030712",
                    color: "#fff",
                    height: "100vh",
                }}
            >
                Loading Security...
            </div>
        );

    if (!user) {
        return (
            <div
                style={{
                    textAlign: "center",
                    padding: "100px",
                    background: "#030712",
                    color: "#fff",
                    minHeight: "100vh",
                }}
            >
                <h1>Authentication Required</h1>
                <button
                    onClick={() =>
                        signInWithPopup(auth, new GoogleAuthProvider())
                    }
                >
                    Sign in with Google
                </button>
            </div>
        );
    }

    if (!isPaid) {
        return (
            <div
                style={{
                    padding: "50px",
                    background: "#030712",
                    color: "#fff",
                    minHeight: "100vh",
                }}
            >
                <h2>Enter License Key</h2>
                <input
                    type="text"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="KC-XXXXXX"
                    style={{ padding: "10px", width: "250px" }}
                />
                <button
                    onClick={handleValidateKey}
                    style={{ padding: "10px 20px", marginLeft: "10px" }}
                >
                    Activate Pro
                </button>
                {error && <p style={{ color: "#ef4444" }}>{error}</p>}
            </div>
        );
    }

    return <>{children}</>;
};

export default AuthGuard;
