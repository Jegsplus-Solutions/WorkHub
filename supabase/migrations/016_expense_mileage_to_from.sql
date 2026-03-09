-- ============================================================
-- 016_expense_mileage_rename.sql
-- Rename mileage_cost_claimed → mileage_cost.
-- Remove auto-calculated mileage rate — users enter costs directly.
-- travel_from / travel_to text columns already exist.
-- ============================================================

ALTER TABLE public.expense_entries
  RENAME COLUMN mileage_cost_claimed TO mileage_cost;
