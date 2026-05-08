import { api } from "@/lib/api"
import type { Brand } from "./types"

export type DashboardScope = "company" | "team" | "personal"

export interface DashboardOverview {
  scope: DashboardScope
  myStats: {
    campaigns: number
    sent: number
    emails: number
    opened: number
    clicked: number
    openRate: number
    clickRate: number
  }
  subscribers: {
    total: number
    active: number
    unsubscribed: number
    contacted: number
    converted: number
    newToday: number
    newThisWeek: number
    newThisMonth: number
  } | null
  campaigns: {
    total: number
    draft: number
    scheduled: number
    sending: number
    sent: number
    cancelled: number
  } | null
  email: {
    totalSent: number
    delivered: number
    failed: number
    opened: number
    clicked: number
    openRate: number
    clickRate: number
    deliveryRate: number
  }
  teamMembers: Array<{
    userId: string
    name: string
    role: string
    campaigns: number
    sent: number
    openRate: number
    clickRate: number
  }>
  recentCampaigns: Array<{
    id: string
    name: string
    subject: string
    status: string
    sentAt: string | null
    createdAt: string
  }>
  recentSubscribers: Array<{
    id: string
    name: string | null
    email: string
    isSubscribed: boolean
    createdAt: string
  }>
}

export const dashboardApi = {
  overview: (brand?: Brand) =>
    api.get<{ success: boolean; data: DashboardOverview }>(
      `/api/v1/dashboard/overview${brand ? `?brand=${brand}` : ""}`,
    ),
}
