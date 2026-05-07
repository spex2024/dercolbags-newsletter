import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { mailingLists, mailingListSubscribers, subscribers, type SubscriberFilterConfig } from "../db/schema";
import { AppError } from "../utils/errors";
import type { CreateMailingListInput, ListMailingListsQuery, UpdateMailingListInput } from "../validators/mailing-list.schema";
import type { Brand } from "../services/subscribers.service";

type AllowedBrands = Brand[] | null;

const SORTABLE_COLUMNS = {
  name: mailingLists.name,
  createdAt: mailingLists.createdAt,
  brand: mailingLists.brand,
} as const;

export async function createMailingList(input: CreateMailingListInput, createdBy: string) {
  const [list] = await db
    .insert(mailingLists)
    .values({
      name: input.name.trim(),
      brand: input.brand,
      description: input.description?.trim() ?? null,
      isDynamic: input.isDynamic,
      filterConfig: input.filterConfig ?? null,
    })
    .returning();

  if (!list) throw new AppError("Failed to create mailing list", 500);
  return list;
}

export async function getMailingListById(id: string, allowedBrands: AllowedBrands) {
  const [list] = await db.select().from(mailingLists).where(eq(mailingLists.id, id)).limit(1);
  if (!list) throw new AppError("Mailing list not found", 404);

  if (allowedBrands !== null && !allowedBrands.includes(list.brand)) {
    throw new AppError("You do not have access to this mailing list", 403);
  }
  return list;
}

