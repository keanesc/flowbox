"use client";

import { NhostClient, NhostProvider } from "@nhost/nextjs";
import { FlagsProvider } from "@atlaskit/flag";

const nhost = new NhostClient({
  subdomain: process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN ?? "hovdcnswjzhdxmqugctf",
  region: process.env.NEXT_PUBLIC_NHOST_REGION ?? "ap-south-1",
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FlagsProvider>
      <NhostProvider nhost={nhost}>{children}</NhostProvider>
    </FlagsProvider>
  );
}
