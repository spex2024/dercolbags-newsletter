export type Brand = "watpak" | "dercolbags"
export type SubscriberStatus = "new" | "contacted" | "converted" | "spam"
export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "cancelled"
export type TemplateStatus = "draft" | "active" | "archived"
export type TemplateCategory = "system" | "auth" | "campaign" | "notification"
export type UserRole =
  | "owner"
  | "admin"
  | "marketing_manager"
  | "sales_support"
// System-reserved keys — custom campaign templates can use any snake_case string
export type SystemTemplateKey =
  | "subscriber_confirmation"
  | "unsubscribe_confirmation"
  | "user_invite"
  | "password_reset"
  | "campaign_default"
  | "campaign_test"
  | "admin_new_subscriber_notification"

export type TemplateKey = SystemTemplateKey | (string & {})

export type PageKey =
  | "dashboard"
  | "subscribers"
  | "campaigns"
  | "templates"
  | "lists"
  | "import-export"
  | "analytics"

export interface Role {
  id: string
  name: string
  value: string
  description: string | null
  isSystem: boolean
  createdAt: string
}

export interface PagePermission {
  id: string
  pageKey: PageKey
  pageName: string
  allowedRoles: string[]
  updatedAt: string
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedData<T> {
  items: T[]
  pagination: Pagination
}

export interface PaginatedResponse<T> {
  success: boolean
  message: string
  data: PaginatedData<T>
}
