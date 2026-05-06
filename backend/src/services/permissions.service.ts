import { db } from "../db/client";
import { pagePermissions, roles } from "../db/schema";
import { eq } from "drizzle-orm";
import {
  PAGE_KEYS,
  PAGE_NAMES,
  type PageKey,
  type UpdatePagePermissionInput,
  type CreateRoleInput,
} from "../validators/permissions.schema";
import { AppError } from "../utils/errors";

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SYSTEM_ROLES = [
  {
    name: "Owner",
    value: "owner",
    description: "Full system access. Cannot be restricted or deleted.",
    isSystem: true,
  },
  {
    name: "Admin",
    value: "admin",
    description: "Administrative access to all features and settings.",
    isSystem: true,
  },
  {
    name: "Marketing Manager",
    value: "marketing_manager",
    description: "Manages campaigns, templates, and mailing lists.",
    isSystem: false,
  },
  {
    name: "Sales Support",
    value: "sales_support",
    description: "Views and manages subscriber data.",
    isSystem: false,
  },
];

// ─── Roles ────────────────────────────────────────────────────────────────────

export async function listRoles() {
  await db.insert(roles).values(SYSTEM_ROLES).onConflictDoNothing();
  return db.select().from(roles).orderBy(roles.createdAt);
}

export async function createRole(input: CreateRoleInput) {
  const existing = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.value, input.value))
    .limit(1);

  if (existing.length > 0) {
    throw new AppError("A role with this slug already exists", 409);
  }

  const [created] = await db.insert(roles).values(input).returning();
  return created!;
}

export async function deleteRole(id: string) {
  const [existingRole] = await db
    .select()
    .from(roles)
    .where(eq(roles.id, id))
    .limit(1);

  if (!existingRole) throw new AppError("Role not found", 404);
  if (existingRole.isSystem) throw new AppError("System roles cannot be deleted", 403);

  // Remove this role from all page permission records
  const allPerms = await db.select().from(pagePermissions);
  await Promise.all(
    allPerms.map((perm) => {
      const filtered = (perm.allowedRoles as string[]).filter(
        (r) => r !== existingRole.value
      );
      return db
        .update(pagePermissions)
        .set({ allowedRoles: filtered })
        .where(eq(pagePermissions.id, perm.id));
    })
  );

  await db.delete(roles).where(eq(roles.id, id));
}

// ─── Page Permissions ─────────────────────────────────────────────────────────

export async function listPagePermissions() {
  // Seed all role values as defaults for any missing page records
  const allRoles = await listRoles();
  const allRoleValues = allRoles.map((r) => r.value);

  await db
    .insert(pagePermissions)
    .values(
      PAGE_KEYS.map((key) => ({
        pageKey: key,
        pageName: PAGE_NAMES[key],
        allowedRoles: allRoleValues,
      }))
    )
    .onConflictDoNothing();

  return db.select().from(pagePermissions).orderBy(pagePermissions.pageKey);
}

export async function updatePagePermission(
  pageKey: string,
  input: UpdatePagePermissionInput
) {
  if (!PAGE_KEYS.includes(pageKey as PageKey)) {
    throw new AppError("Invalid page key", 400);
  }

  const [updated] = await db
    .insert(pagePermissions)
    .values({
      pageKey,
      pageName: PAGE_NAMES[pageKey as PageKey],
      allowedRoles: input.allowedRoles,
    })
    .onConflictDoUpdate({
      target: pagePermissions.pageKey,
      set: {
        allowedRoles: input.allowedRoles,
        updatedAt: new Date(),
      },
    })
    .returning();

  return updated!;
}
