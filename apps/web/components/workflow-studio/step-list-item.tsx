import { Stack, Inline, Text } from "@atlaskit/primitives/compiled";
import { styles } from "./ui-styles";
import { StatusLozenge } from "./status-lozenge";
import type { Step, Status, TypeMeta } from "./types";

export default function StepListItem({
  step,
  index,
  selected,
  status,
  meta,
  onSelect,
}: {
  step: Step;
  index: number;
  selected: boolean;
  status: Status;
  meta: TypeMeta;
  onSelect: () => void;
}) {
  const Icon = meta.icon;
  const summary = meta.summary(step);
  return (
    <button
      type="button"
      className={`${styles.stepRow} ${selected ? styles.stepRowSelected : ""}`}
      onClick={onSelect}
      aria-current={selected ? "step" : undefined}
      aria-label={`Step ${index + 1}: ${String(step.config.title ?? meta.label)}`}
    >
      <span className={styles.stepIcon}>
        <Icon label="" />
      </span>
      <Stack space="space.050" grow="fill">
        <Inline alignBlock="center" space="space.100" spread="space-between">
          <Text size="small" color="color.text.subtle">
            {String(index + 1).padStart(2, "0")} · {meta.label}
          </Text>
          <StatusLozenge status={status} />
        </Inline>
        <Text weight="semibold">{String(step.config.title ?? meta.label)}</Text>
        <Text size="small" color="color.text.subtle" maxLines={2}>
          {summary}
        </Text>
      </Stack>
    </button>
  );
}
