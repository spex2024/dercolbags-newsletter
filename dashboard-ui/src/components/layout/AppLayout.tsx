import { Link, useLocation, useNavigate, useRouterState } from "@tanstack/react-router"
import { useSession, signOut } from "@/lib/auth"
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
  type LucideIcon,
} from "lucide-react"
import { canAccessPage } from "@/lib/permissions"
import { Skeleton } from "@/components/ui/skeleton"
import type { PageKey } from "@/services/api/types"

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  pageKey?: PageKey
  ownerAdminOnly?: boolean
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, pageKey: "dashboard" },
  { name: "Analytics", href: "/analytics", icon: BarChart2, pageKey: "analytics" },
  { name: "Subscribers", href: "/subscribers", icon: Users, pageKey: "subscribers" },
  { name: "Campaigns", href: "/campaigns", icon: Mail, pageKey: "campaigns" },
  { name: "Templates", href: "/templates", icon: FileText, pageKey: "templates" },
  { name: "Mailing Lists", href: "/lists", icon: List, pageKey: "lists" },
  { name: "Import / Export", href: "/import-export", icon: Download, pageKey: "import-export" },
  { name: "Users", href: "/users", icon: Settings, ownerAdminOnly: true },
  { name: "Permissions", href: "/permissions", icon: ShieldCheck, ownerAdminOnly: true },
]

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
      className={`flex items-center gap-3 border-l-[3px] px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${
        isActive
          ? "border-foreground bg-foreground/8 text-foreground"
          : "border-transparent text-muted-foreground hover:border-foreground/30 hover:bg-foreground/4 hover:text-foreground"
      } ${isCollapsed ? "justify-center px-0 border-l-0 border-b-[3px] border-t-0 border-r-0" : ""}`}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!isCollapsed && <span className="truncate">{item.name}</span>}
    </Link>
  )
}

function SidebarContent({ onNavigate, isCollapsed }: { onNavigate?: () => void; isCollapsed?: boolean }) {
  const location = useLocation()
  const { data: session, isPending: sessionLoading } = useSession()
  const routeState = useRouterState()
  const role = (session?.user as any)?.role as string | undefined
  const pagePermissions = (routeState as any)?.loaderData?.pagePermissions ?? []

  const visibleNav = navigation.filter((item) => {
    if (!role) return false
    if (item.ownerAdminOnly) return role === "owner" || role === "admin"
    if (item.pageKey) return canAccessPage(role, item.pageKey, pagePermissions)
    return true
  })

  return (
    <>
      {/* Logo — inverted */}
      <div className={`bg-foreground text-background border-b flex items-center gap-3 ${isCollapsed ? "justify-center p-3" : "px-4 py-4"}`}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-background text-foreground font-black text-xs">
          DC
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <p className="truncate text-[11px] font-black uppercase tracking-[0.15em] text-background">
              DercolBags
            </p>
            <p className="truncate text-[10px] tracking-wider text-background/50">
              Newsletter
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3">
        {sessionLoading
          ? Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2.5 ${isCollapsed ? "justify-center px-0" : ""}`}
              >
                <Skeleton className="h-4 w-4 shrink-0" />
                {!isCollapsed && <Skeleton className="h-3 flex-1" style={{ width: `${55 + (i % 3) * 20}%` }} />}
              </div>
            ))
          : visibleNav.map((item) => {
              const isActive = location.pathname.startsWith(item.href)
              return (
                <NavLink
                  key={item.name}
                  item={item}
                  isActive={isActive}
                  onClick={onNavigate}
                  isCollapsed={isCollapsed}
                />
              )
            })}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="border-t px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            © {new Date().getFullYear()} DercolBags
          </p>
        </div>
      )}
    </>
  )
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { data: session, isPending: sessionLoading } = useSession()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const userName = session?.user?.name || "User"
  const userEmail = session?.user?.email || ""
  const userInitial = userName[0]?.toUpperCase() || "U"

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-full flex-col">
            <SidebarContent onNavigate={() => setSidebarOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r-2 bg-card md:flex transition-all duration-200 ${
          isCollapsed ? "w-14" : "w-60"
        }`}
      >
        <div className="flex h-full flex-col">
          <SidebarContent isCollapsed={isCollapsed} />
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-200 ${isCollapsed ? "md:pl-14" : "md:pl-60"}`}>
        {/* Top Bar */}
        <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b-2 bg-card px-4 sm:px-6">
          <div className="flex items-center gap-2">
            {/* Mobile menu */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            {/* Desktop collapse */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed
                ? <PanelLeft className="h-4 w-4" />
                : <PanelLeftClose className="h-4 w-4" />
              }
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
                <DropdownMenuContent className="w-52" align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-xs font-bold uppercase tracking-wider">{userName}</p>
                        <p className="text-[11px] text-muted-foreground">{userEmail}</p>
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await signOut()
                      navigate({ to: "/login" })
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
