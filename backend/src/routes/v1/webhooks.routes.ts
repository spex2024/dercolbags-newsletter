import { Hono } from "hono";
import { errorResponse, successResponse } from "../../utils/response";

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

tracking.get("/open/:recipientId", async (c) => {
  const pixel = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );

  return c.body(pixel, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
});

tracking.get("/click/:trackingId", async (c) => {
  return c.redirect("/");
});

export { webhooks, tracking };