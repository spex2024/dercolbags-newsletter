import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  json,
  integer,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const brandEnum = pgEnum("brand", ["watpak", "dercolbags"]);
export const statusEnum = pgEnum("status", ["new", "contacted", "converted", "spam"]);

// ─── Better Auth Tables ───────────────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  // admin plugin + RBAC fields
  role: text("role"),
  brandAccess: json("brand_access").$type<Array<"watpak" | "dercolbags">>().notNull().default([]),
  banned: boolean("banned"),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// ─── Subscribers Table ────────────────────────────────────────────────────────

export const subscribers = pgTable(
  "subscribers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    brand: brandEnum("brand").notNull(),
    name: text("name"), // person's name or business name
    email: text("email").notNull(),
    phone: text("phone"),
    location: text("location"),
    source: text("source").notNull().default("landing_page"),
    status: statusEnum("status").notNull().default("new"),
    isSubscribed: boolean("is_subscribed").notNull().default(true),
    unsubscribeToken: text("unsubscribe_token").notNull().unique(),
    unsubscribedAt: timestamp("unsubscribed_at"),
    lastEmailSentAt: timestamp("last_email_sent_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("subscribers_brand_email_idx").on(table.brand, table.email),
  ]
);

export type Subscriber = typeof subscribers.$inferSelect;
export type NewSubscriber = typeof subscribers.$inferInsert;

// ─── Mailing Lists ───────────────────────────────────────────────────────────────

export const mailingLists = pgTable("mailing_lists", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  brand: brandEnum("brand").notNull(),
  description: text("description"),
  isDynamic: boolean("is_dynamic").notNull().default(false),
  filterConfig: json("filter_config").$type<SubscriberFilterConfig | null>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
});

export type MailingList = typeof mailingLists.$inferSelect;
export type NewMailingList = typeof mailingLists.$inferInsert;

// ─── Mailing List Subscribers ───────────────────────────────────────────────────

export const mailingListSubscribers = pgTable(
  "mailing_list_subscribers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listId: uuid("list_id")
      .notNull()
      .references(() => mailingLists.id, { onDelete: "cascade" }),
    subscriberId: uuid("subscriber_id")
      .notNull()
      .references(() => subscribers.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("mls_list_subscriber_idx").on(table.listId, table.subscriberId),
  ]
);

export type MailingListSubscriber = typeof mailingListSubscribers.$inferSelect;

// ─── Campaigns ─────────────────────────────────────────────────────────────────

export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "cancelled",
]);

export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  brand: brandEnum("brand").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  designJson: json("design_json"),
  preheader: text("preheader"),
  status: campaignStatusEnum("status").notNull().default("draft"),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
  targetType: text("target_type").notNull(),
  targetId: uuid("target_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
});

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;

// ─── Campaign Recipients ────────────────────────────────────────────────────────

export const recipientStatusEnum = pgEnum("recipient_status", [
  "pending",
  "sent",
  "failed",
  "opened",
  "clicked",
]);

export const campaignRecipients = pgTable("campaign_recipients", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  subscriberId: uuid("subscriber_id")
    .notNull()
    .references(() => subscribers.id, { onDelete: "cascade" }),
  status: recipientStatusEnum("status").notNull().default("pending"),
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  errorMessage: text("error_message"),
  providerResponse: json("provider_response"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
});

export type CampaignRecipient = typeof campaignRecipients.$inferSelect;

// ─── Campaign Logs ─────────────────────────────────────────────────────────────

