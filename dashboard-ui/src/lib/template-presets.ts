export interface PresetTemplate {
  id: string
  name: string
  description: string
  category: "welcome" | "newsletter" | "promotion" | "notification" | "minimal" | "reengagement" | "event"
  thumbnail: string
  design: Record<string, unknown>
}

// ── Shared building blocks ───────────────────────────────────────────────────

const FONT = { label: "Arial", value: "arial,helvetica,sans-serif" }
const LINK_STYLE = { body: true, linkColor: "#000000", linkHoverColor: "#333333", linkUnderline: true, linkHoverUnderline: true }
const FLAGS = { selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true }

function bodyValues(bg = "#f4f4f5", preheader = "") {
  return {
    backgroundColor: bg,
    width: "600px",
    fontFamily: FONT,
    contentWidth: "600px",
    contentAlign: "center",
    preheaderText: preheader,
    linkStyle: LINK_STYLE,
    _meta: { htmlID: "u_body", htmlClassNames: "u_body" },
  }
}

function row(id: string, columns: unknown[], pad = "0px") {
  return {
    id,
    cells: columns.map(() => 1),
    columns,
    values: {
      padding: pad,
      _meta: { htmlID: id, htmlClassNames: "u_row" },
      ...FLAGS,
    },
  }
}

function col(id: string, contents: unknown[], bg = "#ffffff") {
  return {
    id,
    contents,
    values: {
      backgroundColor: bg,
      padding: "0px",
      _meta: { htmlID: id, htmlClassNames: "u_column" },
    },
  }
}

function textBlock(id: string, html: string, pad = "30px 40px") {
  return {
    id,
    type: "text",
    values: {
      containerPadding: pad,
      textAlign: "left",
      lineHeight: "160%",
      _meta: { htmlID: id, htmlClassNames: "u_content_text" },
      ...FLAGS,
      text: html,
    },
  }
}

function btn(id: string, label: string, href = "{{ctaUrl}}", bg = "#000000", color = "#ffffff", pad = "0px 40px 40px") {
  return {
    id,
    type: "button",
    values: {
      containerPadding: pad,
      href: { name: "web", values: { href, target: "_blank" } },
      buttonColors: { color, backgroundColor: bg, hoverColor: color, hoverBackgroundColor: "#333333" },
      size: { autoWidth: false, width: "100%" },
      textAlign: "center",
      lineHeight: "120%",
      padding: "16px 32px",
      _meta: { htmlID: id, htmlClassNames: "u_content_button" },
      ...FLAGS,
      text: `<span style="font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">${label}</span>`,
    },
  }
}

function divider(id: string, color = "#e5e5e5", pad = "0px 40px") {
  return {
    id,
    type: "divider",
    values: {
      containerPadding: pad,
      border: { borderTopWidth: "2px", borderTopStyle: "solid", borderTopColor: color },
      textAlign: "center",
      _meta: { htmlID: id, htmlClassNames: "u_content_divider" },
      ...FLAGS,
    },
  }
}

// Standard professional footer used by every template
function footer(id: string) {
  return textBlock(
    id,
    `<p style="font-size:11px;color:#999999;text-align:center;margin:0 0 6px;">© 2025 <strong>{{brandName}}</strong> · All rights reserved.</p>
     <p style="font-size:11px;color:#999999;text-align:center;margin:0;">You are receiving this email because you subscribed to our list.&nbsp;
     <a href="{{unsubscribeUrl}}" style="color:#999999;text-decoration:underline;">Unsubscribe</a></p>`,
    "24px 40px 28px",
  )
}

// Inverted black brand header
function brandHeader(id: string, subtitle = "") {
  return {
    id: `${id}-col`,
    contents: [
      textBlock(
        `${id}-text`,
        `<p style="font-size:22px;font-weight:900;color:#ffffff;text-transform:uppercase;letter-spacing:1px;text-align:center;margin:0;">{{brandName}}</p>
         ${subtitle ? `<p style="font-size:12px;color:rgba(255,255,255,0.6);text-align:center;letter-spacing:3px;text-transform:uppercase;margin:6px 0 0;">${subtitle}</p>` : ""}`,
        "28px 40px",
      ),
    ],
    values: {
      backgroundColor: "#000000",
      padding: "0px",
      _meta: { htmlID: `${id}-col`, htmlClassNames: "u_column" },
    },
  }
}

// ── Templates ────────────────────────────────────────────────────────────────

