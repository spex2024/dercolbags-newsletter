import { useState, useRef } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { campaignsApi } from "@/services/api/campaigns"
import { emailTemplatesApi } from "@/services/api/email-templates"
import { mailingListsApi } from "@/services/api/mailing-lists"
import { useBrand } from "@/contexts/BrandContext"
import { EmailBuilder, type EmailBuilderRef } from "@/components/EmailBuilder"
import { presetTemplates, CATEGORY_LABEL } from "@/lib/template-presets"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Clock,
  Save,
  FileText,
} from "lucide-react"
import { toast } from "sonner"

export const Route = createFileRoute("/_authenticated/campaigns/new")({
  beforeLoad: ({ context }) => requirePageAccess(context, "campaigns"),
  component: NewCampaignPage,
})

const detailsSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  subject: z.string().min(1, "Email subject is required"),
  preheader: z.string().optional(),
  targetType: z.enum(["all", "list"]),
  targetId: z.string().optional(),
})

type DetailsForm = z.infer<typeof detailsSchema>

type SelectedTemplate = {
  designJson: Record<string, unknown>
  label: string
}

// ── Step indicator ──────────────────────────────────────────────────────────
function StepBar({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1 as const, label: "Details", desc: "Name, subject, audience" },
    { n: 2 as const, label: "Template", desc: "Choose email design" },
    { n: 3 as const, label: "Design", desc: "Edit & save" },
  ]
  return (
    <div className="flex border-2 border-foreground shadow-[4px_4px_0px_0px_oklch(0.1_0_0)]">
      {steps.map((s, i) => {
        const done = current > s.n
        const active = current === s.n
        return (
          <div
            key={s.n}
            className={`flex flex-1 items-center gap-3 px-5 py-4 ${
              i < steps.length - 1 ? "border-r-2 border-foreground" : ""
            } ${active ? "bg-foreground text-background" : done ? "bg-muted/30" : ""}`}
          >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center border-2 text-sm font-black ${
              active
                ? "border-background bg-background text-foreground"
                : done
                  ? "border-foreground/30 bg-foreground/10 text-foreground/50"
                  : "border-muted-foreground/30 text-muted-foreground"
            }`}>
              {done ? <Check className="h-4 w-4" /> : s.n}
            </div>
            <div className="hidden sm:block min-w-0">
              <p className={`text-[10px] uppercase tracking-[0.15em] font-bold ${active ? "text-background" : done ? "text-foreground/50" : "text-muted-foreground"}`}>
                {s.label}
              </p>
              <p className={`text-[11px] truncate ${active ? "text-background/70" : "text-muted-foreground"}`}>
                {s.desc}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const CATEGORY_BG: Record<string, string> = {
  welcome:      "bg-emerald-800",
  newsletter:   "bg-blue-900",
  promotion:    "bg-red-900",
  notification: "bg-zinc-800",
  minimal:      "bg-zinc-600",
  reengagement: "bg-violet-900",
  event:        "bg-amber-800",
  ecommerce:    "bg-orange-800",
  loyalty:      "bg-yellow-700",
  feedback:     "bg-cyan-800",
  announcement: "bg-rose-900",
}

// ── Main component ──────────────────────────────────────────────────────────
function NewCampaignPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentBrand } = useBrand()
  const emailBuilderRef = useRef<EmailBuilderRef>(null)

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [editorReady, setEditorReady] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<SelectedTemplate | null>(null)
  const [isScheduling, setIsScheduling] = useState(false)
  const [scheduledDate, setScheduledDate] = useState("")

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { targetType: "all" },
  })

  const targetType = watch("targetType")
  const targetId = watch("targetId") ?? ""

  const { data: listsData } = useQuery({
    queryKey: ["mailing-lists", currentBrand],
    queryFn: () => mailingListsApi.list({ brand: currentBrand }),
  })

  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ["email-templates", currentBrand, "campaign"],
    queryFn: () =>
      emailTemplatesApi.list({ brand: currentBrand, category: "campaign", status: "active" }),
    enabled: step === 2,
  })

  const savedTemplates = templatesData?.data?.items ?? []

  const createMutation = useMutation({
    mutationFn: async (details: DetailsForm) => {
      if (!emailBuilderRef.current) throw new Error("Editor not ready")
      const { html, design } = await emailBuilderRef.current.exportHtml()
      const result = await campaignsApi.create({
        ...details,
        brand: currentBrand,
        content: html,
        designJson: design as Record<string, unknown>,
      })
      if (isScheduling && scheduledDate) {
        await campaignsApi.schedule(result.data.id, new Date(scheduledDate).toISOString())
      }
      return result
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] })
      toast.success("Campaign saved as draft")
      navigate({ to: "/campaigns/$id", params: { id: result.data.id } })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create campaign")
    },
  })

  // ── Step 1: Details ────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <button
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => navigate({ to: "/campaigns" })}
        >
          <ArrowLeft className="h-4 w-4" />
          Campaigns
        </button>

        <StepBar current={1} />

        <div className="border-2 border-foreground shadow-[4px_4px_0px_0px_oklch(0.1_0_0)] divide-y-2 divide-foreground">
          <div className="bg-foreground text-background px-8 py-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-background/40 mb-1">Step 1 of 3</p>
            <h1 className="text-2xl font-black tracking-tight">Campaign Details</h1>
            <p className="mt-1 text-sm text-background/60">Set up the basics before choosing your design.</p>
          </div>

          <form
            id="details-form"
            onSubmit={handleSubmit(() => setStep(2))}
            className="p-8 space-y-6"
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest">
                  Campaign Name <span className="text-destructive">*</span>
                </Label>
                <Input placeholder="Summer Sale 2024" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest">
                  Email Subject <span className="text-destructive">*</span>
                </Label>
                <Input placeholder="Don't miss our summer sale!" {...register("subject")} />
                {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest">Preheader (optional)</Label>
              <Input
                placeholder="Preview text shown after the subject line…"
                {...register("preheader")}
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest">Target Audience</Label>
                <Select
                  value={targetType}
                  onValueChange={(v) => {
                    setValue("targetType", v as "all" | "list")
                    if (v === "all") setValue("targetId", undefined)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subscribers</SelectItem>
                    <SelectItem value="list">Mailing List</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {targetType === "list" && (
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest">Mailing List</Label>
                  <Select
                    value={targetId}
                    onValueChange={(v) => setValue("targetId", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a list" />
                    </SelectTrigger>
                    <SelectContent>
                      {listsData?.data?.items?.length ? (
                        listsData.data.items.map((list) => (
                          <SelectItem key={list.id} value={list.id}>
                            {list.name} ({list.subscriberCount ?? 0})
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                          No mailing lists found
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Schedule */}
            <div className="flex items-center gap-3 border-2 border-dashed border-foreground/20 p-4">
              <Checkbox
                id="schedule"
                checked={isScheduling}
                onCheckedChange={(v) => setIsScheduling(!!v)}
              />
              <Label htmlFor="schedule" className="cursor-pointer text-[10px] uppercase tracking-widest">
                Schedule for later
              </Label>
              {isScheduling && (
                <Input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="ml-auto w-auto"
                />
              )}
            </div>
          </form>

          <div className="flex items-center justify-between px-8 py-5 bg-muted/20">
            <button
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => navigate({ to: "/campaigns" })}
            >
              Cancel
            </button>
            <Button
              type="submit"
              form="details-form"
              className="shadow-md hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              Choose Template
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 2: Template picker ────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <button
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setStep(1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Details
        </button>

        <StepBar current={2} />

        <div className="border-2 border-foreground shadow-[4px_4px_0px_0px_oklch(0.1_0_0)]">
          <div className="bg-foreground text-background px-8 py-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-background/40 mb-1">Step 2 of 3</p>
            <h1 className="text-2xl font-black tracking-tight">Choose a Template</h1>
            <p className="mt-1 text-sm text-background/60">
              Pick an existing campaign template or start from a preset design.
            </p>
          </div>

          <div className="p-6 space-y-8 max-h-[62vh] overflow-y-auto">

            {/* Saved campaign templates */}
            {templatesLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="border-2 h-48 animate-pulse bg-muted/30" />
                ))}
              </div>
            ) : savedTemplates.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-4">
                  Your Campaign Templates
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {savedTemplates.map((t) => {
                    const isSelected = selectedTemplate?.label === t.name
                    return (
                      <button
                        key={t.id}
                        onClick={() =>
                          setSelectedTemplate({
                            designJson: t.designJson as Record<string, unknown>,
                            label: t.name,
                          })
                        }
                        className={`group relative border-2 text-left transition-all hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-lg ${
                          isSelected
                            ? "border-foreground shadow-[4px_4px_0px_0px_oklch(0.1_0_0)]"
                            : "border-foreground/30 hover:border-foreground"
                        }`}
                      >
                        {/* Mini preview */}
                        <div className="relative h-32 overflow-hidden border-b-2 border-inherit bg-muted/20">
                          <div className="pointer-events-none absolute inset-0 origin-top-left scale-[0.3] w-[333%] h-[333%]">
                            <div
                              className="prose prose-sm max-w-none p-4"
                              dangerouslySetInnerHTML={{ __html: t.htmlContent }}
                            />
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center bg-foreground text-background">
                              <Check className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <p className="text-sm font-black">{t.name}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{t.subject}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Preset templates */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-4">
                Start from a Preset
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {presetTemplates.filter((p) => p.id !== "blank").map((preset) => {
                  const isSelected = selectedTemplate?.label === preset.name
                  return (
                    <button
                      key={preset.id}
                      onClick={() =>
                        setSelectedTemplate({ designJson: preset.design, label: preset.name })
                      }
                      className={`group relative border-2 text-left transition-all hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-lg ${
                        isSelected
                          ? "border-foreground shadow-[4px_4px_0px_0px_oklch(0.1_0_0)]"
                          : "border-foreground/30 hover:border-foreground"
                      }`}
                    >
                      <div className={`relative flex h-32 flex-col items-center justify-center border-b-2 border-inherit gap-2 ${CATEGORY_BG[preset.category] ?? "bg-foreground/5"}`}>
                        <span className="text-4xl font-black text-white/20 select-none">
                          {preset.thumbnail}
                        </span>
                        <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-white/60 bg-black/30 px-2 py-0.5">
                          {CATEGORY_LABEL[preset.category] ?? preset.category}
                        </span>
                        {isSelected && (
                          <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center bg-white text-black">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-sm font-black">{preset.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{preset.description}</p>
                      </div>
                    </button>
                  )
                })}

                {/* Blank option */}
                <button
                  onClick={() => setSelectedTemplate({ designJson: {}, label: "Blank" })}
                  className={`group border-2 border-dashed text-left transition-all hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-lg ${
                    selectedTemplate?.label === "Blank"
                      ? "border-foreground shadow-[4px_4px_0px_0px_oklch(0.1_0_0)] border-solid"
                      : "border-foreground/30 hover:border-foreground"
                  }`}
                >
                  <div className="relative flex h-32 flex-col items-center justify-center border-b-2 border-inherit gap-2">
                    <FileText className="h-8 w-8 text-muted-foreground/40" />
                    {selectedTemplate?.label === "Blank" && (
                      <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center bg-foreground text-background">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-black">Blank Canvas</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Start from scratch</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t-2 border-foreground px-8 py-5 bg-muted/20">
            <p className="text-xs text-muted-foreground">
              {selectedTemplate
                ? <>Selected: <span className="font-bold text-foreground">{selectedTemplate.label}</span></>
                : "No template selected"}
            </p>
            <Button
              disabled={!selectedTemplate}
              className="shadow-md hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              onClick={() => { setEditorReady(false); setStep(3) }}
            >
              Open Editor
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 3: Design ─────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => { setEditorReady(false); setStep(2) }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Templates
        </button>

        <div className="flex items-center gap-3">
          {isScheduling && scheduledDate && (
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground border px-2.5 py-1">
              <Clock className="h-3.5 w-3.5" />
              Scheduled
            </span>
          )}
          <Button
            disabled={!editorReady || createMutation.isPending}
            className="shadow-md hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            onClick={() => handleSubmit((details) => createMutation.mutate(details))()}
          >
            {createMutation.isPending
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Save className="mr-2 h-4 w-4" />
            }
            {isScheduling ? "Save & Schedule" : "Save as Draft"}
          </Button>
        </div>
      </div>

      <StepBar current={3} />

      {/* Editor */}
      <div className="border-2 border-foreground shadow-[4px_4px_0px_0px_oklch(0.1_0_0)]">
        <div className="border-b-2 border-foreground bg-foreground px-6 py-3 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-background">
            Visual Editor · {selectedTemplate?.label}
          </p>
          {!editorReady && (
            <div className="flex items-center gap-2 text-background/60">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="text-[11px]">Loading editor…</span>
            </div>
          )}
        </div>
        <EmailBuilder
          ref={emailBuilderRef}
          designJson={selectedTemplate?.designJson && Object.keys(selectedTemplate.designJson).length > 0
            ? selectedTemplate.designJson
            : undefined
          }
          minHeight="750px"
          onReady={() => setEditorReady(true)}
        />
      </div>
    </div>
  )
}
