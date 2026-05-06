import { eq, and } from "drizzle-orm";
import { db } from "../db/client";
import { emailTemplates, type EmailTemplate } from "../db/schema";
import { sendEmail } from "./email.service";
import { env } from "../config/env";
import type { Brand } from "./subscribers.service";
import type { TemplateKey } from "../validators/email-template.schema";

interface SendTemplatedEmailParams {
  brand: Brand;
  to: string;
  templateKey: TemplateKey;
  variables: Record<string, unknown>;
}

const LOGO_WATPAK = "https://res.cloudinary.com/ddwet1dzj/image/upload/v1777479817/watpack/WATPAK_FULL_LOGO_hek5y7.png";
const LOGO_DERCOLBAGS = "https://res.cloudinary.com/ddwet1dzj/image/upload/v1777042366/dercolbags/DERCOLBAGS_LOGO_tolkgw.png";

const BRAND_NAME_WATPAK = "WatPak";
const BRAND_NAME_DERCOLBAGS = "DercolBags Packaging Company Limited";

const HEADER_WATPAK = `<tr>
  <td style="background:linear-gradient(135deg,#FFC107 0%,#FFB300 100%);padding:40px 30px;text-align:center;">
    <img src="${LOGO_WATPAK}" alt="${BRAND_NAME_WATPAK}" width="180" style="max-width:180px;display:inline-block;">
  </td>
</tr>`;

const HEADER_DERCOLBAGS = `<tr>
  <td style="background:linear-gradient(135deg,#1a1a1a 0%,#2d2d2d 100%);padding:40px 30px;text-align:center;">
    <img src="${LOGO_DERCOLBAGS}" alt="${BRAND_NAME_DERCOLBAGS}" width="180" style="max-width:180px;display:inline-block;">
  </td>
</tr>`;

const FOOTER = (brandName: string, unsubscribeUrlPlaceholder: string, accentColor: string) => `
<tr>
  <td style="background:#fafafa;padding:30px;text-align:center;border-top:3px solid ${accentColor};">
    <p style="margin:0 0 8px;color:#888;font-size:13px;">You're receiving this because you subscribed to <strong style="color:#333;">${brandName}</strong></p>
    <p style="margin:0;color:#aaa;font-size:12px;">
      <a href="${unsubscribeUrlPlaceholder}" style="color:${accentColor};text-decoration:underline;">Unsubscribe</a>
    </p>
    <p style="margin:20px 0 0;color:#bbb;font-size:11px;">© ${new Date().getFullYear()} ${brandName.split(' ')[0]}. All rights reserved.</p>
  </td>
</tr>`;

