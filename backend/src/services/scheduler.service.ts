import { eq, and, or, lte } from "drizzle-orm";
import { db } from "../db/client";
import { scheduledJobs, campaigns } from "../db/schema";
import { AppError } from "../utils/errors";
import { processCampaignJob } from "./email-queue.service";

export async function scheduleJob(
  jobType: string,
  entityType: string,
  entityId: string,
  scheduledFor: Date
): Promise<string> {
  const [job] = await db
    .insert(scheduledJobs)
    .values({
      jobType,
      entityType,
      entityId,
      scheduledFor,
      status: "pending",
    })
    .returning();

  return job.id;
}

export async function processDueJobs(): Promise<void> {
  const now = new Date();

  const dueJobs = await db
    .select()
    .from(scheduledJobs)
    .where(
      and(
        eq(scheduledJobs.status, "pending"),
        lte(scheduledJobs.scheduledFor, now)
      )
    )
    .limit(10);

  for (const job of dueJobs) {
    try {
      await processJob(job);
      await db
        .update(scheduledJobs)
        .set({
          status: "completed",
          completedAt: new Date(),
        })
        .where(eq(scheduledJobs.id, job.id));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const newAttempts = job.attempts + 1;

      if (newAttempts >= 5) {
        await db
          .update(scheduledJobs)
          .set({
            status: "failed",
            lastError: errorMessage,
            attempts: newAttempts,
          })
          .where(eq(scheduledJobs.id, job.id));
      } else {
        await db
          .update(scheduledJobs)
          .set({
            lastError: errorMessage,
            attempts: newAttempts,
          })
          .where(eq(scheduledJobs.id, job.id));
      }
    }
  }
}

async function processJob(job: typeof scheduledJobs.$inferSelect): Promise<void> {
  if (job.entityType === "campaign" && job.jobType === "send_campaign") {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, job.entityId))
      .limit(1);

    if (!campaign || campaign.status !== "scheduled") {
      return;
    }

    await db
      .update(campaigns)
      .set({ status: "sending" })
      .where(eq(campaigns.id, campaign.id));

    await processCampaignJob(campaign.id);
  }
}

export async function cancelScheduledJob(jobId: string): Promise<void> {
  const [job] = await db
    .select()
    .from(scheduledJobs)
    .where(eq(scheduledJobs.id, jobId))
    .limit(1);

  if (!job) {
    throw new AppError("Job not found", 404);
  }

  if (job.status !== "pending") {
    throw new AppError("Cannot cancel job that is not pending", 400);
  }

  await db
    .update(scheduledJobs)
    .set({ status: "cancelled" })
    .where(eq(scheduledJobs.id, jobId));
}

export async function getScheduledJobs(brand?: string): Promise<typeof scheduledJobs.$inferSelect[]> {
  return db.select().from(scheduledJobs).where(eq(scheduledJobs.status, "pending")).orderBy(scheduledJobs.scheduledFor);
}

setInterval(async () => {
  try {
    await processDueJobs();
  } catch (error) {
    console.error("[Scheduler] Error processing due jobs:", error);
  }
}, 30000);