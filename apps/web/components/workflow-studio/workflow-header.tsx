import Breadcrumbs, { BreadcrumbsItem } from "@atlaskit/breadcrumbs";
import Button from "@atlaskit/button/new";
import ButtonGroup from "@atlaskit/button/button-group";
import PageHeader from "@atlaskit/page-header";
import Select from "@atlaskit/select";
import Textarea from "@atlaskit/textarea";
import TextField from "@atlaskit/textfield";
import { Box, Inline, Stack, Text } from "@atlaskit/primitives/compiled";
import { styles } from "./ui-styles";
import type { Role, Workflow } from "./types";

type WorkflowOption = { label: string; value: string };

export default function WorkflowHeader({
  workflow,
  workflows,
  role,
  canEdit,
  saving,
  running,
  onWorkflowChange,
  onChange,
  onNew,
  onSave,
  onRun,
}: {
  workflow: Workflow;
  workflows: Workflow[];
  role: Role;
  canEdit: boolean;
  saving: boolean;
  onWorkflowChange: (id: string) => void;
  onChange: (change: Partial<Pick<Workflow, "name" | "description">>) => void;
  onNew: () => void;
  onSave: () => void;
  onRun: () => void;
  running: boolean;
}) {
  const breadcrumbs = (
    <Breadcrumbs>
      <BreadcrumbsItem text="Workflows" key="workflows" />
      <BreadcrumbsItem text={workflow.name} key={workflow.id} />
    </Breadcrumbs>
  );
  const actions = (
    <ButtonGroup label="Workflow actions">
      {canEdit && <Button onClick={onNew}>New workflow</Button>}
      {canEdit && (
        <Button appearance="primary" isDisabled={saving} onClick={onSave}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      )}
      {canEdit && (
        <Button
          appearance="primary"
          isDisabled={running || workflow.id.startsWith("new-")}
          onClick={onRun}
        >
          {running ? "Starting…" : "Run workflow"}
        </Button>
      )}
    </ButtonGroup>
  );
  return (
    <Stack xcss={styles.header} space="space.300">
      <PageHeader breadcrumbs={breadcrumbs} actions={actions}>
        {canEdit ? (
          <Stack space="space.100">
            <TextField
              value={workflow.name}
              onChange={(event) =>
                onChange({ name: (event.target as HTMLInputElement).value })
              }
              aria-label="Workflow name"
              appearance="subtle"
            />
            <Textarea
              value={workflow.description}
              onChange={(event) =>
                onChange({ description: event.target.value })
              }
              aria-label="Workflow description"
              resize="auto"
            />
          </Stack>
        ) : (
          <Stack space="space.100">
            <Text as="span" size="small" color="color.text.subtle">
              {workflow.active ? "Active workflow" : "Draft workflow"} · {role}{" "}
              access
            </Text>
            <Text as="p" color="color.text.subtle">
              {workflow.description}
            </Text>
          </Stack>
        )}
      </PageHeader>
      <Inline alignBlock="end" space="space.300" shouldWrap>
        <Box>
          <label htmlFor="workflow-select">
            <Text as="span" size="small" color="color.text.subtle">
              Workflow
            </Text>
          </label>
          <Select<WorkflowOption>
            inputId="workflow-select"
            value={{ label: workflow.name, value: workflow.id }}
            options={workflows.map((item) => ({
              label: item.name,
              value: item.id,
            }))}
            onChange={(option) => option && onWorkflowChange(option.value)}
          />
        </Box>
        <Text size="small" color="color.text.subtle">
          Organization-scoped · {role}
        </Text>
      </Inline>
    </Stack>
  );
}
