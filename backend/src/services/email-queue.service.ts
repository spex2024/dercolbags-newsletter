import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "../db/client";
import { campaigns, campaignRecipients, emailJobs, subscribers, campaignLogs } from "../db/schema";
import { sendCampaignEmail } from "./email.service";
import { replaceLinksWithTracking, injectTrackingPixel } from "./tracking.service";
import { AppError } from "../utils/errors";

const BATCH_SIZE        = 50;
const CONCURRENT_WORKERS = 3;
const STUCK_JOB_MINUTES  = 10; // reset jobs stuck in "processing" for > 10 min

// Per-campaign lock — allows multiple campaigns to process concurrently
// while preventing the same campaign from running twice on this instance.
const activeCampaigns = new Set<string>();

// ── Public entry point ────────────────────────────────────────────────────────

export async function processCampaignJob(campaignId: string): Promise<void> {
  if (activeCampaigns.has(campaignId)) {
    console.log(`[Queue] Campaign ${campaignId} already processing on this instance`);
    return;
  }

  activeCampaigns.add(campaignId);

  try {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.status, "sending")))
      .limit(1);

    if (!campaign) {
      console.log(`[Queue] Campaign ${campaignId} is not in sending state — skipping`);
      return;
    }

    await processBatch(campaign);
  } catch (error) {
    console.error(`[Queue] Fatal error on campaign ${campaignId}:`, error);
  } finally {
    activeCampaigns.delete(campaignId);
  }
}

// ── Core batch loop ───────────────────────────────────────────────────────────

async function processBatch(campaign: typeof campaigns.$inferSelect): Promise<void> {
  const campaignId = campaign.id;

  const pendingJobs = await db
    .select()
    .from(emailJobs)
    .where(and(eq(emailJobs.campaignId, campaignId), eq(emailJobs.status, "pending")))
    .limit(BATCH_SIZE * CONCURRENT_WORKERS);

  if (pendingJobs.length === 0) {
    // No pending jobs — check nothing is still "processing" before finalising
    const [inFlight] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(emailJobs)
      .where(and(eq(emailJobs.campaignId, campaignId), eq(emailJobs.status, "processing")));

    if (Number(inFlight?.count ?? 0) === 0) {
      await finalizeCampaign(campaignId);
    }
    return;
  }

  const batches = chunkArray(pendingJobs, BATCH_SIZE);
  for (const batch of batches) {
    await Promise.allSettled(batch.map((job) => processEmailJob(job, campaign)));
  }

  // More jobs remaining — continue after a short pause
  const [remaining] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(emailJobs)
    .where(and(eq(emailJobs.campaignId, campaignId), eq(emailJobs.status, "pending")));

  if (Number(remaining?.count ?? 0) > 0) {
    // Release the per-campaign lock before re-entering so the Set doesn't block us
    activeCampaigns.delete(campaignId);
    setTimeout(() => processCampaignJob(campaignId).catch(console.error), 1_000);
  } else {
    await finalizeCampaign(campaignId);
  }
}

// ── Single job processor ──────────────────────────────────────────────────────

async function processEmailJob(
  job: typeof emailJobs.$inferSelect,
  campaign: typeof campaigns.$inferSelect,
): Promise<void> {
  try {
    await db.update(emailJobs).set({ status: "processing" }).where(eq(emailJobs.id, job.id));

    const [recipient] = await db
      .select()
      .from(campaignRecipients)
      .where(eq(campaignRecipients.id, job.recipientId))
      .limit(1);

    if (!recipient) throw new AppError("Recipient not found", 404);

    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.id, recipient.subscriberId))
      .limit(1);

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
    htmlContent = injectTrackingPixel(htmlContent, campaign.id, job.recipientId);

    const result = await sendCampaignEmail({
      brand:        campaign.brand,
      to:           subscriber.email,
      subject:      campaign.subject,
      html:         htmlContent,
      preheader:    campaign.preheader ?? undefined,
      subscriberId: subscriber.id,
      campaignId:   campaign.id,
    });

    await db
      .update(campaignRecipients)
      .set({ status: "sent", sentAt: new Date(), providerResponse: result })
      .where(eq(campaignRecipients.id, job.recipientId));

    // Advance subscriber status: new → contacted (never downgrade)
    if (subscriber.status === "new") {
      await db
        .update(subscribers)
        .set({ status: "contacted", lastEmailSentAt: new Date() })
        .where(eq(subscribers.id, subscriber.id));
    } else {
      await db
        .update(subscribers)
        .set({ lastEmailSentAt: new Date() })
        .where(eq(subscribers.id, subscriber.id));
    }

    await db
      .update(emailJobs)
      .set({ status: "completed", processedAt: new Date() })
      .where(eq(emailJobs.id, job.id));

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const attempts = job.attempts + 1;

    if (attempts >= job.maxAttempts) {
      await db
        .update(campaignRecipients)
        .set({ status: "failed", errorMessage })
        .where(eq(campaignRecipients.id, job.recipientId));
      await db
        .update(emailJobs)
        .set({ status: "failed", lastError: errorMessage, attempts })
        .where(eq(emailJobs.id, job.id));
    } else {
      await db
        .update(emailJobs)
        .set({ status: "pending", attempts, lastError: errorMessage })
        .where(eq(emailJobs.id, job.id));
    }
  }
}

