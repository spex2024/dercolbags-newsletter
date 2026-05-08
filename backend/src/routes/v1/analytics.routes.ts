import { Hono } from "hono";
import * as controller from "../../controllers/v1/analytics.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const analytics = new Hono();

analytics.use("*", authMiddleware);

analytics.get("/overview", controller.getOverview);

export { analytics };
