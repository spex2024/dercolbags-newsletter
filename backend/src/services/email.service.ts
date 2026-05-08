import { Resend } from "resend";
import Mailgun from "mailgun.js";
import FormData from "form-data";
import { eq } from "drizzle-orm";
import { env } from "../config/env";
import { db } from "../db/client";
import { subscribers, campaigns } from "../db/schema";
import { sendTemplatedEmail } from "./template-loader.service";

type Brand = "watpak" | "dercolbags";

interface SendEmailParams {
  brand: Brand;
  to: string;
  subject: string;
  html: string;
}

interface SendConfirmationParams {
  brand: Brand;
  name: string | null;
  email: string;
  unsubscribeToken: string;
  subscriberId: string;
}

interface SendCampaignParams {
  brand: Brand;
  to: string;
  subject: string;
  html: string;
  preheader?: string;
  subscriberId: string;
  campaignId: string;
}

const SENDER_CONFIG = {
  watpak: { from: "WatPak <hello@mail.watpak.com>" },
  dercolbags: { from: "DercolBags Packaging <hello@dercolbags.com>" },
} as const;

const resend = new Resend(env.RESEND_API_KEY);

const mailgunClient = new Mailgun(FormData).client({
  username: "api",
  key: env.MAILGUN_API_KEY,
  url: env.MAILGUN_URL,
});

async function sendViaResend(params: SendEmailParams): Promise<void> {
  const { data, error } = await resend.emails.send({
    from: SENDER_CONFIG.watpak.from,
    to: [params.to],
    subject: params.subject,
    html: params.html,
  });

  if (error || !data) {
    throw new Error(`Resend error: ${error?.message ?? "Unknown error"}`);
  }
}

async function sendViaMailgun(params: SendEmailParams): Promise<void> {
  try {
    const result = await mailgunClient.messages.create(env.MAILGUN_DOMAIN, {
      from: SENDER_CONFIG.dercolbags.from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    });
    console.log(`[Mailgun] Queued to ${params.to}: ${result.id}`);
  } catch (err: unknown) {
    const detail = (err as { details?: string; message?: string })?.details
      ?? (err as { message?: string })?.message
      ?? String(err);
    console.error(`[Mailgun] Error sending to ${params.to}:`, detail);
    throw new Error(`Mailgun: ${detail}`);
  }
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  if (params.brand === "watpak") {
    await sendViaResend(params);
  } else {
    await sendViaMailgun(params);
  }
}

function buildUnsubscribeLink(token: string): string {
  return `${env.FRONTEND_URL}/unsubscribe?token=${token}`;
}

function buildBrandColor(brand: Brand): string {
  return brand === "watpak" ? "#1a73e8" : "#1a1a1a";
}

