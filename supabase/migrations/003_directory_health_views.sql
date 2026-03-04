-- ============================================================
-- Directory Health Views
-- ============================================================

-- 1) Profiles missing email or azure_user_id
create or replace view public.v_directory_missing_identity as
select
  p.id as user_id,
  p.display_name,
  p.email,
  p.azure_user_id,
  p.department,
  p.job_title,
  p.employee_number,
  p.updated_at
from public.profiles p
where (p.email is null or p.email = '')
   or (p.azure_user_id is null or p.azure_user_id = '');

-- 2) Employees missing a manager (only synced profiles)
create or replace view public.v_directory_missing_manager as
select
  p.id as employee_id,
  p.display_name as employee_name,
  p.email as employee_email,
  p.department,
  p.job_title,
  em.manager_id,
  p.updated_at
from public.profiles p
left join public.employee_manager em on em.employee_id = p.id
where em.manager_id is null
  and (p.azure_user_id is not null and p.azure_user_id <> '');

-- 3) Duplicate employee numbers
create or replace view public.v_directory_duplicate_employee_number as
select
  employee_number,
  count(*) as occurrences,
  array_agg(p.id) as user_ids,
  array_agg(coalesce(p.display_name, p.email)) as names_or_emails
from public.profiles p
where p.employee_number is not null and p.employee_number <> ''
group by employee_number
having count(*) > 1;

-- 4) People who have direct reports but lack the manager role
create or replace view public.v_directory_managers_without_role as
select
  m.id as manager_id,
  m.display_name as manager_name,
  m.email as manager_email,
  count(em.employee_id) as direct_reports_count
from public.employee_manager em
join public.profiles m on m.id = em.manager_id
left join public.user_roles ur on ur.user_id = m.id and ur.role = 'manager'
where em.manager_id is not null
group by m.id, m.display_name, m.email
having count(em.employee_id) > 0
   and max(case when ur.role = 'manager' then 1 else 0 end) = 0;

-- 5) Summary metrics view
create or replace view public.v_directory_health_metrics as
select
  (select count(*) from public.profiles)                                                                                     as total_profiles,
  (select count(*) from public.profiles where azure_user_id is not null and azure_user_id <> '')                             as profiles_with_azure_id,
  (select count(*) from public.profiles where email is not null and email <> '')                                             as profiles_with_email,
  (select count(*) from public.employee_manager where manager_id is not null)                                                as employees_with_manager,
  (select count(*) from public.v_directory_missing_identity)                                                                 as missing_identity_count,
  (select count(*) from public.v_directory_missing_manager)                                                                  as missing_manager_count,
  (select count(*) from public.v_directory_duplicate_employee_number)                                                        as duplicate_employee_number_count,
  (select count(*) from public.v_directory_managers_without_role)                                                            as managers_without_role_count;
