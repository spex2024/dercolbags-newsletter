import { and, asc, count, desc, eq, inArray, sql, not, isNull } from "drizzle-orm";
import { db } from "../db/client";
import {
  campaigns,
  campaignRecipients,
  campaignLogs,
  emailJobs,
  subscribers,
  mailingLists,
  mailingListSubscribers,
  type Campaign,
  type NewCampaign,
} from "../db/schema";
import { AppError } from "../utils/errors";
import type {
  CreateCampaignInput,
  UpdateCampaignInput,
  ScheduleCampaignInput,
  CampaignFilterQuery,
} from "../validators/campaign.schema";
import { getAccessibleBrands, type AuthUser } from "../middlewares/auth.middleware";
import { processCampaignJob } from "./email-queue.service";

type Brand = "watpak" | "dercolbags";
type AllowedBrands = Brand[] | null;

const SORTABLE_COLUMNS = {
  name: campaigns.name,
  createdAt: campaigns.createdAt,
  status: campaigns.status,
  scheduledAt: campaigns.scheduledAt,
  sentAt: campaigns.sentAt,
} as const;

export async function createCampaign(input: CreateCampaignInput, userId: string) {
  const [campaign] = await db
    .insert(campaigns)
    .values({
      name: input.name.trim(),
      brand: input.brand,
      subject: input.subject.trim(),
      content: input.content,
      designJson: input.designJson ?? null,
      preheader: input.preheader?.trim() ?? null,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      createdBy: userId,
    })
    .returning();

  if (!campaign) throw new AppError("Failed to create campaign", 500);

  await logCampaignAction(campaign.id, "created", { input }, userId);
  return campaign;
}

export async function getCampaignById(id: string, allowedBrands: AllowedBrands) {
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  if (!campaign) throw new AppError("Campaign not found", 404);

  if (allowedBrands !== null && !allowedBrands.includes(campaign.brand)) {
    throw new AppError("You do not have access to this campaign", 403);
  }
  return campaign;
}

