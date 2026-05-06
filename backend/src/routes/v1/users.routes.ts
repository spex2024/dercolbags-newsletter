import { Hono } from "hono";
import * as controller from "../../controllers/v1/users.controller";
import { authMiddleware, requireRole } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { createUserSchema, updateUserSchema, listUsersQuerySchema } from "../../validators/users.schema";

const users = new Hono();

users.use("*", authMiddleware);

// owner and admin can view and create users
users.get("/", requireRole("owner", "admin"), validate(listUsersQuerySchema, "query"), controller.listUsers);
users.post("/", requireRole("owner", "admin"), validate(createUserSchema), controller.createUser);
users.get("/:id", requireRole("owner", "admin"), controller.getUser);
users.patch("/:id", requireRole("owner", "admin"), validate(updateUserSchema), controller.updateUser);

// only owner can delete users
users.delete("/:id", requireRole("owner"), controller.deleteUser);

export { users };
