import { api } from "@/lib/api"
import type { Brand, SubscriberStatus, PaginatedResponse } from "./types"

export interface Subscriber {
  id: string
  brand: Brand
  name: string | null
  email: string
  phone: string | null
  location: string | null
  source: string
  status: SubscriberStatus
  isSubscribed: boolean
  unsubscribeToken: string
  unsubscribedAt: string | null
  unsubscribeReason?: 'manual' | 'bounce' | 'complaint' | 'admin' | null
  anonymisedAt?: string | null
  lastEmailSentAt: string | null
  createdAt: string
  updatedAt: string
}

export type SubscribersResponse = PaginatedResponse<Subscriber>

export interface SubscriberDetailResponse {
  success: boolean
  data: Subscriber
}

export interface CreateSubscriberInput {
  brand: Brand
  name?: string
  email: string
  phone?: string
  location?: string
  source?: string
}

export interface ListSubscribersParams {
  brand?: Brand
  search?: string
  status?: SubscriberStatus
  isSubscribed?: boolean
  page?: number
  limit?: number
  sortBy?: "createdAt" | "email" | "name" | "status" | "brand"
  sortOrder?: "asc" | "desc"
}

export interface UpdateStatusInput {
  status: SubscriberStatus
}

function toSearchParams(params: object): URLSearchParams {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) sp.set(k, String(v))
  })
  return sp
}

export const subscribersApi = {
  list: (params: ListSubscribersParams = {}) =>
    api.get<SubscribersResponse>(
      `/api/v1/subscribers?${toSearchParams(params).toString()}`,
    ),

  get: (id: string) =>
    api.get<SubscriberDetailResponse>(`/api/v1/subscribers/${id}`),

  create: (data: CreateSubscriberInput) =>
    api.post<SubscriberDetailResponse>("/api/v1/subscribers", data),

  updateStatus: (id: string, data: UpdateStatusInput) =>
    api.patch<SubscriberDetailResponse>(
      `/api/v1/subscribers/${id}/status`,
      data,
    ),

  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(
      `/api/v1/subscribers/${id}`,
    ),

  unsubscribe: (token: string) =>
    api.post<{ success: boolean; message: string }>(
      `/api/v1/subscribers/unsubscribe?token=${token}`,
    ),

  anonymise: (id: string) =>
    api.post<{ success: boolean; message: string }>(`/api/v1/subscribers/${id}/anonymise`),
}
