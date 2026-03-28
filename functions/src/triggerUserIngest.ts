import { HttpsError, onCall } from "firebase-functions/v2/https";
import { processSingleUser } from "./jobs/ingest.js";
import { logger as sharedLogger } from "./lib/logging.js";
import type { UserIngestTarget } from "./types.js";

/**
 * 呼び出し可能関数: 特定のユーザーのSpotifyインジェストを手動実行
 * 認証済みユーザーのみが自分のデータをインジェスト可能
 */
export const triggerUserIngest = onCall(
  {
    region: "asia-northeast1",
    timeoutSeconds: 60,
    memory: "256MiB"
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "User must be authenticated to trigger ingest"
      );
    }

    const userId = request.auth.uid;
    sharedLogger.info("Manual ingest triggered", { userId });

    try {
      const user: UserIngestTarget = { uid: userId };
      const result = await processSingleUser(user);

      sharedLogger.info("Manual ingest completed successfully", {
        userId,
        processed: result.processed,
        newestPlayedAt: result.newestPlayedAt
      });

      return {
        success: true,
        message: "Data sync completed successfully",
        processed: result.processed
      };
    } catch (error) {
      sharedLogger.error("Manual ingest failed", error, { userId });

      throw new HttpsError(
        "internal",
        error instanceof Error ? error.message : "Failed to sync data"
      );
    }
  }
);
