import { Worker } from "bullmq";
import IORedis from "ioredis";

import type { PasswordRecoveryEmailJob } from "./email.queue";
import { sendPasswordRecoveryEmail } from "../utils/send_email";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error("REDIS_URL environment variable is required");
}

// Workers require maxRetriesPerRequest: null.
const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

const emailWorker = new Worker<PasswordRecoveryEmailJob>(
  "transactional-emails",
  async (job) => {
    switch (job.name) {
      case "password-recovery": {
        const { toEmail, resetToken } = job.data;
        await sendPasswordRecoveryEmail(toEmail, resetToken);
        break;
      }

      default:
        throw new Error(`Unknown email job: ${job.name}`);
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

emailWorker.on("failed", (job, error) => {
  console.error(
    `Email job ${job?.id ?? "unknown"} for ${job?.data.toEmail} failed: ${
      error.message
    }, ${error}`
  );
});

emailWorker.on("error", (error) => {
  console.error("Email worker error:", error);
});

console.info("Transactional email worker is running");

// Gracefully finish active jobs when the process is stopped.
async function shutdown() {
  console.info("Shutting down email worker...");

  await emailWorker.close();
  await redisConnection.quit();

  process.exit(0);
}

process.once("SIGINT", () => {
  void shutdown();
});

process.once("SIGTERM", () => {
  void shutdown();
});
