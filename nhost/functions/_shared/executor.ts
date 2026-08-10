import { evaluateBranch } from "./conditional";
import { sanitizeConfig } from "./validation";
import type { ExecutionContext, WorkflowStep } from "./types";

export interface ExecutorStore {
  setStepStatus(
    id: string,
    status: string,
    patch?: Record<string, unknown>,
  ): Promise<void>;
  setRunStatus(
    id: string,
    status: string,
    patch?: Record<string, unknown>,
  ): Promise<void>;
  createNotification(input: Record<string, unknown>): Promise<void>;
  writeResult(input: Record<string, unknown>): Promise<unknown>;
}
export interface Providers {
  llm(prompt: string): Promise<unknown>;
  http(input: Record<string, unknown>): Promise<unknown>;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function retry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let last: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      last = error;
      if (attempt < attempts) await delay(250 * attempt);
    }
  }
  throw last;
}

export async function executeStep(
  context: ExecutionContext,
  store: ExecutorStore,
  providers: Providers,
): Promise<{ output: unknown; branch?: "true" | "false" }> {
  const { step } = context;
  await store.setStepStatus(step.id, "running", {
    started_at: new Date().toISOString(),
    input: {
      previousOutput: context.previousOutput,
      triggerInput: context.triggerInput,
    },
    attempt_count: 1,
  });
  try {
    if (step.type === "approval_gate") {
      await store.setStepStatus(step.id, "paused", {
        input: { reason: step.config.reason ?? "Approval required" },
      });
      await store.setRunStatus(context.runId, "paused");
      return { output: { paused: true } };
    }
    let output: unknown;
    if (step.type === "llm_call")
      output = await retry(() => providers.llm(String(step.config.prompt)), 2);
    else if (step.type === "http_request")
      output = await retry(() => providers.http(step.config), 2);
    else if (step.type === "conditional_branch") {
      const branch = evaluateBranch(
        String(step.config.expression),
        context.previousOutput,
      );
      await store.setStepStatus(step.id, "completed", {
        output: {
          branch,
          selected:
            branch === "true" ? step.config.whenTrue : step.config.whenFalse,
        },
        completed_at: new Date().toISOString(),
      });
      return { output: { branch }, branch };
    } else if (step.type === "db_write")
      output = await store.writeResult({
        orgId: context.orgId,
        runId: context.runId,
        value: context.previousOutput,
        config: sanitizeConfig(step.config),
      });
    else {
      await store.createNotification({
        orgId: context.orgId,
        runId: context.runId,
        config: sanitizeConfig(step.config),
      });
      output = { queued: true, destination: "slack_default" };
    }
    await store.setStepStatus(step.id, "completed", {
      output,
      completed_at: new Date().toISOString(),
    });
    return { output };
  } catch (error) {
    await store.setStepStatus(step.id, "failed", {
      error: {
        message: error instanceof Error ? error.message : "Step failed",
      },
      completed_at: new Date().toISOString(),
    });
    throw error;
  }
}