export const campaignLogs = pgTable("campaign_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  details: json("details"),
  performedBy: text("performed_by").references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type CampaignLog = typeof campaignLogs.$inferSelect;

// ─── Email Jobs (Queue) ────────────────────────────────────────────────────────

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const emailJobs = pgTable("email_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  recipientId: uuid("recipient_id")
    .notNull()
    .references(() => campaignRecipients.id, { onDelete: "cascade" }),
  status: jobStatusEnum("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  lastError: text("last_error"),
  scheduledAt: timestamp("scheduled_at"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type EmailJob = typeof emailJobs.$inferSelect;

// ─── Email Templates ────────────────────────────────────────────────────────────

export const templateStatusEnum = pgEnum("template_status", ["draft", "active", "archived"]);
export const templateCategoryEnum = pgEnum("template_category", ["system", "auth", "campaign", "notification"]);

export const emailTemplates = pgTable(
  "email_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    brand: brandEnum("brand").notNull(),
    templateKey: text("template_key").notNull(),
    name: text("name").notNull(),
    subject: text("subject").notNull(),
    htmlContent: text("html_content").notNull(),
    plainTextContent: text("plain_text_content"),
    designJson: json("design_json"),
    status: templateStatusEnum("status").notNull().default("draft"),
    category: templateCategoryEnum("category").notNull(),
    createdBy: text("created_by").references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
  },
  (table) => [uniqueIndex("et_brand_key_idx").on(table.brand, table.templateKey)]
);

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type NewEmailTemplate = typeof emailTemplates.$inferInsert;

// ─── Email Template Audit Logs ─────────────────────────────────────────────────

export const templateAuditLogs = pgTable("template_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: uuid("template_id").references(() => emailTemplates.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  changes: json("changes"),
  performedBy: text("performed_by").references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type TemplateAuditLog = typeof templateAuditLogs.$inferSelect;

// ─── Webhook Events ────────────────────────────────────────────────────────────

export const webhookEventTypeEnum = pgEnum("webhook_event_type", [
  "email.sent",
  "email.delivered",
  "email.opened",
  "email.clicked",
  "email.bounced",
  "email.complained",
  "email.unsubscribed",
]);

export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventType: webhookEventTypeEnum("event_type").notNull(),
  provider: text("provider").notNull(),
  brand: brandEnum("brand"),
  campaignId: uuid("campaign_id").references(() => campaigns.id),
  recipientId: uuid("recipient_id").references(() => campaignRecipients.id),
  subscriberId: uuid("subscriber_id").references(() => subscribers.id),
  email: text("email"),
  messageId: text("message_id"),
  payload: json("payload"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type WebhookEvent = typeof webhookEvents.$inferSelect;

// ─── Email Tracking ─────────────────────────────────────────────────────────────

export const trackingLinks = pgTable("tracking_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  recipientId: uuid("recipient_id")
    .notNull()
    .references(() => campaignRecipients.id, { onDelete: "cascade" }),
  subscriberId: uuid("subscriber_id")
    .notNull()
    .references(() => subscribers.id, { onDelete: "cascade" }),
  originalUrl: text("original_url").notNull(),
  hashedUrl: text("hashed_url").notNull().unique(),
  clickedAt: timestamp("clicked_at"),
  clickCount: integer("click_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type TrackingLink = typeof trackingLinks.$inferSelect;

// ─── Scheduled Jobs Persistence ────────────────────────────────────────────────

export const scheduledJobs = pgTable("scheduled_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobType: text("job_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  scheduledFor: timestamp("scheduled_for").notNull(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ScheduledJob = typeof scheduledJobs.$inferSelect;

// ─── Subscriber Import/Export ─────────────────────────────────────────────────

export const importExportJobs = pgTable("import_export_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(),
  brand: brandEnum("brand").notNull(),
  status: text("status").notNull().default("pending"),
  fileName: text("file_name"),
  fileUrl: text("file_url"),
  totalRows: integer("total_rows"),
  processedRows: integer("processed_rows"),
  successRows: integer("success_rows"),
  errorRows: integer("error_rows"),
  errors: json("errors"),
  createdBy: text("created_by").references(() => user.id),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ImportExportJob = typeof importExportJobs.$inferSelect;

// ─── Campaign Variants (A/B Testing) ─────────────────────────────────────────

export const campaignVariants = pgTable("campaign_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  preheader: text("preheader"),
  percentage: integer("percentage").notNull().default(50),
  isControl: boolean("is_control").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type CampaignVariant = typeof campaignVariants.$inferSelect;

// ─── Roles ────────────────────────────────────────────────────────────────────

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  value: text("value").notNull().unique(),
  description: text("description"),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Role = typeof roles.$inferSelect;

// ─── Page Permissions ──────────────────────────────────────────────────────────

export const pagePermissions = pgTable("page_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  pageKey: text("page_key").notNull().unique(),
  pageName: text("page_name").notNull(),
  allowedRoles: json("allowed_roles").$type<string[]>().notNull().default([]),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
});

export type PagePermission = typeof pagePermissions.$inferSelect;

// ─── Type Aliases ──────────────────────────────────────────────────────────────

export interface SubscriberFilterConfig {
  brand?: "watpak" | "dercolbags";
  status?: Array<"new" | "contacted" | "converted" | "spam">;
  isSubscribed?: boolean;
  location?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  lastEmailSentAfter?: string;
  lastEmailSentBefore?: string;
}
