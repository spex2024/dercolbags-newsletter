import { eq, ilike, or, count } from "drizzle-orm";
import { auth } from "../config/auth";
import { db } from "../db/client";
import { user } from "../db/schema";
import { AppError } from "../utils/errors";
import type { CreateUserInput, UpdateUserInput, ListUsersQuery } from "../validators/users.schema";

export async function createUser(input: CreateUserInput) {
  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, input.email))
    .limit(1);

  if (existing.length > 0) {
    throw new AppError("A user with this email already exists", 409);
  }

  // Create via Better Auth internal API (bypasses the HTTP sign-up block)
  await auth.api.signUpEmail({
    body: {
      email: input.email,
      password: input.password,
      name: input.name,
    },
  });

  // Set role, brandAccess and mark email as verified — no verification needed for admin-created users
  const [created] = await db
    .update(user)
    .set({ role: input.role, brandAccess: input.brandAccess, emailVerified: true })
    .where(eq(user.email, input.email))
    .returning();

  if (!created) throw new AppError("Failed to create user", 500);

  return sanitize(created);
}

export async function listUsers(query: ListUsersQuery) {
  const { page, limit, role, search } = query;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (role) conditions.push(eq(user.role, role));
  if (search) conditions.push(or(ilike(user.name, `%${search}%`), ilike(user.email, `%${search}%`))!);

  const where = conditions.length > 0
    ? conditions.reduce((a, b) => a && b)
    : undefined;

  const [users, [{ total }]] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        brandAccess: user.brandAccess,
        banned: user.banned,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(where)
      .orderBy(user.createdAt)
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(user).where(where),
  ]);

  return { items: users, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getUserById(id: string) {
  const [dbUser] = await db.select().from(user).where(eq(user.id, id)).limit(1);
  if (!dbUser) throw new AppError("User not found", 404);
  return sanitize(dbUser);
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);

  if (!existing) throw new AppError("User not found", 404);

  const [updated] = await db
    .update(user)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.role !== undefined && { role: input.role }),
      ...(input.brandAccess !== undefined && { brandAccess: input.brandAccess }),
    })
    .where(eq(user.id, id))
    .returning();

  return sanitize(updated!);
}

export async function deleteUser(id: string) {
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);

  if (!existing) throw new AppError("User not found", 404);

  await db.delete(user).where(eq(user.id, id));
}

// Strip sensitive fields before returning
function sanitize(dbUser: typeof user.$inferSelect) {
  const { ...safe } = dbUser;
  return safe;
}
