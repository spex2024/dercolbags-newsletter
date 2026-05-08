import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useQuery } from "@tanstack/react-query"
import { subscribersApi } from "@/services/api/subscribers"
import { useBrand } from "@/contexts/BrandContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, Search, Users } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import type { SubscriberStatus } from "@/services/api/types"

export const Route = createFileRoute("/_authenticated/subscribers/")({
  beforeLoad: ({ context }) => requirePageAccess(context, "subscribers"),
  component: SubscribersPage,
})

const STATUS_BADGE: Record<SubscriberStatus, string> = {
  new:       "border-foreground/20 bg-foreground/5 text-foreground",
  contacted: "border-foreground bg-foreground text-background",
  converted: "border-emerald-600 bg-emerald-50 text-emerald-700",
  spam:      "border-destructive/40 bg-destructive/5 text-destructive",
}

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
        brand:  currentBrand,
        status: status === "all" ? undefined : status,
        search: searchQuery || undefined,
        page,
        limit:  20,
      }),
  })

  const total    = data?.data?.pagination?.total ?? 0
  const totalPgs = data?.data?.pagination?.totalPages ?? 1

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-6 border-b-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1">Management</p>
          <h1 className="text-4xl font-black tracking-tight">Subscribers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${total.toLocaleString()} subscriber${total !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button
          className="mt-1 shadow-md hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all shrink-0"
          onClick={() => navigate({ to: "/subscribers/new" })}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Subscriber
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
            className="pl-10"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v as SubscriberStatus | "all"); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-44">
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

      {/* Table */}
      <div className="border-2 border-foreground shadow-[4px_4px_0px_0px_oklch(0.1_0_0)]">
        <Table>
          <TableHeader>
            <TableRow className="bg-foreground hover:bg-foreground border-b-2 border-foreground">
              {["Subscriber", "Status", "Source", "Location", "Added"].map((h, i) => (
                <TableHead
                  key={h}
                  className={`text-background text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto
                    ${i === 1 ? "hidden md:table-cell" : ""}
                    ${i === 2 ? "hidden md:table-cell" : ""}
                    ${i === 3 ? "hidden lg:table-cell" : ""}
                    ${i === 4 ? "hidden sm:table-cell" : ""}
                  `}
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 shrink-0" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-3 w-44" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))
            ) : !data?.data?.items?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Users className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm font-semibold">No subscribers found</p>
                    <p className="text-xs text-muted-foreground">
                      {searchQuery || status !== "all"
                        ? "Try adjusting your filters"
                        : "Add your first subscriber to get started"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.data.items.map((sub) => (
                <TableRow
                  key={sub.id}
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => navigate({ to: "/subscribers/$id", params: { id: sub.id } })}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 rounded-none shrink-0">
                        <AvatarFallback className="rounded-none bg-foreground text-background text-[11px] font-black">
                          {sub.name?.[0]?.toUpperCase() ?? sub.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{sub.name || "—"}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{sub.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 border ${STATUS_BADGE[sub.status] ?? STATUS_BADGE.new}`}>
                      {sub.status}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground capitalize">
                    {sub.source.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {sub.location || "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <p className="text-sm tabular-nums">{format(new Date(sub.createdAt), "MMM d, yyyy")}</p>
                    <p className={`text-[10px] uppercase tracking-widest font-bold mt-0.5 ${sub.isSubscribed ? "text-foreground/50" : "text-destructive"}`}>
                      {sub.isSubscribed ? "Active" : "Unsubscribed"}
                    </p>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPgs > 1 && (
        <div className="flex items-center justify-between border-t-2 pt-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Page {page} of {totalPgs} · {total.toLocaleString()} total
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPgs} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
