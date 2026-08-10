import SectionMessage from "@atlaskit/section-message";
import { Box, Stack } from "@atlaskit/primitives/compiled";
import { styles } from "./ui-styles";

export function Feedback({
  appearance = "error",
  title,
  children,
}: {
  appearance?: "error" | "information" | "success" | "warning" | "discovery";
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <SectionMessage appearance={appearance} title={title}>
      {children}
    </SectionMessage>
  );
}

export function FeedbackStack({ children }: { children: React.ReactNode }) {
  return <Stack space="space.200">{children}</Stack>;
}

export function TransientFeedback({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className={styles.fieldSurface} role="status">
      <SectionMessage appearance="success">{message}</SectionMessage>
    </div>
  );
}
