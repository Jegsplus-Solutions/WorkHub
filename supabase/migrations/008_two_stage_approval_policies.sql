-- ============================================================
-- 008_two_stage_approval_policies.sql
-- Step 2: Update RLS policies to include the new enum values
-- added in 007_two_stage_approval.sql.
-- ============================================================

-- Employee can update timesheets in draft, rejected, OR manager_rejected state
DROP POLICY IF EXISTS "timesheets_update_employee_draft" ON public.timesheets;
CREATE POLICY "timesheets_update_employee_draft"
ON public.timesheets FOR UPDATE
USING (
  employee_id = auth.uid()
  AND status IN ('draft','rejected','manager_rejected')
)
WITH CHECK (
  employee_id = auth.uid()
  AND status IN ('draft','rejected','manager_rejected')
);

-- Timesheet rows: allow write when parent timesheet is in manager_rejected state
DROP POLICY IF EXISTS "timesheet_rows_employee_write" ON public.timesheet_rows;
CREATE POLICY "timesheet_rows_employee_write"
ON public.timesheet_rows FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.timesheets t
    WHERE t.id = timesheet_id
      AND t.employee_id = auth.uid()
      AND t.status IN ('draft','rejected','manager_rejected')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.timesheets t
    WHERE t.id = timesheet_id
      AND t.employee_id = auth.uid()
      AND t.status IN ('draft','rejected','manager_rejected')
  )
);

-- Employee can update expense reports in draft, rejected, OR manager_rejected state
DROP POLICY IF EXISTS "expense_reports_update_employee_draft" ON public.expense_reports;
CREATE POLICY "expense_reports_update_employee_draft"
ON public.expense_reports FOR UPDATE
USING (employee_id = auth.uid() AND status IN ('draft','rejected','manager_rejected'))
WITH CHECK (employee_id = auth.uid() AND status IN ('draft','rejected','manager_rejected'));

-- Expense entries: allow write when parent report is in manager_rejected state
DROP POLICY IF EXISTS "expense_entries_employee_write" ON public.expense_entries;
CREATE POLICY "expense_entries_employee_write"
ON public.expense_entries FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.expense_reports r
    WHERE r.id = report_id
      AND r.employee_id = auth.uid()
      AND r.status IN ('draft','rejected','manager_rejected')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.expense_reports r
    WHERE r.id = report_id
      AND r.employee_id = auth.uid()
      AND r.status IN ('draft','rejected','manager_rejected')
  )
);
