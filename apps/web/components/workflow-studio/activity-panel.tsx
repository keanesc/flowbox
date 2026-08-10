import { Box, Inline, Stack, Text } from "@atlaskit/primitives/compiled";
import { StatusLozenge } from "./status-lozenge";
import { styles } from "./ui-styles";
import type { Step, StepRun } from "./types";

export default function ActivityPanel({
  steps,
  stepRuns,
  hasSelectedRun,
}: {
  steps: Step[];
  stepRuns: StepRun[];
  hasSelectedRun: boolean;
}) {
  return (
    <Box xcss={styles.panel} padding="space.400" aria-live="polite">
      <Stack space="space.300">
        <Stack space="space.050">
          <Text size="small" color="color.text.subtle">
            Observability
          </Text>
          <Text weight="semibold">Selected run</Text>
        </Stack>
        {!hasSelectedRun ? (
          <Text size="small" color="color.text.subtle">
            Select or start a run to inspect step status.
          </Text>
        ) : stepRuns.length ? (
          <Stack space="space.200">
            {stepRuns.map((run) => (
              <Inline
                key={run.id}
                alignBlock="center"
                space="space.200"
                spread="space-between"
              >
                <Stack space="space.050">
                  <Text weight="semibold">
                    {String(
                      steps.find((step) => step.id === run.workflow_step_id)
                        ?.config.title ?? "Workflow step",
                    )}
                  </Text>
                  <Text
                    size="small"
                    color={
                      run.error ? "color.text.danger" : "color.text.subtle"
                    }
                  >
                    {run.error
                      ? JSON.stringify(run.error)
                      : `${run.attempt_count} attempt${run.attempt_count === 1 ? "" : "s"}`}
                  </Text>
                </Stack>
                <StatusLozenge status={run.status} />
              </Inline>
            ))}
          </Stack>
        ) : (
          <Text size="small" color="color.text.subtle">
            No step runs for this execution.
          </Text>
        )}
      </Stack>
    </Box>
  );
}
