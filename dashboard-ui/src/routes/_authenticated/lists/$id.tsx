import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { mailingListsApi } from "@/services/api/mailing-lists"
import { subscribersApi } from "@/services/api/subscribers"
import { useBrand } from "@/contexts/BrandContext"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
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
import { ArrowLeft, Users, Plus, Search, Pencil } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { useState } from "react"

export const Route = createFileRoute("/_authenticated/lists/$id")({
  beforeLoad: ({ context }) => requirePageAccess(context, "lists"),
  component: ListDetailPage,
})

function ListDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentBrand } = useBrand()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])

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
      subscribersApi.list({
        brand: currentBrand,
        search: searchQuery || undefined,
        limit: 50,
      }),
    enabled: showAddDialog,
  })

  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editData, setEditData] = useState({ name: "", description: "" })

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      mailingListsApi.update(id, data),
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
      queryClient.invalidateQueries({ queryKey: ["mailing-list-subscribers"] })
      queryClient.invalidateQueries({ queryKey: ["mailing-list"] })
      toast.success("Subscribers added to list")
      setShowAddDialog(false)
      setSelectedIds([])
    },
    onError: () => toast.error("Failed to add subscribers"),
  })

  const availableSubscribers = availableSubsData?.data?.items ?? []
  const currentSubIds = new Set(
    subscribersData?.data?.items?.map((s) => s.id) ?? []
  )
  const filteredSubs = availableSubscribers.filter(
    (s) => !currentSubIds.has(s.id)
  )

  if (listLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const list = listData?.data
  if (!list) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">List not found</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ to: "/lists" })}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Mailing Lists
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{list.name}</CardTitle>
              <CardDescription className="mt-1">
                {list.description || "No description"}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditData({ name: list.name, description: list.description || "" })
                  setShowEditDialog(true)
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              {list.isDynamic && (
                <Badge variant="outline">Dynamic</Badge>
              )}
              <Badge variant="secondary">
                <Users className="mr-1 h-3 w-3" />
                {list.subscriberCount}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Brand</p>
              <p className="mt-1 capitalize">{list.brand}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="mt-1">
                {format(new Date(list.createdAt), "MMM d, yyyy")}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Updated</p>
              <p className="mt-1">
                {format(new Date(list.updatedAt), "MMM d, yyyy")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Subscribers</CardTitle>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subscriber</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subsLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : !subscribersData?.data?.items?.length ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    No subscribers in this list
                  </TableCell>
                </TableRow>
              ) : (
                subscribersData.data.items.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {sub.name?.[0]?.toUpperCase() ||
                              sub.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {sub.name || sub.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {sub.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{sub.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {sub.source}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Subscribers</DialogTitle>
            <DialogDescription>
              Select subscribers to add to this list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search subscribers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto border rounded">
              {availableLoading ? (
                <p className="p-4 text-center text-muted-foreground">
                  Loading...
                </p>
              ) : filteredSubs.length === 0 ? (
                <p className="p-4 text-center text-muted-foreground">
                  No available subscribers found
                </p>
              ) : (
                <div className="divide-y">
                  {filteredSubs.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50"
                    >
                      <Checkbox
                        id={`sub-${sub.id}`}
                        checked={selectedIds.includes(sub.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedIds([...selectedIds, sub.id])
                          } else {
                            setSelectedIds(selectedIds.filter((i) => i !== sub.id))
                          }
                        }}
                      />
                      <Label
                        htmlFor={`sub-${sub.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <p className="text-sm font-medium">
                          {sub.name || sub.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sub.email}
                        </p>
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedIds.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedIds.length} subscriber{selectedIds.length > 1 ? "s" : ""} selected
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false)
                setSelectedIds([])
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => addMutation.mutate(selectedIds)}
              disabled={selectedIds.length === 0 || addMutation.isPending}
            >
              {addMutation.isPending ? "Adding..." : "Add to List"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit List</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Input
                id="edit-desc"
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateMutation.mutate(editData)}
              disabled={!editData.name.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
