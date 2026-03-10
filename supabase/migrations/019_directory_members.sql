-- Stores all Entra ID users (full org directory, not just app users)
create table if not exists public.directory_members (
  id uuid primary key default gen_random_uuid(),
  azure_user_id text unique not null,
  email text,
  display_name text,
  job_title text,
  department text,
  office_location text,
  employee_id text,
  manager_azure_id text,
  profile_id uuid references public.profiles(id) on delete set null,
  synced_at timestamptz not null default now()
);

create index if not exists directory_members_email_idx on public.directory_members(email);
create index if not exists directory_members_department_idx on public.directory_members(department);
create index if not exists directory_members_manager_azure_id_idx on public.directory_members(manager_azure_id);

alter table public.directory_members enable row level security;

-- Admins and finance can view the full directory
drop policy if exists "directory_members_select" on public.directory_members;
create policy "directory_members_select"
on public.directory_members for select
using (public.is_admin() or public.is_finance());

-- Only service role writes (via sync)
drop policy if exists "directory_members_admin_write" on public.directory_members;
create policy "directory_members_admin_write"
on public.directory_members for all
using (public.is_admin())
with check (public.is_admin());
