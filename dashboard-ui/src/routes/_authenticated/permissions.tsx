import { createFileRoute, redirect } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useEffect, useMemo } from "react"
import { permissionsApi } from "@/services/api/permissions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Shield,
  ShieldCheck,
  Plus,
  Trash2,
  Crown,
  LayoutDashboard,
  Users,
  Mail,
  FileText,
  List,
  Download,
  AlertTriangle,
  Lock,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronRight,
  Layers,
  BarChart3,
  Zap,
  UserCog,
  EyeOff,
} from "lucide-react"
import type { PageKey, PagePermission, Role } from "@/services/api/types"

export const Route = createFileRoute("/_authenticated/permissions")({
  beforeLoad: ({ context }) => {
    const ctx = context as any
    const role = ctx?.session?.user?.role as string | undefined
    if (role && role !== "owner" && role !== "admin") {
      throw redirect({ to: "/forbidden" })
    }
  },
  component: PermissionsPage,
})

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_ORDER: PageKey[] = [
  "dashboard",
  "analytics",
  "subscribers",
  "campaigns",
  "templates",
  "lists",
  "import-export",
]

const PAGE_META: Record<PageKey, { icon: typeof LayoutDashboard; description: string; category: string }> = {
  dashboard:       { icon: LayoutDashboard, description: "Overview and key metrics",                category: "Overview"  },
  analytics:       { icon: BarChart3,       description: "Audience and email performance analytics", category: "Overview"  },
  subscribers:     { icon: Users,           description: "Subscriber list and management",           category: "Audience"  },
  campaigns:       { icon: Mail,            description: "Email campaign creation and tracking",     category: "Outbound"  },
  templates:       { icon: FileText,        description: "Email template builder",                   category: "Content"   },
  lists:           { icon: List,            description: "Mailing list management",                  category: "Audience"  },
  "import-export": { icon: Download,        description: "Bulk import and export tools",             category: "Tools"     },
}

const ROLE_PRESETS = [
  {
    name: "Manager",
    value: "manager",
    description: "Full access to all operational pages except settings.",
    pages: ["dashboard", "subscribers", "campaigns", "templates", "lists", "import-export"],
  },
  {
    name: "Content Editor",
    value: "content_editor",
    description: "Can create and edit templates and campaigns.",
    pages: ["dashboard", "campaigns", "templates"],
  },
  {
    name: "Sales Support",
    value: "sales_support",
    description: "Can manage subscribers and mailing lists.",
    pages: ["dashboard", "subscribers", "lists", "import-export"],
  },
  {
    name: "Viewer",
    value: "viewer",
    description: "Read-only access to dashboards and subscriber data.",
    pages: ["dashboard", "subscribers"],
  },
]

const ROLE_PALETTE: Record<string, { bg: string; text: string; border: string; lightBg: string }> = {
  owner: { bg: "bg-amber-500", text: "text-amber-500", border: "border-amber-500", lightBg: "bg-amber-500/10" },
  admin: { bg: "bg-sky-500", text: "text-sky-500", border: "border-sky-500", lightBg: "bg-sky-500/10" },
  manager: { bg: "bg-emerald-500", text: "text-emerald-500", border: "border-emerald-500", lightBg: "bg-emerald-500/10" },
  content_editor: { bg: "bg-violet-500", text: "text-violet-500", border: "border-violet-500", lightBg: "bg-violet-500/10" },
  sales_support: { bg: "bg-rose-500", text: "text-rose-500", border: "border-rose-500", lightBg: "bg-rose-500/10" },
  viewer: { bg: "bg-slate-500", text: "text-slate-500", border: "border-slate-500", lightBg: "bg-slate-500/10" },
}

function getRolePalette(value: string) {
  if (ROLE_PALETTE[value]) return ROLE_PALETTE[value]
  // Deterministic fallback based on char codes
  const hues = [
    { bg: "bg-teal-500", text: "text-teal-500", border: "border-teal-500", lightBg: "bg-teal-500/10" },
    { bg: "bg-orange-500", text: "text-orange-500", border: "border-orange-500", lightBg: "bg-orange-500/10" },
    { bg: "bg-indigo-500", text: "text-indigo-500", border: "border-indigo-500", lightBg: "bg-indigo-500/10" },
    { bg: "bg-pink-500", text: "text-pink-500", border: "border-pink-500", lightBg: "bg-pink-500/10" },
    { bg: "bg-lime-500", text: "text-lime-500", border: "border-lime-500", lightBg: "bg-lime-500/10" },
    { bg: "bg-cyan-500", text: "text-cyan-500", border: "border-cyan-500", lightBg: "bg-cyan-500/10" },
  ]
  const idx = value.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % hues.length
  return hues[idx]
}

