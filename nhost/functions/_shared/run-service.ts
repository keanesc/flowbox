import { canApprove, canEdit, membershipFor, requireRole } from "./auth";
import { executeStep, type ExecutorStore, type Providers } from "./executor";
import { graphql } from "./graphql";
import { validateWorkflow } from "./validation";
import type { Membership, Session, WorkflowDefinition } from "./types";

const adminHeaders = () => ({ "x-hasura-admin-secret": process.env.NHOST_ADMIN_SECRET ?? "" });
const normalizeStep = (step: { id: string; workflow_id: string; position: number; type: WorkflowDefinition["steps"][number]["type"]; config: Record<string, unknown> }) => ({ id: step.id, workflowId: step.workflow_id, position: step.position, type: step.type, config: step.config });
const normalizeTrigger = (trigger: { id: string; workflow_id: string; type: WorkflowDefinition["triggers"][number]["type"]; config: Record<string, unknown>; enabled: boolean }) => ({ id: trigger.id, workflowId: trigger.workflow_id, type: trigger.type, config: trigger.config, enabled: trigger.enabled });

const workflowQuery = `query LoadWorkflow($id: uuid!) {
  workflows_by_pk(id: $id) { id org_id name active
    workflow_steps(order_by: {position: asc}) { id workflow_id position type config }
    workflow_triggers(where: {enabled: {_eq: true}}) { id workflow_id type config enabled }
  }
}`;

async function loadWorkflow(workflowId: string): Promise<WorkflowDefinition> {
  const data = await graphql<{ workflows_by_pk: { id: string; org_id: string; name: string; active: boolean; workflow_steps: Array<{ id: string; workflow_id: string; position: number; type: WorkflowDefinition["steps"][number]["type"]; config: Record<string, unknown> }>; workflow_triggers: Array<{ id: string; workflow_id: string; type: WorkflowDefinition["triggers"][number]["type"]; config: Record<string, unknown>; enabled: boolean }> } }>(workflowQuery, { id: workflowId }, adminHeaders());
  if (!data.workflows_by_pk) throw new Error("WORKFLOW_NOT_FOUND");
  return { id: data.workflows_by_pk.id, orgId: data.workflows_by_pk.org_id, name: data.workflows_by_pk.name, active: data.workflows_by_pk.active, steps: (data.workflows_by_pk.workflow_steps ?? []).map(normalizeStep), triggers: (data.workflows_by_pk.workflow_triggers ?? []).map(normalizeTrigger) };
}

async function roleFor(orgId: string, session: Session) {
  if (session.isAdmin) return "owner" as const;
  const data = await graphql<{ org_members: Membership[] }>(`query Member($orgId: uuid!, $userId: uuid!) { org_members(where: {org_id: {_eq: $orgId}, user_id: {_eq: $userId}}) { org_id user_id role } }`, { orgId, userId: session.userId }, adminHeaders());
  return membershipFor(data.org_members, session.userId ?? "", orgId)?.role;
}

class Store implements ExecutorStore {
  async setStepStatus(id: string, status: string, patch: Record<string, unknown> = {}) {
    await graphql(`mutation Step($id: uuid!, $set: step_runs_set_input!) { update_step_runs_by_pk(pk_columns: {id: $id}, _set: $set) { id } }`, { id, set: { ...patch, status } }, adminHeaders());
  }
  async setRunStatus(id: string, status: string, patch: Record<string, unknown> = {}) {
    await graphql(`mutation Run($id: uuid!, $set: workflow_runs_set_input!) { update_workflow_runs_by_pk(pk_columns: {id: $id}, _set: $set) { id } }`, { id, set: { ...patch, status } }, adminHeaders());
  }
  async createNotification(input: Record<string, unknown>) { await graphql(`mutation Notify($input: notification_deliveries_insert_input!) { insert_notification_deliveries_one(object: $input) { id } }`, { input: { org_id: input.orgId, run_id: input.runId, destination: String((input.config as Record<string, unknown>)?.destination ?? "configured destination") } }, adminHeaders()); }
  async writeResult(input: Record<string, unknown>) { const data = await graphql<{ insert_workflow_results_one: { id: string } }>(`mutation Result($input: workflow_results_insert_input!) { insert_workflow_results_one(object: $input) { id } }`, { input: { org_id: input.orgId, run_id: input.runId, value: input.value } }, adminHeaders()); return data.insert_workflow_results_one; }
}

