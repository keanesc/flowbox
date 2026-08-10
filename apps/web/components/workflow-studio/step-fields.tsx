import { Code } from "@atlaskit/code";
import Select from "@atlaskit/select";
import Textarea from "@atlaskit/textarea";
import TextField from "@atlaskit/textfield";
import { Stack, Text } from "@atlaskit/primitives/compiled";
import type { Step } from "./types";

export default function StepFields({
  step,
  onChange,
  readOnly,
}: {
  step: Step;
  onChange: (config: Record<string, unknown>) => void;
  readOnly: boolean;
}) {
  const update = (key: string, value: string) =>
    onChange({ ...step.config, [key]: value });
  const field = (
    label: string,
    key: string,
    multiline = false,
    placeholder?: string,
  ) => (
    <Stack key={key} space="space.050">
      <label>
        <Text as="span" size="small" weight="semibold">
          {label}
        </Text>
      </label>
      {multiline ? (
        <Textarea
          value={String(step.config[key] ?? "")}
          placeholder={placeholder}
          isDisabled={readOnly}
          onChange={(event) =>
            update(key, (event.target as HTMLTextAreaElement).value)
          }
          resize="auto"
        />
      ) : (
        <TextField
          value={String(step.config[key] ?? "")}
          placeholder={placeholder}
          isDisabled={readOnly}
          onChange={(event) =>
            update(key, (event.target as HTMLInputElement).value)
          }
        />
      )}
    </Stack>
  );

  if (step.type === "llm_call")
    return (
      <Stack space="space.200">
        {field("Title", "title")}
        {field("Prompt", "prompt", true)}
        {field("Model", "model")}
      </Stack>
    );
  if (step.type === "http_request") {
    return (
      <Stack space="space.200">
        {field("Title", "title")}
        <Stack space="space.050">
          <label>
            <Text as="span" size="small" weight="semibold">
              Method
            </Text>
          </label>
          <Select
            inputId={`method-${step.id}`}
            isDisabled={readOnly}
            value={{
              label: String(step.config.method ?? "GET"),
              value: String(step.config.method ?? "GET"),
            }}
            options={["GET", "POST", "PUT", "PATCH", "DELETE"].map((value) => ({
              label: value,
              value,
            }))}
            onChange={(option) =>
              option && update("method", String(option.value))
            }
          />
        </Stack>
        {field("HTTPS URL", "url")}
        {field("JSON body (optional)", "body", true)}
      </Stack>
    );
  }
  if (step.type === "conditional_branch")
    return (
      <Stack space="space.200">
        {field("Title", "title")}
        {field("Condition", "expression")}
        <Text as="p" size="small" color="color.text.subtle">
          Example: <Code>contains approve</Code>. It is evaluated against the
          previous step output.
        </Text>
        {field("True outcome", "whenTrue")}
        {field("False outcome", "whenFalse")}
      </Stack>
    );
  if (step.type === "approval_gate")
    return (
      <Stack space="space.200">
        {field("Title", "title")}
        {field("Approval message", "reason", true)}
      </Stack>
    );
  if (step.type === "db_write")
    return (
      <Stack space="space.200">
        {field("Title", "title")}
        <Text as="p" size="small" color="color.text.subtle">
          Results are written only to <Code>workflow_results</Code>.
        </Text>
      </Stack>
    );
  return (
    <Stack space="space.200">
      {field("Title", "title")}
      {field("Message", "message", true)}
      <Text as="p" size="small" color="color.text.subtle">
        Delivered through the approved Slack destination.
      </Text>
    </Stack>
  );
}
