import { Link, useLocation, useNavigate, useRouterState } from "@tanstack/react-router"
import { useSession, signOut } from "@/lib/auth"
import { useBrand } from "@/contexts/BrandContext"
import { BrandSwitcher } from "@/components/BrandSwitcher"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useState, type ReactNode } from "react"
import {
  LayoutDashboard,
  Users,
  Mail,
  FileText,
  List,
  Download,
  Settings,
  Menu,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  ShieldCheck,
  BarChart2,
  ChevronRight,
  type LucideIcon,
} from "lucide-react"
import { canAccessPage } from "@/lib/permissions"
import { Skeleton } from "@/components/ui/skeleton"
import type { PageKey } from "@/services/api/types"

const BRAND_META: Record<string, { logoSrc: string; name: string; short: string; accent: string }> = {
  dercolbags: {
    logoSrc: "https://res.cloudinary.com/ddwet1dzj/image/upload/v1777042366/dercolbags/DERCOLBAGS_LOGO_tolkgw.png",
    name:    "DercolBags",
    short:   "DC",
    accent:  "#1a1a1a",
  },
  watpak: {
    logoSrc: "https://res.cloudinary.com/ddwet1dzj/image/upload/v1777186978/watpack/Yellow_yz973x.png",
    name:    "WatPak",
    short:   "WP",
    accent:  "#b45309",
  },
}

function BrandLogo({ brand, collapsed }: { brand: string; collapsed?: boolean }) {
  const meta = BRAND_META[brand] ?? BRAND_META.dercolbags
  const [imgFailed, setImgFailed] = useState(false)

  if (collapsed) {
    return imgFailed ? (
      <div className="flex h-8 w-8 items-center justify-center bg-background text-foreground text-[11px] font-black shrink-0">
        {meta.short}
      </div>
    ) : (
      <img
        src={meta.logoSrc}
        alt={meta.name}
        onError={() => setImgFailed(true)}
        className="h-8 w-8 object-contain shrink-0"
      />
    )
  }

  return (
    <div className="flex items-center gap-3 min-w-0">
      {imgFailed ? (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-background text-foreground text-[11px] font-black">
          {meta.short}
        </div>
      ) : (
        <img
          src={meta.logoSrc}
          alt={meta.name}
          onError={() => setImgFailed(true)}
          className="h-11 w-auto max-w-[140px] object-contain shrink-0"
        />
      )}
      <div className="min-w-0">
        <p className="truncate text-[13px] font-black uppercase tracking-[0.1em] text-background leading-none">
          {meta.name}
        </p>
        <p className="text-[10px] tracking-widest text-background/50 mt-0.5">Newsletter</p>
      </div>
    </div>
  )
}

// ── Nav structure ─────────────────────────────────────────────────────────────

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  pageKey?: PageKey
  ownerAdminOnly?: boolean
}

const mainNav: NavItem[] = [
  { name: "Dashboard",     href: "/dashboard",    icon: LayoutDashboard, pageKey: "dashboard" },
  { name: "Analytics",     href: "/analytics",    icon: BarChart2,       pageKey: "analytics" },
  { name: "Subscribers",   href: "/subscribers",  icon: Users,           pageKey: "subscribers" },
  { name: "Campaigns",     href: "/campaigns",    icon: Mail,            pageKey: "campaigns" },
  { name: "Templates",     href: "/templates",    icon: FileText,        pageKey: "templates" },
  { name: "Mailing Lists", href: "/lists",        icon: List,            pageKey: "lists" },
  { name: "Import / Export", href: "/import-export", icon: Download,    pageKey: "import-export" },
]

const adminNav: NavItem[] = [
  { name: "Users",       href: "/users",       icon: Settings,    ownerAdminOnly: true },
  { name: "Permissions", href: "/permissions", icon: ShieldCheck, ownerAdminOnly: true },
]

// ── NavLink ───────────────────────────────────────────────────────────────────

function NavLink({
  item,
  isActive,
  onClick,
  isCollapsed,
}: {
  item: NavItem
  isActive: boolean
  onClick?: () => void
  isCollapsed?: boolean
}) {
  return (
    <Link
      to={item.href}
      onClick={onClick}
      title={isCollapsed ? item.name : undefined}
      className={`group relative flex items-center gap-3 rounded-none transition-all duration-150
        ${isCollapsed ? "justify-center px-0 py-3" : "px-4 py-2.5"}
        ${isActive
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-foreground/6 hover:text-foreground"
        }`}
    >
      {/* Active indicator bar */}
      {!isCollapsed && isActive && (
        <span className="absolute left-0 top-1 bottom-1 w-[3px] bg-background" />
      )}
      <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-background" : ""}`} />
      {!isCollapsed && (
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] truncate flex-1">
          {item.name}
        </span>
      )}
      {!isCollapsed && isActive && (
        <ChevronRight className="h-3 w-3 text-background/50 shrink-0" />
      )}
    </Link>
  )
}

