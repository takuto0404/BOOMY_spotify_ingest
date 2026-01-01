import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { runHourlyIngest } from "./jobs/ingest.js";
import { logger } from "./lib/logging.js";

const serviceAccountKeyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKeyPath) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set");
}

initializeApp({
  credential: cert(serviceAccountKeyPath),
});

const db = getFirestore();

const main = async () => {
  try {
    const stats = await runHourlyIngest();
    logger.info("Ingest job completed", stats);
  } catch (error) {
    logger.error("Ingest job failed", error);
    process.exitCode = 1;
  }
};

void main();