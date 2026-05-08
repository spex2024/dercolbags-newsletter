import { z } from "zod";

export const createSubscriberSchema = z.object({
  brand: z.enum(["watpak", "dercolbags"]),
  name: z.string().trim().min(1).optional(), // person's name or business name
  email: z.string().email("Invalid email address").transform((v) => v.toLowerCase().trim()),
  phone: z.string().trim().min(1).optional(),
  location: z.string().trim().min(1).optional(),
  source: z.string().trim().min(1).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(["new", "contacted", "converted", "spam"]),
});

export const listSubscribersSchema = z.object({
  brand: z.enum(["watpak", "dercolbags"]).optional(),
  search: z.string().trim().optional(),
  status: z.enum(["new", "contacted", "converted", "spam"]).optional(),
  isSubscribed: z
    .string()
    .transform((v) => v === "true")
    .optional(),
  unsubscribeReason: z.enum(["manual", "bounce", "complaint", "admin"]).optional(),
  page: z
    .string()
    .default("1")
    .transform(Number)
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .default("20")
    .transform(Number)
    .pipe(z.number().int().positive().max(100)),
  sortBy: z
    .enum(["createdAt", "email", "name", "status", "brand"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateSubscriberInput = z.infer<typeof createSubscriberSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type ListSubscribersQuery = z.infer<typeof listSubscribersSchema>;
