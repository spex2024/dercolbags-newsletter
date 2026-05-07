import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, BarChart3, Send, X, Eye } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { toast } from "sonner"
import type { CampaignStatus } from "@/services/api/types"

export const Route = createFileRoute("/_authenticated/campaigns/")({
  beforeLoad: ({ context }) => requirePageAccess(context, "campaigns"),
  component: CampaignsPage,
})

function CampaignsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentBrand } = useBrand()
  const [status, setStatus] = useState<CampaignStatus | "all">("all")
  const [pendingId, setPendingId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["campaigns", currentBrand, status],
    queryFn: () =>
      campaignsApi.list({
        brand: currentBrand,
        status: status === "all" ? undefined : status,
      }),
  })

  const sendMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.send(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] })
      toast.success("Campaign is now being sent")
      setPendingId(null)
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to send campaign")
      setPendingId(null)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] })
      toast.success("Campaign schedule cancelled")
      setPendingId(null)
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to cancel campaign")
      setPendingId(null)
    },
  })

  const getStatusVariant = (s: CampaignStatus) => {
    const map = {
      draft: "secondary",
      scheduled: "outline",
      sending: "outline",
      sent: "default",
      cancelled: "destructive",
    } as const
    return map[s] ?? "secondary"
  }

  const goToDetail = (id: string) =>
    navigate({ to: "/campaigns/$id", params: { id } })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 pb-6 border-b-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1">
            Outreach
          </p>
          <h1 className="text-4xl font-black tracking-tight">Campaigns</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage email campaigns
          </p>
        </div>
        <Button
          className="mt-1 shadow-md hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all shrink-0"
          onClick={() => navigate({ to: "/campaigns/new" })}
        >
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

      <div className="border-2 border-foreground shadow-[4px_4px_0px_0px_oklch(0.1_0_0)]">
          <Table>
            <TableHeader>
              <TableRow className="bg-foreground hover:bg-foreground border-b-2 border-foreground">
                <TableHead className="text-background text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto">Name</TableHead>
                <TableHead className="hidden md:table-cell text-background text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto">Subject</TableHead>
                <TableHead className="text-background text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto">Status</TableHead>
                <TableHead className="hidden sm:table-cell text-background text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto">Target</TableHead>
                <TableHead className="hidden lg:table-cell text-background text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto">Created</TableHead>
                <TableHead className="text-right text-background text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto">Actions</TableHead>
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
                    <p className="text-muted-foreground">No campaigns found</p>
                  </TableCell>
                </TableRow>
              ) : (
                data.data.items.map((campaign) => {
                  const isBusy =
                    pendingId === campaign.id &&
                    (sendMutation.isPending || cancelMutation.isPending)

                  return (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <button
                          className="font-medium text-left hover:underline"
                          onClick={() => goToDetail(campaign.id)}
                        >
                          {campaign.name}
                        </button>
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
                          {/* View / Edit — available on all statuses */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => goToDetail(campaign.id)}
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {/* Send now — draft only */}
                          {campaign.status === "draft" && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isBusy}
                              onClick={() => {
                                setPendingId(campaign.id)
                                sendMutation.mutate(campaign.id)
                              }}
                              title="Send now"
                            >
                              <Send className="mr-1 h-4 w-4" />
                              Send
                            </Button>
                          )}

                          {/* Cancel schedule — scheduled only */}
                          {campaign.status === "scheduled" && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isBusy}
                              onClick={() => {
                                setPendingId(campaign.id)
                                cancelMutation.mutate(campaign.id)
                              }}
                              title="Cancel schedule"
                            >
                              <X className="mr-1 h-4 w-4" />
                              Cancel
                            </Button>
                          )}

                          {/* Stats — sent only */}
                          {campaign.status === "sent" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => goToDetail(campaign.id)}
                              title="View stats"
                            >
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
      </div>
    </div>
  )
}
