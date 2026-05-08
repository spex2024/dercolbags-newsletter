import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useQuery } from "@tanstack/react-query"
import { analyticsApi, type AnalyticsOverview } from "@/services/api/analytics"
import { useBrand } from "@/contexts/BrandContext"
import { useSession } from "@/lib/auth"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Users, Send, MailOpen, MousePointerClick,
  TrendingUp, AlertCircle, CheckCircle2, Zap,
  Building2, User,
} from "lucide-react"
import { format } from "date-fns"

export const Route = createFileRoute("/_authenticated/analytics/")({
  beforeLoad: ({ context }) => requirePageAccess(context, "analytics"),
  component: AnalyticsPage,
})

// ── Utilities ─────────────────────────────────────────────────────────────────

function num(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function HBar({ value, max, accent = "bg-foreground" }: { value: number; max: number; accent?: string }) {
  const w = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="h-1.5 w-full bg-muted overflow-hidden">
      <div className={`h-full transition-all duration-700 ${accent}`} style={{ width: `${w}%` }} />
    </div>
  )
}

function FunnelBar({ label, value, max, sublabel }: { label: string; value: number; max: number; sublabel: string }) {
  const w = max > 0 ? Math.max((value / max) * 100, 0) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{sublabel}</span>
      </div>
      <div className="relative h-8 bg-muted overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-foreground transition-all duration-700" style={{ width: `${w}%` }} />
        <span className="absolute inset-0 flex items-center px-3 text-sm font-black tabular-nums text-background mix-blend-difference">
          {num(value)}
        </span>
      </div>
    </div>
  )
}

// ── Role helpers ──────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner", admin: "Admin",
  marketing_manager: "Marketing", sales_support: "Sales Support",
  manager: "Manager", content_editor: "Content", viewer: "Viewer",
}

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-500", admin: "bg-sky-500",
  marketing_manager: "bg-violet-500", sales_support: "bg-rose-500",
  manager: "bg-emerald-500", content_editor: "bg-indigo-500", viewer: "bg-slate-400",
}

function roleLabel(r: string) { return ROLE_LABELS[r] ?? r.replace(/_/g, " ") }
function roleColor(r: string) { return ROLE_COLORS[r] ?? "bg-muted-foreground" }

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="border-2 border-foreground bg-foreground p-8 space-y-3">
        <Skeleton className="h-3 w-24 bg-background/20" />
        <Skeleton className="h-10 w-48 bg-background/20" />
        <Skeleton className="h-4 w-64 bg-background/20" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border-2 border-foreground p-6 space-y-4">
            <Skeleton className="h-3 w-24" /><Skeleton className="h-10 w-20" /><Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

