import { z } from "zod";

// Accept both "YYYY-MM-DD" (from date inputs) and full ISO datetimes
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Must be a valid date").optional();

export const subscriberFilterSchema = z.object({
  brand: z.enum(["watpak", "dercolbags"]).optional(),
  status: z.array(z.enum(["new", "contacted", "converted", "spam"])).optional(),
  isSubscribed: z.boolean().optional(),
  location: z.string().trim().optional(),
  createdAtFrom: dateString,
  createdAtTo: dateString,
  lastEmailSentAfter: dateString,
  lastEmailSentBefore: dateString,
});

export const createMailingListSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  brand: z.enum(["watpak", "dercolbags"]),
  description: z.string().trim().max(500).optional(),
  isDynamic: z.boolean().default(false),
  filterConfig: subscriberFilterSchema.nullable().optional(),
});

export const updateMailingListSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  isDynamic: z.boolean().optional(),
  filterConfig: subscriberFilterSchema.nullable().optional(),
});

export const addSubscribersToListSchema = z.object({
  subscriberIds: z.array(z.string().uuid()).min(1).max(100),
});

export const listMailingListsQuerySchema = z.object({
  brand: z.enum(["watpak", "dercolbags"]).optional(),
  page: z.string().default("1").transform(Number).pipe(z.number().int().positive()),
  limit: z.string().default("20").transform(Number).pipe(z.number().int().positive().max(100)),
});

export type SubscriberFilterConfig = z.infer<typeof subscriberFilterSchema>;
export type CreateMailingListInput = z.infer<typeof createMailingListSchema>;
export type UpdateMailingListInput = z.infer<typeof updateMailingListSchema>;
export type AddSubscribersInput = z.infer<typeof addSubscribersToListSchema>;
export type ListMailingListsQuery = z.infer<typeof listMailingListsQuerySchema>;