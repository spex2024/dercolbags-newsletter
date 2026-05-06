import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useQuery } from "@tanstack/react-query"
import { subscribersApi } from "@/services/api/subscribers"
import { useBrand } from "@/contexts/BrandContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, Search } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import type { SubscriberStatus } from "@/services/api/types"

export const Route = createFileRoute("/_authenticated/subscribers/")({
  beforeLoad: ({ context }) => requirePageAccess(context, "subscribers"),
  component: SubscribersPage,
})

function SubscribersPage() {
  const navigate = useNavigate()
  const { currentBrand } = useBrand()
  const [status, setStatus] = useState<SubscriberStatus | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ["subscribers", currentBrand, status, searchQuery, page],
    queryFn: () =>
      subscribersApi.list({
        brand: currentBrand,
        status: status === "all" ? undefined : status,
        search: searchQuery || undefined,
        page,
        limit: 20,
      }),
  })

  const getStatusVariant = (s: SubscriberStatus) => {
    const map = {
      new: "secondary",
      contacted: "default",
      converted: "outline",
      spam: "destructive",
    } as const
    return map[s] || "secondary"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscribers</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your newsletter subscribers
          </p>
        </div>
        <Button onClick={() => navigate({ to: "/subscribers/new" })}>
          <Plus className="mr-2 h-4 w-4" />
          Add Subscriber
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as SubscriberStatus | "all")
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="spam">Spam</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subscriber</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="hidden md:table-cell">Source</TableHead>
                <TableHead className="hidden lg:table-cell">Location</TableHead>
                <TableHead className="hidden sm:table-cell">Subscribed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-3.5 w-32" />
                          <Skeleton className="h-3 w-44" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-5 w-18 rounded-full" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Skeleton className="h-5 w-16 rounded-full" />
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
                      No subscribers found
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.data.items.map((subscriber) => (
                  <TableRow key={subscriber.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs">
                            {subscriber.name?.[0]?.toUpperCase() ||
                              subscriber.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-sm">
                            {subscriber.name || "No name"}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {subscriber.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={getStatusVariant(subscriber.status)}>
                        {subscriber.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {subscriber.source}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {subscriber.location || "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {subscriber.isSubscribed ? (
                        <Badge
                          variant="outline"
                          className="border-green-200 bg-green-50 text-green-700"
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-red-200 bg-red-50 text-red-700"
                        >
                          Unsubscribed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigate({
                            to: "/subscribers/$id",
                            params: { id: subscriber.id },
                          })
                        }
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
{data?.data?.pagination && data.data.pagination.totalPages > 1 && (
        <div className="flex items-center justify--between">
          <p className="text-sm text-muted-foreground">
            Showing page {data.data.pagination.page} of {data.data.pagination.totalPages}{" "}
            ({data.data.pagination.total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.data.pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
