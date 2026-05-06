import { useState, useRef } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { emailTemplatesApi } from "@/services/api/email-templates"
import { EmailBuilder, type EmailBuilderRef } from "@/components/EmailBuilder"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Loader2, Save, Eye, Pencil } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

export const Route = createFileRoute("/_authenticated/templates/$id")({
  beforeLoad: ({ context }) => requirePageAccess(context, "templates"),
  component: TemplateDetailPage,
})

function TemplateDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const emailBuilderRef = useRef<EmailBuilderRef>(null)
  const [editorReady, setEditorReady] = useState(false)
  const [activeTab, setActiveTab] = useState("preview")

  const { data, isLoading } = useQuery({
    queryKey: ["email-template", id],
    queryFn: () => emailTemplatesApi.get(id),
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!emailBuilderRef.current) throw new Error("Editor not ready")
      const { html, design } = await emailBuilderRef.current.exportHtml()
      return emailTemplatesApi.update(id, {
        htmlContent: html,
        designJson: design,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-template", id] })
      queryClient.invalidateQueries({ queryKey: ["email-templates"] })
      toast.success("Template saved!")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save template")
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const template = data?.data
  if (!template) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Template not found</p>
      </div>
    )
  }

  const hasDesignJson =
    template.designJson && Object.keys(template.designJson).length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/templates" })}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {template.name}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {template.category}
              </Badge>
              <Badge
                variant={
                  template.status === "active" ? "default" : "secondary"
                }
              >
                {template.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Updated{" "}
                {format(new Date(template.updatedAt), "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </div>

        {activeTab === "editor" && (
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending || !editorReady}
          >
            {updateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        )}
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="py-4">
          <div className="grid gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Template Key</p>
              <code className="mt-1 block rounded bg-muted px-2 py-0.5 text-xs">
                {template.templateKey}
              </code>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Subject</p>
              <p className="mt-1 truncate">{template.subject}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Brand</p>
              <p className="mt-1 capitalize">{template.brand}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="mt-1">
                {format(new Date(template.createdAt), "MMM d, yyyy")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Preview / Editor */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="preview">
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </TabsTrigger>
          {hasDesignJson && (
            <TabsTrigger value="editor">
              <Pencil className="mr-2 h-4 w-4" />
              Visual Editor
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="preview" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="mx-auto max-w-[620px] p-6">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: template.htmlContent,
                  }}
                />
              </div>
            </CardContent>
          </Card>
          {!hasDesignJson && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              This template was created with raw HTML. To edit visually,
              create a new template using the visual designer.
            </p>
          )}
        </TabsContent>

        {hasDesignJson && (
          <TabsContent value="editor" className="mt-4">
            <EmailBuilder
              ref={emailBuilderRef}
              designJson={template.designJson}
              minHeight="750px"
              onReady={() => setEditorReady(true)}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
