-- Allow week_number=0 for month-level timesheet submissions
-- (0 = entire month, 1-5 = individual weeks)
ALTER TABLE public.timesheets
  DROP CONSTRAINT IF EXISTS timesheets_week_number_check;

ALTER TABLE public.timesheets
  ADD CONSTRAINT timesheets_week_number_check
  CHECK (week_number BETWEEN 0 AND 5);

-- Update the unique index to include week_number=0
DROP INDEX IF EXISTS timesheets_unique_period;
CREATE UNIQUE INDEX timesheets_unique_period
  ON public.timesheets(employee_id, year, month, week_number);
