import type { Context } from "hono";
import * as service from "../../services/dashboard.service";
import { getAccessibleBrands } from "../../middlewares/auth.middleware";
import type { AuthUser } from "../../middlewares/auth.middleware";
import { successResponse } from "../../utils/response";

export async function getOverview(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  const overview = await service.getDashboardOverview(getAccessibleBrands(authUser));
  return c.json(successResponse(overview));
}

export async function getRecentSubscribers(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  const recent = await service.getRecentSubscribers(getAccessibleBrands(authUser));
  return c.json(successResponse(recent));
}