const toSlug = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/^_+|_+$/g, "")

// ─── Main Page ────────────────────────────────────────────────────────────────

function PermissionsPage() {
  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-2 border-foreground bg-primary shadow-sm">
              <Lock className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Access Control</h1>
              <p className="mt-1 text-muted-foreground">
                Define roles and configure which pages each role can access.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start border-2 border-foreground bg-card px-3 py-1.5 shadow-sm">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Owner / Admin</span>
        </div>
      </div>

      <StatsBar />

      <Tabs defaultValue="roles">
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-3.5 w-3.5" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="access" className="gap-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            Page Access Matrix
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-6">
          <RolesTab />
        </TabsContent>

        <TabsContent value="access" className="mt-6">
          <AccessTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Stats Bar ───────────────────────────────────────────────────────────────

function StatsBar() {
  const { data: rolesData } = useQuery({
    queryKey: ["roles"],
    queryFn: () => permissionsApi.listRoles(),
  })
  const { data: permsData } = useQuery({
    queryKey: ["pagePermissions"],
    queryFn: () => permissionsApi.listPagePermissions(),
  })

  const roles = rolesData?.data ?? []
  const perms = permsData?.data ?? []
  const totalPages = PAGE_ORDER.length

  const customRoles = roles.filter((r) => !r.isSystem).length
  const avgCoverage =
    roles.length > 0
      ? Math.round(
          roles.reduce((sum, role) => {
            const accessible = perms.filter((p) => p.allowedRoles.includes(role.value)).length
            return sum + accessible
          }, 0) / roles.length
        )
      : 0

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card className="border-2 shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center border-2 border-foreground bg-muted">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{roles.length}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Roles ({customRoles} custom)
            </p>
          </div>
        </CardContent>
      </Card>
      <Card className="border-2 shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center border-2 border-foreground bg-muted">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{totalPages}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Protected Pages
            </p>
          </div>
        </CardContent>
      </Card>
      <Card className="border-2 shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center border-2 border-foreground bg-muted">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{avgCoverage}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Avg. Pages / Role
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Roles Tab ────────────────────────────────────────────────────────────────

function RolesTab() {
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)
  const [detailRole, setDetailRole] = useState<Role | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => permissionsApi.listRoles(),
  })
  const rolesList: Role[] = data?.data ?? []

  const deleteMutation = useMutation({
    mutationFn: (id: string) => permissionsApi.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] })
      queryClient.invalidateQueries({ queryKey: ["pagePermissions"] })
      toast.success("Role deleted")
      setDeleteTarget(null)
    },
    onError: (error: Error) => toast.error(error.message || "Failed to delete role"),
  })

  // Sort: system roles first, then alphabetically
  const sortedRoles = useMemo(
    () =>
      [...rolesList].sort((a, b) => {
        if (a.isSystem && !b.isSystem) return -1
        if (!a.isSystem && b.isSystem) return 1
        return a.name.localeCompare(b.name)
      }),
    [rolesList]
  )

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-40 animate-pulse border-2 bg-muted/30" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            {rolesList.length} role{rolesList.length !== 1 ? "s" : ""} defined
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Click a role to inspect its permissions. System roles cannot be deleted.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="border-2 shadow-sm">
            <Zap className="mr-2 h-3.5 w-3.5" />
            Preset
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)} className="shadow-sm">
            <Plus className="mr-2 h-3.5 w-3.5" />
            New Role
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedRoles.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            onDelete={() => setDeleteTarget(role)}
            onInspect={() => setDetailRole(role)}
          />
        ))}
      </div>

      <AddRoleDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["roles"] })
        }}
      />

      <RoleDetailSheet role={detailRole} onClose={() => setDetailRole(null)} />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Role
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the{" "}
              <span className="font-semibold">{deleteTarget?.name}</span> role?
              Any users assigned this role will lose page access immediately, and the
              role will be removed from all page permissions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function RoleCard({
  role,
  onDelete,
  onInspect,
}: {
  role: Role
  onDelete: () => void
  onInspect: () => void
}) {
  const isOwner = role.value === "owner"
  const isAdmin = role.value === "admin"
  const palette = getRolePalette(role.value)

  const { data: permsData } = useQuery({
    queryKey: ["pagePermissions"],
    queryFn: () => permissionsApi.listPagePermissions(),
    staleTime: 1000 * 60 * 5,
  })
  const permissions = permsData?.data ?? []
  const accessibleCount = permissions.filter((p) => p.allowedRoles.includes(role.value)).length
  const totalPages = PAGE_ORDER.length
  const coverage = totalPages > 0 ? Math.round((accessibleCount / totalPages) * 100) : 0

  return (
    <div
      onClick={onInspect}
      className={`group relative flex cursor-pointer flex-col justify-between border-2 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${palette.border}`}
    >
      {/* Color accent strip */}
      <div className={`absolute left-0 top-0 h-full w-1 ${palette.bg}`} />

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center border-2 ${palette.border} ${palette.lightBg}`}
          >
            {isOwner ? (
              <Crown className={`h-5 w-5 ${palette.text}`} />
            ) : isAdmin ? (
              <ShieldCheck className={`h-5 w-5 ${palette.text}`} />
            ) : (
              <UserCog className={`h-5 w-5 ${palette.text}`} />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold leading-tight">{role.name}</p>
            <code className="mt-0.5 block truncate text-xs text-muted-foreground">
              {role.value}
            </code>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {role.isSystem ? (
            <Badge variant="secondary" className="text-xs">
              System
            </Badge>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              aria-label={`Delete ${role.name} role`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {role.description && (
        <p className="mt-3 text-sm leading-snug text-muted-foreground line-clamp-2">
          {role.description}
        </p>
      )}

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold uppercase tracking-wider text-muted-foreground">Page Access</span>
          <span className="font-semibold">
            {accessibleCount}/{totalPages}
          </span>
        </div>
        <div className="h-2 w-full border-2 border-foreground bg-muted">
          <div
            className={`h-full transition-all duration-500 ${palette.bg}`}
            style={{ width: `${coverage}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
        <Eye className="h-3 w-3" />
        Inspect
        <ChevronRight className="h-3 w-3" />
      </div>
    </div>
  )
}

