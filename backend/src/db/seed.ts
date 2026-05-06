import { eq } from "drizzle-orm";
import { auth } from "../config/auth";
import { db } from "./client";
import { user } from "./schema";

const OWNER = {
  name: "Owner",
  email: "admin@dercolbags.com",
  password: "Admin@12345!",
  role: "owner" as const,
  brandAccess: ["watpak", "dercolbags"] as Array<"watpak" | "dercolbags">,
};

async function seed() {
  console.log("Checking for existing owner account...");

  const existing = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.email, OWNER.email))
    .limit(1);

  if (existing.length > 0) {
    console.log(`Owner already exists (role: ${existing[0]?.role ?? "none"}). Skipping.`);
    return;
  }

  console.log("Creating owner account...");

  await auth.api.signUpEmail({
    body: {
      email: OWNER.email,
      password: OWNER.password,
      name: OWNER.name,
    },
  });

  await db
    .update(user)
    .set({ role: OWNER.role, brandAccess: OWNER.brandAccess, emailVerified: true })
    .where(eq(user.email, OWNER.email));

  console.log("─────────────────────────────────────────────");
  console.log("Owner account created.");
  console.log(`  Name:         ${OWNER.name}`);
  console.log(`  Email:        ${OWNER.email}`);
  console.log(`  Password:     ${OWNER.password}`);
  console.log(`  Role:         ${OWNER.role}`);
  console.log(`  Brand Access: ${OWNER.brandAccess.join(", ")}`);
  console.log("─────────────────────────────────────────────");
  console.log("Change the password after first login.");
}

seed()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
