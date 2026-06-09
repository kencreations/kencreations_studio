import { db } from "../firebaseConfig"; // path to your firebase file
import { doc, setDoc, increment } from "firebase/firestore";

export const logExportEvent = async (exportType: "stl" | "3mf") => {
    const statsRef = doc(db, "admin", "metrics");

    try {
        await setDoc(
            statsRef,
            {
                totalExports: increment(1),
                // Tracks specific formats separately
                stlCount: exportType === "stl" ? increment(1) : increment(0),
                threeMfCount:
                    exportType === "3mf" ? increment(1) : increment(0),
                lastExportAt: new Date(),
            },
            { merge: true },
        );
    } catch (error) {
        console.error("Failed to log export metric:", error);
    }
};
