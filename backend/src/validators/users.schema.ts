import { z } from "zod";

const BRAND_VALUES = ["watpak", "dercolbags"] as const;

export const ROLE_VALUES = [
  "owner",
  "admin",
  "marketing_manager",
  "sales_support",
] as const;

export type Role = (typeof ROLE_VALUES)[number];
export type Brand = (typeof BRAND_VALUES)[number];

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email").transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.string().min(1, "Role is required"),
  brandAccess: z
    .array(z.enum(BRAND_VALUES))
    .min(1, "At least one brand must be assigned"),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).optional(),
  role: z.string().min(1).optional(),
  brandAccess: z.array(z.enum(BRAND_VALUES)).min(1).optional(),
});

export const listUsersQuerySchema = z.object({
  page: z.string().default("1").transform(Number).pipe(z.number().int().positive()),
  limit: z.string().default("20").transform(Number).pipe(z.number().int().positive().max(100)),
  role: z.string().optional(),
  search: z.string().trim().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
