import { startRun } from "../_shared/run-service";
import { graphql } from "../_shared/graphql";
import { requireTrustedAction } from "../_shared/http";

export default async function handler(req: { headers: Record<string, string | string[] | undefined> }, res: { status: (code: number) => { json: (data: unknown) => void } }) {
  try {
    requireTrustedAction(req);
    const data = await graphql<{ workflow_triggers: Array<{ workflow_id: string; config: unknown }> }>(`query Scheduled { workflow_triggers(where: {type: {_eq: scheduled}, enabled: {_eq: true}}) { workflow_id config } }`, {}, { "x-hasura-admin-secret": process.env.NHOST_ADMIN_SECRET ?? "" });
    const results = await Promise.all(data.workflow_triggers.map((trigger) => startRun(trigger.workflow_id, "scheduled", { scheduled: true, config: trigger.config }, { userId: null }, true)));
    res.status(200).json({ results });
  } catch (error) { res.status(500).json({ message: error instanceof Error ? error.message : "Scheduled trigger failed" }); }
}
