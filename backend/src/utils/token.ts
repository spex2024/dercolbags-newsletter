import { randomBytes } from "crypto";

export function generateUnsubscribeToken(): string {
  return randomBytes(32).toString("hex");
}
