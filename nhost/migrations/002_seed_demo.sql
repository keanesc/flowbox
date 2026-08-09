-- Replace these ids with Nhost auth user ids in a real project.
insert into organizations (id, name, quota_limit) values
  ('00000000-0000-0000-0000-0000000000a1', 'Northstar Studio', 50),
  ('00000000-0000-0000-0000-0000000000b1', 'B-side Labs', 25)
on conflict (id) do nothing;

insert into workflows (id, org_id, name, description, active) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1', 'Signal triage', 'Classify an incoming signal, enrich it, then pause for a human decision.', true)
on conflict (id) do nothing;
insert into workflow_steps (id, workflow_id, position, type, config) values
  ('00000000-0000-0000-0000-000000001001','00000000-0000-0000-0000-0000000000f1',0,'llm_call','{"prompt":"Classify this signal as approve or review: {{triggerInput}}"}'),
  ('00000000-0000-0000-0000-000000001003','00000000-0000-0000-0000-0000000000f1',1,'conditional_branch','{"expression":"contains approve","whenTrue":"fast-lane","whenFalse":"manual-review"}'),
  ('00000000-0000-0000-0000-000000001002','00000000-0000-0000-0000-0000000000f1',2,'http_request','{"method":"GET","url":"https://httpbin.org/json","timeoutMs":5000}'),
  ('00000000-0000-0000-0000-000000000104','00000000-0000-0000-0000-0000000000f1',3,'approval_gate','{"reason":"A teammate must confirm the recommended lane."}')
on conflict (id) do nothing;
insert into workflow_triggers (id, workflow_id, type, config) values
  ('00000000-0000-0000-0000-000000000f01','00000000-0000-0000-0000-0000000000f1','manual','{}'),
  ('00000000-0000-0000-0000-000000000f02','00000000-0000-0000-0000-0000000000f1','webhook','{"publicId":"northstar-signal"}'),
  ('00000000-0000-0000-0000-000000000f03','00000000-0000-0000-0000-0000000000f1','scheduled','{"cron":"0 * * * *"}'),
  ('00000000-0000-0000-0000-000000000f04','00000000-0000-0000-0000-0000000000f1','database_event','{"table":"watched_orders"}')
on conflict (id) do nothing;
