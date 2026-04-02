import { onSchedule } from "firebase-functions/v2/scheduler";
import { runHourlyIngest } from "./jobs/ingest.js";
import { logger as sharedLogger } from "./lib/logging.js";

/**
 * 定期実行関数: 1時間ごとに全ユーザーのSpotifyインジェストを実行
 * Cloud Schedulerによってトリガーされる
 */
export const scheduledIngest = onSchedule(
  {
    region: "us-central1",
    timeoutSeconds: 540,
    memory: "512MiB",
    schedule: "every 1 hours",
    timeZone: "Asia/Tokyo"
  },
  async (context) => {
    sharedLogger.info("Scheduled ingest started", {
      jobName: context.jobName,
      scheduleTime: context.scheduleTime
    });

    try {
      const stats = await runHourlyIngest();
      sharedLogger.info("Scheduled ingest completed successfully", stats);
      return;
    } catch (error) {
      sharedLogger.error("Scheduled ingest failed", error);
      throw error;
    }
  }
);
