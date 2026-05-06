import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { AppError } from "../utils/errors";
import { errorResponse } from "../utils/response";

export function errorMiddleware(err: Error, c: Context) {
  console.error(`[${new Date().toISOString()}] ${err.name}: ${err.message}`);

  if (err instanceof AppError) {
    return c.json(errorResponse(err.message, err.errors), err.statusCode as 400 | 401 | 403 | 404 | 409 | 422 | 500);
  }

  if (err instanceof HTTPException) {
    return c.json(errorResponse(err.message), err.status);
  }

  if (err instanceof SyntaxError) {
    return c.json(errorResponse("Invalid JSON body"), 400);
  }

  return c.json(errorResponse("Internal server error"), 500);
}
