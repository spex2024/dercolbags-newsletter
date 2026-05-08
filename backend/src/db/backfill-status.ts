/**
 * One-time backfill: set subscribers who have received at least one campaign
 * email to "contacted", and backfill lastEmailSentAt where missing.
 *
 * Run with:  bun run src/db/backfill-status.ts
 */

import { eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "./client";
import { subscribers, campaignRecipients } from "./schema";

async function backfill() {
  console.log("Starting subscriber status backfill...\n");

  // 1. Subscriber IDs that have at least one delivered email
  const delivered = await db
    .selectDistinct({ subscriberId: campaignRecipients.subscriberId })
    .from(campaignRecipients)
    .where(inArray(campaignRecipients.status, ["sent", "opened", "clicked"]));

  const ids = delivered.map((r) => r.subscriberId);

  if (ids.length === 0) {
    console.log("No subscribers to update — no emails delivered yet.");
    return;
  }

  console.log(`Found ${ids.length} subscriber(s) who received at least one email.`);

  // 2. Of those, find the ones still at "new"
  const stale = await db
    .select({ id: subscribers.id })
    .from(subscribers)
    .where(inArray(subscribers.id, ids));

  const toUpdate = stale
    .filter((s) => true) // we re-filter below after fetching status
    .map((s) => s.id);

  // Fetch with status so we can filter
  const withStatus = await db
    .select({ id: subscribers.id, status: subscribers.status })
    .from(subscribers)
    .where(inArray(subscribers.id, ids));

  const newIds = withStatus
    .filter((s) => s.status === "new")
    .map((s) => s.id);

  if (newIds.length === 0) {
    console.log("All contacted subscribers already have the correct status.");
  } else {
    console.log(`Updating ${newIds.length} subscriber(s): "new" → "contacted"...`);
    await db
      .update(subscribers)
      .set({ status: "contacted" })
      .where(inArray(subscribers.id, newIds));
    console.log("Status update done.");
  }

  // 3. Backfill lastEmailSentAt where it is null
  const latestSends = await db
    .select({
      subscriberId: campaignRecipients.subscriberId,
      lastSent: sql<string>`max(${campaignRecipients.sentAt})`,
    })
    .from(campaignRecipients)
    .where(inArray(campaignRecipients.subscriberId, ids))
    .groupBy(campaignRecipients.subscriberId);

  let lastSentUpdated = 0;
  for (const row of latestSends) {
    if (!row.lastSent) continue;
    const result = await db
      .update(subscribers)
      .set({ lastEmailSentAt: new Date(row.lastSent) })
      .where(
        inArray(subscribers.id, [row.subscriberId])
      );
    lastSentUpdated++;
  }

  console.log(`Updated lastEmailSentAt for ${lastSentUpdated} subscriber(s).`);
  console.log("\nBackfill complete.");
}

backfill()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
