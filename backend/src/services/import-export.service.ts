import { eq, inArray, count, and } from "drizzle-orm";
import { db } from "../db/client";
import { importExportJobs, subscribers } from "../db/schema";
import { AppError } from "../utils/errors";
import type { Brand } from "./subscribers.service";
import { generateUnsubscribeToken } from "../utils/token";
import { sendTemplatedEmail } from "./template-loader.service";

interface SubscriberRow {
  email: string;
  name?: string;
  phone?: string;
  location?: string;
  source?: string;
}

export async function createImportJob(
  type: "import",
  brand: Brand,
  createdBy: string,
  fileName: string
): Promise<string> {
  const [job] = await db
    .insert(importExportJobs)
    .values({
      type,
      brand,
      status: "pending",
      fileName,
      createdBy,
    })
    .returning();

  return job.id;
}

export async function processImport(
  jobId: string,
  rows: SubscriberRow[]
): Promise<{ success: number; failed: number; suppressed: number; errors: string[] }> {
  const [job] = await db
    .select()
    .from(importExportJobs)
    .where(eq(importExportJobs.id, jobId))
    .limit(1);

  if (!job) throw new AppError("Job not found", 404);

  let success = 0;
  let failed = 0;
  let suppressed = 0;
  const errors: string[] = [];

  await db
    .update(importExportJobs)
    .set({ totalRows: rows.length, status: "processing" })
    .where(eq(importExportJobs.id, jobId));

  const suppressedList = await db
    .select({ email: subscribers.email })
    .from(subscribers)
    .where(and(eq(subscribers.brand, job.brand), eq(subscribers.isSubscribed, false)));
  const suppressedEmails = new Set(suppressedList.map(s => s.email.toLowerCase()));

  for (const row of rows) {
    try {
      if (!row.email || !row.email.includes("@")) {
        throw new Error("Invalid email");
      }

      if (suppressedEmails.has(row.email.toLowerCase())) {
        // honour suppression — never re-subscribe an opted-out address
        suppressed++;
        continue;
      }

      const existing = await db
        .select({ id: subscribers.id })
        .from(subscribers)
        .where(eq(subscribers.email, row.email.toLowerCase()))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(subscribers)
          .set({
            name: row.name ?? null,
            phone: row.phone ?? null,
            location: row.location ?? null,
          })
          .where(eq(subscribers.id, existing[0].id));
      } else {
        const unsubscribeToken = generateUnsubscribeToken();
        await db.insert(subscribers).values({
          brand: job.brand,
          email: row.email.toLowerCase(),
          name: row.name ?? null,
          phone: row.phone ?? null,
          location: row.location ?? null,
          source: row.source ?? "import",
          unsubscribeToken,
        });
      }
      success++;
    } catch (error) {
      failed++;
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      errors.push(`Row for ${row.email}: ${errorMsg}`);
    }
  }

  console.log(`[Import] Job ${jobId}: success=${success}, failed=${failed}, suppressed=${suppressed}`);

  await db
    .update(importExportJobs)
    .set({
      status: "completed",
      processedRows: rows.length,
      successRows: success,
      errorRows: failed,
      errors: errors.length > 0 ? errors : null,
      completedAt: new Date(),
    })
    .where(eq(importExportJobs.id, jobId));

  return { success, failed, suppressed, errors };
}

export async function createExportJob(
  type: "export",
  brand: Brand,
  createdBy: string,
  filters?: {
    status?: string;
    isSubscribed?: boolean;
    location?: string;
  }
): Promise<string> {
  const conditions = [eq(subscribers.brand, brand)];
  if (filters?.status) conditions.push(eq(subscribers.status, filters.status as "new" | "contacted" | "converted" | "spam"));
  if (filters?.isSubscribed !== undefined) conditions.push(eq(subscribers.isSubscribed, filters.isSubscribed));
  if (filters?.location) conditions.push(eq(subscribers.location, filters.location));

  const result = await db.select({ count: count() }).from(subscribers).where(and(...conditions));

  const [job] = await db
    .insert(importExportJobs)
    .values({
      type,
      brand,
      status: "pending",
      totalRows: Number(result[0]?.count ?? 0),
      createdBy,
    })
    .returning();

  return job.id;
}

export async function processExport(
  jobId: string
): Promise<SubscriberRow[]> {
  const [job] = await db
    .select()
    .from(importExportJobs)
    .where(eq(importExportJobs.id, jobId))
    .limit(1);

  if (!job || job.type !== "export") {
    throw new AppError("Export job not found", 404);
  }

  const rows = await db
    .select({
      email: subscribers.email,
      name: subscribers.name,
      phone: subscribers.phone,
      location: subscribers.location,
      source: subscribers.source,
    })
    .from(subscribers)
    .where(eq(subscribers.brand, job.brand));

  await db
    .update(importExportJobs)
    .set({
      status: "completed",
      processedRows: rows.length,
      successRows: rows.length,
      completedAt: new Date(),
    })
    .where(eq(importExportJobs.id, jobId));

  return rows;
}

export async function getImportExportJob(jobId: string) {
  const [job] = await db
    .select()
    .from(importExportJobs)
    .where(eq(importExportJobs.id, jobId))
    .limit(1);

  if (!job) throw new AppError("Job not found", 404);

  return job;
}

export async function listImportExportJobs(brand?: Brand, page = 1, limit = 20) {
  const conditions = brand ? [eq(importExportJobs.brand, brand)] : [];
  const offset = (page - 1) * limit;

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(importExportJobs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(limit)
      .offset(offset)
      .orderBy(importExportJobs.createdAt),
    db.select({ total: count() }).from(importExportJobs),
  ]);

  const total = Number(countResult[0]?.total ?? 0);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}