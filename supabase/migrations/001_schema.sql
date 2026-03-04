-- ============================================================
-- WorkHub: Timesheets + Expenses
-- Supabase Postgres schema + RLS + seed data
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm"; -- full-text search on names

-- ------------------------------------------------------------
-- ENUMS
-- ------------------------------------------------------------
do $$ begin
  create type work_status as enum ('draft','submitted','approved','rejected');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type app_role as enum ('employee','manager','finance','admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type audit_entity as enum ('timesheet','expense_report','project','billing_type','hours_config','mileage_rate','directory_sync','sharepoint_sync');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type audit_action as enum ('create','update','delete','submit','approve','reject','sync_success','sync_failed');
exception when duplicate_object then null;
end $$;

-- ------------------------------------------------------------
-- CORE USER PROFILE + ROLES
-- ------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,

  -- Microsoft identity cache (optional but recommended)
  azure_tenant_id text,
  azure_user_id text,        -- Graph user object id (GUID as text)
  job_title text,
  department text,
  office_location text,
  employee_number text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists profiles_azure_user_id_idx on public.profiles(azure_user_id);
create index if not exists profiles_display_name_trgm on public.profiles using gin(display_name gin_trgm_ops);

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- employee -> manager mapping (directory sync writes/updates this)
create table if not exists public.employee_manager (
  employee_id uuid primary key references public.profiles(id) on delete cascade,
  manager_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists employee_manager_manager_idx on public.employee_manager(manager_id);

-- ------------------------------------------------------------
-- SETTINGS / MASTER DATA
-- ------------------------------------------------------------

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  title text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists projects_code_uq on public.projects(code);
create index if not exists projects_title_trgm on public.projects using gin(title gin_trgm_ops);

create table if not exists public.billing_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  requires_project boolean not null default false,
  sort_order int not null default 0,
  active boolean not null default true
);

create table if not exists public.hours_config (
  employee_id uuid primary key references public.profiles(id) on delete cascade,
  contracted_hours numeric(6,2) not null default 0,
  maximum_hours numeric(6,2) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.mileage_rate_config (
  employee_id uuid not null references public.profiles(id) on delete cascade,
  year int not null check (year >= 2000 and year <= 2100),
  rate_per_km numeric(10,4) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (employee_id, year)
);

-- Optional holidays table
create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date not null unique,
  name text not null
);

-- ------------------------------------------------------------
-- TIMESHEETS
-- ------------------------------------------------------------

create table if not exists public.timesheets (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  manager_id uuid references public.profiles(id) on delete set null,

  year int not null check (year >= 2000 and year <= 2100),
  month int not null check (month between 1 and 12),
  week_number int not null check (week_number between 1 and 5),

  status work_status not null default 'draft',
  employee_notes text,
  manager_comments text,

  submitted_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists timesheets_unique_period
  on public.timesheets(employee_id, year, month, week_number);

create index if not exists timesheets_manager_idx
  on public.timesheets(manager_id, status);

create index if not exists timesheets_status_submitted_at
  on public.timesheets(status, submitted_at);

create table if not exists public.timesheet_rows (
  id uuid primary key default gen_random_uuid(),
  timesheet_id uuid not null references public.timesheets(id) on delete cascade,
  billing_type_id uuid not null references public.billing_types(id) on delete restrict,
  project_id uuid references public.projects(id) on delete restrict,

  sun numeric(6,2) not null default 0,
  mon numeric(6,2) not null default 0,
  tue numeric(6,2) not null default 0,
  wed numeric(6,2) not null default 0,
  thu numeric(6,2) not null default 0,
  fri numeric(6,2) not null default 0,
  sat numeric(6,2) not null default 0,

  -- cached total (recomputed on save)
  weekly_total numeric(8,2) not null default 0
);

create index if not exists timesheet_rows_timesheet_idx on public.timesheet_rows(timesheet_id);

-- Auto-compute weekly_total
create or replace function public.timesheet_rows_set_weekly_total()
returns trigger language plpgsql as $$
begin
  new.weekly_total := new.sun + new.mon + new.tue + new.wed + new.thu + new.fri + new.sat;
  return new;
end;
$$;

do $$ begin
  create trigger timesheet_rows_weekly_total
  before insert or update on public.timesheet_rows
  for each row execute function public.timesheet_rows_set_weekly_total();
exception when duplicate_object then null;
end $$;

-- ------------------------------------------------------------
-- EXPENSES
-- ------------------------------------------------------------

create table if not exists public.expense_reports (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  manager_id uuid references public.profiles(id) on delete set null,

  year int not null check (year >= 2000 and year <= 2100),
  week_number text not null check (week_number ~ '^(0[1-9]|[1-4][0-9]|5[0-2])$'), -- "01".."52"
  week_beginning_date date not null,
  destination text,

  status work_status not null default 'draft',
  employee_notes text,
  manager_comments text,

  submitted_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists expense_reports_unique_period
  on public.expense_reports(employee_id, year, week_number);

create index if not exists expense_reports_manager_idx
  on public.expense_reports(manager_id, status);

create index if not exists expense_reports_status_submitted_at
  on public.expense_reports(status, submitted_at);

create table if not exists public.expense_entries (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.expense_reports(id) on delete cascade,

  day_index int not null check (day_index between 0 and 5), -- 0=Mon … 5=Sat
  entry_date date not null,

  travel_from text,
  travel_to text,

  mileage_km numeric(10,2) not null default 0,
  mileage_cost_claimed numeric(10,2) not null default 0,

  lodging_amount numeric(10,2) not null default 0,

  breakfast_amount numeric(10,2) not null default 0,
  lunch_amount numeric(10,2) not null default 0,
  dinner_amount numeric(10,2) not null default 0,

  other_amount numeric(10,2) not null default 0,
  other_note text
);

create unique index if not exists expense_entries_unique_day
  on public.expense_entries(report_id, day_index);

create index if not exists expense_entries_report_idx on public.expense_entries(report_id);

-- ------------------------------------------------------------
-- AUDIT + SYNC TRACKING
-- ------------------------------------------------------------

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  entity_type audit_entity not null,
  entity_id uuid,
  action audit_action not null,
  comment text,
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_entity_idx on public.audit_log(entity_type, entity_id);
create index if not exists audit_log_actor_idx on public.audit_log(actor_user_id, created_at);
create index if not exists audit_log_created_at_idx on public.audit_log(created_at desc);

create table if not exists public.sharepoint_sync (
  id uuid primary key default gen_random_uuid(),
  entity_type audit_entity not null check (entity_type in ('timesheet','expense_report')),
  entity_id uuid not null,
  sync_key text not null,
  last_synced_at timestamptz,
  last_status text, -- 'success'|'failed'
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(entity_type, entity_id),
  unique(sync_key)
);

-- ------------------------------------------------------------
-- UPDATED_AT triggers
-- ------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$ begin
  create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger hours_config_updated_at
  before update on public.hours_config
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger mileage_rate_updated_at
  before update on public.mileage_rate_config
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger timesheets_updated_at
  before update on public.timesheets
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger expense_reports_updated_at
  before update on public.expense_reports
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger sharepoint_sync_updated_at
  before update on public.sharepoint_sync
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

-- Auto-create profile + default employee role on first SSO login
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'employee')
  on conflict (user_id, role) do nothing;

  insert into public.hours_config (employee_id, contracted_hours, maximum_hours)
  values (new.id, 40, 60)
  on conflict (employee_id) do nothing;

  return new;
end;
$$;

do $$ begin
  create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
exception when duplicate_object then null;
end $$;

-- ------------------------------------------------------------
-- RBAC helper functions (SECURITY DEFINER)
-- ------------------------------------------------------------

create or replace function public.has_role(p_role app_role)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = p_role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$ select public.has_role('admin'); $$;

create or replace function public.is_finance()
returns boolean
language sql
security definer
set search_path = public
as $$ select public.has_role('finance') or public.has_role('admin'); $$;

create or replace function public.is_manager()
returns boolean
language sql
security definer
set search_path = public
as $$ select public.has_role('manager') or public.has_role('admin'); $$;

create or replace function public.is_manager_of(p_employee_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.employee_manager em
    where em.employee_id = p_employee_id
      and em.manager_id = auth.uid()
  ) or (select public.is_admin());
$$;

-- Returns all employee IDs managed by the current user
create or replace function public.my_reports()
returns setof uuid
language sql
security definer
set search_path = public
as $$
  select employee_id from public.employee_manager
  where manager_id = auth.uid();
$$;

-- Returns the highest role of the current user
create or replace function public.my_highest_role()
returns app_role
language sql
security definer
set search_path = public
as $$
  select case
    when exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')    then 'admin'::app_role
    when exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'finance')  then 'finance'::app_role
    when exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'manager')  then 'manager'::app_role
    else 'employee'::app_role
  end;
