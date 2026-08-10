import Lozenge from "@atlaskit/lozenge";
import type { Status } from "./types";

const statusMeta: Record<
  Status,
  {
    label: string;
    appearance: "default" | "inprogress" | "moved" | "removed" | "success";
  }
> = {
  pending: { label: "Pending", appearance: "default" },
  running: { label: "Running", appearance: "inprogress" },
  completed: { label: "Completed", appearance: "success" },
  failed: { label: "Failed", appearance: "removed" },
  paused: { label: "Awaiting approval", appearance: "moved" },
  skipped: { label: "Skipped", appearance: "default" },
};

export function StatusLozenge({ status }: { status: Status }) {
  const meta = statusMeta[status];
  return <Lozenge appearance={meta.appearance}>{meta.label}</Lozenge>;
}
