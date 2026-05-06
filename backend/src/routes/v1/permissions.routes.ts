import { Hono } from "hono";
import * as controller from "../../controllers/v1/permissions.controller";
import { authMiddleware, requireRole } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { updatePagePermissionSchema, createRoleSchema } from "../../validators/permissions.schema";

const permissions = new Hono();

permissions.use("*", authMiddleware);

// ─── Roles ────────────────────────────────────────────────────────────────────

// All authenticated users can read roles (for dropdowns, etc.)
permissions.get("/roles", controller.listRoles);

// Only owner/admin can create or delete roles
permissions.post("/roles", requireRole("owner", "admin"), validate(createRoleSchema), controller.createRole);
permissions.delete("/roles/:id", requireRole("owner", "admin"), controller.deleteRole);

// ─── Page Permissions ─────────────────────────────────────────────────────────

// All authenticated users read page permissions (needed for route guards)
permissions.get("/pages", controller.listPagePermissions);

// Only owner/admin can update permissions
permissions.patch(
  "/pages/:pageKey",
  requireRole("owner", "admin"),
  validate(updatePagePermissionSchema),
  controller.updatePagePermission
);

export { permissions };
