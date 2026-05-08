import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { emailTemplatesApi } from "@/services/api/email-templates"
import { useBrand } from "@/contexts/BrandContext"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Users, UserMinus, UserPlus, KeyRound, Mail, Bell,
  CheckCircle2, AlertCircle, Clock, ExternalLink, Plus,
  Inbox,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { Brand } from "@/services/api/types"
import { useMemo } from "react"

export const Route = createFileRoute("/_authenticated/brand-settings")({
  beforeLoad: ({ context }) => {
    const ctx = context as any
    const role = ctx?.session?.user?.role as string | undefined
    if (role && role !== "owner" && role !== "admin") {
      throw redirect({ to: "/dashboard" })
    }
  },
  component: BrandSettingsPage,
})

// ── System email event definitions ────────────────────────────────────────────

interface SystemEvent {
  key: string
  label: string
  description: string
  icon: LucideIcon
  category: string
  variables: string[]
}

const SYSTEM_EVENTS: SystemEvent[] = [
  {
    key: "subscriber_confirmation",
    label: "Subscriber Confirmation",
    description: "Sent automatically when someone subscribes to the newsletter",
    icon: Users,
    category: "notification",
    variables: ["{{name}}", "{{brandName}}", "{{unsubscribeUrl}}"],
  },
  {
    key: "unsubscribe_confirmation",
    label: "Unsubscribe Confirmation",
    description: "Sent when a subscriber clicks the unsubscribe link",
    icon: UserMinus,
    category: "notification",
    variables: ["{{name}}", "{{brandName}}", "{{dashboardUrl}}"],
  },
  {
    key: "user_invite",
    label: "User Invite",
    description: "Sent when a new dashboard user is invited by an admin",
    icon: UserPlus,
    category: "auth",
    variables: ["{{name}}", "{{brandName}}", "{{inviteUrl}}"],
  },
  {
    key: "password_reset",
    label: "Password Reset",
    description: "Sent when a user requests a password reset link",
    icon: KeyRound,
    category: "auth",
    variables: ["{{name}}", "{{brandName}}", "{{resetPasswordUrl}}"],
  },
  {
    key: "campaign_default",
    label: "Campaign Default",
    description: "Default HTML wrapper used for campaigns that don't have a custom template",
    icon: Mail,
    category: "campaign",
    variables: ["{{brandName}}", "{{campaignTitle}}", "{{campaignContent}}", "{{unsubscribeUrl}}"],
  },
  {
    key: "admin_new_subscriber_notification",
    label: "New Subscriber Alert",
    description: "Internal notification sent to admins when a new subscriber joins",
    icon: Bell,
    category: "system",
    variables: ["{{name}}", "{{email}}", "{{brandName}}"],
  },
]

const CATEGORY_LABELS: Record<string, string> = {
  notification: "Subscriber",
  auth: "Auth",
  campaign: "Campaign",
  system: "System",
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: LucideIcon }> = {
  active:   { label: "Active",   className: "bg-foreground text-background",             icon: CheckCircle2 },
  draft:    { label: "Draft",    className: "bg-foreground/10 text-foreground border border-foreground/20", icon: Clock },
  archived: { label: "Archived", className: "bg-muted text-muted-foreground border border-foreground/10",  icon: AlertCircle },
}

// ── Page ──────────────────────────────────────────────────────────────────────

function BrandSettingsPage() {
  const { currentBrand, setCurrentBrand } = useBrand()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ["email-templates-all", currentBrand],
    queryFn: () => emailTemplatesApi.list({ brand: currentBrand as Brand, limit: 100 }),
  })

  const templatesByKey = useMemo(() => {
    const items = data?.data?.items ?? []
    return Object.fromEntries(items.map((t) => [t.templateKey, t]))
  }, [data])

  const brands: { value: Brand; label: string }[] = [
    { value: "dercolbags", label: "DercolBags" },
    { value: "watpak",     label: "WatPak" },
  ]

  return (
    <div className="space-y-8 max-w-4xl">

      {/* Header */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Admin</p>
        <h1 className="text-3xl font-black tracking-tight">Brand Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure the email templates used for each system event per brand.
          If no custom template is set, the built-in fallback is used.
        </p>
      </div>

      {/* Brand tabs */}
      <div className="flex border-b-2 border-foreground">
        {brands.map((b) => (
          <button
            key={b.value}
            onClick={() => setCurrentBrand(b.value)}
            className={`px-8 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors
              ${currentBrand === b.value
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* System email events */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold mb-4">
          System Email Templates
        </p>

        <div className="border-2 border-foreground divide-y-2 divide-foreground">
          {SYSTEM_EVENTS.map((event) => {
            const template = templatesByKey[event.key]
            const statusCfg = template ? STATUS_CONFIG[template.status] : null
            const StatusIcon = statusCfg?.icon

            return (
              <div key={event.key} className="flex items-start justify-between gap-6 px-6 py-5">

                {/* Left: event info */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border-2 border-foreground bg-muted">
                    <event.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="text-sm font-black uppercase tracking-wide">{event.label}</p>
                      <span className="text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 border border-foreground/20 text-muted-foreground">
                        {CATEGORY_LABELS[event.category]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{event.description}</p>

                    {/* Key */}
                    <div className="mt-2 flex items-center gap-2">
                      <code className="text-[11px] font-mono bg-muted px-2 py-0.5 border border-foreground/10">
                        {event.key}
                      </code>
                    </div>

                    {/* Available variables */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {event.variables.map((v) => (
                        <span key={v} className="text-[10px] font-mono text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: status + actions */}
                <div className="flex flex-col items-end gap-3 shrink-0">
                  {isLoading ? (
                    <Skeleton className="h-6 w-20" />
                  ) : template ? (
                    <div className="flex items-center gap-2">
                      {StatusIcon && <StatusIcon className="h-3.5 w-3.5" />}
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 ${statusCfg?.className}`}>
                        {statusCfg?.label}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-muted-foreground/60">
                      <Inbox className="h-3.5 w-3.5" />
                      <span className="text-[10px] uppercase tracking-widest font-bold">Using Fallback</span>
                    </div>
                  )}

                  {isLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : template ? (
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] text-muted-foreground truncate max-w-[140px]">{template.name}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] uppercase tracking-wider font-bold border-2"
                        onClick={() => navigate({ to: "/templates/$id", params: { id: template.id } })}
                      >
                        <ExternalLink className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="h-7 text-[10px] uppercase tracking-wider font-bold shadow-[3px_3px_0px_0px_oklch(0.1_0_0)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                      onClick={() => navigate({ to: "/templates/new" })}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Create
                    </Button>
                  )}
                </div>

              </div>
            )
          })}
        </div>
      </div>

      {/* Hint */}
      <div className="border border-foreground/10 bg-muted/30 px-5 py-4">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <strong className="text-foreground">How it works:</strong> When creating a template, set the
          {" "}<strong>Template Key</strong> to exactly match the key shown above (e.g.{" "}
          <code className="font-mono bg-muted px-1">subscriber_confirmation</code>) and set its status to{" "}
          <strong>Active</strong>. The system will automatically use it for that event — no further configuration needed.
        </p>
      </div>

    </div>
  )
}
