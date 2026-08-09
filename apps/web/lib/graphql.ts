export type StepRunStatus = "pending" | "running" | "completed" | "failed" | "skipped" | "paused";
export type WorkflowStatus = "queued" | "running" | "paused" | "completed" | "failed";

export const WORKSPACE_QUERY = /* GraphQL */ `
  query Workspace($orgId: uuid!) {
    organizations_by_pk(id: $orgId) { id name quota_used quota_limit }
    workflows(where: {org_id: {_eq: $orgId}}, order_by: {updated_at: desc}) {
      id name description active
      workflow_steps(order_by: {position: asc}) { id position type config }
      workflow_triggers { id type config enabled }
      workflow_runs(order_by: {started_at: desc}, limit: 20) {
        id status trigger_type started_at completed_at error
      }
    }
  }
`;

export const STEP_RUNS_SUBSCRIPTION = /* GraphQL */ `
  subscription StepRuns($runId: uuid!) {
    step_runs(where: {workflow_run_id: {_eq: $runId}}, order_by: {workflow_step: {position: asc}}) {
      id workflow_run_id workflow_step_id status input output error attempt_count
      approved_by approved_at started_at completed_at
    }
  }
`;

export const TRIGGER_WORKFLOW_MUTATION = /* GraphQL */ `
  mutation TriggerWorkflowRun($workflowId: uuid!, $context: jsonb) {
    triggerWorkflowRun(workflow_id: $workflowId, trigger_context: $context) { run_id status }
  }
`;

export const APPROVE_STEP_MUTATION = /* GraphQL */ `
  mutation ApproveStep($runId: uuid!, $stepRunId: uuid!, $decision: String!) {
    approveStep(workflow_run_id: $runId, step_run_id: $stepRunId, decision: $decision) { run_id status }
  }
`;
