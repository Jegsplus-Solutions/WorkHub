-- ============================================================
-- 017_app_config.sql
-- Stores Microsoft 365 / Entra ID configuration in the database.
-- Admins manage via UI; Netlify functions read via service role.
-- ============================================================

-- Add 'app_config' to the audit_entity enum
ALTER TYPE audit_entity ADD VALUE IF NOT EXISTS 'app_config';

CREATE TABLE IF NOT EXISTS public.app_config (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL DEFAULT '',
  is_secret   BOOLEAN NOT NULL DEFAULT FALSE,
  label       TEXT NOT NULL DEFAULT '',
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Auto-update timestamp (reuses existing trigger function)
DO $$ BEGIN
  CREATE TRIGGER app_config_updated_at
  BEFORE UPDATE ON public.app_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS: admin-only read/write (service role bypasses for Netlify functions)
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_config_admin_select" ON public.app_config
  FOR SELECT USING (public.is_admin());

CREATE POLICY "app_config_admin_insert" ON public.app_config
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "app_config_admin_update" ON public.app_config
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "app_config_admin_delete" ON public.app_config
  FOR DELETE USING (public.is_admin());

-- Seed config keys with empty values (admin fills via UI)
INSERT INTO public.app_config (key, value, is_secret, label, description) VALUES
  ('azure_tenant_id',          '', FALSE, 'Azure Tenant ID',       'Microsoft Entra tenant ID (GUID)'),
  ('azure_client_id',          '', FALSE, 'Azure Client ID',       'App registration client ID (GUID)'),
  ('azure_client_secret',      '', TRUE,  'Azure Client Secret',   'App registration client secret value'),
  ('azure_group_admins',       '', FALSE, 'Admin Group ID',        'Entra security group for admin role'),
  ('azure_group_managers',     '', FALSE, 'Manager Group ID',      'Entra security group for manager role'),
  ('azure_group_finance',      '', FALSE, 'Finance Group ID',      'Entra security group for finance role (optional)'),
  ('sharepoint_site_id',       '', FALSE, 'SharePoint Site ID',    'SharePoint site ID for exports'),
  ('sharepoint_drive_id',      '', FALSE, 'SharePoint Drive ID',   'Document library drive ID'),
  ('sharepoint_payroll_folder','', FALSE, 'Payroll Folder',        'Folder path (default: Payroll/Exports)')
ON CONFLICT (key) DO NOTHING;
