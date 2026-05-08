import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useQuery } from "@tanstack/react-query"
import { campaignsApi } from "@/services/api/campaigns"
import { useBrand } from "@/contexts/BrandContext"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, MailOpen, MousePointerClick, Send, Users } from "lucide-react"
import { format } from "date-fns"

export const Route = createFileRoute("/_authenticated/campaigns/analytics")({
  beforeLoad: ({ context }) => requirePageAccess(context, "campaigns"),
  component: CampaignsAnalyticsPage,
})

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number
  icon: React.ElementType
}) {
  return (
    <div className="border-2 border-foreground shadow-[3px_3px_0px_0px_oklch(0.1_0_0)] p-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">{label}</p>
      </div>
      <p className="text-4xl font-black tabular-nums">{value}</p>
    </div>
  )
}

function RateBar({ value }: { value: number }) {
  const pct = Math.min(value, 100)
  return (
    <div className="flex items-center gap-2.5 min-w-[120px]">
      <div className="h-2 flex-1 bg-foreground/10 overflow-hidden">
        <div className="h-full bg-foreground transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular-nums text-sm font-bold w-10 text-right shrink-0">{value}%</span>
    </div>
  )
}

function CampaignsAnalyticsPage() {
  const navigate = useNavigate()
  const { currentBrand } = useBrand()

  const { data, isLoading } = useQuery({
    queryKey: ["campaigns-analytics", currentBrand],
    queryFn: () => campaignsApi.getAnalytics(currentBrand),
  })

  const campaigns = data?.data ?? []

  const totalRecipients = campaigns.reduce((s, c) => s + c.totalRecipients, 0)
  const avgOpenRate =
    campaigns.length > 0
      ? Number((campaigns.reduce((s, c) => s + c.openRate, 0) / campaigns.length).toFixed(1))
      : 0
  const avgClickRate =
    campaigns.length > 0
      ? Number((campaigns.reduce((s, c) => s + c.clickRate, 0) / campaigns.length).toFixed(1))
      : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-6 border-b-2">
        <div>
          <button
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-3 uppercase tracking-widest"
            onClick={() => navigate({ to: "/campaigns" })}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Campaigns
          </button>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1">Outreach</p>
          <h1 className="text-4xl font-black tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Open and click performance across all sent campaigns
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Campaigns" value={isLoading ? "—" : campaigns.length} icon={Send} />
        <StatCard label="Total Recipients" value={isLoading ? "—" : totalRecipients.toLocaleString()} icon={Users} />
        <StatCard label="Avg Open Rate" value={isLoading ? "—" : `${avgOpenRate}%`} icon={MailOpen} />
        <StatCard label="Avg Click Rate" value={isLoading ? "—" : `${avgClickRate}%`} icon={MousePointerClick} />
      </div>

      {/* Table */}
      <div className="border-2 border-foreground shadow-[4px_4px_0px_0px_oklch(0.1_0_0)]">
        <Table>
          <TableHeader>
            <TableRow className="bg-foreground hover:bg-foreground border-b-2 border-foreground">
              <TableHead className="text-background text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto">
                Campaign
              </TableHead>
              <TableHead className="hidden sm:table-cell text-background text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto">
                Sent
              </TableHead>
              <TableHead className="text-background text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto text-right">
                Recipients
              </TableHead>
              <TableHead className="hidden md:table-cell text-background text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto text-right">
                Delivered
              </TableHead>
              <TableHead className="text-background text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto">
                Open Rate
              </TableHead>
              <TableHead className="text-background text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto">
                Click Rate
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-40 mb-1" />
                    <Skeleton className="h-3 w-28" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                  <TableCell className="hidden md:table-cell text-right"><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                </TableRow>
              ))
            ) : campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <Send className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm font-semibold">No sent campaigns yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Analytics appear once a campaign has been sent</p>
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => navigate({ to: "/campaigns/$id", params: { id: c.id } })}
                >
                  <TableCell className="py-4">
                    <p className="font-semibold text-sm leading-snug">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate max-w-[200px] mt-0.5">{c.subject}</p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground tabular-nums">
                    {c.sentAt ? format(new Date(c.sentAt), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-sm">
                    {c.totalRecipients.toLocaleString()}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-right tabular-nums text-sm text-muted-foreground">
                    {c.sent.toLocaleString()}
                  </TableCell>
                  <TableCell className="py-4">
                    <RateBar value={c.openRate} />
                  </TableCell>
                  <TableCell className="py-4">
                    <RateBar value={c.clickRate} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
