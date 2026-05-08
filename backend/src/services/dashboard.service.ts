import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { subscribers, campaigns, campaignRecipients, user } from "../db/schema";

type Brand = "watpak" | "dercolbags";
type AllowedBrands = Brand[] | null;

export type DashboardScope = "company" | "team" | "personal";

const COMPANY_ROLES = ["owner", "admin"];
const MANAGER_ROLES = ["marketing_manager", "manager"];

export function resolveScope(role: string): DashboardScope {
  if (COMPANY_ROLES.includes(role)) return "company";
  if (MANAGER_ROLES.includes(role)) return "team";
  return "personal";
}

function brands(allowedBrands: AllowedBrands, brand?: Brand): Brand[] {
  const allowed: Brand[] = allowedBrands ?? ["watpak", "dercolbags"];
  if (brand) return allowed.includes(brand) ? [brand] : [];
  return allowed;
}

const pct = (n: number, d: number) =>
  d > 0 ? Number(((n / d) * 100).toFixed(1)) : 0;

export async function getDashboardOverview(
  allowedBrands: AllowedBrands,
  userId: string,
  userRole: string,
  brand?: Brand,
) {
  const bl     = brands(allowedBrands, brand);
  const scope  = resolveScope(userRole);
  const isComp = scope === "company";
  const isTeam = scope === "team";

  // Campaign filter: personal = own only, team/company = all in brand
  const campaignWhere = scope === "personal"
    ? and(inArray(campaigns.brand, bl), eq(campaigns.createdBy, userId))
    : inArray(campaigns.brand, bl);

  const [
    myStats,
    subStats,
    campaignStats,
    emailStats,
    teamMembers,
    recentCampaigns,
    recentSubs,
  ] = await Promise.all([

    // ── Personal stats (always) ───────────────────────────────────────────────
    db.select({
      campaigns: sql<number>`count(distinct ${campaigns.id})::int`,
      sent:      sql<number>`count(distinct case when ${campaigns.status} = 'sent' then ${campaigns.id} end)::int`,
      emails:    sql<number>`count(${campaignRecipients.id})::int`,
      opened:    sql<number>`count(${campaignRecipients.id}) filter (where ${campaignRecipients.status} in ('opened','clicked'))::int`,
      clicked:   sql<number>`count(${campaignRecipients.id}) filter (where ${campaignRecipients.status} = 'clicked')::int`,
    })
    .from(campaigns)
    .leftJoin(campaignRecipients, eq(campaignRecipients.campaignId, campaigns.id))
    .where(and(inArray(campaigns.brand, bl), eq(campaigns.createdBy, userId))),

    // ── Subscriber stats (company only) ───────────────────────────────────────
    isComp
      ? db.select({
          total:        sql<number>`count(*)::int`,
          active:       sql<number>`count(*) filter (where ${subscribers.isSubscribed} = true)::int`,
          unsubscribed: sql<number>`count(*) filter (where ${subscribers.isSubscribed} = false)::int`,
          contacted:    sql<number>`count(*) filter (where ${subscribers.status} = 'contacted')::int`,
          converted:    sql<number>`count(*) filter (where ${subscribers.status} = 'converted')::int`,
          newToday:     sql<number>`count(*) filter (where ${subscribers.createdAt} >= current_date)::int`,
          newThisWeek:  sql<number>`count(*) filter (where ${subscribers.createdAt} >= current_date - interval '7 days')::int`,
          newThisMonth: sql<number>`count(*) filter (where ${subscribers.createdAt} >= current_date - interval '30 days')::int`,
        })
        .from(subscribers)
        .where(inArray(subscribers.brand, bl))
      : Promise.resolve([null]),

    // ── Campaign pipeline counts (company + team) ────────────────────────────
    !scope || isComp || isTeam
      ? db.select({
          total:     sql<number>`count(*)::int`,
          draft:     sql<number>`count(*) filter (where ${campaigns.status} = 'draft')::int`,
          scheduled: sql<number>`count(*) filter (where ${campaigns.status} = 'scheduled')::int`,
          sending:   sql<number>`count(*) filter (where ${campaigns.status} = 'sending')::int`,
          sent:      sql<number>`count(*) filter (where ${campaigns.status} = 'sent')::int`,
          cancelled: sql<number>`count(*) filter (where ${campaigns.status} = 'cancelled')::int`,
        })
        .from(campaigns)
        .where(inArray(campaigns.brand, bl))
      : Promise.resolve([null]),

    // ── Email performance ─────────────────────────────────────────────────────
    db.select({
      totalSent: sql<number>`count(${campaignRecipients.id})::int`,
      delivered: sql<number>`count(${campaignRecipients.id}) filter (where ${campaignRecipients.status} not in ('failed','pending'))::int`,
      failed:    sql<number>`count(${campaignRecipients.id}) filter (where ${campaignRecipients.status} = 'failed')::int`,
      opened:    sql<number>`count(${campaignRecipients.id}) filter (where ${campaignRecipients.status} in ('opened','clicked'))::int`,
      clicked:   sql<number>`count(${campaignRecipients.id}) filter (where ${campaignRecipients.status} = 'clicked')::int`,
    })
    .from(campaigns)
    .leftJoin(campaignRecipients, eq(campaignRecipients.campaignId, campaigns.id))
    .where(campaignWhere),

    // ── Team members (company + team) ─────────────────────────────────────────
    isComp || isTeam
      ? db.select({
          userId:   user.id,
          name:     user.name,
          role:     user.role,
          campaigns: sql<number>`count(distinct ${campaigns.id})::int`,
          sent:      sql<number>`count(distinct case when ${campaigns.status} = 'sent' then ${campaigns.id} end)::int`,
          emails:    sql<number>`count(${campaignRecipients.id})::int`,
          opened:    sql<number>`count(${campaignRecipients.id}) filter (where ${campaignRecipients.status} in ('opened','clicked'))::int`,
          clicked:   sql<number>`count(${campaignRecipients.id}) filter (where ${campaignRecipients.status} = 'clicked')::int`,
        })
        .from(user)
        .leftJoin(
          campaigns,
          and(eq(campaigns.createdBy, user.id), inArray(campaigns.brand, bl))
        )
        .leftJoin(campaignRecipients, eq(campaignRecipients.campaignId, campaigns.id))
        .where(notInArray(user.role, COMPANY_ROLES))
        .groupBy(user.id, user.name, user.role)
        .orderBy(desc(sql`count(distinct ${campaigns.id})`))
        .limit(6)
      : Promise.resolve([]),

    // ── Recent campaigns ──────────────────────────────────────────────────────
    db.select({
      id:        campaigns.id,
      name:      campaigns.name,
      subject:   campaigns.subject,
      status:    campaigns.status,
      sentAt:    campaigns.sentAt,
      createdAt: campaigns.createdAt,
    })
    .from(campaigns)
    .where(campaignWhere)
    .orderBy(desc(campaigns.createdAt))
    .limit(6),

    // ── Recent subscribers (company only) ────────────────────────────────────
    isComp
      ? db.select({
          id:           subscribers.id,
          name:         subscribers.name,
          email:        subscribers.email,
          isSubscribed: subscribers.isSubscribed,
          createdAt:    subscribers.createdAt,
        })
        .from(subscribers)
        .where(inArray(subscribers.brand, bl))
        .orderBy(desc(subscribers.createdAt))
        .limit(6)
      : Promise.resolve([]),
  ]);

  const my = myStats[0];
  const s  = Array.isArray(subStats)      ? subStats[0]      : null;
  const c  = Array.isArray(campaignStats) ? campaignStats[0] : null;
  const e  = emailStats[0];

  return {
    scope,
    myStats: {
      campaigns: Number(my?.campaigns ?? 0),
      sent:      Number(my?.sent      ?? 0),
      emails:    Number(my?.emails    ?? 0),
      opened:    Number(my?.opened    ?? 0),
      clicked:   Number(my?.clicked   ?? 0),
      openRate:  pct(Number(my?.opened  ?? 0), Number(my?.emails ?? 0)),
      clickRate: pct(Number(my?.clicked ?? 0), Number(my?.emails ?? 0)),
    },
    subscribers: s ? {
      total:        Number(s.total        ?? 0),
      active:       Number(s.active       ?? 0),
      unsubscribed: Number(s.unsubscribed ?? 0),
      contacted:    Number(s.contacted    ?? 0),
      converted:    Number(s.converted    ?? 0),
      newToday:     Number(s.newToday     ?? 0),
      newThisWeek:  Number(s.newThisWeek  ?? 0),
      newThisMonth: Number(s.newThisMonth ?? 0),
    } : null,
    campaigns: c ? {
      total:     Number(c.total     ?? 0),
      draft:     Number(c.draft     ?? 0),
      scheduled: Number(c.scheduled ?? 0),
      sending:   Number(c.sending   ?? 0),
      sent:      Number(c.sent      ?? 0),
      cancelled: Number(c.cancelled ?? 0),
    } : null,
    email: {
      totalSent:    Number(e?.totalSent ?? 0),
      delivered:    Number(e?.delivered ?? 0),
      failed:       Number(e?.failed    ?? 0),
      opened:       Number(e?.opened    ?? 0),
      clicked:      Number(e?.clicked   ?? 0),
      openRate:     pct(Number(e?.opened   ?? 0), Number(e?.totalSent ?? 0)),
      clickRate:    pct(Number(e?.clicked  ?? 0), Number(e?.totalSent ?? 0)),
      deliveryRate: pct(Number(e?.delivered ?? 0), Number(e?.totalSent ?? 0)),
    },
    teamMembers: (teamMembers as any[]).map((m) => ({
      userId:    m.userId,
      name:      m.name,
      role:      m.role ?? "unknown",
      campaigns: Number(m.campaigns),
      sent:      Number(m.sent),
      openRate:  pct(Number(m.opened), Number(m.emails)),
      clickRate: pct(Number(m.clicked), Number(m.emails)),
    })),
    recentCampaigns,
    recentSubscribers: recentSubs as any[],
  };
}