$$;

-- ------------------------------------------------------------
-- ENABLE RLS
-- ------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.employee_manager enable row level security;

alter table public.projects enable row level security;
alter table public.billing_types enable row level security;
alter table public.hours_config enable row level security;
alter table public.mileage_rate_config enable row level security;
alter table public.holidays enable row level security;

alter table public.timesheets enable row level security;
alter table public.timesheet_rows enable row level security;

alter table public.expense_reports enable row level security;
alter table public.expense_entries enable row level security;

alter table public.audit_log enable row level security;
alter table public.sharepoint_sync enable row level security;

-- ------------------------------------------------------------
-- RLS POLICIES
-- ------------------------------------------------------------

-- Profiles: users can read/update their own profile
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (id = auth.uid() or public.is_admin() or public.is_finance() or public.is_manager());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- user_roles: only admin can read/write roles
drop policy if exists "roles_admin_all" on public.user_roles;
create policy "roles_admin_all"
on public.user_roles for all
using (public.is_admin())
with check (public.is_admin());

-- employee_manager mapping: admin only (written by sync job using service role)
drop policy if exists "employee_manager_admin_all" on public.employee_manager;
create policy "employee_manager_admin_all"
on public.employee_manager for all
using (public.is_admin())
with check (public.is_admin());

-- Projects: readable by authenticated users, writable by admin
drop policy if exists "projects_select_all" on public.projects;
create policy "projects_select_all"
on public.projects for select
using (auth.role() = 'authenticated');

