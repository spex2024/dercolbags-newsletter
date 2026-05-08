import { Hono } from "hono";
import { errorResponse, successResponse } from "../../utils/response";
import { recordOpen, recordClick } from "../../services/tracking.service";

const webhooks = new Hono();

webhooks.post("/resend", async (c) => {
  const body = await c.req.json();
  const signature = c.req.header("resend-signature");

  if (!signature) {
    return c.json(errorResponse("Missing signature"), 401);
  }

  console.log("[Webhook] Resend event received:", body.type);
  return c.json(successResponse({ received: true }));
});

webhooks.post("/mailgun", async (c) => {
  const body = await c.req.json();
  console.log("[Webhook] Mailgun event received:", body.event);
  return c.json(successResponse({ received: true }));
});

const tracking = new Hono();

const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

tracking.get("/open/:recipientId", async (c) => {
  const { recipientId } = c.req.param();
  // fire-and-forget — don't block the image response
  recordOpen(recipientId).catch((err) =>
    console.error("[Tracking] recordOpen failed:", err)
  );

  return c.body(PIXEL, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
});

tracking.get("/click/:trackingId", async (c) => {
  const { trackingId } = c.req.param();
  const result = await recordClick(trackingId).catch((err) => {
    console.error("[Tracking] recordClick failed:", err);
    return null;
  });

  return c.redirect(result?.url ?? "/");
});

export { webhooks, tracking };