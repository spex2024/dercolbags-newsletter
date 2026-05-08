import { useState, useRef } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { emailTemplatesApi } from "@/services/api/email-templates"
import type { TemplateCategory, TemplateStatus } from "@/services/api/types"
import { EmailBuilder, type EmailBuilderRef } from "@/components/EmailBuilder"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Loader2, Save, Eye, Pencil, Tag, Calendar, Hash, Settings } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

export const Route = createFileRoute("/_authenticated/templates/$id")({
  beforeLoad: ({ context }) => requirePageAccess(context, "templates"),
  component: TemplateDetailPage,
})

const STATUS_STYLE: Record<string, string> = {
  draft:    "border-foreground/20 bg-foreground/5 text-foreground",
  active:   "border-foreground bg-foreground text-background",
  archived: "border-foreground/20 text-muted-foreground",
}

const CATEGORY_STYLE: Record<string, string> = {
  system:       "border-foreground/20 text-muted-foreground",
  auth:         "border-foreground/20 text-muted-foreground",
  campaign:     "border-foreground bg-foreground text-background",
  notification: "border-foreground/30 text-foreground",
}

type ActiveTab = "preview" | "editor" | "settings"

function TemplateDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const emailBuilderRef = useRef<EmailBuilderRef>(null)
  const [editorReady, setEditorReady] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>("preview")

  // settings form state
  const [settingsData, setSettingsData] = useState<{
    name: string; subject: string; templateKey: string
    category: TemplateCategory; status: TemplateStatus
  } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["email-template", id],
    queryFn: () => emailTemplatesApi.get(id),
  })

  const contentMutation = useMutation({
    mutationFn: async () => {
      if (!emailBuilderRef.current) throw new Error("Editor not ready")
      const { html, design } = await emailBuilderRef.current.exportHtml()
      return emailTemplatesApi.update(id, { htmlContent: html, designJson: design })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-template", id] })
      queryClient.invalidateQueries({ queryKey: ["email-templates"] })
      toast.success("Template content saved")
    },
    onError: (error: Error) => toast.error(error.message || "Failed to save template"),
  })

  const settingsMutation = useMutation({
    mutationFn: async (values: typeof settingsData) => {
      if (!values) return
      // status is updated via its own endpoint
      await Promise.all([
        emailTemplatesApi.update(id, {
          name: values.name,
          subject: values.subject,
          templateKey: values.templateKey,
          category: values.category,
        }),
        emailTemplatesApi.updateStatus(id, values.status),
      ])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-template", id] })
      queryClient.invalidateQueries({ queryKey: ["email-templates"] })
      toast.success("Template settings saved")
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save settings"),
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Loading</p>
      </div>
    )
  }

  const template = data?.data
  if (!template) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 border-2 border-foreground">
        <p className="text-4xl font-black">404</p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Template not found</p>
      </div>
    )
  }

  const hasDesignJson = template.designJson && Object.keys(template.designJson).length > 0

  const openSettings = () => {
    setSettingsData({
      name:        template.name,
      subject:     template.subject,
      templateKey: template.templateKey,
      category:    template.category,
      status:      template.status,
    })
    setActiveTab("settings")
  }

  return (
    <div className="space-y-6">

      {/* Nav + actions */}
      <div className="flex items-center justify-between">
        <button
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => navigate({ to: "/templates" })}
        >
          <ArrowLeft className="h-4 w-4" />
          Templates
        </button>

        <div className="flex items-center gap-2">
          {activeTab === "editor" && (
            <Button
              onClick={() => contentMutation.mutate()}
              disabled={contentMutation.isPending || !editorReady}
              className="shadow-md hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              {contentMutation.isPending
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Save className="mr-2 h-4 w-4" />}
              Save Content
            </Button>
          )}
          {activeTab === "settings" && settingsData && (
            <Button
              onClick={() => settingsMutation.mutate(settingsData)}
              disabled={settingsMutation.isPending}
              className="shadow-md hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              {settingsMutation.isPending
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Save className="mr-2 h-4 w-4" />}
              Save Settings
            </Button>
          )}
        </div>
      </div>

      {/* Main block */}
      <div className="border-2 border-foreground shadow-[6px_6px_0px_0px_oklch(0.1_0_0)] divide-y-2 divide-foreground">

        {/* Hero */}
        <div className="bg-foreground text-background px-8 pt-8 pb-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-background/40 mb-2">Email Template</p>
              <h1 className="text-3xl font-black tracking-tight leading-tight">{template.name}</h1>
              <p className="mt-2 text-base text-background/60 truncate">{template.subject}</p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1 border ${STATUS_STYLE[template.status] ?? STATUS_STYLE.draft}`}>
                {template.status}
              </span>
              <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1 border ${CATEGORY_STYLE[template.category] ?? CATEGORY_STYLE.system}`}>
                {template.category}
              </span>
            </div>
          </div>
        </div>

        {/* Meta strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x-2 divide-foreground">
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Key</p>
            </div>
            <code className="text-xs font-mono font-bold break-all">{template.templateKey}</code>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Brand</p>
            </div>
            <p className="text-sm font-semibold capitalize">{template.brand}</p>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Created</p>
            </div>
            <p className="text-sm font-semibold">{format(new Date(template.createdAt), "MMM d, yyyy")}</p>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Updated</p>
            </div>
            <p className="text-sm font-semibold">{format(new Date(template.updatedAt), "MMM d, yyyy")}</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex">
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-2 px-6 py-3 text-[11px] font-bold uppercase tracking-wider border-r-2 border-foreground transition-colors ${
              activeTab === "preview" ? "bg-foreground text-background" : "hover:bg-muted/40 text-muted-foreground"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </button>
          {hasDesignJson && (
            <button
              onClick={() => { setActiveTab("editor"); setEditorReady(false) }}
              className={`flex items-center gap-2 px-6 py-3 text-[11px] font-bold uppercase tracking-wider border-r-2 border-foreground transition-colors ${
                activeTab === "editor" ? "bg-foreground text-background" : "hover:bg-muted/40 text-muted-foreground"
              }`}
            >
              <Pencil className="h-3.5 w-3.5" />
              Visual Editor
            </button>
          )}
          <button
            onClick={openSettings}
            className={`flex items-center gap-2 px-6 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors ${
              activeTab === "settings" ? "bg-foreground text-background" : "hover:bg-muted/40 text-muted-foreground"
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </button>
        </div>

        {/* ── Preview ── */}
        {activeTab === "preview" && (
          <div className="bg-muted/20">
            {/* fixed-height scrollable email preview */}
            <div className="max-h-[72vh] overflow-y-auto">
              <div className="mx-auto max-w-[640px] py-8 px-4">
                <div
                  className="bg-white shadow-sm"
                  dangerouslySetInnerHTML={{ __html: template.htmlContent }}
                />
              </div>
            </div>
            {!hasDesignJson && (
              <p className="py-3 text-center text-xs text-muted-foreground border-t border-foreground/10">
                Raw HTML template — use the Visual Editor tab to edit with drag-and-drop.
              </p>
            )}
          </div>
        )}

        {/* ── Visual Editor ── */}
        {hasDesignJson && activeTab === "editor" && (
          <div>
            <div className="border-b-2 border-foreground bg-foreground px-6 py-3 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-background">Visual Editor</p>
              {!editorReady && (
                <div className="flex items-center gap-2 text-background/60">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="text-[11px]">Loading editor…</span>
                </div>
              )}
            </div>
            <EmailBuilder
              ref={emailBuilderRef}
              designJson={template.designJson}
              minHeight="750px"
              onReady={() => setEditorReady(true)}
            />
          </div>
        )}

        {/* ── Settings ── */}
        {activeTab === "settings" && settingsData && (
          <div className="px-8 py-8 space-y-6">

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  Template Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={settingsData.name}
                  onChange={(e) => setSettingsData((d) => d ? { ...d, name: e.target.value } : d)}
                  placeholder="e.g. Welcome Email"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  Template Key <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={settingsData.templateKey}
                  onChange={(e) =>
                    setSettingsData((d) => d ? { ...d, templateKey: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") } : d)
                  }
                  placeholder="e.g. welcome_email"
                  className="font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Lowercase letters, numbers, underscores only. Used to reference this template in code.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                Email Subject <span className="text-destructive">*</span>
              </Label>
              <Input
                value={settingsData.subject}
                onChange={(e) => setSettingsData((d) => d ? { ...d, subject: e.target.value } : d)}
                placeholder="e.g. Welcome to {{brandName}}!"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Category</Label>
                <Select
                  value={settingsData.category}
                  onValueChange={(v) => setSettingsData((d) => d ? { ...d, category: v as TemplateCategory } : d)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="campaign">Campaign</SelectItem>
                    <SelectItem value="notification">Notification</SelectItem>
                    <SelectItem value="auth">Auth</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Status</Label>
                <Select
                  value={settingsData.status}
                  onValueChange={(v) => setSettingsData((d) => d ? { ...d, status: v as TemplateStatus } : d)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Only <strong>Active</strong> templates are available for campaigns.
                </p>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
