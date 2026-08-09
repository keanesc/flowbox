# Relay Room recording script (timestamp-friendly)

This is a recording procedure, not a claim that the hosted run has already been recorded. Do not begin capture until the live readiness gate below has passed. Keep credentials, Auth UUIDs, admin secrets, action secrets, Groq keys, and webhook signatures out of the browser, terminal capture, commits, and this document.

## Live readiness gate

Before recording, verify the deployed `user` schema exposes `triggerWorkflowRun`, `approveStep`, `saveWorkflow`, and `webhookStartWorkflow`; that `workflow-scheduler` and `watched-orders-workflow` are enabled; and that the deployed functions have the server-only variables listed below. Then perform a real owner/editor run and check: the LLM result selects the conditional path, retries/errors remain observable, quota rises once, the approval step pauses then records `approved_by` and `approved_at`, and the completed run remains visible.

Use real Org A and Org B sessions for the role and isolation evidence. Administrator access is only appropriate for deployment inspection; it is not evidence of user permissions. Stop and repair the failed layer if any readiness probe fails.

## Capture setup

Use Playwright against the deployed app with credentials sourced from local secure storage. Authenticate as Org A before recording starts. Configure OBS WebSocket control and two 1920×1080 scenes at 30 fps:

- **Browser** — full browser capture.
- **Browser evidence** — browser plus a narrow terminal panel, only for secret-safe evidence commands. Commands must read secrets from the environment and must never print them.

For each automated action, hold a still frame for two seconds first. Wait for the real UI state (maximum 45 seconds) rather than a fixed network delay; after ordinary state changes hold four seconds, and after the overview, branch result, paused approval, completion, webhook run, and Org B isolation states hold six seconds. Save private diagnostics if any expected state does not appear.

## 00:00–03:00 — prepare

Deploy the timestamped migrations in `nhost/migrations/default` and the modular metadata in `nhost/metadata` through Nhost Git deployment. Do not apply `nhost/seeds/default/002_seed_demo.sql` to production. Deploy every function under `nhost/functions`. Set `NHOST_GRAPHQL_URL`, `NHOST_ADMIN_SECRET`, `WEBHOOK_SIGNING_SECRET`, `RELAY_ACTION_SECRET`, `WORKFLOW_LLM_STUB=false`, and `GROQ_API_KEY` for a real provider demo; use `WORKFLOW_LLM_STUB=true` only when explicitly labeling the demo as stub mode.

Create separate Auth users and memberships for an Org A owner/editor/viewer and an Org B user. Keep credentials and Auth UUIDs in the deployment password manager or Nhost dashboard; never commit them to this repository. Record the actual workflow UUID and webhook public ID only in the private demo notes.

## 03:00–07:00 — Org A overview

Open the hosted URL (or `pnpm dev` at `http://localhost:3000`), sign in as `owner-a`, and select **Northstar Studio**. Confirm the quota indicator and the four steps: LLM, conditional branch, HTTP, approval gate. Select each step and show its JSON configuration. Change a harmless field in the JSON editor and click **Save changes**; show the success toast and reloaded value. Viewer accounts must see the editor disabled.

## 07:00–11:00 — manual run and live pause

Click **Run workflow**. Do not refresh. Show the step rows changing pending → running → completed, the conditional branch selected from the LLM output (`approve` selects `fast-lane`; non-approve selects `manual-review`), and the run pausing at **Awaiting approval**. Keep the browser Network/GraphQL view visible to show the filtered `step_runs(where: {workflow_run_id: {_eq: $runId}})` subscription. Capture quota increasing exactly once at reservation. Hold six seconds on the branch result and paused state.

Select the paused gate and click **Approve & continue** as Org A owner/editor. Show `approved_by`, `approved_at`, the gate completing, remaining steps resuming, and the final completed run. If the workflow has no step after the gate, completion occurs immediately after approval. Hold six seconds on completion.

## 11:00–14:00 — signed webhook and event trigger

Run the external webhook from a terminal. The endpoint is the deployed function URL, commonly `https://<subdomain>.functions.<region>.nhost.run/v1/webhookStartWorkflow` or the URL shown by Nhost:

```bash
BODY='{"public_id":"northstar-signal","payload":{"text":"approve this signal"}}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$WEBHOOK_SIGNING_SECRET" -r | cut -d' ' -f1)
curl -i -X POST "$NHOST_FUNCTIONS_URL/webhookStartWorkflow" \
  -H 'content-type: application/json' -H "x-workflow-signature: $SIG" -d "$BODY"
```

Keep the terminal off the main Browser scene. Store the HTTP response in private verification notes (do not show the signature), then show the new `webhook` run in Run history and hold six seconds. An invalid signature must return HTTP 401. To exercise the database event, insert a row as an authorized Org A user using the GraphQL mutation below and show the new `database_event` run:

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

Expected result is no row for the query, or a Hasura permission error, and `ORGANIZATION_ACCESS_DENIED` for the Action. Repeat with `approveStep`, `saveWorkflow`, a direct `workflow_runs` query, and the `step_runs` subscription. The viewer UI must show **Viewer mode**, disable Run/Test webhook/Save/Approve, and keep the JSON editor disabled. An Org A viewer may read Org A data but cannot run, edit, or approve. Hold six seconds on the B-side Labs-only workspace and the denial evidence, then end with the completed Org A run evidence alongside the isolation result.

## Recovery

If Groq fails, set `WORKFLOW_LLM_STUB=true`, restart functions, and label the recording stub mode. If HTTPBin is unavailable, replace the seeded HTTPS URL with another deterministic HTTPS endpoint and save it as an owner. If the subscription drops, capture the browser error, rely on the documented three-second recovery refresh, and do not claim zero-refresh live delivery. If quota is exhausted, restore the test organization's quota only through an authorized administrative migration and record the before/after values.
