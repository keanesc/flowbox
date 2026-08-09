-- Deliberate no-op: this migration establishes production tables and may have
-- already recorded user workflow history. Restoring metadata is safe; dropping
-- tables or altering historical data is a separately reviewed operation.
select 1;
