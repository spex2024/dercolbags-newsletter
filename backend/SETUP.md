# Mailing System Setup Guide

## Database Migration

Run the migration to create all required tables:

```bash
# Generate migration
bun run db:generate

# Push schema to database
bun run db:push
```

Or manually run the SQL:

```sql
-- Mailing Lists
CREATE TABLE mailing_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand brand NOT NULL,
  description TEXT,
  is_dynamic BOOLEAN NOT NULL DEFAULT false,
  filter_config JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE mailing_list_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES mailing_lists(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  added_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(list_id, subscriber_id)
);

-- Campaigns
CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'cancelled');

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand brand NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  preheader TEXT,
  status campaign_status NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  created_by TEXT NOT NULL REFERENCES "user"(id),
  target_type TEXT NOT NULL,
  target_id UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Campaign Recipients
CREATE TYPE recipient_status AS ENUM ('pending', 'sent', 'failed', 'opened', 'clicked');

CREATE TABLE campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  status recipient_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  error_message TEXT,
  provider_response JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Campaign Logs
CREATE TABLE campaign_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  performed_by TEXT REFERENCES "user"(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Email Jobs (Queue)
CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE email_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES campaign_recipients(id) ON DELETE CASCADE,
  status job_status NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  scheduled_at TIMESTAMP,
  processed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_mailing_lists_brand ON mailing_lists(brand);
CREATE INDEX idx_campaigns_brand ON campaigns(brand);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX idx_email_jobs_campaign ON email_jobs(campaign_id);
CREATE INDEX idx_email_jobs_status ON email_jobs(status);
```

## Environment Variables

No new environment variables required. Uses existing:
- `RESEND_API_KEY` - for WatPak emails
- `MAILGUN_API_KEY`, `MAILGUN_DOMAIN` - for DercolBags emails
- `NODE_ENV` - automatically sets `secure` cookies in production

## Roles & Permissions

Users must have one of these roles to send campaigns:
- `owner`
- `admin`
- `marketing`

Brand access is checked against the user's `brandAccess` field.

## API Endpoints

### Mailing Lists

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/mailing-lists | Create mailing list |
| GET | /api/v1/mailing-lists | List all lists |
| GET | /api/v1/mailing-lists/:id | Get list details |
| PATCH | /api/v1/mailing-lists/:id | Update list |
| DELETE | /api/v1/mailing-lists/:id | Delete list |
| POST | /api/v1/mailing-lists/:id/subscribers | Add subscribers |
| DELETE | /api/v1/mailing-lists/:id/subscribers/:subscriberId | Remove subscriber |

### Campaigns

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/campaigns | Create campaign |
| GET | /api/v1/campaigns | List campaigns |
| GET | /api/v1/campaigns/:id | Get campaign |
| PATCH | /api/v1/campaigns/:id | Update campaign |
| DELETE | /api/v1/campaigns/:id | Delete campaign |
| POST | /api/v1/campaigns/:id/send | Send immediately |
| POST | /api/v1/campaigns/:id/schedule | Schedule campaign |
| POST | /api/v1/campaigns/:id/cancel | Cancel campaign |
| GET | /api/v1/campaigns/:id/stats | Get campaign stats |

## Sending a Campaign

1. Create a draft campaign:
```json
POST /api/v1/campaigns
{
  "name": "Summer Sale",
  "brand": "watpak",
  "subject": "🎉 Summer Sale - 50% Off!",
  "content": "<p>Your content here...</p>",
  "targetType": "all"
}
```

2. Send immediately:
```json
POST /api/v1/campaigns/:id/send
```

Or schedule for later:
```json
POST /api/v1/campaigns/:id/schedule
{
  "scheduledAt": "2024-06-15T10:00:00Z"
}
```

## Email Providers

- **WatPak**: Uses Resend (configured via `RESEND_API_KEY`)
- **DercolBags**: Uses Mailgun (configured via `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`)

## Rate Limiting

Campaign sending is subject to existing rate limits defined in `rate-limit.middleware.ts`.

## Queue Processing

The email queue automatically:
- Processes in batches of 50 emails
- Supports 3 concurrent workers
- Retries failed emails up to 3 times
- Logs all actions to `campaign_logs`
- Checks for scheduled campaigns every 60 seconds

## Security Considerations

