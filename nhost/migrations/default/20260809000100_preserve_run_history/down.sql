-- Deliberate no-op: restoring a cascading foreign key could delete historical
-- step-run records. Any database rollback must be reviewed and run manually.
select 1;
