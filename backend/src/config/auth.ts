import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { dash } from "@better-auth/infra";
import { db } from "../db/client";
import { user, session, account, verification } from "../db/schema";
import { env } from "./env";

const isProduction = env.NODE_ENV === "production";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    admin({
      defaultRole: "admin",
    }),
    dash(),
  ],
  session: {
    expiresIn:  60 * 60 * 8, // 8 hour absolute max
    updateAge:  60 * 60,     // refresh expiry on any request if >1hr old
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.FRONTEND_URL, "http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "https://watpak.com", "https://www.watpak.com", "https://dercolbags.com", "https://www.dercolbags.com"],
  cookiePrefix: "better-auth",
  cookies: {
    sessionToken: {
      name: isProduction
        ? "__Host-better-auth.session-token"
        : "better-auth.session-token",
      options: {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      },
    },
    csrfToken: {
      name: isProduction
        ? "__Host-better-auth.csrf-token"
        : "better-auth.csrf-token",
      options: {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict",
        path: "/",
      },
    },
  },
});

export type Auth = typeof auth;
