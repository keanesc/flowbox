-- Hasura can track set-returning functions only when they return an actual
-- table type. Return the updated organization row; no quota data is changed.
drop function if exists reserve_org_quota(uuid);
create function reserve_org_quota(p_org_id uuid) returns setof organizations
language plpgsql security definer set search_path = public as $$
declare row organizations%rowtype;
begin
  select * into row from organizations where id = p_org_id for update;
  if row.id is null then return; end if;
  if row.period_ends_at <= now() then
    update organizations set quota_used = 0, period_started_at = date_trunc('month', now()), period_ends_at = date_trunc('month', now()) + interval '1 month' where id = p_org_id returning * into row;
  end if;
  if row.quota_used >= row.quota_limit then return; end if;
  update organizations set quota_used = quota_used + 1, updated_at = now() where id = p_org_id returning * into row;
  return next row;
  return;
end $$;
