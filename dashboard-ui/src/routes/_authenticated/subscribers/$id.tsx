import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { subscribersApi } from "@/services/api/subscribers"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, Mail, Phone, MapPin, Globe, Calendar, Clock, TrendingUp, ShoppingBag } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

export const Route = createFileRoute("/_authenticated/subscribers/$id")({
  beforeLoad: ({ context }) => requirePageAccess(context, "subscribers"),
  component: SubscriberDetailPage,
})

function SubscriberDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["subscriber", id],
    queryFn: () => subscribersApi.get(id),
  })

  const statusMutation = useMutation({
    mutationFn: (status: "new" | "contacted" | "converted" | "spam") =>
      subscribersApi.updateStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriber", id] })
      queryClient.invalidateQueries({ queryKey: ["subscribers"] })
      toast.success("Status updated")
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update status"),
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Loading</p>
      </div>
    )
  }

  const subscriber = data?.data
  if (!subscriber) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 border-2">
        <p className="text-4xl font-black">404</p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Subscriber not found</p>
      </div>
    )
  }

  const initials = subscriber.name
    ? subscriber.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : subscriber.email[0].toUpperCase()

  const STATUS_STYLE: Record<string, string> = {
    new:       "border-foreground/20 bg-foreground/5 text-foreground",
    contacted: "border-foreground bg-foreground text-background",
    converted: "border-emerald-600 bg-emerald-50 text-emerald-700",
    spam:      "border-destructive/40 bg-destructive/5 text-destructive",
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Nav */}
      <button
        className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => navigate({ to: "/subscribers" })}
      >
        <ArrowLeft className="h-4 w-4" />
        Subscribers
      </button>

      {/* Main block */}
      <div className="border-2 border-foreground shadow-[6px_6px_0px_0px_oklch(0.1_0_0)] divide-y-2 divide-foreground">

        {/* Hero */}
        <div className="bg-foreground text-background px-8 pt-10 pb-8 flex items-start gap-6">
          {/* Avatar */}
          <div className="shrink-0 flex h-16 w-16 items-center justify-center bg-background text-foreground text-xl font-black">
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-background/40 mb-2">Subscriber</p>
            <h1 className="text-3xl font-black tracking-tight leading-tight">
              {subscriber.name || "No name"}
            </h1>
            <p className="mt-2 text-base text-background/60">{subscriber.email}</p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1 border ${STATUS_STYLE[subscriber.status] ?? "border-foreground/20 bg-foreground/5 text-foreground"}`}>
              {subscriber.status}
            </span>
            <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1 border ${
              subscriber.isSubscribed
                ? "border-background/20 text-background/60"
                : "border-destructive/60 text-destructive bg-background"
            }`}>
              {subscriber.isSubscribed ? "Subscribed" : "Unsubscribed"}
            </span>
          </div>
        </div>

        {/* Contact info grid */}
        <div className="grid grid-cols-2 divide-x-2 divide-foreground">
          {[
            { icon: Mail, label: "Email", value: subscriber.email },
            { icon: Phone, label: "Phone", value: subscriber.phone || "—" },
            { icon: MapPin, label: "Location", value: subscriber.location || "—" },
            { icon: Globe, label: "Source", value: subscriber.source },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="px-6 py-5">
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
              </div>
              <p className="text-sm font-semibold truncate">{value}</p>
            </div>
          ))}
        </div>

        {/* Timeline strip */}
        <div className="grid grid-cols-3 divide-x-2 divide-foreground bg-muted/20">
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Added</p>
            </div>
            <p className="text-sm font-semibold">
              {format(new Date(subscriber.createdAt), "MMM d, yyyy")}
            </p>
          </div>

          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Last Email</p>
            </div>
            <p className="text-sm font-semibold">
              {subscriber.lastEmailSentAt
                ? format(new Date(subscriber.lastEmailSentAt), "MMM d, yyyy")
                : "Never"}
            </p>
          </div>

          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Brand</p>
            </div>
            <p className="text-sm font-semibold capitalize">{subscriber.brand}</p>
          </div>
        </div>

        {/* Unsubscribed notice */}
        {!subscriber.isSubscribed && subscriber.unsubscribedAt && (
          <div className="px-6 py-4 bg-destructive/5 flex items-center gap-3">
            <div className="h-2 w-2 bg-destructive shrink-0" />
            <p className="text-xs text-destructive">
              Unsubscribed on {format(new Date(subscriber.unsubscribedAt), "MMM d, yyyy")}
            </p>
          </div>
        )}

        {/* Status actions */}
        <div className="px-8 py-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold mb-4">
            Update Status
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={subscriber.status === "converted" || statusMutation.isPending}
              className="shadow-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              onClick={() => statusMutation.mutate("converted")}
            >
              {statusMutation.isPending ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShoppingBag className="mr-2 h-3.5 w-3.5" />
              )}
              Mark as Converted
            </Button>

            {subscriber.status === "converted" && (
              <Button
                variant="outline"
                size="sm"
                disabled={statusMutation.isPending}
                className="shadow-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                onClick={() => statusMutation.mutate("contacted")}
              >
                {statusMutation.isPending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <TrendingUp className="mr-2 h-3.5 w-3.5" />
                )}
                Revert to Contacted
              </Button>
            )}
          </div>
          {subscriber.status === "converted" && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              This subscriber has been marked as a customer.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
