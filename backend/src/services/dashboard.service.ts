import { desc, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { subscribers } from "../db/schema";

type Brand = "watpak" | "dercolbags";
type AllowedBrands = Brand[] | null;

function buildBrandFilter(allowedBrands: AllowedBrands) {
  if (allowedBrands === null) return undefined;
  if (allowedBrands.length === 0) return sql`false`;
  return inArray(subscribers.brand, allowedBrands);
}

export async function getDashboardOverview(allowedBrands: AllowedBrands) {
  const showWatpak = allowedBrands === null || allowedBrands.includes("watpak");
  const showDercolbags = allowedBrands === null || allowedBrands.includes("dercolbags");
  const brandFilter = buildBrandFilter(allowedBrands);

  const [stats] = await db
    .select({
      totalSubscribers: sql<number>`count(*)::int`,
      watpakSubscribers: showWatpak
        ? sql<number>`count(*) filter (where ${subscribers.brand} = 'watpak')::int`
        : sql<number>`0`,
      dercolbagsSubscribers: showDercolbags
        ? sql<number>`count(*) filter (where ${subscribers.brand} = 'dercolbags')::int`
        : sql<number>`0`,
      newToday: sql<number>`count(*) filter (where ${subscribers.createdAt} >= current_date)::int`,
      contacted: sql<number>`count(*) filter (where ${subscribers.status} = 'contacted')::int`,
      converted: sql<number>`count(*) filter (where ${subscribers.status} = 'converted')::int`,
      unsubscribed: sql<number>`count(*) filter (where ${subscribers.isSubscribed} = false)::int`,
    })
    .from(subscribers)
    .where(brandFilter);

  return stats;
}

export async function getRecentSubscribers(allowedBrands: AllowedBrands) {
  const brandFilter = buildBrandFilter(allowedBrands);

  return db
    .select()
    .from(subscribers)
    .where(brandFilter)
    .orderBy(desc(subscribers.createdAt))
    .limit(10);
}
