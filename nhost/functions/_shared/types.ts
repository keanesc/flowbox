export type Role = "owner" | "editor" | "viewer";
export type StepType = "llm_call" | "http_request" | "db_write" | "notify" | "conditional_branch" | "approval_gate";
export type TriggerType = "manual" | "webhook" | "scheduled" | "database_event";
export type RunStatus = "queued" | "running" | "paused" | "completed" | "failed";

export interface Session { userId: string | null; isAdmin?: boolean; }
export interface Membership { orgId: string; userId: string; role: Role; }
export interface WorkflowStep { id: string; workflowId: string; position: number; type: StepType; config: Record<string, unknown>; }
export interface WorkflowTrigger { id: string; workflowId: string; type: TriggerType; config: Record<string, unknown>; enabled: boolean; }
export interface WorkflowDefinition { id: string; orgId: string; name: string; active: boolean; steps: WorkflowStep[]; triggers: WorkflowTrigger[]; }
export interface ExecutionContext { runId: string; orgId: string; workflowId: string; triggerInput: unknown; previousOutput: unknown; step: WorkflowStep; }
export interface ActionError { code: string; message: string; status: number; }
