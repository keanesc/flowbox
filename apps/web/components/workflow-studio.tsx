"use client";

import { useEffect, useState } from "react";
import {
  useAuthenticationStatus,
  useNhostClient,
  useSignInEmailPassword,
  useSignOut,
  useUserData,
} from "@nhost/nextjs";
import { AutoDismissFlag, FlagGroup } from "@atlaskit/flag";
import CheckIcon from "@atlaskit/icon/core/check-mark";
import Heading from "@atlaskit/heading";
import ProgressBar from "@atlaskit/progress-bar";
import { Box, Stack, Text } from "@atlaskit/primitives/compiled";
import {
  APPROVE_STEP_MUTATION,
  STEP_RUNS_SUBSCRIPTION,
  TRIGGER_WORKFLOW_MUTATION,
  WORKSPACE_QUERY,
} from "../lib/graphql";
import ActivityPanel from "./workflow-studio/activity-panel";
import { Feedback } from "./workflow-studio/feedback";
import RunHistory from "./workflow-studio/run-history";
import SignInScreen from "./workflow-studio/sign-in-screen";
import StepInspector from "./workflow-studio/step-inspector";
import StepList from "./workflow-studio/step-list";
import TriggerList from "./workflow-studio/trigger-list";
import type {
  Organization,
  Role,
  Step,
  StepRun,
  StepType,
  Status,
  TypeMeta,
  Workflow,
} from "./workflow-studio/types";
import { styles } from "./workflow-studio/ui-styles";
import WorkflowHeader from "./workflow-studio/workflow-header";
import WorkflowTabs from "./workflow-studio/workflow-tabs";
import WorkspaceShell from "./workflow-studio/workspace-shell";
import { WorkspaceState } from "./workflow-studio/workspace-state";
import AiSparkleIcon from "@atlaskit/icon/core/ai-sparkle";
import ApiIcon from "@atlaskit/icon/core/api";
import BranchIcon from "@atlaskit/icon/core/branch";
import ClockIcon from "@atlaskit/icon/core/clock";
import DatabaseIcon from "@atlaskit/icon/core/database";
import SendIcon from "@atlaskit/icon/core/send";

const ORG_QUERY = `query Organizations { org_members { org_id role organization { id name quota_used quota_limit } } }`;
const SAVE_WORKFLOW_MUTATION = `mutation SaveWorkflow($workflow: jsonb!) { saveWorkflow(workflow: $workflow) { workflow_id } }`;

const typeMeta: Record<StepType, TypeMeta> = {
  llm_call: {
    label: "LLM call",
    icon: AiSparkleIcon,
    summary: (step) => String(step.config.prompt ?? "Configured model call"),
  },
  http_request: {
    label: "HTTP request",
    icon: ApiIcon,
    summary: (step) =>
      `${String(step.config.method ?? "GET")} · ${String(step.config.url ?? "")}`,
  },
  conditional_branch: {
    label: "Conditional branch",
    icon: BranchIcon,
    summary: (step) => String(step.config.expression ?? "Configured condition"),
  },
  approval_gate: {
    label: "Approval gate",
    icon: ClockIcon,
    summary: (step) => String(step.config.reason ?? "Requires approval"),
  },
  db_write: {
    label: "Database write",
    icon: DatabaseIcon,
    summary: (step) => String(step.config.target ?? "workflow_results"),
  },
  notify: {
    label: "Notify",
    icon: SendIcon,
    summary: (step) => String(step.config.message ?? "Configured notification"),
  },
};

const baseConfig: Record<StepType, Record<string, unknown>> = {
  llm_call: {
    title: "Classify input",
    prompt: "Classify this input as approve or review: {{triggerInput}}",
    model: "llama-3.1-8b-instant",
  },
  http_request: {
    title: "Fetch context",
    method: "GET",
    url: "https://httpbin.org/json",
  },
  conditional_branch: {
    title: "Choose a lane",
    expression: "contains approve",
    whenTrue: "fast-lane",
    whenFalse: "manual-review",
  },
  approval_gate: {
    title: "Human review",
    reason: "A teammate must confirm this run.",
  },
  db_write: { title: "Store result", target: "workflow_results" },
  notify: {
    title: "Notify team",
    destination: "slack_default",
    message: "Workflow requires attention",
  },
};

const messageOf = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((item) => String((item as { message?: string }).message ?? item))
        .join(", ")
    : String(
        (value as { message?: string } | null)?.message ??
          value ??
          "Unknown error",
      );
