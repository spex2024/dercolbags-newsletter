import { z } from "zod";

export const createCampaignSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  brand: z.enum(["watpak", "dercolbags"]),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  content: z.string().trim().min(1, "Content is required"),
  designJson: z.record(z.unknown()).optional(),
  preheader: z.string().trim().max(200).optional(),
  targetType: z.enum(["all", "list", "segment"]),
  targetId: z.string().uuid().optional(),
});

export const updateCampaignSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  subject: z.string().trim().min(1).max(200).optional(),
  content: z.string().trim().min(1).optional(),
  designJson: z.record(z.unknown()).optional(),
  preheader: z.string().trim().max(200).optional(),
});

export const scheduleCampaignSchema = z.object({
  // Accept datetime-local ("2024-01-15T10:30"), full ISO ("2024-01-15T10:30:00.000Z"),
  // or any parseable date string — the service validates it's in the future.
  scheduledAt: z.string().min(1, "Scheduled date is required").refine(
    (v) => !isNaN(new Date(v).getTime()),
    "Invalid date format"
  ),
});

export const campaignFilterQuerySchema = z.object({
  brand: z.enum(["watpak", "dercolbags"]).optional(),
  status: z.enum(["draft", "scheduled", "sending", "sent", "cancelled"]).optional(),
  page: z.string().default("1").transform(Number).pipe(z.number().int().positive()),
  limit: z.string().default("20").transform(Number).pipe(z.number().int().positive().max(100)),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type ScheduleCampaignInput = z.infer<typeof scheduleCampaignSchema>;
export type CampaignFilterQuery = z.infer<typeof campaignFilterQuerySchema>;