export const presetTemplates: PresetTemplate[] = [

  // ── 1. Blank Canvas ─────────────────────────────────────────────────────────
  {
    id: "blank",
    name: "Blank Canvas",
    description: "Start from scratch — drag blocks from the left panel",
    category: "minimal",
    thumbnail: "01",
    design: {
      counters: { u_row: 3, u_column: 3, u_content_text: 2 },
      body: {
        rows: [
          row("r-blank-header", [brandHeader("blank-hdr")], "0px"),
          row("r-blank-body", [col("c-blank-body", [
            textBlock("t-blank-1",
              `<p style="font-size:28px;font-weight:900;color:#000000;text-transform:uppercase;text-align:center;">Your Subject Line</p>
               <p style="font-size:16px;color:#555555;text-align:center;line-height:170%;">Write your message here. Drag blocks from the left panel to build your layout.</p>`,
              "40px 40px 20px"),
          ])], "0px"),
          row("r-blank-footer", [col("c-blank-footer", [footer("t-blank-footer")], "#f4f4f5")], "0px"),
        ],
        values: bodyValues("#f4f4f5", ""),
      },
      schemaVersion: 16,
    },
  },

  // ── 2. Welcome Email ────────────────────────────────────────────────────────
  {
    id: "welcome-email",
    name: "Welcome Email",
    description: "Warm, on-brand welcome for new subscribers",
    category: "welcome",
    thumbnail: "02",
    design: {
      counters: { u_row: 4, u_column: 4, u_content_text: 4, u_content_button: 1, u_content_divider: 1 },
      body: {
        rows: [
          row("r-w-header", [brandHeader("w-hdr", "Welcome")], "0px"),
          row("r-w-hero", [col("c-w-hero", [
            textBlock("t-w-hero",
              `<p style="font-size:36px;font-weight:900;color:#000000;text-transform:uppercase;letter-spacing:-1px;text-align:center;line-height:110%;margin:0;">Welcome to the family, {{name}}.</p>`,
              "48px 40px 16px"),
            textBlock("t-w-body",
              `<p style="font-size:16px;color:#444444;text-align:center;line-height:175%;">We're glad you're here. Expect exclusive updates, product drops, and insider news delivered straight to your inbox. We promise to keep things worth reading.</p>`,
              "0px 40px 32px"),
            btn("b-w-cta", "Explore Now →", "{{dashboardUrl}}", "#000000", "#ffffff", "0px 40px 48px"),
          ])], "0px"),
          row("r-w-div", [col("c-w-div", [divider("d-w", "#e5e5e5", "0px 40px")])], "0px"),
          row("r-w-footer", [col("c-w-footer", [footer("t-w-footer")], "#ffffff")], "0px"),
        ],
        values: bodyValues("#ffffff", "Welcome aboard — we're glad you're here."),
      },
      schemaVersion: 16,
    },
  },

  // ── 3. Monthly Newsletter ───────────────────────────────────────────────────
  {
    id: "monthly-newsletter",
    name: "Monthly Newsletter",
    description: "Curated roundup with a hero headline and two content sections",
    category: "newsletter",
    thumbnail: "03",
    design: {
      counters: { u_row: 6, u_column: 6, u_content_text: 6, u_content_button: 1, u_content_divider: 2 },
      body: {
        rows: [
          row("r-nl-header", [brandHeader("nl-hdr", "Monthly Update")], "0px"),
          row("r-nl-hero", [col("c-nl-hero", [
            textBlock("t-nl-label",
              `<p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:4px;color:#999999;text-align:center;margin:0;">{{subject}}</p>`,
              "32px 40px 12px"),
            textBlock("t-nl-headline",
              `<p style="font-size:32px;font-weight:900;color:#000000;text-transform:uppercase;letter-spacing:-1px;text-align:center;line-height:110%;margin:0;">What's New This Month</p>`,
              "0px 40px 16px"),
            divider("d-nl-1", "#000000", "0px 40px"),
          ])], "0px"),
          row("r-nl-s1", [col("c-nl-s1", [
            textBlock("t-nl-s1-title",
              `<p style="font-size:18px;font-weight:900;color:#000000;text-transform:uppercase;letter-spacing:0.5px;margin:0;">Highlight #1</p>`,
              "28px 40px 8px"),
            textBlock("t-nl-s1-body",
              `<p style="font-size:15px;color:#444444;line-height:175%;">Share your first story, update, or insight here. Keep it concise and link to more if needed.</p>`,
              "0px 40px 24px"),
            divider("d-nl-2", "#e5e5e5", "0px 40px"),
          ])], "0px"),
          row("r-nl-s2", [col("c-nl-s2", [
            textBlock("t-nl-s2-title",
              `<p style="font-size:18px;font-weight:900;color:#000000;text-transform:uppercase;letter-spacing:0.5px;margin:0;">Highlight #2</p>`,
              "24px 40px 8px"),
            textBlock("t-nl-s2-body",
              `<p style="font-size:15px;color:#444444;line-height:175%;">Your second story or update goes here. Add images, links, or any content that serves your readers.</p>`,
              "0px 40px 24px"),
            btn("b-nl-cta", "Read More →", "{{ctaUrl}}", "#000000", "#ffffff", "0px 40px 40px"),
          ])], "0px"),
          row("r-nl-footer", [col("c-nl-footer", [footer("t-nl-footer")], "#f4f4f5")], "0px"),
        ],
        values: bodyValues("#f4f4f5", "Your monthly roundup is here."),
      },
      schemaVersion: 16,
    },
  },

  // ── 4. Flash Sale ───────────────────────────────────────────────────────────
  {
    id: "flash-sale",
    name: "Flash Sale",
    description: "High-urgency limited-time offer with a bold hero discount",
    category: "promotion",
    thumbnail: "04",
    design: {
      counters: { u_row: 4, u_column: 4, u_content_text: 5, u_content_button: 1, u_content_divider: 1 },
      body: {
        rows: [
          row("r-fs-header", [brandHeader("fs-hdr")], "0px"),
          row("r-fs-hero", [col("c-fs-hero", [
            textBlock("t-fs-badge",
              `<p style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:4px;color:#ffffff;background:#000000;display:inline-block;padding:6px 16px;text-align:center;margin:0;">Limited Time Only</p>`,
              "40px 40px 12px"),
            textBlock("t-fs-pct",
              `<p style="font-size:72px;font-weight:900;color:#000000;text-transform:uppercase;letter-spacing:-3px;text-align:center;line-height:100%;margin:0;">30%<br/>OFF</p>`,
              "0px 40px 12px"),
            textBlock("t-fs-sub",
              `<p style="font-size:16px;color:#555555;text-align:center;line-height:170%;">Use code <strong style="background:#f0f0f0;padding:3px 10px;border:1px solid #ddd;font-family:monospace;">SAVE30</strong> at checkout. Offer ends at midnight.</p>`,
              "0px 40px 28px"),
            btn("b-fs-cta", "Shop the Sale →", "{{ctaUrl}}", "#000000", "#ffffff", "0px 40px 0px"),
            textBlock("t-fs-note",
              `<p style="font-size:11px;color:#999999;text-align:center;">*Discount applies to selected items only. While stocks last.</p>`,
              "12px 40px 40px"),
          ])], "#ffffff"),
          row("r-fs-div", [col("c-fs-div", [divider("d-fs", "#e5e5e5", "0px 40px")])], "0px"),
          row("r-fs-footer", [col("c-fs-footer", [footer("t-fs-footer")], "#f4f4f5")], "0px"),
        ],
        values: bodyValues("#f4f4f5", "30% off — but only until midnight."),
      },
      schemaVersion: 16,
    },
  },

  // ── 5. Product Launch ───────────────────────────────────────────────────────
  {
    id: "product-launch",
    name: "Product Launch",
    description: "Introduce a new product with a hero image and key details",
    category: "newsletter",
    thumbnail: "05",
    design: {
      counters: { u_row: 5, u_column: 5, u_content_text: 5, u_content_button: 1, u_content_image: 1, u_content_divider: 1 },
      body: {
        rows: [
          row("r-pl-header", [brandHeader("pl-hdr", "New Arrival")], "0px"),
          row("r-pl-img", [{
            id: "c-pl-img",
            contents: [{
              id: "img-pl",
              type: "image",
              values: {
                containerPadding: "0px",
                src: { url: "https://placehold.co/600x300/1a1a1a/ffffff?text=PRODUCT+IMAGE", width: 600, height: 300 },
                textAlign: "center",
                altText: "New Product",
                action: { name: "web", values: { href: "{{ctaUrl}}", target: "_blank" } },
                _meta: { htmlID: "img-pl", htmlClassNames: "u_content_image" },
                ...FLAGS,
              },
            }],
            values: { backgroundColor: "#1a1a1a", padding: "0px", _meta: { htmlID: "c-pl-img", htmlClassNames: "u_column" } },
          }], "0px"),
          row("r-pl-body", [col("c-pl-body", [
            textBlock("t-pl-eyebrow",
              `<p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:4px;color:#999999;margin:0;">Introducing</p>`,
              "36px 40px 8px"),
            textBlock("t-pl-title",
              `<p style="font-size:30px;font-weight:900;color:#000000;text-transform:uppercase;letter-spacing:-0.5px;line-height:110%;margin:0;">The New Collection</p>`,
              "0px 40px 16px"),
            textBlock("t-pl-desc",
              `<p style="font-size:15px;color:#444444;line-height:175%;">Crafted with precision and designed for every occasion. Discover why this is our most requested product to date.</p>
               <ul style="font-size:15px;color:#444444;line-height:200%;padding-left:20px;margin:12px 0 0;">
                 <li>Premium quality materials</li>
                 <li>Available in multiple colours</li>
                 <li>Ships within 3–5 business days</li>
               </ul>`,
              "0px 40px 24px"),
            btn("b-pl-cta", "Shop Now →", "{{ctaUrl}}", "#000000", "#ffffff", "0px 40px 40px"),
          ])], "0px"),
          row("r-pl-div", [col("c-pl-div", [divider("d-pl", "#e5e5e5", "0px 40px")])], "0px"),
          row("r-pl-footer", [col("c-pl-footer", [footer("t-pl-footer")], "#f4f4f5")], "0px"),
        ],
        values: bodyValues("#f4f4f5", "Something new just dropped."),
      },
      schemaVersion: 16,
    },
  },

  // ── 6. Re-engagement ────────────────────────────────────────────────────────
  {
    id: "reengagement",
    name: "Re-engagement",
    description: "Win back subscribers who haven't engaged recently",
    category: "reengagement",
    thumbnail: "06",
    design: {
      counters: { u_row: 4, u_column: 4, u_content_text: 4, u_content_button: 1, u_content_divider: 1 },
      body: {
        rows: [
          row("r-re-header", [brandHeader("re-hdr")], "0px"),
          row("r-re-hero", [col("c-re-hero", [
            textBlock("t-re-big",
              `<p style="font-size:42px;font-weight:900;color:#000000;text-transform:uppercase;letter-spacing:-1.5px;text-align:center;line-height:110%;margin:0;">We Miss You,<br/>{{name}}.</p>`,
              "48px 40px 16px"),
            textBlock("t-re-body",
              `<p style="font-size:16px;color:#444444;text-align:center;line-height:175%;">It's been a while. A lot has changed since your last visit — new products, better prices, and experiences we think you'll love. Come see what you've been missing.</p>`,
              "0px 40px 28px"),
            btn("b-re-cta", "Come Back →", "{{ctaUrl}}", "#000000", "#ffffff", "0px 40px 0px"),
            textBlock("t-re-unsub",
              `<p style="font-size:12px;color:#999999;text-align:center;margin:0;">Not interested anymore? No hard feelings. <a href="{{unsubscribeUrl}}" style="color:#999999;">Unsubscribe here</a>.</p>`,
              "16px 40px 40px"),
          ])], "#ffffff"),
          row("r-re-div", [col("c-re-div", [divider("d-re", "#e5e5e5", "0px 40px")])], "0px"),
          row("r-re-footer", [col("c-re-footer", [footer("t-re-footer")], "#f4f4f5")], "0px"),
        ],
        values: bodyValues("#f4f4f5", "We haven't heard from you in a while…"),
      },
      schemaVersion: 16,
    },
  },

  // ── 7. Event Invitation ─────────────────────────────────────────────────────
  {
    id: "event-invite",
    name: "Event Invitation",
    description: "Formal invitation with event details and RSVP button",
    category: "event",
    thumbnail: "07",
    design: {
      counters: { u_row: 5, u_column: 5, u_content_text: 6, u_content_button: 1, u_content_divider: 2 },
      body: {
        rows: [
          row("r-ev-header", [brandHeader("ev-hdr", "You're Invited")], "0px"),
          row("r-ev-hero", [col("c-ev-hero", [
            textBlock("t-ev-label",
              `<p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:4px;color:#999999;text-align:center;margin:0;">Special Event</p>`,
              "36px 40px 12px"),
            textBlock("t-ev-title",
              `<p style="font-size:32px;font-weight:900;color:#000000;text-transform:uppercase;letter-spacing:-0.5px;text-align:center;line-height:110%;margin:0;">Event Name<br/>Goes Here</p>`,
              "0px 40px 24px"),
            divider("d-ev-1", "#000000", "0px 80px"),
          ])], "#ffffff"),
          row("r-ev-details", [col("c-ev-details", [
            textBlock("t-ev-when",
              `<table width="100%" style="font-size:13px;color:#000000;line-height:200%;">
                 <tr><td width="80" style="font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#999999;font-size:10px;vertical-align:top;padding-top:4px;">Date</td><td><strong>Saturday, 1 June 2025</strong></td></tr>
                 <tr><td style="font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#999999;font-size:10px;vertical-align:top;padding-top:4px;">Time</td><td><strong>10:00 AM – 4:00 PM GMT</strong></td></tr>
                 <tr><td style="font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#999999;font-size:10px;vertical-align:top;padding-top:4px;">Venue</td><td><strong>Your Venue Address</strong></td></tr>
               </table>`,
              "28px 40px 28px"),
            divider("d-ev-2", "#e5e5e5", "0px 40px"),
            textBlock("t-ev-desc",
              `<p style="font-size:15px;color:#444444;line-height:175%;">Join us for a day of exciting activities, exclusive previews, and special offers. Seats are limited — secure yours now.</p>`,
              "20px 40px 24px"),
            btn("b-ev-cta", "RSVP Now →", "{{ctaUrl}}", "#000000", "#ffffff", "0px 40px 40px"),
          ])], "#ffffff"),
          row("r-ev-div", [col("c-ev-div", [divider("d-ev-3", "#e5e5e5", "0px 40px")])], "0px"),
          row("r-ev-footer", [col("c-ev-footer", [footer("t-ev-footer")], "#f4f4f5")], "0px"),
        ],
        values: bodyValues("#f4f4f5", "You're officially invited."),
      },
      schemaVersion: 16,
    },
  },

  // ── 8. Thank You ────────────────────────────────────────────────────────────
  {
    id: "thank-you",
    name: "Thank You",
    description: "Post-purchase or post-action appreciation email",
    category: "notification",
    thumbnail: "08",
    design: {
      counters: { u_row: 4, u_column: 4, u_content_text: 4, u_content_button: 1, u_content_divider: 1 },
      body: {
        rows: [
          row("r-ty-header", [brandHeader("ty-hdr")], "0px"),
          row("r-ty-hero", [col("c-ty-hero", [
            textBlock("t-ty-emoji",
              `<p style="font-size:48px;text-align:center;margin:0;">🙏</p>`,
              "40px 40px 16px"),
            textBlock("t-ty-title",
              `<p style="font-size:32px;font-weight:900;color:#000000;text-transform:uppercase;letter-spacing:-1px;text-align:center;line-height:110%;margin:0;">Thank You,<br/>{{name}}.</p>`,
              "0px 40px 16px"),
            textBlock("t-ty-body",
              `<p style="font-size:16px;color:#444444;text-align:center;line-height:175%;">Your support means everything to us. We're grateful to have you as part of the {{brandName}} community and can't wait to see you again.</p>`,
              "0px 40px 28px"),
            btn("b-ty-cta", "Continue Shopping →", "{{ctaUrl}}", "#000000", "#ffffff", "0px 40px 40px"),
          ])], "#ffffff"),
          row("r-ty-div", [col("c-ty-div", [divider("d-ty", "#e5e5e5", "0px 40px")])], "0px"),
          row("r-ty-footer", [col("c-ty-footer", [footer("t-ty-footer")], "#f4f4f5")], "0px"),
        ],
        values: bodyValues("#f4f4f5", "Thank you for your support."),
      },
      schemaVersion: 16,
    },
  },

  // ── 9. Plain Text ───────────────────────────────────────────────────────────
  {
    id: "plain-text",
    name: "Plain Text",
    description: "Clean, minimal message — no design, just words",
    category: "minimal",
    thumbnail: "09",
    design: {
      counters: { u_row: 2, u_column: 2, u_content_text: 2 },
      body: {
        rows: [
          row("r-pt-body", [col("c-pt-body", [
            textBlock("t-pt-body",
              `<p style="font-size:15px;font-weight:700;color:#000000;">Hi {{name}},</p>
               <p style="font-size:15px;color:#444444;line-height:180%;">&nbsp;</p>
               <p style="font-size:15px;color:#444444;line-height:180%;">Write your message here. This template keeps the focus entirely on your words — no images, no distractions.</p>
               <p style="font-size:15px;color:#444444;line-height:180%;">&nbsp;</p>
               <p style="font-size:15px;color:#444444;line-height:180%;">Best regards,<br/><strong>The {{brandName}} Team</strong></p>`,
              "40px 40px 32px"),
          ])], "#ffffff"),
          row("r-pt-footer", [col("c-pt-footer", [footer("t-pt-footer")], "#f4f4f5")], "0px"),
        ],
        values: bodyValues("#ffffff"),
      },
      schemaVersion: 16,
    },
  },

]
