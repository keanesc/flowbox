import Button from "@atlaskit/button/new";
import Lozenge from "@atlaskit/lozenge";
import { Inline, Box, Text } from "@atlaskit/primitives/compiled";
import { styles } from "./ui-styles";

export default function WorkflowTabs({
  view,
  stepCount,
  runCount,
  syncLabel,
  onChange,
}: {
  view: "builder" | "runs";
  stepCount: number;
  runCount: number;
  syncLabel: string;
  onChange: (view: "builder" | "runs") => void;
}) {
  return (
    <Inline alignBlock="center" space="space.100" spread="space-between">
      <Inline
        alignBlock="center"
        space="space.100"
        role="tablist"
        aria-label="Workflow views"
      >
        <Button
          appearance={view === "builder" ? "primary" : "subtle"}
          isSelected={view === "builder"}
          onClick={() => onChange("builder")}
          role="tab"
          aria-selected={view === "builder"}
        >
          Builder <Lozenge>{stepCount}</Lozenge>
        </Button>
        <Button
          appearance={view === "runs" ? "primary" : "subtle"}
          isSelected={view === "runs"}
          onClick={() => onChange("runs")}
          role="tab"
          aria-selected={view === "runs"}
        >
          Runs <Lozenge>{runCount}</Lozenge>
        </Button>
      </Inline>
      <Box>
        <Text size="small" color="color.text.subtle">
          {syncLabel}
        </Text>
      </Box>
    </Inline>
  );
}
