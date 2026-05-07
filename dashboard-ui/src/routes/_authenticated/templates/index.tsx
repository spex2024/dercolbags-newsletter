import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { emailTemplatesApi } from "@/services/api/email-templates"
import { useBrand } from "@/contexts/BrandContext"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Eye, Copy, Edit } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { toast } from "sonner"
import type { TemplateCategory, TemplateStatus } from "@/services/api/types"

export const Route = createFileRoute("/_authenticated/templates/")({
  beforeLoad: ({ context }) => requirePageAccess(context, "templates"),
  component: TemplatesPage,
})

const STATUS_STYLES: Record<TemplateStatus, string> = {
  draft: "bg-secondary text-secondary-foreground",
  active: "bg-foreground text-background",
  archived: "border border-foreground/20 text-muted-foreground",
}

const CATEGORY_STYLES: Record<string, string> = {
  system: "bg-foreground/8 text-foreground",
  auth: "bg-foreground/8 text-foreground",
  campaign: "bg-foreground text-background",
  notification: "bg-secondary text-secondary-foreground",
}

function TemplatesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentBrand } = useBrand()
  const [category, setCategory] = useState<TemplateCategory | "all">("all")
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | "all">("all")

  const { data, isLoading } = useQuery({
    queryKey: ["email-templates", currentBrand, category, statusFilter],
    queryFn: () =>
      emailTemplatesApi.list({
        brand: currentBrand,
        category: category === "all" ? undefined : category,
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
  })

  const duplicateMutation = useMutation({
    mutationFn: emailTemplatesApi.duplicate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] })
      toast.success("Template duplicated")
    },
    onError: () => toast.error("Failed to duplicate template"),
  })

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 pb-6 border-b-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1">
            Content
          </p>
          <h1 className="text-4xl font-black tracking-tight">Email Templates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Design and manage reusable email templates
          </p>
        </div>
        <Button
          className="mt-1 shadow-md hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all shrink-0"
          onClick={() => navigate({ to: "/templates/new" })}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select
          value={category}
          onValueChange={(v) => setCategory(v as TemplateCategory | "all")}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="auth">Auth</SelectItem>
            <SelectItem value="campaign">Campaign</SelectItem>
            <SelectItem value="notification">Notification</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as TemplateStatus | "all")}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border-2 border-foreground shadow-[4px_4px_0px_0px_oklch(0.1_0_0)]">
        <Table>
          <TableHeader>
            <TableRow className="bg-foreground hover:bg-foreground border-b-2 border-foreground">
              <TableHead className="text-background text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto">
                Name
              </TableHead>
              <TableHead className="hidden md:table-cell text-background text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto">
                Template Key
              </TableHead>
              <TableHead className="text-background text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto">
                Category
              </TableHead>
              <TableHead className="text-background text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto">
                Status
              </TableHead>
              <TableHead className="hidden lg:table-cell text-background text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto">
                Updated
              </TableHead>
              <TableHead className="text-right text-background text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i} className="border-b">
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Skeleton className="h-7 w-7" />
                      <Skeleton className="h-7 w-7" />
                      <Skeleton className="h-7 w-7" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : !data?.data?.items?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <p className="text-sm text-muted-foreground">No templates found</p>
                </TableCell>
              </TableRow>
            ) : (
              data.data.items.map((template) => (
                <TableRow key={template.id} className="border-b hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <p className="font-semibold text-sm">{template.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                      {template.subject}
                    </p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <code className="bg-muted px-1.5 py-0.5 text-[11px] font-mono">
                      {template.templateKey}
                    </code>
                  </TableCell>
                  <TableCell>
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 ${CATEGORY_STYLES[template.category] ?? "bg-secondary text-secondary-foreground"}`}>
                      {template.category}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 ${STATUS_STYLES[template.status]}`}>
                      {template.status}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {format(new Date(template.updatedAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Preview">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Duplicate"
                        onClick={() => duplicateMutation.mutate(template.id)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Edit"
                        onClick={() =>
                          navigate({ to: "/templates/$id", params: { id: template.id } })
                        }
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
