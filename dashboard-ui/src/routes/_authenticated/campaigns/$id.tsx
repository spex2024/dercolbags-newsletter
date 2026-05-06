import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useQuery } from "@tanstack/react-query"
import { campaignsApi } from "@/services/api/campaigns"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Calendar, Target, Users } from "lucide-react"
import { format } from "date-fns"

export const Route = createFileRoute("/_authenticated/campaigns/$id")({
  beforeLoad: ({ context }) => requirePageAccess(context, "campaigns"),
  component: CampaignDetailPage,
})

function CampaignDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => campaignsApi.get(id),
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const campaign = data?.data
  if (!campaign) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Campaign not found</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ to: "/campaigns" })}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Campaigns
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{campaign.name}</CardTitle>
              <CardDescription className="mt-1">
                {campaign.subject}
              </CardDescription>
            </div>
            <Badge
              variant={
                campaign.status === "sent"
                  ? "default"
                  : campaign.status === "draft"
                    ? "secondary"
                    : "outline"
              }
            >
              {campaign.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3">
              <Target className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Target</p>
                <p className="text-sm capitalize">{campaign.targetType}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm">
                  {format(new Date(campaign.createdAt), "MMM d, yyyy")}
                </p>
              </div>
            </div>
            {campaign.sentAt && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Sent</p>
                  <p className="text-sm">
                    {format(new Date(campaign.sentAt), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {campaign.stats && (
            <>
              <Separator />
              <div>
                <h3 className="mb-3 text-sm font-semibold">
                  Campaign Statistics
                </h3>
                <div className="grid gap-4 sm:grid-cols-5">
                  {[
                    { label: "Recipients", value: campaign.stats.totalRecipients },
                    { label: "Delivered", value: campaign.stats.delivered },
                    { label: "Opened", value: campaign.stats.opened },
                    { label: "Clicked", value: campaign.stats.clicked },
                    { label: "Bounced", value: campaign.stats.bounced },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center">
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {campaign.preheader && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Preheader</p>
                <p className="mt-1 text-sm">{campaign.preheader}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
