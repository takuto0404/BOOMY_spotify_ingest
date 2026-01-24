import * as functions from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { runHourlyIngest } from "./jobs/ingest.js";
import { logger as sharedLogger } from "./lib/logging.js";

// Initialize Firebase Admin
initializeApp();

/**
 * 定期実行関数: 1時間ごとに全ユーザーのSpotifyインジェストを実行
 * Cloud Schedulerによってトリガーされる
 */
export const scheduledIngest = functions
    .region("asia-northeast1")
    .runWith({
        timeoutSeconds: 540, // 9分
        memory: "512MB",
    })
    .pubsub.schedule("every 1 hours")
    .timeZone("Asia/Tokyo")
    .onRun(async (context) => {
        sharedLogger.info("Scheduled ingest started", { executionId: context.eventId });

        try {
            const stats = await runHourlyIngest();
            sharedLogger.info("Scheduled ingest completed successfully", stats);
            return { success: true, stats };
        } catch (error) {
            sharedLogger.error("Scheduled ingest failed", error);
            throw error; // Cloud Functionsのエラーログに記録
        }
    });
