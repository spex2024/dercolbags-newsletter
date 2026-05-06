import { api } from "@/lib/api"
import type {
  Brand,
  TemplateStatus,
  TemplateCategory,
  TemplateKey,
  PaginatedResponse,
} from "./types"

export interface EmailTemplate {
  id: string
  brand: Brand
  templateKey: TemplateKey
  name: string
  subject: string
  htmlContent: string
  plainTextContent?: string
  designJson?: Record<string, unknown>
  category: TemplateCategory
  status: TemplateStatus
  createdAt: string
  updatedAt: string
}

export interface TemplateVariables {
  brandName?: string
  firstName?: string
  name?: string
  email?: string
  phone?: string
  businessName?: string
  location?: string
  unsubscribeUrl?: string
  inviteUrl?: string
  resetPasswordUrl?: string
  dashboardUrl?: string
  campaignTitle?: string
  campaignContent?: string
  ctaText?: string
  ctaUrl?: string
}

function toSearchParams(params: Record<string, unknown>): URLSearchParams {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) sp.set(k, String(v))
  })
  return sp
}

export const emailTemplatesApi = {
  list: (
    params: {
      brand?: Brand
      status?: TemplateStatus
      category?: TemplateCategory
      templateKey?: TemplateKey
      page?: number
      limit?: number
    } = {},
  ) =>
    api.get<PaginatedResponse<EmailTemplate>>(
      `/api/v1/email-templates?${toSearchParams(params).toString()}`,
    ),

  get: (id: string) =>
    api.get<{ success: boolean; data: EmailTemplate }>(
      `/api/v1/email-templates/${id}`,
    ),

  create: (data: {
    brand: Brand
    templateKey: TemplateKey
    name: string
    subject: string
    htmlContent: string
    plainTextContent?: string
    designJson?: Record<string, unknown>
    category: TemplateCategory
  }) =>
    api.post<{ success: boolean; data: EmailTemplate }>(
      "/api/v1/email-templates",
      data,
    ),

  update: (
    id: string,
    data: {
      name?: string
      subject?: string
      htmlContent?: string
      plainTextContent?: string
      designJson?: Record<string, unknown>
    },
  ) =>
    api.patch<{ success: boolean; data: EmailTemplate }>(
      `/api/v1/email-templates/${id}`,
      data,
    ),

  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(
      `/api/v1/email-templates/${id}`,
    ),

  duplicate: (id: string) =>
    api.post<{ success: boolean; data: EmailTemplate }>(
      `/api/v1/email-templates/${id}/duplicate`,
    ),

  updateStatus: (id: string, status: TemplateStatus) =>
    api.patch<{ success: boolean; data: EmailTemplate }>(
      `/api/v1/email-templates/${id}/status`,
      { status },
    ),

  preview: (id: string, variables: TemplateVariables) =>
    api.post<{ success: boolean; data: string }>(
      `/api/v1/email-templates/${id}/preview`,
      { variables },
    ),

  sendTest: (id: string, email: string, variables: TemplateVariables) =>
    api.post<{ success: boolean; message: string }>(
      `/api/v1/email-templates/${id}/send-test`,
      { email, variables },
    ),
}
