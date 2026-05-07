import type { Context } from "hono";
import * as service from "../../services/import-export.service";
import { getAccessibleBrands, type AuthUser } from "../../middlewares/auth.middleware";
import { successResponse } from "../../utils/response";
import type { CreateImportInput, CreateExportInput, ListJobsQuery } from "../../validators/import-export.schema";

export async function createImport(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  const allowedBrands = getAccessibleBrands(authUser);
  const body = c.get("validated") as CreateImportInput;

  if (allowedBrands && !allowedBrands.includes(body.brand)) {
    return c.json({ success: false, message: "You do not have access to this brand" }, 403);
  }

  const jobId = await service.createImportJob("import", body.brand, authUser.id, "import.csv");
  const result = await service.processImport(jobId, body.rows);

  return c.json(successResponse({ jobId, ...result }));
}

export async function createExport(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  const allowedBrands = getAccessibleBrands(authUser);
  const body = c.get("validated") as CreateExportInput;

  if (allowedBrands && !allowedBrands.includes(body.brand)) {
    return c.json({ success: false, message: "You do not have access to this brand" }, 403);
  }

  const jobId = await service.createExportJob("export", body.brand, authUser.id, {
    status: body.status,
    isSubscribed: body.isSubscribed,
    location: body.location,
  });

  const rows = await service.processExport(jobId);

  return c.json(successResponse({ jobId, rows }));
}

export async function listJobs(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  const allowedBrands = getAccessibleBrands(authUser);
  const query = c.req.query();

  const result = await service.listImportExportJobs(
    query.brand as "watpak" | "dercolbags" | undefined,
    Number(query.page) || 1,
    Number(query.limit) || 20
  );

  return c.json(successResponse(result));
}

export async function getJob(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  const allowedBrands = getAccessibleBrands(authUser);
  const id = c.req.param("id");

  const job = await service.getImportExportJob(id);

  if (allowedBrands && !allowedBrands.includes(job.brand)) {
    return c.json({ success: false, message: "You do not have access to this job" }, 403);
  }

  return c.json(successResponse(job));
}

export async function processJob(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  const allowedBrands = getAccessibleBrands(authUser);
  const id = c.req.param("id");

  const job = await service.getImportExportJob(id);

  if (allowedBrands && !allowedBrands.includes(job.brand)) {
    return c.json({ success: false, message: "You do not have access to this job" }, 403);
  }

  if (job.status !== "pending" && job.status !== "failed") {
    return c.json({ success: false, message: "Job cannot be reprocessed" }, 400);
  }

  if (job.type === "import") {
    throw new Error("Import reprocessing not implemented");
  }

  const rows = await service.processExport(id);
  return c.json(successResponse({ jobId: id, rows }));
}