import { api } from "@/lib/api"
import type { Brand } from "./types"

export type AnalyticsScope = "company" | "team" | "personal"

export interface AnalyticsOverview {
  scope: AnalyticsScope
  subscribers: {
    total: number
    active: number
    unsubscribed: number
    newToday: number
    newThisWeek: number
    newThisMonth: number
    byBrand: { watpak: number; dercolbags: number }
    byStatus: { new: number; contacted: number; converted: number; spam: number }
    sources: Array<{ source: string; count: number }>
  } | null
  email: {
    totalCampaigns: number
    totalSent: number
    delivered: number
    failed: number
    opened: number
    clicked: number
    deliveryRate: number
    openRate: number
    clickRate: number
  } | null
  topCampaigns: Array<{
    id: string
    name: string
    sentAt: string | null
    total: number
    opened: number
    clicked: number
    openRate: number
    clickRate: number
  }>
  team: Array<{
    userId: string
    name: string
    email: string
    role: string
    campaigns: number
    sent: number
    emails: number
    opened: number
    clicked: number
    openRate: number
    clickRate: number
  }>
  myStats: {
    campaigns: number
    sent: number
    emails: number
    opened: number
    clicked: number
    openRate: number
    clickRate: number
  } | null
}

export const analyticsApi = {
  overview: (brand?: Brand) =>
    api.get<{ success: boolean; data: AnalyticsOverview }>(
      `/api/v1/analytics/overview${brand ? `?brand=${brand}` : ""}`,
    ),
}
