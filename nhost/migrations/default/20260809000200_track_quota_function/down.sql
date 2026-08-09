-- Deliberate no-op: rollback is metadata restoration plus a separately reviewed
-- function change. Quota records and organization counters are never deleted.
select 1;
