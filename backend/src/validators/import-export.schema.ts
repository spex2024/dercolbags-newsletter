import { z } from "zod";

export const createImportSchema = z.object({
  brand: z.enum(["watpak", "dercolbags"]),
  rows: z.array(
    z.object({
      email: z.string().email(),
      name: z.string().optional(),
      phone: z.string().optional(),
      location: z.string().optional(),
      source: z.string().optional(),
    })
  ).min(1).max(1000),
});

export const createExportSchema = z.object({
  brand: z.enum(["watpak", "dercolbags"]),
  status: z.enum(["new", "contacted", "converted", "spam"]).optional(),
  isSubscribed: z.boolean().optional(),
  location: z.string().optional(),
});

export const listJobsQuerySchema = z.object({
  brand: z.enum(["watpak", "dercolbags"]).optional(),
  type: z.enum(["import", "export"]).optional(),
  page: z.string().default("1").transform(Number).pipe(z.number().int().positive()),
  limit: z.string().default("20").transform(Number).pipe(z.number().int().positive().max(100)),
});

export type CreateImportInput = z.infer<typeof createImportSchema>;
export type CreateExportInput = z.infer<typeof createExportSchema>;
export type ListJobsQuery = z.infer<typeof listJobsQuerySchema>;