# Relay Room — recording narration script

Record each section as a separate clip. The wording is intentionally conversational and self-contained, so clips can be re-recorded or merged in any order without audible jump cuts. Keep the combined recording between three and six minutes; this script targets about five.

Do not show or read out passwords, JWTs, Auth UUIDs, admin secrets, webhook signatures, API keys, or environment variables.

## Clip 1 — Org A workflow overview (00:00–00:35)

**On screen:** Sign in as the Org A owner. Open Northstar Studio and leave the workflow, trigger badges, and quota indicator visible.

**Say:**

> This is Relay Room, an organization-scoped workflow builder for chaining AI and operational steps. I’m signed in as an owner in Northstar Studio, which is Org A. This workflow has an LLM call, a conditional branch, an HTTP request, and an approval gate. It can be started manually or through a signed webhook, and the sidebar shows the organization’s monthly run quota.

**Hold:** Pause briefly on the workflow steps and quota indicator.

**End:**

> I’ll start with a manual run and follow the progress live.

## Clip 2 — Manual run and live pause (00:35–01:45)

**On screen:** Click **Run workflow**. Show changing step states, LLM/branch output, HTTP completion, the paused approval gate, and the quota change. Do not refresh.

**Say:**

> I’m starting the workflow manually. Relay Room creates one run record and one step-run record for each step, so the progress is visible as it happens without refreshing the page.

> The LLM response is now available, and the conditional branch selects its path from that response. The HTTP step has completed, and the workflow has reached its approval gate.

> At this point the run is paused. The quota was reserved when execution began, and the pause is visible both in the run status and the step list.

**Hold:** Leave the **Awaiting approval** state visible for several seconds.

**End:**

> Next I’ll show that being in the same organization is not enough to approve this step.

## Clip 3 — Org A viewer boundary (01:45–02:20)

**On screen:** Sign in as the Org A viewer. Show read-only mode and the missing Run, Save, and Approve controls. If prepared, show the compact denied `approveStep` request.

**Say:**

> I’m now signed in as a viewer in the same organization. The workflow remains visible, but the interface is read-only: there is no Run, Save, or Approve control.

> This is enforced beyond the UI. The approval Action checks the caller’s organization membership and role before it resumes a paused run, so a viewer cannot move this workflow forward.

**Hold:** Pause on the read-only state or the authorization denial.

**End:**

> I’ll switch back to an authorized Org A owner to approve the same paused step.

## Clip 4 — Authorized approval and completion (02:20–02:55)

**On screen:** Return to the Org A owner session. Click **Approve & continue** and show `approved_by`, `approved_at`, and completed status.

**Say:**

> Back as an Org A owner, I can approve the paused gate. The approval is recorded with the approver and timestamp, then the run resumes from the remaining workflow steps.

> The run has now completed. The conditional update prevents a duplicate or stale approval from resuming the same gate twice.

**Hold:** Pause on the completed run and approval metadata.

**End:**

> Manual execution is one entry point. I’ll now start the workflow as an external system would.

## Clip 5 — Signed webhook Action (02:55–03:35)

**On screen:** In a secret-safe terminal or API client, prepare the signature without exposing its value. Invoke `webhookStartWorkflow` through the Hasura GraphQL endpoint, then return to Run history and show the new webhook run.

**Say:**

> This request is sent to the public Hasura webhook Action. The caller signs the webhook payload with HMAC, and the Action validates that signature before it resolves an enabled workflow trigger.

> The new entry in Run history is marked as a webhook run. It enters the same execution service as a manual run, so quota handling, step state, retries, and approval behavior are consistent across trigger types.

**Hold:** Pause on the new webhook run in history. Keep the terminal signature and any credentials out of frame.

**End:**

> Finally, I’ll prove that a user in a different organization cannot use a known Org A identifier to access or run this workflow.

## Clip 6 — Org B isolation and close (03:35–05:00)

**On screen:** Sign in as the Org B user and show B-side Labs. Show no Org A data. Submit a direct Org A workflow query and `triggerWorkflowRun` attempt with the Org B session; show missing/denied result.

**Say:**

> I’m now signed in to B-side Labs, which is Org B. The Org A workflow, its run history, step runs, and quota information are not visible here.

> Even with a known Org A workflow ID, a direct query returns no accessible workflow, and attempting to start that workflow is rejected by the Action with an organization access denial.

> This demonstrates both authorization layers: Hasura scopes the data itself to the caller’s organization, and the Action independently verifies membership before it performs execution or approval.

> Relay Room therefore supports live, auditable workflow runs while keeping cross-organization access and sensitive actions tightly controlled.

**Hold:** End on the Org B workspace and the denied request result.
