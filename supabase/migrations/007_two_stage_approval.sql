-- ============================================================
-- 007_two_stage_approval.sql
-- Step 1: Add new enum values only.
-- These must be committed before they can be referenced in policies.
-- See 008_two_stage_approval_policies.sql for the RLS changes.
-- ============================================================

ALTER TYPE work_status ADD VALUE IF NOT EXISTS 'manager_approved';
ALTER TYPE work_status ADD VALUE IF NOT EXISTS 'manager_rejected';
