import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useQuery } from "@tanstack/react-query"
import { dashboardApi, type DashboardOverview, type DashboardScope } from "@/services/api/dashboard"
import { useBrand } from "@/contexts/BrandContext"
import { useSession } from "@/lib/auth"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Users, Mail, MailOpen, MousePointerClick, ArrowRight,
  FileText, Clock, Send, X, Loader2, TrendingUp,
  CheckCircle2, Building2, User, Sun, AlertCircle,
} from "lucide-react"
import { format } from "date-fns"

export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: ({ context }) => requirePageAccess(context, "dashboard"),
  component: DashboardPage,
})

// ── Utilities ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function HBar({ value, max, accent = "bg-foreground" }: { value: number; max: number; accent?: string }) {
  const w = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="h-1.5 w-full bg-muted overflow-hidden rounded-sm">
      <div className={`h-full rounded-sm transition-all duration-700 ${accent}`} style={{ width: `${w}%` }} />
    </div>
  )
}

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-500", admin: "bg-sky-500",
  marketing_manager: "bg-violet-500", sales_support: "bg-rose-500",
  manager: "bg-emerald-500", content_editor: "bg-indigo-500", viewer: "bg-slate-400",
}
const ROLE_LABELS: Record<string, string> = {
  owner: "Owner", admin: "Admin",
  marketing_manager: "Marketing", sales_support: "Sales Support",
  manager: "Manager", content_editor: "Content", viewer: "Viewer",
}
function roleColor(r: string) { return ROLE_COLORS[r] ?? "bg-muted-foreground" }
function roleLabel(r: string) { return ROLE_LABELS[r] ?? r.replace(/_/g, " ") }

