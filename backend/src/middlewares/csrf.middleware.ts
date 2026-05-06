import type { MiddlewareHandler } from "hono";
import { errorResponse } from "../utils/response";

const CSRF_HEADER = "x-csrf-token";

export function csrfProtection(): MiddlewareHandler {
  return async (c, next) => {
    const method = c.req.method;

    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      await next();
      return;
    }

    const origin = c.req.header("Origin") || c.req.header("origin");
    const referer = c.req.header("Referer") || c.req.header("referer");
    const originUrl = new URL(origin || referer || "", c.req.url);
    const requestUrl = new URL(c.req.url);

    const isSameOrigin =
      originUrl.origin === requestUrl.origin ||
      originUrl.hostname === "localhost" ||
      originUrl.hostname === "127.0.0.1";

    if (!isSameOrigin && !origin && !referer) {
      return c.json(
        errorResponse("Cross-origin requests not allowed"),
        403
      );
    }

    await next();
  };
}