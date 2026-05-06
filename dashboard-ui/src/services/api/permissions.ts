import { api } from "@/lib/api"
import type { PagePermission, PageKey, Role } from "./types"

export const permissionsApi = {
  // ─── Roles ─────────────────────────────────────────────────────────────────
  listRoles: () =>
    api.get<{ success: boolean; data: Role[] }>("/api/v1/permissions/roles"),

  createRole: (data: { name: string; value: string; description?: string }) =>
    api.post<{ success: boolean; data: Role }>("/api/v1/permissions/roles", data),

  deleteRole: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/api/v1/permissions/roles/${id}`),

  // ─── Page Permissions ───────────────────────────────────────────────────────
  listPagePermissions: () =>
    api.get<{ success: boolean; data: PagePermission[] }>("/api/v1/permissions/pages"),

  updatePagePermission: (pageKey: PageKey, allowedRoles: string[]) =>
    api.patch<{ success: boolean; data: PagePermission }>(
      `/api/v1/permissions/pages/${pageKey}`,
      { allowedRoles }
    ),
}