function greeting(name: string) {
  const h = new Date().getHours()
  const salut = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
  return `${salut}, ${name.split(" ")[0]}`
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon }: { label: string; value: string; sub: string; icon: React.ElementType }) {
  return (
    <div className="border-2 border-foreground shadow-[3px_3px_0px_0px_oklch(0.1_0_0)] p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold">{label}</p>
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </div>
      <p className="text-4xl font-black tabular-nums leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  )
}

function Panel({ title, icon: Icon, onViewAll, children }: {
  title: string; icon: React.ElementType; onViewAll?: () => void; children: React.ReactNode
}) {
  return (
    <div className="border-2 border-foreground shadow-[3px_3px_0px_0px_oklch(0.1_0_0)]">
      <div className="flex items-center justify-between bg-foreground text-background px-5 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-background/50" />
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold">{title}</p>
        </div>
        {onViewAll && (
          <button
            className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-background/50 hover:text-background transition-colors"
            onClick={onViewAll}
          >
            View all <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function CampaignStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft:     "border-border text-muted-foreground",
    scheduled: "border-foreground/40 text-foreground",
    sending:   "border-foreground text-foreground",
    sent:      "border-foreground bg-foreground text-background",
    cancelled: "border-destructive/40 text-destructive",
  }
  return (
    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 border ${styles[status] ?? "border-border text-muted-foreground"}`}>
      {status}
    </span>
  )
}

// ── Campaign pipeline ─────────────────────────────────────────────────────────

function CampaignPipeline({ campaigns }: { campaigns: NonNullable<DashboardOverview["campaigns"]> }) {
  const PIPELINE = [
    { key: "draft"     as const, label: "Draft",     icon: FileText, accent: "bg-muted-foreground",  style: "text-muted-foreground" },
    { key: "scheduled" as const, label: "Scheduled", icon: Clock,    accent: "bg-foreground",         style: "text-foreground" },
    { key: "sending"   as const, label: "Sending",   icon: Loader2,  accent: "bg-foreground",         style: "text-foreground", spin: true },
    { key: "sent"      as const, label: "Sent",      icon: Send,     accent: "bg-foreground",         style: "text-foreground" },
    { key: "cancelled" as const, label: "Cancelled", icon: X,        accent: "bg-destructive",        style: "text-destructive" },
  ]
  return (
    <div className="border-2 border-foreground shadow-[3px_3px_0px_0px_oklch(0.1_0_0)]">
      <div className="bg-foreground text-background px-6 py-3 flex items-center gap-2">
        <Mail className="h-3.5 w-3.5 text-background/50" />
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold">Campaign Pipeline</p>
        <span className="ml-auto text-[10px] text-background/40 tabular-nums">{campaigns.total} total</span>
      </div>
      <div className="grid grid-cols-5 divide-x divide-border">
        {PIPELINE.map(({ key, label, icon: Icon, accent, style, spin }) => {
          const count = campaigns[key]
          const w = campaigns.total > 0 ? ((count / campaigns.total) * 100).toFixed(0) : 0
          return (
            <div key={key} className="px-4 py-5 flex flex-col gap-3">
              <div className="flex items-center gap-1.5">
                <Icon className={`h-3.5 w-3.5 shrink-0 ${spin ? "animate-spin" : ""} ${style}`} />
                <span className={`text-[10px] uppercase tracking-widest font-bold hidden sm:block ${style}`}>{label}</span>
              </div>
              <p className="text-3xl font-black tabular-nums leading-none">{count}</p>
              <div className="space-y-1">
                <HBar value={count} max={campaigns.total} accent={accent} />
                <p className="text-[10px] text-muted-foreground tabular-nums">{w}%</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Email performance panel ───────────────────────────────────────────────────

function EmailPerformance({ email, title = "Email Performance" }: { email: DashboardOverview["email"]; title?: string }) {
  return (
    <Panel title={title} icon={MailOpen}>
      <div className="p-6 space-y-5">
        {email.totalSent === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No emails sent yet</p>
        ) : (
          <>
            {[
              { label: "Delivery Rate", value: email.deliveryRate, count: email.delivered, icon: CheckCircle2 },
              { label: "Open Rate",     value: email.openRate,     count: email.opened,    icon: MailOpen },
              { label: "Click Rate",    value: email.clickRate,    count: email.clicked,   icon: MousePointerClick },
            ].map((row) => (
              <div key={row.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <row.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{row.label}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black tabular-nums">{row.value}%</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{fmt(row.count)}</span>
                  </div>
                </div>
                <HBar value={row.value} max={100} />
              </div>
            ))}
            <div className="border-t pt-4 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{fmt(email.totalSent)} total sent</span>
              {email.failed > 0 && <span className="text-destructive">{fmt(email.failed)} failed</span>}
            </div>
          </>
        )}
      </div>
    </Panel>
  )
}

// ── Recent campaigns list ─────────────────────────────────────────────────────

function RecentCampaigns({ campaigns, onNavigate, onViewAll }: {
  campaigns: DashboardOverview["recentCampaigns"]
  onNavigate: (id: string) => void
  onViewAll: () => void
}) {
  return (
    <Panel title="Recent Campaigns" icon={Mail} onViewAll={onViewAll}>
      {campaigns.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">No campaigns yet</p>
      ) : (
        <div className="divide-y">
          {campaigns.map((c) => (
            <button
              key={c.id}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 transition-colors text-left"
              onClick={() => onNavigate(c.id)}
            >
              <div className="min-w-0 flex-1 mr-3">
                <p className="text-sm font-semibold truncate">{c.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{c.subject}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[10px] text-muted-foreground tabular-nums hidden sm:block">
                  {format(new Date(c.createdAt), "MMM d")}
                </span>
                <CampaignStatusBadge status={c.status} />
              </div>
            </button>
          ))}
        </div>
      )}
    </Panel>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="border-2 border-foreground bg-foreground p-8 space-y-3">
        <Skeleton className="h-3 w-20 bg-background/20" />
        <Skeleton className="h-10 w-56 bg-background/20" />
        <Skeleton className="h-4 w-40 bg-background/20" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border-2 border-foreground p-6 space-y-4">
            <Skeleton className="h-3 w-24" /><Skeleton className="h-10 w-20" /><Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="border-2 border-foreground">
            <div className="bg-foreground px-5 py-3"><Skeleton className="h-3 w-32 bg-background/20" /></div>
            <div className="p-6 space-y-4">{Array.from({ length: 3 }).map((_, j) => <Skeleton key={j} className="h-8 w-full" />)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Scope views
// ─────────────────────────────────────────────────────────────────────────────

// ── PERSONAL view ─────────────────────────────────────────────────────────────

function PersonalView({ d, name, navigate }: { d: DashboardOverview; name: string; navigate: ReturnType<typeof useNavigate> }) {
  const my = d.myStats
  const today = format(new Date(), "EEEE, MMMM d")

  return (
    <div className="space-y-6">

      {/* Greeting hero */}
      <div className="border-2 border-foreground shadow-[4px_4px_0px_0px_oklch(0.1_0_0)] bg-foreground text-background">
        <div className="px-8 pt-8 pb-6">
          <div className="flex items-center gap-2 mb-2">
            <Sun className="h-4 w-4 text-background/40" />
            <p className="text-[10px] uppercase tracking-[0.3em] text-background/40">{today}</p>
          </div>
          <h1 className="text-4xl font-black tracking-tight">{greeting(name)}</h1>
          <p className="mt-1.5 text-sm text-background/50">Here's how your campaigns are performing.</p>
        </div>
        {/* Personal stat strip */}
        <div className="grid grid-cols-4 divide-x divide-background/10 border-t border-background/10">
          {[
            { label: "Campaigns",  value: String(my.campaigns) },
            { label: "Sent",       value: String(my.sent) },
            { label: "Open Rate",  value: my.emails > 0 ? `${my.openRate}%`  : "—" },
            { label: "Click Rate", value: my.emails > 0 ? `${my.clickRate}%` : "—" },
          ].map((item) => (
            <div key={item.label} className="px-5 py-4 text-center">
              <p className="text-2xl font-black tabular-nums">{item.value}</p>
              <p className="text-[10px] uppercase tracking-widest text-background/40 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="My Campaigns"   value={String(my.campaigns)} sub={`${my.sent} sent`}                                             icon={Mail} />
        <KpiCard label="Emails Sent"    value={fmt(my.emails)}       sub={`${fmt(my.delivered ?? 0)} delivered`}                         icon={Send} />
        <KpiCard label="Open Rate"      value={my.emails > 0 ? `${my.openRate}%` : "—"}    sub={`${fmt(my.opened)} opens`}              icon={MailOpen} />
        <KpiCard label="Click Rate"     value={my.emails > 0 ? `${my.clickRate}%` : "—"}   sub={`${fmt(my.clicked)} clicks`}            icon={MousePointerClick} />
      </div>

      {/* Email perf + Recent campaigns */}
      <div className="grid gap-4 lg:grid-cols-2">
        <EmailPerformance email={d.email} title="My Email Performance" />
        <RecentCampaigns
          campaigns={d.recentCampaigns}
          onNavigate={(id) => navigate({ to: "/campaigns/$id", params: { id } })}
          onViewAll={() => navigate({ to: "/campaigns" })}
        />
      </div>
    </div>
  )
}

// ── TEAM view ─────────────────────────────────────────────────────────────────

function TeamView({ d, name, navigate }: { d: DashboardOverview; name: string; navigate: ReturnType<typeof useNavigate> }) {
  const my = d.myStats
  const today = format(new Date(), "EEEE, MMMM d")

  return (
    <div className="space-y-6">

      {/* Hero */}
      <div className="border-2 border-foreground shadow-[4px_4px_0px_0px_oklch(0.1_0_0)] bg-foreground text-background">
        <div className="px-8 pt-8 pb-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-background/40" />
              <p className="text-[10px] uppercase tracking-[0.3em] text-background/40">Team Overview · {today}</p>
            </div>
            <h1 className="text-4xl font-black tracking-tight">Dashboard</h1>
            <p className="mt-1.5 text-sm text-background/50">Your department's campaign activity and performance.</p>
          </div>
          {/* Personal contribution chip */}
          <div className="shrink-0 border border-background/20 px-4 py-3 text-right">
            <p className="text-[10px] uppercase tracking-widest text-background/40 mb-1">My contribution</p>
            <p className="text-sm font-black tabular-nums">{my.campaigns} campaign{my.campaigns !== 1 ? "s" : ""}</p>
            <p className="text-[10px] text-background/50 tabular-nums mt-0.5">
              {my.emails > 0 ? `${my.openRate}% open · ${my.clickRate}% click` : "No emails sent"}
            </p>
          </div>
        </div>
        {/* Team stat strip */}
        <div className="grid grid-cols-4 divide-x divide-background/10 border-t border-background/10">
          {[
            { label: "Team Campaigns",  value: fmt(d.campaigns?.total ?? 0) },
            { label: "Emails Sent",     value: fmt(d.email.totalSent) },
            { label: "Open Rate",       value: d.email.totalSent > 0 ? `${d.email.openRate}%`  : "—" },
            { label: "Click Rate",      value: d.email.totalSent > 0 ? `${d.email.clickRate}%` : "—" },
          ].map((item) => (
            <div key={item.label} className="px-5 py-4 text-center">
              <p className="text-2xl font-black tabular-nums">{item.value}</p>
              <p className="text-[10px] uppercase tracking-widest text-background/40 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline */}
      {d.campaigns && <CampaignPipeline campaigns={d.campaigns} />}

      {/* Email perf + Team members */}
      <div className="grid gap-4 lg:grid-cols-2">
        <EmailPerformance email={d.email} title="Team Email Performance" />

        <Panel title="Team Members" icon={Users}>
          {d.teamMembers.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">No team members found</p>
          ) : (
            <div className="divide-y">
              {d.teamMembers.map((m) => {
                const initials = m.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
                return (
                  <div key={m.userId} className="flex items-center gap-4 px-5 py-3.5">
                    <div className={`h-8 w-8 shrink-0 flex items-center justify-center text-[11px] font-black text-white ${roleColor(m.role)}`}>
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{roleLabel(m.role)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black tabular-nums">{m.campaigns} sent</p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        {m.campaigns > 0 ? `${m.openRate}% open` : "—"}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* Recent campaigns */}
      <RecentCampaigns
        campaigns={d.recentCampaigns}
        onNavigate={(id) => navigate({ to: "/campaigns/$id", params: { id } })}
        onViewAll={() => navigate({ to: "/campaigns" })}
      />
    </div>
  )
}

// ── COMPANY view ──────────────────────────────────────────────────────────────

function CompanyView({ d, navigate, brand }: { d: DashboardOverview; navigate: ReturnType<typeof useNavigate>; brand: string }) {
  const sub  = d.subscribers
  const today = format(new Date(), "EEEE, MMMM d")

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between border-b-2 pb-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1">
            {brand?.toUpperCase()} · Company Overview
          </p>
          <h1 className="text-4xl font-black tracking-tight">Dashboard</h1>
        </div>
        <p className="text-xs text-muted-foreground hidden sm:block">{today}</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Active Subscribers" value={fmt(sub?.active ?? 0)}
          sub={`${fmt(sub?.total ?? 0)} total · ${fmt(sub?.unsubscribed ?? 0)} unsub`} icon={Users} />
        <KpiCard label="Campaigns Sent" value={fmt(d.campaigns?.sent ?? 0)}
          sub={`${fmt(d.campaigns?.total ?? 0)} total · ${fmt(d.campaigns?.draft ?? 0)} drafts`} icon={Mail} />
        <KpiCard label="Open Rate" value={d.email.totalSent > 0 ? `${d.email.openRate}%` : "—"}
          sub={d.email.totalSent > 0 ? `${fmt(d.email.opened)} opens` : "No campaigns sent yet"} icon={MailOpen} />
        <KpiCard label="Click Rate" value={d.email.totalSent > 0 ? `${d.email.clickRate}%` : "—"}
          sub={d.email.totalSent > 0 ? `${fmt(d.email.clicked)} clicks · ${d.email.deliveryRate}% delivered` : "No campaigns sent yet"} icon={MousePointerClick} />
      </div>

      {/* Pipeline */}
      {d.campaigns && <CampaignPipeline campaigns={d.campaigns} />}

      {/* Email perf + Subscriber growth */}
      <div className="grid gap-4 lg:grid-cols-2">
        <EmailPerformance email={d.email} />

        <Panel title="Subscriber Growth" icon={TrendingUp}>
          <div className="p-6 space-y-5">
            {[
              { label: "New Today",      value: sub?.newToday    ?? 0, max: sub?.newThisMonth || 1 },
              { label: "New This Week",  value: sub?.newThisWeek ?? 0, max: sub?.newThisMonth || 1 },
              { label: "New This Month", value: sub?.newThisMonth ?? 0, max: sub?.newThisMonth || 1 },
            ].map((row) => (
              <div key={row.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{row.label}</span>
                  <span className="text-xl font-black tabular-nums">+{fmt(row.value)}</span>
                </div>
                <HBar value={row.value} max={row.max} />
              </div>
            ))}
            <div className="border-t pt-4 grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Active",    value: sub?.active    ?? 0 },
                { label: "Contacted", value: sub?.contacted ?? 0 },
                { label: "Converted", value: sub?.converted ?? 0 },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-lg font-black tabular-nums">{fmt(s.value)}</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* Team performance + Recent campaigns */}
      <div className="grid gap-4 lg:grid-cols-2">

        <Panel title="Team Performance" icon={Building2}>
          {d.teamMembers.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">No team data</p>
          ) : (
            <div className="divide-y">
              {d.teamMembers.map((m) => {
                const initials = m.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
                return (
                  <div key={m.userId} className="flex items-center gap-4 px-5 py-3.5">
                    <div className={`h-8 w-8 shrink-0 flex items-center justify-center text-[11px] font-black text-white ${roleColor(m.role)}`}>
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{roleLabel(m.role)}</p>
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      <p className="text-sm font-black tabular-nums">{m.sent} sent</p>
                      <div className="flex items-center gap-2 justify-end">
                        {m.sent > 0 && (
                          <>
                            <div className="w-16 h-1 bg-muted overflow-hidden">
                              <div className="h-full bg-foreground" style={{ width: `${m.openRate}%` }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{m.openRate}%</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>

        <RecentCampaigns
          campaigns={d.recentCampaigns}
          onNavigate={(id) => navigate({ to: "/campaigns/$id", params: { id } })}
          onViewAll={() => navigate({ to: "/campaigns" })}
        />
      </div>

      {/* Recent subscribers */}
      {d.recentSubscribers.length > 0 && (
        <Panel title="Recent Subscribers" icon={Users} onViewAll={() => navigate({ to: "/subscribers" })}>
          <div className="divide-y">
            {d.recentSubscribers.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-sm font-semibold truncate">{s.name || s.email}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{s.email}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] text-muted-foreground tabular-nums hidden sm:block">
                    {format(new Date(s.createdAt), "MMM d")}
                  </span>
                  <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 border ${
                    s.isSubscribed
                      ? "border-foreground/20 bg-foreground/5 text-foreground"
                      : "border-destructive/20 bg-destructive/5 text-destructive"
                  }`}>
                    {s.isSubscribed ? "active" : "unsub"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Root page — picks which view to render
// ─────────────────────────────────────────────────────────────────────────────

function DashboardPage() {
  const { currentBrand } = useBrand()
  const { data: session } = useSession()
  const navigate = useNavigate()

  const userName = session?.user?.name ?? "there"

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-overview", currentBrand],
    queryFn: () => dashboardApi.overview(currentBrand),
    staleTime: 60_000,
  })

  if (isLoading) return <DashboardSkeleton />

  const d = data?.data
  if (!d) return null

  const scope: DashboardScope = d.scope

  if (scope === "personal") return <PersonalView d={d} name={userName} navigate={navigate} />
  if (scope === "team")     return <TeamView     d={d} name={userName} navigate={navigate} />
  return                           <CompanyView  d={d} navigate={navigate} brand={currentBrand} />
}
