export const LEAVE_TYPES = [
  "Vacation",
  "Sick",
  "Compassionate",
  "Leave Without Pay",
  "Jury Duty",
  "Earned Day Off",
  "Stat Holiday",
  "Other",
] as const;

export type LeaveType = (typeof LEAVE_TYPES)[number];

export type LeaveStatus =
  | "draft"
  | "submitted"
  | "manager_approved"
  | "manager_rejected"
  | "approved"
  | "rejected";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  managerId: string | null;
  leaveType: string;
  startDate: string;
  endDate: string;
  hoursPerDay: number;
  totalHours: number;
  status: LeaveStatus;
  employeeNotes: string | null;
  managerComments: string | null;
  attachmentPath: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
}