export async function listCampaigns(query: CampaignFilterQuery, allowedBrands: AllowedBrands) {
  const { brand, status, page, limit } = query;

  if (brand && allowedBrands !== null && !allowedBrands.includes(brand)) {
    throw new AppError("You do not have access to this brand", 403);
  }

  const conditions = [];
  if (brand) conditions.push(eq(campaigns.brand, brand));
  if (status) conditions.push(eq(campaigns.status, status));
  if (allowedBrands !== null && allowedBrands.length > 0) {
    conditions.push(inArray(campaigns.brand, allowedBrands));
  } else if (allowedBrands !== null && allowedBrands.length === 0) {
    return { items: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;

  const [items, countResult] = await Promise.all([
    db.select().from(campaigns).where(where).limit(limit).offset(offset).orderBy(desc(campaigns.createdAt)),
    db.select({ total: count() }).from(campaigns).where(where),
  ]);

  const total = Number(countResult[0]?.total ?? 0);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function updateCampaign(id: string, input: UpdateCampaignInput, allowedBrands: AllowedBrands, userId: string) {
  const existing = await getCampaignById(id, allowedBrands);

  if (existing.status !== "draft") {
    throw new AppError("Only draft campaigns can be updated", 400);
  }

  const [updated] = await db
    .update(campaigns)
    .set({
      ...(input.name && { name: input.name.trim() }),
      ...(input.subject && { subject: input.subject.trim() }),
      ...(input.content && { content: input.content }),
      ...(input.designJson !== undefined && { designJson: input.designJson }),
      ...(input.preheader !== undefined && { preheader: input.preheader?.trim() ?? null }),
    })
    .where(eq(campaigns.id, id))
    .returning();

  await logCampaignAction(id, "updated", { changes: input }, userId);
  return updated;
}

export async function deleteCampaign(id: string, allowedBrands: AllowedBrands, userId: string) {
  const existing = await getCampaignById(id, allowedBrands);

  if (existing.status === "sending") {
    throw new AppError("Cannot delete campaign while it's sending", 400);
  }

  await logCampaignAction(id, "deleted", {}, userId);
  await db.delete(campaigns).where(eq(campaigns.id, id));
}

export async function scheduleCampaign(id: string, input: ScheduleCampaignInput, allowedBrands: AllowedBrands, userId: string) {
  const campaign = await getCampaignById(id, allowedBrands);

  if (campaign.status !== "draft") {
    throw new AppError("Only draft campaigns can be scheduled", 400);
  }

  const scheduledAt = new Date(input.scheduledAt);
  if (scheduledAt <= new Date()) {
    throw new AppError("Scheduled time must be in the future", 400);
  }

  const [updated] = await db
    .update(campaigns)
    .set({ status: "scheduled", scheduledAt })
    .where(eq(campaigns.id, id))
    .returning();

  await logCampaignAction(id, "scheduled", { scheduledAt: input.scheduledAt }, userId);
  return updated;
}

export async function sendCampaignNow(id: string, allowedBrands: AllowedBrands, userId: string) {
  const campaign = await getCampaignById(id, allowedBrands);

  if (campaign.status !== "draft" && campaign.status !== "scheduled") {
    throw new AppError("Campaign cannot be sent in current status", 400);
  }

  const recipientIds = await getCampaignRecipients(campaign);

  if (recipientIds.length === 0) {
    throw new AppError("No recipients found for this campaign", 400);
  }

  const [updated] = await db
    .update(campaigns)
    .set({
      status: "sending",
      scheduledAt: null,
    })
    .where(eq(campaigns.id, id))
    .returning();

  await db.insert(campaignRecipients).values(
    recipientIds.map((subscriberId) => ({
      campaignId: id,
      subscriberId,
      status: "pending",
    }))
  );

  const recipientRecords = await db
    .select({ id: campaignRecipients.id })
    .from(campaignRecipients)
    .where(eq(campaignRecipients.campaignId, id));

  await db.insert(emailJobs).values(
    recipientRecords.map((r) => ({
      campaignId: id,
      recipientId: r.id,
      status: "pending",
      attempts: 0,
      maxAttempts: 3,
    }))
  );

  await logCampaignAction(id, "sending", { recipientCount: recipientIds.length }, userId);

  processCampaignJob(id).catch((err) => console.error("[Campaign] Failed to start processing:", err));

  return { ...updated, recipientCount: recipientIds.length };
}

export async function getCampaignStats(id: string, allowedBrands: AllowedBrands) {
  const campaign = await getCampaignById(id, allowedBrands);

  const stats = await db
    .select({
      total: count(),
      sent: sql<number>`count(*) filter (where ${campaignRecipients.status} = 'sent')`,
      failed: sql<number>`count(*) filter (where ${campaignRecipients.status} = 'failed')`,
      pending: sql<number>`count(*) filter (where ${campaignRecipients.status} = 'pending')`,
      opened: sql<number>`count(*) filter (where ${campaignRecipients.status} in ('opened', 'clicked'))`,
      clicked: sql<number>`count(*) filter (where ${campaignRecipients.status} = 'clicked')`,
    })
    .from(campaignRecipients)
    .where(eq(campaignRecipients.campaignId, id));

  return {
    campaignId: id,
    status: campaign.status,
    totalRecipients: Number(stats[0]?.total ?? 0),
    sent: Number(stats[0]?.sent ?? 0),
    failed: Number(stats[0]?.failed ?? 0),
    pending: Number(stats[0]?.pending ?? 0),
    opened: Number(stats[0]?.opened ?? 0),
    clicked: Number(stats[0]?.clicked ?? 0),
    openRate: stats[0]?.total ? Number(((stats[0].opened / stats[0].total) * 100).toFixed(2)) : 0,
    clickRate: stats[0]?.total ? Number(((stats[0].clicked / stats[0].total) * 100).toFixed(2)) : 0,
  };
}

export async function getCampaignsAnalytics(allowedBrands: AllowedBrands, brand?: Brand) {
  const allowed: Brand[] = allowedBrands ?? ["watpak", "dercolbags"];
  const effectiveBrands = brand
    ? allowed.includes(brand) ? [brand] : []
    : allowed;
  const conditions = [
    inArray(campaigns.status, ["sent", "sending"]),
    inArray(campaigns.brand, effectiveBrands),
  ];

  const rows = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      brand: campaigns.brand,
      subject: campaigns.subject,
      status: campaigns.status,
      sentAt: campaigns.sentAt,
      total: sql<number>`count(${campaignRecipients.id})`,
      sent: sql<number>`count(${campaignRecipients.id}) filter (where ${campaignRecipients.status} = 'sent')`,
      failed: sql<number>`count(${campaignRecipients.id}) filter (where ${campaignRecipients.status} = 'failed')`,
      opened: sql<number>`count(${campaignRecipients.id}) filter (where ${campaignRecipients.status} in ('opened', 'clicked'))`,
      clicked: sql<number>`count(${campaignRecipients.id}) filter (where ${campaignRecipients.status} = 'clicked')`,
    })
    .from(campaigns)
    .leftJoin(campaignRecipients, eq(campaignRecipients.campaignId, campaigns.id))
    .where(and(...conditions))
    .groupBy(campaigns.id)
    .orderBy(desc(campaigns.sentAt));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    brand: r.brand,
    subject: r.subject,
    status: r.status,
    sentAt: r.sentAt,
    totalRecipients: Number(r.total),
    sent: Number(r.sent),
    failed: Number(r.failed),
    opened: Number(r.opened),
    clicked: Number(r.clicked),
    openRate: r.total ? Number(((Number(r.opened) / Number(r.total)) * 100).toFixed(1)) : 0,
    clickRate: r.total ? Number(((Number(r.clicked) / Number(r.total)) * 100).toFixed(1)) : 0,
  }));
}

