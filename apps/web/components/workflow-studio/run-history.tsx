import Button from "@atlaskit/button/new";
import DynamicTable from "@atlaskit/dynamic-table";
import EmptyState from "@atlaskit/empty-state";
import { Box, Stack, Text } from "@atlaskit/primitives/compiled";
import { StatusLozenge } from "./status-lozenge";
import { styles } from "./ui-styles";
import type { Run } from "./types";

const formatTime = (value: string) => new Date(value).toLocaleString();
const duration = (run: Run) =>
  run.completed_at
    ? `${Math.max(0, Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000))}s`
    : "—";

export default function RunHistory({
  runs,
  organizationName,
  onInspect,
}: {
  runs: Run[];
  organizationName: string;
  onInspect: (runId: string) => void;
}) {
  if (!runs.length) {
    return (
      <div className={styles.panel}>
        <EmptyState
          header="No runs yet"
          description="Run this workflow to create the first execution."
        />
      </div>
    );
  }
  return (
    <div className={styles.panel}>
      <Stack space="space.300">
        <Stack space="space.050">
          <Text size="small" color="color.text.subtle">
            Run history
          </Text>
          <Text weight="semibold">Recent workflow runs</Text>
          <Text size="small" color="color.text.subtle">
            Past executions stay scoped to {organizationName}.
          </Text>
        </Stack>
        <DynamicTable
          label="Recent workflow runs"
          head={{
            cells: [
              { key: "identifier", content: "Run identifier" },
              { key: "trigger", content: "Trigger type" },
              { key: "status", content: "Status" },
              { key: "started", content: "Started time" },
              { key: "duration", content: "Duration" },
              { key: "inspect", content: "" },
            ],
          }}
          rows={runs.map((run) => ({
            key: run.id,
            cells: [
              {
                key: "identifier",
                content: (
                  <Text weight="semibold">
                    {run.id.slice(0, 8).toUpperCase()}
                  </Text>
                ),
              },
              { key: "trigger", content: run.trigger_type },
              { key: "status", content: <StatusLozenge status={run.status} /> },
              { key: "started", content: formatTime(run.started_at) },
              { key: "duration", content: duration(run) },
              {
                key: "inspect",
                content: (
                  <Button
                    appearance="subtle"
                    spacing="compact"
                    onClick={() => onInspect(run.id)}
                  >
                    Inspect
                  </Button>
                ),
              },
            ],
          }))}
          rowsPerPage={8}
          isFixedSize
        />
      </Stack>
    </div>
  );
}