- Only marketing/admin/owner roles can create/send campaigns
- Brand access is enforced on all operations
- Unsubscribed users are excluded from campaigns
- All state-changing endpoints require authentication
- CSRF protection is applied to all API v1 routes
- Secure cookies are configured for production

---

# Email Templates System

## Database Migration

Run the SQL migration:

```sql
-- Run: bun run db:push
-- Or manually run: src/db/migrations/email_templates.sql
```

Creates:
- `email_templates` - Stores all email templates
- `template_audit_logs` - Audit trail for template actions

## Template Keys

| Key | Category | Description |
|-----|----------|-------------|
| `subscriber_confirmation` | auth | Welcome email on subscription |
| `unsubscribe_confirmation` | auth | Confirmation after unsubscribing |
| `user_invite` | auth | Invitation to join the platform |
| `password_reset` | auth | Password reset email |
| `campaign_default` | campaign | Default campaign template |
| `campaign_test` | campaign | Test campaign (includes TEST badge) |
| `admin_new_subscriber_notification` | notification | Admin alert for new subscriber |

## Template Variables

### General Variables
- `{{brandName}}` - Brand name (WatPak / DercolBags)
- `{{firstName}}` - Recipient first name
- `{{name}}` - Recipient full name
- `{{email}}` - Recipient email
- `{{phone}}` - Recipient phone
- `{{businessName}}` - Business name
- `{{location}}` - Location

### Link Variables
- `{{unsubscribeUrl}}` - Unsubscribe link
- `{{inviteUrl}}` - User invitation link
- `{{resetPasswordUrl}}` - Password reset link
- `{{dashboardUrl}}` - Dashboard link

### Campaign Variables
- `{{campaignTitle}}` - Campaign subject/title
- `{{campaignContent}}` - Campaign HTML content
- `{{ctaText}}` - Call-to-action button text
- `{{ctaUrl}}` - Call-to-action link

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/email-templates | Create template |
| GET | /api/v1/email-templates | List templates |
| GET | /api/v1/email-templates/:id | Get template |
| PATCH | /api/v1/email-templates/:id | Update template |
| DELETE | /api/v1/email-templates/:id | Delete template |
| PATCH | /api/v1/email-templates/:id/status | Update status (draft/active/archived) |
| POST | /api/v1/email-templates/:id/preview | Preview with variables |
| POST | /api/v1/email-templates/:id/send-test | Send test email |
| POST | /api/v1/email-templates/:id/duplicate | Duplicate template |

## Role-Based Access

| Category | Owner | Admin | Marketing |
|----------|-------|-------|-----------|
| system | ✓ | ✗ | ✗ |
| auth | ✓ | ✗ | ✗ |
| campaign | ✓ | ✓ | ✓ |
| notification | ✓ | ✓ | ✓ |

## Example Usage

### Create Template
```json
POST /api/v1/email-templates
{
  "brand": "watpak",
  "templateKey": "campaign_default",
  "name": "Summer Sale Template",
  "subject": "🎉 {{campaignTitle}}",
  "htmlContent": "<h1>{{campaignTitle}}</h1><div>{{campaignContent}}</div><a href='{{ctaUrl}}'>{{ctaText}}</a><p><a href='{{unsubscribeUrl}}'>Unsubscribe</a></p>",
  "category": "campaign"
}
```

### Preview Template
```json
POST /api/v1/email-templates/:id/preview
{
  "variables": {
    "brandName": "WatPak",
    "campaignTitle": "Summer Sale",
    "campaignContent": "<p>Get 50% off!</p>",
    "ctaText": "Shop Now",
    "ctaUrl": "https://watpak.com/sale",
    "unsubscribeUrl": "https://example.com/unsubscribe"
  }
}
```

### Send Test
```json
POST /api/v1/email-templates/:id/send-test
{
  "email": "test@example.com",
  "variables": {
    "brandName": "WatPak",
    "name": "Test User",
    "unsubscribeUrl": "https://example.com/unsubscribe"
  }
}
```

### Activate Template
```json
PATCH /api/v1/email-templates/:id/status
{
  "status": "active"
}
```

## Fallback Templates

If no active template exists for a brand/templateKey combination, the system uses hardcoded fallback templates defined in `template-loader.service.ts`.

## Security

- Brand access enforced on all routes
- Template changes logged to `template_audit_logs`
- Only owner/admin can manage system/auth templates
- Only owner/admin/marketing can manage campaign templates
- Test emails prefixed with `[TEST]` in subject