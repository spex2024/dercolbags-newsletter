export interface PresetTemplate {
  id: string
  name: string
  description: string
  category: "welcome" | "newsletter" | "promotion" | "notification" | "minimal" | "reengagement" | "event" | "ecommerce" | "loyalty" | "feedback" | "announcement"
  thumbnail: string
  design: Record<string, unknown>
}

export const CATEGORY_LABEL: Record<string, string> = {
  welcome:      "Welcome",
  newsletter:   "Newsletter",
  promotion:    "Promotion",
  notification: "Notification",
  minimal:      "Minimal",
  reengagement: "Re-Engage",
  event:        "Event",
  ecommerce:    "E-Commerce",
  loyalty:      "Loyalty",
  feedback:     "Feedback",
  announcement: "Announcement",
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

// ── Logo header helpers ──────────────────────────────────────────────────────

// Logo image block (replace src to use a real logo)
function logoImg(id: string) {
  return {
    id,
    type: "image",
    values: {
      containerPadding: "24px 40px",
      src: {
        url: "https://placehold.co/180x52/000000/ffffff?text=YOUR+LOGO",
        width: 180,
        height: 52,
      },
      textAlign: "center",
      altText: "{{brandName}}",
      action: { name: "web", values: { href: "", target: "_blank" } },
      _meta: { htmlID: id, htmlClassNames: "u_content_image" },
      ...FLAGS,
    },
  }
}

// Style E — centred logo on white, clean and minimal
function brandHeaderLogo(id: string) {
  return {
    id: `${id}-col`,
    contents: [ logoImg(`${id}-img`) ],
    values: {
      backgroundColor: "#ffffff",
      padding: "0px",
      _meta: { htmlID: `${id}-col`, htmlClassNames: "u_column" },
    },
  }
}

// Style F — logo on inverted black background
function brandHeaderLogoDark(id: string, subtitle = "") {
  return {
    id: `${id}-col`,
    contents: [
      {
        id: `${id}-img`,
        type: "image",
        values: {
          containerPadding: subtitle ? "24px 40px 10px" : "24px 40px",
          src: {
            url: "https://placehold.co/180x52/ffffff/000000?text=YOUR+LOGO",
            width: 180,
            height: 52,
          },
          textAlign: "center",
          altText: "{{brandName}}",
          action: { name: "web", values: { href: "", target: "_blank" } },
          _meta: { htmlID: `${id}-img`, htmlClassNames: "u_content_image" },
          ...FLAGS,
        },
      },
      ...(subtitle
        ? [textBlock(
            `${id}-sub`,
            `<p style="font-size:11px;color:rgba(255,255,255,0.55);text-align:center;letter-spacing:4px;text-transform:uppercase;margin:0;">${subtitle}</p>`,
            "0px 40px 20px",
          )]
        : []),
    ],
    values: {
      backgroundColor: "#000000",
      padding: "0px",
      _meta: { htmlID: `${id}-col`, htmlClassNames: "u_column" },
    },
  }
}

// ── Text header helpers ──────────────────────────────────────────────────────

// Style A — inverted black full-width header (most templates)
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

// Style B — slim light header, brand name left-aligned with a black left border
function brandHeaderSlim(id: string, label = "") {
  return {
    id: `${id}-col`,
    contents: [
      textBlock(
        `${id}-text`,
        `<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:4px;color:#999999;margin:0 0 4px;">${label || "Newsletter"}</p>
         <p style="font-size:18px;font-weight:900;color:#000000;text-transform:uppercase;letter-spacing:0.5px;margin:0;border-left:4px solid #000;padding-left:12px;">{{brandName}}</p>`,
        "24px 40px",
      ),
    ],
    values: { backgroundColor: "#ffffff", padding: "0px", _meta: { htmlID: `${id}-col`, htmlClassNames: "u_column" } },
  }
}

// Style C — centered minimal brand line, no background
function brandHeaderMinimal(id: string) {
  return {
    id: `${id}-col`,
    contents: [
      textBlock(
        `${id}-text`,
        `<p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:5px;color:#000000;text-align:center;margin:0;">— {{brandName}} —</p>`,
        "20px 40px 16px",
      ),
    ],
    values: { backgroundColor: "#ffffff", padding: "0px", _meta: { htmlID: `${id}-col`, htmlClassNames: "u_column" } },
  }
}

// Style D — brand name inline at top-right as a small label (no row background)
function brandHeaderInline(id: string) {
  return {
    id: `${id}-col`,
    contents: [
      textBlock(
        `${id}-text`,
        `<p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:4px;color:#999999;text-align:right;margin:0;">{{brandName}}</p>`,
        "16px 40px 8px",
      ),
    ],
    values: { backgroundColor: "#ffffff", padding: "0px", _meta: { htmlID: `${id}-col`, htmlClassNames: "u_column" } },
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
          row("r-w-header", [brandHeaderLogo("w-hdr")], "0px"),
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
          row("r-nl-header", [brandHeaderSlim("nl-hdr", "Monthly Update")], "0px"),
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
          row("r-fs-header", [brandHeaderLogoDark("fs-hdr")], "0px"),
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
          row("r-pl-header", [brandHeaderLogoDark("pl-hdr", "New Arrival")], "0px"),
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
          row("r-re-header", [brandHeaderMinimal("re-hdr")], "0px"),
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
          row("r-ev-header", [brandHeaderLogo("ev-hdr")], "0px"),
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
          row("r-ty-header", [brandHeaderLogo("ty-hdr")], "0px"),
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
          row("r-pt-header", [brandHeaderInline("pt-hdr")], "0px"),
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


  // ── 10. Abandoned Cart ────────────────────────────────────────────────────
  {
    id: "abandoned-cart",
    name: "Abandoned Cart",
    description: "Remind shoppers they left items behind — recover lost sales",
    category: "ecommerce",
    thumbnail: "10",
    design: {
      counters: { u_row: 5, u_column: 5, u_content_text: 5, u_content_button: 2, u_content_divider: 1 },
      body: {
        rows: [
          row("r-ac-header", [brandHeaderLogo("ac-hdr")], "0px"),
          row("r-ac-hero", [col("c-ac-hero", [
            textBlock("t-ac-icon",
              `<p style="font-size:40px;text-align:center;margin:0;">🛒</p>`,
              "40px 40px 12px"),
            textBlock("t-ac-title",
              `<p style="font-size:30px;font-weight:900;color:#000000;text-transform:uppercase;letter-spacing:-0.5px;text-align:center;line-height:115%;margin:0;">You left something<br/>behind, {{name}}.</p>`,
              "0px 40px 16px"),
            textBlock("t-ac-sub",
              `<p style="font-size:16px;color:#555555;text-align:center;line-height:170%;">Your cart is waiting. The items you selected are still available — but they won't be for long. Complete your order before they sell out.</p>`,
              "0px 40px 28px"),
            btn("b-ac-primary", "Complete My Order →", "{{ctaUrl}}", "#000000", "#ffffff", "0px 40px 12px"),
            btn("b-ac-secondary", "View My Cart", "{{ctaUrl}}", "#ffffff", "#000000", "0px 40px 36px"),
          ])], "#ffffff"),
          row("r-ac-div", [col("c-ac-div", [divider("d-ac", "#e5e5e5", "0px 40px")])], "0px"),
          row("r-ac-reassure", [col("c-ac-reassure", [
            textBlock("t-ac-reassure",
              `<table width="100%" style="font-size:12px;color:#777777;line-height:200%;text-align:center;">
                 <tr>
                   <td width="33%" style="padding:0 8px;">🔒 <strong>Secure Checkout</strong></td>
                   <td width="33%" style="padding:0 8px;">🚚 <strong>Fast Delivery</strong></td>
                   <td width="33%" style="padding:0 8px;">↩️ <strong>Easy Returns</strong></td>
                 </tr>
               </table>`,
              "20px 40px 28px"),
          ])], "#f9f9f9"),
          row("r-ac-footer", [col("c-ac-footer", [footer("t-ac-footer")], "#f4f4f5")], "0px"),
        ],
        values: bodyValues("#f4f4f5", "Your cart is waiting — complete your order today."),
      },
      schemaVersion: 16,
    },
  },

  // ── 11. Loyalty Reward ────────────────────────────────────────────────────
  {
    id: "loyalty-reward",
    name: "Loyalty Reward",
    description: "Celebrate a milestone and reward your most loyal customers",
    category: "loyalty",
    thumbnail: "11",
    design: {
      counters: { u_row: 5, u_column: 5, u_content_text: 5, u_content_button: 1, u_content_divider: 2 },
      body: {
        rows: [
          row("r-lr-header", [brandHeaderLogoDark("lr-hdr", "Loyalty Programme")], "0px"),
          row("r-lr-hero", [col("c-lr-hero", [
            textBlock("t-lr-congrats",
              `<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:4px;color:#B8860B;text-align:center;margin:0;">🏆 Congratulations</p>`,
              "40px 40px 12px"),
            textBlock("t-lr-title",
              `<p style="font-size:34px;font-weight:900;color:#000000;text-transform:uppercase;letter-spacing:-1px;text-align:center;line-height:110%;margin:0;">You've Earned<br/>a Reward!</p>`,
              "0px 40px 16px"),
            textBlock("t-lr-sub",
              `<p style="font-size:16px;color:#555555;text-align:center;line-height:170%;">Hi {{name}}, thank you for your continued loyalty. As one of our valued customers, you've unlocked an exclusive reward just for you.</p>`,
              "0px 40px 24px"),
            divider("d-lr-1", "#e5e5e5", "0px 40px"),
          ])], "#ffffff"),
          row("r-lr-reward", [col("c-lr-reward", [
            textBlock("t-lr-code",
              `<p style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#999999;text-align:center;margin:0 0 12px;">Your Exclusive Code</p>
               <p style="font-size:32px;font-weight:900;color:#000000;font-family:monospace;text-align:center;letter-spacing:6px;background:#f4f4f4;border:2px dashed #cccccc;padding:20px;margin:0;">LOYAL20</p>
               <p style="font-size:13px;color:#888888;text-align:center;margin:16px 0 0;">20% off your next order · Expires in 30 days</p>`,
              "28px 40px 28px"),
            divider("d-lr-2", "#e5e5e5", "0px 40px"),
            btn("b-lr-cta", "Redeem Reward →", "{{ctaUrl}}", "#000000", "#ffffff", "20px 40px 40px"),
          ])], "#ffffff"),
          row("r-lr-div", [col("c-lr-div", [divider("d-lr-3", "#e5e5e5", "0px 40px")])], "0px"),
          row("r-lr-footer", [col("c-lr-footer", [footer("t-lr-footer")], "#f4f4f5")], "0px"),
        ],
        values: bodyValues("#f4f4f5", "A reward is waiting for you — you've earned it."),
      },
      schemaVersion: 16,
    },
  },

  // ── 12. Feedback / Survey ─────────────────────────────────────────────────
  {
    id: "feedback-survey",
    name: "Feedback & Survey",
    description: "Collect customer opinions with a simple, friendly survey invite",
    category: "feedback",
    thumbnail: "12",
    design: {
      counters: { u_row: 4, u_column: 4, u_content_text: 4, u_content_button: 1, u_content_divider: 1 },
      body: {
        rows: [
          row("r-fb-header", [brandHeaderLogo("fb-hdr")], "0px"),
          row("r-fb-hero", [col("c-fb-hero", [
            textBlock("t-fb-icon",
              `<p style="font-size:40px;text-align:center;margin:0;">💬</p>`,
              "40px 40px 12px"),
            textBlock("t-fb-title",
              `<p style="font-size:30px;font-weight:900;color:#000000;text-transform:uppercase;letter-spacing:-0.5px;text-align:center;line-height:115%;margin:0;">How Are We Doing,<br/>{{name}}?</p>`,
              "0px 40px 16px"),
            textBlock("t-fb-body",
              `<p style="font-size:16px;color:#555555;text-align:center;line-height:175%;">Your feedback shapes everything we do. It only takes 2 minutes and helps us serve you better. We read every single response.</p>`,
              "0px 40px 28px"),
            btn("b-fb-cta", "Share My Feedback →", "{{ctaUrl}}", "#000000", "#ffffff", "0px 40px 16px"),
            textBlock("t-fb-note",
              `<p style="font-size:12px;color:#999999;text-align:center;margin:0;">Takes less than 2 minutes · Completely anonymous</p>`,
              "0px 40px 40px"),
          ])], "#ffffff"),
          row("r-fb-div", [col("c-fb-div", [divider("d-fb", "#e5e5e5", "0px 40px")])], "0px"),
          row("r-fb-footer", [col("c-fb-footer", [footer("t-fb-footer")], "#f4f4f5")], "0px"),
        ],
        values: bodyValues("#f4f4f5", "We'd love to hear what you think."),
      },
      schemaVersion: 16,
    },
  },

  // ── 13. Referral Programme ────────────────────────────────────────────────
  {
    id: "referral",
    name: "Referral Programme",
    description: "Invite customers to refer friends and earn rewards",
    category: "promotion",
    thumbnail: "13",
    design: {
      counters: { u_row: 5, u_column: 5, u_content_text: 5, u_content_button: 1, u_content_divider: 2 },
      body: {
        rows: [
          row("r-ref-header", [brandHeaderMinimal("ref-hdr")], "0px"),
          row("r-ref-hero", [col("c-ref-hero", [
            textBlock("t-ref-title",
              `<p style="font-size:34px;font-weight:900;color:#000000;text-transform:uppercase;letter-spacing:-1px;text-align:center;line-height:110%;margin:0;">Refer a Friend.<br/>Both of You Win.</p>`,
              "44px 40px 16px"),
            textBlock("t-ref-sub",
              `<p style="font-size:16px;color:#555555;text-align:center;line-height:170%;">Share {{brandName}} with someone you love and get rewarded when they make their first purchase. It's our way of saying thank you.</p>`,
              "0px 40px 28px"),
            divider("d-ref-1", "#e5e5e5", "0px 40px"),
          ])], "#ffffff"),
          row("r-ref-how", [col("c-ref-how", [
            textBlock("t-ref-steps",
              `<table width="100%" style="font-size:14px;color:#444444;line-height:200%;">
                 <tr>
                   <td width="36" style="font-size:20px;font-weight:900;color:#000000;vertical-align:top;">01</td>
                   <td style="vertical-align:top;padding-left:12px;"><strong>Share your unique link</strong><br/><span style="color:#888888;font-size:13px;">Send it by WhatsApp, email, or social media</span></td>
                 </tr>
                 <tr><td colspan="2" style="height:12px;"></td></tr>
                 <tr>
                   <td style="font-size:20px;font-weight:900;color:#000000;vertical-align:top;">02</td>
                   <td style="vertical-align:top;padding-left:12px;"><strong>Your friend signs up and orders</strong><br/><span style="color:#888888;font-size:13px;">They get 10% off their first purchase</span></td>
                 </tr>
                 <tr><td colspan="2" style="height:12px;"></td></tr>
                 <tr>
                   <td style="font-size:20px;font-weight:900;color:#000000;vertical-align:top;">03</td>
                   <td style="vertical-align:top;padding-left:12px;"><strong>You earn a reward</strong><br/><span style="color:#888888;font-size:13px;">Get credit applied to your next order</span></td>
                 </tr>
               </table>`,
              "20px 40px 28px"),
            divider("d-ref-2", "#e5e5e5", "0px 40px"),
            btn("b-ref-cta", "Get My Referral Link →", "{{ctaUrl}}", "#000000", "#ffffff", "20px 40px 40px"),
          ])], "#ffffff"),
          row("r-ref-div", [col("c-ref-div", [divider("d-ref-3", "#e5e5e5", "0px 40px")])], "0px"),
          row("r-ref-footer", [col("c-ref-footer", [footer("t-ref-footer")], "#f4f4f5")], "0px"),
        ],
        values: bodyValues("#f4f4f5", "Share the love — both of you benefit."),
      },
      schemaVersion: 16,
    },
  },

  // ── 14. Seasonal Campaign ─────────────────────────────────────────────────
  {
    id: "seasonal-campaign",
    name: "Seasonal Campaign",
    description: "Holiday or seasonal themed email with a festive feel",
    category: "promotion",
    thumbnail: "14",
    design: {
      counters: { u_row: 4, u_column: 4, u_content_text: 4, u_content_button: 1, u_content_divider: 1 },
      body: {
        rows: [
          row("r-sc-header", [{
            id: "c-sc-header",
            contents: [
              textBlock("t-sc-season",
                `<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:4px;color:rgba(255,255,255,0.7);text-align:center;margin:0 0 8px;">Holiday Collection</p>
                 <p style="font-size:26px;font-weight:900;color:#ffffff;text-transform:uppercase;letter-spacing:1px;text-align:center;margin:0;">{{brandName}}</p>`,
                "32px 40px 32px"),
            ],
            values: { backgroundColor: "#1a3a2a", padding: "0px", _meta: { htmlID: "c-sc-header", htmlClassNames: "u_column" } },
          }], "0px"),
          row("r-sc-hero", [col("c-sc-hero", [
            textBlock("t-sc-title",
              `<p style="font-size:36px;font-weight:900;color:#000000;text-transform:uppercase;letter-spacing:-1px;text-align:center;line-height:110%;margin:0;">The Season's<br/>Best Picks</p>`,
              "44px 40px 16px"),
            textBlock("t-sc-body",
              `<p style="font-size:16px;color:#555555;text-align:center;line-height:175%;">Whether you're shopping for yourself or finding the perfect gift, our seasonal collection has something special for everyone. Explore curated picks at exclusive prices.</p>`,
              "0px 40px 28px"),
            btn("b-sc-cta", "Shop the Collection →", "{{ctaUrl}}", "#1a3a2a", "#ffffff", "0px 40px 0px"),
            textBlock("t-sc-urgency",
              `<p style="font-size:12px;color:#999999;text-align:center;margin:0;">Free shipping on all orders · Limited stock available</p>`,
              "12px 40px 40px"),
          ])], "#ffffff"),
          row("r-sc-div", [col("c-sc-div", [divider("d-sc", "#e5e5e5", "0px 40px")])], "0px"),
          row("r-sc-footer", [col("c-sc-footer", [footer("t-sc-footer")], "#f4f4f5")], "0px"),
        ],
        values: bodyValues("#f4f4f5", "Our seasonal picks are here — shop now."),
      },
      schemaVersion: 16,
    },
  },

  // ── 15. Two-Column Feature ────────────────────────────────────────────────
  {
    id: "two-column",
    name: "Two-Column Feature",
    description: "Side-by-side layout showcasing two products or articles",
    category: "newsletter",
    thumbnail: "15",
    design: {
      counters: { u_row: 4, u_column: 6, u_content_text: 6, u_content_button: 2, u_content_divider: 1 },
      body: {
        rows: [
          row("r-tc-header", [brandHeaderInline("tc-hdr")], "0px"),
          row("r-tc-intro", [col("c-tc-intro", [
            textBlock("t-tc-intro",
              `<p style="font-size:24px;font-weight:900;color:#000000;text-transform:uppercase;letter-spacing:-0.5px;text-align:center;line-height:120%;margin:0;">Two Things<br/>Worth Your Attention</p>`,
              "36px 40px 24px"),
          ])], "#ffffff"),
          {
            id: "r-tc-cols",
            cells: [1, 1],
            columns: [
              {
                id: "c-tc-left",
                contents: [
                  textBlock("t-tc-left-tag",
                    `<p style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#999999;margin:0;">Feature 01</p>`,
                    "28px 24px 8px"),
                  textBlock("t-tc-left-title",
                    `<p style="font-size:18px;font-weight:900;color:#000000;text-transform:uppercase;line-height:120%;margin:0;">First<br/>Highlight</p>`,
                    "0px 24px 10px"),
                  textBlock("t-tc-left-body",
                    `<p style="font-size:13px;color:#555555;line-height:170%;">Describe your first feature, product, or story here. Keep it punchy and link to the full article.</p>`,
                    "0px 24px 20px"),
                  btn("b-tc-left", "Learn More", "{{ctaUrl}}", "#000000", "#ffffff", "0px 24px 32px"),
                ],
                values: { backgroundColor: "#ffffff", padding: "0px", borderRight: "2px solid #e5e5e5", _meta: { htmlID: "c-tc-left", htmlClassNames: "u_column" } },
              },
              {
                id: "c-tc-right",
                contents: [
                  textBlock("t-tc-right-tag",
                    `<p style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#999999;margin:0;">Feature 02</p>`,
                    "28px 24px 8px"),
                  textBlock("t-tc-right-title",
                    `<p style="font-size:18px;font-weight:900;color:#000000;text-transform:uppercase;line-height:120%;margin:0;">Second<br/>Highlight</p>`,
                    "0px 24px 10px"),
                  textBlock("t-tc-right-body",
                    `<p style="font-size:13px;color:#555555;line-height:170%;">Describe your second feature, product, or story here. Keep it punchy and link to the full article.</p>`,
                    "0px 24px 20px"),
                  btn("b-tc-right", "Learn More", "{{ctaUrl}}", "#000000", "#ffffff", "0px 24px 32px"),
                ],
                values: { backgroundColor: "#ffffff", padding: "0px", _meta: { htmlID: "c-tc-right", htmlClassNames: "u_column" } },
              },
            ],
            values: {
              padding: "0px 10px",
              _meta: { htmlID: "r-tc-cols", htmlClassNames: "u_row" },
              ...FLAGS,
            },
          },
          row("r-tc-footer", [col("c-tc-footer", [
            divider("d-tc", "#e5e5e5", "0px 30px"),
            footer("t-tc-footer"),
          ], "#f4f4f5")], "0px"),
        ],
        values: bodyValues("#f4f4f5", "Two things you need to see this week."),
      },
      schemaVersion: 16,
    },
  },

  // ── 16. Back in Stock ─────────────────────────────────────────────────────
  {
    id: "back-in-stock",
    name: "Back in Stock",
    description: "Alert subscribers that a previously sold-out item is available again",
    category: "ecommerce",
    thumbnail: "16",
    design: {
      counters: { u_row: 4, u_column: 4, u_content_text: 4, u_content_button: 1, u_content_divider: 1 },
      body: {
        rows: [
          row("r-bs-header", [brandHeaderLogo("bs-hdr")], "0px"),
          row("r-bs-hero", [col("c-bs-hero", [
            textBlock("t-bs-badge",
              `<p style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:4px;color:#ffffff;background:#16a34a;display:inline-block;padding:6px 16px;text-align:center;margin:0;">Back in Stock</p>`,
              "40px 40px 16px"),
            textBlock("t-bs-title",
              `<p style="font-size:32px;font-weight:900;color:#000000;text-transform:uppercase;letter-spacing:-0.5px;text-align:center;line-height:110%;margin:0;">The Wait<br/>Is Over.</p>`,
              "0px 40px 16px"),
            textBlock("t-bs-body",
              `<p style="font-size:16px;color:#555555;text-align:center;line-height:170%;">Hi {{name}}, great news — the item you've been waiting for is back. These tend to sell out fast, so don't wait too long.</p>`,
              "0px 40px 28px"),
            btn("b-bs-cta", "Shop Before It's Gone →", "{{ctaUrl}}", "#16a34a", "#ffffff", "0px 40px 16px"),
            textBlock("t-bs-warning",
              `<p style="font-size:12px;color:#999999;text-align:center;margin:0;">Stock is limited. Order now to avoid disappointment.</p>`,
              "0px 40px 36px"),
          ])], "#ffffff"),
          row("r-bs-div", [col("c-bs-div", [divider("d-bs", "#e5e5e5", "0px 40px")])], "0px"),
          row("r-bs-footer", [col("c-bs-footer", [footer("t-bs-footer")], "#f4f4f5")], "0px"),
        ],
        values: bodyValues("#f4f4f5", "It's back — grab yours before it sells out again."),
      },
      schemaVersion: 16,
    },
  },

  // ── 17. Weekly Digest ─────────────────────────────────────────────────────
  {
    id: "weekly-digest",
    name: "Weekly Digest",
    description: "A structured digest with three numbered items for weekly sends",
    category: "newsletter",
    thumbnail: "17",
    design: {
      counters: { u_row: 7, u_column: 7, u_content_text: 8, u_content_button: 1, u_content_divider: 4 },
      body: {
        rows: [
          row("r-wd-header", [brandHeaderSlim("wd-hdr", "Weekly Digest")], "0px"),
          row("r-wd-intro", [col("c-wd-intro", [
            textBlock("t-wd-date",
              `<p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:4px;color:#999999;text-align:center;margin:0;">This Week's Highlights</p>`,
              "28px 40px 8px"),
            textBlock("t-wd-title",
              `<p style="font-size:26px;font-weight:900;color:#000000;text-transform:uppercase;letter-spacing:-0.5px;text-align:center;margin:0;">3 Things to Know</p>`,
              "0px 40px 20px"),
            divider("d-wd-0", "#000000", "0px 40px"),
          ])], "#ffffff"),
          row("r-wd-1", [col("c-wd-1", [
            textBlock("t-wd-1",
              `<p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:4px;color:#999999;margin:0 0 6px;">01 ·</p>
               <p style="font-size:18px;font-weight:900;color:#000000;text-transform:uppercase;margin:0 0 10px;">Story One Headline Here</p>
               <p style="font-size:14px;color:#555555;line-height:175%;margin:0;">Write a short summary of your first story or update. Two to three sentences is ideal — give them enough to be curious, then link them to the full piece.</p>`,
              "24px 40px 24px"),
            divider("d-wd-1", "#e5e5e5", "0px 40px"),
          ])], "#ffffff"),
          row("r-wd-2", [col("c-wd-2", [
            textBlock("t-wd-2",
              `<p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:4px;color:#999999;margin:0 0 6px;">02 ·</p>
               <p style="font-size:18px;font-weight:900;color:#000000;text-transform:uppercase;margin:0 0 10px;">Story Two Headline Here</p>
               <p style="font-size:14px;color:#555555;line-height:175%;margin:0;">Second item in the digest. Keep the same format for consistency — short, scannable, with a clear point and a reason to care.</p>`,
              "24px 40px 24px"),
            divider("d-wd-2", "#e5e5e5", "0px 40px"),
          ])], "#ffffff"),
          row("r-wd-3", [col("c-wd-3", [
            textBlock("t-wd-3",
              `<p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:4px;color:#999999;margin:0 0 6px;">03 ·</p>
               <p style="font-size:18px;font-weight:900;color:#000000;text-transform:uppercase;margin:0 0 10px;">Story Three Headline Here</p>
               <p style="font-size:14px;color:#555555;line-height:175%;margin:0;">Third item. This is often a good spot for a tip, a product highlight, or an upcoming event. End on something actionable.</p>`,
              "24px 40px 24px"),
            divider("d-wd-3", "#e5e5e5", "0px 40px"),
          ])], "#ffffff"),
          row("r-wd-cta", [col("c-wd-cta", [
            btn("b-wd-cta", "Read Everything →", "{{ctaUrl}}", "#000000", "#ffffff", "20px 40px 40px"),
          ])], "#ffffff"),
          row("r-wd-footer", [col("c-wd-footer", [footer("t-wd-footer")], "#f4f4f5")], "0px"),
        ],
        values: bodyValues("#f4f4f5", "Your 3 highlights for this week."),
      },
      schemaVersion: 16,
    },
  },


  // ── 18. Important Announcement ────────────────────────────────────────────
  {
    id: "announcement",
    name: "Important Announcement",
    description: "Bold, urgent announcement — policy changes, service updates, breaking news",
    category: "announcement",
    thumbnail: "18",
    design: {
      counters: { u_row: 4, u_column: 4, u_content_text: 4, u_content_button: 1, u_content_divider: 1 },
      body: {
        rows: [
          row("r-an-header", [{
            id: "c-an-header",
            contents: [
              textBlock("t-an-brand",
                `<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:4px;color:rgba(255,255,255,0.5);text-align:center;margin:0 0 6px;">{{brandName}}</p>
                 <p style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:3px;color:#ffffff;background:rgba(255,255,255,0.15);display:inline-block;padding:4px 14px;text-align:center;margin:0;">Important Announcement</p>`,
                "28px 40px 28px"),
            ],
            values: { backgroundColor: "#b91c1c", padding: "0px", _meta: { htmlID: "c-an-header", htmlClassNames: "u_column" } },
          }], "0px"),
          row("r-an-body", [col("c-an-body", [
            textBlock("t-an-title",
              `<p style="font-size:30px;font-weight:900;color:#000000;text-transform:uppercase;letter-spacing:-0.5px;text-align:center;line-height:115%;margin:0;">Announcement<br/>Headline Here</p>`,
              "40px 40px 16px"),
            textBlock("t-an-body",
              `<p style="font-size:16px;color:#444444;text-align:center;line-height:175%;">We have an important update to share with you. Please read this message carefully as it may affect your account, orders, or how you use our service.</p>
               <p style="font-size:16px;color:#444444;text-align:center;line-height:175%;">&nbsp;</p>
               <p style="font-size:16px;color:#444444;text-align:center;line-height:175%;">Add your detailed message here. Be clear, direct, and tell your subscribers exactly what they need to know and what action, if any, they should take.</p>`,
              "0px 40px 28px"),
            btn("b-an-cta", "Learn More →", "{{ctaUrl}}", "#b91c1c", "#ffffff", "0px 40px 40px"),
          ])], "#ffffff"),
          row("r-an-div", [col("c-an-div", [divider("d-an", "#e5e5e5", "0px 40px")])], "0px"),
          row("r-an-footer", [col("c-an-footer", [footer("t-an-footer")], "#f4f4f5")], "0px"),
        ],
        values: bodyValues("#f4f4f5", "An important update from {{brandName}}."),
      },
      schemaVersion: 16,
    },
  },

  // ── 19. Birthday / Anniversary ────────────────────────────────────────────
  {
    id: "birthday-anniversary",
    name: "Birthday / Anniversary",
    description: "Personalised celebration email with a special gift or discount",
    category: "loyalty",
    thumbnail: "19",
    design: {
      counters: { u_row: 5, u_column: 5, u_content_text: 5, u_content_button: 1, u_content_divider: 2 },
      body: {
        rows: [
          row("r-ba-header", [brandHeaderLogoDark("ba-hdr")], "0px"),
          row("r-ba-hero", [col("c-ba-hero", [
            textBlock("t-ba-emoji",
              `<p style="font-size:52px;text-align:center;margin:0;">🎂</p>`,
              "36px 40px 12px"),
            textBlock("t-ba-title",
              `<p style="font-size:34px;font-weight:900;color:#000000;text-transform:uppercase;letter-spacing:-1px;text-align:center;line-height:110%;margin:0;">Happy Birthday,<br/>{{name}}!</p>`,
              "0px 40px 16px"),
            textBlock("t-ba-body",
              `<p style="font-size:16px;color:#555555;text-align:center;line-height:170%;">On your special day, we want to celebrate you. As our way of saying thank you for being part of the {{brandName}} family, here's a little gift from us to you.</p>`,
              "0px 40px 24px"),
            divider("d-ba-1", "#e5e5e5", "0px 40px"),
          ])], "#ffffff"),
          row("r-ba-gift", [col("c-ba-gift", [
            textBlock("t-ba-code",
              `<p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#999999;text-align:center;margin:0 0 12px;">Your Birthday Gift</p>
               <p style="font-size:36px;font-weight:900;color:#000000;font-family:monospace;text-align:center;letter-spacing:6px;background:linear-gradient(135deg,#fff7ed,#fef3c7);border:2px dashed #f59e0b;padding:20px;margin:0;">BDAY25</p>
               <p style="font-size:13px;color:#888888;text-align:center;margin:12px 0 0;">25% off your next order · Valid for 7 days</p>`,
              "24px 40px 24px"),
            divider("d-ba-2", "#e5e5e5", "0px 40px"),
            btn("b-ba-cta", "Claim My Gift →", "{{ctaUrl}}", "#000000", "#ffffff", "20px 40px 40px"),
          ])], "#ffffff"),
          row("r-ba-div", [col("c-ba-div", [divider("d-ba-3", "#e5e5e5", "0px 40px")])], "0px"),
          row("r-ba-footer", [col("c-ba-footer", [footer("t-ba-footer")], "#f4f4f5")], "0px"),
        ],
        values: bodyValues("#f4f4f5", "We're celebrating you today, {{name}} 🎂"),
      },
      schemaVersion: 16,
    },
  },

  // ── 20. Content Roundup / Curated Links ────────────────────────────────────
  {
    id: "content-roundup",
    name: "Content Roundup",
    description: "Curated list of articles, links, or resources with short descriptions",
    category: "newsletter",
    thumbnail: "20",
    design: {
      counters: { u_row: 7, u_column: 7, u_content_text: 8, u_content_button: 1, u_content_divider: 5 },
      body: {
        rows: [
          row("r-cr-header", [brandHeaderMinimal("cr-hdr")], "0px"),
          row("r-cr-intro", [col("c-cr-intro", [
            textBlock("t-cr-intro",
              `<p style="font-size:22px;font-weight:900;color:#000000;text-transform:uppercase;letter-spacing:-0.5px;text-align:center;margin:0;">This Week's Reading List</p>
               <p style="font-size:14px;color:#777777;text-align:center;margin:8px 0 0;">Handpicked content worth your time</p>`,
              "32px 40px 20px"),
            divider("d-cr-0", "#000000", "0px 40px"),
          ])], "#ffffff"),
          row("r-cr-item1", [col("c-cr-item1", [
            textBlock("t-cr-item1",
              `<table width="100%">
                 <tr>
                   <td style="padding:20px 40px 16px;">
                     <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#999999;margin:0 0 8px;">Article · 5 min read</p>
                     <p style="font-size:17px;font-weight:900;color:#000000;margin:0 0 8px;"><a href="{{ctaUrl}}" style="color:#000000;text-decoration:none;">Title of Your First Article or Resource</a></p>
                     <p style="font-size:14px;color:#555555;line-height:165%;margin:0;">A short one-sentence teaser that gives enough context to make someone want to click through and read more.</p>
                   </td>
                 </tr>
               </table>`,
              "0px 0px"),
            divider("d-cr-1", "#e5e5e5", "0px 40px"),
          ])], "#ffffff"),
          row("r-cr-item2", [col("c-cr-item2", [
            textBlock("t-cr-item2",
              `<table width="100%">
                 <tr>
                   <td style="padding:20px 40px 16px;">
                     <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#999999;margin:0 0 8px;">Guide · 8 min read</p>
                     <p style="font-size:17px;font-weight:900;color:#000000;margin:0 0 8px;"><a href="{{ctaUrl}}" style="color:#000000;text-decoration:none;">Title of Your Second Article or Resource</a></p>
                     <p style="font-size:14px;color:#555555;line-height:165%;margin:0;">Another sentence of context. Keep each entry brief — this is a roundup, not a full article. Let the link do the heavy lifting.</p>
                   </td>
                 </tr>
               </table>`,
              "0px 0px"),
            divider("d-cr-2", "#e5e5e5", "0px 40px"),
          ])], "#ffffff"),
          row("r-cr-item3", [col("c-cr-item3", [
            textBlock("t-cr-item3",
              `<table width="100%">
                 <tr>
                   <td style="padding:20px 40px 16px;">
                     <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#999999;margin:0 0 8px;">News · 3 min read</p>
                     <p style="font-size:17px;font-weight:900;color:#000000;margin:0 0 8px;"><a href="{{ctaUrl}}" style="color:#000000;text-decoration:none;">Title of Your Third Article or Resource</a></p>
                     <p style="font-size:14px;color:#555555;line-height:165%;margin:0;">Third item in the roundup. You can add or remove these rows as needed — one per topic, link, or update.</p>
                   </td>
                 </tr>
               </table>`,
              "0px 0px"),
            divider("d-cr-3", "#e5e5e5", "0px 40px"),
          ])], "#ffffff"),
          row("r-cr-cta", [col("c-cr-cta", [
            btn("b-cr-cta", "See All Content →", "{{ctaUrl}}", "#000000", "#ffffff", "16px 40px 36px"),
          ])], "#ffffff"),
          row("r-cr-footer", [col("c-cr-footer", [footer("t-cr-footer")], "#f4f4f5")], "0px"),
        ],
        values: bodyValues("#f4f4f5", "Your curated reading list for this week."),
      },
      schemaVersion: 16,
    },
  },

]
