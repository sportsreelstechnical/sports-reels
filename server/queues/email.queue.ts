import { Queue } from "bullmq";
import IORedis from "ioredis";

export interface PasswordRecoveryEmailJob {
  toEmail: string;
  resetToken: string;
}

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error("REDIS_URL environment variable is required");
}

// This connection is used by the API to enqueue jobs.
const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: 1,
});

export const emailQueue = new Queue<PasswordRecoveryEmailJob>(
  "transactional-emails",
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  }
);

export async function enqueuePasswordRecoveryEmail(
  toEmail: string,
  resetToken: string
): Promise<void> {
  await emailQueue.add("password-recovery", {
    toEmail,
    resetToken,
  });
}
