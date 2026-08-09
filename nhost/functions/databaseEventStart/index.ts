import { graphql } from "../_shared/graphql";
import { startRun } from "../_shared/run-service";
import { requireTrustedAction } from "../_shared/http";

export default async function handler(req: { body: { event?: { id?: string; data?: unknown } }; headers: Record<string, string | string[] | undefined> }, res: { status: (code: number) => { json: (data: unknown) => void } }) {
  try {
    requireTrustedAction(req);
    const event = req.body.event ?? {};
    const eventId = event.id ?? "";
    const headers = { "x-hasura-admin-secret": process.env.NHOST_ADMIN_SECRET ?? "" };
    const marker = await graphql<{ insert_processed_events_one: { event_id: string } | null }>(`mutation Mark($eventId: String!) { insert_processed_events_one(object: {event_id: $eventId}, on_conflict: {constraint: processed_events_pkey, update_columns: []}) { event_id } }`, { eventId }, headers);
    if (!marker.insert_processed_events_one) return res.status(200).json({ accepted: false, reason: "duplicate_event" });
    const data = await graphql<{ workflow_triggers: Array<{ workflow_id: string }> }>(`query Event { workflow_triggers(where: {type: {_eq: database_event}, enabled: {_eq: true}}) { workflow_id } }`, {}, headers);
    await Promise.all(data.workflow_triggers.map((trigger) => startRun(trigger.workflow_id, "database_event", event.data ?? {}, { userId: null }, true)));
    res.status(200).json({ accepted: true });
  } catch { res.status(400).json({ message: "Unable to handle database event" }); }
}
