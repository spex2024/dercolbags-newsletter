import type { Context } from "hono";
import * as service from "../../services/permissions.service";
import { successResponse } from "../../utils/response";
import type { UpdatePagePermissionInput, CreateRoleInput } from "../../validators/permissions.schema";

// ─── Roles ────────────────────────────────────────────────────────────────────

export async function listRoles(c: Context) {
  const rolesList = await service.listRoles();
  return c.json(successResponse(rolesList));
}

export async function createRole(c: Context) {
  const data = c.get("validated") as CreateRoleInput;
  const created = await service.createRole(data);
  return c.json(successResponse(created, "Role created successfully"), 201);
}

export async function deleteRole(c: Context) {
  const id = c.req.param("id") ?? "";
  await service.deleteRole(id);
  return c.json(successResponse(null, "Role deleted successfully"));
}

// ─── Page Permissions ─────────────────────────────────────────────────────────

export async function listPagePermissions(c: Context) {
  const permissions = await service.listPagePermissions();
  return c.json(successResponse(permissions));
}

export async function updatePagePermission(c: Context) {
  const pageKey = c.req.param("pageKey") ?? "";
  const data = c.get("validated") as UpdatePagePermissionInput;
  const updated = await service.updatePagePermission(pageKey, data);
  return c.json(successResponse(updated, "Permission updated successfully"));
}
