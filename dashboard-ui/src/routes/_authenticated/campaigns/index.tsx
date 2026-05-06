import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useQuery } from "@tanstack/react-query"
import { campaignsApi } from "@/services/api/campaigns"
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
import { Plus, BarChart3 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import type { CampaignStatus } from "@/services/api/types"

export const Route = createFileRoute("/_authenticated/campaigns/")({
  beforeLoad: ({ context }) => requirePageAccess(context, "campaigns"),
  component: CampaignsPage,
})

function CampaignsPage() {
  const navigate = useNavigate()
  const { currentBrand } = useBrand()
  const [status, setStatus] = useState<CampaignStatus | "all">("all")

  const { data, isLoading } = useQuery({
    queryKey: ["campaigns", currentBrand, status],
    queryFn: () =>
      campaignsApi.list({
        brand: currentBrand,
        status: status === "all" ? undefined : status,
      }),
  })

  const getStatusVariant = (s: CampaignStatus) => {
    const map = {
      draft: "secondary",
      scheduled: "default",
      sending: "outline",
      sent: "default",
      cancelled: "destructive",
    } as const
    return map[s] || "secondary"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage email campaigns
          </p>
        </div>
        <Button onClick={() => navigate({ to: "/campaigns/new" })}>
          <Plus className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      <div className="flex gap-4">
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as CampaignStatus | "all")}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="sending">Sending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Target</TableHead>
                <TableHead className="hidden lg:table-cell">Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-36" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-52" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-7 w-12 rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : !data?.data?.items?.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <div className="text-muted-foreground">
                      No campaigns found
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.data.items.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">
                      {campaign.name}
                    </TableCell>
                    <TableCell className="hidden max-w-xs truncate md:table-cell">
                      {campaign.subject}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden capitalize sm:table-cell">
                      {campaign.targetType}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {format(new Date(campaign.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {campaign.status === "draft" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate({
                                to: "/campaigns/$id",
                                params: { id: campaign.id },
                              })
                            }
                          >
                            Edit
                          </Button>
                        )}
                        {campaign.status === "sent" && (
                          <Button variant="ghost" size="sm">
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                        )}
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
