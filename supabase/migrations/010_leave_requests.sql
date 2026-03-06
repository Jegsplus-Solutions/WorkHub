-- 010_leave_requests.sql
-- Leave request table, storage bucket, and RLS policies.

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  manager_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  leave_type text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  hours_per_day numeric(6,2) NOT NULL DEFAULT 8,
  total_hours numeric(8,2) NOT NULL DEFAULT 0,

  status work_status NOT NULL DEFAULT 'draft',
  employee_notes text,
  manager_comments text,
  attachment_path text,

  submitted_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT leave_dates_valid CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS leave_requests_employee_idx
  ON public.leave_requests(employee_id, start_date);
CREATE INDEX IF NOT EXISTS leave_requests_manager_idx
  ON public.leave_requests(manager_id, status);

-- updated_at trigger
DO $$ BEGIN
  CREATE TRIGGER leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Employees see own, managers see reports, finance/admin see all
CREATE POLICY "leave_requests_select"
ON public.leave_requests FOR SELECT
USING (
  employee_id = auth.uid()
  OR manager_id = auth.uid()
  OR public.is_finance()
  OR public.is_admin()
);

CREATE POLICY "leave_requests_insert_own"
ON public.leave_requests FOR INSERT
WITH CHECK (employee_id = auth.uid());

CREATE POLICY "leave_requests_update_employee"
ON public.leave_requests FOR UPDATE
USING (
  employee_id = auth.uid()
  AND status IN ('draft','rejected','manager_rejected')
)
WITH CHECK (
  employee_id = auth.uid()
  AND status IN ('draft','rejected','manager_rejected')
);

CREATE POLICY "leave_requests_update_manager"
ON public.leave_requests FOR UPDATE
USING (manager_id = auth.uid() AND status = 'submitted')
WITH CHECK (manager_id = auth.uid());

CREATE POLICY "leave_requests_update_finance_admin"
ON public.leave_requests FOR UPDATE
USING (public.is_finance() OR public.is_admin())
WITH CHECK (public.is_finance() OR public.is_admin());

CREATE POLICY "leave_requests_delete_draft"
ON public.leave_requests FOR DELETE
USING (employee_id = auth.uid() AND status = 'draft');

-- Storage bucket for leave attachments (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'leave-attachments',
  'leave-attachments',
  false,
  10485760,
  array['application/pdf','image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own leave attachment"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'leave-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users read own leave attachment"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'leave-attachments'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_manager()
      OR public.is_finance()
      OR public.is_admin()
    )
  );
