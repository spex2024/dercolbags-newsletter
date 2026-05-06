import { redirect } from "@tanstack/react-router"
import type { PageKey, PagePermission, UserRole } from "@/services/api/types"

interface RouteContext {
  session: {
    user: { id: string; name: string; email: string; role: string }
  }
  pagePermissions: PagePermission[]
}

/**
 * Throws a redirect to /forbidden if the current user's role is not allowed
 * to access the given page. Owner and admin always bypass this check.
 */
export function requirePageAccess(context: unknown, pageKey: PageKey): void {
  const ctx = context as Partial<RouteContext>
  if (!ctx?.session || !ctx?.pagePermissions) return

  const role = ctx.session.user.role as UserRole
  if (role === "owner" || role === "admin") return

  const perm = ctx.pagePermissions.find((p) => p.pageKey === pageKey)
  if (perm && !perm.allowedRoles.includes(role)) {
    throw redirect({ to: "/forbidden" })
  }
}

export function canAccessPage(
  role: UserRole | string,
  pageKey: PageKey,
  pagePermissions: PagePermission[]
): boolean {
  if (role === "owner" || role === "admin") return true
  const perm = pagePermissions.find((p) => p.pageKey === pageKey)
  if (!perm) return true
  return perm.allowedRoles.includes(role as UserRole)
}