export async function listMailingLists(query: ListMailingListsQuery, allowedBrands: AllowedBrands) {
  const { brand, page, limit } = query;

  if (brand && allowedBrands !== null && !allowedBrands.includes(brand)) {
    throw new AppError("You do not have access to this brand", 403);
  }

  const conditions = [];
  if (brand) {
    conditions.push(eq(mailingLists.brand, brand));
  } else if (allowedBrands !== null) {
    if (allowedBrands.length === 0) {
      return { items: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
    conditions.push(inArray(mailingLists.brand, allowedBrands));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;

  const [rawItems, countResult] = await Promise.all([
    db.select().from(mailingLists).where(where).limit(limit).offset(offset).orderBy(asc(mailingLists.name)),
    db.select({ total: count() }).from(mailingLists).where(where),
  ]);

  const total = Number(countResult[0]?.total ?? 0);

  const subscriberCounts = await db
    .select({
      listId: mailingListSubscribers.listId,
      subscriberCount: count(mailingListSubscribers.subscriberId),
    })
    .from(mailingListSubscribers)
    .where(inArray(mailingListSubscribers.listId, rawItems.map((l) => l.id)))
    .groupBy(mailingListSubscribers.listId);

  const countMap = new Map(subscriberCounts.map((r) => [r.listId, Number(r.subscriberCount)]));

  const items = rawItems.map((l) => ({ ...l, subscriberCount: countMap.get(l.id) ?? 0 }));

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function updateMailingList(id: string, input: UpdateMailingListInput, allowedBrands: AllowedBrands) {
  const existing = await getMailingListById(id, allowedBrands);

  const [updated] = await db
    .update(mailingLists)
    .set({
      ...(input.name && { name: input.name.trim() }),
      ...(input.description !== undefined && { description: input.description?.trim() ?? null }),
      ...(input.isDynamic !== undefined && { isDynamic: input.isDynamic }),
      ...(input.filterConfig !== undefined && { filterConfig: input.filterConfig }),
    })
    .where(eq(mailingLists.id, id))
    .returning();

  return updated;
}

export async function deleteMailingList(id: string, allowedBrands: AllowedBrands) {
  await getMailingListById(id, allowedBrands);
  await db.delete(mailingLists).where(eq(mailingLists.id, id));
}

export async function addSubscribersToList(listId: string, subscriberIds: string[], allowedBrands: AllowedBrands) {
  const list = await getMailingListById(listId, allowedBrands);

  const existingSubscribers = await db
    .select({ id: subscribers.id, brand: subscribers.brand })
    .from(subscribers)
    .where(inArray(subscribers.id, subscriberIds));

  if (allowedBrands !== null) {
    const allowedSet = new Set(allowedBrands);
    const invalidBrand = existingSubscribers.find((s) => !allowedSet.has(s.brand));
    if (invalidBrand) {
      throw new AppError(`Subscriber ${invalidBrand.id} is not accessible with your brand access`, 403);
    }
  }

  const accessibleIds = existingSubscribers.map((s) => s.id);
  if (accessibleIds.length === 0) {
    throw new AppError("No valid subscribers found", 400);
  }

  const currentMembers = await db
    .select({ subscriberId: mailingListSubscribers.subscriberId })
    .from(mailingListSubscribers)
    .where(eq(mailingListSubscribers.listId, listId));

  const existingSet = new Set(currentMembers.map((c) => c.subscriberId));
  const newIds = accessibleIds.filter((id) => !existingSet.has(id));

  if (newIds.length === 0) {
    throw new AppError("All subscribers are already in this list", 409);
  }

  const values = newIds.map((subscriberId) => ({
    listId,
    subscriberId,
  }));

  await db.insert(mailingListSubscribers).values(values).onConflictDoNothing();
  return { added: newIds.length };
}

export async function removeSubscriberFromList(listId: string, subscriberId: string, allowedBrands: AllowedBrands) {
  await getMailingListById(listId, allowedBrands);

  const [member] = await db
    .select()
    .from(mailingListSubscribers)
    .where(and(eq(mailingListSubscribers.listId, listId), eq(mailingListSubscribers.subscriberId, subscriberId)))
    .limit(1);

  if (!member) throw new AppError("Subscriber not found in this list", 404);

  await db
    .delete(mailingListSubscribers)
    .where(and(eq(mailingListSubscribers.listId, listId), eq(mailingListSubscribers.subscriberId, subscriberId)));
}

export async function getListSubscribers(
  listId: string,
  allowedBrands: AllowedBrands,
  params: { page?: number; limit?: number } = {},
) {
  await getMailingListById(listId, allowedBrands);

  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  const [items, countResult] = await Promise.all([
    db
      .select({
        id: subscribers.id,
        brand: subscribers.brand,
        name: subscribers.name,
        email: subscribers.email,
        phone: subscribers.phone,
        location: subscribers.location,
        source: subscribers.source,
        status: subscribers.status,
        isSubscribed: subscribers.isSubscribed,
        unsubscribeToken: subscribers.unsubscribeToken,
        unsubscribedAt: subscribers.unsubscribedAt,
        lastEmailSentAt: subscribers.lastEmailSentAt,
        createdAt: subscribers.createdAt,
        updatedAt: subscribers.updatedAt,
      })
      .from(mailingListSubscribers)
      .innerJoin(subscribers, eq(mailingListSubscribers.subscriberId, subscribers.id))
      .where(eq(mailingListSubscribers.listId, listId))
      .limit(limit)
      .offset(offset)
      .orderBy(asc(subscribers.email)),
    db
      .select({ total: count() })
      .from(mailingListSubscribers)
      .where(eq(mailingListSubscribers.listId, listId)),
  ]);

  const total = Number(countResult[0]?.total ?? 0);
  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function previewDynamicFilter(
  filterConfig: SubscriberFilterConfig,
  allowedBrands: AllowedBrands,
): Promise<{ count: number; sample: Array<{ id: string; name: string | null; email: string }> }> {
  const conditions = buildSubscriberConditions(filterConfig);

  const brandCondition =
    allowedBrands !== null && allowedBrands.length > 0
      ? inArray(subscribers.brand, allowedBrands)
      : undefined;

  const where =
    conditions && brandCondition
      ? and(conditions, brandCondition)
      : conditions ?? brandCondition;

  const [countResult, sample] = await Promise.all([
    db.select({ total: count() }).from(subscribers).where(where),
    db
      .select({ id: subscribers.id, name: subscribers.name, email: subscribers.email })
      .from(subscribers)
      .where(where)
      .limit(5)
      .orderBy(desc(subscribers.createdAt)),
  ]);

  return { count: Number(countResult[0]?.total ?? 0), sample };
}

export async function getListSubscriberCount(listId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(mailingListSubscribers)
    .where(eq(mailingListSubscribers.listId, listId));
  return Number(result[0]?.count ?? 0);
}

export async function getDynamicListSubscribers(listId: string): Promise<string[]> {
  const list = await getMailingListById(listId, null);
  if (!list.isDynamic || !list.filterConfig) return [];

  const conditions = buildSubscriberConditions(list.filterConfig);
  const result = await db
    .select({ id: subscribers.id })
    .from(subscribers)
    .where(conditions);

  return result.map((r) => r.id);
}

function buildSubscriberConditions(config: SubscriberFilterConfig) {
  const cond: ReturnType<typeof and>[] = [];

  if (config.brand) cond.push(eq(subscribers.brand, config.brand));
  if (config.isSubscribed !== undefined) cond.push(eq(subscribers.isSubscribed, config.isSubscribed));
  if (config.location) cond.push(eq(subscribers.location, config.location));
  if (config.status && config.status.length > 0) cond.push(inArray(subscribers.status, config.status));

  if (config.createdAtFrom) {
    cond.push(sql`${subscribers.createdAt} >= ${new Date(config.createdAtFrom)}`);
  }
  if (config.createdAtTo) {
    cond.push(sql`${subscribers.createdAt} <= ${new Date(config.createdAtTo)}`);
  }
  if (config.lastEmailSentAfter) {
    cond.push(sql`${subscribers.lastEmailSentAt} >= ${new Date(config.lastEmailSentAfter)}`);
  }
  if (config.lastEmailSentBefore) {
    cond.push(sql`${subscribers.lastEmailSentAt} <= ${new Date(config.lastEmailSentBefore)}`);
  }

  return and(...cond);
}