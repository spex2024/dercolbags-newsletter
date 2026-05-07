import type { Context, Next } from "hono";
import type { z } from "zod";
import { errorResponse } from "../utils/response";

export function validate<T extends z.ZodTypeAny>(
  schema: T,
  target: "json" | "query" = "json"
) {
  return async (c: Context, next: Next) => {
    try {
      const data = target === "json" ? await c.req.json() : c.req.query();
      const result = schema.safeParse(data);

      if (!result.success) {
        const errors = result.error.errors.map(
          (e) => `${e.path.join(".") || "root"}: ${e.message}`
        );
        return c.json(errorResponse("Validation failed", errors), 422);
      }

      c.set("validated", result.data);
    } catch {
      return c.json(errorResponse("Invalid request body"), 400);
    }

    // next() is outside the try-catch so real errors from controllers
    // are not swallowed as "Invalid request body"
    await next();
  };
}