const localId = () => `new-${Math.random().toString(36).slice(2)}`;
const formatTime = (value: string) => new Date(value).toLocaleString();

type WorkspaceData = {
  organizations_by_pk: Organization | null;
  workflows: Workflow[];
};

function useWorkspace() {
  const nhost = useNhostClient();
  const { isAuthenticated, isLoading: authLoading } = useAuthenticationStatus();
  const user = useUserData();
  const [orgId, setOrgId] = useState<string>();
  const [role, setRole] = useState<Role>();
  const [memberships, setMemberships] = useState<
    Array<{
      org_id: string;
      role: Role;
      organization: { id: string; name: string };
    }>
  >([]);
  const [data, setData] = useState<WorkspaceData>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  const load = async (requestedOrg = orgId) => {
    if (!isAuthenticated) return;
    try {
      setError(undefined);
      const membershipResult = await nhost.graphql.request<{
        org_members: Array<{
          org_id: string;
          role: Role;
          organization: { id: string; name: string };
        }>;
      }>(ORG_QUERY);
      if (membershipResult.error)
        throw new Error(messageOf(membershipResult.error));
      const available = membershipResult.data?.org_members ?? [];
      setMemberships(available);
      const member =
        available.find((item) => item.org_id === requestedOrg) ?? available[0];
      if (!member)
        throw new Error("No organization membership found for this account.");
      setOrgId(member.org_id);
      setRole(member.role);
      const result = await nhost.graphql.request<WorkspaceData>(
        WORKSPACE_QUERY,
        { orgId: member.org_id },
      );
      if (result.error) throw new Error(messageOf(result.error));
      setData(result.data ?? undefined);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to load workspace",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (isAuthenticated) void load();
  }, [isAuthenticated]);
  return {
    nhost,
    user,
    isAuthenticated,
    authLoading,
    loading,
    error,
    data,
    role,
    orgId,
    memberships,
    reload: load,
  };
}

