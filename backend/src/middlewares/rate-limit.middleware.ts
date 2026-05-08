import type { MiddlewareHandler } from "hono";
import { errorResponse } from "../utils/response";

interface Window {
  count:     number;
  resetTime: number;
}

interface RateLimitOptions {
  windowMs:    number;
  maxRequests: number;
  keyPrefix?:  string;
  message?:    string;
}

// ── In-memory store with bounded size to prevent memory leaks ────────────────

const MAX_STORE_SIZE = 10_000;
const store          = new Map<string, Window>();

function pruneStore(): void {
  const now = Date.now();
  for (const [key, win] of store) {
    if (win.resetTime < now) store.delete(key);
    if (store.size <= MAX_STORE_SIZE) break;
  }
}

// Run cleanup every 2 minutes
setInterval(pruneStore, 2 * 60 * 1000);

function getClientKey(c: any, prefix: string): string {
  const ip =
    c.req.header("CF-Connecting-IP")                    ||
    c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ||
    c.req.header("X-Real-IP")                           ||
    "unknown";
  return `${prefix}:${ip}:${c.req.path}`;
}

// ── Core factory ──────────────────────────────────────────────────────────────

export function rateLimit(options: RateLimitOptions): MiddlewareHandler {
  const {
    windowMs,
    maxRequests,
    keyPrefix = "rl",
    message   = "Too many requests. Please try again later.",
  } = options;

  return async (c, next) => {
    if (store.size >= MAX_STORE_SIZE) pruneStore();

    const key = getClientKey(c, keyPrefix);
    const now = Date.now();
    const win = store.get(key);

    if (!win || win.resetTime < now) {
      store.set(key, { count: 1, resetTime: now + windowMs });
    } else {
      win.count++;
      if (win.count > maxRequests) {
        const retryAfter = Math.ceil((win.resetTime - now) / 1000);
        return c.json(errorResponse(message), 429, {
          "Retry-After":       String(retryAfter),
          "X-RateLimit-Limit": String(maxRequests),
          "X-RateLimit-Reset": String(Math.ceil(win.resetTime / 1000)),
        });
      }
    }

    await next();
  };
}

// ── Presets ───────────────────────────────────────────────────────────────────

export const LOGIN_RATE_LIMIT = {
  windowMs:    15 * 60 * 1000,  // 15 min
  maxRequests: 10,
  keyPrefix:   "login",
  message:     "Too many login attempts. Please try again in 15 minutes.",
};

export const PASSWORD_RESET_RATE_LIMIT = {
  windowMs:    60 * 60 * 1000,  // 1 hour
  maxRequests: 3,
  keyPrefix:   "password-reset",
  message:     "Too many password reset requests. Please try again in 1 hour.",
};

export const SUBSCRIBE_RATE_LIMIT = {
  windowMs:    60 * 1000,        // 1 min
  maxRequests: 5,
  keyPrefix:   "subscribe",
  message:     "Too many subscription attempts. Please try again later.",
};

export const EMAIL_SEND_RATE_LIMIT = {
  windowMs:    60 * 1000,        // 1 min
  maxRequests: 10,
  keyPrefix:   "email",
  message:     "Too many email requests. Please try again later.",
};

// General API rate limit — protects all authenticated routes
export const API_RATE_LIMIT = {
  windowMs:    60 * 1000,        // 1 min
  maxRequests: 300,              // 300 req/min per IP — generous for a dashboard
  keyPrefix:   "api",
  message:     "Too many requests. Please slow down.",
};
