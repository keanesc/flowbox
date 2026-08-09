import { actionInput, json } from "../_shared/http";
import { graphql } from "../_shared/graphql";
import { verifyWebhookSignature } from "../_shared/signature";
import { startRun } from "../_shared/run-service";

export default async function handler(req: { body: unknown; headers: Record<string, string | string[] | undefined> }, res: { status: (code: number) => { json: (data: unknown) => void } }) {
  try {
    const body = JSON.stringify(req.body ?? {});
    if (!verifyWebhookSignature(body, String(req.headers["x-workflow-signature"] ?? ""), process.env.WEBHOOK_SIGNING_SECRET ?? "")) return json(res, 401, { message: "Invalid webhook signature" });
    const input = actionInput<{ public_id: string; payload?: unknown }>(req.body);
    const data = await graphql<{ workflow_triggers: Array<{ workflow_id: string }> }>(`query Hook($publicId: String!) { workflow_triggers(where: {type: {_eq: webhook}, enabled: {_eq: true}, config: {_contains: {publicId: $publicId}}}) { workflow_id } }`, { publicId: input.public_id }, { "x-hasura-admin-secret": process.env.NHOST_ADMIN_SECRET ?? "" });
    const trigger = data.workflow_triggers[0];
    if (!trigger) return json(res, 404, { message: "Webhook not found" });
    json(res, 200, await startRun(trigger.workflow_id, "webhook", input.payload ?? {}, { userId: null }, true));
  } catch { json(res, 400, { message: "Unable to start webhook workflow" }); }
}