// ── Sidebar content ───────────────────────────────────────────────────────────

function SidebarContent({ onNavigate, isCollapsed }: { onNavigate?: () => void; isCollapsed?: boolean }) {
  const location   = useLocation()
  const routeState = useRouterState()
  const { data: session, isPending: sessionLoading } = useSession()
  const { currentBrand } = useBrand()

  const role            = (session?.user as any)?.role as string | undefined
  const pagePermissions = (routeState as any)?.loaderData?.pagePermissions ?? []

  const visibleMain  = mainNav.filter((item) => {
    if (!role) return false
    if (item.pageKey) return canAccessPage(role, item.pageKey, pagePermissions)
    return true
  })
  const visibleAdmin = adminNav.filter((item) => {
    if (!role) return false
    return role === "owner" || role === "admin"
  })

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── Brand logo area ── */}
      <div className={`flex items-center border-b-2 border-foreground/10 bg-foreground
        ${isCollapsed ? "justify-center p-3 min-h-[56px]" : "px-4 py-3 min-h-[64px]"}`}
      >
        <BrandLogo brand={currentBrand} collapsed={isCollapsed} />
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">

        {sessionLoading
          ? Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className={`flex items-center gap-3 px-2 py-2.5 ${isCollapsed ? "justify-center" : ""}`}>
                <Skeleton className="h-4 w-4 shrink-0" />
                {!isCollapsed && <Skeleton className="h-3" style={{ width: `${50 + (i % 3) * 20}%` }} />}
              </div>
            ))
          : (
            <>
              {!isCollapsed && (
                <p className="px-2 pb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                  Main
                </p>
              )}
              {visibleMain.map((item) => (
                <NavLink
                  key={item.name}
                  item={item}
                  isActive={location.pathname.startsWith(item.href)}
                  onClick={onNavigate}
                  isCollapsed={isCollapsed}
                />
              ))}

              {visibleAdmin.length > 0 && (
                <>
                  {!isCollapsed
                    ? <p className="mt-4 px-2 pb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Admin</p>
                    : <div className="my-2 mx-2 border-t border-foreground/10" />
                  }
                  {visibleAdmin.map((item) => (
                    <NavLink
                      key={item.name}
                      item={item}
                      isActive={location.pathname.startsWith(item.href)}
                      onClick={onNavigate}
                      isCollapsed={isCollapsed}
                    />
                  ))}
                </>
              )}
            </>
          )
        }
      </nav>

      {/* ── Footer ── */}
      {!isCollapsed && (
        <div className="border-t border-foreground/10 px-4 py-3">
          <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">
            © {new Date().getFullYear()} {BRAND_META[currentBrand]?.name ?? "DercolBags"}
          </p>
        </div>
      )}
    </div>
  )
}

// ── App layout ────────────────────────────────────────────────────────────────

export function AppLayout({ children }: { children: ReactNode }) {
  const { data: session, isPending: sessionLoading } = useSession()
  const navigate = useNavigate()
  const [sidebarOpen,  setSidebarOpen]  = useState(false)
  const [isCollapsed,  setIsCollapsed]  = useState(false)

  const userName    = session?.user?.name  || "User"
  const userEmail   = session?.user?.email || ""
  const userRole    = (session?.user as any)?.role as string | undefined
  const userInitial = userName[0]?.toUpperCase() || "U"

  return (
    <div className="min-h-screen bg-background">

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0 border-r-2">
          <SidebarContent onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r-2 bg-card md:flex transition-all duration-200 ${isCollapsed ? "w-14" : "w-60"}`}>
        <SidebarContent isCollapsed={isCollapsed} />
      </aside>

      {/* Main */}
      <div className={`transition-all duration-200 ${isCollapsed ? "md:pl-14" : "md:pl-60"}`}>

        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b-2 bg-card px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <BrandSwitcher />
            <div className="h-5 w-px bg-border" />

            {sessionLoading ? (
              <Skeleton className="h-7 w-7" />
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" className="relative h-7 w-7 p-0" />}>
                  <Avatar className="h-7 w-7 rounded-none">
                    <AvatarFallback className="rounded-none bg-foreground text-background text-[11px] font-black">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-xs font-black uppercase tracking-wider">{userName}</p>
                        <p className="text-[11px] text-muted-foreground">{userEmail}</p>
                        {userRole && (
                          <span className="mt-1 inline-block text-[9px] font-bold uppercase tracking-widest bg-foreground/8 text-foreground px-1.5 py-0.5 w-fit">
                            {userRole.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => { await signOut(); navigate({ to: "/login" }) }}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
