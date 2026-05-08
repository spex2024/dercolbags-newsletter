import type { Context } from "hono";
import * as service from "../../services/campaign.service";
import { getAccessibleBrands, type AuthUser } from "../../middlewares/auth.middleware";
import { successResponse } from "../../utils/response";
import type { CreateCampaignInput, UpdateCampaignInput, ScheduleCampaignInput } from "../../validators/campaign.schema";

function requireMarketingRole(authUser: AuthUser): void {
  if (authUser.role !== "admin" && authUser.role !== "owner" && authUser.role !== "marketing") {
    throw new Error("Insufficient permissions. Marketing role required.");
  }
}

export async function createCampaign(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  requireMarketingRole(authUser);

  const allowedBrands = getAccessibleBrands(authUser);
  const body = c.get("validated") as CreateCampaignInput;

  if (allowedBrands && !allowedBrands.includes(body.brand)) {
    return c.json({ success: false, message: "You do not have access to this brand" }, 403);
  }

  const campaign = await service.createCampaign(body, authUser.id);
  return c.json(successResponse(campaign), 201);
}

export async function listCampaigns(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  const allowedBrands = getAccessibleBrands(authUser);
  const query = c.req.query();

  const result = await service.listCampaigns(
    {
      brand: query.brand as "watpak" | "dercolbags" | undefined,
      status: query.status as "draft" | "scheduled" | "sending" | "sent" | "cancelled" | undefined,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 20,
    },
    allowedBrands
  );

  return c.json(successResponse(result));
}

export async function getCampaign(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  const allowedBrands = getAccessibleBrands(authUser);
  const id = c.req.param("id");

  const campaign = await service.getCampaignById(id, allowedBrands);
  return c.json(successResponse(campaign));
}

export async function updateCampaign(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  requireMarketingRole(authUser);

  const allowedBrands = getAccessibleBrands(authUser);
  const id = c.req.param("id");
  const body = c.get("validated") as UpdateCampaignInput;

  const campaign = await service.updateCampaign(id, body, allowedBrands, authUser.id);
  return c.json(successResponse(campaign));
}

export async function deleteCampaign(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  requireMarketingRole(authUser);

  const allowedBrands = getAccessibleBrands(authUser);
  const id = c.req.param("id");

  await service.deleteCampaign(id, allowedBrands, authUser.id);
  return c.json(successResponse({ deleted: true }));
}

export async function sendCampaignNow(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  requireMarketingRole(authUser);

  const allowedBrands = getAccessibleBrands(authUser);
  const id = c.req.param("id");

  const result = await service.sendCampaignNow(id, allowedBrands, authUser.id);
  return c.json(successResponse(result));
}

export async function scheduleCampaign(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  requireMarketingRole(authUser);

  const allowedBrands = getAccessibleBrands(authUser);
  const id = c.req.param("id");
  const body = c.get("validated") as ScheduleCampaignInput;

  const campaign = await service.scheduleCampaign(id, body, allowedBrands, authUser.id);
  return c.json(successResponse(campaign));
}

export async function cancelCampaign(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  requireMarketingRole(authUser);

  const allowedBrands = getAccessibleBrands(authUser);
  const id = c.req.param("id");

  const campaign = await service.cancelCampaign(id, allowedBrands, authUser.id);
  return c.json(successResponse(campaign));
}

export async function getCampaignStats(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  const allowedBrands = getAccessibleBrands(authUser);
  const id = c.req.param("id");

  const stats = await service.getCampaignStats(id, allowedBrands);
  return c.json(successResponse(stats));
}

export async function getCampaignsAnalytics(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  const allowedBrands = getAccessibleBrands(authUser);
  const brand = c.req.query("brand") as "watpak" | "dercolbags" | undefined;

  const data = await service.getCampaignsAnalytics(allowedBrands, brand);
  return c.json(successResponse(data));
}

export async function sendTestEmail(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  requireMarketingRole(authUser);
  const allowedBrands = getAccessibleBrands(authUser);
  const id = c.req.param("id");

  await service.sendTestEmail(id, allowedBrands, authUser.email);
  return c.json(successResponse(null, `Test email sent to ${authUser.email}`));
}

export async function duplicateCampaign(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  requireMarketingRole(authUser);
  const allowedBrands = getAccessibleBrands(authUser);
  const id = c.req.param("id");

  const campaign = await service.duplicateCampaign(id, allowedBrands, authUser.id);
  return c.json(successResponse(campaign), 201);
}