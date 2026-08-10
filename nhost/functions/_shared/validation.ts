import { canConfigureTrigger, canUseSensitiveStep } from "./auth";
import type { Role, StepType, WorkflowDefinition } from "./types";

const stepTypes: StepType[] = [
  "llm_call",
  "http_request",
  "db_write",
  "notify",
  "conditional_branch",
  "approval_gate",
];
const urlPattern = /^https:\/\//i;

export function validateWorkflow(workflow: WorkflowDefinition): string[] {
  const errors: string[] = [];
  if (!workflow.name.trim()) errors.push("Workflow name is required.");
  const positions = workflow.steps.map((step) => step.position);
  if (
    new Set(positions).size !== positions.length ||
    positions.some((position) => !Number.isInteger(position) || position < 0)
  ) {
    errors.push("Steps must have unique, non-negative positions.");
  }
  for (const step of workflow.steps) {
    if (!stepTypes.includes(step.type))
      errors.push(`Unsupported step type: ${step.type}`);
    if (
      step.type === "http_request" &&
      !urlPattern.test(String(step.config.url ?? ""))
    )
      errors.push(`Step ${step.position + 1}: use an HTTPS URL.`);
    if (step.type === "llm_call" && !String(step.config.prompt ?? "").trim())
      errors.push(`Step ${step.position + 1}: prompt is required.`);
    if (step.type === "conditional_branch") {
      if (!String(step.config.expression ?? "").trim())
        errors.push(`Step ${step.position + 1}: a condition is required.`);
      if (
        !String(step.config.whenTrue ?? "").trim() ||
        !String(step.config.whenFalse ?? "").trim()
      )
        errors.push(
          `Step ${step.position + 1}: both branch outcomes are required.`,
        );
    }
    if (
      step.type === "db_write" &&
      !["workflow_results"].includes(String(step.config.target ?? ""))
    )
      errors.push("Database writes are limited to workflow_results.");
    if (
      step.type === "notify" &&
      String(step.config.destination ?? "slack_default") !== "slack_default"
    )
      errors.push(
        "Notifications must use the approved slack_default destination.",
      );
  }
  for (const trigger of workflow.triggers) {
    if (
      trigger.type === "webhook" &&
      !String(trigger.config.publicId ?? "").trim()
    )
      errors.push("Webhook triggers need a public identifier.");
    if (
      trigger.type === "scheduled" &&
      !String(trigger.config.cron ?? "").trim()
    )
      errors.push("Scheduled triggers need a cron expression.");
  }
  return errors;
}

export function sanitizeConfig(config: Record<string, unknown>) {
  const copy = { ...config };
  for (const key of ["secret", "token", "apiKey", "authorization"])
    if (key in copy) copy[key] = "••••••••";
  return copy;
}

export function assertSensitiveConfiguration(
  workflow: WorkflowDefinition,
  role: Role,
) {
  for (const step of workflow.steps)
    if (!canUseSensitiveStep(role, step.type))
      throw new Error(`ROLE_CANNOT_CONFIGURE_${step.type.toUpperCase()}`);
  for (const trigger of workflow.triggers)
    if (!canConfigureTrigger(role, trigger.type))
      throw new Error(
        `ROLE_CANNOT_CONFIGURE_${trigger.type.toUpperCase()}_TRIGGER`,
      );
}
