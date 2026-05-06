import { api } from "@/lib/api"
import type { Brand, PaginatedResponse } from "./types"

export interface User {
  id: string
  name: string
  email: string
  role: string
  brandAccess: Brand[]
  createdAt: string
  updatedAt: string
}

export type UsersResponse = PaginatedResponse<User>

export interface CreateUserInput {
  name: string
  email: string
  password: string
  role: string
  brandAccess: Brand[]
}

export interface UpdateUserInput {
  name?: string
  password?: string
  role?: string
  brandAccess?: Brand[]
}

function toSearchParams(params: Record<string, unknown>): URLSearchParams {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) sp.set(k, String(v))
  })
  return sp
}

export const usersApi = {
  list: (params: { page?: number; limit?: number } = {}) =>
    api.get<UsersResponse>(
      `/api/v1/users?${toSearchParams(params).toString()}`,
    ),

  get: (id: string) =>
    api.get<{ success: boolean; data: User }>(`/api/v1/users/${id}`),

  create: (data: CreateUserInput) =>
    api.post<{ success: boolean; data: User }>("/api/v1/users", data),

  update: (id: string, data: UpdateUserInput) =>
    api.patch<{ success: boolean; data: User }>(`/api/v1/users/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/api/v1/users/${id}`),
}
