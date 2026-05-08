import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db/client";
import { emailTemplates, templateAuditLogs, type EmailTemplate } from "../db/schema";
import { AppError } from "../utils/errors";
import { sendTemplateEmail } from "./email.service";
import { validateTemplateInput, sanitizeHtml } from "../utils/html-validator";
import type {
  CreateEmailTemplateInput,
  UpdateEmailTemplateInput,
  UpdateTemplateStatusInput,
  ListEmailTemplatesQuery,
  TemplateKey,
} from "../validators/email-template.schema";
import type { AuthUser } from "../middlewares/auth.middleware";
import type { Brand } from "./subscribers.service";

type AllowedBrands = Brand[] | null;

export async function createEmailTemplate(input: CreateEmailTemplateInput, userId: string) {
  validateTemplateInput(input.htmlContent, input.category, input.designJson);

  const existing = await db
    .select({ id: emailTemplates.id })
    .from(emailTemplates)
    .where(and(eq(emailTemplates.brand, input.brand), eq(emailTemplates.templateKey, input.templateKey)))
    .limit(1);

  if (existing.length > 0) {
    throw new AppError(`Template with key '${input.templateKey}' already exists for brand '${input.brand}'`, 409);
  }

  const sanitizedHtml = sanitizeHtml(input.htmlContent);

  const [template] = await db
    .insert(emailTemplates)
    .values({
      ...input,
      htmlContent: sanitizedHtml,
      createdBy: userId,
    })
    .returning();

  if (!template) throw new AppError("Failed to create template", 500);

  await logTemplateAction(template.id, "created", { input }, userId);
  return template;
}

export async function getTemplateById(id: string, allowedBrands: AllowedBrands) {
  const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id)).limit(1);
  if (!template) throw new AppError("Template not found", 404);

  if (allowedBrands !== null && !allowedBrands.includes(template.brand)) {
    throw new AppError("You do not have access to this template", 403);
  }
  return template;
}

export async function getActiveTemplate(brand: Brand, templateKey: TemplateKey): Promise<EmailTemplate | null> {
  const [template] = await db
    .select()
    .from(emailTemplates)
    .where(and(eq(emailTemplates.brand, brand), eq(emailTemplates.templateKey, templateKey), eq(emailTemplates.status, "active")))
    .limit(1);

  return template ?? null;
}

