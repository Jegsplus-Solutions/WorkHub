-- 009_timesheet_locations.sql
-- Add per-day location tracking to timesheet rows.

ALTER TABLE public.timesheet_rows
  ADD COLUMN IF NOT EXISTS sun_location text,
  ADD COLUMN IF NOT EXISTS mon_location text,
  ADD COLUMN IF NOT EXISTS tue_location text,
  ADD COLUMN IF NOT EXISTS wed_location text,
  ADD COLUMN IF NOT EXISTS thu_location text,
  ADD COLUMN IF NOT EXISTS fri_location text,
  ADD COLUMN IF NOT EXISTS sat_location text;
