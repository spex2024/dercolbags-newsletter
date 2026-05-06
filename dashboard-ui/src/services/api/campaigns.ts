import { api } from "@/lib/api"
import type { Brand, CampaignStatus, PaginatedResponse } from "./types"

export interface Campaign {
  id: string
  name: string
  brand: Brand
  subject: string
  content: string
  preheader?: string
  targetType: "all" | "list" | "segment"
  targetId?: string
  status: CampaignStatus
  scheduledAt?: string
  sentAt?: string
  createdAt: string
  updatedAt: string
  stats?: {
    totalRecipients: number
    delivered: number
    opened: number
    clicked: number
    bounced: number
  }
}

export type CampaignsResponse = PaginatedResponse<Campaign>

export interface CreateCampaignInput {
  name: string
  brand: Brand
  subject: string
  content: string
  preheader?: string
  targetType: "all" | "list" | "segment"
  targetId?: string
}

export interface UpdateCampaignInput {
  name?: string
  subject?: string
  content?: string
  preheader?: string
}

function toSearchParams(params: Record<string, unknown>): URLSearchParams {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) sp.set(k, String(v))
  })
  return sp
}

export const campaignsApi = {
  list: (
    params: {
      brand?: Brand
      status?: CampaignStatus
      page?: number
      limit?: number
    } = {},
  ) =>
    api.get<CampaignsResponse>(
      `/api/v1/campaigns?${toSearchParams(params).toString()}`,
    ),

  get: (id: string) =>
    api.get<{ success: boolean; data: Campaign }>(`/api/v1/campaigns/${id}`),

  create: (data: CreateCampaignInput) =>
    api.post<{ success: boolean; data: Campaign }>("/api/v1/campaigns", data),

  update: (id: string, data: UpdateCampaignInput) =>
    api.patch<{ success: boolean; data: Campaign }>(
      `/api/v1/campaigns/${id}`,
      data,
    ),

  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(
      `/api/v1/campaigns/${id}`,
    ),

  schedule: (id: string, scheduledAt: string) =>
    api.post<{ success: boolean; message: string }>(
      `/api/v1/campaigns/${id}/schedule`,
      { scheduledAt },
    ),

  send: (id: string) =>
    api.post<{ success: boolean; message: string }>(
      `/api/v1/campaigns/${id}/send`,
    ),

  cancel: (id: string) =>
    api.post<{ success: boolean; message: string }>(
      `/api/v1/campaigns/${id}/cancel`,
    ),
}
