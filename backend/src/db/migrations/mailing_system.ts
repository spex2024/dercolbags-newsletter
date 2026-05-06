import { pgTable, pgEnum, uuid, text, boolean, timestamp, uniqueIndex, json, integer } from "drizzle-orm/pg-core";

export const brandEnum = pgEnum("brand", ["watpak", "dercolbags"]);
export const statusEnum = pgEnum("status", ["new", "contacted", "converted", "spam"]);

export const mailingLists = pgTable("mailing_lists", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  brand: brandEnum("brand").notNull(),
  description: text("description"),
  isDynamic: boolean("is_dynamic").notNull().default(false),
  filterConfig: json("filter_config"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mailingListSubscribers = pgTable(
  "mailing_list_subscribers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listId: uuid("list_id").notNull(),
    subscriberId: uuid("subscriber_id").notNull(),
    addedAt: timestamp("added_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("mls_list_subscriber_idx").on(table.listId, table.subscriberId)]
);

export const campaignStatusEnum = pgEnum("campaign_status", ["draft", "scheduled", "sending", "sent", "cancelled"]);

export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  brand: brandEnum("brand").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  preheader: text("preheader"),
  status: campaignStatusEnum("status").notNull().default("draft"),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  createdBy: text("created_by").notNull(),
  targetType: text("target_type").notNull(),
  targetId: uuid("target_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const recipientStatusEnum = pgEnum("recipient_status", ["pending", "sent", "failed", "opened", "clicked"]);

export const campaignRecipients = pgTable("campaign_recipients", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").notNull(),
  subscriberId: uuid("subscriber_id").notNull(),
  status: recipientStatusEnum("status").notNull().default("pending"),
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  errorMessage: text("error_message"),
  providerResponse: json("provider_response"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const campaignLogs = pgTable("campaign_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").notNull(),
  action: text("action").notNull(),
  details: json("details"),
  performedBy: text("performed_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const jobStatusEnum = pgEnum("job_status", ["pending", "processing", "completed", "failed"]);

export const emailJobs = pgTable("email_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").notNull(),
  recipientId: uuid("recipient_id").notNull(),
  status: jobStatusEnum("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  lastError: text("last_error"),
  scheduledAt: timestamp("scheduled_at"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});