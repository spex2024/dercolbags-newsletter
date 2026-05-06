import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL"),
  BETTER_AUTH_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  MAILGUN_API_KEY: z.string().min(1, "MAILGUN_API_KEY is required"),
  MAILGUN_DOMAIN: z.string().min(1, "MAILGUN_DOMAIN is required"),
  MAILGUN_URL: z.string().url().default("https://api.eu.mailgun.net"),
  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL"),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  parsed.error.errors.forEach((err) => {
    console.error(`  ${err.path.join(".")}: ${err.message}`);
  });
  process.exit(1);
}

export const env = parsed.data;
