import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { subscribers, campaigns, campaignRecipients, user } from "../db/schema";

type Brand    = "watpak" | "dercolbags";
type AllowedBrands = Brand[] | null;
export type Scope = "company" | "team" | "personal";

const COMPANY_ROLES = ["owner", "admin"];
const MANAGER_ROLES = ["marketing_manager", "manager"];

export function resolveScope(role: string): Scope {
  if (COMPANY_ROLES.includes(role)) return "company";
  if (MANAGER_ROLES.includes(role)) return "team";
  return "personal";
}

const pct = (n: number, d: number) =>
  d > 0 ? Number(((n / d) * 100).toFixed(1)) : 0;

export async function getAnalyticsOverview(
  allowedBrands: AllowedBrands,
  userId: string,
  userRole: string,
  brand?: Brand,
) {
  const allowed: Brand[]  = allowedBrands ?? ["watpak", "dercolbags"];
  const brandList: Brand[] = brand
    ? allowed.includes(brand) ? [brand] : []
    : allowed;

  const scope = resolveScope(userRole);

  const [subStats, emailStats, topCampaigns, sourceStats, teamStats, myStats] =
    await Promise.all([

      // ── Subscriber aggregate (company/team only) ────────────────────────────
      scope !== "personal"
        ? db.select({
            total:           sql<number>`count(*)::int`,
            active:          sql<number>`count(*) filter (where ${subscribers.isSubscribed} = true)::int`,
            unsubscribed:    sql<number>`count(*) filter (where ${subscribers.isSubscribed} = false)::int`,
            statusNew:       sql<number>`count(*) filter (where ${subscribers.status} = 'new')::int`,
            statusContacted: sql<number>`count(*) filter (where ${subscribers.status} = 'contacted')::int`,
            statusConverted: sql<number>`count(*) filter (where ${subscribers.status} = 'converted')::int`,
            statusSpam:      sql<number>`count(*) filter (where ${subscribers.status} = 'spam')::int`,
            watpak:          sql<number>`count(*) filter (where ${subscribers.brand} = 'watpak')::int`,
            dercolbags:      sql<number>`count(*) filter (where ${subscribers.brand} = 'dercolbags')::int`,
            newToday:        sql<number>`count(*) filter (where ${subscribers.createdAt} >= current_date)::int`,
            newThisWeek:     sql<number>`count(*) filter (where ${subscribers.createdAt} >= current_date - interval '7 days')::int`,
            newThisMonth:    sql<number>`count(*) filter (where ${subscribers.createdAt} >= current_date - interval '30 days')::int`,
          })
          .from(subscribers)
          .where(inArray(subscribers.brand, brandList))
        : Promise.resolve([null]),

      // ── Email aggregate (company/team only) ────────────────────────────────
      scope !== "personal"
        ? db.select({
            totalCampaigns: sql<number>`count(distinct ${campaigns.id})::int`,
            totalEmails:    sql<number>`count(${campaignRecipients.id})::int`,
            delivered:      sql<number>`count(${campaignRecipients.id}) filter (where ${campaignRecipients.status} not in ('failed','pending'))::int`,
            failed:         sql<number>`count(${campaignRecipients.id}) filter (where ${campaignRecipients.status} = 'failed')::int`,
            opened:         sql<number>`count(${campaignRecipients.id}) filter (where ${campaignRecipients.status} in ('opened','clicked'))::int`,
            clicked:        sql<number>`count(${campaignRecipients.id}) filter (where ${campaignRecipients.status} = 'clicked')::int`,
          })
          .from(campaigns)
          .leftJoin(campaignRecipients, eq(campaignRecipients.campaignId, campaigns.id))
          .where(and(
            inArray(campaigns.brand, brandList),
            inArray(campaigns.status, ["sent", "sending"]),
          ))
        : Promise.resolve([null]),

      // ── Top 5 recent campaigns ─────────────────────────────────────────────
      db.select({
          id:      campaigns.id,
          name:    campaigns.name,
          sentAt:  campaigns.sentAt,
          total:   sql<number>`count(${campaignRecipients.id})::int`,
          opened:  sql<number>`count(${campaignRecipients.id}) filter (where ${campaignRecipients.status} in ('opened','clicked'))::int`,
          clicked: sql<number>`count(${campaignRecipients.id}) filter (where ${campaignRecipients.status} = 'clicked')::int`,
        })
        .from(campaigns)
        .leftJoin(campaignRecipients, eq(campaignRecipients.campaignId, campaigns.id))
        .where(and(
          inArray(campaigns.brand, brandList),
          eq(campaigns.status, "sent"),
          // personal scope: only own campaigns
          ...(scope === "personal" ? [eq(campaigns.createdBy, userId)] : []),
        ))
        .groupBy(campaigns.id)
        .orderBy(desc(campaigns.sentAt))
        .limit(5),

      // ── Subscriber sources (company/team only) ─────────────────────────────
      scope !== "personal"
        ? db.select({
            source: subscribers.source,
            count:  sql<number>`count(*)::int`,
          })
          .from(subscribers)
          .where(inArray(subscribers.brand, brandList))
          .groupBy(subscribers.source)
          .orderBy(sql`count(*) desc`)
          .limit(6)
        : Promise.resolve([]),

      // ── Team stats: per-user campaign metrics ──────────────────────────────
      db.select({
          userId:    user.id,
          userName:  user.name,
          userEmail: user.email,
          userRole:  user.role,
          campaigns: sql<number>`count(distinct ${campaigns.id})::int`,
          sent:      sql<number>`count(distinct case when ${campaigns.status} = 'sent' then ${campaigns.id} end)::int`,
          emails:    sql<number>`count(${campaignRecipients.id})::int`,
          opened:    sql<number>`count(${campaignRecipients.id}) filter (where ${campaignRecipients.status} in ('opened','clicked'))::int`,
          clicked:   sql<number>`count(${campaignRecipients.id}) filter (where ${campaignRecipients.status} = 'clicked')::int`,
        })
        .from(user)
        .leftJoin(
          campaigns,
          and(
            eq(campaigns.createdBy, user.id),
            inArray(campaigns.brand, brandList),
          )
        )
        .leftJoin(campaignRecipients, eq(campaignRecipients.campaignId, campaigns.id))
        .where(
          // company: all users
          // team: exclude company-level roles (show only the team)
          // personal: only the requesting user
          scope === "company"
            ? sql`true`
            : scope === "team"
            ? notInArray(user.role, COMPANY_ROLES)
            : eq(user.id, userId)
        )
        .groupBy(user.id, user.name, user.email, user.role)
        .orderBy(desc(sql`count(distinct ${campaigns.id})`)),

      // ── Personal stats: campaigns created by this user ────────────────────
      db.select({
          campaigns: sql<number>`count(distinct ${campaigns.id})::int`,
          sent:      sql<number>`count(distinct case when ${campaigns.status} = 'sent' then ${campaigns.id} end)::int`,
          emails:    sql<number>`count(${campaignRecipients.id})::int`,
          opened:    sql<number>`count(${campaignRecipients.id}) filter (where ${campaignRecipients.status} in ('opened','clicked'))::int`,
          clicked:   sql<number>`count(${campaignRecipients.id}) filter (where ${campaignRecipients.status} = 'clicked')::int`,
        })
        .from(campaigns)
        .leftJoin(campaignRecipients, eq(campaignRecipients.campaignId, campaigns.id))
        .where(and(
          inArray(campaigns.brand, brandList),
          eq(campaigns.createdBy, userId),
        )),
    ]);

  const sub   = Array.isArray(subStats)   ? subStats[0]   : null;
  const email = Array.isArray(emailStats) ? emailStats[0] : null;
  const my    = Array.isArray(myStats)    ? myStats[0]    : null;

  return {
    scope,
    subscribers: sub ? {
      total:        Number(sub.total        ?? 0),
      active:       Number(sub.active       ?? 0),
      unsubscribed: Number(sub.unsubscribed ?? 0),
      newToday:     Number(sub.newToday     ?? 0),
      newThisWeek:  Number(sub.newThisWeek  ?? 0),
      newThisMonth: Number(sub.newThisMonth ?? 0),
      byBrand: {
        watpak:     Number(sub.watpak     ?? 0),
        dercolbags: Number(sub.dercolbags ?? 0),
      },
      byStatus: {
        new:       Number(sub.statusNew       ?? 0),
        contacted: Number(sub.statusContacted ?? 0),
        converted: Number(sub.statusConverted ?? 0),
        spam:      Number(sub.statusSpam      ?? 0),
      },
      sources: (sourceStats as any[]).map((s) => ({ source: s.source, count: Number(s.count) })),
    } : null,
    email: email ? {
      totalCampaigns: Number(email.totalCampaigns ?? 0),
      totalSent:      Number(email.totalEmails    ?? 0),
      delivered:      Number(email.delivered      ?? 0),
      failed:         Number(email.failed         ?? 0),
      opened:         Number(email.opened         ?? 0),
      clicked:        Number(email.clicked        ?? 0),
      deliveryRate: pct(Number(email.delivered ?? 0), Number(email.totalEmails ?? 0)),
      openRate:     pct(Number(email.opened    ?? 0), Number(email.totalEmails ?? 0)),
      clickRate:    pct(Number(email.clicked   ?? 0), Number(email.totalEmails ?? 0)),
    } : null,
    topCampaigns: (topCampaigns as any[]).map((c) => ({
      id:        c.id,
      name:      c.name,
      sentAt:    c.sentAt,
      total:     Number(c.total),
      opened:    Number(c.opened),
      clicked:   Number(c.clicked),
      openRate:  pct(Number(c.opened),  Number(c.total)),
      clickRate: pct(Number(c.clicked), Number(c.total)),
    })),
    team: (teamStats as any[]).map((m) => ({
      userId:    m.userId,
      name:      m.userName,
      email:     m.userEmail,
      role:      m.userRole ?? "unknown",
      campaigns: Number(m.campaigns),
      sent:      Number(m.sent),
      emails:    Number(m.emails),
      opened:    Number(m.opened),
      clicked:   Number(m.clicked),
      openRate:  pct(Number(m.opened),  Number(m.emails)),
      clickRate: pct(Number(m.clicked), Number(m.emails)),
    })),
    myStats: my ? {
      campaigns: Number(my.campaigns),
      sent:      Number(my.sent),
      emails:    Number(my.emails),
      opened:    Number(my.opened),
      clicked:   Number(my.clicked),
      openRate:  pct(Number(my.opened),  Number(my.emails)),
      clickRate: pct(Number(my.clicked), Number(my.emails)),
    } : null,
  };
}
