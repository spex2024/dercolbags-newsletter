import { AppError } from "../utils/errors";

export interface HtmlValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const ALLOWED_TAGS = new Set([
  "html", "head", "body", "meta", "title", "link",
  "table", "thead", "tbody", "tr", "td", "th", "thead", "tfoot",
  "p", "div", "span", "br", "hr",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "a", "img", "strong", "b", "em", "i", "u", "s", "strike",
  "ul", "ol", "li",
  "center",
]);

const ALLOWED_ATTRS = new Set([
  "href", "src", "alt", "title", "width", "height",
  "style", "class", "id", "align", "valign",
  "border", "cellpadding", "cellspacing", "bgcolor",
  "target", "rel",
]);

const INLINE_STYLE_PROPS = new Set([
  "color", "background-color", "font-size", "font-family",
  "font-weight", "text-align", "text-decoration",
  "margin", "margin-top", "margin-bottom", "margin-left", "margin-right",
  "padding", "padding-top", "padding-bottom", "padding-left", "padding-right",
  "border", "border-radius", "display", "width", "height",
  "line-height", "vertical-align",
]);

export function validateHtmlContent(html: string, requireUnsubscribe: boolean): HtmlValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!html || html.trim().length === 0) {
    errors.push("HTML content is required");
    return { valid: false, errors, warnings };
  }

  if (html.includes("<script")) {
    errors.push("JavaScript <script> tags are not allowed");
  }

  if (html.includes("javascript:")) {
    errors.push("JavaScript URLs are not allowed");
  }

  if (/<img[^>]*>/i.test(html)) {
    const imgRegex = /<img[^>]+src\s*=\s*["']([^"']+)["']/gi;
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      const src = match[1];
      if (!src.startsWith("https://")) {
        errors.push(`Image src must use absolute https:// URL, found: ${src}`);
      }
      if (src.startsWith("//") || src.startsWith("/") || src.startsWith("./") || src.startsWith("../")) {
        errors.push(`Image src must be an absolute URL, found: ${src}`);
      }
    }
  }

  if (requireUnsubscribe) {
    if (!html.includes("{{unsubscribeUrl}}") && !html.includes("unsubscribeUrl")) {
      errors.push("Campaign templates must include {{unsubscribeUrl}} variable");
    }
  }

  if (/<link[^>]*rel=["']stylesheet["'][^>]*>/i.test(html)) {
    warnings.push("External stylesheets may not work in all email clients");
  }

  if (/<style/i.test(html)) {
    const styleTagContent = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    if (styleTagContent && styleTagContent[1].includes("@media")) {
      warnings.push("@media queries may not work in all email clients");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function sanitizeHtml(html: string): string {
  let sanitized = html;

  sanitized = sanitized.replace(/<script[\s\S]*?<\/script>/gi, "");
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");
  sanitized = sanitized.replace(/javascript:/gi, "");

  sanitized = sanitized.replace(/<(iframe|object|embed|form|input|button)[^>]*>/gi, (_, tag) => {
    const tagName = tag.split(" ")[0].toLowerCase();
    if (tagName === "button") {
      return `<span data-removed="${tagName}"></span>`;
    }
    return "";
  });

  return sanitized;
}

export function validateDesignJson(designJson: Record<string, unknown>): HtmlValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!designJson || typeof designJson !== "object") {
    return { valid: true, errors, warnings };
  }

  const blocks = (designJson.blocks as unknown[]) || [];
  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;

    const blockType = (block as Record<string, unknown>).type as string;

    if (blockType === "image" || blockType === "logo" || blockType === "banner") {
      const src = (block as Record<string, unknown>).src as string;
      if (src && typeof src === "string") {
        if (!src.startsWith("https://")) {
          errors.push(`Block "${blockType}" has invalid image URL: ${src}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function extractUnsubscribeUrl(html: string): string | null {
  const regex = /\{\{unsubscribeUrl\}\}/gi;
  const match = regex.exec(html);
  return match ? "{{unsubscribeUrl}}" : null;
}

export function getUsedVariables(html: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const variables = new Set<string>();
  let match;

  while ((match = regex.exec(html)) !== null) {
    variables.add(match[1]);
  }

  return Array.from(variables);
}

export function validateTemplateInput(
  htmlContent: string,
  category: string,
  designJson?: Record<string, unknown>
): void {
  const requireUnsubscribe = category === "campaign" || category === "notification";

  const htmlValidation = validateHtmlContent(htmlContent, requireUnsubscribe);
  if (!htmlValidation.valid) {
    throw new AppError(htmlValidation.errors.join("; "), 400);
  }

  if (htmlValidation.warnings.length > 0) {
    console.warn("[Template Validation] Warnings:", htmlValidation.warnings);
  }

  if (designJson) {
    const designValidation = validateDesignJson(designJson);
    if (!designValidation.valid) {
      throw new AppError(designValidation.errors.join("; "), 400);
    }
  }
}