export async function getCampaignRecipientsList(
  id: string,
  allowedBrands: AllowedBrands,
  statusFilter?: string,
) {
  await getCampaignById(id, allowedBrands);

  const rows = await db
    .select({
      id:           campaignRecipients.id,
      status:       campaignRecipients.status,
      sentAt:       campaignRecipients.sentAt,
      openedAt:     campaignRecipients.openedAt,
      clickedAt:    campaignRecipients.clickedAt,
      errorMessage: campaignRecipients.errorMessage,
      name:         subscribers.name,
      email:        subscribers.email,
    })
    .from(campaignRecipients)
    .innerJoin(subscribers, eq(campaignRecipients.subscriberId, subscribers.id))
    .where(
      statusFilter && statusFilter !== "all"
        ? and(
            eq(campaignRecipients.campaignId, id),
            eq(campaignRecipients.status, statusFilter as "pending" | "sent" | "failed" | "opened" | "clicked"),
          )
        : eq(campaignRecipients.campaignId, id),
    )
    .orderBy(campaignRecipients.updatedAt);

  return rows;
}

export async function sendTestEmail(id: string, allowedBrands: AllowedBrands, toEmail: string) {
  const campaign = await getCampaignById(id, allowedBrands);

  if (!campaign.content || campaign.content.trim().length === 0) {
    throw new AppError("Campaign has no content. Open the campaign editor and save your design first.", 400);
  }

  const { sendEmail, replaceCampaignVariables } = await import("./email.service");
  const { env } = await import("../config/env");

  const brandName = campaign.brand === "watpak" ? "WatPak" : "DercolBags";
  const testUnsubscribeUrl = `${env.FRONTEND_URL}/unsubscribe?token=test-preview`;

  const html = replaceCampaignVariables(campaign.content, {
    brandName,
    unsubscribeUrl: testUnsubscribeUrl,
    subject:   campaign.subject,
    preheader: campaign.preheader ?? undefined,
  });

  console.log(`[TestEmail] Sending test for campaign "${campaign.name}" (${campaign.brand}) to ${toEmail}`);

  try {
    await sendEmail({
      brand:   campaign.brand,
      to:      toEmail,
      subject: `[TEST] ${campaign.subject}`,
      html,
    });
    console.log(`[TestEmail] Sent successfully to ${toEmail}`);
  } catch (err) {
    console.error(`[TestEmail] Failed to send to ${toEmail}:`, err);
    throw new AppError(`Failed to send test email: ${(err as Error).message}`, 500);
  }
}

