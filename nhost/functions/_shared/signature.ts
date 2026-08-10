import { createHmac, timingSafeEqual } from "node:crypto";

export function signWebhook(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * A Hasura Action receives parsed GraphQL input rather than the sender's raw
 * HTTP body. Signing this stable representation lets an external caller and
 * the Action handler authenticate exactly the same message.
 */
export function webhookSigningPayload(
  publicId: string,
  payload: unknown,
): string {
  return JSON.stringify({ public_id: publicId, payload: payload ?? {} });
}
export function verifyWebhookSignature(
  body: string,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature || !secret) return false;
  const expected = Buffer.from(signWebhook(body, secret), "utf8");
  const actual = Buffer.from(signature.replace(/^sha256=/, ""), "utf8");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
