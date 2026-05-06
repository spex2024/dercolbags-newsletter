import { Hono } from "hono";
import * as controller from "../../controllers/v1/email-template.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import {
  createEmailTemplateSchema,
  updateEmailTemplateSchema,
  updateTemplateStatusSchema,
  previewTemplateSchema,
  sendTestSchema,
  listEmailTemplatesQuerySchema,
} from "../../validators/email-template.schema";

const emailTemplates = new Hono();

emailTemplates.use("*", authMiddleware);

emailTemplates.post("/", validate(createEmailTemplateSchema), controller.createEmailTemplate);
emailTemplates.get("/", validate(listEmailTemplatesQuerySchema, "query"), controller.listEmailTemplates);
emailTemplates.get("/:id", controller.getEmailTemplate);
emailTemplates.patch("/:id", validate(updateEmailTemplateSchema), controller.updateEmailTemplate);
emailTemplates.delete("/:id", controller.deleteEmailTemplate);
emailTemplates.patch("/:id/status", validate(updateTemplateStatusSchema), controller.updateTemplateStatus);
emailTemplates.post("/:id/preview", validate(previewTemplateSchema), controller.previewTemplate);
emailTemplates.post("/:id/send-test", validate(sendTestSchema), controller.sendTestEmail);
emailTemplates.post("/:id/duplicate", controller.duplicateTemplate);

export { emailTemplates };