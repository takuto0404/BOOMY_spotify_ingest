import * as functions from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { processSingleUser } from "./jobs/ingest.js";
import { logger as sharedLogger } from "./lib/logging.js";
import type { UserIngestTarget } from "./types.js";

// Initialize Firebase Admin
initializeApp();

/**
 * 呼び出し可能関数: 特定のユーザーのSpotifyインジェストを手動実行
 * 認証済みユーザーのみが自分のデータをインジェスト可能
 */
export const triggerUserIngest = functions
    .region("asia-northeast1")
    .runWith({
        timeoutSeconds: 60,
        memory: "256MB",
    })
    .https.onCall(async (data, context) => {
        // 認証チェック
        if (!context.auth) {
            throw new functions.https.HttpsError(
                "unauthenticated",
                "User must be authenticated to trigger ingest"
            );
        }

        const userId = context.auth.uid;
        sharedLogger.info("Manual ingest triggered", { userId });

        try {
            const user: UserIngestTarget = { uid: userId };
            const result = await processSingleUser(user);

            sharedLogger.info("Manual ingest completed successfully", {
                userId,
                processed: result.processed,
                newestPlayedAt: result.newestPlayedAt,
            });

            return {
                success: true,
                message: "Data sync completed successfully",
                processed: result.processed,
            };
        } catch (error) {
            sharedLogger.error("Manual ingest failed", error, { userId });

            throw new functions.https.HttpsError(
                "internal",
                error instanceof Error ? error.message : "Failed to sync data"
            );
        }
    });
