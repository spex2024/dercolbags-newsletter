import type { Context } from "hono";
import * as service from "../../services/analytics.service";
import { getAccessibleBrands, type AuthUser } from "../../middlewares/auth.middleware";
import { successResponse } from "../../utils/response";

export async function getOverview(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  const allowedBrands = getAccessibleBrands(authUser);
  const brand = c.req.query("brand") as "watpak" | "dercolbags" | undefined;

  const data = await service.getAnalyticsOverview(
    allowedBrands,
    authUser.id,
    authUser.role,
    brand,
  );

  return c.json(successResponse(data));
}
