# Relay Room — implementation and verification write-up

## Status as of 2026-08-09

Complete and verified locally: the Next.js production build, TypeScript check, eight unit tests, metadata JSON parsing, role helpers, sensitive-step checks, constrained branch evaluation, retry behavior, quota boundary, HMAC validation, event idempotency, and approval pause behavior. The seed definition now evaluates its conditional branch immediately after the LLM, so the branch is based on LLM output rather than the later HTTP response.

Implemented but not verified against live Nhost: Auth/session wiring, organization-scoped GraphQL queries, Hasura permissions and relationships, Actions, cron/event metadata, server-side Groq mode, signed webhook handling, function execution, subscriptions, quota SQL, and the hosted frontend. The frontend URL documented in the repository is https://flowbox-web.vercel.app; no deploy receipt is present here.

Blocked: live verification. The configured GraphQL endpoint was queried through the Nhost connector and returned `access-denied: invalid "x-hasura-admin-secret"/"x-hasura-access-key"`. Direct DNS access to the GraphQL endpoint, `flowbox-web.vercel.app`, and the GitHub remote also failed in this environment. Although local `.env` contains deployment values, the connector did not accept the configured admin credential, so no live mutation was attempted and no Auth test accounts were created. This is an external access/network blocker, not evidence that the hosted scenario passes.

## Schema and relationships

`organizations` owns `org_members`, `workflows`, quota counters, and `watched_orders`. A workflow owns ordered `workflow_steps`, `workflow_triggers`, and `workflow_runs`; each run owns one `step_runs` row per step. `workflow_results` and `notification_deliveries` are auditable side-effect tables. `organization_monthly_usage` is the org-level quota view. Foreign keys cascade from organization/workflow/run boundaries, and `(workflow_id, position)` plus `(workflow_run_id, workflow_step_id)` prevent ambiguous execution.

## Two authorization layers

Hasura metadata filters every user read through the caller's `X-Hasura-User-Id` membership. Owner/editor checks gate workflow, child-step, trigger, and watched-order writes; viewers have select-only access. The usage view uses an `_exists` membership filter keyed to `X-Column-org_id`, so it cannot leak another organization's counters. The same relationship predicates apply to direct UUID queries and subscriptions.

The Actions reload the target workflow with the admin connection, resolve membership for the target organization, reject viewers, and validate the complete definition. `db_write` and `notify` steps are owner-only; webhook triggers are owner-only. `saveWorkflow` also verifies that an existing workflow UUID belongs to the submitted organization before replacing its children. Execution credentials remain server-side and `db_write` is limited to structured writes into `workflow_results`, never arbitrary SQL.

## Execution, retries, quota, and approval

All four entrypoints converge on `startRun`: manual Action, signed webhook, scheduled cron function, and `watched_orders` database event. The function validates an active workflow, calls `reserve_org_quota` under a row lock, creates the run and pending step rows, and executes steps in position order. LLM and HTTP providers retry once with bounded backoff. Provider failure marks the step and run failed; a paused or failed run still consumes its reserved unit because external work has started.

`approval_gate` changes its step and run to `paused` and returns. `approveStep` verifies both IDs belong to the same paused run, checks owner/editor membership, and performs a conditional paused-to-completed update. Duplicate or stale approvals fail. The remaining steps resume and the run becomes completed. The UI subscribes to `step_runs` filtered by the current run ID using Hasura's `graphql-ws` protocol; a three-second refresh is also retained as a recovery path if a browser or proxy drops the socket.

## Triggers and real/stub providers

Manual execution is the visible **Run workflow** button. The signed inbound endpoint is `POST /webhookStartWorkflow`; cron invokes `/scheduledWorkflowStart`; Hasura's `watched-orders-workflow` event trigger invokes `/databaseEventStart` and uses `processed_events` for idempotency. The UI does not simulate webhooks: use the signed curl procedure in `README.md` to prove the external endpoint.

Set `WORKFLOW_LLM_STUB=true` for deterministic local/CI mode. It waits 450 ms and returns a disclosed `provider: stub` response. The local deployment configuration currently sets `WORKFLOW_LLM_STUB=false`, but no live workflow could be started; therefore Groq was not proven.

## Known limitations

The current frontend provides structured fields for the supported steps plus simple add/remove/move controls; it intentionally does not use a drag-and-drop canvas or include membership-management UI. The hosted environment must apply the migration and metadata, deploy all function folders, configure Action URLs/secrets, and create Auth users before the exact live acceptance scenario can be claimed.
