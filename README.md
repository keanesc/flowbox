# Relay Room

Relay Room is a small, organization-scoped workflow builder for chaining AI steps. It combines a Next.js App Router frontend with Nhost Auth, Hasura GraphQL, Postgres, and server-only Nhost Functions. The UI is intentionally an ordered control room instead of a canvas: the execution path, live status, and approval boundary stay legible during a walkthrough.

## Live Demo

Frontend: https://flowbox-web.vercel.app

Backend: the Nhost/Hasura deployment is already configured. Apply this repository's migrations, metadata, and functions before treating any live behavior as verified.

## What is included

- `apps/web` — responsive workflow builder, trigger inventory, quota indicator, run history, and live-run/approval presentation.
- `nhost/migrations/default` — deployable, timestamped Hasura migrations for the organization, workflow, run, result, notification, watched-table, and quota schema.
- `nhost/metadata` — Hasura CLI v3 tracking, relationships, role permissions, Actions, cron trigger, and database event trigger. It retains Nhost-managed `auth` tracking from the production metadata export.
- `nhost/seeds/default/002_seed_demo.sql` — local/demo-only template; it is never a production migration.
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

1. Keep Nhost's Git deployment base directory at the repository root. The deploy runner reads `nhost/nhost.toml`, `nhost/config.yaml`, `nhost/migrations/default`, and the modular `nhost/metadata` directory. The timestamped `up.sql` files are idempotent; their `down.sql` files deliberately do not drop data.
2. Do **not** run `nhost/seeds/default/002_seed_demo.sql` in production. It is a local/demo template and contains placeholder Auth user IDs.
3. Configure the Actions and event/cron webhooks to the deployed function URLs. Nhost Functions use the folder names as paths.
4. Add `NHOST_ADMIN_SECRET`, `NHOST_GRAPHQL_URL`, `GROQ_API_KEY`, `WORKFLOW_LLM_STUB`, `WEBHOOK_SIGNING_SECRET`, and `RELAY_ACTION_SECRET` to the Functions environment. Configure the identical `RELAY_ACTION_SECRET` in Hasura's environment so the three authenticated Actions can send their trusted internal header. Add only the public Nhost/GraphQL variables to Vercel.
5. Before a production deployment, run `nhost config validate`, the local checks below, and `nhost deployments new --subdomain hovdcnswjzhdxmqugctf --ref <pushed-commit> --follow`. A function-only deployment is not sufficient: the deployment log must show both migrations and metadata applied.

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

See [WRITEUP.md](./docs/WRITEUP.md) for the schema and state-machine explanation, and [RECORDING.md](./docs/RECORDING.md) for the final walkthrough script.

## Operator guide

Start locally with `cp .env.example .env.local`, replace placeholders, `pnpm install`, and `pnpm dev`; open `http://localhost:3000`. Sign in with an Nhost Auth email/password. The app reads memberships from `org_members`, offers an organization selector when one account belongs to multiple organizations, and loads only that organization's workflow, recent run history, quota, and selected run's step runs.

The seeded demo is Northstar Studio (quota 50) and B-side Labs (quota 25), with the `Signal triage` workflow and manual, webhook, scheduled, and database-event triggers. SQL cannot create Nhost Auth users: create separate users in Auth, then insert their UUIDs into `org_members` with `owner`, `editor`, or `viewer`.

Create separate Nhost Auth users for an Org A owner/editor/viewer and an Org B user, then insert only their Auth UUIDs into `org_members`. Never commit or document passwords, access tokens, admin secrets, or API keys.

Owners and editors can create, edit, reorder, and run workflows; owners additionally may configure `db_write`, `notify`, and webhook triggers. Viewers have a read-only UI with no run, save, approval, or definition-edit controls. **Save changes** calls the trusted `saveWorkflow` Action, which enforces sensitive configuration server-side. **Run workflow** calls the authenticated manual Action. **Runs** shows recent organization-scoped history and inspects the actual selected run. A paused gate exposes **Approve & continue** only to an owner/editor. The quota bar changes when `reserve_org_quota` accepts a run, including paused and failed runs.

Live step updates use a filtered Hasura subscription on the current `workflow_run_id`; the UI also refreshes every three seconds as a recovery path. Failed runs show failed step/error data, paused runs show **Awaiting approval**, and completed runs show **Run completed**. To test isolation, sign in as the B-side user, verify Org A is absent, and use Org A IDs in direct queries/actions; expect no rows or `ORGANIZATION_ACCESS_DENIED`.

### Direct API checks

Use the authenticated user's JWT as `Authorization: Bearer $JWT` and the configured GraphQL URL:

```bash
curl "$NEXT_PUBLIC_GRAPHQL_URL" -H "Authorization: Bearer $JWT" \
  -H 'content-type: application/json' \
  --data-binary @- <<'JSON'
{"query":"query Workspace($orgId: uuid!) { workflows(where: {org_id: {_eq: $orgId}}) { id name workflow_steps { id position type config } workflow_runs(limit: 5, order_by: {started_at: desc}) { id status } } }","variables":{"orgId":"<ORG_UUID>"}}
JSON
```

The manual Action is:

```graphql
mutation Run($id: uuid!, $context: jsonb) {
  triggerWorkflowRun(workflow_id: $id, trigger_context: $context) { run_id status }
}
```

For the signed webhook, set `NHOST_FUNCTIONS_URL` to the deployed function base and run:

```bash
BODY='{"public_id":"northstar-signal","payload":{"text":"approve this signal"}}'
SIGNATURE=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$WEBHOOK_SIGNING_SECRET" -r | cut -d' ' -f1)
curl -i -X POST "$NHOST_FUNCTIONS_URL/webhookStartWorkflow" \
  -H 'content-type: application/json' -H "x-workflow-signature: $SIGNATURE" -d "$BODY"
```

To exercise the database trigger, insert `watched_orders` through GraphQL as a member; Hasura should invoke `databaseEventStart`. Scheduled starts are controlled by the `workflow-scheduler` cron metadata. Verify both by observing a new run, not only a function log.

## Verification and blockers

The production metadata baseline was exported read-only outside this repository before this repair. The final deployment applied migrations and metadata successfully; a read-only export confirms consistent metadata, all four Actions, `workflow-scheduler`, `watched-orders-workflow`, and `reserve_org_quota`. Nhost serves this project's GraphQL endpoint at `/v1` (not `/v1/graphql`); `.env.example` uses the verified path. The real-provider configuration and required server-only secret names are present without exposing values, and safe function probes return the expected rejected responses. Authenticated Org A/Org B acceptance and recording remain to be run with the protected user sessions.
