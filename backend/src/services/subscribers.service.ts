import { and, asc, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "../db/client";
import { subscribers } from "../db/schema";
import { AppError } from "../utils/errors";
import { generateUnsubscribeToken } from "../utils/token";
import { sendSubscriptionConfirmation } from "./email.service";
import type { CreateSubscriberInput, ListSubscribersQuery, UpdateStatusInput } from "../validators/subscribers.schema";

type Brand = "watpak" | "dercolbags";

// null = unrestricted (owner/admin), array = scoped brands
type AllowedBrands = Brand[] | null;

const SORTABLE_COLUMNS = {
  createdAt: subscribers.createdAt,
  email: subscribers.email,
  name: subscribers.name,
  status: subscribers.status,
  brand: subscribers.brand,
} as const;

export async function createSubscriber(input: CreateSubscriberInput) {
  const normalizedEmail = input.email.toLowerCase().trim();

  const existing = await db
    .select({ id: subscribers.id })
    .from(subscribers)
    .where(and(eq(subscribers.brand, input.brand), eq(subscribers.email, normalizedEmail)))
    .limit(1);

  if (existing.length > 0) {
    throw new AppError("This email is already subscribed for this brand", 409);
  }

  const unsubscribeToken = generateUnsubscribeToken();

  const [subscriber] = await db
    .insert(subscribers)
    .values({
      brand: input.brand,
      name: input.name ?? null,
      email: normalizedEmail,
      phone: input.phone ?? null,
      location: input.location ?? null,
      source: input.source ?? "landing_page",
      unsubscribeToken,
    })
    .returning();

  if (!subscriber) throw new AppError("Failed to create subscriber", 500);

  sendSubscriptionConfirmation({
    brand: subscriber.brand,
    name: subscriber.name,
    email: subscriber.email,
    unsubscribeToken: subscriber.unsubscribeToken,
    subscriberId: subscriber.id,
  }).catch((err: unknown) =>
    console.error("[Email] Failed to send confirmation:", err)
  );

  return subscriber;
}

export async function unsubscribe(token: string) {
  const [subscriber] = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.unsubscribeToken, token))
    .limit(1);

  if (!subscriber) throw new AppError("Invalid or expired unsubscribe token", 404);
  if (!subscriber.isSubscribed) return subscriber;

  const [updated] = await db
    .update(subscribers)
    .set({ isSubscribed: false, unsubscribedAt: new Date(), unsubscribeReason: 'manual' })
    .where(eq(subscribers.id, subscriber.id))
    .returning();

  return updated;
}

export async function listSubscribers(
  query: ListSubscribersQuery,
  allowedBrands: AllowedBrands
) {
  const { brand, search, status, isSubscribed, unsubscribeReason, page, limit, sortBy, sortOrder } = query;

  // Brand access check
  if (brand && allowedBrands !== null && !allowedBrands.includes(brand as Brand)) {
    throw new AppError("You do not have access to this brand", 403);
  }

  const conditions = [];

  if (brand) {
    conditions.push(eq(subscribers.brand, brand as Brand));
  } else if (allowedBrands !== null) {
    if (allowedBrands.length === 0) {
      return { items: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
    conditions.push(inArray(subscribers.brand, allowedBrands));
  }

  if (status) conditions.push(eq(subscribers.status, status));
  if (isSubscribed !== undefined) conditions.push(eq(subscribers.isSubscribed, isSubscribed));
  if (unsubscribeReason) conditions.push(eq(subscribers.unsubscribeReason, unsubscribeReason));
  if (search) {
    conditions.push(
      or(ilike(subscribers.email, `%${search}%`), ilike(subscribers.name, `%${search}%`))!
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;
  const orderColumn = SORTABLE_COLUMNS[sortBy] ?? subscribers.createdAt;
  const orderFn = sortOrder === "asc" ? asc(orderColumn) : desc(orderColumn);

  const [items, countResult] = await Promise.all([
    db.select().from(subscribers).where(where).limit(limit).offset(offset).orderBy(orderFn),
    db.select({ total: count() }).from(subscribers).where(where),
  ]);

  const total = Number(countResult[0]?.total ?? 0);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getSubscriberById(id: string, allowedBrands: AllowedBrands) {
  const [subscriber] = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.id, id))
    .limit(1);

  if (!subscriber) throw new AppError("Subscriber not found", 404);

  if (allowedBrands !== null && !allowedBrands.includes(subscriber.brand)) {
    throw new AppError("You do not have access to this subscriber", 403);
  }

  return subscriber;
}

export async function updateSubscriberStatus(
  id: string,
  status: UpdateStatusInput["status"],
  allowedBrands: AllowedBrands
) {
  const [existing] = await db
    .select({ id: subscribers.id, brand: subscribers.brand })
    .from(subscribers)
    .where(eq(subscribers.id, id))
    .limit(1);

  if (!existing) throw new AppError("Subscriber not found", 404);

  if (allowedBrands !== null && !allowedBrands.includes(existing.brand)) {
    throw new AppError("You do not have access to this subscriber", 403);
  }

  const [updated] = await db
    .update(subscribers)
    .set({ status })
    .where(eq(subscribers.id, id))
    .returning();

  return updated;
}

export async function deleteSubscriber(id: string, allowedBrands: AllowedBrands) {
  const [existing] = await db
    .select({ id: subscribers.id, brand: subscribers.brand })
    .from(subscribers)
    .where(eq(subscribers.id, id))
    .limit(1);

  if (!existing) throw new AppError("Subscriber not found", 404);

  if (allowedBrands !== null && !allowedBrands.includes(existing.brand)) {
    throw new AppError("You do not have access to this subscriber", 403);
  }

  await db.delete(subscribers).where(eq(subscribers.id, id));
}

export async function anonymiseSubscriber(id: string) {
  const [sub] = await db.select().from(subscribers).where(eq(subscribers.id, id)).limit(1);
  if (!sub) throw new AppError('Subscriber not found', 404);
  if (!sub.anonymisedAt) {
    await db.update(subscribers).set({
      name: null,
      phone: null,
      location: null,
      anonymisedAt: new Date(),
      isSubscribed: false,
      unsubscribeReason: 'admin',
      unsubscribedAt: sub.unsubscribedAt ?? new Date(),
    }).where(eq(subscribers.id, id));
  }
  const [updated] = await db.select().from(subscribers).where(eq(subscribers.id, id)).limit(1);
  return updated;
}
