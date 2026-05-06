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
import { Separator } from "@/components/ui/separator"
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
      className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      } ${isCollapsed ? "justify-center px-0" : ""}`}
    >
      <item.icon className="h-4.5 w-4.5 shrink-0" />
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

  const isLoading = sessionLoading

  const visibleNav = navigation.filter((item) => {
    if (!role) return false
    if (item.ownerAdminOnly) return role === "owner" || role === "admin"
    if (item.pageKey) return canAccessPage(role, item.pageKey, pagePermissions)
    return true
  })

  return (
    <>
      {/* Logo */}
      <div className={`flex items-center ${isCollapsed ? "justify-center px-0" : "gap-3 px-4"} py-5`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-primary text-primary-foreground font-bold text-sm">
          NL
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold tracking-tight">Newsletter</h2>
            <p className="truncate text-xs text-muted-foreground">Dashboard</p>
          </div>
        )}
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {isLoading
          ? Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2.5 ${isCollapsed ? "justify-center px-0" : ""}`}
              >
                <Skeleton className="h-[18px] w-[18px] shrink-0 rounded" />
                {!isCollapsed && <Skeleton className="h-3.5 flex-1 rounded" style={{ width: `${55 + (i % 3) * 20}%` }} />}
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
          <p className="truncate text-xs text-muted-foreground">
            © {new Date().getFullYear()} Newsletter
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
      <aside className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r bg-card md:flex transition-all duration-300 ${isCollapsed ? "w-16" : "w-64"}`}>
        <div className="flex h-full flex-col">
          <SidebarContent isCollapsed={isCollapsed} />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`transition-all duration-300 ${isCollapsed ? "md:pl-16" : "md:pl-64"}`}>
        {/* Top Bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-card/80 px-4 backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="hidden md:flex bg-card"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? <PanelLeft className="h-4.5 w-4.5" /> : <PanelLeftClose className="h-4.5 w-4.5" />}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <BrandSwitcher />

            <Separator orientation="vertical" className="h-6" />

            {sessionLoading ? (
              <Skeleton className="h-8 w-8 rounded-full" />
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" className="relative h-8 w-8" />}>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{userName}</p>
                        <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
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
