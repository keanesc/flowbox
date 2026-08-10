# Relay Room — architecture and security notes

Relay Room is an organization-scoped workflow builder for chaining AI and operational steps. It uses Next.js for the workflow UI, Nhost Auth for identity, Hasura GraphQL for data access and subscriptions, PostgreSQL for durable execution state, and Nhost Functions for trusted orchestration. The UI deliberately uses an ordered execution path rather than a free-form canvas so the run state and approval boundary remain easy to inspect.

## Schema and execution model

The core relationship is `organizations → org_members → workflows`. Each workflow owns ordered `workflow_steps`, configured `workflow_triggers`, and historical `workflow_runs`; every run creates one `step_runs` record per workflow step. `workflow_results` records constrained `db_write` output, while `notification_deliveries` is a durable outbox for notifications. `organization_monthly_usage` is the organization-level quota view used by the UI.

Foreign keys preserve the organization and workflow boundaries, and unique `(workflow_id, position)` and `(workflow_run_id, workflow_step_id)` constraints prevent ambiguous execution. Historical run records remain inspectable if a workflow definition changes.

Each run follows a small, explicit state machine:

```text
pending → running → paused (approval gate) → running → completed
                  └──────────────────────→ failed (after retry)
```

`triggerWorkflowRun` validates an active workflow, reserves a quota unit under a PostgreSQL row lock, creates the run and pending step records, then executes steps in position order. `llm_call` and `http_request` retry once with bounded backoff. A provider error marks both the active step and run as failed; paused and failed runs keep their reserved unit because external work may already have started.

## Two authorization layers

Hasura provides the first layer: organization and role scoping. Every user-facing table permission is constrained through the caller’s `X-Hasura-User-Id` membership. Owners can manage workflows, steps, triggers, and membership; editors can build and run workflows; viewers are read-only. The same membership predicates apply to direct UUID lookups and `step_runs` subscriptions, so knowing another organization’s identifier does not grant visibility. The usage view uses a correlated membership check, preventing quota data from leaking across organizations.

The second layer is enforced by trusted Actions. The Action service reloads the target workflow and membership through its server-side connection before it changes execution state. It rejects viewers, validates the complete submitted workflow definition, and restricts `db_write`, `notify`, and webhook-trigger configuration to owners. `db_write` writes structured output only to `workflow_results`; it never accepts SQL. `approveStep` verifies that the requested step belongs to the supplied paused run, confirms owner/editor membership in that run’s organization, and uses a conditional paused-to-completed update to reject stale or duplicate approvals.

## Actions, triggers, and live progress

Manual starts use the authenticated `triggerWorkflowRun` Action. External systems start a webhook run through the public `webhookStartWorkflow` Hasura Action, supplying a public trigger identifier, payload, and HMAC-SHA-256 signature over a canonical payload. The Action handler receives Hasura’s trusted internal header, validates the signature, and resolves enabled webhook triggers without exposing a direct function endpoint.

Scheduled starts and `watched_orders` database changes also enter the shared execution service. Database events use persistent event identifiers to avoid duplicate starts. A `notify` step inserts a queued `notification_deliveries` record; Hasura’s `deliver-notification` Event Trigger invokes the server-side Slack delivery function. Delivery attempts, failures, and completion timestamps remain auditable, and the workflow never stores an arbitrary Slack URL.

The frontend subscribes to `step_runs` filtered by the selected `workflow_run_id` using `graphql-ws`, presenting pending, running, paused, failed, and completed states without a refresh. A short polling fallback preserves observability if a browser or proxy drops the socket. The quota indicator is updated from the same organization-scoped data model.
