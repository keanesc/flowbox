-- notification_deliveries is a durable outbox. The Hasura Event Trigger on
-- inserts delivers these records asynchronously, so workflow execution never
-- needs to hold a provider connection open.
alter table notification_deliveries
  add column if not exists payload jsonb not null default '{}'::jsonb;

create index if not exists notification_deliveries_queued_idx
  on notification_deliveries (status, created_at);
