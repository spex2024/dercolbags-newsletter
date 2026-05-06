-- Email Templates Migration
-- Run: bun run db:push

-- Create enum types
DO $$ BEGIN
  CREATE TYPE template_status AS ENUM ('draft', 'active', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE template_category AS ENUM ('system', 'auth', 'campaign', 'notification');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand brand NOT NULL,
  template_key TEXT NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  plain_text_content TEXT,
  design_json JSONB,
  status template_status NOT NULL DEFAULT 'draft',
  category template_category NOT NULL,
  created_by TEXT REFERENCES "user"(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(brand, template_key)
);

-- Create audit logs table
CREATE TABLE IF NOT EXISTS template_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES email_templates(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  changes JSONB,
  performed_by TEXT REFERENCES "user"(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_brand ON email_templates(brand);
CREATE INDEX IF NOT EXISTS idx_email_templates_status ON email_templates(status);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_brand_key_status ON email_templates(brand, template_key, status);
CREATE INDEX IF NOT EXISTS idx_template_audit_logs_template ON template_audit_logs(template_id);
CREATE INDEX IF NOT EXISTS idx_template_audit_logs_performed_by ON template_audit_logs(performed_by);

-- Seed default templates for both brands
INSERT INTO email_templates (brand, template_key, name, subject, html_content, status, category)
SELECT brand, template_key, name, subject, html_content, 'active', category
FROM (
  SELECT 'watpak' as brand, 'subscriber_confirmation' as template_key, 'Subscriber Confirmation' as name, 'Welcome to WatPak!' as subject, '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Welcome to WatPak</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="background:#1a73e8;padding:30px;text-align:center;border-radius:8px 8px 0 0;">
        <h1 style="color:#ffffff;margin:0;font-size:28px;">WatPak</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:30px;background:#ffffff;border:1px solid #e5e7eb;border-top:none;">
        <p style="margin:0 0 16px;font-size:16px;color:#374151;">Hi {{name}},</p>
        <p style="margin:0 0 16px;font-size:16px;color:#374151;">Thank you for subscribing to <strong>WatPak</strong>! We're excited to have you with us.</p>
        <p style="margin:0;font-size:16px;color:#374151;">You'll be among the first to receive updates, exclusive offers, and news about our latest products.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:20px;background:#f9fafb;text-align:center;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none;">
        <p style="margin:0;color:#9ca3af;font-size:12px;">You''re receiving this because you subscribed to WatPak.<br>No longer want these emails? <a href="{{unsubscribeUrl}}" style="color:#9ca3af;">Unsubscribe</a>.</p>
      </td>
    </tr>
  </table>
</body>
</html>' as html, 'auth' as category
  UNION ALL
  SELECT 'dercolbags', 'subscriber_confirmation', 'Subscriber Confirmation', 'Welcome to DercolBags!', '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Welcome to DercolBags</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="background:#1a1a1a;padding:30px;text-align:center;border-radius:8px 8px 0 0;">
        <h1 style="color:#ffffff;margin:0;font-size:28px;">DercolBags</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:30px;background:#ffffff;border:1px solid #e5e7eb;border-top:none;">
        <p style="margin:0 0 16px;font-size:16px;color:#374151;">Hi {{name}},</p>
        <p style="margin:0 0 16px;font-size:16px;color:#374151;">Thank you for subscribing to <strong>DercolBags</strong>! We're excited to have you with us.</p>
        <p style="margin:0;font-size:16px;color:#374151;">You''ll be among the first to receive updates, exclusive offers, and news about our latest products.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:20px;background:#f9fafb;text-align:center;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none;">
        <p style="margin:0;color:#9ca3af;font-size:12px;">You''re receiving this because you subscribed to DercolBags.<br>No longer want these emails? <a href="{{unsubscribeUrl}}" style="color:#9ca3af;">Unsubscribe</a>.</p>
      </td>
    </tr>
  </table>
</body>
</html>' as html, 'auth'
  UNION ALL
  SELECT 'watpak', 'unsubscribe_confirmation', 'Unsubscribe Confirmation', 'You''ve been unsubscribed', '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Unsubscribed</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
  <h1 style="color:#1a73e8;">You''ve been unsubscribed</h1>
  <p>Hi {{name}},</p>
  <p>You''ve been removed from our mailing list. You won''t receive any more emails from us.</p>
  <p><a href="{{dashboardUrl}}">Resubscribe</a></p>
</body>
</html>' as html, 'auth'
  UNION ALL
  SELECT 'dercolbags', 'unsubscribe_confirmation', 'Unsubscribe Confirmation', 'You''ve been unsubscribed', '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Unsubscribed</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
  <h1 style="color:#1a1a1a;">You''ve been unsubscribed</h1>
  <p>Hi {{name}},</p>
  <p>You''ve been removed from our mailing list. You won''t receive any more emails from us.</p>
  <p><a href="{{dashboardUrl}}">Resubscribe</a></p>
</body>
</html>' as html, 'auth'
  UNION ALL
  SELECT 'watpak', 'password_reset', 'Password Reset', 'Reset your WatPak password', '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Password Reset</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
  <h1 style="color:#1a73e8;">Reset Your Password</h1>
  <p>Hi {{name}},</p>
  <p>Click the button below to reset your password:</p>
  <p style="margin:20px 0;"><a href="{{resetPasswordUrl}}" style="background:#1a73e8;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;">Reset Password</a></p>
  <p style="color:#666;font-size:14px;">This link expires in 1 hour.</p>
</body>
</html>' as html, 'auth'
  UNION ALL
  SELECT 'dercolbags', 'password_reset', 'Password Reset', 'Reset your DercolBags password', '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Password Reset</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
  <h1 style="color:#1a1a1a;">Reset Your Password</h1>
  <p>Hi {{name}},</p>
  <p>Click the button below to reset your password:</p>
  <p style="margin:20px 0;"><a href="{{resetPasswordUrl}}" style="background:#1a1a1a;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;">Reset Password</a></p>
  <p style="color:#666;font-size:14px;">This link expires in 1 hour.</p>
</body>
</html>' as html, 'auth'
  UNION ALL
  SELECT 'watpak', 'campaign_default', 'Default Campaign', '{{campaignTitle}}', '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>{{campaignTitle}}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
  <h1 style="color:#1a73e8;">{{campaignTitle}}</h1>
  <div>{{campaignContent}}</div>
  {{#if ctaText}}<p style="margin:20px 0;"><a href="{{ctaUrl}}" style="background:#1a73e8;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;">{{ctaText}}</a></p>{{/if}}
  <p style="margin-top:30px;color:#666;font-size:12px;border-top:1px solid #eee;padding-top:20px;"><a href="{{unsubscribeUrl}}" style="color:#666;">Unsubscribe</a></p>
</body>
</html>' as html, 'campaign'
  UNION ALL
  SELECT 'dercolbags', 'campaign_default', 'Default Campaign', '{{campaignTitle}}', '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>{{campaignTitle}}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
  <h1 style="color:#1a1a1a;">{{campaignTitle}}</h1>
  <div>{{campaignContent}}</div>
  {{#if ctaText}}<p style="margin:20px 0;"><a href="{{ctaUrl}}" style="background:#1a1a1a;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;">{{ctaText}}</a></p>{{/if}}
  <p style="margin-top:30px;color:#666;font-size:12px;border-top:1px solid #eee;padding-top:20px;"><a href="{{unsubscribeUrl}}" style="color:#666;">Unsubscribe</a></p>
</body>
</html>' as html, 'campaign'
) AS templates
ON CONFLICT (brand, template_key) DO NOTHING;