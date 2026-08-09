# Walkthrough script

1. Sign in as the Org A owner and select **Northstar Studio**. Show the `Signal triage` workflow: LLM call, HTTP request, conditional branch, and approval gate. Point out the 12/50 monthly quota.
2. Click **Run workflow**. The execution path updates from running to completed steps and stops at **Awaiting approval** without refreshing. Explain that the subscription is filtered by the run ID.
3. Click **Approve & continue**. Show the approval actor and the run resuming from the next step.
4. Click **Test webhook** and show the second run being accepted. In the live environment, also insert a `watched_orders` row and wait for the database event, then show the scheduled function invocation in Hasura Events.
5. Switch to an Org B user and select **B-side Labs**. Show that Org A's workflow, runs, step outputs, and approval control are absent. Attempting the Org A workflow UUID directly through GraphQL should return no row / a permission error, and the Action should return `ORGANIZATION_ACCESS_DENIED`.

For a deterministic local recording, leave `WORKFLOW_LLM_STUB=true`; the UI displays the demo provider mode and uses an artificial delay. For a hosted recording, set `GROQ_API_KEY` on Nhost Functions and `WORKFLOW_LLM_STUB=false`.
