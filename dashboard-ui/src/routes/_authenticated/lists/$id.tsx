import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { mailingListsApi } from "@/services/api/mailing-lists"
import { subscribersApi } from "@/services/api/subscribers"
import { useBrand } from "@/contexts/BrandContext"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft, Users, Plus, Search, Pencil, Trash2, Loader2, Calendar, Zap,
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { useState } from "react"

export const Route = createFileRoute("/_authenticated/lists/$id")({
  beforeLoad: ({ context }) => requirePageAccess(context, "lists"),
  component: ListDetailPage,
})

const STATUS_STYLE: Record<string, string> = {
  new:       "border-foreground/20 bg-foreground/5 text-foreground",
  contacted: "border-foreground bg-foreground text-background",
  converted: "border-emerald-600 bg-emerald-50 text-emerald-700",
  spam:      "border-destructive/40 bg-destructive/5 text-destructive",
}

function ListDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentBrand } = useBrand()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editData, setEditData] = useState({ name: "", description: "" })

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ["mailing-list", id],
    queryFn: () => mailingListsApi.get(id),
  })

  const { data: subscribersData, isLoading: subsLoading } = useQuery({
    queryKey: ["mailing-list-subscribers", id],
    queryFn: () => mailingListsApi.getSubscribers(id, { limit: 50 }),
    refetchOnMount: true,
  })

  const { data: availableSubsData, isLoading: availableLoading } = useQuery({
    queryKey: ["subscribers", currentBrand, searchQuery],
    queryFn: () =>
      subscribersApi.list({ brand: currentBrand, search: searchQuery || undefined, limit: 50 }),
    enabled: showAddDialog,
  })

  const updateMutation = useMutation({
    mutationFn: (values: { name: string; description?: string }) =>
      mailingListsApi.update(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mailing-list", id] })
      toast.success("List updated")
      setShowEditDialog(false)
    },
    onError: () => toast.error("Failed to update list"),
  })

  const addMutation = useMutation({
    mutationFn: (subscriberIds: string[]) =>
      mailingListsApi.addSubscribers(id, subscriberIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mailing-list-subscribers", id] })
      queryClient.invalidateQueries({ queryKey: ["mailing-list", id] })
      toast.success("Subscribers added")
      setShowAddDialog(false)
      setSelectedIds([])
    },
    onError: () => toast.error("Failed to add subscribers"),
  })

  const removeMutation = useMutation({
    mutationFn: (subscriberId: string) =>
      mailingListsApi.removeSubscriber(id, subscriberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mailing-list-subscribers", id] })
      queryClient.invalidateQueries({ queryKey: ["mailing-list", id] })
      toast.success("Subscriber removed")
    },
    onError: () => toast.error("Failed to remove subscriber"),
  })

  const availableSubscribers = availableSubsData?.data?.items ?? []
  const currentSubIds = new Set(subscribersData?.data?.items?.map((s) => s.id) ?? [])
  const filteredSubs = availableSubscribers.filter((s) => !currentSubIds.has(s.id))

  if (listLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Loading</p>
      </div>
    )
  }

  const list = listData?.data
  if (!list) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 border-2">
        <p className="text-4xl font-black">404</p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">List not found</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* Nav */}
      <div className="flex items-center justify-between">
        <button
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => navigate({ to: "/lists" })}
        >
          <ArrowLeft className="h-4 w-4" />
          Mailing Lists
        </button>

        <Button
          variant="outline"
          size="sm"
          className="shadow-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
          onClick={() => {
            setEditData({ name: list.name, description: list.description || "" })
            setShowEditDialog(true)
          }}
        >
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Edit List
        </Button>
      </div>

      {/* Info block */}
      <div className="border-2 border-foreground shadow-[6px_6px_0px_0px_oklch(0.1_0_0)] divide-y-2 divide-foreground">

        {/* Hero */}
        <div className="bg-foreground text-background px-8 pt-8 pb-7">
          <p className="text-[10px] uppercase tracking-[0.2em] text-background/40 mb-2">
            Mailing List {list.isDynamic && "· Dynamic"}
          </p>
          <h1 className="text-3xl font-black tracking-tight">{list.name}</h1>
          {list.description && (
            <p className="mt-2 text-base text-background/60 leading-relaxed">{list.description}</p>
          )}
        </div>

        {/* Meta strip */}
        <div className="grid grid-cols-3 divide-x-2 divide-foreground">
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Subscribers</p>
            </div>
            <p className="text-3xl font-black tabular-nums">{(list.subscriberCount ?? 0).toLocaleString()}</p>
          </div>

          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Created</p>
            </div>
            <p className="text-sm font-semibold">{format(new Date(list.createdAt), "MMM d, yyyy")}</p>
          </div>

          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Updated</p>
            </div>
            <p className="text-sm font-semibold">{format(new Date(list.updatedAt), "MMM d, yyyy")}</p>
          </div>
        </div>
        {/* Dynamic filter summary */}
        {list.isDynamic && list.filterConfig && (
          <div className="px-6 py-4 bg-muted/10">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground">
                Active Filters
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {list.filterConfig.isSubscribed !== undefined && (
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 border-2 border-foreground/20 bg-foreground/5">
                  {list.filterConfig.isSubscribed ? "Active subscribers" : "Unsubscribed"}
                </span>
              )}
              {list.filterConfig.status?.map((s) => (
                <span key={s} className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 border-2 border-foreground/20 bg-foreground/5 capitalize">
                  Status: {s}
                </span>
              ))}
              {list.filterConfig.location && (
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 border-2 border-foreground/20 bg-foreground/5">
                  Location: {list.filterConfig.location}
                </span>
              )}
              {list.filterConfig.createdAtFrom && (
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 border-2 border-foreground/20 bg-foreground/5">
                  Added after: {list.filterConfig.createdAtFrom}
                </span>
              )}
              {list.filterConfig.createdAtTo && (
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 border-2 border-foreground/20 bg-foreground/5">
                  Added before: {list.filterConfig.createdAtTo}
                </span>
              )}
              {list.filterConfig.lastEmailSentAfter && (
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 border-2 border-foreground/20 bg-foreground/5">
                  Email after: {list.filterConfig.lastEmailSentAfter}
                </span>
              )}
              {list.filterConfig.lastEmailSentBefore && (
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 border-2 border-foreground/20 bg-foreground/5">
                  Email before: {list.filterConfig.lastEmailSentBefore}
                </span>
              )}
            </div>
          </div>
        )}
        {list.isDynamic && !list.filterConfig && (
          <div className="px-6 py-4 bg-muted/10 flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[11px] text-muted-foreground">Dynamic · matches all subscribers</p>
          </div>
        )}
      </div>

      {/* Subscribers block */}
      <div className="border-2 border-foreground shadow-[4px_4px_0px_0px_oklch(0.1_0_0)]">

        {/* Section header */}
        <div className="flex items-center justify-between border-b-2 border-foreground bg-foreground px-6 py-3">
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-background">
            Subscribers
          </p>
          <Button
            size="sm"
            variant="outline"
            className="h-7 border-background/30 text-background bg-transparent hover:bg-background/10 hover:text-background shadow-none text-[10px] uppercase tracking-wider"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-foreground hover:bg-foreground border-b-2 border-foreground">
              <TableHead className="text-background text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto">
                Subscriber
              </TableHead>
              <TableHead className="text-background text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto">
                Status
              </TableHead>
              <TableHead className="hidden sm:table-cell text-background text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto">
                Source
              </TableHead>
              <TableHead className="text-right text-background text-[10px] uppercase tracking-[0.15em] font-bold py-3 h-auto">
                Remove
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subsLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : !subscribersData?.data?.items?.length ? (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center">
                  <Users className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No subscribers yet</p>
                  <button
                    className="mt-3 text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowAddDialog(true)}
                  >
                    Add subscribers
                  </button>
                </TableCell>
              </TableRow>
            ) : (
              subscribersData.data.items.map((sub) => (
                <TableRow key={sub.id} className="border-b hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 rounded-none shrink-0">
                        <AvatarFallback className="rounded-none bg-foreground text-background text-[11px] font-black">
                          {sub.name?.[0]?.toUpperCase() || sub.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{sub.name || sub.email}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{sub.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 border ${STATUS_STYLE[sub.status] ?? "border-foreground/20 bg-foreground/5 text-foreground"}`}>
                      {sub.status}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {sub.source}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={removeMutation.isPending && removeMutation.variables === sub.id}
                      onClick={() => removeMutation.mutate(sub.id)}
                    >
                      {removeMutation.isPending && removeMutation.variables === sub.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />
                      }
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add subscribers dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Subscribers</DialogTitle>
            <DialogDescription>Select subscribers to add to this list.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search subscribers…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-[280px] overflow-y-auto border-2 divide-y">
              {availableLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : filteredSubs.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  No available subscribers found
                </p>
              ) : (
                filteredSubs.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/30 cursor-pointer"
                    onClick={() => {
                      setSelectedIds((prev) =>
                        prev.includes(sub.id)
                          ? prev.filter((i) => i !== sub.id)
                          : [...prev, sub.id]
                      )
                    }}
                  >
                    <Checkbox
                      id={`sub-${sub.id}`}
                      checked={selectedIds.includes(sub.id)}
                      onCheckedChange={(checked) => {
                        setSelectedIds((prev) =>
                          checked ? [...prev, sub.id] : prev.filter((i) => i !== sub.id)
                        )
                      }}
                    />
                    <Label htmlFor={`sub-${sub.id}`} className="flex-1 cursor-pointer">
                      <p className="text-sm font-semibold">{sub.name || sub.email}</p>
                      <p className="text-[11px] text-muted-foreground">{sub.email}</p>
                    </Label>
                  </div>
                ))
              )}
            </div>
            {selectedIds.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {selectedIds.length} subscriber{selectedIds.length > 1 ? "s" : ""} selected
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); setSelectedIds([]) }}>
              Cancel
            </Button>
            <Button
              onClick={() => addMutation.mutate(selectedIds)}
              disabled={selectedIds.length === 0 || addMutation.isPending}
            >
              {addMutation.isPending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding…</>
                : `Add ${selectedIds.length > 0 ? selectedIds.length : ""} to List`
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit List</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label className="text-[10px] uppercase tracking-widest">Name</Label>
              <Input
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] uppercase tracking-widest">Description</Label>
              <Input
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button
              onClick={() => updateMutation.mutate(editData)}
              disabled={!editData.name.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
