import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useQuery } from "@tanstack/react-query"
import { subscribersApi } from "@/services/api/subscribers"
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
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Globe } from "lucide-react"
import { format } from "date-fns"

export const Route = createFileRoute("/_authenticated/subscribers/$id")({
  beforeLoad: ({ context }) => requirePageAccess(context, "subscribers"),
  component: SubscriberDetailPage,
})

function SubscriberDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ["subscriber", id],
    queryFn: () => subscribersApi.get(id),
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const subscriber = data?.data
  if (!subscriber) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Subscriber not found</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ to: "/subscribers" })}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Subscribers
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">
                {subscriber.name || "No name"}
              </CardTitle>
              <CardDescription className="mt-1">
                {subscriber.email}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge
                variant={
                  subscriber.brand === "watpak" ? "default" : "secondary"
                }
              >
                {subscriber.brand === "watpak" ? "WatPak" : "DercolBags"}
              </Badge>
              <Badge variant="outline">{subscriber.status}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm">{subscriber.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm">{subscriber.phone || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-sm">{subscriber.location || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Source</p>
                <p className="text-sm">{subscriber.source}</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Subscribed</p>
              <p className="mt-1 text-sm font-medium">
                {subscriber.isSubscribed ? "Active" : "Unsubscribed"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="mt-1 text-sm">
                {format(new Date(subscriber.createdAt), "MMM d, yyyy")}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Email Sent</p>
              <p className="mt-1 text-sm">
                {subscriber.lastEmailSentAt
                  ? format(new Date(subscriber.lastEmailSentAt), "MMM d, yyyy")
                  : "Never"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
