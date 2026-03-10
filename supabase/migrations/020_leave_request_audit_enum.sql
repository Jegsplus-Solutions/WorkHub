-- 020_leave_request_audit_enum.sql
-- Add 'leave_request' to the audit_entity enum so audit_log
-- can track leave request create/update/submit/approve/reject.

ALTER TYPE audit_entity ADD VALUE IF NOT EXISTS 'leave_request';
