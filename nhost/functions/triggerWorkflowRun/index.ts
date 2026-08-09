import { actionInput, json, requireTrustedAction, sessionFromRequest } from "../_shared/http";
import { startRun } from "../_shared/run-service";

export default async function handler(req: { body: unknown; headers: Record<string, string | string[] | undefined> }, res: { status: (code: number) => { json: (data: unknown) => void } }) {
  try { requireTrustedAction(req); const input = actionInput<{ workflow_id: string; trigger_context?: unknown }>(req.body); json(res, 200, await startRun(input.workflow_id, "manual", input.trigger_context ?? {}, sessionFromRequest(req))); }
  catch (error) { json(res, 400, { message: error instanceof Error ? error.message : "Unable to start workflow" }); }
}
