import { Hono } from "hono";
import * as controller from "../../controllers/v1/dashboard.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const dashboard = new Hono();

dashboard.use("*", authMiddleware);

dashboard.get("/overview", controller.getOverview);
dashboard.get("/recent-subscribers", controller.getRecentSubscribers);

export { dashboard };
