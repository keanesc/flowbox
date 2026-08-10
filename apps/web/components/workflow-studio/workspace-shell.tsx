import Avatar from "@atlaskit/avatar";
import Button from "@atlaskit/button/new";
import Select from "@atlaskit/select";
import ProgressBar from "@atlaskit/progress-bar";
import ListChecklistIcon from "@atlaskit/icon/core/list-checklist";
import ClockIcon from "@atlaskit/icon/core/clock";
import LogOutIcon from "@atlaskit/icon/core/log-out";
import { Box, Inline, Stack, Text } from "@atlaskit/primitives/compiled";
import RelayRoomLogo from "./relay-room-logo";
import { styles } from "./ui-styles";
import type { Organization, Role } from "./types";

type OrganizationOption = { label: string; value: string; role: Role };

export default function WorkspaceShell({
  children,
  organization,
  memberships,
  orgId,
  role,
  userName,
  view,
  workflowCount,
  subscription,
  onOrganizationChange,
  onViewChange,
  onSignOut,
}: {
  children: React.ReactNode;
  organization: Organization;
  memberships: OrganizationOption[];
  orgId?: string;
  role: Role;
  userName: string;
  view: "builder" | "runs";
  workflowCount: number;
  subscription: "connecting" | "live" | "disconnected";
  onOrganizationChange: (id: string) => void;
  onViewChange: (view: "builder" | "runs") => void;
  onSignOut: () => void;
}) {
  const used = organization.quota_limit
    ? Math.min(1, organization.quota_used / organization.quota_limit)
    : 0;
  return (
    <Box xcss={styles.shell}>
      <Box as="aside" xcss={styles.sidebar}>
        <Stack space="space.400">
          <RelayRoomLogo />
          <Stack space="space.100">
            <Text size="small" color="color.text.subtle">
              Organization
            </Text>
            {memberships.length > 1 ? (
              <Select<OrganizationOption>
                inputId="organization-select"
                aria-label="Select organization"
                value={memberships.find((item) => item.value === orgId)}
                options={memberships}
                onChange={(option) =>
                  option && onOrganizationChange(option.value)
                }
                formatOptionLabel={(option) =>
                  `${option.label} · ${option.role}`
                }
              />
            ) : (
              <Inline alignBlock="center" space="space.100">
                <Avatar
                  appearance="square"
                  name={organization.name}
                  size="small"
                />
                <Stack space="space.0">
                  <Text weight="semibold">{organization.name}</Text>
                  <Text size="small" color="color.text.subtle">
                    {role}
                  </Text>
                </Stack>
              </Inline>
            )}
          </Stack>
          <Stack
            space="space.100"
            role="navigation"
            aria-label="Workspace navigation"
          >
            <Button
              appearance={view === "builder" ? "primary" : "subtle"}
              spacing="compact"
              shouldFitContainer
              isSelected={view === "builder"}
              iconBefore={ListChecklistIcon}
              onClick={() => onViewChange("builder")}
            >
              <Inline spread="space-between" grow="fill">
                <span>Workflows</span>
                <Text color="color.text.subtle">{workflowCount}</Text>
              </Inline>
            </Button>
            <Button
              appearance={view === "runs" ? "primary" : "subtle"}
              spacing="compact"
              shouldFitContainer
              isSelected={view === "runs"}
              iconBefore={ClockIcon}
              onClick={() => onViewChange("runs")}
            >
              Run history
            </Button>
          </Stack>
        </Stack>
        <Stack xcss={styles.footer} space="space.300">
          <Stack space="space.100">
            <Inline alignBlock="center" spread="space-between">
              <Text size="small" color="color.text.subtle">
                Monthly usage
              </Text>
              <Text weight="semibold">
                {organization.quota_used} / {organization.quota_limit}
              </Text>
            </Inline>
            <ProgressBar
              ariaLabel={`Used ${organization.quota_used} of ${organization.quota_limit} workflow runs`}
              value={used}
            />
            <Text size="small" color="color.text.subtle">
              {Math.max(0, organization.quota_limit - organization.quota_used)}{" "}
              runs remaining
            </Text>
          </Stack>
          <Inline alignBlock="center" space="space.100" spread="space-between">
            <Inline alignBlock="center" space="space.100">
              <Avatar name={userName} size="small" />
              <Text size="small">{userName}</Text>
            </Inline>
            <Button
              appearance="subtle"
              spacing="compact"
              iconBefore={LogOutIcon}
              onClick={onSignOut}
              aria-label="Sign out"
            >
              Sign out
            </Button>
          </Inline>
          <Inline alignBlock="center" space="space.100">
            <Text size="small" color="color.text.subtle">
              Updates
            </Text>
            <Text
              size="small"
              color={
                subscription === "live"
                  ? "color.text.success"
                  : "color.text.subtle"
              }
            >
              {subscription === "live"
                ? "Live"
                : subscription === "connecting"
                  ? "Connecting"
                  : "Refresh fallback"}
            </Text>
          </Inline>
        </Stack>
      </Box>
      <Box as="main" xcss={styles.main}>
        {children}
      </Box>
    </Box>
  );
}
