import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { mailingListsApi } from "@/services/api/mailing-lists"
import { useBrand } from "@/contexts/BrandContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Plus, Users, Eye, Edit, Trash2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { useState } from "react"

export const Route = createFileRoute("/_authenticated/lists/")({
  beforeLoad: ({ context }) => requirePageAccess(context, "lists"),
  component: MailingListsPage,
})

function MailingListsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentBrand } = useBrand()
  const [editList, setEditList] = useState<{ id: string; name: string; description: string } | null>(null)
  const [editData, setEditData] = useState({ name: "", description: "" })
  const [deleteListId, setDeleteListId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["mailing-lists", currentBrand],
    queryFn: () => mailingListsApi.list({ brand: currentBrand }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; description?: string } }) =>
      mailingListsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mailing-lists"] })
      toast.success("List updated")
      setEditList(null)
    },
    onError: () => toast.error("Failed to update list"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mailingListsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mailing-lists"] })
      toast.success("List deleted")
      setDeleteListId(null)
    },
    onError: () => toast.error("Failed to delete list"),
  })

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 pb-6 border-b-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1">
            Audience
          </p>
          <h1 className="text-4xl font-black tracking-tight">Mailing Lists</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize subscribers into targeted lists
          </p>
        </div>
        <Button
          className="mt-1 shadow-md hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all shrink-0"
          onClick={() => navigate({ to: "/lists/new" })}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create List
        </Button>
      </div>

      {/* Lists grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border-2 p-5 space-y-3">
              <div className="flex items-start justify-between">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-5 w-10" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <div className="border-t pt-3 flex items-center justify-between">
                <Skeleton className="h-3.5 w-28" />
                <div className="flex gap-1">
                  <Skeleton className="h-7 w-7" />
                  <Skeleton className="h-7 w-7" />
                  <Skeleton className="h-7 w-7" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !data?.data?.items?.length ? (
        <div className="border-2 border-dashed border-foreground/30 flex flex-col items-center justify-center py-16 gap-4">
          <div className="flex h-14 w-14 items-center justify-center border-2 border-foreground/20">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-bold text-sm">No mailing lists yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first list to segment subscribers</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shadow-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
            onClick={() => navigate({ to: "/lists/new" })}
          >
            Create your first list
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.data.items.map((list) => (
            <div
              key={list.id}
              className="border-2 border-foreground shadow-md hover:shadow-xl hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all flex flex-col"
            >
              {/* Card header */}
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-black text-base leading-snug">{list.name}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    {list.isDynamic && (
                      <span className="text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 border border-foreground/30 text-muted-foreground">
                        Dynamic
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {list.description || "No description provided"}
                </p>
              </div>

              {/* Card footer */}
              <div className="border-t-2 px-5 py-3 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-bold tabular-nums">
                    {(list.subscriberCount ?? 0).toLocaleString()}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {(list.subscriberCount ?? 0) === 1 ? "subscriber" : "subscribers"}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="View"
                    onClick={() => navigate({ to: "/lists/$id", params: { id: list.id } })}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Edit"
                    onClick={() => {
                      setEditList({ id: list.id, name: list.name, description: list.description || "" })
                      setEditData({ name: list.name, description: list.description || "" })
                    }}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    title="Delete"
                    onClick={() => setDeleteListId(list.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editList} onOpenChange={(open) => !open && setEditList(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit List</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name" className="text-[10px] uppercase tracking-widest">Name</Label>
              <Input
                id="edit-name"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-desc" className="text-[10px] uppercase tracking-widest">Description</Label>
              <Input
                id="edit-desc"
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditList(null)}>Cancel</Button>
            <Button
              onClick={() => editList && updateMutation.mutate({ id: editList.id, data: editData })}
              disabled={!editData.name.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteListId} onOpenChange={(open) => !open && setDeleteListId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete List</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the mailing list and remove all subscriber associations. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteListId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteListId && deleteMutation.mutate(deleteListId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