function AnalyticsPage() {
  const { currentBrand } = useBrand()
  const { data: session } = useSession()
  const navigate = useNavigate()

  const role      = (session?.user as any)?.role as string ?? ""
  const userName  = session?.user?.name ?? "You"

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-overview", currentBrand],
    queryFn: () => analyticsApi.overview(currentBrand),
    staleTime: 60_000,
  })

  if (isLoading) return <PageSkeleton />

  const d = data?.data
  const scope = d?.scope ?? "personal"

  return (
    <div className="space-y-6">

      {/* ── Hero — adapts to scope ─────────────────────────────────────────── */}
      <div className="border-2 border-foreground shadow-[4px_4px_0px_0px_oklch(0.1_0_0)] bg-foreground text-background">
        <div className="px-8 pt-10 pb-6">
          <div className="flex items-center gap-2 mb-2">
            {scope === "company" && <Building2 className="h-4 w-4 text-background/40" />}
            {scope === "team"    && <Users      className="h-4 w-4 text-background/40" />}
            {scope === "personal"&& <User       className="h-4 w-4 text-background/40" />}
            <p className="text-[10px] uppercase tracking-[0.3em] text-background/40">
              {scope === "company" ? "Company Overview" : scope === "team" ? "Team Overview" : "My Performance"}
            </p>
          </div>
          <h1 className="text-5xl font-black tracking-tight">Analytics</h1>
          <p className="mt-2 text-sm text-background/50">
            {scope === "company"
              ? "Full visibility across all brands, departments, and team members"
              : scope === "team"
              ? "Your department's performance — campaigns, engagement, and team activity"
              : `${userName}'s campaigns and email performance`}
          </p>
        </div>

        {/* Inline summary strip */}
        {(() => {
          const stripItems = scope !== "personal"
            ? [
                { label: "Campaigns Sent",     value: num(d?.email?.totalCampaigns ?? 0) },
                { label: "Active Subscribers", value: num(d?.subscribers?.active   ?? 0) },
                { label: "Emails Delivered",   value: num(d?.email?.delivered      ?? 0) },
              ]
            : [
                { label: "My Campaigns", value: num(d?.myStats?.campaigns ?? 0) },
                { label: "Emails Sent",  value: num(d?.myStats?.emails    ?? 0) },
                { label: "Open Rate",    value: `${d?.myStats?.openRate   ?? 0}%` },
              ]
          return (
            <div className="grid grid-cols-3 divide-x divide-background/10 border-t border-background/10">
              {stripItems.map((item) => (
                <div key={item.label} className="px-6 py-4">
                  <p className="text-[10px] uppercase tracking-widest text-background/40 mb-1">{item.label}</p>
                  <p className="text-2xl font-black tabular-nums">{item.value}</p>
                </div>
              ))}
            </div>
          )
        })()}
      </div>

      {/* ── My Stats card (always shown) ──────────────────────────────────── */}
      <MyStatsSection myStats={d?.myStats ?? null} userName={userName} scope={scope} />

      {/* ── Company / Team overview (not personal) ────────────────────────── */}
      {scope !== "personal" && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Active Subscribers", value: `${num(d?.subscribers?.active ?? 0)}`,   sub: `${num(d?.subscribers?.unsubscribed ?? 0)} unsubscribed`,     icon: Users },
              { label: "Emails Sent",         value: `${num(d?.email?.totalSent ?? 0)}`,       sub: `${d?.email?.deliveryRate ?? 0}% delivery rate`,             icon: Send },
              { label: "Open Rate",           value: `${d?.email?.openRate ?? 0}%`,            sub: `${num(d?.email?.opened ?? 0)} opens`,                       icon: MailOpen },
              { label: "Click Rate",          value: `${d?.email?.clickRate ?? 0}%`,           sub: `${num(d?.email?.clicked ?? 0)} clicks`,                     icon: MousePointerClick },
            ].map((stat) => (
              <div key={stat.label} className="border-2 border-foreground shadow-[3px_3px_0px_0px_oklch(0.1_0_0)] p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold">{stat.label}</p>
                  <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <p className="text-4xl font-black tabular-nums leading-none">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* Funnel + Audience */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <EngagementFunnel email={d?.email ?? null} />
            <AudienceHealth   subscribers={d?.subscribers ?? null} />
          </div>

          {/* Growth + Brand split + Delivery (company only) */}
          {scope === "company" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SubscriberGrowth subscribers={d?.subscribers ?? null} />
              <BrandSplit       subscribers={d?.subscribers ?? null} />
              <DeliveryHealth   email={d?.email ?? null} />
            </div>
          )}
        </>
      )}

      {/* ── Team section (team + company) ─────────────────────────────────── */}
      {scope !== "personal" && (
        <TeamSection team={d?.team ?? []} scope={scope} />
      )}

      {/* ── Recent campaigns ──────────────────────────────────────────────── */}
      <RecentCampaigns campaigns={d?.topCampaigns ?? []} scope={scope} onNavigate={(id) => navigate({ to: "/campaigns/$id", params: { id } })} />

    </div>
  )
}

// ── My Stats ──────────────────────────────────────────────────────────────────

