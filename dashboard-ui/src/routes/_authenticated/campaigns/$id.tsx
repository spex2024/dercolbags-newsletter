import { useState, useRef } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { campaignsApi } from "@/services/api/campaigns"
import { emailTemplatesApi } from "@/services/api/email-templates"
import { useBrand } from "@/contexts/BrandContext"
import { EmailBuilder, type EmailBuilderRef } from "@/components/EmailBuilder"
import { presetTemplates, CATEGORY_LABEL } from "@/lib/template-presets"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  FileText,
  LayoutTemplate,
  AlertCircle,
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
  const { currentBrand } = useBrand()

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
  const [editorReady, setEditorReady] = useState(false)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [recipientStatus, setRecipientStatus] = useState<string>("all")
  const [pickerSelected, setPickerSelected] = useState<{ label: string; design: Record<string, unknown> } | null>(null)
  const testInputRef = useRef<HTMLInputElement>(null)
  const emailBuilderRef = useRef<EmailBuilderRef>(null)

  const { data: savedTemplatesData } = useQuery({
    queryKey: ["email-templates", currentBrand, "campaign"],
    queryFn: () => emailTemplatesApi.list({ brand: currentBrand, category: "campaign", status: "active" }),
    enabled: showTemplatePicker,
  })

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

  const { data: recipientsData, isLoading: recipientsLoading } = useQuery({
    queryKey: ["campaign-recipients", id, recipientStatus],
    queryFn: () => campaignsApi.getRecipients(id, recipientStatus),
    enabled: !!data?.data && ["sent", "sending", "failed"].includes(data.data.status),
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
      designJson?: Record<string, unknown>
    }) => campaignsApi.update(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", id] })
      toast.success("Campaign updated")
      setIsEditing(false)
      setEditorReady(false)
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
    setEditorReady(false)
    setIsEditing(true)
  }

  const saveEdit = async () => {
    if (!editData) return
    if (!emailBuilderRef.current) {
      toast.error("Editor not ready")
      return
    }
    const { html, design } = await emailBuilderRef.current.exportHtml()
    updateMutation.mutate({
      name: editData.name,
      subject: editData.subject,
      preheader: editData.preheader || undefined,
      content: html,
      designJson: design as Record<string, unknown>,
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
            disabled={updateMutation.isPending || !editorReady}
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
          {/* Name + meta fields */}
          <div className="bg-foreground text-background px-8 py-7">
            <p className="text-[10px] uppercase tracking-[0.2em] text-background/40 mb-3">Editing campaign</p>
            <Input
              value={editData.name}
              onChange={(e) => setEditData((d) => (d ? { ...d, name: e.target.value } : null))}
              placeholder="Campaign name"
              className="bg-transparent border-background/30 text-background text-2xl font-black h-auto py-1 px-2 focus:border-background placeholder:text-background/30"
            />
          </div>

          <div className="px-8 py-6 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Email Subject</Label>
              <Input
                value={editData.subject}
                onChange={(e) => setEditData((d) => (d ? { ...d, subject: e.target.value } : null))}
                placeholder="Email subject"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Preheader (optional)</Label>
              <Input
                value={editData.preheader}
                onChange={(e) => setEditData((d) => (d ? { ...d, preheader: e.target.value } : null))}
                placeholder="Preview text after the subject line"
              />
            </div>
          </div>

          {/* Visual email builder */}
          <div>
            <div className="border-b-2 border-foreground bg-foreground px-6 py-3 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-background">
                Email Content
              </p>
              <div className="flex items-center gap-3">
                {!editorReady && (
                  <div className="flex items-center gap-2 text-background/60">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="text-[11px]">Loading editor…</span>
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 border-background/30 text-background bg-transparent hover:bg-background/10 hover:text-background text-[10px] uppercase tracking-wider shadow-none"
                  onClick={() => { setPickerSelected(null); setShowTemplatePicker(true) }}
                >
                  <LayoutTemplate className="mr-1.5 h-3.5 w-3.5" />
                  Change Template
                </Button>
              </div>
            </div>
            <EmailBuilder
              ref={emailBuilderRef}
              designJson={
                campaign.designJson && Object.keys(campaign.designJson).length > 0
                  ? (campaign.designJson as Record<string, unknown>)
                  : undefined
              }
              minHeight="700px"
              onReady={() => setEditorReady(true)}
            />
          </div>
        </div>

        {/* Template picker dialog */}
        <Dialog open={showTemplatePicker} onOpenChange={setShowTemplatePicker}>
          <DialogContent className="max-w-3xl h-[88vh] flex flex-col gap-0 p-0 overflow-hidden">
            {/* Pinned header */}
            <DialogHeader className="shrink-0 bg-foreground text-background px-6 py-5">
              <DialogTitle className="text-base font-black text-background tracking-tight">Change Template</DialogTitle>
              <p className="text-[11px] text-background/50 mt-0.5">Select a preset or one of your saved templates</p>
            </DialogHeader>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Saved campaign templates */}
              {(savedTemplatesData?.data?.items?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-3">
                    Your Campaign Templates
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {savedTemplatesData!.data.items.map((t) => {
                      const isSelected = pickerSelected?.label === t.name
                      return (
                        <button
                          key={t.id}
                          onClick={() => setPickerSelected({ label: t.name, design: t.designJson as Record<string, unknown> })}
                          className={`border-2 text-left transition-all hover:-translate-y-[2px] hover:shadow-md ${isSelected ? "border-foreground shadow-[4px_4px_0px_0px_oklch(0.1_0_0)]" : "border-foreground/30 hover:border-foreground"}`}
                        >
                          <div className="relative h-24 overflow-hidden border-b-2 border-inherit bg-muted/10">
                            <div className="pointer-events-none absolute inset-0 origin-top-left scale-[0.3] w-[333%] h-[333%]">
                              <div className="prose prose-sm max-w-none p-4" dangerouslySetInnerHTML={{ __html: t.htmlContent }} />
                            </div>
                            {isSelected && (
                              <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center bg-foreground text-background">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <p className="text-sm font-black truncate">{t.name}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Presets */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-3">
                  Preset Templates
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {presetTemplates.filter((p) => p.id !== "blank").map((preset) => {
                    const isSelected = pickerSelected?.label === preset.name
                    const catBg: Record<string, string> = {
                      welcome:"bg-emerald-800",newsletter:"bg-blue-900",promotion:"bg-red-900",
                      notification:"bg-zinc-800",minimal:"bg-zinc-600",reengagement:"bg-violet-900",
                      event:"bg-amber-800",ecommerce:"bg-orange-800",loyalty:"bg-yellow-700",
                      feedback:"bg-cyan-800",announcement:"bg-rose-900",
                    }
                    return (
                      <button
                        key={preset.id}
                        onClick={() => setPickerSelected({ label: preset.name, design: preset.design })}
                        className={`border-2 text-left transition-all hover:-translate-y-[2px] hover:shadow-md ${isSelected ? "border-foreground shadow-[4px_4px_0px_0px_oklch(0.1_0_0)]" : "border-foreground/30 hover:border-foreground"}`}
                      >
                        <div className={`relative flex h-24 flex-col items-center justify-center border-b-2 border-inherit gap-1 ${catBg[preset.category] ?? "bg-zinc-700"}`}>
                          <span className="text-3xl font-black text-white/20 select-none">{preset.thumbnail}</span>
                          <span className="text-[9px] uppercase tracking-widest font-bold text-white/60 bg-black/20 px-2 py-0.5">
                            {CATEGORY_LABEL[preset.category] ?? preset.category}
                          </span>
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center bg-white text-black">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-black leading-snug">{preset.name}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{preset.description}</p>
                        </div>
                      </button>
                    )
                  })}

                  {/* Blank */}
                  <button
                    onClick={() => setPickerSelected({ label: "Blank", design: {} })}
                    className={`border-2 text-left transition-all hover:-translate-y-[2px] hover:shadow-md ${pickerSelected?.label === "Blank" ? "border-foreground shadow-[4px_4px_0px_0px_oklch(0.1_0_0)] border-solid" : "border-dashed border-foreground/30 hover:border-foreground"}`}
                  >
                    <div className="relative flex h-24 flex-col items-center justify-center border-b-2 border-inherit bg-muted/10">
                      <FileText className="h-8 w-8 text-muted-foreground/30" />
                      {pickerSelected?.label === "Blank" && (
                        <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center bg-foreground text-background">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-black">Blank Canvas</p>
                      <p className="text-[11px] text-muted-foreground">Start from scratch</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Pinned footer */}
            <div className="shrink-0 flex items-center justify-between border-t-2 border-foreground px-6 py-4 bg-muted/20">
              <p className="text-xs text-muted-foreground">
                {pickerSelected
                  ? <><span className="font-bold text-foreground">{pickerSelected.label}</span> selected</>
                  : "No template selected"}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowTemplatePicker(false)}>Cancel</Button>
                <Button
                  size="sm"
                  disabled={!pickerSelected}
                  onClick={() => {
                    if (!pickerSelected) return
                    emailBuilderRef.current?.loadDesign(pickerSelected.design)
                    setShowTemplatePicker(false)
                    toast.success(`"${pickerSelected.label}" loaded`)
                  }}
                  className="shadow-md hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                >
                  Apply Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTestInput((v) => !v)}
              disabled={testMutation.isPending}
              className={`shadow-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all ${showTestInput ? "border-foreground bg-foreground text-background" : ""}`}
            >
              <FlaskConical className="mr-2 h-3.5 w-3.5" />
              Test
            </Button>

            {showTestInput && (
              <div className="absolute right-0 top-full mt-2 z-50 w-72 border-2 border-foreground bg-background shadow-[4px_4px_0px_0px_oklch(0.1_0_0)]">
                <div className="bg-foreground text-background px-4 py-2.5 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold">Send Test Email</p>
                  <button
                    onClick={() => { setShowTestInput(false); setTestEmail("") }}
                    className="text-background/60 hover:text-background transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                      Recipient
                    </label>
                    <Input
                      ref={testInputRef}
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="h-9 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") testMutation.mutate(testEmail)
                        if (e.key === "Escape") { setShowTestInput(false); setTestEmail("") }
                      }}
                      autoFocus
                    />
                  </div>
                  <Button
                    className="w-full shadow-md hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    disabled={testMutation.isPending}
                    onClick={() => testMutation.mutate(testEmail)}
                  >
                    {testMutation.isPending
                      ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      : <Send className="mr-2 h-4 w-4" />}
                    Send Test
                  </Button>
                </div>
              </div>
            )}
          </div>

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

      {/* Recipients breakdown — sent / sending campaigns only */}
      {recipientsData && (
        <div className="border-2 border-foreground shadow-[4px_4px_0px_0px_oklch(0.1_0_0)]">

          {/* Section header with filter tabs */}
          <div className="bg-foreground text-background px-6 py-3 flex items-center justify-between border-b-2 border-foreground">
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold">Recipients</p>
            </div>
            <div className="flex items-center gap-1">
              {(["all", "sent", "opened", "clicked", "failed", "pending"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setRecipientStatus(s)}
                  className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 transition-colors ${
                    recipientStatus === s
                      ? "bg-background text-foreground"
                      : "text-background/60 hover:text-background"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20 border-b-2 border-foreground">
                <TableHead className="text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto">Subscriber</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto">Status</TableHead>
                <TableHead className="hidden sm:table-cell text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto">Sent</TableHead>
                <TableHead className="hidden md:table-cell text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto">Opened</TableHead>
                <TableHead className="hidden md:table-cell text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto">Clicked</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto">Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipientsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}><div className="h-4 w-24 bg-muted animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !recipientsData.data?.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No recipients match this filter
                  </TableCell>
                </TableRow>
              ) : (
                recipientsData.data.map((r) => {
                  const STATUS_BADGE: Record<string, string> = {
                    pending: "border-foreground/20 bg-foreground/5 text-foreground",
                    sent:    "border-foreground/40 text-foreground",
                    opened:  "border-emerald-600 bg-emerald-50 text-emerald-700",
                    clicked: "border-blue-600 bg-blue-50 text-blue-700",
                    failed:  "border-destructive/40 bg-destructive/5 text-destructive",
                  }
                  return (
                    <TableRow key={r.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell>
                        <p className="text-sm font-semibold">{r.name || "—"}</p>
                        <p className="text-[11px] text-muted-foreground">{r.email}</p>
                      </TableCell>
                      <TableCell>
                        <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 border ${STATUS_BADGE[r.status] ?? STATUS_BADGE.pending}`}>
                          {r.status}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-[11px] text-muted-foreground tabular-nums">
                        {r.sentAt ? format(new Date(r.sentAt), "MMM d, h:mm a") : "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-[11px] text-muted-foreground tabular-nums">
                        {r.openedAt ? format(new Date(r.openedAt), "MMM d, h:mm a") : "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-[11px] text-muted-foreground tabular-nums">
                        {r.clickedAt ? format(new Date(r.clickedAt), "MMM d, h:mm a") : "—"}
                      </TableCell>
                      <TableCell>
                        {r.errorMessage ? (
                          <div className="flex items-start gap-1.5 max-w-[200px]">
                            <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                            <p className="text-[11px] text-destructive leading-snug">{r.errorMessage}</p>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
