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
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2, Check, Eye, Pencil, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import type { TemplateCategory, TemplateKey } from "@/services/api/types"

export const Route = createFileRoute("/_authenticated/templates/new")({
  beforeLoad: ({ context }) => requirePageAccess(context, "templates"),
  component: NewTemplatePage,
})

type Step = "select" | "design"

const SUGGESTED_KEYS = [
  { key: "welcome_email",         label: "Welcome Email" },
  { key: "monthly_newsletter",    label: "Monthly Newsletter" },
  { key: "flash_sale",            label: "Flash Sale" },
  { key: "product_launch",        label: "Product Launch" },
  { key: "re_engagement",         label: "Re-engagement" },
  { key: "event_invite",          label: "Event Invite" },
  { key: "thank_you",             label: "Thank You" },
  { key: "abandoned_cart",        label: "Abandoned Cart" },
  { key: "loyalty_reward",        label: "Loyalty Reward" },
  { key: "feedback_survey",       label: "Feedback Survey" },
  { key: "referral_program",      label: "Referral Program" },
  { key: "seasonal_campaign",     label: "Seasonal Campaign" },
  { key: "back_in_stock",         label: "Back in Stock" },
  { key: "weekly_digest",         label: "Weekly Digest" },
  { key: "birthday_special",      label: "Birthday Special" },
  { key: "content_roundup",       label: "Content Roundup" },
  { key: "announcement",          label: "Announcement" },
  { key: "order_confirmation",    label: "Order Confirmation" },
  { key: "promo_code",            label: "Promo Code" },
  { key: "new_collection",        label: "New Collection" },
]

