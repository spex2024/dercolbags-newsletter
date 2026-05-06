import { createFileRoute } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useBrand } from "@/contexts/BrandContext"
import { subscribersApi } from "@/services/api/subscribers"
import { campaignsApi } from "@/services/api/campaigns"
import { Users, Mail, Send, BarChart3, TrendingUp, Clock } from "lucide-react"
import { format } from "date-fns"

export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: ({ context }) => requirePageAccess(context, "dashboard"),
  component: DashboardPage,
})

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: typeof Users
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex h-8 w-8 items-center justify-center bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}

function DashboardPage() {
  const { currentBrand } = useBrand()

  const { data: subscribersData, isLoading: subscribersLoading } = useQuery({
    queryKey: ["subscribers", currentBrand, "dashboard"],
    queryFn: () => subscribersApi.list({ brand: currentBrand, limit: 5 }),
  })

  const { data: campaignsData, isLoading: campaignsLoading } = useQuery({
    queryKey: ["campaigns", currentBrand, "dashboard"],
    queryFn: () => campaignsApi.list({ brand: currentBrand, limit: 5 }),
  })

  const isLoading = subscribersLoading || campaignsLoading

  const totalSubscribers = subscribersData?.data?.pagination?.total ?? 0
  const activeSubscribers =
    subscribersData?.data?.items?.filter((s) => s.isSubscribed).length ?? 0
  const totalCampaigns = campaignsData?.data?.pagination?.total ?? 0
  const sentCampaigns =
    campaignsData?.data?.items?.filter((c) => c.status === "sent").length ?? 0

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-36" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>

        {/* Stat cards skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
              <Skeleton className="mb-1.5 h-7 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>

        {/* Content cards skeleton */}
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-5">
              <Skeleton className="mb-5 h-5 w-40" />
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="flex items-center justify-between">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-14 rounded-full" />
                      <Skeleton className="h-3 w-10" />
                    </div>
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Overview of your newsletter performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Subscribers"
          value={totalSubscribers}
          subtitle={`${activeSubscribers} active`}
          icon={Users}
        />
        <StatCard
          title="Total Campaigns"
          value={totalCampaigns}
          subtitle={`${sentCampaigns} sent`}
          icon={Mail}
        />
        <StatCard
          title="Open Rate"
          value="--%"
          subtitle="No data yet"
          icon={BarChart3}
        />
        <StatCard
          title="Click Rate"
          value="--%"
          subtitle="No data yet"
          icon={TrendingUp}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Subscribers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Subscribers</CardTitle>
          </CardHeader>
          <CardContent>
            {!subscribersData?.data?.items?.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No subscribers yet
              </p>
            ) : (
              <div className="space-y-4">
                {subscribersData.data.items.map((subscriber) => (
                  <div
                    key={subscriber.id}
                    className="flex items-center justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {subscriber.name || subscriber.email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {subscriber.email}
                      </p>
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {subscriber.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(subscriber.createdAt), "MMM d")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            {!campaignsData?.data?.items?.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No campaigns yet
              </p>
            ) : (
              <div className="space-y-4">
                {campaignsData.data.items.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {campaign.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {campaign.subject}
                      </p>
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      <Badge
                        variant={
                          campaign.status === "sent"
                            ? "default"
                            : campaign.status === "draft"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-xs"
                      >
                        {campaign.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
