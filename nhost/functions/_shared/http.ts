import type { Session } from "./types";

export function sessionFromRequest(req: { headers: Record<string, string | string[] | undefined> }): Session {
  const value = req.headers["x-hasura-user-id"];
  const userId = Array.isArray(value) ? value[0] : value;
  return { userId: userId || null, isAdmin: req.headers["x-hasura-admin-secret"] === process.env.NHOST_ADMIN_SECRET };
}
export function requireTrustedAction(req: { headers: Record<string, string | string[] | undefined> }) {
  const configured = process.env.RELAY_ACTION_SECRET;
  const supplied = req.headers["x-relay-action-secret"];
  const value = Array.isArray(supplied) ? supplied[0] : supplied;
  if (!configured || !value || value !== configured) throw new Error("UNTRUSTED_ACTION_REQUEST");
}
export function actionInput<T>(body: unknown): T {
  const payload = body as { input?: T };
  return payload?.input ?? (body as T);
}
export function json(res: { status: (code: number) => { json: (data: unknown) => void } }, code: number, data: unknown) { res.status(code).json(data); }
