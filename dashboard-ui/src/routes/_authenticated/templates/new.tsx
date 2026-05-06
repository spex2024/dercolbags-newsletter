import { useState, useRef } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { emailTemplatesApi } from "@/services/api/email-templates"
import { useBrand } from "@/contexts/BrandContext"
import { EmailBuilder, type EmailBuilderRef } from "@/components/EmailBuilder"
import {
  presetTemplates,
  type PresetTemplate,
} from "@/lib/template-presets"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2, Check, Eye, Pencil } from "lucide-react"
import { toast } from "sonner"
import type { TemplateCategory, TemplateKey } from "@/services/api/types"

export const Route = createFileRoute("/_authenticated/templates/new")({
  beforeLoad: ({ context }) => requirePageAccess(context, "templates"),
  component: NewTemplatePage,
})

type Step = "select" | "design"

function generatePreviewHtml(design: Record<string, unknown>): string {
  const body = design.body as any
  if (!body?.rows) return "<p>Empty template</p>"

  let html = ""
  for (const row of body.rows) {
    for (const col of row.columns || []) {
      for (const content of col.contents || []) {
        if (content.type === "text") {
          html += `<div style="padding: ${content.values?.containerPadding || "10px"}; text-align: ${content.values?.textAlign || "left"}; line-height: ${content.values?.lineHeight || "160%"};">${content.values?.text || ""}</div>`
        } else if (content.type === "button") {
          const colors = content.values?.buttonColors || {}
          html += `<div style="padding: ${content.values?.containerPadding || "10px"}; text-align: center;"><div style="display: inline-block; padding: ${content.values?.padding || "12px 30px"}; background-color: ${colors.backgroundColor || "#1a1a1a"}; color: ${colors.color || "#fff"}; border-radius: ${content.values?.borderRadius || "4px"}; font-size: 14px;">${content.values?.text || "Button"}</div></div>`
        } else if (content.type === "image") {
          const src = content.values?.src?.url || ""
          if (src) {
            html += `<div style="padding: ${content.values?.containerPadding || "0px"}; text-align: center;"><img src="${src}" alt="${content.values?.altText || ""}" style="max-width: 100%; height: auto;" /></div>`
          }
        }
      }
    }
  }

  const bgColor = body.values?.backgroundColor || "#f5f5f5"
  return `<div style="background-color: ${bgColor}; padding: 10px; font-family: Arial, sans-serif;">${html}</div>`
}

function NewTemplatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentBrand } = useBrand()
  const emailBuilderRef = useRef<EmailBuilderRef>(null)

  const [step, setStep] = useState<Step>("select")
  const [selectedPreset, setSelectedPreset] = useState<PresetTemplate | null>(null)
  const [configPreset, setConfigPreset] = useState<PresetTemplate | null>(null)
  const [editorReady, setEditorReady] = useState(false)

  const [name, setName] = useState("")
  const [templateKey, setTemplateKey] = useState("")
  const [subject, setSubject] = useState("")
  const [category, setCategory] = useState<TemplateCategory>("campaign")

  const canOpenEditor = name.trim() && templateKey && subject.trim() && category

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!emailBuilderRef.current) throw new Error("Editor not ready")
      const { html, design } = await emailBuilderRef.current.exportHtml()
      return emailTemplatesApi.create({
        brand: currentBrand,
        templateKey: templateKey as TemplateKey,
        name,
        subject,
        htmlContent: html,
        designJson: design,
        category,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] })
      toast.success("Template created successfully!")
      navigate({ to: "/templates" })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create template")
    },
  })

  const openConfigModal = (preset: PresetTemplate, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setSelectedPreset(preset)
    setConfigPreset(preset)
  }

  const handleOpenEditor = () => {
    if (!canOpenEditor) return
    setConfigPreset(null)
    setStep("design")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (step === "design") setStep("select")
            else navigate({ to: "/templates" })
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {step === "design" ? "Back to Templates" : "Back"}
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Template</h1>
          <p className="text-sm text-muted-foreground">
            {step === "select"
              ? "Choose a starting template"
              : "Design your email"}
          </p>
        </div>
      </div>

      {/* Step 1: Template Grid */}
      {step === "select" && (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {presetTemplates.map((preset) => {
            const isSelected = selectedPreset?.id === preset.id
            return (
              <Card
                key={preset.id}
                className={`cursor-pointer transition-all duration-200 group relative ${
                  isSelected
                    ? "border-4 border-foreground shadow-xl -translate-y-1"
                    : "hover:-translate-y-1 hover:shadow-lg hover:border-foreground"
                }`}
                onClick={() => setSelectedPreset(preset)}
              >
                {/* Thumbnail */}
                <div className="relative aspect-[4/3] overflow-hidden border-b-2 border-foreground bg-muted">
                  <div
                    className="pointer-events-none origin-top-left scale-[0.35] absolute inset-0"
                    style={{ width: "286%", height: "286%" }}
                  >
                    <div
                      className="h-full w-full bg-white"
                      dangerouslySetInnerHTML={{
                        __html: generatePreviewHtml(preset.design),
                      }}
                    />
                  </div>

                  {/* Preview on hover */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/5">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="opacity-0 transition-opacity group-hover:opacity-100 shadow-md"
                      onClick={(e) => openConfigModal(preset, e)}
                    >
                      <Eye className="mr-2 h-3.5 w-3.5" />
                      Preview
                    </Button>
                  </div>

                  {/* Selected checkmark */}
                  {isSelected && (
                    <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center border-2 border-foreground bg-primary shadow-sm">
                      <Check className="h-5 w-5 text-primary-foreground font-bold" />
                    </div>
                  )}
                </div>

                <CardHeader className="pb-2 pt-5">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl drop-shadow-sm">
                      {preset.thumbnail}
                    </span>
                    <div>
                      <CardTitle className="text-lg font-bold tracking-tight uppercase">
                        {preset.name}
                      </CardTitle>
                      <Badge className="mt-1.5 text-xs font-bold uppercase tracking-wider border-2 shadow-sm">
                        {preset.category}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pb-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {preset.description}
                  </p>

                  {isSelected && (
                    <Button
                      className="w-full mt-2"
                      onClick={(e) => openConfigModal(preset, e)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Use this Template
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Configure + Preview Dialog — horizontal split */}
      <Dialog
        open={!!configPreset}
        onOpenChange={(open) => !open && setConfigPreset(null)}
      >
        <DialogContent
          showCloseButton={false}
          className="w-[95vw] max-w-[1300px] h-[85vh] p-0 overflow-hidden gap-0 sm:max-w-[1300px]"
        >
          <div className="flex h-full">
            {/* Left: Preview */}
            <div className="flex-1 overflow-y-auto bg-muted border-r p-8 flex flex-col gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Template Preview
                </p>
                <p className="text-xl font-bold mt-0.5">{configPreset?.name}</p>
              </div>
              <div
                className="mx-auto w-full border-2 border-foreground bg-white shadow-md"
                style={{ maxWidth: 620 }}
                dangerouslySetInnerHTML={{
                  __html: configPreset
                    ? generatePreviewHtml(configPreset.design)
                    : "",
                }}
              />
            </div>

            {/* Right: Form — fixed 400px wide */}
            <div className="w-[400px] shrink-0 flex flex-col">
              <div className="p-6 pb-4 border-b">
                <p className="text-lg font-bold">Configure Template</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Fill in the details, then open the visual editor.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="modal-name">
                    Template Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="modal-name"
                    placeholder="Welcome Email v1"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>
                    Template Key <span className="text-destructive">*</span>
                  </Label>
                  <Select value={templateKey} onValueChange={(v) => setTemplateKey(v ?? "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select key" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subscriber_confirmation">
                        subscriber_confirmation
                      </SelectItem>
                      <SelectItem value="unsubscribe_confirmation">
                        unsubscribe_confirmation
                      </SelectItem>
                      <SelectItem value="user_invite">user_invite</SelectItem>
                      <SelectItem value="password_reset">
                        password_reset
                      </SelectItem>
                      <SelectItem value="campaign_default">
                        campaign_default
                      </SelectItem>
                      <SelectItem value="campaign_test">
                        campaign_test
                      </SelectItem>
                      <SelectItem value="admin_new_subscriber_notification">
                        admin_notification
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="modal-subject">
                    Email Subject <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="modal-subject"
                    placeholder="Welcome to {{brandName}}!"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select
                    value={category}
                    onValueChange={(v) => setCategory(v as TemplateCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="auth">Auth</SelectItem>
                      <SelectItem value="campaign">Campaign</SelectItem>
                      <SelectItem value="notification">Notification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-6 pt-4 border-t space-y-2">
                <Button
                  className="w-full"
                  size="lg"
                  disabled={!canOpenEditor}
                  onClick={handleOpenEditor}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Open Visual Editor
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setConfigPreset(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Step 2: Visual Designer */}
      {step === "design" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border bg-card p-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">{selectedPreset?.thumbnail}</span>
              <div>
                <p className="text-sm font-medium">{name}</p>
                <p className="text-xs text-muted-foreground">{subject}</p>
              </div>
            </div>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !editorReady}
            >
              {createMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Save Template
            </Button>
          </div>

          <EmailBuilder
            ref={emailBuilderRef}
            designJson={selectedPreset?.design}
            minHeight="750px"
            onReady={() => setEditorReady(true)}
          />
        </div>
      )}
    </div>
  )
}
