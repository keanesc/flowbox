create extension if not exists pgcrypto;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(), name text not null,
  quota_limit integer not null default 100 check (quota_limit > 0),
  quota_used integer not null default 0 check (quota_used >= 0),
  period_started_at timestamptz not null default date_trunc('month', now()),
  period_ends_at timestamptz not null default (date_trunc('month', now()) + interval '1 month'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists org_members (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null, role text not null check (role in ('owner','editor','viewer')),
  created_at timestamptz not null default now(), unique (org_id, user_id)
);
create table if not exists workflows (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  name text not null, description text not null default '', active boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists workflow_steps (
  id uuid primary key default gen_random_uuid(), workflow_id uuid not null references workflows(id) on delete cascade,
  position integer not null check (position >= 0), type text not null check (type in ('llm_call','http_request','db_write','notify','conditional_branch','approval_gate')),
  config jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (workflow_id, position)
);
create table if not exists workflow_triggers (
  id uuid primary key default gen_random_uuid(), workflow_id uuid not null references workflows(id) on delete cascade,
  type text not null check (type in ('manual','webhook','scheduled','database_event')), config jsonb not null default '{}'::jsonb,
  enabled boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists workflow_runs (
  id uuid primary key default gen_random_uuid(), workflow_id uuid not null references workflows(id) on delete cascade,
  trigger_type text not null, status text not null check (status in ('queued','running','paused','completed','failed')),
  initiated_by uuid, trigger_input jsonb not null default '{}'::jsonb, error jsonb,
  started_at timestamptz not null default now(), completed_at timestamptz
);
create table if not exists step_runs (
  id uuid primary key default gen_random_uuid(), workflow_run_id uuid not null references workflow_runs(id) on delete cascade,
  workflow_step_id uuid not null references workflow_steps(id) on delete cascade,
  status text not null check (status in ('pending','running','completed','failed','skipped','paused')) default 'pending',
  input jsonb, output jsonb, error jsonb, attempt_count integer not null default 0,
  approved_by uuid, approved_at timestamptz, started_at timestamptz, completed_at timestamptz, unique (workflow_run_id, workflow_step_id)
);
create table if not exists workflow_results (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  run_id uuid not null references workflow_runs(id) on delete cascade, value jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists notification_deliveries (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  run_id uuid not null references workflow_runs(id) on delete cascade, destination text, status text not null default 'queued',
  error text, attempts integer not null default 0, created_at timestamptz not null default now(), delivered_at timestamptz
);
create table if not exists watched_orders (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  external_ref text not null, amount numeric(12,2) not null default 0, created_at timestamptz not null default now()
);
create table if not exists processed_events (
  event_id text primary key, processed_at timestamptz not null default now()
);

create or replace view organization_monthly_usage as
select id as org_id, name, quota_used as used, quota_limit as limit,
  greatest(quota_limit - quota_used, 0) as remaining, period_started_at, period_ends_at
from organizations;

create or replace function reserve_org_quota(p_org_id uuid) returns table(allowed boolean, used integer, quota_limit integer)
language plpgsql security definer set search_path = public as $$
declare row organizations%rowtype;
begin
  select * into row from organizations where id = p_org_id for update;
  if row.id is null then return query select false, 0, 0; return; end if;
  if row.period_ends_at <= now() then
    update organizations set quota_used = 0, period_started_at = date_trunc('month', now()), period_ends_at = date_trunc('month', now()) + interval '1 month' where id = p_org_id returning * into row;
  end if;
  if row.quota_used >= row.quota_limit then return query select false, row.quota_used, row.quota_limit; return; end if;
  update organizations set quota_used = quota_used + 1, updated_at = now() where id = p_org_id returning * into row;
  return query select true, row.quota_used, row.quota_limit;
end $$;

create index if not exists org_members_user_org_idx on org_members(user_id, org_id);
create index if not exists workflows_org_idx on workflows(org_id);
create index if not exists workflow_steps_workflow_position_idx on workflow_steps(workflow_id, position);
create index if not exists workflow_triggers_public_id_idx on workflow_triggers using gin(config);
create index if not exists workflow_runs_workflow_status_idx on workflow_runs(workflow_id, status, started_at desc);
create index if not exists step_runs_run_status_idx on step_runs(workflow_run_id, status);
create index if not exists watched_orders_org_idx on watched_orders(org_id, created_at desc);