// ─── Role Detail Sheet ───────────────────────────────────────────────────────

function RoleDetailSheet({ role, onClose }: { role: Role | null; onClose: () => void }) {
  const { data: permsData } = useQuery({
    queryKey: ["pagePermissions"],
    queryFn: () => permissionsApi.listPagePermissions(),
    staleTime: 1000 * 60 * 5,
  })
  const permissions = permsData?.data ?? []

  const palette = role ? getRolePalette(role.value) : ROLE_PALETTE.owner

  const accessiblePages = useMemo(() => {
    if (!role) return []
    return PAGE_ORDER.map((key) => {
      const perm = permissions.find((p) => p.pageKey === key)
      const meta = PAGE_META[key]
      return {
        key,
        name: perm?.pageName ?? key,
        allowed: perm?.allowedRoles.includes(role.value) ?? false,
        meta,
      }
    })
  }, [role, permissions])

  return (
    <Sheet open={!!role} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="space-y-4 pb-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center border-2 ${palette.border} ${palette.lightBg}`}>
              <UserCog className={`h-5 w-5 ${palette.text}`} />
            </div>
            <div>
              <SheetTitle className="text-lg">{role?.name}</SheetTitle>
              <SheetDescription>
                <code className="text-xs">{role?.value}</code>
              </SheetDescription>
            </div>
          </div>
          {role?.description && (
            <p className="text-sm text-muted-foreground">{role.description}</p>
          )}
        </SheetHeader>
        <Separator />
        <div className="mt-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Accessible Pages
          </p>
          {accessiblePages.map((page) => {
            const Icon = page.meta?.icon ?? LayoutDashboard
            return (
              <div
                key={page.key}
                className={`flex items-center gap-3 border-2 p-3 shadow-sm transition-all ${
                  page.allowed ? "bg-background border-foreground" : "bg-muted/30 border-muted"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center border-2 ${
                    page.allowed ? "border-foreground bg-primary/10" : "border-muted bg-muted"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${page.allowed ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${page.allowed ? "" : "text-muted-foreground line-through"}`}>
                    {page.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{page.meta?.description}</p>
                </div>
                {page.allowed ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground/50" />
                )}
              </div>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Add Role Dialog ──────────────────────────────────────────────────────────

function AddRoleDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const [mode, setMode] = useState<"preset" | "custom">("custom")
  const [name, setName] = useState("")
  const [value, setValue] = useState("")
  const [valueEdited, setValueEdited] = useState(false)
  const [description, setDescription] = useState("")
  const [selectedPreset, setSelectedPreset] = useState<(typeof ROLE_PRESETS)[0] | null>(null)

  useEffect(() => {
    if (!valueEdited) setValue(toSlug(name))
  }, [name, valueEdited])

  useEffect(() => {
    if (selectedPreset) {
      setName(selectedPreset.name)
      setValue(selectedPreset.value)
      setValueEdited(true)
      setDescription(selectedPreset.description)
      setMode("custom")
    }
  }, [selectedPreset])

  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: async () => {
      const roleData = { name: name.trim(), value, description: description.trim() || undefined }
      const result = await permissionsApi.createRole(roleData)

      // If a preset was selected, apply its page permissions
      if (selectedPreset && result.data) {
        const { data: currentPerms } = await permissionsApi.listPagePermissions()
        const pages = currentPerms?.data ?? []
        await Promise.all(
          pages.map((page) => {
            const shouldAllow = selectedPreset.pages.includes(page.pageKey as PageKey)
            const hasRole = page.allowedRoles.includes(value)
            if (shouldAllow && !hasRole) {
              return permissionsApi.updatePagePermission(page.pageKey as PageKey, [
                ...page.allowedRoles,
                value,
              ])
            }
            return Promise.resolve()
          })
        )
      }
      return result
    },
    onSuccess: () => {
      toast.success(selectedPreset ? "Preset role created and configured" : "Role created")
      queryClient.invalidateQueries({ queryKey: ["roles"] })
      queryClient.invalidateQueries({ queryKey: ["pagePermissions"] })
      onCreated()
      onOpenChange(false)
      resetForm()
    },
    onError: (error: Error) => toast.error(error.message || "Failed to create role"),
  })

  function resetForm() {
    setName("")
    setValue("")
    setValueEdited(false)
    setDescription("")
    setSelectedPreset(null)
    setMode("custom")
  }

  const slugValid = /^[a-z][a-z0-9_]*$/.test(value)

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) resetForm()
        onOpenChange(open)
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Role</DialogTitle>
          <DialogDescription>
            Add a new role that can be assigned to team members.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {/* Mode Toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "preset" ? "default" : "outline"}
              size="sm"
              className="flex-1 border-2 shadow-sm"
              onClick={() => setMode("preset")}
            >
              <Zap className="mr-2 h-3.5 w-3.5" />
              From Preset
            </Button>
            <Button
              type="button"
              variant={mode === "custom" ? "default" : "outline"}
              size="sm"
              className="flex-1 border-2 shadow-sm"
              onClick={() => setMode("custom")}
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              Custom
            </Button>
          </div>

          {mode === "preset" && (
            <div className="grid gap-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Select a Preset
              </p>
              <div className="grid gap-2">
                {ROLE_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setSelectedPreset(preset)}
                    className={`flex flex-col gap-1 border-2 p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                      selectedPreset?.value === preset.value
                        ? "border-foreground bg-primary/5"
                        : "border-muted bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{preset.name}</span>
                      {selectedPreset?.value === preset.value && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{preset.description}</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {preset.pages.map((p) => (
                        <Badge key={p} variant="outline" className="text-[10px] uppercase">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="role-name">Display Name</Label>
            <Input
              id="role-name"
              placeholder="e.g. Content Editor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-2"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="role-value">
              Slug
              <span className="ml-1.5 text-xs text-muted-foreground">(used internally)</span>
            </Label>
            <Input
              id="role-value"
              placeholder="content_editor"
              value={value}
              className="border-2 font-mono text-sm"
              onChange={(e) => {
                setValue(e.target.value)
                setValueEdited(true)
              }}
            />
            {value && !slugValid && (
              <p className="text-xs text-destructive">
                Must start with a letter. Only lowercase letters, numbers, and underscores.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="role-desc">
              Description
              <span className="ml-1.5 text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="role-desc"
              placeholder="Briefly describe what this role can do"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border-2"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-2 shadow-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !name.trim() || !value || !slugValid}
            className="shadow-sm"
          >
            {createMutation.isPending ? "Creating..." : "Create Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Access Tab ───────────────────────────────────────────────────────────────

function AccessTab() {
  const queryClient = useQueryClient()

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => permissionsApi.listRoles(),
  })

  const { data: permsData, isLoading: permsLoading } = useQuery({
    queryKey: ["pagePermissions"],
    queryFn: () => permissionsApi.listPagePermissions(),
  })

  const rolesList: Role[] = rolesData?.data ?? []
  const permissions: PagePermission[] = permsData?.data ?? []

  const updateMutation = useMutation({
    mutationFn: ({ pageKey, allowedRoles }: { pageKey: PageKey; allowedRoles: string[] }) =>
      permissionsApi.updatePagePermission(pageKey, allowedRoles),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pagePermissions"] })
      toast.success("Permission updated")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update permission")
      queryClient.invalidateQueries({ queryKey: ["pagePermissions"] })
    },
  })

  const bulkMutation = useMutation({
    mutationFn: async ({ roleValue, grant }: { roleValue: string; grant: boolean }) => {
      const currentPerms = permissions
      await Promise.all(
        currentPerms.map((perm) => {
          const hasRole = perm.allowedRoles.includes(roleValue)
          if (grant && !hasRole) {
            return permissionsApi.updatePagePermission(perm.pageKey as PageKey, [
              ...perm.allowedRoles,
              roleValue,
            ])
          }
          if (!grant && hasRole) {
            return permissionsApi.updatePagePermission(
              perm.pageKey as PageKey,
              perm.allowedRoles.filter((r) => r !== roleValue)
            )
          }
          return Promise.resolve()
        })
      )
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["pagePermissions"] })
      toast.success(vars.grant ? "All pages granted" : "All pages revoked")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Bulk update failed")
      queryClient.invalidateQueries({ queryKey: ["pagePermissions"] })
    },
  })

  function handleToggle(perm: PagePermission, roleValue: string, checked: boolean) {
    const current = perm.allowedRoles.filter((r) => r !== "owner")
    const next = checked ? [...current, roleValue] : current.filter((r) => r !== roleValue)
    const withOwner = next.includes("owner") ? next : ["owner", ...next]

    if (withOwner.length <= 1) {
      toast.error("At least one role besides Owner must have access")
      return
    }

    updateMutation.mutate({ pageKey: perm.pageKey as PageKey, allowedRoles: withOwner })
  }

  const isLoading = rolesLoading || permsLoading
  const sorted = PAGE_ORDER.map((key) => permissions.find((p) => p.pageKey === key)).filter(
    Boolean
  ) as PagePermission[]

  const matrixRoles = rolesList.filter((r) => r.value !== "owner")

  return (
    <Card className="border-2 shadow-md">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Page Access Matrix</CardTitle>
            <CardDescription className="mt-1">
              Toggle access per page and role. Owner always has full access to everything.
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 border-2 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            <Crown className="h-3 w-3" />
            Owner is always on
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-0">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b-2 px-6 py-4 last:border-0"
              >
                <div className="h-4 w-32 animate-pulse bg-muted" />
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-5 w-8 animate-pulse bg-muted" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 bg-muted/30">
                  <th className="w-56 px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Page
                  </th>
                  {/* Owner column */}
                  <th className="px-5 py-3 text-center">
                    <div className="inline-flex items-center gap-1.5 border-2 bg-amber-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                      <Crown className="h-3 w-3" />
                      Owner
                    </div>
                  </th>
                  {matrixRoles.map((role) => {
                    const palette = getRolePalette(role.value)
                    return (
                      <th key={role.value} className="px-5 py-3 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div
                            className={`inline-flex items-center gap-1 border-2 px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${palette.border} ${palette.lightBg} ${palette.text}`}
                          >
                            <Shield className="h-3 w-3" />
                            {role.name}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => bulkMutation.mutate({ roleValue: role.value, grant: true })}
                              disabled={bulkMutation.isPending}
                              className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 transition-colors hover:bg-emerald-500/10 disabled:opacity-50"
                              title="Grant all pages"
                            >
                              All
                            </button>
                            <button
                              onClick={() => bulkMutation.mutate({ roleValue: role.value, grant: false })}
                              disabled={bulkMutation.isPending}
                              className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                              title="Revoke all pages"
                            >
                              None
                            </button>
                          </div>
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {sorted.map((perm, idx) => {
                  const meta = PAGE_META[perm.pageKey as PageKey]
                  const Icon = meta?.icon ?? LayoutDashboard
                  return (
                    <tr
                      key={perm.pageKey}
                      className={`border-b-2 transition-colors hover:bg-muted/20 last:border-0 ${
                        idx % 2 === 0 ? "" : "bg-muted/10"
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-foreground bg-primary/10">
                            <Icon className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{perm.pageName}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                {meta?.category}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {meta?.description}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      {/* Owner — always on, non-interactive */}
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex items-center justify-center">
                          <Switch checked disabled size="sm" />
                        </div>
                      </td>
                      {matrixRoles.map((role) => (
                        <td key={role.value} className="px-5 py-4 text-center">
                          <Switch
                            size="sm"
                            checked={perm.allowedRoles.includes(role.value)}
                            disabled={updateMutation.isPending || bulkMutation.isPending}
                            onCheckedChange={(checked: boolean) =>
                              handleToggle(perm, role.value, checked)
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {!isLoading && (
        <div className="border-t-2 px-6 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Changes take effect on the user&apos;s next page navigation. Add new roles in the{" "}
              <strong>Roles</strong> tab.
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" /> Visible
              </span>
              <span className="flex items-center gap-1">
                <EyeOff className="h-3 w-3" /> Hidden
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