function buildConfirmationHtml(
  brand: Brand,
  name: string | null,
  unsubscribeToken: string
): string {
  const brandName = brand === "watpak" ? "WatPak" : "DercolBags";
  const greeting = name ? `Hi ${name}` : "Hi there";
  const unsubscribeLink = buildUnsubscribeLink(unsubscribeToken);
  const color = buildBrandColor(brand);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${brandName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:${color};padding:40px 48px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">${brandName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:48px;">
              <h2 style="margin:0 0 16px;color:#111827;font-size:22px;">${greeting},</h2>
              <p style="margin:0 0 16px;color:#6b7280;font-size:16px;line-height:1.6;">
                Thank you for subscribing to <strong>${brandName}</strong>! We're glad to have you with us.
              </p>
              <p style="margin:0;color:#6b7280;font-size:16px;line-height:1.6;">
                You'll be among the first to receive updates, exclusive offers, and news about our latest products.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 48px;background:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                You're receiving this because you subscribed to ${brandName}.<br>
                No longer want these emails?
                <a href="${unsubscribeLink}" style="color:#9ca3af;">Unsubscribe here</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendSubscriptionConfirmation(
  params: SendConfirmationParams
): Promise<void> {
  const unsubscribeUrl = `${env.FRONTEND_URL}/unsubscribe?token=${params.unsubscribeToken}`;
  const brandName = params.brand === "watpak" ? "WatPak" : "DercolBags Packaging Company Limited";

  try {
    await sendTemplatedEmail({
      brand: params.brand,
      to: params.email,
      templateKey: "subscriber_confirmation",
      variables: {
        brandName,
        name: params.name ?? "",
        firstName: params.name?.split(" ")[0] ?? "",
        unsubscribeUrl,
      },
    });
  } catch (error) {
    console.error("[Template] Failed, using fallback:", error);
    const html = buildConfirmationHtml(params.brand, params.name, params.unsubscribeToken);
    await sendEmail({
      brand: params.brand,
      to: params.email,
      subject: `Welcome to ${brandName}!`,
      html,
    });
  }

  await db
    .update(subscribers)
    .set({ lastEmailSentAt: new Date() })
    .where(eq(subscribers.id, params.subscriberId));
}

export function replaceCampaignVariables(
  html: string,
  vars: { brandName: string; unsubscribeUrl: string; subject?: string; preheader?: string },
): string {
  return html
    .replace(/\{\{brandName\}\}/gi,      vars.brandName)
    .replace(/\{\{brand_name\}\}/gi,     vars.brandName)
    .replace(/\{\{unsubscribeUrl\}\}/gi, vars.unsubscribeUrl)
    .replace(/\{\{unsubscribe_url\}\}/gi,vars.unsubscribeUrl)
    .replace(/\{\{subject\}\}/gi,        vars.subject   ?? "")
    .replace(/\{\{preheader\}\}/gi,      vars.preheader ?? "");
}

export async function sendCampaignEmail(params: SendCampaignParams) {
  const [subscriber] = await db
    .select({ unsubscribeToken: subscribers.unsubscribeToken })
    .from(subscribers)
    .where(eq(subscribers.id, params.subscriberId))
    .limit(1);

  const unsubscribeToken = subscriber?.unsubscribeToken ?? "";
  const brandName = params.brand === "watpak" ? "WatPak" : "DercolBags";
  const brandColor = buildBrandColor(params.brand);
  const unsubscribeLink = buildUnsubscribeLink(unsubscribeToken);

  const processedContent = replaceCampaignVariables(params.html, {
    brandName,
    unsubscribeUrl: unsubscribeLink,
    subject:   params.subject,
    preheader: params.preheader,
  });

  const html = buildCampaignEmailHtml({
    brand: params.brand,
    brandName,
    brandColor,
    subject: params.subject,
    preheader: params.preheader,
    content: processedContent,
    unsubscribeLink,
  });

  await sendEmail({
    brand: params.brand,
    to: params.to,
    subject: params.subject,
    html,
  });

  await db.update(subscribers).set({ lastEmailSentAt: new Date() }).where(eq(subscribers.id, params.subscriberId));

  return { success: true, timestamp: new Date().toISOString() };
}

function buildCampaignEmailHtml(params: {
  brand: Brand;
  brandName: string;
  brandColor: string;
  subject: string;
  preheader?: string;
  content: string;
  unsubscribeLink: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.subject}</title>
  ${params.preheader ? `<meta name="description" content="${params.preheader}">` : ""}
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:${params.brandColor};padding:40px 48px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">${params.brandName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:48px;">
              ${params.content}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 48px;background:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                You're receiving this because you subscribed to ${params.brandName}.<br>
                No longer want these emails?
                <a href="${params.unsubscribeLink}" style="color:#9ca3af;">Unsubscribe here</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

interface SendTemplateParams {
  brand: Brand;
  to: string;
  subject: string;
  html: string;
}

export async function sendTemplateEmail(params: SendTemplateParams): Promise<void> {
  await sendEmail({
    brand: params.brand,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}
