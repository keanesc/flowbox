export interface EventStore { has(eventId: string): Promise<boolean>; add(eventId: string): Promise<void>; }
export async function once(eventId: string, store: EventStore, run: () => Promise<void>) {
  if (await store.has(eventId)) return false;
  await store.add(eventId);
  await run();
  return true;
}
