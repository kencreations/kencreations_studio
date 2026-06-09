import React, { useEffect, useState } from "react";
import { db, auth } from "../firebaseConfig";
import {
    doc,
    onSnapshot,
    collection,
    getDocs,
    addDoc,
    Timestamp,
} from "firebase/firestore";
// Import Cloud Functions to communicate with the Auth backend
import { getFunctions, httpsCallable } from "firebase/functions";
import { Download, Users2, LogOut, Key, Mail, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Updated to match your exact database fields from the screenshot
interface GlobalStats {
    totalExports: number;
    stlCount: number;
    threeMfCount: number;
}
interface AccessKey {
    id: string;
    key: string;
    used: boolean;
    createdAt: any;
}

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<GlobalStats>({
        totalExports: 0,
        stlCount: 0,
        threeMfCount: 0,
    });
    const [authUsersCount, setAuthUsersCount] = useState<number>(0);
    const [keysList, setKeysList] = useState<AccessKey[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // 1. Fetch Data on Load (With Isolated Real-Time Listeners)
    useEffect(() => {
        // Stats Listener - Pointing to your verified admin/metrics document
        const statsRef = doc(db, "admin", "metrics");
        const unsubscribeStats = onSnapshot(
            statsRef,
            (s) => s.exists() && setStats(s.data() as GlobalStats),
        );

        // Keys Listener - Made real-time so it updates instantly without page reloads
        const keysRef = collection(db, "valid_keys");
        const unsubscribeKeys = onSnapshot(keysRef, (snapshot) => {
            setKeysList(
                snapshot.docs.map(
                    (d) => ({ id: d.id, ...d.data() }) as AccessKey,
                ),
            );
        });

        // Isolated Cloud Function Fetch - If this fails, it won't block your keys or stats!
        const fetchAuthTelemetry = async () => {
            try {
                const functions = getFunctions();
                const getAuthTelemetry = httpsCallable(
                    functions,
                    "getAuthenticationTelemetry",
                );
                const response = await getAuthTelemetry();
                const data = response.data as { authUserCount: number };

                setAuthUsersCount(data.authUserCount);
            } catch (error) {
                console.error(
                    "Cloud Function failed/un-deployed, but Firestore data loaded successfully:",
                    error,
                );
            } finally {
                setLoading(false);
            }
        };

        fetchAuthTelemetry();

        // Clean up all listeners on unmount
        return () => {
            unsubscribeStats();
            unsubscribeKeys();
        };
    }, []);

    // 2. Fixed Key Generator Logic

    const handleGenerateKey = async () => {
        const newKey =
            "KC-" + Math.random().toString(36).substring(2, 8).toUpperCase();

        // FIX: Removed the accidental double collection() wrapper
        await addDoc(collection(db, "valid_keys"), {
            key: newKey,
            used: false,
            createdAt: Timestamp.now(),
        });

        window.location.reload(); // Quick refresh to show new key
    };

    if (loading) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    backgroundColor: "#030712",
                    color: "#f9fafb",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <p style={{ fontSize: "1.2rem", color: "#9ca3af" }}>
                    Loading system telemetry...
                </p>
            </div>
        );
    }

    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: "#030712",
                color: "#f9fafb",
                padding: "40px 24px",
            }}
        >
            {/* Header Area */}
            <div
                style={{
                    maxWidth: "1100px",
                    margin: "0 auto 48px auto",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <div>
                    <h1
                        style={{ fontSize: "2rem", fontWeight: 700, margin: 0 }}
                    >
                        Studio Control Panel
                    </h1>
                    <p style={{ color: "#9ca3af", margin: "4px 0 0 0" }}>
                        Core engine diagnostics and product consumption
                        dashboard.
                    </p>
                </div>
                <button
                    onClick={() => {
                        auth.signOut();
                        navigate("/");
                    }}
                    style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        color: "#ef4444",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        padding: "8px 16px",
                        borderRadius: "10px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                    }}
                >
                    <LogOut size={14} /> Exit Admin
                </button>
            </div>

            {/* Metrics Dashboard Grid */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "24px",
                    maxWidth: "1100px",
                    margin: "0 auto 48px auto",
                }}
            >
                {/* Total Exports */}
                <div
                    style={{
                        background: "rgba(255, 255, 255, 0.01)",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        borderRadius: "20px",
                        padding: "24px",
                        display: "flex",
                        gap: "20px",
                        alignItems: "center",
                    }}
                >
                    <div
                        style={{
                            background: "rgba(6, 182, 212, 0.1)",
                            color: "#06b6d4",
                            padding: "12px",
                            borderRadius: "14px",
                        }}
                    >
                        <Download size={20} />
                    </div>
                    <div>
                        <span
                            style={{
                                color: "#9ca3af",
                                display: "block",
                                fontSize: "0.85rem",
                            }}
                        >
                            Total Exports
                        </span>
                        <span style={{ fontSize: "1.75rem", fontWeight: 800 }}>
                            {stats.totalExports}
                        </span>
                    </div>
                </div>

                {/* STL Count Breakdown */}
                <div
                    style={{
                        background: "rgba(255, 255, 255, 0.01)",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        borderRadius: "20px",
                        padding: "24px",
                        display: "flex",
                        gap: "20px",
                        alignItems: "center",
                    }}
                >
                    <div
                        style={{
                            background: "rgba(16, 185, 129, 0.1)",
                            color: "#10b981",
                            padding: "12px",
                            borderRadius: "14px",
                        }}
                    >
                        <Layers size={20} />
                    </div>
                    <div>
                        <span
                            style={{
                                color: "#9ca3af",
                                display: "block",
                                fontSize: "0.85rem",
                            }}
                        >
                            STL Files
                        </span>
                        <span style={{ fontSize: "1.75rem", fontWeight: 800 }}>
                            {stats.stlCount}
                        </span>
                    </div>
                </div>

                {/* 3MF Count Breakdown */}
                <div
                    style={{
                        background: "rgba(255, 255, 255, 0.01)",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        borderRadius: "20px",
                        padding: "24px",
                        display: "flex",
                        gap: "20px",
                        alignItems: "center",
                    }}
                >
                    <div
                        style={{
                            background: "rgba(251, 191, 36, 0.1)",
                            color: "#fbbf24",
                            padding: "12px",
                            borderRadius: "14px",
                        }}
                    >
                        <Layers size={20} />
                    </div>
                    <div>
                        <span
                            style={{
                                color: "#9ca3af",
                                display: "block",
                                fontSize: "0.85rem",
                            }}
                        >
                            3MF Files
                        </span>
                        <span style={{ fontSize: "1.75rem", fontWeight: 800 }}>
                            {stats.threeMfCount}
                        </span>
                    </div>
                </div>

                {/* Live Auth Tab Account Counts */}
                <div
                    style={{
                        background: "rgba(255, 255, 255, 0.01)",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        borderRadius: "20px",
                        padding: "24px",
                        display: "flex",
                        gap: "20px",
                        alignItems: "center",
                    }}
                >
                    <div
                        style={{
                            background: "rgba(239, 68, 68, 0.1)",
                            color: "#ef4444",
                            padding: "12px",
                            borderRadius: "14px",
                        }}
                    >
                        <Users2 size={20} />
                    </div>
                    <div>
                        <span
                            style={{
                                color: "#9ca3af",
                                display: "block",
                                fontSize: "0.85rem",
                            }}
                        >
                            Total Auth Profiles
                        </span>
                        <span style={{ fontSize: "1.75rem", fontWeight: 800 }}>
                            {authUsersCount}
                        </span>
                    </div>
                </div>
            </div>

            {/* Key Provisioning Engine */}
            <div
                style={{
                    maxWidth: "1100px",
                    margin: "0 auto 48px auto",
                    background: "rgba(255, 255, 255, 0.01)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    borderRadius: "20px",
                    padding: "32px",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "20px",
                    }}
                >
                    <h2
                        style={{
                            fontSize: "1.2rem",
                            margin: 0,
                            fontWeight: 600,
                        }}
                    >
                        Access Keys
                    </h2>
                    <button
                        onClick={handleGenerateKey}
                        style={{
                            background: "#06b6d4",
                            color: "#000",
                            border: "none",
                            padding: "8px 16px",
                            borderRadius: "8px",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                        }}
                    >
                        <Key size={16} /> Generate Key
                    </button>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {keysList.length === 0 ? (
                        <p
                            style={{
                                color: "#6b7280",
                                fontSize: "0.9rem",
                                margin: 0,
                            }}
                        >
                            No dynamic tokens available.
                        </p>
                    ) : (
                        keysList.map((k) => (
                            <div
                                key={k.id}
                                style={{
                                    padding: "8px 12px",
                                    background: k.used
                                        ? "#374151"
                                        : "rgba(6, 182, 212, 0.2)",
                                    color: k.used ? "#9ca3af" : "#06b6d4",
                                    border: k.used
                                        ? "1px solid transparent"
                                        : "1px solid rgba(6, 182, 212, 0.3)",
                                    borderRadius: "6px",
                                    fontSize: "0.8rem",
                                    fontWeight: 500,
                                }}
                            >
                                {k.key} {k.used ? "(Used)" : "(Available)"}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
