import Button from "@atlaskit/button/new";
import EmptyState from "@atlaskit/empty-state";
import Select from "@atlaskit/select";
import { Box, Inline, Stack, Text } from "@atlaskit/primitives/compiled";
import StepListItem from "./step-list-item";
import type { Role, Step, StepType, Status, TypeMeta } from "./types";
import { styles } from "./ui-styles";

type Option = { label: string; value: StepType };

export default function StepList({
  steps,
  selectedStepId,
  role,
  typeMeta,
  statusFor,
  onSelect,
  onAdd,
}: {
  steps: Step[];
  selectedStepId?: string;
  role: Role;
  typeMeta: Record<StepType, TypeMeta>;
  statusFor: (step: Step) => Status;
  onSelect: (id: string) => void;
  onAdd: (type: StepType) => void;
}) {
  const availableTypes = (Object.keys(typeMeta) as StepType[]).filter(
    (type) => role === "owner" || (type !== "db_write" && type !== "notify"),
  );
  const options: Option[] = availableTypes.map((type) => ({
    label: typeMeta[type].label,
    value: type,
  }));
  return (
    <Box xcss={styles.panel} padding="space.400">
      <Stack space="space.300">
        <Inline alignBlock="center" spread="space-between">
          <Stack space="space.050">
            <Text size="small" color="color.text.subtle">
              Execution path
            </Text>
            <Text weight="semibold">Workflow steps · {steps.length}</Text>
          </Stack>
          {role !== "viewer" && (
            <Select<Option>
              inputId="add-step"
              placeholder="Add step"
              options={options}
              value={null}
              onChange={(option) => option && onAdd(option.value)}
              aria-label="Add workflow step"
            />
          )}
        </Inline>
        {steps.length ? (
          <Stack space="space.100">
            {steps.map((step, index) => (
              <StepListItem
                key={step.id}
                step={step}
                index={index}
                selected={selectedStepId === step.id}
                status={statusFor(step)}
                meta={typeMeta[step.type]}
                onSelect={() => onSelect(step.id)}
              />
            ))}
          </Stack>
        ) : (
          <EmptyState
            header="No steps yet"
            description="Add the first step to define this workflow."
          />
        )}
      </Stack>
    </Box>
  );
}
