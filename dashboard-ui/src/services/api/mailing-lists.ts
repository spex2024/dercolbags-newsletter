import { api } from "@/lib/api"
import type { Brand, PaginatedResponse } from "./types"
import type { Subscriber } from "./subscribers"

export interface MailingList {
  id: string
  name: string
  brand: Brand
  description?: string
  isDynamic: boolean
  filterConfig?: {
    brand?: Brand
    status?: string[]
    isSubscribed?: boolean
    location?: string
    createdAtFrom?: string
    createdAtTo?: string
    lastEmailSentAfter?: string
    lastEmailSentBefore?: string
  }
  subscriberCount: number
  createdAt: string
  updatedAt: string
}

export interface CreateMailingListInput {
  name: string
  brand: Brand
  description?: string
  isDynamic?: boolean
  filterConfig?: MailingList["filterConfig"]
}

function toSearchParams(params: Record<string, unknown>): URLSearchParams {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) sp.set(k, String(v))
  })
  return sp
}

export const mailingListsApi = {
  list: (params: { brand?: Brand; page?: number; limit?: number } = {}) =>
    api.get<PaginatedResponse<MailingList>>(
      `/api/v1/mailing-lists?${toSearchParams(params).toString()}`,
    ),

  get: (id: string) =>
    api.get<{ success: boolean; data: MailingList }>(
      `/api/v1/mailing-lists/${id}`,
    ),

  create: (data: CreateMailingListInput) =>
    api.post<{ success: boolean; data: MailingList }>(
      "/api/v1/mailing-lists",
      data,
    ),

  update: (id: string, data: Partial<CreateMailingListInput>) =>
    api.patch<{ success: boolean; data: MailingList }>(
      `/api/v1/mailing-lists/${id}`,
      data,
    ),

  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(
      `/api/v1/mailing-lists/${id}`,
    ),

  getSubscribers: (
    id: string,
    params: { page?: number; limit?: number } = {},
  ) =>
    api.get<PaginatedResponse<Subscriber>>(
      `/api/v1/mailing-lists/${id}/subscribers?${toSearchParams(params).toString()}`,
    ),

  addSubscribers: (id: string, subscriberIds: string[]) =>
    api.post<{ success: boolean; message: string }>(
      `/api/v1/mailing-lists/${id}/subscribers`,
      { subscriberIds },
    ),

  removeSubscriber: (listId: string, subscriberId: string) =>
    api.delete<{ success: boolean; message: string }>(
      `/api/v1/mailing-lists/${listId}/subscribers/${subscriberId}`,
    ),
}
