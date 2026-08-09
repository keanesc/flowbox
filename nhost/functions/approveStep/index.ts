import { actionInput, json, sessionFromRequest } from "../_shared/http";
import { approveRun } from "../_shared/run-service";

export default async function handler(req: { body: unknown; headers: Record<string, string | string[] | undefined> }, res: { status: (code: number) => { json: (data: unknown) => void } }) {
  try { const input = actionInput<{ workflow_run_id: string; step_run_id: string; decision: "approve" | "reject" }>(req.body); json(res, 200, await approveRun(input.workflow_run_id, input.step_run_id, input.decision, sessionFromRequest(req))); }
  catch (error) { json(res, 400, { message: error instanceof Error ? error.message : "Unable to approve step" }); }
}
