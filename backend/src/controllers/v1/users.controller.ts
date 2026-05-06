import type { Context } from "hono";
import * as service from "../../services/users.service";
import { successResponse } from "../../utils/response";
import type { CreateUserInput, UpdateUserInput, ListUsersQuery } from "../../validators/users.schema";

export async function createUser(c: Context) {
  const data = c.get("validated") as CreateUserInput;
  const newUser = await service.createUser(data);
  return c.json(successResponse(newUser, "User created successfully"), 201);
}

export async function listUsers(c: Context) {
  const query = c.get("validated") as ListUsersQuery;
  const result = await service.listUsers(query);
  return c.json(successResponse(result));
}

export async function getUser(c: Context) {
  const id = c.req.param("id") ?? "";
  const foundUser = await service.getUserById(id);
  return c.json(successResponse(foundUser));
}

export async function updateUser(c: Context) {
  const id = c.req.param("id") ?? "";
  const data = c.get("validated") as UpdateUserInput;
  const updated = await service.updateUser(id, data);
  return c.json(successResponse(updated, "User updated successfully"));
}

export async function deleteUser(c: Context) {
  const id = c.req.param("id") ?? "";
  await service.deleteUser(id);
  return c.json(successResponse(null, "User deleted successfully"));
}