// ── Finalise campaign ─────────────────────────────────────────────────────────

async function finalizeCampaign(campaignId: string): Promise<void> {
  const [stats] = await db
    .select({
      sent:   sql<number>`count(*) filter (where ${campaignRecipients.status} = 'sent')::int`,
      failed: sql<number>`count(*) filter (where ${campaignRecipients.status} = 'failed')::int`,
      total:  sql<number>`count(*)::int`,
    })
    .from(campaignRecipients)
    .where(eq(campaignRecipients.campaignId, campaignId));

  await db
    .update(campaigns)
    .set({ status: "sent", sentAt: new Date() })
    .where(eq(campaigns.id, campaignId));

  await db.insert(campaignLogs).values({
    campaignId,
    action:      "sent",
    details:     {
      totalRecipients: Number(stats?.total  ?? 0),
      sentCount:       Number(stats?.sent   ?? 0),
      failedCount:     Number(stats?.failed ?? 0),
    },
    performedBy: "system",
  });

  console.log(`[Campaign] ${campaignId} finalised — ${stats?.sent ?? 0} sent, ${stats?.failed ?? 0} failed`);
}

// ── Scheduled campaign trigger ────────────────────────────────────────────────

export async function processScheduledCampaigns(): Promise<void> {
  const now = new Date();
  const due = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.status, "scheduled"), sql`${campaigns.scheduledAt} <= ${now}`));

  for (const campaign of due) {
    await db
      .update(campaigns)
      .set({ status: "sending" })
      .where(eq(campaigns.id, campaign.id));

    processCampaignJob(campaign.id).catch((err) =>
      console.error(`[Scheduler] Failed to start campaign ${campaign.id}:`, err),
    );
  }
}

// ── Startup recovery ──────────────────────────────────────────────────────────

export async function recoverStuckCampaigns(): Promise<void> {
  // 1. Reset jobs that got stuck in "processing" (server crash mid-send)
  const stuckCutoff = new Date(Date.now() - STUCK_JOB_MINUTES * 60 * 1000);
  const stuckJobs = await db
    .select({ id: emailJobs.id, campaignId: emailJobs.campaignId })
    .from(emailJobs)
    .where(and(
      eq(emailJobs.status, "processing"),
      lt(emailJobs.createdAt, stuckCutoff),
    ));

  if (stuckJobs.length > 0) {
    console.log(`[Startup] Resetting ${stuckJobs.length} stuck job(s) → pending`);
    await db
      .update(emailJobs)
      .set({ status: "pending" })
      .where(inArray(emailJobs.id, stuckJobs.map((j) => j.id)));
  }

  // 2. Resume any campaigns still marked as "sending"
  const sending = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.status, "sending"));

  if (sending.length === 0) return;

  console.log(`[Startup] Resuming ${sending.length} campaign(s) in "sending" state`);
  for (const campaign of sending) {
    processCampaignJob(campaign.id).catch((err) =>
      console.error(`[Startup] Failed to resume campaign ${campaign.id}:`, err),
    );
  }
}

// ── Scheduler ─────────────────────────────────────────────────────────────────

export function startScheduler(): void {
  setInterval(
    () => processScheduledCampaigns().catch((err) => console.error("[Scheduler]", err)),
    60_000,
  );
  console.log("[Scheduler] Started — polling every 60s");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
