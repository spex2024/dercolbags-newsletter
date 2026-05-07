import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useBrand } from "@/contexts/BrandContext"
import { subscribersApi } from "@/services/api/subscribers"
import { campaignsApi } from "@/services/api/campaigns"
import { Users, Mail, BarChart3, TrendingUp, ArrowRight } from "lucide-react"
import { format } from "date-fns"

export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: ({ context }) => requirePageAccess(context, "dashboard"),
  component: DashboardPage,
})

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-secondary text-secondary-foreground",
  scheduled: "bg-foreground text-background",
  sending: "bg-foreground text-background",
  sent: "bg-foreground text-background",
  cancelled: "bg-destructive text-white",
}

function DashboardPage() {
  const { currentBrand } = useBrand()
  const navigate = useNavigate()

  const { data: subscribersData, isLoading: subscribersLoading } = useQuery({
    queryKey: ["subscribers", currentBrand, "dashboard"],
    queryFn: () => subscribersApi.list({ brand: currentBrand, limit: 6 }),
  })

  const { data: campaignsData, isLoading: campaignsLoading } = useQuery({
    queryKey: ["campaigns", currentBrand, "dashboard"],
    queryFn: () => campaignsApi.list({ brand: currentBrand, limit: 6 }),
  })

  const isLoading = subscribersLoading || campaignsLoading

  const totalSubscribers = subscribersData?.data?.pagination?.total ?? 0
  const activeSubscribers = subscribersData?.data?.items?.filter((s) => s.isSubscribed).length ?? 0
  const totalCampaigns = campaignsData?.data?.pagination?.total ?? 0
  const sentCampaigns = campaignsData?.data?.items?.filter((c) => c.status === "sent").length ?? 0

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Header skeleton */}
        <div>
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-10 w-48" />
        </div>

        {/* Stat bar skeleton */}
        <div className="border-2 grid grid-cols-2 lg:grid-cols-4 divide-x-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-6 py-8 space-y-3">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-12 w-20" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          ))}
        </div>

        {/* Activity skeleton */}
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="border-2">
              <div className="border-b-2 px-6 py-4">
                <Skeleton className="h-3 w-36" />
              </div>
              <div className="divide-y">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="flex items-center justify-between px-6 py-4">
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-36" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-5 w-14" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* Page header */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1">
          {currentBrand ? currentBrand.toUpperCase() : "Overview"}
        </p>
        <h1 className="text-4xl font-black tracking-tight">Dashboard</h1>
      </div>

      {/* Stat block */}
      <div className="border-2 border-foreground shadow-[6px_6px_0px_0px_oklch(0.1_0_0)] grid grid-cols-2 lg:grid-cols-4 divide-x-2 divide-foreground">
        {[
          {
            label: "Total Subscribers",
            value: totalSubscribers.toLocaleString(),
            sub: `${activeSubscribers} active`,
            icon: Users,
          },
          {
            label: "Total Campaigns",
            value: totalCampaigns.toLocaleString(),
            sub: `${sentCampaigns} sent`,
            icon: Mail,
          },
          {
            label: "Open Rate",
            value: "—",
            sub: "No data yet",
            icon: BarChart3,
          },
          {
            label: "Click Rate",
            value: "—",
            sub: "No data yet",
            icon: TrendingUp,
          },
        ].map((stat) => (
          <div key={stat.label} className="px-6 py-8 group">
            <div className="flex items-center gap-2 mb-4">
              <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {stat.label}
              </p>
            </div>
            <p className="text-5xl font-black tabular-nums leading-none tracking-tight">
              {stat.value}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Recent Subscribers */}
        <div className="border-2 border-foreground shadow-md">
          <div className="flex items-center justify-between border-b-2 border-foreground px-6 py-3 bg-foreground">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-background">
              Recent Subscribers
            </p>
            <button
              className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-background/60 hover:text-background transition-colors"
              onClick={() => navigate({ to: "/subscribers" })}
            >
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {!subscribersData?.data?.items?.length ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">No subscribers yet</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => navigate({ to: "/subscribers/new" })}
              >
                Add first subscriber
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {subscribersData.data.items.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {sub.name || sub.email}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {sub.email}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(sub.createdAt), "MMM d")}
                    </span>
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 border ${
                      sub.isSubscribed
                        ? "border-foreground/20 bg-foreground/5"
                        : "border-destructive/20 bg-destructive/5 text-destructive"
                    }`}>
                      {sub.isSubscribed ? "active" : "unsub"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Campaigns */}
        <div className="border-2 border-foreground shadow-md">
          <div className="flex items-center justify-between border-b-2 border-foreground px-6 py-3 bg-foreground">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-background">
              Recent Campaigns
            </p>
            <button
              className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-background/60 hover:text-background transition-colors"
              onClick={() => navigate({ to: "/campaigns" })}
            >
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {!campaignsData?.data?.items?.length ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">No campaigns yet</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => navigate({ to: "/campaigns/new" })}
              >
                Create first campaign
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {campaignsData.data.items.map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() =>
                    navigate({ to: "/campaigns/$id", params: { id: campaign.id } })
                  }
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{campaign.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {campaign.subject}
                    </p>
                  </div>
                  <div className="ml-4 shrink-0">
                    <span
                      className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 ${
                        STATUS_STYLES[campaign.status] ?? "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {campaign.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