export async function listEmailTemplates(query: ListEmailTemplatesQuery, allowedBrands: AllowedBrands) {
  const { brand, status, category, templateKey, page, limit } = query;

  if (brand && allowedBrands !== null && !allowedBrands.includes(brand)) {
    throw new AppError("You do not have access to this brand", 403);
  }

  const conditions = [];
  if (brand) conditions.push(eq(emailTemplates.brand, brand));
  if (status) conditions.push(eq(emailTemplates.status, status));
  if (category) conditions.push(eq(emailTemplates.category, category));
  if (templateKey) conditions.push(eq(emailTemplates.templateKey, templateKey));
  if (allowedBrands !== null && allowedBrands.length > 0) {
    conditions.push(inArray(emailTemplates.brand, allowedBrands));
  } else if (allowedBrands !== null && allowedBrands.length === 0) {
    return { items: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;

  const [items, countResult] = await Promise.all([
    db.select().from(emailTemplates).where(where).limit(limit).offset(offset).orderBy(asc(emailTemplates.name)),
    db.select({ total: count() }).from(emailTemplates).where(where),
  ]);

  const total = Number(countResult[0]?.total ?? 0);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function updateTemplate(id: string, input: UpdateEmailTemplateInput, allowedBrands: AllowedBrands, userId: string) {
  const existing = await getTemplateById(id, allowedBrands);

  if (input.htmlContent) {
    validateTemplateInput(input.htmlContent, existing.category, input.designJson);
  }
  if (input.designJson && !input.htmlContent) {
    validateTemplateInput(existing.htmlContent, existing.category, input.designJson);
  }

  const [updated] = await db
    .update(emailTemplates)
    .set({
      ...(input.name        && { name: input.name.trim() }),
      ...(input.subject     && { subject: input.subject.trim() }),
      ...(input.templateKey && { templateKey: input.templateKey }),
      ...(input.category    && { category: input.category }),
      ...(input.htmlContent && { htmlContent: sanitizeHtml(input.htmlContent) }),
      ...(input.plainTextContent !== undefined && { plainTextContent: input.plainTextContent?.trim() ?? null }),
      ...(input.designJson !== undefined && { designJson: input.designJson }),
    })
    .where(eq(emailTemplates.id, id))
    .returning();

  await logTemplateAction(id, "updated", { changes: input }, userId);
  return updated;
}

export async function updateTemplateStatus(
  id: string,
  input: UpdateTemplateStatusInput,
  allowedBrands: AllowedBrands,
  userId: string
) {
  const existing = await getTemplateById(id, allowedBrands);

  if (input.status === "active") {
    const requireUnsubscribe = existing.category === "campaign" || existing.category === "notification";
    if (requireUnsubscribe && !existing.htmlContent.includes("{{unsubscribeUrl}}")) {
      throw new AppError("Cannot activate campaign template without {{unsubscribeUrl}} variable", 400);
    }

    await db
      .update(emailTemplates)
      .set({ status: "archived" })
      .where(and(eq(emailTemplates.brand, existing.brand), eq(emailTemplates.templateKey, existing.templateKey), eq(emailTemplates.status, "active")));
  }

  const [updated] = await db
    .update(emailTemplates)
    .set({ status: input.status })
    .where(eq(emailTemplates.id, id))
    .returning();

  await logTemplateAction(id, "status_changed", { oldStatus: existing.status, newStatus: input.status }, userId);
  return updated;
}

export async function deleteTemplate(id: string, allowedBrands: AllowedBrands, userId: string) {
  const existing = await getTemplateById(id, allowedBrands);

  await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
  await logTemplateAction(id, "deleted", { templateKey: existing.templateKey, brand: existing.brand }, userId);
}

export async function duplicateTemplate(id: string, allowedBrands: AllowedBrands, userId: string) {
  const existing = await getTemplateById(id, allowedBrands);

  const [newTemplate] = await db
    .insert(emailTemplates)
    .values({
      brand: existing.brand,
      templateKey: existing.templateKey,
      name: `${existing.name} (Copy)`,
      subject: existing.subject,
      htmlContent: existing.htmlContent,
      plainTextContent: existing.plainTextContent,
      designJson: existing.designJson,
      status: "draft",
      category: existing.category,
      createdBy: userId,
    })
    .returning();

  await logTemplateAction(id, "duplicated", { newTemplateId: newTemplate.id }, userId);
  return newTemplate;
}

export async function previewTemplate(id: string, variables: Record<string, unknown>, allowedBrands: AllowedBrands) {
  const template = await getTemplateById(id, allowedBrands);
  const renderedHtml = renderTemplate(template.htmlContent, variables);
  const renderedSubject = renderTemplate(template.subject, variables);

  return {
    subject: renderedSubject,
    html: renderedHtml,
    variables: Object.keys(variables),
    missingVariables: findMissingVariables(template.htmlContent, variables),
  };
}

export async function sendTestEmail(
  id: string,
  email: string,
  variables: Record<string, unknown>,
  allowedBrands: AllowedBrands,
  userId: string
) {
  const template = await getTemplateById(id, allowedBrands);

  const requireUnsubscribe = template.category === "campaign" || template.category === "notification";
  if (requireUnsubscribe && !template.htmlContent.includes("{{unsubscribeUrl}}")) {
    throw new AppError("Cannot send test for campaign template without {{unsubscribeUrl}} variable", 400);
  }

  const mergedVariables = {
    brandName: template.brand === "watpak" ? "WatPak" : "DercolBags",
    unsubscribeUrl: "https://example.com/unsubscribe",
    ...variables,
  };

  await sendTemplateEmail({
    brand: template.brand,
    to: email,
    subject: `[TEST] ${renderTemplate(template.subject, mergedVariables)}`,
    html: renderTemplate(template.htmlContent, mergedVariables),
  });

  await logTemplateAction(id, "test_sent", { testEmail: email }, userId);

  return { sent: true, sentTo: email };
}

export function renderTemplate(content: string, variables: Record<string, unknown>): string {
  let result = content;

  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined && value !== null) {
      const placeholder = `{{${key}}}`;
      result = result.split(placeholder).join(String(value));
    }
  }

  return result;
}

export function findMissingVariables(template: string, provided: Record<string, unknown>): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const found = new Set<string>();
  let match;

  while ((match = regex.exec(template)) !== null) {
    const varName = match[1];
    if (!(varName in provided) || provided[varName] === undefined || provided[varName] === null) {
      found.add(varName);
    }
  }

  return Array.from(found);
}

export function validateTemplateVariables(
  templateKey: TemplateKey,
  variables: Record<string, unknown>,
  requireUnsubscribe: boolean
): string[] {
  const missing: string[] = [];

  const requiredByCategory: Record<string, string[]> = {
    campaign: ["brandName"],
    auth: [],
    system: [],
    notification: [],
  };

  for (const varName of requiredByCategory[templateKey.includes("campaign") ? "campaign" : "default"] || []) {
    if (!variables[varName]) missing.push(varName);
  }

  if (requireUnsubscribe && templateKey.includes("campaign") && !variables.unsubscribeUrl) {
    missing.push("unsubscribeUrl");
  }

  return missing;
}

async function logTemplateAction(templateId: string, action: string, changes: Record<string, unknown>, performedBy: string) {
  await db.insert(templateAuditLogs).values({
    templateId,
    action,
    changes,
    performedBy,
  });
}