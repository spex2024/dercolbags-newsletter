import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { AppLayout } from "@/components/layout/AppLayout"
import { authClient } from "@/lib/auth"
import { api } from "@/lib/api"
import type { PagePermission } from "@/services/api/types"

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return

    try {
      const { data: session } = await authClient.getSession()
      if (!session) {
        throw redirect({ to: "/login", search: { redirect: location.href } })
      }

      let pagePermissions: PagePermission[] = []
      try {
        const result = await api.get<{ success: boolean; data: PagePermission[] }>(
          "/api/v1/permissions/pages"
        )
        pagePermissions = result.data ?? []
      } catch {
        // Fail open — if permissions can't be fetched, don't block navigation
      }

      return { session, pagePermissions }
    } catch (e) {
      if (e && typeof e === "object" && "to" in e) throw e
      throw redirect({ to: "/login", search: { redirect: location.href } })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}
