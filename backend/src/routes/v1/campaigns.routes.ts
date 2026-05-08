import { Hono } from "hono";
import * as controller from "../../controllers/v1/campaign.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { createCampaignSchema, updateCampaignSchema, scheduleCampaignSchema, campaignFilterQuerySchema } from "../../validators/campaign.schema";

const campaigns = new Hono();

campaigns.use("*", authMiddleware);

campaigns.post("/", validate(createCampaignSchema), controller.createCampaign);
campaigns.get("/", validate(campaignFilterQuerySchema, "query"), controller.listCampaigns);
campaigns.get("/analytics", controller.getCampaignsAnalytics);
campaigns.get("/:id", controller.getCampaign);
campaigns.patch("/:id", validate(updateCampaignSchema), controller.updateCampaign);
campaigns.delete("/:id", controller.deleteCampaign);

campaigns.post("/:id/send", controller.sendCampaignNow);
campaigns.post("/:id/schedule", validate(scheduleCampaignSchema), controller.scheduleCampaign);
campaigns.post("/:id/cancel", controller.cancelCampaign);

campaigns.get("/:id/stats",        controller.getCampaignStats);
campaigns.post("/:id/test",        controller.sendTestEmail);
campaigns.post("/:id/duplicate",   controller.duplicateCampaign);

export { campaigns };