/**
 * Adds performance indexes to the database.
 * Safe to run multiple times — all use IF NOT EXISTS.
 *
 * Run with:  bun run src/db/add-indexes.ts
 */

import { sql } from "drizzle-orm";
import { db } from "./client";

const INDEXES: { name: string; statement: string }[] = [
  // ── campaign_recipients ─────────────────────────────────────────────────────
  // Most queried table — every stats/analytics query hits this
  {
    name: "cr_campaign_status_idx",
    statement: `CREATE INDEX IF NOT EXISTS cr_campaign_status_idx
                ON campaign_recipients(campaign_id, status)`,
  },
  {
    name: "cr_subscriber_idx",
    statement: `CREATE INDEX IF NOT EXISTS cr_subscriber_idx
                ON campaign_recipients(subscriber_id)`,
  },
  {
    name: "cr_opened_at_idx",
    statement: `CREATE INDEX IF NOT EXISTS cr_opened_at_idx
                ON campaign_recipients(opened_at)
                WHERE opened_at IS NOT NULL`,
  },
  {
    name: "cr_clicked_at_idx",
    statement: `CREATE INDEX IF NOT EXISTS cr_clicked_at_idx
                ON campaign_recipients(clicked_at)
                WHERE clicked_at IS NOT NULL`,
  },

  // ── campaigns ───────────────────────────────────────────────────────────────
  {
    name: "campaigns_brand_status_idx",
    statement: `CREATE INDEX IF NOT EXISTS campaigns_brand_status_idx
                ON campaigns(brand, status)`,
  },
  {
    name: "campaigns_created_by_idx",
    statement: `CREATE INDEX IF NOT EXISTS campaigns_created_by_idx
                ON campaigns(created_by)`,
  },
  {
    name: "campaigns_sent_at_idx",
    statement: `CREATE INDEX IF NOT EXISTS campaigns_sent_at_idx
                ON campaigns(sent_at DESC)
                WHERE sent_at IS NOT NULL`,
  },
  {
    name: "campaigns_scheduled_at_idx",
    statement: `CREATE INDEX IF NOT EXISTS campaigns_scheduled_at_idx
                ON campaigns(scheduled_at)
                WHERE status = 'scheduled'`,
  },

  // ── subscribers ─────────────────────────────────────────────────────────────
  {
    name: "subs_brand_subscribed_idx",
    statement: `CREATE INDEX IF NOT EXISTS subs_brand_subscribed_idx
                ON subscribers(brand, is_subscribed)`,
  },
  {
    name: "subs_brand_status_idx",
    statement: `CREATE INDEX IF NOT EXISTS subs_brand_status_idx
                ON subscribers(brand, status)`,
  },
  {
    name: "subs_created_at_idx",
    statement: `CREATE INDEX IF NOT EXISTS subs_created_at_idx
                ON subscribers(created_at DESC)`,
  },

  // ── email_jobs ──────────────────────────────────────────────────────────────
  {
    name: "ej_campaign_status_idx",
    statement: `CREATE INDEX IF NOT EXISTS ej_campaign_status_idx
                ON email_jobs(campaign_id, status)`,
  },
  {
    name: "ej_created_at_idx",
    statement: `CREATE INDEX IF NOT EXISTS ej_created_at_idx
                ON email_jobs(created_at)
                WHERE status = 'processing'`,
  },

  // ── tracking_links ──────────────────────────────────────────────────────────
  {
    name: "tl_campaign_idx",
    statement: `CREATE INDEX IF NOT EXISTS tl_campaign_idx
                ON tracking_links(campaign_id)`,
  },
  {
    name: "tl_subscriber_idx",
    statement: `CREATE INDEX IF NOT EXISTS tl_subscriber_idx
                ON tracking_links(subscriber_id)`,
  },

  // ── mailing_list_subscribers ────────────────────────────────────────────────
  {
    name: "mls_subscriber_idx",
    statement: `CREATE INDEX IF NOT EXISTS mls_subscriber_idx
                ON mailing_list_subscribers(subscriber_id)`,
  },
];

async function run() {
  console.log(`Adding ${INDEXES.length} indexes...\n`);

  for (const idx of INDEXES) {
    try {
      await db.execute(sql.raw(idx.statement));
      console.log(`  ✓ ${idx.name}`);
    } catch (err: any) {
      console.error(`  ✗ ${idx.name}: ${err.message}`);
    }
  }

  console.log("\nDone.");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  });
