import { Hono } from "hono";
import * as controller from "../../controllers/v1/subscribers.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { rateLimit, SUBSCRIBE_RATE_LIMIT } from "../../middlewares/rate-limit.middleware";
import {
  createSubscriberSchema,
  listSubscribersSchema,
  updateStatusSchema,
} from "../../validators/subscribers.schema";

const subscribers = new Hono();

// ─── Public ───────────────────────────────────────────────────────────────────

subscribers.post("/", rateLimit(SUBSCRIBE_RATE_LIMIT), validate(createSubscriberSchema), controller.createSubscriber);
subscribers.get("/unsubscribe", controller.unsubscribe);

// ─── Protected ────────────────────────────────────────────────────────────────

subscribers.get(
  "/",
  authMiddleware,
  validate(listSubscribersSchema, "query"),
  controller.listSubscribers
);

subscribers.get("/:id", authMiddleware, controller.getSubscriber);

subscribers.patch(
  "/:id/status",
  authMiddleware,
  validate(updateStatusSchema),
  controller.updateStatus
);

subscribers.delete("/:id", authMiddleware, controller.deleteSubscriber);

export { subscribers };
