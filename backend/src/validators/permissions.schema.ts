import { z } from "zod";

export const PAGE_KEYS = [
  "dashboard",
  "analytics",
  "subscribers",
  "campaigns",
  "templates",
  "lists",
  "import-export",
] as const;

export type PageKey = (typeof PAGE_KEYS)[number];

export const PAGE_NAMES: Record<PageKey, string> = {
  dashboard: "Dashboard",
  analytics: "Analytics",
  subscribers: "Subscribers",
  campaigns: "Campaigns",
  templates: "Templates",
  lists: "Mailing Lists",
  "import-export": "Import / Export",
};

export const updatePagePermissionSchema = z.object({
  allowedRoles: z.array(z.string().min(1)).min(1, "At least one role must have access"),
});

export const createRoleSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  value: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters")
    .regex(
      /^[a-z][a-z0-9_]*$/,
      "Slug must start with a letter and contain only lowercase letters, numbers, and underscores"
    ),
  description: z.string().trim().optional(),
});

export type UpdatePagePermissionInput = z.infer<typeof updatePagePermissionSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