drop policy if exists "projects_admin_write" on public.projects;
create policy "projects_admin_write"
on public.projects for all
using (public.is_admin())
with check (public.is_admin());

-- Billing types: readable by all authenticated; writable by admin
drop policy if exists "billing_types_select_all" on public.billing_types;
create policy "billing_types_select_all"
on public.billing_types for select
using (auth.role() = 'authenticated');

drop policy if exists "billing_types_admin_write" on public.billing_types;
create policy "billing_types_admin_write"
on public.billing_types for all
using (public.is_admin())
with check (public.is_admin());

-- Hours config: employee can read own, admin/finance can read all; admin can write
drop policy if exists "hours_config_select" on public.hours_config;
create policy "hours_config_select"
on public.hours_config for select
using (
  employee_id = auth.uid()
  or public.is_finance()
  or public.is_admin()
);

drop policy if exists "hours_config_admin_write" on public.hours_config;
create policy "hours_config_admin_write"
on public.hours_config for all
using (public.is_admin())
with check (public.is_admin());

-- Mileage rate config: employee can read/write own; admin can read/write all
drop policy if exists "mileage_rate_select" on public.mileage_rate_config;
create policy "mileage_rate_select"
on public.mileage_rate_config for select
using (employee_id = auth.uid() or public.is_admin());

drop policy if exists "mileage_rate_write" on public.mileage_rate_config;
create policy "mileage_rate_write"
on public.mileage_rate_config for all
using (employee_id = auth.uid() or public.is_admin())
with check (employee_id = auth.uid() or public.is_admin());

-- Holidays: readable by all; writable by admin
drop policy if exists "holidays_select_all" on public.holidays;
create policy "holidays_select_all"
on public.holidays for select
using (auth.role() = 'authenticated');

drop policy if exists "holidays_admin_write" on public.holidays;
create policy "holidays_admin_write"
on public.holidays for all
using (public.is_admin())
with check (public.is_admin());

-- Timesheets: select own OR manager OR finance/admin
drop policy if exists "timesheets_select" on public.timesheets;
create policy "timesheets_select"
on public.timesheets for select
using (
  employee_id = auth.uid()
  or manager_id = auth.uid()
  or public.is_finance()
  or public.is_admin()
);

-- Timesheets: insert only by employee for self
drop policy if exists "timesheets_insert_own" on public.timesheets;
create policy "timesheets_insert_own"
on public.timesheets for insert
with check (employee_id = auth.uid());

-- Timesheets: employee updates only when draft/rejected
drop policy if exists "timesheets_update_employee_draft" on public.timesheets;
create policy "timesheets_update_employee_draft"
on public.timesheets for update
using (
  employee_id = auth.uid()
  and status in ('draft','rejected')
)
with check (
  employee_id = auth.uid()
  and status in ('draft','rejected')
);

-- Timesheets: manager updates only when submitted (approve/reject)
drop policy if exists "timesheets_update_manager_submitted" on public.timesheets;
create policy "timesheets_update_manager_submitted"
on public.timesheets for update
using (
  manager_id = auth.uid()
  and status = 'submitted'
)
with check (manager_id = auth.uid());

-- Timesheets: finance/admin can update
drop policy if exists "timesheets_update_finance_admin" on public.timesheets;
create policy "timesheets_update_finance_admin"
on public.timesheets for update
using (public.is_finance() or public.is_admin())
with check (public.is_finance() or public.is_admin());

-- Timesheets: delete only by employee when draft
drop policy if exists "timesheets_delete_employee_draft" on public.timesheets;
create policy "timesheets_delete_employee_draft"
on public.timesheets for delete
using (employee_id = auth.uid() and status = 'draft');

