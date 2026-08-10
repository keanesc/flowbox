# Relay Room

Relay Room is an organization-scoped workflow builder for chaining AI and operational steps. It combines a Next.js App Router frontend with Nhost Auth, Hasura GraphQL, PostgreSQL, and server-only Nhost Functions. The ordered control-room interface keeps execution status, quota, and approval boundaries clear during a live walkthrough.

## Included

- `apps/web` — workflow builder, trigger inventory, quota indicator, run history, and live approval UI.
- `nhost/migrations/default` — schema, quota function, run-history, and notification-outbox migrations.
- `nhost/metadata` — tracked tables, relationships, organization-scoped permissions, Hasura Actions, cron, and Event Triggers.
- `nhost/functions` — shared execution service plus manual, approval, webhook, scheduled, database-event, and notification-delivery handlers.
- `tests` — authorization, quota, branching, retry, approval, event idempotency, webhook-signature, and notification-queue coverage.

## Local setup

Requirements: Node 20+, pnpm 11+, and an Nhost project.

```bash
cp .env.example .env.local
pnpm install
pnpm dev
pnpm test
```

Configure public Nhost variables only in the frontend. Keep `NHOST_GRAPHQL_URL`, `NHOST_ADMIN_SECRET`, `GROQ_API_KEY`, `WEBHOOK_SIGNING_SECRET`, `RELAY_ACTION_SECRET`, and `SLACK_WEBHOOK_URL` in Nhost Functions and Hasura environment configuration as applicable. Never expose server secrets through `NEXT_PUBLIC_*` variables.

`WORKFLOW_LLM_STUB=true` provides deterministic local/CI behavior with a disclosed stub response. Set it to `false` and configure `GROQ_API_KEY` to run the real Groq provider.

## Deployment

Deploy from the repository root so Nhost applies `nhost/migrations/default`, `nhost/metadata`, and every function folder together. Configure the same `RELAY_ACTION_SECRET` for Hasura and Functions; Hasura uses it when invoking trusted Action and Event Trigger handlers. Configure `SLACK_WEBHOOK_URL` only in Functions; workflows select the approved `slack_default` destination and never store provider URLs.

Do not apply `nhost/seeds/default/002_seed_demo.sql` to production. Create Nhost Auth users separately, then add their Auth UUIDs to `org_members` with the owner, editor, or viewer role.

## Trigger model

Manual execution uses the authenticated `triggerWorkflowRun` Action. The signed external webhook is the public Hasura `webhookStartWorkflow` Action:

```graphql
mutation Webhook($publicId: String!, $payload: jsonb, $signature: String!) {
  webhookStartWorkflow(
    public_id: $publicId
    payload: $payload
    signature: $signature
  ) {
    run_id
    status
  }
}
```

Sign the canonical JSON representation of `{ "public_id": publicId, "payload": payload }` with `WEBHOOK_SIGNING_SECRET`, using HMAC SHA-256, and pass the hex result as `signature`. The Action validates the signature before it resolves an enabled workflow trigger. Scheduled and `watched_orders` database starts enter the same execution service. `notify` creates an audited outbox row; the `deliver-notification` Hasura Event Trigger delivers it to the approved Slack destination.

## Security and execution

Hasura table permissions scope every user read, write, direct-ID query, and subscription to the caller’s organization membership. Owners manage definitions and memberships; editors build and run workflows; viewers are read-only.

Trusted Actions apply the second authorization layer: they reload the workflow and membership server-side, reject cross-organization access, and keep `db_write`, `notify`, and webhook-trigger configuration owner-only. Approval checks the paused step, run relationship, and owner/editor role before resuming. Quota is reserved atomically once a run begins, and LLM/HTTP steps retry once before failure.

## Verification

```bash
pnpm typecheck
pnpm test
pnpm build
```

See [Architecture and security notes](./docs/WRITEUP.md) and the [five-minute recording runbook](./docs/RECORDING.md). The recording should demonstrate the Final Task with real Org A and Org B sessions; use the runbook’s pre-capture checklist before claiming hosted behavior.
