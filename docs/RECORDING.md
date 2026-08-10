# Relay Room — five-minute recording runbook

This recording demonstrates the assignment’s Final Task. Complete deployment, account setup, environment configuration, and a private dry run before pressing record. Do not show passwords, JWTs, Auth UUIDs, admin secrets, HMAC values, API keys, or server environment variables.

Use three prepared accounts: an Org A owner, an Org A viewer, and an Org B user. Prepare an active Org A workflow with an LLM call, conditional branch, HTTP request, approval gate, manual trigger, and signed webhook trigger. Keep an Org A workflow ID available only in private notes for the isolation check.

## 00:00–00:35 — Org A workflow

Sign in as the Org A owner and open **Northstar Studio**. Show the quota indicator, the ordered LLM, conditional, HTTP, and approval steps, and the manual and webhook trigger badges. Keep the workflow overview clean and legible; do not open deployment tooling.

## 00:35–01:45 — Manual run and live pause

Click **Run workflow** and do not refresh. Show step rows progressing from pending to running and completed. Open the LLM or branch output long enough to show that the conditional path was selected from the LLM response, then show the HTTP step and the **Awaiting approval** state. Leave the paused run and quota change visible briefly.

## 01:45–02:20 — Same-organization role boundary

Sign in as the Org A viewer. Show **Viewer mode** or read-only access and the absence of Run, Save, and Approve controls. If using a compact API client panel, submit `approveStep` with the viewer session and show the authorization denial; never approve this run as the viewer.

## 02:20–02:55 — Authorized approval

Return to the Org A owner session. Approve the paused gate and show `approved_by`, `approved_at`, resumed execution, and the completed workflow run.

## 02:55–03:35 — Signed webhook start

Call the public Hasura GraphQL endpoint from a secret-safe terminal or API client. Sign the canonical payload in the terminal but keep the signature value off camera:

```bash
PAYLOAD='{"public_id":"northstar-signal","payload":{"text":"approve this signal"}}'
SIGNATURE=$(printf '%s' "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SIGNING_SECRET" -r | cut -d' ' -f1)
```

Invoke `webhookStartWorkflow(public_id, payload, signature)` with those values, then return to Run history and show the new `webhook` run. The recording need not wait for this second run to finish.

## 03:35–05:00 — Org B isolation

Sign in as the Org B user and show the **B-side Labs** workspace with no Org A workflow, runs, step runs, or quota data. Using the private Org A workflow ID, execute a direct workflow query and `triggerWorkflowRun` with the Org B session. Show the missing/denied workflow result and the organization-access denial from the Action. End on the Org B workspace alongside the completed Org A run evidence.

## Final capture check

Before uploading, confirm that the recording shows: two organizations, an Org A workflow with the required step types, manual and webhook starts, live paused/resumed progress, viewer denial, owner approval, and Org B direct-ID isolation. Keep the finished recording between three and six minutes.
