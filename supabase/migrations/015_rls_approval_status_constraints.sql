-- ============================================================
-- 015_rls_approval_status_constraints.sql
-- Fix: Manager policies now constrain allowed next-status values
-- Fix: Audit log insert enforces actor_user_id = auth.uid()
-- ============================================================

-- ── Timesheets: manager can only set manager_approved or manager_rejected ──
DROP POLICY IF EXISTS "timesheets_update_manager_submitted" ON public.timesheets;
CREATE POLICY "timesheets_update_manager_submitted"
ON public.timesheets FOR UPDATE
USING (
  manager_id = auth.uid()
  AND status = 'submitted'
)
WITH CHECK (
  manager_id = auth.uid()
  AND status IN ('manager_approved', 'manager_rejected')
);

-- ── Expense reports: manager can only set manager_approved or manager_rejected ──
DROP POLICY IF EXISTS "expense_reports_update_manager_submitted" ON public.expense_reports;
CREATE POLICY "expense_reports_update_manager_submitted"
ON public.expense_reports FOR UPDATE
USING (
  manager_id = auth.uid()
  AND status = 'submitted'
)
WITH CHECK (
  manager_id = auth.uid()
  AND status IN ('manager_approved', 'manager_rejected')
);

-- ── Leave requests: manager can only set manager_approved or manager_rejected ──
DROP POLICY IF EXISTS "leave_requests_update_manager" ON public.leave_requests;
CREATE POLICY "leave_requests_update_manager"
ON public.leave_requests FOR UPDATE
USING (
  manager_id = auth.uid()
  AND status = 'submitted'
)
WITH CHECK (
  manager_id = auth.uid()
  AND status IN ('manager_approved', 'manager_rejected')
);

-- ── Audit log: enforce actor_user_id = auth.uid() to prevent forgery ──
DROP POLICY IF EXISTS "audit_log_insert" ON public.audit_log;
CREATE POLICY "audit_log_insert"
ON public.audit_log FOR INSERT
WITH CHECK (
  actor_user_id = auth.uid()
);