function generatePreviewHtml(design: Record<string, unknown>): string {
  const body = design.body as any
  if (!body?.rows) return `<p style="padding:20px;color:#999;font-family:Arial,sans-serif;">No preview available</p>`

  const bodyBg  = body.values?.backgroundColor || "#f4f4f5"
  const colFont = body.values?.fontFamily?.value || "arial,helvetica,sans-serif"

  let rowsHtml = ""

  for (const row of body.rows) {
    const rowBg  = row.values?.columnsBackgroundColor || row.values?.backgroundColor || ""
    const rowPad = row.values?.padding || "0px"

    let colsHtml = ""
    const cols   = row.columns || []
    const colW   = cols.length > 1 ? `${Math.floor(100 / cols.length)}%` : "100%"

    for (const col of cols) {
      const colBg = col.values?.backgroundColor || "#ffffff"
      let contentsHtml = ""

      for (const c of col.contents || []) {
        const cp = c.values?.containerPadding || "10px"
        const ta = c.values?.textAlign || "left"

        if (c.type === "text") {
          contentsHtml += `<div style="padding:${cp};text-align:${ta};line-height:${c.values?.lineHeight || "160%"};">${c.values?.text || ""}</div>`

        } else if (c.type === "button") {
          const bc = c.values?.buttonColors || {}
          const bp = c.values?.padding || "14px 28px"
          contentsHtml += `<div style="padding:${cp};text-align:center;">
            <div style="display:inline-block;padding:${bp};background:${bc.backgroundColor || "#000"};color:${bc.color || "#fff"};font-size:13px;font-weight:700;">
              ${c.values?.text || "Button"}
            </div></div>`

        } else if (c.type === "image") {
          const src = c.values?.src?.url || ""
          if (src) {
            contentsHtml += `<div style="padding:${cp};text-align:center;">
              <img src="${src}" alt="${c.values?.altText || ""}" style="max-width:100%;height:auto;display:block;margin:0 auto;" />
            </div>`
          }

        } else if (c.type === "divider") {
          const border = c.values?.border || {}
          const color  = border.borderTopColor || "#e5e5e5"
          const width  = border.borderTopWidth || "1px"
          contentsHtml += `<div style="padding:${cp};">
            <div style="border-top:${width} solid ${color};"></div>
          </div>`
        }
      }

      colsHtml += `<td style="width:${colW};vertical-align:top;background:${colBg};">${contentsHtml}</td>`
    }

    rowsHtml += `<tr style="background:${rowBg};">
      <td style="padding:${rowPad};">
        <table width="100%" cellpadding="0" cellspacing="0">${colsHtml}</table>
      </td>
    </tr>`
  }

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:${bodyBg};font-family:${colFont};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${bodyBg};">
    ${rowsHtml}
  </table>
</body></html>`
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
  const [keyDropdownOpen, setKeyDropdownOpen] = useState(false)
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
    // reset form only when switching to a different template
    if (preset.id !== selectedPreset?.id) {
      setName("")
      setTemplateKey("")
      setSubject("")
      setCategory("campaign")
      setKeyDropdownOpen(false)
    }
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
          className="w-[95vw] max-w-[1200px] p-0 overflow-hidden gap-0 sm:max-w-[1200px]"
          style={{ height: "88vh" }}
        >
          <div className="flex h-full overflow-hidden">

            {/* ── Left: scrollable preview ── */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden border-r-2 border-foreground">
              {/* sticky label */}
              <div className="shrink-0 bg-foreground text-background px-6 py-4">
                <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-background/50 mb-0.5">
                  Template Preview
                </p>
                <p className="text-base font-black">{configPreset?.name}</p>
              </div>
              {/* scrollable area — left side only */}
              <div className="flex-1 overflow-y-auto bg-muted/40 p-6">
                <div
                  className="mx-auto bg-white border-2 border-foreground/10 shadow-md"
                  style={{ maxWidth: 600 }}
                  dangerouslySetInnerHTML={{
                    __html: configPreset ? generatePreviewHtml(configPreset.design) : "",
                  }}
                />
              </div>
            </div>

            {/* ── Right: fixed form panel — never scrolls with preview ── */}
            <div className="w-[380px] shrink-0 flex flex-col overflow-hidden">
              {/* header */}
              <div className="shrink-0 px-6 py-5 border-b-2 border-foreground">
                <p className="text-base font-black">Configure Template</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Set the details, then open the visual editor.
                </p>
              </div>

              {/* scrollable fields */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                    Template Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. May Day Promo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                    Template Key <span className="text-destructive">*</span>
                  </Label>
                  {/* Combobox — select from suggestions OR type a custom key */}
                  <div className="relative">
                    <div className="flex border-2 border-input focus-within:border-foreground transition-colors">
                      <input
                        className="flex-1 bg-transparent px-3 py-2 text-sm font-mono outline-none placeholder:text-muted-foreground"
                        placeholder="e.g. may_day_promo"
                        value={templateKey}
                        onChange={(e) =>
                          setTemplateKey(
                            e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
                          )
                        }
                        onFocus={() => setKeyDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setKeyDropdownOpen(false), 150)}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        className="px-2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setKeyDropdownOpen((v) => !v)}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>

                    {keyDropdownOpen && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1 border-2 border-foreground bg-background shadow-[4px_4px_0px_0px_oklch(0.1_0_0)] max-h-52 overflow-y-auto">
                        <div className="px-3 py-2 border-b border-foreground/10">
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Common Keys</p>
                        </div>
                        {SUGGESTED_KEYS
                          .filter((s) => !templateKey || s.key.includes(templateKey) || s.label.toLowerCase().includes(templateKey))
                          .map((s) => (
                            <button
                              key={s.key}
                              type="button"
                              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/40 transition-colors"
                              onMouseDown={() => setTemplateKey(s.key)}
                            >
                              <span className="text-sm font-medium">{s.label}</span>
                              <code className="text-[11px] text-muted-foreground font-mono">{s.key}</code>
                            </button>
                          ))
                        }
                        {templateKey && !SUGGESTED_KEYS.some((s) => s.key === templateKey) && (
                          <div className="px-3 py-2 border-t border-foreground/10 bg-muted/20">
                            <p className="text-[11px] text-muted-foreground">
                              Custom key: <code className="font-mono text-foreground">{templateKey}</code>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Pick a suggestion or type your own — lowercase and underscores only.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                    Email Subject <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Don't miss our May Day sale!"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                    Category
                  </Label>
                  <Select
                    value={category}
                    onValueChange={(v) => setCategory(v as TemplateCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="campaign">Campaign</SelectItem>
                      <SelectItem value="notification">Notification</SelectItem>
                      <SelectItem value="auth">Auth</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Use <strong>Campaign</strong> for marketing emails.
                  </p>
                </div>
              </div>

              {/* pinned footer */}
              <div className="shrink-0 px-6 py-4 border-t-2 border-foreground space-y-2 bg-muted/20">
                {!canOpenEditor && (
                  <p className="text-[11px] text-muted-foreground text-center">
                    Fill in all required fields to continue.
                  </p>
                )}
                <Button
                  className="w-full shadow-md hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
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
