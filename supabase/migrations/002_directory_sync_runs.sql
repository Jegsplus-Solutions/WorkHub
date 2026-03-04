-- Directory sync run history
create table if not exists public.directory_sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('running', 'success', 'failed')),

  actor_user_id uuid references public.profiles(id) on delete set null,

  users_fetched int not null default 0,
  profiles_updated int not null default 0,
  manager_links_upserted int not null default 0,
  role_grants_upserted int not null default 0,
  roles_removed int not null default 0,

  error text
);

create index if not exists directory_sync_runs_started_at_idx
  on public.directory_sync_runs(started_at desc);

alter table public.directory_sync_runs enable row level security;

drop policy if exists "directory_sync_runs_select" on public.directory_sync_runs;
create policy "directory_sync_runs_select"
on public.directory_sync_runs for select
using (public.is_admin() or public.is_finance());

drop policy if exists "directory_sync_runs_admin_write" on public.directory_sync_runs;
create policy "directory_sync_runs_admin_write"
on public.directory_sync_runs for all
using (public.is_admin())
with check (public.is_admin());
