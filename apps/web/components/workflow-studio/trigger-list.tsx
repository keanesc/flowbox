import Button from "@atlaskit/button/new";
import { Code } from "@atlaskit/code";
import Select from "@atlaskit/select";
import TextField from "@atlaskit/textfield";
import Lozenge from "@atlaskit/lozenge";
import { Box, Inline, Stack, Text } from "@atlaskit/primitives/compiled";
import { styles } from "./ui-styles";
import type { Role, Trigger, TriggerType } from "./types";

type Option = { label: string; value: TriggerType };
const triggerOptions = (isOwner: boolean): Option[] => [
  { label: "Manual", value: "manual" },
  ...(isOwner ? [{ label: "Webhook", value: "webhook" as TriggerType }] : []),
  { label: "Scheduled", value: "scheduled" },
  { label: "Database event", value: "database_event" },
];

export default function TriggerList({
  triggers,
  role,
  onAdd,
  onUpdate,
  onRemove,
}: {
  triggers: Trigger[];
  role: Role;
  onAdd: () => void;
  onUpdate: (index: number, change: Partial<Trigger>) => void;
  onRemove: (index: number) => void;
}) {
  const isOwner = role === "owner";
  return (
    <div className={styles.panel}>
      <Stack space="space.300">
        <Inline alignBlock="center" spread="space-between">
          <Stack space="space.050">
            <Text size="small" color="color.text.subtle">
              Starting points
            </Text>
            <Text weight="semibold">Triggers · {triggers.length}</Text>
          </Stack>
          {role !== "viewer" && (
            <Button appearance="subtle" onClick={onAdd}>
              Add trigger
            </Button>
          )}
        </Inline>
        {triggers.map((trigger, index) => (
          <Stack key={trigger.id} space="space.200">
            <Inline alignBlock="center" space="space.200" shouldWrap>
              {role !== "viewer" ? (
                <Select<Option>
                  inputId={`trigger-type-${trigger.id}`}
                  value={triggerOptions(isOwner).find(
                    (option) => option.value === trigger.type,
                  )}
                  options={triggerOptions(isOwner)}
                  onChange={(option) =>
                    option &&
                    onUpdate(index, {
                      type: option.value,
                      config:
                        option.value === "webhook"
                          ? { publicId: "" }
                          : option.value === "scheduled"
                            ? { cron: "0 * * * *" }
                            : trigger.config,
                    })
                  }
                />
              ) : (
                <Lozenge>{trigger.type.replace("_", " ")}</Lozenge>
              )}
              {trigger.type === "webhook" && role !== "viewer" && (
                <TextField
                  placeholder="Public webhook ID"
                  value={String(trigger.config.publicId ?? "")}
                  onChange={(event) =>
                    onUpdate(index, {
                      config: {
                        ...trigger.config,
                        publicId: (event.target as HTMLInputElement).value,
                      },
                    })
                  }
                />
              )}
              {trigger.type === "scheduled" && role !== "viewer" && (
                <TextField
                  aria-label="Schedule expression"
                  value={String(trigger.config.cron ?? "")}
                  onChange={(event) =>
                    onUpdate(index, {
                      config: {
                        ...trigger.config,
                        cron: (event.target as HTMLInputElement).value,
                      },
                    })
                  }
                />
              )}
              {role !== "viewer" && (
                <Button
                  appearance="danger"
                  spacing="compact"
                  onClick={() => onRemove(index)}
                >
                  Remove
                </Button>
              )}
              <Lozenge appearance={trigger.enabled ? "success" : "default"}>
                {trigger.enabled ? "Enabled" : "Disabled"}
              </Lozenge>
            </Inline>
            {trigger.type === "database_event" && (
              <Text size="small" color="color.text.subtle">
                Starts from the watched_orders event trigger.
              </Text>
            )}
            {role === "viewer" && (
              <Text size="small" color="color.text.subtle">
                {trigger.type === "webhook"
                  ? `Signed endpoint public ID: ${String(trigger.config.publicId ?? "not configured")}`
                  : JSON.stringify(trigger.config)}
              </Text>
            )}
          </Stack>
        ))}
        {triggers.some((trigger) => trigger.type === "webhook") && (
          <Text size="small" color="color.text.subtle">
            Webhook runs originate from the signed{" "}
            <Code>/webhookStartWorkflow</Code> endpoint; this UI does not
            simulate them.
          </Text>
        )}
      </Stack>
    </div>
  );
}
