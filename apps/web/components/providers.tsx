"use client";

import { NhostClient, NhostProvider } from "@nhost/nextjs";

const nhost = new NhostClient({
  subdomain: process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN ?? "demo",
  region: process.env.NEXT_PUBLIC_NHOST_REGION ?? "local",
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return <NhostProvider nhost={nhost}>{children}</NhostProvider>;
}
