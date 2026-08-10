import Button from "@atlaskit/button/new";
import EmptyState from "@atlaskit/empty-state";
import Skeleton from "@atlaskit/skeleton";
import { Box, Stack } from "@atlaskit/primitives/compiled";
import { Feedback } from "./feedback";
import { styles } from "./ui-styles";

export function WorkspaceState({
  kind,
  message,
  canCreate,
  onRetry,
  onCreate,
}: {
  kind: "loading" | "unavailable" | "empty";
  message?: string;
  canCreate?: boolean;
  onRetry?: () => void;
  onCreate?: () => void;
}) {
  if (kind === "loading") {
    return (
      <div className={styles.auth}>
        <Stack space="space.200" alignInline="start">
          <Skeleton width="16rem" height="2rem" isShimmering />
          <Skeleton width="24rem" height="1rem" isShimmering />
          <Skeleton width="20rem" height="1rem" isShimmering />
        </Stack>
      </div>
    );
  }
  if (kind === "unavailable") {
    return (
      <div className={styles.auth}>
        <div className={styles.authCard}>
          <Stack space="space.300">
            <Feedback title="Workspace unavailable">
              {message ?? "Organization data is unavailable."}
            </Feedback>
            <Button appearance="primary" onClick={onRetry}>
              Try again
            </Button>
          </Stack>
        </div>
      </div>
    );
  }
  return (
    <div className={styles.auth}>
      <EmptyState
        header="No workflow yet"
        description={
          canCreate
            ? "Create a workflow to begin building an execution path."
            : "Read-only access — ask an owner or editor to create a workflow."
        }
        primaryAction={
          canCreate ? (
            <Button appearance="primary" onClick={onCreate}>
              Create workflow
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
