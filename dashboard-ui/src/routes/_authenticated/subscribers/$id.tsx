import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useQuery } from "@tanstack/react-query"
import { subscribersApi } from "@/services/api/subscribers"
import { Loader2, ArrowLeft, Mail, Phone, MapPin, Globe, Calendar, Clock } from "lucide-react"
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
    new: "bg-secondary text-secondary-foreground",
    contacted: "bg-foreground text-background",
    converted: "bg-foreground text-background",
    spam: "bg-destructive text-white",
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
            <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1 border border-background/20 ${STATUS_STYLE[subscriber.status] ?? "bg-secondary text-secondary-foreground"}`}>
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
      </div>
    </div>
  )
}
