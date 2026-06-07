import { db } from "../firebaseConfig";
import { doc, runTransaction, increment, setDoc } from "firebase/firestore";

/**
 * Tracks an export action atomically across STL, 3MF, or Zip packs
 */
export const trackModelExport = async () => {
    const analyticsRef = doc(db, "analytics", "global_stats");
    try {
        await runTransaction(db, async (transaction) => {
            const sfDoc = await transaction.get(analyticsRef);
            if (!sfDoc.exists()) {
                transaction.set(analyticsRef, {
                    totalExports: 1,
                    userCount: 1,
                });
            } else {
                transaction.update(analyticsRef, {
                    totalExports: increment(1),
                });
            }
        });
    } catch (e) {
        console.error("Failed to update export analytics:", e);
    }
};

/**
 * Increments total registered user account tallies during onboarding paths
 */
export const trackNewUserRegistration = async () => {
    const analyticsRef = doc(db, "analytics", "global_stats");
    try {
        await runTransaction(db, async (transaction) => {
            const sfDoc = await transaction.get(analyticsRef);
            if (!sfDoc.exists()) {
                transaction.set(analyticsRef, {
                    totalExports: 0,
                    userCount: 1,
                });
            } else {
                transaction.update(analyticsRef, { userCount: increment(1) });
            }
        });
    } catch (e) {
        console.error("Failed to update user analytics:", e);
    }
};
