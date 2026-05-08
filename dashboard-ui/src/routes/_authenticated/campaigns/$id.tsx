import { useState, useRef } from "react"
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
  MailOpen,
  MousePointerClick,
  FlaskConical,
  Copy,
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
  draft:     "border-foreground/20 bg-foreground/5 text-foreground",
  scheduled: "border-foreground/40 text-foreground",
  sending:   "border-foreground bg-foreground text-background",
  sent:      "border-foreground bg-foreground text-background",
  cancelled: "border-destructive/40 bg-destructive/5 text-destructive",
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
  const [showTestInput, setShowTestInput] = useState(false)
  const [testEmail, setTestEmail] = useState("")
  const testInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => campaignsApi.get(id),
  })

  const { data: statsData } = useQuery({
    queryKey: ["campaign-stats", id],
    queryFn: () => campaignsApi.getStats(id),
    enabled: !!data?.data && ["sent", "sending", "scheduled"].includes(data.data.status),
    refetchInterval: data?.data?.status === "sending" ? 10_000 : false,
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

  const testMutation = useMutation({
    mutationFn: (email: string) => campaignsApi.sendTest(id, email || undefined),
    onSuccess: (_, email) => {
      toast.success(`Test email sent to ${email || "your inbox"}`)
      setShowTestInput(false)
      setTestEmail("")
    },
    onError: (err: Error) => toast.error(err.message || "Failed to send test email"),
  })

  const duplicateMutation = useMutation({
    mutationFn: () => campaignsApi.duplicate(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] })
      toast.success("Campaign duplicated")
      navigate({ to: "/campaigns/$id", params: { id: res.data.id } })
    },
    onError: (err: Error) => toast.error(err.message || "Failed to duplicate campaign"),
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
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Loading</p>
      </div>
    )
  }

  const campaign = data?.data
  if (!campaign) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 border-2 border-foreground">
        <p className="text-4xl font-black">404</p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Campaign not found</p>
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

        <div className="border-2 border-foreground shadow-[6px_6px_0px_0px_oklch(0.1_0_0)] divide-y-2 divide-foreground">
          {/* header */}
          <div className={`px-8 py-7 ${meta.danger ? "bg-destructive" : "bg-foreground"}`}>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 mb-2">Confirm action</p>
            <h2 className="text-2xl font-black text-white">{meta.title}</h2>
          </div>

          <div className="px-8 py-8">
            <p className="text-sm text-muted-foreground">{meta.desc}</p>

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

        <div className="border-2 border-foreground shadow-[6px_6px_0px_0px_oklch(0.1_0_0)] divide-y-2 divide-foreground">
          <div className="bg-foreground text-background px-8 py-7">
            <p className="text-[10px] uppercase tracking-[0.2em] text-background/40 mb-3">Editing campaign</p>
            <Input
              value={editData.name}
              onChange={(e) => setEditData((d) => (d ? { ...d, name: e.target.value } : null))}
              placeholder="Campaign name"
              className="bg-transparent border-background/30 text-background text-2xl font-black h-auto py-1 px-2 focus:border-background placeholder:text-background/30"
            />
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Email Subject</Label>
              <Input
                value={editData.subject}
                onChange={(e) => setEditData((d) => (d ? { ...d, subject: e.target.value } : null))}
                placeholder="Email subject"
                className="shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Preheader (optional)</Label>
              <Input
                value={editData.preheader}
                onChange={(e) => setEditData((d) => (d ? { ...d, preheader: e.target.value } : null))}
                placeholder="Preview text shown after the subject line"
                className="shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Email Content</Label>
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

        <div className="flex items-center gap-2 flex-wrap">
          {/* Test email — available on all statuses */}
          {showTestInput ? (
            <div className="flex items-center gap-1 border-2 border-foreground pl-2">
              <Input
                ref={testInputRef}
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="email@example.com"
                className="h-7 w-48 border-0 text-xs px-1 shadow-none focus-visible:ring-0"
                onKeyDown={(e) => {
                  if (e.key === "Enter") testMutation.mutate(testEmail)
                  if (e.key === "Escape") { setShowTestInput(false); setTestEmail("") }
                }}
                autoFocus
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 rounded-none border-l-2 border-foreground hover:bg-foreground hover:text-background"
                disabled={testMutation.isPending}
                onClick={() => testMutation.mutate(testEmail)}
              >
                {testMutation.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Send className="h-3.5 w-3.5" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 rounded-none hover:bg-muted"
                onClick={() => { setShowTestInput(false); setTestEmail("") }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTestInput(true)}
              disabled={testMutation.isPending}
              className="shadow-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              <FlaskConical className="mr-2 h-3.5 w-3.5" />
              Test
            </Button>
          )}

          {/* Duplicate — available on all statuses */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => duplicateMutation.mutate()}
            disabled={duplicateMutation.isPending}
            className="shadow-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            {duplicateMutation.isPending
              ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              : <Copy className="mr-2 h-3.5 w-3.5" />}
            Duplicate
          </Button>

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
      <div className="border-2 border-foreground shadow-[6px_6px_0px_0px_oklch(0.1_0_0)] divide-y-2 divide-foreground">

        {/* Hero header */}
        <div className="bg-foreground text-background px-8 pt-10 pb-8">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-background/40 mb-3">
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
              className={`shrink-0 inline-block px-3 py-1 text-[10px] uppercase tracking-widest font-bold border ${STATUS_STYLES[campaign.status] ?? "border-foreground/20 bg-foreground/5 text-foreground"}`}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 divide-x-2 divide-foreground">
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Target</p>
            </div>
            <p className="text-base font-semibold capitalize">{campaign.targetType}</p>
          </div>

          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Created</p>
            </div>
            <p className="text-base font-semibold">
              {format(new Date(campaign.createdAt), "MMM d, yyyy")}
            </p>
          </div>

          {campaign.scheduledAt && (
            <div className="px-6 py-5">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Scheduled For</p>
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
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Sent</p>
              </div>
              <p className="text-base font-semibold">
                {format(new Date(campaign.sentAt), "MMM d, yyyy")}
              </p>
            </div>
          )}
        </div>

        {/* Stats */}
        {statsData?.data && (
          <>
            <div className="px-8 py-3 bg-muted/40 flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground">
                Performance
              </p>
            </div>
            {/* raw counts */}
            <div className="grid grid-cols-4 divide-x-2 divide-foreground">
              {[
                { label: "Recipients", value: statsData.data.totalRecipients },
                { label: "Delivered", value: statsData.data.sent },
                { label: "Failed", value: statsData.data.failed },
                { label: "Pending", value: statsData.data.pending },
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
            {/* open & click rates */}
            <div className="grid grid-cols-2 divide-x-2 divide-foreground">
              <div className="px-8 py-8 flex items-center gap-6">
                <div className="p-3 bg-foreground/5 border-2 border-foreground/10">
                  <MailOpen className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-4xl font-black tabular-nums leading-none">
                    {statsData.data.openRate}%
                  </p>
                  <p className="mt-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                    Open Rate &middot; {statsData.data.opened} opens
                  </p>
                </div>
              </div>
              <div className="px-8 py-8 flex items-center gap-6">
                <div className="p-3 bg-foreground/5 border-2 border-foreground/10">
                  <MousePointerClick className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-4xl font-black tabular-nums leading-none">
                    {statsData.data.clickRate}%
                  </p>
                  <p className="mt-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                    Click Rate &middot; {statsData.data.clicked} clicks
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Preheader */}
        {campaign.preheader && (
          <div className="px-8 py-6">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-bold mb-2">
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
