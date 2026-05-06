import type { Context, Next } from "hono";
import { eq } from "drizzle-orm";
import { auth } from "../config/auth";
import { db } from "../db/client";
import { user } from "../db/schema";
import { errorResponse } from "../utils/response";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  brandAccess: Array<"watpak" | "dercolbags">;
}

// ─── Role Constants ───────────────────────────────────────────────────────────

export const ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MARKETING_MANAGER: "marketing_manager",
  SALES_SUPPORT: "sales_support",
} as const;

// owner and admin see all brands, all actions
const FULL_ACCESS_ROLES = [ROLES.OWNER, ROLES.ADMIN];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function hasFullAccess(role: string): boolean {
  return FULL_ACCESS_ROLES.includes(role as typeof ROLES.OWNER | typeof ROLES.ADMIN);
}

/**
 * Returns null for full-access roles (no brand restriction),
 * or the user's brandAccess array for scoped roles.
 */
export function getAccessibleBrands(authUser: AuthUser): Array<"watpak" | "dercolbags"> | null {
  if (hasFullAccess(authUser.role)) return null;
  return authUser.brandAccess;
}

export function canAccessBrand(authUser: AuthUser, brand: string): boolean {
  if (hasFullAccess(authUser.role)) return true;
  return authUser.brandAccess.includes(brand as "watpak" | "dercolbags");
}

// ─── Role Guard Middleware ────────────────────────────────────────────────────

export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const authUser = c.get("authUser") as AuthUser;
    if (!roles.includes(authUser.role)) {
      return c.json(errorResponse("Insufficient permissions for this action"), 403);
    }
    await next();
  };
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────

export async function authMiddleware(c: Context, next: Next) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json(errorResponse("Unauthorized"), 401);
  }

  const [dbUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!dbUser) {
    return c.json(errorResponse("User account not found"), 401);
  }

  if (dbUser.banned) {
    return c.json(errorResponse("Your account has been suspended"), 403);
  }

  const authUser: AuthUser = {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role ?? ROLES.ADMIN,
    brandAccess: (dbUser.brandAccess as Array<"watpak" | "dercolbags">) ?? [],
  };

  c.set("authUser", authUser);
  await next();
}
