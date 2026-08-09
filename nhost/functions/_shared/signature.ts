import { createHmac, timingSafeEqual } from "node:crypto";

export function signWebhook(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}
export function verifyWebhookSignature(body: string, signature: string | undefined, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = Buffer.from(signWebhook(body, secret), "utf8");
  const actual = Buffer.from(signature.replace(/^sha256=/, ""), "utf8");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