export async function duplicateCampaign(id: string, allowedBrands: AllowedBrands, userId: string) {
  const original = await getCampaignById(id, allowedBrands);

  const [copy] = await db
    .insert(campaigns)
    .values({
      name:       `Copy of ${original.name}`,
      brand:      original.brand,
      subject:    original.subject,
      content:    original.content,
      preheader:  original.preheader ?? undefined,
      status:     "draft",
      targetType: original.targetType,
      targetId:   original.targetId ?? undefined,
      createdBy:  userId,
    })
    .returning();

  return copy;
}

async function getCampaignRecipients(campaign: Campaign): Promise<string[]> {
  if (campaign.targetType === "all") {
    const result = await db
      .select({ id: subscribers.id })
      .from(subscribers)
      .where(and(eq(subscribers.brand, campaign.brand), eq(subscribers.isSubscribed, true)));
    return result.map((r) => r.id);
  }

  if (campaign.targetType === "list" && campaign.targetId) {
    const result = await db
      .select({ subscriberId: mailingListSubscribers.subscriberId })
      .from(mailingListSubscribers)
      .where(eq(mailingListSubscribers.listId, campaign.targetId));
    return result.map((r) => r.subscriberId);
  }

  if (campaign.targetType === "segment" && campaign.targetId) {
    const [list] = await db.select().from(mailingLists).where(eq(mailingLists.id, campaign.targetId)).limit(1);
    if (!list || !list.isDynamic || !list.filterConfig) return [];

    return getDynamicSegmentSubscriberIds(list.filterConfig, campaign.brand);
  }

  return [];
}

async function getDynamicSegmentSubscriberIds(filterConfig: Record<string, unknown>, brand: Brand): Promise<string[]> {
  const cond: ReturnType<typeof and>[] = [eq(subscribers.brand, brand), eq(subscribers.isSubscribed, true)];

  if (filterConfig.status) cond.push(inArray(subscribers.status, filterConfig.status as Array<"new" | "contacted" | "converted" | "spam">));
  if (filterConfig.location) cond.push(eq(subscribers.location, filterConfig.location as string));

  const result = await db.select({ id: subscribers.id }).from(subscribers).where(and(...cond));
  return result.map((r) => r.id);
}

async function logCampaignAction(campaignId: string, action: string, details: Record<string, unknown>, performedBy: string) {
  await db.insert(campaignLogs).values({
    campaignId,
    action,
    details,
    performedBy,
  });
}

export async function cancelCampaign(id: string, allowedBrands: AllowedBrands, userId: string) {
  const campaign = await getCampaignById(id, allowedBrands);

  if (campaign.status !== "scheduled" && campaign.status !== "sending") {
    throw new AppError("Only scheduled or sending campaigns can be cancelled", 400);
  }

  if (campaign.status === "sending") {
    await db
      .update(emailJobs)
      .set({ status: "failed", lastError: "Campaign cancelled by user" })
      .where(and(eq(emailJobs.campaignId, id), eq(emailJobs.status, "pending")));
  }

  const [updated] = await db
    .update(campaigns)
    .set({ status: "cancelled" })
    .where(eq(campaigns.id, id))
    .returning();

  await logCampaignAction(id, "cancelled", {}, userId);
  return updated;
}