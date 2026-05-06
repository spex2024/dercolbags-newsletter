-- New features migration
-- Run: bun run db:push

-- Webhook Events
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  brand brand,
  campaign_id UUID REFERENCES campaigns(id),
  recipient_id UUID REFERENCES campaign_recipients(id),
  subscriber_id UUID REFERENCES subscribers(id),
  email TEXT,
  message_id TEXT,
  payload JSONB,
  processed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tracking Links
CREATE TABLE IF NOT EXISTS tracking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES campaign_recipients(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  hashed_url TEXT NOT NULL UNIQUE,
  clicked_at TIMESTAMP,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Scheduled Jobs Persistence
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  scheduled_for TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Subscriber Import/Export Jobs
CREATE TABLE IF NOT EXISTS import_export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  brand brand NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  file_name TEXT,
  file_url TEXT,
  total_rows INTEGER,
  processed_rows INTEGER,
  success_rows INTEGER,
  error_rows INTEGER,
  errors JSONB,
  created_by TEXT REFERENCES "user"(id),
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Campaign Variants (A/B Testing)
CREATE TABLE IF NOT EXISTS campaign_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  preheader TEXT,
  percentage INTEGER NOT NULL DEFAULT 50,
  is_control BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_events_brand ON webhook_events(brand);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events(created_at);
CREATE INDEX IF NOT EXISTS idx_tracking_links_campaign ON tracking_links(campaign_id);
CREATE INDEX IF NOT EXISTS idx_tracking_links_hash ON tracking_links(hashed_url);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status ON scheduled_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_scheduled ON scheduled_jobs(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_import_export_jobs_brand ON import_export_jobs(brand);
CREATE INDEX IF NOT EXISTS idx_import_export_jobs_status ON import_export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_campaign_variants_campaign ON campaign_variants(campaign_id);