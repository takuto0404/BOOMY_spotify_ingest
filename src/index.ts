import { runHourlyIngest } from "./jobs/ingest.js";
import { logger } from "./lib/logging.js";

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