export type DayOfWeek = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
export const DAYS_OF_WEEK: DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export interface TimesheetRow {
  id: string;
  projectId: string | null;
  billingTypeId: string;
  /** Mirrors billing_types.requires_project — drives project-required validation */
  requiresProject: boolean;
  hours: Record<DayOfWeek, number>;
}

export interface TimesheetSettings {
  contractedHoursPerWeek: number;
  maximumHoursPerWeek: number;
  workWeekStart: DayOfWeek;
}

export type TimesheetStatus = "draft" | "submitted" | "approved" | "rejected";

export interface TimesheetCalculations {
  rowWeeklyTotals: Record<string, number>;
  dailyTotals: Record<DayOfWeek, number>;
  weeklyTotalHours: number;
}

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  rowId?: string;
  day?: DayOfWeek;
  field: string;
  message: string;
  severity: ValidationSeverity;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}
