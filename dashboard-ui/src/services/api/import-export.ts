import { api } from "@/lib/api"
import type { Brand } from "./types"

export interface ImportJob {
  id: string
  brand: Brand
  fileName: string
  status: "pending" | "processing" | "completed" | "failed"
  totalRows: number
  processedRows: number
  successRows: number
  failedRows: number
  errors: Array<{ row: number; error: string }>
  createdAt: string
  completedAt?: string
}

export interface ExportJob {
  id: string
  brand: Brand
  format: "csv" | "xlsx"
  status: "pending" | "processing" | "completed" | "failed"
  filters?: Record<string, unknown>
  fileUrl?: string
  createdAt: string
  completedAt?: string
}

export const importExportApi = {
  importSubscribers: (
    brand: Brand,
    file: File,
    options?: {
      skipDuplicates?: boolean
      mapping?: Record<string, string>
    },
  ) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("brand", brand)
    if (options?.skipDuplicates) formData.append("skipDuplicates", "true")
    if (options?.mapping)
      formData.append("mapping", JSON.stringify(options.mapping))

    // Note: FormData needs special handling - no Content-Type header
    return fetch(
      `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/v1/import-export/import`,
      {
        method: "POST",
        body: formData,
        credentials: "include",
      },
    ).then((r) => r.json() as Promise<{ success: boolean; data: ImportJob }>)
  },

  getImportStatus: (jobId: string) =>
    api.get<{ success: boolean; data: ImportJob }>(
      `/api/v1/import-export/import/${jobId}`,
    ),

  exportSubscribers: (
    brand: Brand,
    format: "csv" | "xlsx",
    filters?: Record<string, unknown>,
  ) =>
    api.post<{ success: boolean; data: ExportJob }>(
      "/api/v1/import-export/export",
      { brand, format, filters },
    ),

  getExportStatus: (jobId: string) =>
    api.get<{ success: boolean; data: ExportJob }>(
      `/api/v1/import-export/export/${jobId}`,
    ),
}
