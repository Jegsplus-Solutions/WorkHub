-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: Billing types  (new schema — name is the unique key)
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.billing_types (name, requires_project, sort_order, active)
values
  -- Leave / time-off (no project required)
  ('Stat Holiday',      false,  10, true),
  ('Vacation',          false,  20, true),
  ('Earned Day Off',    false,  30, true),
  ('Sick',              false,  40, true),
  ('Compassionate',     false,  50, true),
  ('Leave Without Pay', false,  60, true),
  ('Jury Duty',         false,  70, true),

  -- Billable / project types (project required)
  ('Regular Time',      true,  100, true),
  ('Overtime (1.5x)',   true,  110, true),
  ('Overtime (2x)',     true,  120, true),
  ('Training',          true,  130, true),
  ('Administrative',    true,  140, true)
on conflict (name) do update
  set requires_project = excluded.requires_project,
      sort_order       = excluded.sort_order,
      active           = excluded.active;

-- Seed sample projects
insert into public.projects (code, title, active)
values
  ('INT-001',  'Internal — General',        true),
  ('INT-002',  'Internal — Admin/Overhead', true),
  ('BD-001',   'Business Development',      true)
on conflict (code) do nothing;
