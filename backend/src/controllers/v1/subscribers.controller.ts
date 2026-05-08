import type { Context } from "hono";
import * as service from "../../services/subscribers.service";
import { errorResponse, paginatedResponse, successResponse } from "../../utils/response";
import type { AuthUser } from "../../middlewares/auth.middleware";
import { getAccessibleBrands } from "../../middlewares/auth.middleware";
import type { CreateSubscriberInput, ListSubscribersQuery, UpdateStatusInput } from "../../validators/subscribers.schema";

export async function createSubscriber(c: Context) {
  const data = c.get("validated") as CreateSubscriberInput;
  const subscriber = await service.createSubscriber(data);
  return c.json(successResponse(subscriber, "Subscribed successfully"), 201);
}

export async function unsubscribe(c: Context) {
  const token = c.req.query("token");
  if (!token) {
    return c.json(errorResponse("Unsubscribe token is required", ["token: Required"]), 400);
  }
  await service.unsubscribe(token);
  return c.json(successResponse(null, "You have been unsubscribed successfully"));
}

export async function listSubscribers(c: Context) {
  const query = c.get("validated") as ListSubscribersQuery;
  const authUser = c.get("authUser") as AuthUser;
  const result = await service.listSubscribers(query, getAccessibleBrands(authUser));
  return c.json(paginatedResponse(result.items, result.pagination));
}

export async function getSubscriber(c: Context) {
  const id = c.req.param("id") ?? "";
  const authUser = c.get("authUser") as AuthUser;
  const subscriber = await service.getSubscriberById(id, getAccessibleBrands(authUser));
  return c.json(successResponse(subscriber));
}

export async function updateStatus(c: Context) {
  const id = c.req.param("id") ?? "";
  const { status } = c.get("validated") as UpdateStatusInput;
  const authUser = c.get("authUser") as AuthUser;
  const subscriber = await service.updateSubscriberStatus(id, status, getAccessibleBrands(authUser));
  return c.json(successResponse(subscriber, "Status updated successfully"));
}

export async function deleteSubscriber(c: Context) {
  const id = c.req.param("id") ?? "";
  const authUser = c.get("authUser") as AuthUser;
  await service.deleteSubscriber(id, getAccessibleBrands(authUser));
  return c.json(successResponse(null, "Subscriber deleted successfully"));
}

export async function anonymiseSubscriber(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  if (authUser.role !== "admin" && authUser.role !== "owner") {
    return c.json({ success: false, message: "Forbidden" }, 403);
  }
  const id = c.req.param("id") ?? "";
  const result = await service.anonymiseSubscriber(id);
  return c.json(successResponse(result, "Subscriber data erased"));
}
