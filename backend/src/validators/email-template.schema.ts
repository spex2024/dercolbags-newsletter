import { z } from "zod";

export const TEMPLATE_KEYS = [
  "subscriber_confirmation",
  "unsubscribe_confirmation",
  "user_invite",
  "password_reset",
  "campaign_default",
  "campaign_test",
  "admin_new_subscriber_notification",
] as const;

export const TEMPLATE_CATEGORIES = ["system", "auth", "campaign", "notification"] as const;
export const TEMPLATE_STATUSES = ["draft", "active", "archived"] as const;

export const templateVariablesSchema = z.object({
  brandName: z.string().optional(),
  firstName: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  businessName: z.string().optional(),
  location: z.string().optional(),
  unsubscribeUrl: z.string().url().optional(),
  inviteUrl: z.string().url().optional(),
  resetPasswordUrl: z.string().url().optional(),
  dashboardUrl: z.string().url().optional(),
  campaignTitle: z.string().optional(),
  campaignContent: z.string().optional(),
  ctaText: z.string().optional(),
  ctaUrl: z.string().url().optional(),
});

export const createEmailTemplateSchema = z.object({
  brand: z.enum(["watpak", "dercolbags"]),
  templateKey: z.enum(TEMPLATE_KEYS),
  name: z.string().trim().min(1, "Name is required").max(100),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  htmlContent: z.string().trim().min(1, "HTML content is required"),
  plainTextContent: z.string().trim().optional(),
  designJson: z.record(z.unknown()).optional(),
  category: z.enum(TEMPLATE_CATEGORIES),
});

export const updateEmailTemplateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  subject: z.string().trim().min(1).max(200).optional(),
  htmlContent: z.string().trim().min(1).optional(),
  plainTextContent: z.string().trim().optional(),
  designJson: z.record(z.unknown()).optional(),
});

export const updateTemplateStatusSchema = z.object({
  status: z.enum(TEMPLATE_STATUSES),
});

export const previewTemplateSchema = z.object({
  variables: templateVariablesSchema,
});

export const sendTestSchema = z.object({
  email: z.string().email("Valid email is required"),
  variables: templateVariablesSchema,
});

export const listEmailTemplatesQuerySchema = z.object({
  brand: z.enum(["watpak", "dercolbags"]).optional(),
  status: z.enum(TEMPLATE_STATUSES).optional(),
  category: z.enum(TEMPLATE_CATEGORIES).optional(),
  templateKey: z.enum(TEMPLATE_KEYS).optional(),
  page: z.string().default("1").transform(Number).pipe(z.number().int().positive()),
  limit: z.string().default("20").transform(Number).pipe(z.number().int().positive().max(100)),
});

export type TemplateVariables = z.infer<typeof templateVariablesSchema>;
export type CreateEmailTemplateInput = z.infer<typeof createEmailTemplateSchema>;
export type UpdateEmailTemplateInput = z.infer<typeof updateEmailTemplateSchema>;
export type UpdateTemplateStatusInput = z.infer<typeof updateTemplateStatusSchema>;
export type PreviewTemplateInput = z.infer<typeof previewTemplateSchema>;
export type SendTestInput = z.infer<typeof sendTestSchema>;
export type ListEmailTemplatesQuery = z.infer<typeof listEmailTemplatesQuerySchema>;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];