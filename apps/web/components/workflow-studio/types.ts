export type Status =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "paused"
  | "skipped";

export type StepType =
  | "llm_call"
  | "http_request"
  | "conditional_branch"
  | "approval_gate"
  | "db_write"
  | "notify";

export type TriggerType = "manual" | "webhook" | "scheduled" | "database_event";
export type Role = "owner" | "editor" | "viewer";

export type Step = {
  id: string;
  position: number;
  type: StepType;
  config: Record<string, unknown>;
  status?: Status;
};

export type Trigger = {
  id: string;
  type: TriggerType;
  config: Record<string, unknown>;
  enabled: boolean;
};

export type Run = {
  id: string;
  status: Status;
  trigger_type: string;
  started_at: string;
  completed_at: string | null;
  error: Record<string, unknown> | null;
};

export type Workflow = {
  id: string;
  name: string;
  description: string;
  active: boolean;
  workflow_steps: Step[];
  workflow_triggers: Trigger[];
  workflow_runs: Run[];
};

export type Organization = {
  id: string;
  name: string;
  quota_used: number;
  quota_limit: number;
};

export type StepRun = {
  id: string;
  workflow_run_id: string;
  workflow_step_id: string;
  status: Status;
  output: Record<string, unknown> | null;
  error: Record<string, unknown> | null;
  attempt_count: number;
  approved_by: string | null;
  approved_at: string | null;
  started_at: string | null;
  completed_at: string | null;
};

export type TypeMeta = {
  label: string;
  summary: (step: Step) => string;
  icon: React.ComponentType<{ label: string }>;
};