function MyStatsSection({
  myStats, userName, scope,
}: {
  myStats: AnalyticsOverview["myStats"]
  userName: string
  scope: string
}) {
  const s = myStats
  return (
    <div className="border-2 border-foreground shadow-[3px_3px_0px_0px_oklch(0.1_0_0)]">
      <div className="bg-foreground text-background px-6 py-4 flex items-center gap-2">
        <User className="h-3.5 w-3.5 text-background/60" />
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold">
          {scope === "personal" ? "My Performance" : `${userName}'s Contribution`}
        </p>
      </div>
      <div className="grid grid-cols-2 divide-x sm:grid-cols-4 divide-y sm:divide-y-0">
        {[
          { label: "Campaigns Created", value: s?.campaigns ?? 0 },
          { label: "Campaigns Sent",    value: s?.sent      ?? 0 },
          { label: "Open Rate",         value: `${s?.openRate  ?? 0}%` },
          { label: "Click Rate",        value: `${s?.clickRate ?? 0}%` },
        ].map((stat) => (
          <div key={stat.label} className="px-6 py-6 text-center">
            <p className="text-4xl font-black tabular-nums leading-none">
              {typeof stat.value === "number" ? num(stat.value) : stat.value}
            </p>
            <p className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
      {(s?.emails ?? 0) > 0 && (
        <div className="border-t px-6 py-3 flex items-center gap-6 text-[11px] text-muted-foreground">
          <span>{num(s?.emails ?? 0)} emails sent</span>
          <span>{num(s?.opened ?? 0)} opens</span>
          <span>{num(s?.clicked ?? 0)} clicks</span>
        </div>
      )}
    </div>
  )
}

// ── Engagement Funnel ─────────────────────────────────────────────────────────

function EngagementFunnel({ email }: { email: AnalyticsOverview["email"] }) {
  const sent = email?.totalSent ?? 0
  return (
    <div className="border-2 border-foreground shadow-[3px_3px_0px_0px_oklch(0.1_0_0)]">
      <div className="bg-foreground text-background px-6 py-4 flex items-center gap-2">
        <Zap className="h-3.5 w-3.5 text-background/60" />
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold">Engagement Funnel</p>
      </div>
      <div className="p-6 space-y-4">
        <FunnelBar label="Sent"      value={sent}                    max={sent} sublabel="100%" />
        <FunnelBar label="Delivered" value={email?.delivered ?? 0}   max={sent} sublabel={`${email?.deliveryRate ?? 0}%`} />
        <FunnelBar label="Opened"    value={email?.opened    ?? 0}   max={sent} sublabel={`${email?.openRate    ?? 0}%`} />
        <FunnelBar label="Clicked"   value={email?.clicked   ?? 0}   max={sent} sublabel={`${email?.clickRate   ?? 0}%`} />
      </div>
    </div>
  )
}

// ── Audience Health ───────────────────────────────────────────────────────────

function AudienceHealth({ subscribers: s }: { subscribers: AnalyticsOverview["subscribers"] }) {
  const total = s?.total ?? 1
  return (
    <div className="border-2 border-foreground shadow-[3px_3px_0px_0px_oklch(0.1_0_0)]">
      <div className="bg-foreground text-background px-6 py-4 flex items-center gap-2">
        <Users className="h-3.5 w-3.5 text-background/60" />
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold">Audience Health</p>
      </div>
      <div className="p-6 space-y-5">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-3">Status</p>
          <div className="space-y-3">
            {[
              { label: "New",       value: s?.byStatus.new       ?? 0 },
              { label: "Contacted", value: s?.byStatus.contacted ?? 0 },
              { label: "Converted", value: s?.byStatus.converted ?? 0 },
              { label: "Spam",      value: s?.byStatus.spam      ?? 0, accent: "bg-destructive" },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{row.label}</span>
                <div className="flex-1"><HBar value={row.value} max={total} accent={row.accent} /></div>
                <span className="w-10 text-right text-[11px] font-semibold tabular-nums">
                  {total > 0 ? ((row.value / total) * 100).toFixed(1) : 0}%
                </span>
                <span className="w-10 text-right text-[11px] text-muted-foreground tabular-nums">{num(row.value)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t pt-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-3">Subscription</p>
          <div className="space-y-3">
            {[
              { label: "Active",       value: s?.active       ?? 0 },
              { label: "Unsubscribed", value: s?.unsubscribed ?? 0, accent: "bg-muted-foreground" },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{row.label}</span>
                <div className="flex-1"><HBar value={row.value} max={total} accent={row.accent} /></div>
                <span className="w-10 text-right text-[11px] font-semibold tabular-nums">
                  {total > 0 ? ((row.value / total) * 100).toFixed(1) : 0}%
                </span>
                <span className="w-10 text-right text-[11px] text-muted-foreground tabular-nums">{num(row.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Subscriber Growth ─────────────────────────────────────────────────────────

function SubscriberGrowth({ subscribers: s }: { subscribers: AnalyticsOverview["subscribers"] }) {
  const monthly = s?.newThisMonth ?? 1
  return (
    <div className="border-2 border-foreground shadow-[3px_3px_0px_0px_oklch(0.1_0_0)] p-6">
      <div className="flex items-center gap-2 mb-5">
        <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">New Subscribers</p>
      </div>
      <div className="divide-y">
        {[
          { label: "Today",      value: s?.newToday     ?? 0, max: monthly },
          { label: "This Week",  value: s?.newThisWeek  ?? 0, max: monthly },
          { label: "This Month", value: s?.newThisMonth ?? 0, max: monthly },
        ].map((row) => (
          <div key={row.label} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{row.label}</span>
              <span className="text-xl font-black tabular-nums">+{num(row.value)}</span>
            </div>
            <HBar value={row.value} max={row.max || 1} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Brand Split ───────────────────────────────────────────────────────────────

function BrandSplit({ subscribers: s }: { subscribers: AnalyticsOverview["subscribers"] }) {
  const total = s?.total ?? 0
  return (
    <div className="border-2 border-foreground shadow-[3px_3px_0px_0px_oklch(0.1_0_0)] p-6">
      <div className="flex items-center gap-2 mb-5">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Brand Split</p>
      </div>
      <div className="space-y-5">
        {[
          { label: "DercolBags", value: s?.byBrand.dercolbags ?? 0 },
          { label: "WatPak",     value: s?.byBrand.watpak     ?? 0 },
        ].map((b) => {
          const p = total > 0 ? ((b.value / total) * 100).toFixed(1) : "0.0"
          return (
            <div key={b.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{b.label}</span>
                <span className="text-sm font-black tabular-nums">{p}%</span>
              </div>
              <div className="h-3 bg-muted overflow-hidden">
                <div className="h-full bg-foreground" style={{ width: `${p}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{num(b.value)} subscribers</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Delivery Health ───────────────────────────────────────────────────────────

function DeliveryHealth({ email: e }: { email: AnalyticsOverview["email"] }) {
  const sent = e?.totalSent ?? 0
  return (
    <div className="border-2 border-foreground shadow-[3px_3px_0px_0px_oklch(0.1_0_0)] p-6">
      <div className="flex items-center gap-2 mb-5">
        <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Delivery Health</p>
      </div>
      <div className="divide-y">
        {[
          { label: "Delivered", value: e?.deliveryRate ?? 0, count: e?.delivered ?? 0, icon: CheckCircle2, ok: true },
          {
            label: "Failed",
            value: sent > 0 ? Number((((e?.failed ?? 0) / sent) * 100).toFixed(1)) : 0,
            count: e?.failed ?? 0, icon: AlertCircle, ok: false,
          },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <div className="flex items-center gap-2">
              <row.icon className={`h-3.5 w-3.5 ${row.ok ? "text-foreground" : "text-destructive"}`} />
              <span className="text-xs text-muted-foreground uppercase tracking-widest">{row.label}</span>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-black tabular-nums ${!row.ok && row.value > 0 ? "text-destructive" : ""}`}>
                {row.value}%
              </p>
              <p className="text-[10px] text-muted-foreground tabular-nums">{num(row.count)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Team Section ──────────────────────────────────────────────────────────────

function TeamSection({ team, scope }: { team: AnalyticsOverview["team"]; scope: string }) {
  const pct = (n: number, d: number) => d > 0 ? Number(((n / d) * 100).toFixed(1)) : 0

  const byDept = team.reduce<Record<string, { users: number; campaigns: number; emails: number; opened: number; clicked: number }>>(
    (acc, m) => {
      if (!acc[m.role]) acc[m.role] = { users: 0, campaigns: 0, emails: 0, opened: 0, clicked: 0 }
      acc[m.role].users++; acc[m.role].campaigns += m.campaigns
      acc[m.role].emails += m.emails; acc[m.role].opened += m.opened; acc[m.role].clicked += m.clicked
      return acc
    }, {})

  return (
    <div className="border-2 border-foreground shadow-[4px_4px_0px_0px_oklch(0.1_0_0)]">
      <div className="bg-foreground text-background px-6 py-4 flex items-center gap-2">
        <Building2 className="h-3.5 w-3.5 text-background/60" />
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold">
          {scope === "company" ? "Company Team" : "Department"}
        </p>
        <span className="ml-auto text-[10px] text-background/40">{team.length} member{team.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Department cards */}
      {scope === "company" && (
        <div className="p-6 border-b">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-4">By Department</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(byDept).map(([role, s]) => (
              <div key={role} className="border border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${roleColor(role)}`} />
                  <span className="text-xs font-bold uppercase tracking-wider">{roleLabel(role)}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{s.users} member{s.users !== 1 ? "s" : ""}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center">
                  {[
                    { label: "Campaigns", value: String(s.campaigns) },
                    { label: "Open",      value: `${pct(s.opened, s.emails)}%` },
                    { label: "Click",     value: `${pct(s.clicked, s.emails)}%` },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <p className="text-xl font-black tabular-nums">{stat.value}</p>
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Individual rows */}
      <div className="p-6">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-4">Members</p>
        <div className="overflow-x-auto">
          <div className="grid grid-cols-12 gap-4 pb-2 border-b min-w-[560px]">
            {["Member", "Role", "Campaigns", "Open Rate", "Click Rate"].map((h, i) => (
              <span key={h} className={`text-[10px] uppercase tracking-widest text-muted-foreground font-bold ${i === 0 ? "col-span-4" : i === 1 ? "col-span-2" : "col-span-2"}`}>{h}</span>
            ))}
          </div>
          <div className="divide-y min-w-[560px]">
            {team.map((m) => {
              const initials = m.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
              return (
                <div key={m.userId} className="grid grid-cols-12 gap-4 py-3.5 items-center">
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    <div className={`h-8 w-8 shrink-0 flex items-center justify-center text-[11px] font-black text-white ${roleColor(m.role)}`}>{initials}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{m.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{roleLabel(m.role)}</span>
                  </div>
                  <div className="col-span-2 text-center">
                    <p className="text-sm font-black tabular-nums">{m.campaigns}</p>
                    <p className="text-[10px] text-muted-foreground">{m.sent} sent</p>
                  </div>
                  <div className="col-span-2">
                    {m.emails > 0 ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1 bg-muted overflow-hidden"><div className="h-full bg-foreground" style={{ width: `${m.openRate}%` }} /></div>
                          <span className="text-xs font-black tabular-nums">{m.openRate}%</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{num(m.opened)} opens</p>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                  <div className="col-span-2">
                    {m.emails > 0 ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1 bg-muted overflow-hidden"><div className="h-full bg-foreground" style={{ width: `${m.clickRate}%` }} /></div>
                          <span className="text-xs font-black tabular-nums">{m.clickRate}%</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{num(m.clicked)} clicks</p>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Recent Campaigns ──────────────────────────────────────────────────────────

function RecentCampaigns({
  campaigns, scope, onNavigate,
}: {
  campaigns: AnalyticsOverview["topCampaigns"]
  scope: string
  onNavigate: (id: string) => void
}) {
  return (
    <div className="border-2 border-foreground shadow-[4px_4px_0px_0px_oklch(0.1_0_0)]">
      <div className="bg-foreground text-background px-6 py-4 flex items-center gap-2">
        <Send className="h-3.5 w-3.5 text-background/60" />
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold">
          {scope === "personal" ? "My Recent Campaigns" : "Recent Campaigns"}
        </p>
      </div>
      <div className="divide-y">
        {campaigns.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">No sent campaigns yet</p>
        ) : (
          <>
            <div className="px-6 py-2 grid grid-cols-12 gap-4 bg-muted/30">
              <span className="col-span-4 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Campaign</span>
              <span className="col-span-2 text-[10px] uppercase tracking-widest text-muted-foreground font-bold hidden sm:block">Sent</span>
              <span className="col-span-2 text-[10px] uppercase tracking-widest text-muted-foreground font-bold text-right">Recipients</span>
              <span className="col-span-2 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Open Rate</span>
              <span className="col-span-2 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Click Rate</span>
            </div>
            {campaigns.map((c) => (
              <button
                key={c.id}
                className="w-full px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-muted/20 transition-colors text-left"
                onClick={() => onNavigate(c.id)}
              >
                <div className="col-span-4 min-w-0">
                  <p className="font-semibold text-sm truncate">{c.name}</p>
                </div>
                <div className="col-span-2 hidden sm:block">
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {c.sentAt ? format(new Date(c.sentAt), "MMM d, yyyy") : "—"}
                  </p>
                </div>
                <div className="col-span-2 text-right">
                  <p className="text-sm font-semibold tabular-nums">{num(c.total)}</p>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted hidden md:block"><div className="h-full bg-foreground" style={{ width: `${c.openRate}%` }} /></div>
                    <span className="text-sm font-black tabular-nums">{c.openRate}%</span>
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted hidden md:block"><div className="h-full bg-foreground" style={{ width: `${c.clickRate}%` }} /></div>
                    <span className="text-sm font-black tabular-nums">{c.clickRate}%</span>
                  </div>
                </div>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