-- Timesheet rows: select follows parent timesheet access
drop policy if exists "timesheet_rows_select" on public.timesheet_rows;
create policy "timesheet_rows_select"
on public.timesheet_rows for select
using (
  exists (
    select 1 from public.timesheets t
    where t.id = timesheet_id
      and (
        t.employee_id = auth.uid()
        or t.manager_id = auth.uid()
        or public.is_finance()
        or public.is_admin()
      )
  )
);

-- Timesheet rows: employee write only when parent is draft/rejected
drop policy if exists "timesheet_rows_employee_write" on public.timesheet_rows;
create policy "timesheet_rows_employee_write"
on public.timesheet_rows for all
using (
  exists (
    select 1 from public.timesheets t
    where t.id = timesheet_id
      and t.employee_id = auth.uid()
      and t.status in ('draft','rejected')
  )
)
with check (
  exists (
    select 1 from public.timesheets t
    where t.id = timesheet_id
      and t.employee_id = auth.uid()
      and t.status in ('draft','rejected')
  )
);

-- Expense reports: select own OR manager OR finance/admin
drop policy if exists "expense_reports_select" on public.expense_reports;
create policy "expense_reports_select"
on public.expense_reports for select
using (
  employee_id = auth.uid()
  or manager_id = auth.uid()
  or public.is_finance()
  or public.is_admin()
);

-- Expense reports: insert own
drop policy if exists "expense_reports_insert_own" on public.expense_reports;
create policy "expense_reports_insert_own"
on public.expense_reports for insert
with check (employee_id = auth.uid());

-- Expense reports: employee update only when draft/rejected
drop policy if exists "expense_reports_update_employee_draft" on public.expense_reports;
create policy "expense_reports_update_employee_draft"
on public.expense_reports for update
using (employee_id = auth.uid() and status in ('draft','rejected'))
with check (employee_id = auth.uid() and status in ('draft','rejected'));

-- Expense reports: manager update only when submitted
drop policy if exists "expense_reports_update_manager_submitted" on public.expense_reports;
create policy "expense_reports_update_manager_submitted"
on public.expense_reports for update
using (manager_id = auth.uid() and status = 'submitted')
with check (manager_id = auth.uid());

-- Expense reports: finance/admin full update
drop policy if exists "expense_reports_update_finance_admin" on public.expense_reports;
create policy "expense_reports_update_finance_admin"
on public.expense_reports for update
using (public.is_finance() or public.is_admin())
with check (public.is_finance() or public.is_admin());

-- Expense reports: delete only when draft
drop policy if exists "expense_reports_delete_employee_draft" on public.expense_reports;
create policy "expense_reports_delete_employee_draft"
on public.expense_reports for delete
using (employee_id = auth.uid() and status = 'draft');

-- Expense entries: select follows parent report access
drop policy if exists "expense_entries_select" on public.expense_entries;
create policy "expense_entries_select"
on public.expense_entries for select
using (
  exists (
    select 1 from public.expense_reports r
    where r.id = report_id
      and (
        r.employee_id = auth.uid()
        or r.manager_id = auth.uid()
        or public.is_finance()
        or public.is_admin()
      )
  )
);

-- Expense entries: employee write only when parent is draft/rejected
drop policy if exists "expense_entries_employee_write" on public.expense_entries;
create policy "expense_entries_employee_write"
on public.expense_entries for all
using (
  exists (
    select 1 from public.expense_reports r
    where r.id = report_id
      and r.employee_id = auth.uid()
      and r.status in ('draft','rejected')
  )
)
with check (
  exists (
    select 1 from public.expense_reports r
    where r.id = report_id
      and r.employee_id = auth.uid()
      and r.status in ('draft','rejected')
  )
);

-- Audit log: employees see their own items' audit; managers/finance/admin see broader
drop policy if exists "audit_log_select" on public.audit_log;
create policy "audit_log_select"
on public.audit_log for select
using (
  public.is_finance()
  or public.is_admin()
  or actor_user_id = auth.uid()
);

-- Audit log: write via service role (admin bypass) or authenticated insert
drop policy if exists "audit_log_insert" on public.audit_log;
create policy "audit_log_insert"
on public.audit_log for insert
with check (auth.uid() is not null);

-- SharePoint sync table: finance/admin can see; admin writes (or service role)
drop policy if exists "sharepoint_sync_select" on public.sharepoint_sync;
create policy "sharepoint_sync_select"
on public.sharepoint_sync for select
using (public.is_finance() or public.is_admin());

drop policy if exists "sharepoint_sync_admin_write" on public.sharepoint_sync;
create policy "sharepoint_sync_admin_write"
on public.sharepoint_sync for all
using (public.is_admin())
with check (public.is_admin());
