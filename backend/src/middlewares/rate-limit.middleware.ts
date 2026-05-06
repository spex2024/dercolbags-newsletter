import type { MiddlewareHandler } from "hono";
import { errorResponse } from "../utils/response";

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
  message?: string;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

function cleanupExpiredKeys(): void {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}

setInterval(cleanupExpiredKeys, 60000);

export function rateLimit(options: RateLimitOptions): MiddlewareHandler {
  const {
    windowMs,
    maxRequests,
    keyPrefix = "rl",
    message = "Too many requests, please try again later.",
  } = options;

  return async (c, next) => {
    const ip = c.req.header("CF-Connecting-IP") ||
               c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ||
               c.req.header("X-Real-IP") ||
               "unknown";

    const path = c.req.path;
    const key = `${keyPrefix}:${ip}:${path}`;
    const now = Date.now();

    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
    } else {
      store[key].count++;

      if (store[key].count > maxRequests) {
        const retryAfter = Math.ceil((store[key].resetTime - now) / 1000);
        return c.json(
          errorResponse(message),
          429,
          { "Retry-After": String(retryAfter) }
        );
      }
    }

    c.set("rateLimitRemaining", Math.max(0, maxRequests - store[key].count));
    c.set("rateLimitReset", store[key].resetTime);

    await next();
  };
}

export const LOGIN_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  keyPrefix: "login",
  message: "Too many login attempts. Please try again in 15 minutes.",
};

export const PASSWORD_RESET_RATE_LIMIT = {
  windowMs: 60 * 60 * 1000,
  maxRequests: 3,
  keyPrefix: "password-reset",
  message: "Too many password reset requests. Please try again in 1 hour.",
};

export const SUBSCRIBE_RATE_LIMIT = {
  windowMs: 60 * 1000,
  maxRequests: 5,
  keyPrefix: "subscribe",
  message: "Too many subscription attempts. Please try again later.",
};

export const EMAIL_SEND_RATE_LIMIT = {
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyPrefix: "email",
  message: "Too many email requests. Please try again later.",
};