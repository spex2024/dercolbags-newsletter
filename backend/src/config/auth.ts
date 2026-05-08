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
    sendResetPassword: async ({ user: u, url }) => {
      // Lazy import to avoid circular dependency
      const { sendEmail } = await import("../services/email.service");
      const html = `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="font-size:20px;font-weight:700;margin-bottom:8px">Reset your password</h2>
          <p style="color:#555;margin-bottom:24px">
            We received a request to reset the password for <strong>${u.email}</strong>.
            Click the button below to choose a new password.
          </p>
          <a href="${url}"
             style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 24px;
                    text-decoration:none;font-weight:700;font-size:14px;letter-spacing:.05em">
            Reset Password
          </a>
          <p style="color:#999;font-size:12px;margin-top:24px">
            This link expires in 1 hour. If you didn't request a reset, you can safely ignore this email.
          </p>
        </div>`;
      await sendEmail({ brand: "dercolbags", to: u.email, subject: "Reset your password — DercolBags Pulse", html });
    },
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