const DEFAULT_TEMPLATES: Record<Brand, Record<TemplateKey, { subject: string; html: string }>> = {
  watpak: {
    subscriber_confirmation: {
      subject: `Welcome to ${BRAND_NAME_WATPAK}!`,
      html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Welcome</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    ${HEADER_WATPAK}
    <tr>
      <td style="padding:45px 40px;">
        <h1 style="margin:0 0 8px;font-size:28px;color:#1a1a1a;font-weight:600;">Welcome to {{brandName}}! 🎉</h1>
        <p style="margin:0 0 20px;font-size:16px;color:#555;line-height:1.6;">Hi {{name}},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.6;">Thank you for subscribing! We're thrilled to have you join our community.</p>
        <p style="margin:0;font-size:15px;color:#555;line-height:1.6;">You'll be the first to know about our latest products, exclusive offers, and exciting updates.</p>
        
        <div style="margin:30px 0;padding:20px;background:#FFF8E1;border-radius:8px;border-left:4px solid #FFC107;">
          <p style="margin:0;font-size:14px;color:#666;"><strong>What's next?</strong><br>Check your inbox for exclusive content and special promotions!</p>
        </div>
      </td>
    </tr>
    ${FOOTER(BRAND_NAME_WATPAK, "{{unsubscribeUrl}}", "#FFC107")}
  </table>
</body></html>`,
    },
    unsubscribe_confirmation: {
      subject: `You've been unsubscribed from ${BRAND_NAME_WATPAK}`,
      html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Unsubscribed</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    ${HEADER_WATPAK}
    <tr>
      <td style="padding:45px 40px;text-align:center;">
        <h1 style="margin:0 0 16px;font-size:26px;color:#1a1a1a;font-weight:600;">We're sorry to see you go!</h1>
        <p style="margin:0 0 12px;font-size:16px;color:#555;line-height:1.6;">Hi {{name}},</p>
        <p style="margin:0;font-size:15px;color:#555;line-height:1.6;">You've been successfully unsubscribed from our mailing list.</p>
        <p style="margin:24px 0 0;font-size:14px;color:#888;">You won't receive any further emails from us.</p>
        <div style="margin:30px 0 0;">
          <a href="{{dashboardUrl}}" style="display:inline-block;padding:12px 28px;background:#FFC107;color:#1a1a1a;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">Resubscribe</a>
        </div>
      </td>
    </tr>
  </table>
</body></html>`,
    },
    user_invite: {
      subject: `You've been invited to join ${BRAND_NAME_WATPAK}`,
      html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Invitation</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    ${HEADER_WATPAK}
    <tr>
      <td style="padding:45px 40px;text-align:center;">
        <h1 style="margin:0 0 8px;font-size:26px;color:#1a1a1a;font-weight:600;">You're Invited! 🚀</h1>
        <p style="margin:0 0 20px;font-size:16px;color:#555;line-height:1.6;">Hi {{name}},</p>
        <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">You've been invited to join <strong>{{brandName}}</strong>. We're excited to have you on board!</p>
        <a href="{{inviteUrl}}" style="display:inline-block;padding:14px 32px;background:#FFC107;color:#1a1a1a;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Accept Invitation</a>
      </td>
    </tr>
  </table>
</body></html>`,
    },
    password_reset: {
      subject: `Reset your ${BRAND_NAME_WATPAK} password`,
      html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Password Reset</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    ${HEADER_WATPAK}
    <tr>
      <td style="padding:45px 40px;text-align:center;">
        <h1 style="margin:0 0 8px;font-size:26px;color:#1a1a1a;font-weight:600;">Reset Your Password 🔐</h1>
        <p style="margin:0 0 20px;font-size:16px;color:#555;line-height:1.6;">Hi {{name}},</p>
        <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">Click the button below to reset your password. This link will expire in <strong>1 hour</strong>.</p>
        <a href="{{resetPasswordUrl}}" style="display:inline-block;padding:14px 32px;background:#FFC107;color:#1a1a1a;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Reset Password</a>
        <p style="margin:24px 0 0;font-size:13px;color:#999;">If you didn't request this, please ignore this email.</p>
      </td>
    </tr>
  </table>
</body></html>`,
    },
    campaign_default: {
      subject: "{{campaignTitle}}",
      html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>{{campaignTitle}}</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    ${HEADER_WATPAK}
    <tr>
      <td style="padding:40px;">
        <h1 style="margin:0 0 20px;font-size:28px;color:#1a1a1a;font-weight:600;">{{campaignTitle}}</h1>
        <div style="font-size:16px;color:#555;line-height:1.7;">{{campaignContent}}</div>
        {{#if ctaText}}
        <div style="margin:30px 0;text-align:center;">
          <a href="{{ctaUrl}}" style="display:inline-block;padding:14px 32px;background:#FFC107;color:#1a1a1a;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">{{ctaText}}</a>
        </div>
        {{/if}}
      </td>
    </tr>
    ${FOOTER(BRAND_NAME_WATPAK, "{{unsubscribeUrl}}", "#FFC107")}
  </table>
</body></html>`,
    },
    campaign_test: {
      subject: "[TEST] {{campaignTitle}}",
      html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>{{campaignTitle}}</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    ${HEADER_WATPAK}
    <tr><td style="background:#FF5722;padding:12px;text-align:center;color:#fff;font-weight:600;font-size:14px;letter-spacing:1px;">⚠️ TEST EMAIL</td></tr>
    <tr>
      <td style="padding:40px;">
        <h1 style="margin:0 0 20px;font-size:28px;color:#1a1a1a;font-weight:600;">{{campaignTitle}}</h1>
        <div style="font-size:16px;color:#555;line-height:1.7;">{{campaignContent}}</div>
        {{#if ctaText}}
        <div style="margin:30px 0;text-align:center;">
          <a href="{{ctaUrl}}" style="display:inline-block;padding:14px 32px;background:#FFC107;color:#1a1a1a;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">{{ctaText}}</a>
        </div>
        {{/if}}
      </td>
    </tr>
    ${FOOTER(BRAND_NAME_WATPAK, "{{unsubscribeUrl}}", "#FFC107")}
  </table>
</body></html>`,
    },
    admin_new_subscriber_notification: {
      subject: "New subscriber: {{email}}",
      html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>New Subscriber</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    ${HEADER_WATPAK}
    <tr>
      <td style="padding:40px;">
        <h2 style="margin:0 0 20px;font-size:22px;color:#1a1a1a;font-weight:600;">📬 New Subscriber Alert!</h2>
        <p style="margin:0 0 16px;font-size:15px;color:#555;">A new subscriber has joined:</p>
        <div style="background:#f9f9f9;border-radius:8px;padding:20px;margin:16px 0;">
          <p style="margin:0 8px 8px;font-size:14px;color:#555;"><strong>Email:</strong> {{email}}</p>
          <p style="margin:0 8px 8px;font-size:14px;color:#555;"><strong>Name:</strong> {{name}}</p>
          <p style="margin:0 8px 8px;font-size:14px;color:#555;"><strong>Location:</strong> {{location}}</p>
          <p style="margin:0 8px;font-size:14px;color:#555;"><strong>Source:</strong> {{source}}</p>
        </div>
        <a href="{{dashboardUrl}}" style="display:inline-block;padding:12px 24px;background:#FFC107;color:#1a1a1a;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">View in Dashboard</a>
      </td>
    </tr>
  </table>
</body></html>`,
    },
  },
  dercolbags: {
    subscriber_confirmation: {
      subject: `Welcome to ${BRAND_NAME_DERCOLBAGS}!`,
      html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Welcome</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    ${HEADER_DERCOLBAGS}
    <tr>
      <td style="padding:45px 40px;">
        <h1 style="margin:0 0 8px;font-size:26px;color:#1a1a1a;font-weight:600;">Welcome to {{brandName}}! 🎉</h1>
        <p style="margin:0 0 20px;font-size:16px;color:#555;line-height:1.6;">Hi {{name}},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.6;">Thank you for subscribing! We're thrilled to have you join our community.</p>
        <p style="margin:0;font-size:15px;color:#555;line-height:1.6;">You'll be the first to know about our latest products, exclusive offers, and exciting updates.</p>
        
        <div style="margin:30px 0;padding:20px;background:#f5f5f5;border-radius:8px;border-left:4px solid #1a1a1a;">
          <p style="margin:0;font-size:14px;color:#666;"><strong>What's next?</strong><br>Check your inbox for exclusive content and special promotions!</p>
        </div>
      </td>
    </tr>
    ${FOOTER(BRAND_NAME_DERCOLBAGS, "{{unsubscribeUrl}}", "#1a1a1a")}
  </table>
</body></html>`,
    },
    unsubscribe_confirmation: {
      subject: `You've been unsubscribed from ${BRAND_NAME_DERCOLBAGS}`,
      html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Unsubscribed</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    ${HEADER_DERCOLBAGS}
    <tr>
      <td style="padding:45px 40px;text-align:center;">
        <h1 style="margin:0 0 16px;font-size:26px;color:#1a1a1a;font-weight:600;">We're sorry to see you go!</h1>
        <p style="margin:0 0 12px;font-size:16px;color:#555;line-height:1.6;">Hi {{name}},</p>
        <p style="margin:0;font-size:15px;color:#555;line-height:1.6;">You've been successfully unsubscribed from our mailing list.</p>
        <p style="margin:24px 0 0;font-size:14px;color:#888;">You won't receive any further emails from us.</p>
        <div style="margin:30px 0 0;">
          <a href="{{dashboardUrl}}" style="display:inline-block;padding:12px 28px;background:#1a1a1a;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">Resubscribe</a>
        </div>
      </td>
    </tr>
  </table>
</body></html>`,
    },
    user_invite: {
      subject: `You've been invited to join ${BRAND_NAME_DERCOLBAGS}`,
      html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Invitation</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    ${HEADER_DERCOLBAGS}
    <tr>
      <td style="padding:45px 40px;text-align:center;">
        <h1 style="margin:0 0 8px;font-size:26px;color:#1a1a1a;font-weight:600;">You're Invited! 🚀</h1>
        <p style="margin:0 0 20px;font-size:16px;color:#555;line-height:1.6;">Hi {{name}},</p>
        <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">You've been invited to join <strong>{{brandName}}</strong>. We're excited to have you on board!</p>
        <a href="{{inviteUrl}}" style="display:inline-block;padding:14px 32px;background:#1a1a1a;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Accept Invitation</a>
      </td>
    </tr>
  </table>
</body></html>`,
    },
    password_reset: {
      subject: `Reset your ${BRAND_NAME_DERCOLBAGS} password`,
      html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Password Reset</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    ${HEADER_DERCOLBAGS}
    <tr>
      <td style="padding:45px 40px;text-align:center;">
        <h1 style="margin:0 0 8px;font-size:26px;color:#1a1a1a;font-weight:600;">Reset Your Password 🔐</h1>
        <p style="margin:0 0 20px;font-size:16px;color:#555;line-height:1.6;">Hi {{name}},</p>
        <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">Click the button below to reset your password. This link will expire in <strong>1 hour</strong>.</p>
        <a href="{{resetPasswordUrl}}" style="display:inline-block;padding:14px 32px;background:#1a1a1a;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Reset Password</a>
        <p style="margin:24px 0 0;font-size:13px;color:#999;">If you didn't request this, please ignore this email.</p>
      </td>
    </tr>
  </table>
</body></html>`,
    },
    campaign_default: {
      subject: "{{campaignTitle}}",
      html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>{{campaignTitle}}</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    ${HEADER_DERCOLBAGS}
    <tr>
      <td style="padding:40px;">
        <h1 style="margin:0 0 20px;font-size:28px;color:#1a1a1a;font-weight:600;">{{campaignTitle}}</h1>
        <div style="font-size:16px;color:#555;line-height:1.7;">{{campaignContent}}</div>
        {{#if ctaText}}
        <div style="margin:30px 0;text-align:center;">
          <a href="{{ctaUrl}}" style="display:inline-block;padding:14px 32px;background:#1a1a1a;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">{{ctaText}}</a>
        </div>
        {{/if}}
      </td>
    </tr>
    ${FOOTER(BRAND_NAME_DERCOLBAGS, "{{unsubscribeUrl}}", "#1a1a1a")}
  </table>
</body></html>`,
    },
    campaign_test: {
      subject: "[TEST] {{campaignTitle}}",
      html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>{{campaignTitle}}</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    ${HEADER_DERCOLBAGS}
    <tr><td style="background:#FF5722;padding:12px;text-align:center;color:#fff;font-weight:600;font-size:14px;letter-spacing:1px;">⚠️ TEST EMAIL</td></tr>
    <tr>
      <td style="padding:40px;">
        <h1 style="margin:0 0 20px;font-size:28px;color:#1a1a1a;font-weight:600;">{{campaignTitle}}</h1>
        <div style="font-size:16px;color:#555;line-height:1.7;">{{campaignContent}}</div>
        {{#if ctaText}}
        <div style="margin:30px 0;text-align:center;">
          <a href="{{ctaUrl}}" style="display:inline-block;padding:14px 32px;background:#1a1a1a;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">{{ctaText}}</a>
        </div>
        {{/if}}
      </td>
    </tr>
    ${FOOTER(BRAND_NAME_DERCOLBAGS, "{{unsubscribeUrl}}", "#1a1a1a")}
  </table>
</body></html>`,
    },
    admin_new_subscriber_notification: {
      subject: "New subscriber: {{email}}",
      html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>New Subscriber</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    ${HEADER_DERCOLBAGS}
    <tr>
      <td style="padding:40px;">
        <h2 style="margin:0 0 20px;font-size:22px;color:#1a1a1a;font-weight:600;">📬 New Subscriber Alert!</h2>
        <p style="margin:0 0 16px;font-size:15px;color:#555;">A new subscriber has joined:</p>
        <div style="background:#f9f9f9;border-radius:8px;padding:20px;margin:16px 0;">
          <p style="margin:0 8px 8px;font-size:14px;color:#555;"><strong>Email:</strong> {{email}}</p>
          <p style="margin:0 8px 8px;font-size:14px;color:#555;"><strong>Name:</strong> {{name}}</p>
          <p style="margin:0 8px 8px;font-size:14px;color:#555;"><strong>Location:</strong> {{location}}</p>
          <p style="margin:0 8px;font-size:14px;color:#555;"><strong>Source:</strong> {{source}}</p>
        </div>
        <a href="{{dashboardUrl}}" style="display:inline-block;padding:12px 24px;background:#1a1a1a;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">View in Dashboard</a>
      </td>
    </tr>
  </table>
</body></html>`,
    },
  },
};

function renderTemplateContent(content: string, variables: Record<string, unknown>): string {
  let result = content;

  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined && value !== null) {
      result = result.split(`{{${key}}}`).join(String(value));
    }
  }

  result = result.replace(/\{\{#[a-zA-Z]+\}\}([\s\S]*?)\{\{\/[a-zA-Z]+\}\}/g, (_, content) => content);

  return result;
}

export async function sendTemplatedEmail(params: SendTemplatedEmailParams): Promise<void> {
  const { brand, to, templateKey, variables } = params;

  const brandNameMap = {
    watpak: { name: BRAND_NAME_WATPAK, accent: "#FFC107" },
    dercolbags: { name: BRAND_NAME_DERCOLBAGS, accent: "#1a1a1a" },
  };

  const mergedVariables = {
    brandName: brandNameMap[brand].name,
    dashboardUrl: `${env.FRONTEND_URL}/dashboard`,
    ...variables,
  };

  const [template] = await db
    .select()
    .from(emailTemplates)
    .where(and(eq(emailTemplates.brand, brand), eq(emailTemplates.templateKey, templateKey), eq(emailTemplates.status, "active")))
    .limit(1);

  let subject: string;
  let html: string;

  if (template) {
    subject = renderTemplateContent(template.subject, mergedVariables);
    html = renderTemplateContent(template.htmlContent, mergedVariables);
  } else {
    console.warn(`[Email] No active template for ${brand}/${templateKey}, using fallback`);
    const fallback = DEFAULT_TEMPLATES[brand]?.[templateKey];
    if (!fallback) {
      throw new Error(`No fallback template found for ${brand}/${templateKey}`);
    }
    subject = renderTemplateContent(fallback.subject, mergedVariables);
    html = renderTemplateContent(fallback.html, mergedVariables);
  }

  await sendEmail({ brand, to, subject, html });
}

export async function getActiveTemplateForBrand(brand: Brand, templateKey: TemplateKey): Promise<EmailTemplate | null> {
  const [template] = await db
    .select()
    .from(emailTemplates)
    .where(and(eq(emailTemplates.brand, brand), eq(emailTemplates.templateKey, templateKey), eq(emailTemplates.status, "active")))
    .limit(1);

  return template ?? null;
}