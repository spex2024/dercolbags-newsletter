import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { campaignsApi } from "@/services/api/campaigns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  Calendar,
  Target,
  Send,
  X,
  Trash2,
  Loader2,
  Pencil,
  Check,
  Clock,
  Users,
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

export const Route = createFileRoute("/_authenticated/campaigns/$id")({
  beforeLoad: ({ context }) => requirePageAccess(context, "campaigns"),
  component: CampaignDetailPage,
})

type ConfirmAction = "send" | "cancel" | "delete"

const CONFIRM_META: Record<
  ConfirmAction,
  { title: string; desc: string; btn: string; danger: boolean }
> = {
  send: {
    title: "Send this campaign now?",
    desc: "It will be delivered immediately to all target subscribers. This cannot be undone.",
    btn: "Send Now",
    danger: false,
  },
  cancel: {
    title: "Cancel the scheduled send?",
    desc: "The campaign will return to draft. You can reschedule or send it immediately afterwards.",
    btn: "Cancel Schedule",
    danger: true,
  },
  delete: {
    title: "Delete this campaign?",
    desc: "The campaign and all its data will be permanently removed. This cannot be undone.",
    btn: "Delete Campaign",
    danger: true,
  },
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-secondary text-secondary-foreground",
  scheduled: "bg-foreground text-background",
  sending: "bg-foreground text-background",
  sent: "bg-foreground text-background",
  cancelled: "bg-destructive text-white",
}

function CampaignDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<{
    name: string
    subject: string
    preheader: string
    content: string
  } | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => campaignsApi.get(id),
  })

  const sendMutation = useMutation({
    mutationFn: () => campaignsApi.send(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", id] })
      queryClient.invalidateQueries({ queryKey: ["campaigns"] })
      toast.success("Campaign is now being sent")
      setConfirmAction(null)
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to send campaign")
      setConfirmAction(null)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => campaignsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", id] })
      queryClient.invalidateQueries({ queryKey: ["campaigns"] })
      toast.success("Campaign schedule cancelled")
      setConfirmAction(null)
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to cancel campaign")
      setConfirmAction(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => campaignsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] })
      toast.success("Campaign deleted")
      navigate({ to: "/campaigns" })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete campaign")
      setConfirmAction(null)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (values: {
      name: string
      subject: string
      preheader?: string
      content: string
    }) => campaignsApi.update(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", id] })
      toast.success("Campaign updated")
      setIsEditing(false)
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update campaign")
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Loading</p>
      </div>
    )
  }

  const campaign = data?.data
  if (!campaign) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 border">
        <p className="text-4xl font-black">404</p>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Campaign not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate({ to: "/campaigns" })}>
          Back to Campaigns
        </Button>
      </div>
    )
  }

  const isDraft = campaign.status === "draft"
  const isScheduled = campaign.status === "scheduled"
  const isSending = campaign.status === "sending"

  const startEditing = () => {
    setEditData({
      name: campaign.name,
      subject: campaign.subject,
      preheader: campaign.preheader || "",
      content: campaign.content,
    })
    setIsEditing(true)
  }

  const saveEdit = () => {
    if (!editData) return
    updateMutation.mutate({
      name: editData.name,
      subject: editData.subject,
      preheader: editData.preheader || undefined,
      content: editData.content,
    })
  }

  const isPending =
    sendMutation.isPending || cancelMutation.isPending || deleteMutation.isPending

  // ── Confirm screen ─────────────────────────────────────────────────────────
  if (confirmAction) {
    const meta = CONFIRM_META[confirmAction]
    return (
      <div className="mx-auto max-w-4xl">
        <button
          className="mb-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          onClick={() => setConfirmAction(null)}
          disabled={isPending}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="border shadow-xl">
          {/* header */}
          <div className={`border-b p-8 ${meta.danger ? "bg-destructive" : "bg-foreground"}`}>
            <p className="text-xs uppercase tracking-widest text-white/60 mb-2">Confirm action</p>
            <h2 className="text-2xl font-black text-white">{meta.title}</h2>
          </div>

          <div className="p-8">
            <p className="text-muted-foreground">{meta.desc}</p>

            <div className="mt-8 flex gap-3">
              <Button
                variant="outline"
                onClick={() => setConfirmAction(null)}
                disabled={isPending}
                className="shadow-md hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Go Back
              </Button>
              <Button
                variant={meta.danger ? "destructive" : "default"}
                disabled={isPending}
                className="shadow-md hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                onClick={() => {
                  if (confirmAction === "send") sendMutation.mutate()
                  if (confirmAction === "cancel") cancelMutation.mutate()
                  if (confirmAction === "delete") deleteMutation.mutate()
                }}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {meta.btn}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────
  if (isEditing && editData) {
    return (
      <div className="mx-auto max-w-4xl">
        {/* nav */}
        <div className="mb-6 flex items-center justify-between">
          <button
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setIsEditing(false)}
          >
            <ArrowLeft className="h-4 w-4" />
            Discard changes
          </button>
          <Button
            onClick={saveEdit}
            disabled={updateMutation.isPending}
            className="shadow-md hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            {updateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>

        <div className="border shadow-xl divide-y">
          <div className="bg-foreground text-background p-8">
            <p className="text-xs uppercase tracking-widest text-background/40 mb-3">Editing campaign</p>
            <Input
              value={editData.name}
              onChange={(e) => setEditData((d) => (d ? { ...d, name: e.target.value } : null))}
              placeholder="Campaign name"
              className="bg-transparent border-background/30 text-background text-2xl font-black h-auto py-1 px-2 focus:border-background placeholder:text-background/30"
            />
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Email Subject</Label>
              <Input
                value={editData.subject}
                onChange={(e) => setEditData((d) => (d ? { ...d, subject: e.target.value } : null))}
                placeholder="Email subject"
                className="shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Preheader (optional)</Label>
              <Input
                value={editData.preheader}
                onChange={(e) => setEditData((d) => (d ? { ...d, preheader: e.target.value } : null))}
                placeholder="Preview text shown after the subject line"
                className="shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Email Content</Label>
              <Textarea
                value={editData.content}
                onChange={(e) => setEditData((d) => (d ? { ...d, content: e.target.value } : null))}
                className="min-h-[240px] text-sm shadow-sm font-mono"
                placeholder="Write your email content…"
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Detail view ────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-4xl">

      {/* Top nav */}
      <div className="mb-6 flex items-center justify-between">
        <button
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => navigate({ to: "/campaigns" })}
        >
          <ArrowLeft className="h-4 w-4" />
          Campaigns
        </button>

        <div className="flex items-center gap-2">
          {isDraft && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={startEditing}
                className="shadow-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmAction("delete")}
                className="shadow-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </Button>
              <Button
                size="sm"
                onClick={() => setConfirmAction("send")}
                className="shadow-md hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                <Send className="mr-2 h-3.5 w-3.5" />
                Send Now
              </Button>
            </>
          )}
          {isScheduled && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmAction("cancel")}
              className="shadow-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              <X className="mr-2 h-3.5 w-3.5" />
              Cancel Schedule
            </Button>
          )}
        </div>
      </div>

      {/* Main block */}
      <div className="border shadow-xl divide-y">

        {/* Hero header */}
        <div className="bg-foreground text-background px-8 pt-10 pb-8">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-background/40 mb-3">
                Campaign
              </p>
              <h1 className="text-4xl font-black tracking-tight leading-tight break-words">
                {campaign.name}
              </h1>
              <p className="mt-3 text-base text-background/60 leading-relaxed">
                {campaign.subject}
              </p>
            </div>
            <span
              className={`shrink-0 inline-block px-3 py-1 text-xs uppercase tracking-widest font-bold border border-background/20 ${STATUS_STYLES[campaign.status] ?? "bg-secondary text-secondary-foreground"}`}
            >
              {campaign.status}
            </span>
          </div>
        </div>

        {/* Sending banner */}
        {isSending && (
          <div className="bg-foreground/90 text-background px-8 py-4 flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <p className="text-sm tracking-wide">
              Campaign is currently being delivered to subscribers…
            </p>
          </div>
        )}

        {/* Meta strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 divide-x">
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Target</p>
            </div>
            <p className="text-base font-semibold capitalize">{campaign.targetType}</p>
          </div>

          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Created</p>
            </div>
            <p className="text-base font-semibold">
              {format(new Date(campaign.createdAt), "MMM d, yyyy")}
            </p>
          </div>

          {campaign.scheduledAt && (
            <div className="px-6 py-5">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Scheduled For</p>
              </div>
              <p className="text-base font-semibold">
                {format(new Date(campaign.scheduledAt), "MMM d, yyyy · h:mm a")}
              </p>
            </div>
          )}

          {campaign.sentAt && (
            <div className="px-6 py-5">
              <div className="flex items-center gap-2 mb-1">
                <Send className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Sent</p>
              </div>
              <p className="text-base font-semibold">
                {format(new Date(campaign.sentAt), "MMM d, yyyy")}
              </p>
            </div>
          )}
        </div>

        {/* Stats */}
        {campaign.stats && (
          <>
            <div className="px-8 py-3 bg-muted/40 flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
                Performance
              </p>
            </div>
            <div className="grid grid-cols-5 divide-x">
              {[
                { label: "Recipients", value: campaign.stats.totalRecipients },
                { label: "Delivered", value: campaign.stats.delivered },
                { label: "Opened", value: campaign.stats.opened },
                { label: "Clicked", value: campaign.stats.clicked },
                { label: "Bounced", value: campaign.stats.bounced },
              ].map((stat) => (
                <div key={stat.label} className="px-4 py-7 text-center">
                  <p className="text-5xl font-black tabular-nums leading-none">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Preheader */}
        {campaign.preheader && (
          <div className="px-8 py-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
              Preheader
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {campaign.preheader}
            </p>
          </div>
        )}

        {/* Draft hint */}
        {isDraft && (
          <div className="px-8 py-5 bg-muted/30 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              This campaign is saved as a draft. Review it above, then hit{" "}
              <span className="font-semibold text-foreground">Send Now</span> when ready.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
