import { createFileRoute, redirect } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { usersApi } from "@/services/api/users"
import { permissionsApi } from "@/services/api/permissions"
import { Button } from "@/components/ui/button"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, Shield, Trash2, Pencil, AlertTriangle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { toast } from "sonner"
import type { Brand } from "@/services/api/types"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export const Route = createFileRoute("/_authenticated/users/")({
  beforeLoad: ({ context }) => {
    const ctx = context as any
    const role = ctx?.session?.user?.role as string | undefined
    if (role && role !== "owner" && role !== "admin") {
      throw redirect({ to: "/forbidden" })
    }
  },
  component: UsersPage,
})

function getRoleBadgeVariant(role: string): "default" | "secondary" | "outline" {
  if (role === "owner" || role === "admin") return "default"
  if (role === "marketing_manager") return "secondary"
  return "outline"
}

function UsersPage() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => usersApi.list(),
  })

  const { data: rolesData } = useQuery({
    queryKey: ["roles"],
    queryFn: () => permissionsApi.listRoles(),
  })
  const rolesList = rolesData?.data ?? []

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [addData, setAddData] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
    brandAccess: ["watpak"] as Brand[],
  })
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  const [editUserId, setEditUserId] = useState<string | null>(null)
  const [editData, setEditData] = useState({
    name: "",
    password: "",
    role: "marketing_manager",
    brandAccess: [] as Brand[],
  })

  useEffect(() => {
    if (rolesList.length > 0 && !addData.role) {
      const defaultRole = rolesList.find((r) => r.value === "manager")?.value ?? rolesList[0].value
      setAddData((prev) => ({ ...prev, role: defaultRole }))
    }
  }, [rolesList, addData.role])

  const inviteMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success("User added successfully")
      setIsAddOpen(false)
      setAddData({
        name: "",
        email: "",
        password: "",
        role: rolesList.find((r) => r.value === "marketing_manager")?.value ?? rolesList[0]?.value ?? "marketing_manager",
        brandAccess: ["watpak"],
      })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add user")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success("User deleted")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete user")
    },
  })

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success("User updated successfully")
      setEditUserId(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update user")
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="mt-1 text-muted-foreground">
            Manage team members and their access
          </p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
<Button onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Add a new member to your team. They will be able to log in immediately with the password provided.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={addData.name}
                  onChange={(e) => setAddData({ ...addData, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={addData.email}
                  onChange={(e) => setAddData({ ...addData, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Temporary Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={addData.password}
                  onChange={(e) => setAddData({ ...addData, password: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={addData.role}
                  onValueChange={(value: string) => setAddData({ ...addData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {rolesList.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Brand Access</Label>
                <div className="flex flex-col gap-2 border-2 border-foreground bg-background p-4 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="brand-watpak"
                      checked={addData.brandAccess.includes("watpak")}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setAddData({ ...addData, brandAccess: [...addData.brandAccess, "watpak"] })
                        } else {
                          setAddData({ ...addData, brandAccess: addData.brandAccess.filter((b) => b !== "watpak") })
                        }
                      }}
                    />
                    <Label htmlFor="brand-watpak" className="font-normal cursor-pointer">WatPak</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="brand-dercol"
                      checked={addData.brandAccess.includes("dercolbags")}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setAddData({ ...addData, brandAccess: [...addData.brandAccess, "dercolbags"] })
                        } else {
                          setAddData({ ...addData, brandAccess: addData.brandAccess.filter((b) => b !== "dercolbags") })
                        }
                      }}
                    />
                    <Label htmlFor="brand-dercol" className="font-normal cursor-pointer">DercolBags</Label>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => inviteMutation.mutate(addData)}
                disabled={inviteMutation.isPending || !addData.name || !addData.email || !addData.password || addData.brandAccess.length === 0}
              >
                {inviteMutation.isPending ? "Adding..." : "Add User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden sm:table-cell">
                  Brand Access
                </TableHead>
                <TableHead className="hidden md:table-cell">Joined</TableHead>
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
                          <Skeleton className="h-3.5 w-28" />
                          <Skeleton className="h-3 w-44" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-28 rounded-full" />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex gap-1">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-8 w-8 rounded" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : !data?.data?.items?.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center">
                    <div className="text-muted-foreground">No users found</div>
                  </TableCell>
                </TableRow>
              ) : (
                data.data.items.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs">
                            {user.name[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        <Shield className="mr-1 h-3 w-3" />
                        {rolesList.find((r) => r.value === user.role)?.name ?? user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex gap-1">
                        {user.brandAccess.map((brand) => (
                          <Badge
                            key={brand}
                            variant="outline"
                            className="text-xs"
                          >
                            {brand === "watpak" ? "WatPak" : "DercolBags"}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {format(new Date(user.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEditData({
                              name: user.name,
                              password: "",
                              role: user.role,
                              brandAccess: user.brandAccess,
                            })
                            setEditUserId(user.id)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteUserId(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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
      <Dialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUserId(null)}>Cancel</Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (deleteUserId) deleteMutation.mutate(deleteUserId)
                setDeleteUserId(null)
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUserId} onOpenChange={(open) => !open && setEditUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details and access. Leave password blank to keep the current one.</DialogDescription>
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
              <Label htmlFor="edit-password">New Password</Label>
              <Input
                id="edit-password"
                type="password"
                placeholder="Leave blank to keep unchanged"
                value={editData.password}
                onChange={(e) => setEditData({ ...editData, password: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={editData.role}
                onValueChange={(value: string) => setEditData({ ...editData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rolesList.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Brand Access</Label>
              <div className="flex flex-col gap-2 border-2 border-foreground bg-background p-4 shadow-sm">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-brand-watpak"
                    checked={editData.brandAccess.includes("watpak")}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setEditData({ ...editData, brandAccess: [...editData.brandAccess, "watpak"] })
                      } else {
                        setEditData({ ...editData, brandAccess: editData.brandAccess.filter((b) => b !== "watpak") })
                      }
                    }}
                  />
                  <Label htmlFor="edit-brand-watpak" className="font-normal cursor-pointer">WatPak</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-brand-dercol"
                    checked={editData.brandAccess.includes("dercolbags")}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setEditData({ ...editData, brandAccess: [...editData.brandAccess, "dercolbags"] })
                      } else {
                        setEditData({ ...editData, brandAccess: editData.brandAccess.filter((b) => b !== "dercolbags") })
                      }
                    }}
                  />
                  <Label htmlFor="edit-brand-dercol" className="font-normal cursor-pointer">DercolBags</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserId(null)}>Cancel</Button>
            <Button 
              onClick={() => {
                if (editUserId) {
                  const payload = { ...editData }
                  if (!payload.password) delete (payload as any).password
                  editMutation.mutate({ id: editUserId, data: payload })
                }
              }}
              disabled={editMutation.isPending || !editData.name || editData.brandAccess.length === 0}
            >
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
