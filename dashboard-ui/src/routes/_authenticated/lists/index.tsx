import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { mailingListsApi } from "@/services/api/mailing-lists"
import { useBrand } from "@/contexts/BrandContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mailing Lists</h1>
          <p className="mt-1 text-muted-foreground">
            Organize subscribers into targeted lists
          </p>
        </div>
        <Button onClick={() => navigate({ to: "/lists/new" })}>
          <Plus className="mr-2 h-4 w-4" />
          Create List
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-5">
              <div className="mb-3 flex items-start justify-between">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="mb-1.5 h-4 w-full" />
              <Skeleton className="mb-4 h-4 w-4/5" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-28" />
              </div>
            </div>
          ))}
        </div>
      ) : !data?.data?.items?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">No mailing lists found</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => navigate({ to: "/lists/new" })}
            >
              Create your first list
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.data.items.map((list) => (
            <Card
              key={list.id}
              className="group transition-all hover:shadow-md"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg leading-snug">
                    {list.name}
                  </CardTitle>
                  {list.isDynamic && (
                    <Badge variant="outline" className="text-xs">
                      Dynamic
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                  {list.description || "No description"}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>
                      {list.subscriberCount}{" "}
                      {list.subscriberCount === 1
                        ? "subscriber"
                        : "subscribers"}
                    </span>
                  </div>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        navigate({
                          to: "/lists/$id",
                          params: { id: list.id },
                        })
                      }
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditList({ id: list.id, name: list.name, description: list.description || "" })
                        setEditData({ name: list.name, description: list.description || "" })
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteListId(list.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editList} onOpenChange={(open) => !open && setEditList(null)}>
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
            <Button variant="outline" onClick={() => setEditList(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => editList && updateMutation.mutate({ id: editList.id, data: editData })}
              disabled={!editData.name.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteListId} onOpenChange={(open) => !open && setDeleteListId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete List</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete this mailing list? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteListId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteListId && deleteMutation.mutate(deleteListId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