export default function WorkflowStudio() {
  const live = useWorkspace();
  const {
    signInEmailPassword,
    isLoading: signInLoading,
    error: signInError,
  } = useSignInEmailPassword();
  const { signOut } = useSignOut();
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<"builder" | "runs">("builder");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>();
  const [selectedStepId, setSelectedStepId] = useState<string>();
  const [selectedRunId, setSelectedRunId] = useState<string>();
  const [draft, setDraft] = useState<Workflow>();
  const [stepRuns, setStepRuns] = useState<StepRun[]>([]);
  const [subscription, setSubscription] = useState<
    "connecting" | "live" | "disconnected"
  >("disconnected");
  const [toast, setToast] = useState("");
  const [runError, setRunError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [approveError, setApproveError] = useState("");
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);
  const workflows = live.data?.workflows ?? [];
  useEffect(() => {
    if (!workflows.length) {
      setSelectedWorkflowId(undefined);
      setDraft(undefined);
      return;
    }
    if (
      !selectedWorkflowId ||
      !workflows.some((workflow) => workflow.id === selectedWorkflowId)
    )
      setSelectedWorkflowId(workflows[0]?.id);
  }, [workflows, selectedWorkflowId]);
  const serverWorkflow = workflows.find(
    (workflow) => workflow.id === selectedWorkflowId,
  );
  const workflow = draft ?? serverWorkflow;
  useEffect(() => {
    setDraft(undefined);
    setSelectedStepId(undefined);
    setSelectedRunId(serverWorkflow?.workflow_runs[0]?.id);
  }, [serverWorkflow?.id]);
  const memberRole = live.role ?? "viewer";
  const canEdit = memberRole !== "viewer";
  const selectedRun =
    workflow?.workflow_runs.find((run) => run.id === selectedRunId) ??
    workflow?.workflow_runs[0];

  useEffect(() => {
    if (!selectedRun || !live.isAuthenticated) {
      setStepRuns([]);
      return;
    }
    let cancelled = false;
    const loadStepRuns = async () => {
      const result = await live.nhost.graphql.request<{ step_runs: StepRun[] }>(
        STEP_RUNS_SUBSCRIPTION.replace(
          "subscription StepRuns",
          "query StepRuns",
        ),
        { runId: selectedRun.id },
      );
      if (!cancelled && result.data) setStepRuns(result.data.step_runs);
    };
    void loadStepRuns();
    return () => {
      cancelled = true;
    };
  }, [selectedRun?.id, live.isAuthenticated]);

  useEffect(() => {
    const runId = selectedRun?.id;
    const wsUrl =
      process.env.NEXT_PUBLIC_GRAPHQL_WS_URL ??
      process.env.NEXT_PUBLIC_GRAPHQL_URL?.replace(/^http/, "ws");
    if (
      !live.isAuthenticated ||
      !runId ||
      !wsUrl ||
      typeof WebSocket === "undefined"
    ) {
      setSubscription("disconnected");
      return;
    }
    let closed = false;
    setSubscription("connecting");
    const socket = new WebSocket(wsUrl, "graphql-transport-ws");
    const start = async () => {
      const tokenValue = (
        live.nhost.auth as unknown as {
          getAccessToken?: () => string | Promise<string | null> | null;
        }
      ).getAccessToken?.();
      const token = await Promise.resolve(tokenValue);
      socket.send(
        JSON.stringify({
          type: "connection_init",
          payload: token
            ? { headers: { Authorization: `Bearer ${token}` } }
            : {},
        }),
      );
    };
    socket.onopen = () => {
      void start().catch(() => {
        setSubscription("disconnected");
        socket.close();
      });
    };
    socket.onmessage = (event) => {
      const message = JSON.parse(String(event.data)) as {
        type?: string;
        payload?: { data?: { step_runs?: StepRun[] } };
      };
      if (message.type === "connection_ack") {
        socket.send(
          JSON.stringify({
            id: "step-runs",
            type: "subscribe",
            payload: { query: STEP_RUNS_SUBSCRIPTION, variables: { runId } },
          }),
        );
        setSubscription("live");
      }
      if (message.type === "next" && message.payload?.data?.step_runs)
        setStepRuns(message.payload.data.step_runs);
      if (message.type === "error") setSubscription("disconnected");
    };
    socket.onerror = () => setSubscription("disconnected");
    socket.onclose = () => {
      if (!closed) setSubscription("disconnected");
    };
    return () => {
      closed = true;
      socket.close();
    };
  }, [selectedRun?.id, live.isAuthenticated, live.nhost.auth]);
  useEffect(() => {
    if (subscription !== "disconnected" || !selectedRun) return;
    const timer = window.setInterval(() => void live.reload(), 5000);
    return () => window.clearInterval(timer);
  }, [subscription, selectedRun?.id]);

  const steps = workflow?.workflow_steps ?? [];
  const selectedStep =
    steps.find((step) => step.id === selectedStepId) ?? steps[0];
  const stepStatus = (step: Step): Status =>
    stepRuns.find((run) => run.workflow_step_id === step.id)?.status ??
    "pending";
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  };
  const updateWorkflow = (change: (current: Workflow) => Workflow) => {
    if (workflow) setDraft(change(workflow));
  };
  const updateStep = (id: string, config: Record<string, unknown>) =>
    updateWorkflow((current) => ({
      ...current,
      workflow_steps: current.workflow_steps.map((step) =>
        step.id === id ? { ...step, config } : step,
      ),
    }));
  const addStep = (type: StepType) =>
    updateWorkflow((current) => ({
      ...current,
      workflow_steps: [
        ...current.workflow_steps,
        {
          id: localId(),
          position: current.workflow_steps.length,
          type,
          config: baseConfig[type],
        },
      ],
    }));
  const removeStep = (id: string) =>
    updateWorkflow((current) => ({
      ...current,
      workflow_steps: current.workflow_steps
        .filter((step) => step.id !== id)
        .map((step, position) => ({ ...step, position })),
    }));
  const moveStep = (id: string, direction: -1 | 1) =>
    updateWorkflow((current) => {
      const index = current.workflow_steps.findIndex((step) => step.id === id);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= current.workflow_steps.length)
        return current;
      const reordered = [...current.workflow_steps];
      [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
      return {
        ...current,
        workflow_steps: reordered.map((step, position) => ({
          ...step,
          position,
        })),
      };
    });
  const addWorkflow = () => {
    if (!live.orgId || !canEdit) return;
    const next: Workflow = {
      id: localId(),
      name: "Untitled workflow",
      description: "Describe what this workflow does.",
      active: true,
      workflow_steps: [],
      workflow_triggers: [
        { id: localId(), type: "manual", config: {}, enabled: true },
      ],
      workflow_runs: [],
    };
    setSelectedWorkflowId(next.id);
    setDraft(next);
    setSelectedStepId(undefined);
    setSelectedRunId(undefined);
    setView("builder");
  };
  const save = async () => {
    if (!workflow || !canEdit || saving || !live.orgId) return;
    setSaving(true);
    setSaveError("");
    try {
      const result = await live.nhost.graphql.request(SAVE_WORKFLOW_MUTATION, {
        workflow: {
          workflow_id: workflow.id.startsWith("new-") ? undefined : workflow.id,
          organization_id: live.orgId,
          name: workflow.name,
          description: workflow.description,
          active: workflow.active,
          steps: workflow.workflow_steps.map((step, position) => ({
            position,
            type: step.type,
            config: step.config,
          })),
          triggers: workflow.workflow_triggers.map((trigger) => ({
            type: trigger.type,
            config: trigger.config,
            enabled: trigger.enabled,
          })),
        },
      });
      if (result.error) throw new Error(messageOf(result.error));
      const id = result.data?.saveWorkflow.workflow_id;
      await live.reload();
      setDraft(undefined);
      if (id) setSelectedWorkflowId(id);
      notify("Workflow saved");
    } catch (error) {
      setSaveError(messageOf(error));
    } finally {
      setSaving(false);
    }
  };
  const runWorkflow = async () => {
    if (!workflow || !canEdit || running) return;
    setRunning(true);
    setRunError("");
    try {
      const result = await live.nhost.graphql.request(
        TRIGGER_WORKFLOW_MUTATION,
        { workflowId: workflow.id, context: { source: "manual" } },
      );
      if (result.error) throw new Error(messageOf(result.error));
      setSelectedRunId(result.data?.triggerWorkflowRun.run_id);
      notify("Workflow started");
      await live.reload();
    } catch (error) {
      setRunError(messageOf(error));
    } finally {
      setRunning(false);
    }
  };
  const approve = async () => {
    const gate = stepRuns.find((run) => run.status === "paused");
    if (!canEdit || !selectedRun || !gate || approving) return;
    setApproving(true);
    setApproveError("");
    try {
      const result = await live.nhost.graphql.request(APPROVE_STEP_MUTATION, {
        runId: selectedRun.id,
        stepRunId: gate.id,
        decision: "approve",
      });
      if (result.error) throw new Error(messageOf(result.error));
      notify("Approval completed — workflow resumed");
      await live.reload();
    } catch (error) {
      setApproveError(messageOf(error));
    } finally {
      setApproving(false);
    }
  };

  if (!hydrated || live.authLoading) return <WorkspaceState kind="loading" />;
  if (!live.isAuthenticated)
    return (
      <SignInScreen
        isLoading={signInLoading}
        error={signInError ? messageOf(signInError) : undefined}
        onSubmit={(values) =>
          void signInEmailPassword(values.email, values.password)
        }
      />
    );
  if (live.loading) return <WorkspaceState kind="loading" />;
  if (live.error || !live.data?.organizations_by_pk)
    return (
      <WorkspaceState
        kind="unavailable"
        message={live.error}
        onRetry={() => void live.reload()}
      />
    );

  const organization = live.data.organizations_by_pk;
  const shellProps = {
    organization,
    memberships: live.memberships.map((item) => ({
      label: item.organization.name,
      value: item.org_id,
      role: item.role,
    })),
    orgId: live.orgId,
    role: memberRole,
    userName: live.user?.displayName ?? live.user?.email ?? "Relay Room user",
    view,
    workflowCount: workflows.length,
    subscription,
    onOrganizationChange: (id: string) => void live.reload(id),
    onViewChange: setView,
    onSignOut: () => void signOut(),
  };
  if (!workflow)
    return (
      <WorkspaceShell {...shellProps}>
        <Box xcss={styles.mainInner}>
          <WorkspaceState
            kind="empty"
            canCreate={canEdit}
            onCreate={addWorkflow}
          />
        </Box>
      </WorkspaceShell>
    );

  const progress = steps.length
    ? Math.round(
        (steps.filter((step) => stepStatus(step) === "completed").length /
          steps.length) *
          100,
      )
    : 0;
  return (
    <WorkspaceShell {...shellProps}>
      <Box xcss={styles.mainInner}>
        <Stack space="space.400">
          <WorkflowHeader
            workflow={workflow}
            workflows={workflows}
            role={memberRole}
            canEdit={canEdit}
            saving={saving}
            running={running}
            onWorkflowChange={(id) => {
              setDraft(undefined);
              setSelectedWorkflowId(id);
            }}
            onChange={(change) =>
              updateWorkflow((current) => ({ ...current, ...change }))
            }
            onNew={addWorkflow}
            onSave={() => void save()}
            onRun={() => void runWorkflow()}
          />
          <WorkflowTabs
            view={view}
            stepCount={steps.length}
            runCount={workflow.workflow_runs.length}
            syncLabel={
              subscription === "live"
                ? "Live from Nhost"
                : subscription === "connecting"
                  ? "Connecting to updates"
                  : "Updates refresh every 5s"
            }
            onChange={setView}
          />
          {(saveError || runError) && (
            <Stack space="space.200">
              {saveError && (
                <Feedback title="Save failed">{saveError}</Feedback>
              )}
              {runError && <Feedback title="Run failed">{runError}</Feedback>}
            </Stack>
          )}
          {view === "runs" ? (
            <RunHistory
              runs={workflow.workflow_runs}
              organizationName={organization.name}
              onInspect={(runId) => {
                setSelectedRunId(runId);
                setView("builder");
              }}
            />
          ) : (
            <Stack space="space.300">
              <Box xcss={styles.runSummary}>
                <Stack space="space.100">
                  <Text size="small" color="color.text.subtle">
                    {selectedRun
                      ? `Run details · ${selectedRun.id.slice(0, 8).toUpperCase()}`
                      : "Ready to run"}
                  </Text>
                  <Heading size="medium">
                    {selectedRun?.status === "paused"
                      ? "Waiting for approval"
                      : selectedRun?.status === "completed"
                        ? "Run completed"
                        : selectedRun
                          ? "Workflow run"
                          : "Build an execution path"}
                  </Heading>
                  <Text color="color.text.subtle">
                    {selectedRun
                      ? `${selectedRun.trigger_type} · started ${formatTime(selectedRun.started_at)}`
                      : "Add ordered steps and save before running."}
                  </Text>
                </Stack>
                <Stack space="space.100" alignInline="end">
                  <Text weight="semibold">{progress}% complete</Text>
                  <Box>
                    <ProgressBar
                      ariaLabel={`${progress}% of workflow steps completed`}
                      value={progress / 100}
                    />
                  </Box>
                </Stack>
              </Box>
              <Box xcss={styles.builderGrid}>
                <StepList
                  steps={steps}
                  selectedStepId={selectedStep?.id}
                  role={memberRole}
                  typeMeta={typeMeta}
                  statusFor={stepStatus}
                  onSelect={setSelectedStepId}
                  onAdd={addStep}
                />
                <StepInspector
                  step={selectedStep}
                  stepRun={
                    selectedStep
                      ? stepRuns.find(
                          (run) => run.workflow_step_id === selectedStep.id,
                        )
                      : undefined
                  }
                  organization={organization}
                  role={memberRole}
                  meta={selectedStep ? typeMeta[selectedStep.type] : undefined}
                  status={selectedStep ? stepStatus(selectedStep) : "pending"}
                  approving={approving}
                  approveError={approveError}
                  canMoveDown={Boolean(
                    selectedStep && selectedStep.position < steps.length - 1,
                  )}
                  onChange={(config) =>
                    selectedStep && updateStep(selectedStep.id, config)
                  }
                  onMove={(direction) =>
                    selectedStep && moveStep(selectedStep.id, direction)
                  }
                  onRemove={() => selectedStep && removeStep(selectedStep.id)}
                  onApprove={() => void approve()}
                />
              </Box>
              <Box xcss={styles.bottomGrid}>
                <TriggerList
                  triggers={workflow.workflow_triggers}
                  role={memberRole}
                  onAdd={() =>
                    updateWorkflow((current) => ({
                      ...current,
                      workflow_triggers: [
                        ...current.workflow_triggers,
                        {
                          id: localId(),
                          type: "manual",
                          config: {},
                          enabled: true,
                        },
                      ],
                    }))
                  }
                  onUpdate={(index, change) =>
                    updateWorkflow((current) => ({
                      ...current,
                      workflow_triggers: current.workflow_triggers.map(
                        (trigger, itemIndex) =>
                          itemIndex === index
                            ? { ...trigger, ...change }
                            : trigger,
                      ),
                    }))
                  }
                  onRemove={(index) =>
                    updateWorkflow((current) => ({
                      ...current,
                      workflow_triggers: current.workflow_triggers.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    }))
                  }
                />
                <ActivityPanel
                  steps={steps}
                  stepRuns={stepRuns}
                  hasSelectedRun={Boolean(selectedRun)}
                />
              </Box>
            </Stack>
          )}
        </Stack>
      </Box>
      {toast && (
        <FlagGroup label="Workflow notifications">
          <AutoDismissFlag
            id="relay-room-toast"
            title={toast}
            appearance="success"
            icon={<CheckIcon label="" />}
          />
        </FlagGroup>
      )}
    </WorkspaceShell>
  );
}
