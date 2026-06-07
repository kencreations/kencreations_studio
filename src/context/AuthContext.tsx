import React, { createContext, useContext, useState, useEffect } from "react";
import { auth } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState(null);
    const [isPaid, setIsPaid] = useState(false);

    useEffect(() => {
        return onAuthStateChanged(auth, (u) => setUser(u));
    }, []);

    return (
        <AuthContext.Provider value={{ user, isPaid, setIsPaid }}>
            {children}
        </AuthContext.Provider>
    );
};
export const useAuth = () => useContext(AuthContext);
