import { Hono } from "hono";
import { cors } from "hono/cors";
import { swaggerUI } from "@hono/swagger-ui";
import { auth } from "./config/auth";
import { env } from "./config/env";
import { errorMiddleware } from "./middlewares/error.middleware";
import { apiV1Router, webhooks, tracking } from "./routes/v1";
import { errorResponse } from "./utils/response";
import { openAPISpec } from "./docs/openapi";
import {
  rateLimit,
  LOGIN_RATE_LIMIT,
  PASSWORD_RESET_RATE_LIMIT,
} from "./middlewares/rate-limit.middleware";
import { startScheduler, recoverStuckCampaigns } from "./services/email-queue.service";
import { createRouteHandler } from "uploadthing/server";
import { uploadRouter } from "./uploadthing";

const app = new Hono();

// ─── CORS ─────────────────────────────────────────────────────────────────────

app.use(
  "*",
  cors({
    origin: [env.FRONTEND_URL, "http://localhost:3000", "http://localhost:3001", "https://watpak.com", "https://www.watpak.com", "https://dercolbags.com", "https://www.dercolbags.com"],
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposeHeaders: ["Set-Cookie"],
  })
);

// ─── Block Public Sign-up ─────────────────────────────────────────────────────
// Registration is disabled. Super admin is seeded via `bun db:seed`.
// Additional users are created by the super admin via /api/auth/admin/create-user.

app.post("/api/auth/sign-up/email", (c) => {
  return c.json(
    { success: false, message: "Public registration is disabled. Contact your administrator." },
    403
  );
});

// ─── Rate Limiting for Auth ─────────────────────────────────────────────────

app.use("/api/auth/sign-in/*", rateLimit(LOGIN_RATE_LIMIT));
app.use("/api/auth/sign-in/email", rateLimit(LOGIN_RATE_LIMIT));
app.use("/api/auth/forgot-password", rateLimit(PASSWORD_RESET_RATE_LIMIT));
app.use("/api/auth/forgot-password/email", rateLimit(PASSWORD_RESET_RATE_LIMIT));
app.use("/api/auth/reset-password", rateLimit(PASSWORD_RESET_RATE_LIMIT));

// ─── Better Auth Handler ──────────────────────────────────────────────────────

app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// ─── UploadThing (Public - handles its own auth) ────────────────────────────
const utHandlers = createRouteHandler({ router: uploadRouter });

app.get("/api/uploadthing", (c) => utHandlers.GET(c.req.raw));
app.post("/api/uploadthing", (c) => utHandlers.POST(c.req.raw));

// ─── Webhooks (Public - no auth required) ─────────────────────────────────────

app.route("/api/webhooks", webhooks);

// ─── Tracking Pixels (Public) ─────────────────────────────────────────────────

app.route("/track", tracking);

// ─── API Docs ─────────────────────────────────────────────────────────────────

app.get("/api/docs", swaggerUI({ url: "/api/docs/json" }));
app.get("/api/docs/json", (c) => c.json(openAPISpec));

// ─── API Routes ───────────────────────────────────────────────────────────────

app.route("/api/v1", apiV1Router);

// ─── 404 ──────────────────────────────────────────────────────────────────────

app.notFound((c) => {
  return c.json(errorResponse(`Route ${c.req.method} ${c.req.path} not found`), 404);
});

// ─── Error Handler ────────────────────────────────────────────────────────────

app.onError(errorMiddleware);

// ─── Background Services ───────────────────────────────────────────────────
startScheduler();
recoverStuckCampaigns().catch((err) =>
  console.error("[Startup] Failed to recover stuck campaigns:", err),
);

export default app;
