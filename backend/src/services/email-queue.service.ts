import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { campaigns, campaignRecipients, emailJobs, subscribers } from "../db/schema";
import { sendCampaignEmail } from "./email.service";
import { replaceLinksWithTracking, injectTrackingPixel } from "./tracking.service";
import { AppError } from "../utils/errors";

const BATCH_SIZE = 50;
const CONCURRENT_WORKERS = 3;

let isProcessing = false;

export async function processCampaignJob(campaignId: string): Promise<void> {
  if (isProcessing) {
    console.log("[Queue] Another job is processing, skipping");
    return;
  }

  isProcessing = true;

  try {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
    if (!campaign || campaign.status !== "sending") {
      console.log("[Queue] Campaign not in sending state");
      return;
    }

    const pendingJobs = await db
      .select()
      .from(emailJobs)
      .where(and(eq(emailJobs.campaignId, campaignId), eq(emailJobs.status, "pending")))
      .limit(BATCH_SIZE * CONCURRENT_WORKERS);

    if (pendingJobs.length === 0) {
      await finalizeCampaign(campaignId);
      return;
    }

    const batches = chunkArray(pendingJobs, BATCH_SIZE);

    for (const batch of batches) {
      await Promise.allSettled(batch.map((job) => processEmailJob(job, campaign)));
    }

    const remainingPending = await db
      .select({ count: sql<number>`count(*)` })
      .from(emailJobs)
      .where(and(eq(emailJobs.campaignId, campaignId), eq(emailJobs.status, "pending")));

    if (Number(remainingPending[0]?.count ?? 0) > 0) {
      setTimeout(() => processCampaignJob(campaignId).catch(console.error), 2000);
    } else {
      await finalizeCampaign(campaignId);
    }
  } catch (error) {
    console.error("[Queue] Error processing campaign:", error);
    throw error;
  } finally {
    isProcessing = false;
  }
}

async function processEmailJob(job: typeof emailJobs.$inferSelect, campaign: typeof campaigns.$inferSelect): Promise<void> {
  try {
    await db.update(emailJobs).set({ status: "processing" }).where(eq(emailJobs.id, job.id));

    const [recipient] = await db
      .select()
      .from(campaignRecipients)
      .where(eq(campaignRecipients.id, job.recipientId))
      .limit(1);

    if (!recipient) {
      throw new AppError("Recipient not found", 404);
    }

    const [subscriber] = await db.select().from(subscribers).where(eq(subscribers.id, recipient.subscriberId)).limit(1);

    if (!subscriber || !subscriber.isSubscribed) {
      await db
        .update(campaignRecipients)
        .set({ status: "failed", errorMessage: "Subscriber not found or unsubscribed" })
        .where(eq(campaignRecipients.id, job.recipientId));

      await db.update(emailJobs).set({ status: "completed" }).where(eq(emailJobs.id, job.id));
      return;
    }

    let htmlContent = campaign.content;
    htmlContent = await replaceLinksWithTracking(htmlContent, campaign.id, job.recipientId, subscriber.id);
    htmlContent = await injectTrackingPixel(htmlContent, campaign.id, job.recipientId);

    const result = await sendCampaignEmail({
      brand: campaign.brand,
      to: subscriber.email,
      subject: campaign.subject,
      html: htmlContent,
      preheader: campaign.preheader ?? undefined,
      subscriberId: subscriber.id,
      campaignId: campaign.id,
    });

    await db
      .update(campaignRecipients)
      .set({ status: "sent", sentAt: new Date(), providerResponse: result })
      .where(eq(campaignRecipients.id, job.recipientId));

    await db.update(emailJobs).set({ status: "completed", processedAt: new Date() }).where(eq(emailJobs.id, job.id));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const attempts = job.attempts + 1;

    if (attempts >= job.maxAttempts) {
      await db
        .update(campaignRecipients)
        .set({ status: "failed", errorMessage })
        .where(eq(campaignRecipients.id, job.recipientId));

      await db.update(emailJobs).set({ status: "failed", lastError: errorMessage }).where(eq(emailJobs.id, job.id));
    } else {
      await db
        .update(emailJobs)
        .set({
          attempts,
          lastError: errorMessage,
          status: "pending",
        })
        .where(eq(emailJobs.id, job.id));
    }
  }
}

async function finalizeCampaign(campaignId: string): Promise<void> {
  const stats = await db
    .select({
      sent: sql<number>`count(*) filter (where ${campaignRecipients.status} = 'sent')`,
      failed: sql<number>`count(*) filter (where ${campaignRecipients.status} = 'failed')`,
      total: sql<number>`count(*)`,
    })
    .from(campaignRecipients)
    .where(eq(campaignRecipients.campaignId, campaignId));

  await db
    .update(campaigns)
    .set({
      status: "sent",
      sentAt: new Date(),
    })
    .where(eq(campaigns.id, campaignId));

  await db.insert(campaignLogs).values({
    campaignId,
    action: "sent",
    details: {
      totalRecipients: Number(stats[0]?.total ?? 0),
      sentCount: Number(stats[0]?.sent ?? 0),
      failedCount: Number(stats[0]?.failed ?? 0),
    },
    performedBy: "system",
  });

  console.log(`[Campaign] Completed: ${stats[0]?.sent ?? 0} sent, ${stats[0]?.failed ?? 0} failed`);
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

const campaignLogs = db._.schema?.campaignLogs;

export async function processScheduledCampaigns(): Promise<void> {
  const now = new Date();

  const dueCampaigns = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.status, "scheduled"), sql`${campaigns.scheduledAt} <= ${now}`));

  for (const campaign of dueCampaigns) {
    await db
      .update(campaigns)
      .set({ status: "sending" })
      .where(eq(campaigns.id, campaign.id));

    processCampaignJob(campaign.id).catch((err) => console.error("[Scheduler] Failed to process:", err));
  }
}

setInterval(() => {
  processScheduledCampaigns().catch((err) => console.error("[Scheduler] Error:", err));
}, 60000);