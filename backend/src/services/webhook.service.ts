import { eq, and } from "drizzle-orm";
import { db } from "../db/client";
import { webhookEvents, campaignRecipients, trackingLinks, subscribers, type WebhookEvent } from "../db/schema";
import { AppError } from "../utils/errors";
import type { Brand } from "./subscribers.service";

interface ResendWebhookPayload {
  type: string;
  data: {
    id: string;
    from: string;
    to: string;
    subject?: string;
    created_at?: string;
  };
}

interface MailgunWebhookPayload {
  event: string;
  "message-id"?: string;
  recipient?: string;
  timestamp?: string;
  domain?: string;
}

export async function processResendWebhook(payload: ResendWebhookPayload, brand: Brand): Promise<WebhookEvent> {
  const eventType = mapResendEventType(payload.type);
  const [existingRecipient] = await db
    .select()
    .from(campaignRecipients)
    .where(eq(campaignRecipients.id, payload.data.id as unknown as typeof campaignRecipients.$inferSelect.id))
    .limit(1);

  const [event] = await db
    .insert(webhookEvents)
    .values({
      eventType,
      provider: "resend",
      brand,
      messageId: payload.data.id,
      email: payload.data.to,
      payload: payload as unknown as Record<string, unknown>,
      processedAt: new Date(),
    })
    .returning();

  if (existingRecipient) {
    await applyWebhookEvent(eventType, existingRecipient.id, payload.data.to);
  } else if (eventType === "email.bounced" || eventType === "email.complained") {
    await unsubscribeByEmail(payload.data.to);
  }

  return event;
}

export async function processMailgunWebhook(payload: MailgunWebhookPayload, brand: Brand): Promise<WebhookEvent> {
  const eventType = mapMailgunEventType(payload.event);
  const [existingRecipient] = payload["message-id"]
    ? await db
        .select()
        .from(campaignRecipients)
        .where(eq(campaignRecipients.id, payload["message-id"] as unknown as typeof campaignRecipients.$inferSelect.id))
        .limit(1)
    : [];

  const [event] = await db
    .insert(webhookEvents)
    .values({
      eventType,
      provider: "mailgun",
      brand,
      messageId: payload["message-id"] ?? null,
      email: payload.recipient ?? null,
      payload: payload as unknown as Record<string, unknown>,
      processedAt: new Date(),
    })
    .returning();

  if (existingRecipient) {
    await applyWebhookEvent(eventType, existingRecipient.id, payload.recipient ?? "");
  } else if (eventType === "email.bounced" || eventType === "email.complained") {
    await unsubscribeByEmail(payload.recipient ?? "");
  }

  return event;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

async function applyWebhookEvent(eventType: string, recipientId: string, email: string) {
  if (eventType === "email.opened") {
    await db.update(campaignRecipients)
      .set({ status: "opened", openedAt: new Date() })
      .where(eq(campaignRecipients.id, recipientId));
  } else if (eventType === "email.clicked") {
    await db.update(campaignRecipients)
      .set({ status: "clicked", clickedAt: new Date() })
      .where(eq(campaignRecipients.id, recipientId));
  } else if (eventType === "email.bounced" || eventType === "email.complained") {
    await db.update(campaignRecipients)
      .set({ status: "failed", errorMessage: eventType })
      .where(eq(campaignRecipients.id, recipientId));
    await unsubscribeByEmail(email);
  }
}

async function unsubscribeByEmail(email: string) {
  if (!email) return;
  await db.update(subscribers)
    .set({ isSubscribed: false, unsubscribedAt: new Date() })
    .where(eq(subscribers.email, email.toLowerCase()));
  console.log(`[Webhook] Auto-unsubscribed ${email} due to bounce/complaint`);
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

function mapResendEventType(type: string): string {
  const mapping: Record<string, string> = {
    "email.sent": "email.sent",
    "email.delivered": "email.delivered",
    "email.opened": "email.opened",
    "email.clicked": "email.clicked",
    "email.bounced": "email.bounced",
    "email.complained": "email.complained",
  };
  return mapping[type] || "email.sent";
}

function mapMailgunEventType(event: string): string {
  const mapping: Record<string, string> = {
    delivered: "email.delivered",
    opened: "email.opened",
    clicked: "email.clicked",
    bounced: "email.bounced",
    complained: "email.complained",
    unsubscribed: "email.unsubscribed",
  };
  return mapping[event] || "email.sent";
}

export async function listWebhookEvents(brand?: Brand, page = 1, limit = 20) {
  const conditions = brand ? [eq(webhookEvents.brand, brand)] : [];
  const offset = (page - 1) * limit;

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(webhookEvents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(limit)
      .offset(offset)
      .orderBy(webhookEvents.createdAt),
    db
      .select({ total: campaignRecipients.id })
      .from(webhookEvents)
      .where(conditions.length > 0 ? and(...conditions) : undefined),
  ]);

  const total = countResult.length;

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}