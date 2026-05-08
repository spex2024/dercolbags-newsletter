import { useState, useRef } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { emailTemplatesApi } from "@/services/api/email-templates"
import { EmailBuilder, type EmailBuilderRef } from "@/components/EmailBuilder"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, Save, Eye, Pencil, Tag, Calendar, Hash } from "lucide-react"
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

function TemplateDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const emailBuilderRef = useRef<EmailBuilderRef>(null)
  const [editorReady, setEditorReady] = useState(false)
  const [activeTab, setActiveTab] = useState<"preview" | "editor">("preview")

  const { data, isLoading } = useQuery({
    queryKey: ["email-template", id],
    queryFn: () => emailTemplatesApi.get(id),
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!emailBuilderRef.current) throw new Error("Editor not ready")
      const { html, design } = await emailBuilderRef.current.exportHtml()
      return emailTemplatesApi.update(id, { htmlContent: html, designJson: design })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-template", id] })
      queryClient.invalidateQueries({ queryKey: ["email-templates"] })
      toast.success("Template saved")
    },
    onError: (error: Error) => toast.error(error.message || "Failed to save template"),
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
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 border-2">
        <p className="text-4xl font-black">404</p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Template not found</p>
      </div>
    )
  }

  const hasDesignJson = template.designJson && Object.keys(template.designJson).length > 0

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

        {activeTab === "editor" && (
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending || !editorReady}
            className="shadow-md hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            {updateMutation.isPending
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Save className="mr-2 h-4 w-4" />
            }
            Save Changes
          </Button>
        )}
      </div>

      {/* Main block */}
      <div className="border-2 border-foreground shadow-[6px_6px_0px_0px_oklch(0.1_0_0)] divide-y-2 divide-foreground">

        {/* Hero */}
        <div className="bg-foreground text-background px-8 pt-8 pb-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-background/40 mb-2">
                Email Template
              </p>
              <h1 className="text-3xl font-black tracking-tight leading-tight">
                {template.name}
              </h1>
              <p className="mt-2 text-base text-background/60 truncate">{template.subject}</p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1 border ${STATUS_STYLE[template.status] ?? "border-foreground/20 bg-foreground/5 text-foreground"}`}>
                {template.status}
              </span>
              <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1 border ${CATEGORY_STYLE[template.category] ?? "border-foreground/20 text-muted-foreground"}`}>
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
            <code className="text-xs font-mono font-bold">{template.templateKey}</code>
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
        <div className="flex border-b-0">
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-2 px-6 py-3 text-[11px] font-bold uppercase tracking-wider border-r-2 border-foreground transition-colors ${
              activeTab === "preview"
                ? "bg-foreground text-background"
                : "hover:bg-muted/40 text-muted-foreground"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </button>
          {hasDesignJson && (
            <button
              onClick={() => setActiveTab("editor")}
              className={`flex items-center gap-2 px-6 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                activeTab === "editor"
                  ? "bg-foreground text-background"
                  : "hover:bg-muted/40 text-muted-foreground"
              }`}
            >
              <Pencil className="h-3.5 w-3.5" />
              Visual Editor
            </button>
          )}
        </div>

        {/* Tab content */}
        {activeTab === "preview" && (
          <div className="bg-muted/20">
            <div className="mx-auto max-w-[620px] p-8">
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: template.htmlContent }}
              />
            </div>
            {!hasDesignJson && (
              <p className="pb-6 text-center text-xs text-muted-foreground">
                Raw HTML template — create a new template with the visual designer to edit visually.
              </p>
            )}
          </div>
        )}

        {hasDesignJson && activeTab === "editor" && (
          <div>
            <EmailBuilder
              ref={emailBuilderRef}
              designJson={template.designJson}
              minHeight="750px"
              onReady={() => setEditorReady(true)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
