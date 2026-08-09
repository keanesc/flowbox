# Relay Room — implementation write-up

## Schema and relationships

An organization owns workflows; workflows own ordered steps and trigger definitions; a workflow run owns one step run per step. The `position` plus a unique `(workflow_id, position)` constraint makes execution deterministic without requiring a graph database. `workflow_results`, `notification_deliveries`, and `watched_orders` keep side effects auditable and demonstrate that the executor writes only to application tables. `organization_monthly_usage` is a tracked view over the transactional quota counters.

## Two permission layers

Hasura handles the broad data boundary. Every select, insert, update, and delete predicate reaches through the row's workflow/organization relationship into `org_members` and compares `X-Hasura-User-Id`. Owner/editor/viewer roles then narrow operations: viewers select only, editors manage workflow definitions and run them, owners also manage memberships. A guessed UUID therefore has no effect even before the Action is called.

Hasura cannot safely decide whether a workflow definition is allowed to perform a particular side effect during execution. Each Action reloads the workflow using the admin connection, validates every step, checks the caller's membership again, and applies the sensitive-type rules. Only owners can configure `db_write`, `notify`, or webhook triggers. The executor rejects arbitrary SQL, caps HTTP response size and timeout, sanitizes stored integration config, and keeps provider credentials server-side.

## Approval pause/resume

The state machine is `queued → running → paused → running → completed` (or `failed` from any active execution state). When the executor reaches `approval_gate`, it marks that `step_run` and its `workflow_run` paused and returns. There is no polling loop. The `approveStep` Action loads both IDs, verifies they belong to the same paused run and that the requested step is a gate, verifies owner/editor membership in that run's organization, and conditionally changes the gate from `paused` to `completed`. A second request affects zero rows and is rejected. It then resumes from the next position and streams ordinary database updates to the `step_runs` subscription.

## Retry, quota, and triggers

LLM and HTTP provider calls retry once with bounded backoff. The run is failed after the retry budget is exhausted, with the step error persisted. Quota is reserved before creating the run under a row lock, so concurrent starts cannot oversubscribe the organization. The policy is one unit per started run, including failed and paused runs.

Manual, webhook, scheduled, and database-event entrypoints all call `startRun`; they differ only in how they establish trigger context and identity. Webhooks resolve a public trigger ID and verify an HMAC signature before exposing no internal details. Cron starts use a server-only function URL. The watched-table Event Trigger passes the Hasura event ID through an idempotency store before starting work. This convergence keeps authorization, validation, quota, and execution behavior consistent across the four paths.
