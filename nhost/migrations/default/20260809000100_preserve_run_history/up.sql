-- Saving a workflow replaces its definition. Keep historical runs inspectable when
-- an old step definition is removed by retaining the run row with a null step link.
alter table step_runs alter column workflow_step_id drop not null;
alter table step_runs drop constraint if exists step_runs_workflow_step_id_fkey;
alter table step_runs
  add constraint step_runs_workflow_step_id_fkey
  foreign key (workflow_step_id) references workflow_steps(id) on delete set null;
