import { eq, and } from "drizzle-orm";
import { db } from "../db/client";
import { trackingLinks, campaignRecipients, campaigns, subscribers } from "../db/schema";
import { AppError } from "../utils/errors";
import { env } from "../config/env";

const TRACKING_DOMAIN = env.FRONTEND_URL;

export async function createTrackingLink(
  campaignId: string,
  recipientId: string,
  subscriberId: string,
  originalUrl: string
): Promise<string> {
  const hashedUrl = generateHash(originalUrl, recipientId);

  const existing = await db
    .select()
    .from(trackingLinks)
    .where(and(eq(trackingLinks.hashedUrl, hashedUrl), eq(trackingLinks.recipientId, recipientId)))
    .limit(1);

  if (existing.length > 0) {
    return `${TRACKING_DOMAIN}/track/click/${hashedUrl}`;
  }

  await db.insert(trackingLinks).values({
    campaignId,
    recipientId,
    subscriberId,
    originalUrl,
    hashedUrl,
  });

  return `${TRACKING_DOMAIN}/track/click/${hashedUrl}`;
}

export async function replaceLinksWithTracking(html: string, campaignId: string, recipientId: string, subscriberId: string): Promise<string> {
  const urlRegex = /href=["'](https?:\/\/[^"']+)["']/gi;
  let match;
  const linksToTrack: Map<string, string> = new Map();

  while ((match = urlRegex.exec(html)) !== null) {
    const originalUrl = match[1];
    if (!originalUrl.includes(TRACKING_DOMAIN) && !originalUrl.includes("/unsubscribe")) {
      linksToTrack.set(originalUrl, originalUrl);
    }
  }

  let result = html;
  for (const [originalUrl] of linksToTrack) {
    const trackingUrl = await createTrackingLink(campaignId, recipientId, subscriberId, originalUrl);
    result = result.replace(new RegExp(encodeURIComponent(originalUrl), "g"), trackingUrl);
    result = result.replace(new RegExp(originalUrl, "g"), trackingUrl);
  }

  return result;
}

export async function injectTrackingPixel(html: string, campaignId: string, recipientId: string): string {
  const pixelUrl = `${TRACKING_DOMAIN}/track/open/${recipientId}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="" />`;

  if (html.includes("</body>")) {
    return html.replace("</body>", `${pixel}</body>`);
  }
  return html + pixel;
}

function generateHash(url: string, recipientId: string): string {
  const crypto = globalThis.crypto;
  const data = `${url}-${recipientId}-${Date.now()}`;
  const hash = crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .slice(0, 16)
    .join("");
}

export async function recordOpen(recipientId: string): Promise<void> {
  const [recipient] = await db
    .select()
    .from(campaignRecipients)
    .where(eq(campaignRecipients.id, recipientId))
    .limit(1);

  if (!recipient) return;

  if (recipient.status === "sent") {
    await db
      .update(campaignRecipients)
      .set({ status: "opened", openedAt: new Date() })
      .where(eq(campaignRecipients.id, recipientId));
  }
}

export async function recordClick(trackingId: string): Promise<{ url: string } | null> {
  const [link] = await db
    .select()
    .from(trackingLinks)
    .where(eq(trackingLinks.hashedUrl, trackingId))
    .limit(1);

  if (!link) return null;

  await db
    .update(trackingLinks)
    .set({
      clickedAt: new Date(),
      clickCount: link.clickCount + 1,
    })
    .where(eq(trackingLinks.id, link.id));

  const [recipient] = await db
    .select()
    .from(campaignRecipients)
    .where(eq(campaignRecipients.id, link.recipientId))
    .limit(1);

  if (recipient) {
    await db
      .update(campaignRecipients)
      .set({ status: "clicked", clickedAt: new Date() })
      .where(eq(campaignRecipients.id, link.recipientId));
  }

  return { url: link.originalUrl };
}

export async function getClickStats(campaignId: string) {
  const stats = await db
    .select({
      totalClicks: trackingLinks.clickCount,
      uniqueClicks: trackingLinks.id,
    })
    .from(trackingLinks)
    .where(eq(trackingLinks.campaignId, campaignId));

  const totalClicks = stats.reduce((sum, s) => sum + Number(s.totalClicks), 0);
  const uniqueClicks = stats.filter((s) => s.uniqueClicks).length;

  return { totalClicks, uniqueClicks };
}