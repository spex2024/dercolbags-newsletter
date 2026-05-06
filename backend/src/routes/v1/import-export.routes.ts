import { Hono } from "hono";
import * as controller from "../../controllers/v1/import-export.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { createImportSchema, createExportSchema } from "../../validators/import-export.schema";

const importExport = new Hono();

importExport.use("*", authMiddleware);

importExport.post("/import", validate(createImportSchema), controller.createImport);
importExport.post("/export", validate(createExportSchema), controller.createExport);
importExport.get("/jobs", controller.listJobs);
importExport.get("/jobs/:id", controller.getJob);
importExport.post("/jobs/:id/process", controller.processJob);

export { importExport };