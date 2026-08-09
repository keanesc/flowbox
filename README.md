# Relay Room

Relay Room is a small, organization-scoped workflow builder for chaining AI steps. It combines a Next.js App Router frontend with Nhost Auth, Hasura GraphQL, Postgres, and server-only Nhost Functions. The UI is intentionally an ordered control room instead of a canvas: the execution path, live status, and approval boundary stay legible during a walkthrough.

## What is included

- `apps/web` — responsive workflow builder, trigger inventory, quota indicator, run history, and live-run/approval presentation.
- `nhost/migrations` — organization, membership, workflow, run, result, notification, watched-table, quota-function, and seed SQL.
- `nhost/metadata/metadata.json` — Hasura tracking, relationships, role permissions, Actions, cron trigger, and database event trigger.
- `nhost/functions` — manual `triggerWorkflowRun`, `approveStep`, signed webhook, scheduled, and database-event entrypoints sharing one execution service.
- `tests` — role isolation, sensitive-step gating, quota, conditional evaluation, retry, approval pause, webhook signature, and event idempotency tests.

## Local setup

Requirements: Node 20+, pnpm 11+, and an Nhost project.

```bash
cp .env.example .env.local
pnpm install
pnpm dev
pnpm test
```

Set `NEXT_PUBLIC_NHOST_SUBDOMAIN`, `NEXT_PUBLIC_NHOST_REGION`, and the GraphQL URLs from Nhost. Set `NHOST_GRAPHQL_URL` and `NHOST_ADMIN_SECRET` only in Nhost Functions; never put the admin secret, Groq key, or webhook signing secret in `NEXT_PUBLIC_*` variables. `WORKFLOW_LLM_STUB=true` is a deterministic mode for local/CI runs; it waits briefly and returns a disclosed provider `stub` response. Set it to `false` and provide `GROQ_API_KEY` to use Groq server-side.

## Nhost deployment

1. Create a Nhost project and apply `nhost/migrations/001_initial.sql`, then optionally `002_seed_demo.sql` after replacing the demo membership user IDs with real Auth user IDs.
2. Track the tables and view in Hasura and apply `nhost/metadata/metadata.json`. If your project uses a generated metadata export, keep the permission expressions from this file: every organization-owned row is filtered through `org_members`.
3. Configure the Actions and event/cron webhooks to the deployed function URLs. Nhost Functions use the folder names as paths.
4. Add `NHOST_ADMIN_SECRET`, `NHOST_GRAPHQL_URL`, `GROQ_API_KEY`, `WORKFLOW_LLM_STUB`, and `WEBHOOK_SIGNING_SECRET` to the Functions environment. Add only the public Nhost/GraphQL variables to Vercel.
5. Deploy `apps/web` to Vercel with the repository root and `pnpm --filter @relayroom/web build` as the build command.

## Trigger examples

Manual execution goes through the Hasura Action `triggerWorkflowRun(workflow_id, trigger_context)`. Webhook requests target the `webhookStartWorkflow` Action and include an HMAC SHA-256 signature in `x-workflow-signature`:

```bash
BODY='{"public_id":"northstar-signal","payload":{"text":"approve this signal"}}'
SIGNATURE=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$WEBHOOK_SIGNING_SECRET" -r | cut -d' ' -f1)
curl -X POST "$NHOST_FUNCTIONS_URL/webhookStartWorkflow" \
  -H 'content-type: application/json' -H "x-workflow-signature: $SIGNATURE" \
  -d "$BODY"
```

The cron trigger calls `scheduledWorkflowStart` and the `watched_orders` Hasura Event Trigger calls `databaseEventStart`. Both resolve enabled workflow triggers and enter the same `startRun` service. Database event IDs are idempotent; production deployments should persist them through `processed_events` rather than the in-memory development fallback.

## Security model

Hasura is the first layer. `user` permissions can only select organization rows where the current `X-Hasura-User-Id` has a membership, and owner/editor checks gate writes. This prevents direct-ID guessing across organizations. The second layer lives in the Action service: it reloads the workflow and membership with a privileged connection, checks active/valid configuration, rejects viewer execution, and keeps `db_write`, `notify`, and `webhook` configuration owner-only. `db_write` accepts structured writes to `workflow_results`, never SQL. Approval uses a conditional `status = paused` update plus an organization role check, so duplicate or cross-org approvals cannot resume a run.

Quota is reserved once a run starts with `reserve_org_quota`, which locks the organization row and rolls a period forward before checking the limit. Failed and paused runs consume the unit because they started external work; the policy is visible in `organization_monthly_usage` and the sidebar indicator.

## Verification

```bash
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vitest run
```

See [WRITEUP.md](./WRITEUP.md) for the schema and state-machine explanation, and [RECORDING.md](./RECORDING.md) for the final walkthrough script.
