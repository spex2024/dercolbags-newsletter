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
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Eye, Copy, Edit } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { toast } from "sonner"
import type { TemplateCategory, TemplateStatus } from "@/services/api/types"

export const Route = createFileRoute("/_authenticated/templates/")({
  beforeLoad: ({ context }) => requirePageAccess(context, "templates"),
  component: TemplatesPage,
})

function TemplatesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentBrand } = useBrand()
  const [category, setCategory] = useState<TemplateCategory | "all">("all")
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | "all">(
    "all",
  )

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

  const getStatusVariant = (s: TemplateStatus) => {
    const map = { draft: "secondary", active: "default", archived: "outline" } as const
    return map[s] || "secondary"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Email Templates
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your email templates
          </p>
        </div>
        <Button onClick={() => navigate({ to: "/templates/new" })}>
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      <div className="flex gap-4">
        <Select
          value={category}
          onValueChange={(v) => setCategory(v as TemplateCategory | "all")}
        >
          <SelectTrigger className="w-40">
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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Key</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-32 font-mono" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-8 w-8 rounded" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : !data?.data?.items?.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <div className="text-muted-foreground">
                      No templates found
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.data.items.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-xs">
                          {template.subject}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {template.templateKey}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {template.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(template.status)}>
                        {template.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
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
                          onClick={() =>
                            duplicateMutation.mutate(template.id)
                          }
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit"
                          onClick={() =>
                            navigate({
                              to: "/templates/$id",
                              params: { id: template.id },
                            })
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
        </CardContent>
      </Card>
    </div>
  )
}