const providers: Providers = {
  async llm(prompt) {
    if (process.env.WORKFLOW_LLM_STUB === "true" || !process.env.GROQ_API_KEY) {
      await new Promise((resolve) => setTimeout(resolve, 450));
      return { text: prompt.toLowerCase().includes("approve") ? "approve" : "demo response", provider: "stub" };
    }
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${process.env.GROQ_API_KEY}` }, body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: [{ role: "user", content: prompt }], temperature: 0 }) });
    if (!response.ok) throw new Error(`Groq returned ${response.status}`);
    const result = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return { text: result.choices?.[0]?.message?.content ?? "", provider: "groq" };
  },
  async http(config) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(Number(config.timeoutMs ?? 8000), 15000));
    try {
      const response = await fetch(String(config.url), { method: String(config.method ?? "GET"), headers: (config.headers ?? {}) as Record<string, string>, body: config.body ? JSON.stringify(config.body) : undefined, signal: controller.signal });
      const text = (await response.text()).slice(0, 12000);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
      return { status: response.status, body: text };
    } finally { clearTimeout(timeout); }
  },
};

export async function startRun(workflowId: string, triggerType: string, triggerInput: unknown, session: Session, external = false) {
  const workflow = await loadWorkflow(workflowId);
  const role = await roleFor(workflow.orgId, session);
  if (!external) requireRole(role ? { orgId: workflow.orgId, userId: session.userId ?? "", role } : undefined, ["owner", "editor"]);
  if (!workflow.active) throw new Error("WORKFLOW_INACTIVE");
  const errors = validateWorkflow(workflow);
  if (errors.length) throw new Error(`INVALID_WORKFLOW: ${errors.join(" ")}`);
  const reserved = await graphql<{ reserve_org_quota: Array<{ allowed: boolean }> }>(`mutation Reserve($orgId: uuid!) { reserve_org_quota(args: {p_org_id: $orgId}) { allowed } }`, { orgId: workflow.orgId }, adminHeaders());
  if (!reserved.reserve_org_quota[0]?.allowed) throw new Error("QUOTA_EXHAUSTED");
  const run = await graphql<{ insert_workflow_runs_one: { id: string } }>(`mutation CreateRun($input: workflow_runs_insert_input!) { insert_workflow_runs_one(object: $input) { id } }`, { input: { workflow_id: workflow.id, trigger_type: triggerType, status: "running", trigger_input: triggerInput, initiated_by: session.userId } }, adminHeaders());
  const runId = run.insert_workflow_runs_one.id;
  await graphql(`mutation Steps($steps: [step_runs_insert_input!]!) { insert_step_runs(objects: $steps) { affected_rows } }`, { steps: workflow.steps.map((step) => ({ workflow_run_id: runId, workflow_step_id: step.id, status: "pending" })) }, adminHeaders());
  const store = new Store();
  let previous: unknown = triggerInput;
  try {
    for (const step of workflow.steps.sort((a, b) => a.position - b.position)) {
      const result = await executeStep({ runId, orgId: workflow.orgId, workflowId: workflow.id, triggerInput, previousOutput: previous, step }, store, providers);
      previous = result.output;
      if (step.type === "approval_gate") return { runId, status: "paused" };
    }
    await store.setRunStatus(runId, "completed", { completed_at: new Date().toISOString() });
    return { runId, status: "completed" };
  } catch (error) {
    await store.setRunStatus(runId, "failed", { error: { message: error instanceof Error ? error.message : "Workflow failed" }, completed_at: new Date().toISOString() });
    throw error;
  }
}

export async function approveRun(workflowRunId: string, stepRunId: string, decision: "approve" | "reject", session: Session) {
  if (decision !== "approve") throw new Error("Only approve is supported; reject is a failed terminal decision.");
  const data = await graphql<{ step_runs_by_pk: { id: string; status: string; workflow_step: { type: string; position: number }; workflow_run: { id: string; status: string; workflow: { id: string; org_id: string; name: string; active: boolean; workflow_steps: Array<{ id: string; workflow_id: string; position: number; type: WorkflowDefinition["steps"][number]["type"]; config: Record<string, unknown> }>; workflow_triggers: Array<{ id: string; workflow_id: string; type: WorkflowDefinition["triggers"][number]["type"]; config: Record<string, unknown>; enabled: boolean }> } } } }>(`query Approval($id: uuid!) { step_runs_by_pk(id: $id) { id status workflow_step { type position } workflow_run { id status workflow { id org_id name active workflow_steps(order_by: {position: asc}) { id workflow_id position type config } workflow_triggers { id workflow_id type config enabled } } } } }`, { id: stepRunId }, adminHeaders());
  const row = data.step_runs_by_pk;
  if (!row || row.workflow_run.id !== workflowRunId || row.status !== "paused" || row.workflow_run.status !== "paused" || row.workflow_step.type !== "approval_gate") throw new Error("STALE_OR_INVALID_APPROVAL");
  const role = await roleFor(row.workflow_run.workflow.org_id, session);
  requireRole(role ? { orgId: row.workflow_run.workflow.org_id, userId: session.userId ?? "", role } : undefined, ["owner", "editor"]);
  const approvedAt = new Date().toISOString();
  const update = await graphql<{ update_step_runs: { affected_rows: number } }>(`mutation Approve($id: uuid!, $userId: uuid!, $approvedAt: timestamptz!) { update_step_runs(where: {id: {_eq: $id}, status: {_eq: "paused"}}, _set: {status: "completed", approved_by: $userId, approved_at: $approvedAt, completed_at: $approvedAt}) { affected_rows } }`, { id: stepRunId, userId: session.userId, approvedAt }, adminHeaders());
  if (update.update_step_runs.affected_rows !== 1) throw new Error("APPROVAL_ALREADY_HANDLED");
  await graphql(`mutation Resume($id: uuid!) { update_workflow_runs_by_pk(pk_columns: {id: $id}, _set: {status: running}) { id } }`, { id: workflowRunId }, adminHeaders());
  const steps = row.workflow_run.workflow.workflow_steps.filter((step) => step.position > row.workflow_step.position).map(normalizeStep);
  let previous: unknown = { approved: true };
  const store = new Store();
  try {
    for (const step of steps) { const result = await executeStep({ runId: workflowRunId, orgId: row.workflow_run.workflow.org_id, workflowId: row.workflow_run.workflow.id, triggerInput: {}, previousOutput: previous, step }, store, providers); previous = result.output; if (step.type === "approval_gate") return { runId: workflowRunId, status: "paused" }; }
    await store.setRunStatus(workflowRunId, "completed", { completed_at: new Date().toISOString() });
    return { runId: workflowRunId, status: "completed" };
  } catch (error) {
    await store.setRunStatus(workflowRunId, "failed", { error: { message: error instanceof Error ? error.message : "Workflow failed" }, completed_at: new Date().toISOString() });
    throw error;
  }
}
