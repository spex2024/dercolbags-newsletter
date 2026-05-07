import type { Context } from "hono";
import * as service from "../../services/email-template.service";
import { getAccessibleBrands, type AuthUser } from "../../middlewares/auth.middleware";
import { successResponse } from "../../utils/response";
import type {
  CreateEmailTemplateInput,
  UpdateEmailTemplateInput,
  UpdateTemplateStatusInput,
  PreviewTemplateInput,
  SendTestInput,
} from "../validators/email-template.schema";

function requireSystemTemplateAccess(authUser: AuthUser): void {
  if (authUser.role !== "owner" && authUser.role !== "admin") {
    throw new Error("Insufficient permissions. Owner/Admin required for system/auth templates.");
  }
}

function requireTemplateAccess(authUser: AuthUser): void {
  if (authUser.role !== "owner" && authUser.role !== "admin" && authUser.role !== "marketing") {
    throw new Error("Insufficient permissions. Marketing role or higher required.");
  }
}

const SYSTEM_AUTH_CATEGORIES = ["system", "auth"];
const CAMPAIGN_NOTIFICATION_CATEGORIES = ["campaign", "notification"];

function canManageCategory(authUser: AuthUser, category: string): boolean {
  if (authUser.role === "owner" || authUser.role === "admin") {
    return true;
  }
  if (authUser.role === "marketing") {
    return CAMPAIGN_NOTIFICATION_CATEGORIES.includes(category);
  }
  return false;
}

export async function createEmailTemplate(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  const allowedBrands = getAccessibleBrands(authUser);
  const body = c.get("validated") as CreateEmailTemplateInput;

  if (allowedBrands && !allowedBrands.includes(body.brand)) {
    return c.json({ success: false, message: "You do not have access to this brand" }, 403);
  }

  if (!canManageCategory(authUser, body.category)) {
    return c.json({ success: false, message: `You do not have permission to create ${body.category} templates` }, 403);
  }

  const template = await service.createEmailTemplate(body, authUser.id);
  return c.json(successResponse(template), 201);
}

export async function listEmailTemplates(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  const allowedBrands = getAccessibleBrands(authUser);
  const query = c.req.query();

  const result = await service.listEmailTemplates(
    {
      brand: query.brand as "watpak" | "dercolbags" | undefined,
      status: query.status as "draft" | "active" | "archived" | undefined,
      category: query.category as "system" | "auth" | "campaign" | "notification" | undefined,
      templateKey: query.templateKey as "subscriber_confirmation" | undefined,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 20,
    },
    allowedBrands
  );

  return c.json(successResponse(result));
}

export async function getEmailTemplate(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  const allowedBrands = getAccessibleBrands(authUser);
  const id = c.req.param("id");

  const template = await service.getTemplateById(id, allowedBrands);
  return c.json(successResponse(template));
}

export async function updateEmailTemplate(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  const allowedBrands = getAccessibleBrands(authUser);
  const id = c.req.param("id");
  const body = c.get("validated") as UpdateEmailTemplateInput;

  const existing = await service.getTemplateById(id, allowedBrands);
  if (!canManageCategory(authUser, existing.category)) {
    return c.json({ success: false, message: `You do not have permission to update ${existing.category} templates` }, 403);
  }

  const template = await service.updateTemplate(id, body, allowedBrands, authUser.id);
  return c.json(successResponse(template));
}

export async function deleteEmailTemplate(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  const allowedBrands = getAccessibleBrands(authUser);
  const id = c.req.param("id");

  const existing = await service.getTemplateById(id, allowedBrands);
  if (!canManageCategory(authUser, existing.category)) {
    return c.json({ success: false, message: `You do not have permission to delete ${existing.category} templates` }, 403);
  }

  await service.deleteTemplate(id, allowedBrands, authUser.id);
  return c.json(successResponse({ deleted: true }));
}

export async function updateTemplateStatus(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  const allowedBrands = getAccessibleBrands(authUser);
  const id = c.req.param("id");
  const body = c.get("validated") as UpdateTemplateStatusInput;

  const existing = await service.getTemplateById(id, allowedBrands);
  if (!canManageCategory(authUser, existing.category)) {
    return c.json({ success: false, message: `You do not have permission to change status of ${existing.category} templates` }, 403);
  }

  const template = await service.updateTemplateStatus(id, body, allowedBrands, authUser.id);
  return c.json(successResponse(template));
}

export async function previewTemplate(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  const allowedBrands = getAccessibleBrands(authUser);
  const id = c.req.param("id");
  const body = c.get("validated") as PreviewTemplateInput;

  const result = await service.previewTemplate(id, body.variables, allowedBrands);
  return c.json(successResponse(result));
}

export async function sendTestEmail(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  const allowedBrands = getAccessibleBrands(authUser);
  const id = c.req.param("id");
  const body = c.get("validated") as SendTestInput;

  const existing = await service.getTemplateById(id, allowedBrands);
  if (!canManageCategory(authUser, existing.category)) {
    return c.json({ success: false, message: `You do not have permission to send test for ${existing.category} templates` }, 403);
  }

  const result = await service.sendTestEmail(id, body.email, body.variables, allowedBrands, authUser.id);
  return c.json(successResponse(result));
}

export async function duplicateTemplate(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  const allowedBrands = getAccessibleBrands(authUser);
  const id = c.req.param("id");

  const existing = await service.getTemplateById(id, allowedBrands);
  if (!canManageCategory(authUser, existing.category)) {
    return c.json({ success: false, message: `You do not have permission to duplicate ${existing.category} templates` }, 403);
  }

  const template = await service.duplicateTemplate(id, allowedBrands, authUser.id);
  return c.json(successResponse(template), 201);
}