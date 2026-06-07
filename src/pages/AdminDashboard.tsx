import React, { useEffect, useState } from "react";
import { db, auth } from "../firebaseConfig";
import {
    doc,
    onSnapshot,
    collection,
    query,
    getDocs,
    addDoc,
    updateDoc,
    Timestamp,
} from "firebase/firestore";
import {
    ShieldCheck,
    Download,
    Users2,
    LogOut,
    Key,
    AlertTriangle,
    RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface GlobalStats {
    totalExports: number;
    userCount: number;
}
interface UserRow {
    uid: string;
    email: string;
    createdAt?: string;
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
        userCount: 0,
    });
    const [usersList, setUsersList] = useState<UserRow[]>([]);
    const [keysList, setKeysList] = useState<AccessKey[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // 1. Fetch Data on Load
    useEffect(() => {
        const statsRef = doc(db, "analytics", "global_stats");
        const unsubscribeStats = onSnapshot(
            statsRef,
            (s) => s.exists() && setStats(s.data() as GlobalStats),
        );

        const fetchData = async () => {
            // Fetch Users
            const usersSnap = await getDocs(query(collection(db, "users")));
            setUsersList(
                usersSnap.docs.map((d) => ({
                    uid: d.id,
                    email: d.data().email || "N/A",
                    createdAt: d
                        .data()
                        .createdAt?.toDate()
                        .toLocaleDateString(),
                })),
            );

            // Fetch Keys
            const keysSnap = await getDocs(collection(db, "valid_keys"));
            setKeysList(
                keysSnap.docs.map(
                    (d) => ({ id: d.id, ...d.data() }) as AccessKey,
                ),
            );
            setLoading(false);
        };
        fetchData();
        return () => unsubscribeStats();
    }, []);

    const handleGenerateKey = async () => {
        const newKey =
            "KC-" + Math.random().toString(36).substring(2, 8).toUpperCase();
        await addDoc(collection(db, "valid_keys"), {
            key: newKey,
            used: false,
            createdAt: Timestamp.now(),
        });
        window.location.reload(); // Quick refresh to show new key
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: "#030712",
                color: "#f9fafb",
                padding: "40px 24px",
            }}
        >
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
                    <p style={{ color: "#9ca3af" }}>
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
                    }}
                >
                    <LogOut size={14} /> Exit Admin
                </button>
            </div>

            {/* Metrics */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "24px",
                    maxWidth: "1100px",
                    margin: "0 auto 48px auto",
                }}
            >
                <div
                    style={{
                        background: "rgba(255, 255, 255, 0.01)",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        borderRadius: "20px",
                        padding: "32px",
                        display: "flex",
                        gap: "24px",
                    }}
                >
                    <div
                        style={{
                            background: "rgba(6, 182, 212, 0.1)",
                            color: "#06b6d4",
                            padding: "16px",
                            borderRadius: "14px",
                        }}
                    >
                        <Download size={24} />
                    </div>
                    <div>
                        <span style={{ color: "#9ca3af", display: "block" }}>
                            Total Exports
                        </span>
                        <span style={{ fontSize: "2rem", fontWeight: 800 }}>
                            {stats.totalExports}
                        </span>
                    </div>
                </div>
                <div
                    style={{
                        background: "rgba(255, 255, 255, 0.01)",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        borderRadius: "20px",
                        padding: "32px",
                        display: "flex",
                        gap: "24px",
                    }}
                >
                    <div
                        style={{
                            background: "rgba(16, 185, 129, 0.1)",
                            color: "#10b981",
                            padding: "16px",
                            borderRadius: "14px",
                        }}
                    >
                        <Users2 size={24} />
                    </div>
                    <div>
                        <span style={{ color: "#9ca3af", display: "block" }}>
                            Total Users
                        </span>
                        <span style={{ fontSize: "2rem", fontWeight: 800 }}>
                            {stats.userCount}
                        </span>
                    </div>
                </div>
            </div>

            {/* Key Generator */}
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
                    <h2 style={{ fontSize: "1.2rem", margin: 0 }}>
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
                        }}
                    >
                        <Key size={16} /> Generate Key
                    </button>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {keysList.map((k) => (
                        <div
                            key={k.id}
                            style={{
                                padding: "8px 12px",
                                background: k.used ? "#374151" : "#06b6d4",
                                color: k.used ? "#9ca3af" : "#000",
                                borderRadius: "6px",
                                fontSize: "0.8rem",
                            }}
                        >
                            {k.key} {k.used ? "(Used)" : "(Available)"}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
