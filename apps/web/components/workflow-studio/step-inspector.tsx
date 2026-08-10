import Button from "@atlaskit/button/new";
import ButtonGroup from "@atlaskit/button/button-group";
import { CodeBlock } from "@atlaskit/code";
import SectionMessage from "@atlaskit/section-message";
import { Box, Stack, Inline, Text } from "@atlaskit/primitives/compiled";
import StepFields from "./step-fields";
import { StatusLozenge } from "./status-lozenge";
import { Feedback } from "./feedback";
import { styles } from "./ui-styles";
import type {
  Organization,
  Role,
  Step,
  StepRun,
  Status,
  TypeMeta,
} from "./types";

export default function StepInspector({
  step,
  stepRun,
  organization,
  role,
  meta,
  status,
  approving,
  approveError,
  onChange,
  onMove,
  onRemove,
  onApprove,
  canMoveDown,
}: {
  step?: Step;
  stepRun?: StepRun;
  organization: Organization;
  role: Role;
  meta?: TypeMeta;
  status: Status;
  approving: boolean;
  approveError: string;
  onChange: (config: Record<string, unknown>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onApprove: () => void;
  canMoveDown: boolean;
}) {
  if (!step || !meta) {
    return (
      <div className={styles.panel}>
        <Text color="color.text.subtle">Choose a step to configure it.</Text>
      </div>
    );
  }
  return (
    <aside className={styles.panel}>
      <Stack space="space.300">
        <Inline alignBlock="center" spread="space-between">
          <Stack space="space.050">
            <Text size="small" color="color.text.subtle">
              Step {String(step.position + 1).padStart(2, "0")}
            </Text>
            <Text weight="semibold">{meta.label}</Text>
          </Stack>
          <StatusLozenge status={status} />
        </Inline>
        <StepFields
          step={step}
          readOnly={role === "viewer"}
          onChange={onChange}
        />
        {step.type === "approval_gate" && (
          <SectionMessage appearance="information" title="Approval required">
            Owners and editors in {organization.name} can approve this gate.
          </SectionMessage>
        )}
        {stepRun?.output && (
          <details>
            <summary>Run output</summary>
            <div className={styles.fieldSurface}>
              <CodeBlock
                language="json"
                showLineNumbers={false}
                text={JSON.stringify(stepRun.output, null, 2)}
              />
            </div>
          </details>
        )}
        {role !== "viewer" && (
          <Stack space="space.200">
            <ButtonGroup label="Step actions">
              <Button
                isDisabled={step.position === 0}
                onClick={() => onMove(-1)}
              >
                Move up
              </Button>
              <Button isDisabled={!canMoveDown} onClick={() => onMove(1)}>
                Move down
              </Button>
              <Button appearance="danger" onClick={onRemove}>
                Remove
              </Button>
            </ButtonGroup>
            {status === "paused" && (
              <>
                <Button
                  appearance="primary"
                  isDisabled={approving}
                  onClick={onApprove}
                  shouldFitContainer
                >
                  {approving ? "Approving…" : "Approve & continue"}
                </Button>
                {approveError && <Feedback>{approveError}</Feedback>}
              </>
            )}
          </Stack>
        )}
      </Stack>
    </aside>
  );
}
