# Relay Room recording script (timestamp-friendly)

This script is a live-demo checklist, not a claim that the hosted run has already been recorded. Capture the GraphQL responses and browser state at each checkpoint.

## 00:00–03:00 — prepare

Apply `nhost/migrations/001_initial.sql` and `003_preserve_run_history_on_workflow_save.sql`, then `002_seed_demo.sql` after replacing the membership user IDs with real Auth UUIDs. Apply `nhost/metadata/metadata.json`. Deploy every function under `nhost/functions`. Set `NHOST_GRAPHQL_URL`, `NHOST_ADMIN_SECRET`, `WEBHOOK_SIGNING_SECRET`, `RELAY_ACTION_SECRET`, `WORKFLOW_LLM_STUB=false`, and `GROQ_API_KEY` for a real provider demo; use `WORKFLOW_LLM_STUB=true` only when explicitly labeling the demo as stub mode.

Create separate Auth users and memberships for an Org A owner/editor/viewer and an Org B user. Keep credentials and Auth UUIDs in the deployment password manager or Nhost dashboard; never commit them to this repository. Record the actual workflow UUID and webhook public ID only in the private demo notes.

## 03:00–07:00 — Org A owner

Open the hosted URL (or `pnpm dev` at `http://localhost:3000`), sign in as `owner-a`, and select **Northstar Studio**. Confirm the quota indicator and the four steps: LLM, conditional branch, HTTP, approval gate. Select each step and show its JSON configuration. Change a harmless field in the JSON editor and click **Save changes**; show the success toast and reloaded value. Viewer accounts must see the editor disabled.

## 07:00–11:00 — manual run and live pause

Click **Run workflow**. Do not refresh. Show the step rows changing pending → running → completed, the conditional branch selected from the LLM output (`approve` selects `fast-lane`; non-approve selects `manual-review`), and the run pausing at **Awaiting approval**. Keep the browser Network/GraphQL view visible to show the filtered `step_runs(where: {workflow_run_id: {_eq: $runId}})` subscription. Capture quota increasing exactly once at reservation.

Select the paused gate and click **Approve & continue** as Org A owner/editor. Show `approved_by`, the gate completing, remaining steps resuming, and the final completed run. If the workflow has no step after the gate, completion occurs immediately after approval.

## 11:00–14:00 — signed webhook and event trigger

Run the external webhook from a terminal. The endpoint is the deployed function URL, commonly `https://<subdomain>.functions.<region>.nhost.run/v1/webhookStartWorkflow` or the URL shown by Nhost:

```bash
BODY='{"public_id":"northstar-signal","payload":{"text":"approve this signal"}}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$WEBHOOK_SIGNING_SECRET" -r | cut -d' ' -f1)
curl -i -X POST "$NHOST_FUNCTIONS_URL/webhookStartWorkflow" \
  -H 'content-type: application/json' -H "x-workflow-signature: $SIG" -d "$BODY"
```

Expect a run ID, then show the second run in Run history. An invalid signature must return HTTP 401. To exercise the database event, insert a row as an authorized Org A user using the GraphQL mutation below and show the event-triggered run:

```graphql
mutation WatchOrder($org: uuid!) {
  insert_watched_orders_one(object: {org_id: $org, external_ref: "recording-1", amount: 10}) { id }
}
```

Scheduled runs are verified in Hasura Events/cron logs; do not present a cron log as a completed run unless Run history shows it.

## 14:00–18:00 — isolation and roles

Sign out and sign in as `owner-b` or `viewer-b`; select **B-side Labs**. Org A's workflow, runs, step runs, and quota must be absent. With an Org A UUID, execute as the Org B JWT:

```graphql
query Guess($id: uuid!) { workflows_by_pk(id: $id) { id } }
mutation DeniedRun($id: uuid!) { triggerWorkflowRun(workflow_id: $id, trigger_context: {}) { run_id status } }
```

Expected result is no row for the query, or a Hasura permission error, and `ORGANIZATION_ACCESS_DENIED` for the Action. Repeat with `approveStep`, `saveWorkflow`, a direct `workflow_runs` query, and the `step_runs` subscription. The viewer UI must show **Viewer mode**, disable Run/Test webhook/Save/Approve, and keep the JSON editor disabled. An Org A viewer may read Org A data but cannot run, edit, or approve.

## Recovery

If Groq fails, set `WORKFLOW_LLM_STUB=true`, restart functions, and label the recording stub mode. If HTTPBin is unavailable, replace the seeded HTTPS URL with another deterministic HTTPS endpoint and save it as an owner. If the subscription drops, capture the browser error, rely on the documented three-second recovery refresh, and do not claim zero-refresh live delivery. If quota is exhausted, restore the test organization's quota only through an authorized administrative migration and record the before/after values.
