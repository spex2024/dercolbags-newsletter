import type { Context } from "hono";
import * as service from "../../services/mailing-list.service";
import { getAccessibleBrands, type AuthUser } from "../../middlewares/auth.middleware";
import { successResponse } from "../../utils/response";
import type { CreateMailingListInput, UpdateMailingListInput, AddSubscribersInput } from "../../validators/mailing-list.schema";

export async function createMailingList(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  const allowedBrands = getAccessibleBrands(authUser);
  const body = await c.req.json<CreateMailingListInput>();

  if (allowedBrands && !allowedBrands.includes(body.brand)) {
    return c.json({ success: false, message: "You do not have access to this brand" }, 403);
  }

  const list = await service.createMailingList(body, authUser.id);
  return c.json(successResponse(list), 201);
}

export async function listMailingLists(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  const allowedBrands = getAccessibleBrands(authUser);
  const query = c.req.query();

  const result = await service.listMailingLists(
    {
      brand: query.brand as "watpak" | "dercolbags" | undefined,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 20,
    },
    allowedBrands
  );

  return c.json(successResponse(result));
}

export async function getMailingList(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  const allowedBrands = getAccessibleBrands(authUser);
  const id = c.req.param("id");

  const list = await service.getMailingListById(id, allowedBrands);
  const subscriberCount = await service.getListSubscriberCount(id);

  return c.json(successResponse({ ...list, subscriberCount }));
}

export async function updateMailingList(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  const allowedBrands = getAccessibleBrands(authUser);
  const id = c.req.param("id");
  const body = await c.req.json<UpdateMailingListInput>();

  const list = await service.updateMailingList(id, body, allowedBrands);
  return c.json(successResponse(list));
}

export async function deleteMailingList(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  const allowedBrands = getAccessibleBrands(authUser);
  const id = c.req.param("id");

  await service.deleteMailingList(id, allowedBrands);
  return c.json(successResponse({ deleted: true }));
}

export async function addSubscribers(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  const allowedBrands = getAccessibleBrands(authUser);
  const id = c.req.param("id");
  const body = await c.req.json<AddSubscribersInput>();

  const result = await service.addSubscribersToList(id, body.subscriberIds, allowedBrands);
  return c.json(successResponse(result), 201);
}

export async function removeSubscriber(c: Context) {
  const authUser = c.get("authUser") as AuthUser;
  const allowedBrands = getAccessibleBrands(authUser);
  const id = c.req.param("id");
  const subscriberId = c.req.param("subscriberId");

  await service.removeSubscriberFromList(id, subscriberId, allowedBrands);
  return c.json(successResponse({ removed: true }));
}