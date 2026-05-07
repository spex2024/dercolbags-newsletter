import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { mailingListsApi, type MailingList } from "@/services/api/mailing-lists"
import { useBrand } from "@/contexts/BrandContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowLeft, Loader2, Users, RefreshCw, Zap } from "lucide-react"
import { toast } from "sonner"
import { useState, useEffect, useRef } from "react"

export const Route = createFileRoute("/_authenticated/lists/new")({
  beforeLoad: ({ context }) => requirePageAccess(context, "lists"),
  component: NewListPage,
})

type FilterConfig = NonNullable<MailingList["filterConfig"]>

type PreviewResult = {
  count: number
  sample: Array<{ id: string; name: string | null; email: string }>
}

const STATUSES = ["new", "contacted", "converted", "spam"] as const

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

// ── Filter preview hook ─────────────────────────────────────────────────────
function useFilterPreview(filterConfig: FilterConfig, enabled: boolean) {
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) { setPreview(null); return }

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await mailingListsApi.previewFilter(filterConfig)
        setPreview(res.data)
      } catch {
        setPreview(null)
      } finally {
        setLoading(false)
      }
    }, 500)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [JSON.stringify(filterConfig), enabled])

  return { preview, loading }
}

// ── Filter builder ──────────────────────────────────────────────────────────
function FilterBuilder({
  value,
  onChange,
}: {
  value: FilterConfig
  onChange: (f: FilterConfig) => void
}) {
  const toggle = (key: keyof FilterConfig, val: unknown) =>
    onChange({ ...value, [key]: val })

  const toggleStatus = (s: (typeof STATUSES)[number]) => {
    const current = value.status ?? []
    const next = current.includes(s) ? current.filter((x) => x !== s) : [...current, s]
    onChange({ ...value, status: next.length ? next : undefined })
  }

  return (
    <div className="divide-y-2 divide-foreground/10 border-2 border-foreground/20">
      {/* Subscription */}
      <div className="grid grid-cols-[160px_1fr] divide-x-2 divide-foreground/10">
        <div className="px-4 py-4 bg-muted/20 flex items-center">
          <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground">
            Subscription
          </p>
        </div>
        <div className="px-4 py-4 flex items-center gap-6">
          {([undefined, true, false] as const).map((val, i) => {
            const label = i === 0 ? "All" : i === 1 ? "Active only" : "Unsubscribed only"
            const isSelected = value.isSubscribed === val
            return (
              <button
                key={label}
                type="button"
                onClick={() => onChange({ ...value, isSubscribed: val })}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${isSelected ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <div className={`h-4 w-4 border-2 flex items-center justify-center ${isSelected ? "border-foreground bg-foreground" : "border-foreground/30"}`}>
                  {isSelected && <div className="h-2 w-2 bg-background" />}
                </div>
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Contact status */}
      <div className="grid grid-cols-[160px_1fr] divide-x-2 divide-foreground/10">
        <div className="px-4 py-4 bg-muted/20 flex items-center">
          <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground">
            Status
          </p>
        </div>
        <div className="px-4 py-4 flex flex-wrap items-center gap-4">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleStatus(s)}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${(value.status ?? []).includes(s) ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <div className={`h-4 w-4 border-2 flex items-center justify-center ${(value.status ?? []).includes(s) ? "border-foreground bg-foreground" : "border-foreground/30"}`}>
                {(value.status ?? []).includes(s) && <div className="h-2 w-2 bg-background" />}
              </div>
              <span className="capitalize">{s}</span>
            </button>
          ))}
          {(value.status?.length ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => onChange({ ...value, status: undefined })}
              className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Location */}
      <div className="grid grid-cols-[160px_1fr] divide-x-2 divide-foreground/10">
        <div className="px-4 py-4 bg-muted/20 flex items-center">
          <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground">
            Location
          </p>
        </div>
        <div className="px-4 py-3">
          <Input
            placeholder="e.g. Accra, London…"
            value={value.location ?? ""}
            onChange={(e) => toggle("location", e.target.value || undefined)}
            className="max-w-xs border-foreground/20 focus:border-foreground"
          />
        </div>
      </div>

      {/* Date added */}
      <div className="grid grid-cols-[160px_1fr] divide-x-2 divide-foreground/10">
        <div className="px-4 py-4 bg-muted/20 flex items-center">
          <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground">
            Added
          </p>
        </div>
        <div className="px-4 py-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-muted-foreground">From</span>
          <Input
            type="date"
            value={value.createdAtFrom ?? ""}
            onChange={(e) => toggle("createdAtFrom", e.target.value || undefined)}
            className="w-auto border-foreground/20 focus:border-foreground"
          />
          <span className="text-[11px] text-muted-foreground">to</span>
          <Input
            type="date"
            value={value.createdAtTo ?? ""}
            onChange={(e) => toggle("createdAtTo", e.target.value || undefined)}
            className="w-auto border-foreground/20 focus:border-foreground"
          />
        </div>
      </div>

      {/* Last email sent */}
      <div className="grid grid-cols-[160px_1fr] divide-x-2 divide-foreground/10">
        <div className="px-4 py-4 bg-muted/20 flex items-center">
          <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground leading-tight">
            Last Email
          </p>
        </div>
        <div className="px-4 py-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-muted-foreground">After</span>
          <Input
            type="date"
            value={value.lastEmailSentAfter ?? ""}
            onChange={(e) => toggle("lastEmailSentAfter", e.target.value || undefined)}
            className="w-auto border-foreground/20 focus:border-foreground"
          />
          <span className="text-[11px] text-muted-foreground">before</span>
          <Input
            type="date"
            value={value.lastEmailSentBefore ?? ""}
            onChange={(e) => toggle("lastEmailSentBefore", e.target.value || undefined)}
            className="w-auto border-foreground/20 focus:border-foreground"
          />
        </div>
      </div>
    </div>
  )
}

// ── Filter preview panel ────────────────────────────────────────────────────
function FilterPreview({ filterConfig }: { filterConfig: FilterConfig }) {
  const { preview, loading } = useFilterPreview(filterConfig, true)

  return (
    <div className="border-2 border-foreground shadow-[4px_4px_0px_0px_oklch(0.1_0_0)]">
      <div className="bg-foreground text-background px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5" />
          <p className="text-[10px] uppercase tracking-[0.15em] font-bold">Filter Preview</p>
        </div>
        {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
      </div>
      <div className="p-5">
        {preview === null && !loading ? (
          <p className="text-sm text-muted-foreground">Set filters above to preview matching subscribers.</p>
        ) : loading && preview === null ? (
          <p className="text-sm text-muted-foreground">Counting…</p>
        ) : preview ? (
          <div className="space-y-3">
            <div>
              <p className="text-5xl font-black tabular-nums leading-none">{preview.count.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">subscribers match</p>
            </div>
            {preview.sample.length > 0 && (
              <div className="border-t pt-3 space-y-1.5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Sample</p>
                {preview.sample.map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <div className="h-5 w-5 shrink-0 flex items-center justify-center bg-foreground text-background text-[10px] font-black">
                      {(s.name?.[0] ?? s.email[0]).toUpperCase()}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {s.name || s.email}
                    </p>
                  </div>
                ))}
                {preview.count > 5 && (
                  <p className="text-[11px] text-muted-foreground">
                    +{(preview.count - 5).toLocaleString()} more
                  </p>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────
function NewListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentBrand } = useBrand()

  const [isDynamic, setIsDynamic] = useState(false)
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({})

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const isFilterEmpty = Object.values(filterConfig).every(
    (v) => v === undefined || (Array.isArray(v) && v.length === 0),
  )

  const createMutation = useMutation({
    mutationFn: (data: FormValues) =>
      mailingListsApi.create({
        ...data,
        brand: currentBrand,
        isDynamic,
        filterConfig: isDynamic && !isFilterEmpty ? filterConfig : undefined,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["mailing-lists"] })
      toast.success("Mailing list created")
      navigate({ to: "/lists/$id", params: { id: res.data.id } })
    },
    onError: (err: Error) => toast.error(err.message || "Failed to create list"),
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => navigate({ to: "/lists" })}
      >
        <ArrowLeft className="h-4 w-4" />
        Mailing Lists
      </button>

      <div className="border-2 border-foreground shadow-[6px_6px_0px_0px_oklch(0.1_0_0)] divide-y-2 divide-foreground">
        {/* Header */}
        <div className="bg-foreground text-background px-8 py-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-background/40 mb-1">Audience</p>
          <h1 className="text-2xl font-black tracking-tight">Create Mailing List</h1>
          <p className="mt-1 text-sm text-background/60">
            For {currentBrand === "watpak" ? "WatPak" : "DercolBags"}
          </p>
        </div>

        {/* Form */}
        <form
          id="new-list-form"
          onSubmit={handleSubmit((data) => createMutation.mutate(data))}
          className="p-8 space-y-6"
        >
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-widest">
              List Name <span className="text-destructive">*</span>
            </Label>
            <Input placeholder="VIP Customers" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-widest">Description (optional)</Label>
            <Textarea
              placeholder="A list of our most engaged subscribers…"
              rows={2}
              {...register("description")}
            />
          </div>

          {/* Dynamic toggle */}
          <button
            type="button"
            onClick={() => setIsDynamic((d) => !d)}
            className={`w-full flex items-start gap-4 p-4 border-2 text-left transition-all ${
              isDynamic
                ? "border-foreground bg-foreground/5 shadow-sm"
                : "border-foreground/20 hover:border-foreground/40"
            }`}
          >
            <div className={`mt-0.5 shrink-0 flex h-5 w-5 items-center justify-center border-2 ${isDynamic ? "border-foreground bg-foreground" : "border-foreground/30"}`}>
              {isDynamic && <Zap className="h-3 w-3 text-background" />}
            </div>
            <div>
              <p className={`text-sm font-bold ${isDynamic ? "text-foreground" : "text-muted-foreground"}`}>
                Dynamic List
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Automatically updates — subscribers matching your filters are always included
              </p>
            </div>
          </button>
        </form>

        {/* Filter builder */}
        {isDynamic && (
          <div className="p-8 space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] font-bold mb-1">Filters</p>
              <p className="text-[11px] text-muted-foreground">
                Leave all filters empty to match all subscribers automatically.
              </p>
            </div>
            <FilterBuilder value={filterConfig} onChange={setFilterConfig} />
          </div>
        )}

        {/* Preview */}
        {isDynamic && (
          <div className="px-8 pb-8">
            <FilterPreview filterConfig={filterConfig} />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between px-8 py-5 bg-muted/20">
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => navigate({ to: "/lists" })}
          >
            Cancel
          </button>
          <Button
            type="submit"
            form="new-list-form"
            disabled={createMutation.isPending}
            className="shadow-md hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create List
          </Button>
        </div>
      </div>
    </div>
  )
}
