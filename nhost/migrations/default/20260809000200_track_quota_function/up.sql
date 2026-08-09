-- Hasura exposes only set-returning functions with a composite return type.
-- The previous TABLE return is a record type, so replace it without touching
-- organization data or quota history.
do $$
begin
  create type quota_reservation as (allowed boolean, used integer, quota_limit integer);
exception when duplicate_object then null;
end $$;

drop function if exists reserve_org_quota(uuid);
create function reserve_org_quota(p_org_id uuid) returns setof quota_reservation
language plpgsql security definer set search_path = public as $$
declare row organizations%rowtype;
begin
  select * into row from organizations where id = p_org_id for update;
  if row.id is null then return next (false, 0, 0)::quota_reservation; return; end if;
  if row.period_ends_at <= now() then
    update organizations set quota_used = 0, period_started_at = date_trunc('month', now()), period_ends_at = date_trunc('month', now()) + interval '1 month' where id = p_org_id returning * into row;
  end if;
  if row.quota_used >= row.quota_limit then return next (false, row.quota_used, row.quota_limit)::quota_reservation; return; end if;
  update organizations set quota_used = quota_used + 1, updated_at = now() where id = p_org_id returning * into row;
  return next (true, row.quota_used, row.quota_limit)::quota_reservation;
  return;
end $$;
