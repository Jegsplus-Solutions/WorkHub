import type {
  TimesheetRow,
  TimesheetSettings,
  ValidationResult,
  ValidationIssue,
  DayOfWeek,
} from "./types";
import { DAYS_OF_WEEK } from "./types";
import { calcTimesheetTotals } from "./calculations";

/**
 * Validates all rows of a timesheet week.
 * Returns structured issues with severity (error | warning).
 */
export function validateTimesheet(
  rows: TimesheetRow[],
  settings: TimesheetSettings
): ValidationResult {
  const issues: ValidationIssue[] = [];

  const { dailyTotals, weeklyTotalHours } = calcTimesheetTotals(rows);

  // ── Row-level validation ──────────────────────────────────────────────────
  for (const row of rows) {
    // Project required when billing type has requires_project = true
    if (row.requiresProject && !row.projectId) {
      issues.push({
        rowId: row.id,
        field: "projectId",
        message: "A project must be selected for this billing type.",
        severity: "error",
      });
    }

    // Hours must be >= 0
    for (const day of DAYS_OF_WEEK) {
      const h = row.hours[day];
      if (typeof h === "number" && h < 0) {
        issues.push({
          rowId: row.id,
          day,
          field: "hours",
          message: `Hours cannot be negative (day: ${day}).`,
          severity: "error",
        });
      }
    }
  }

  // ── Daily totals validation ───────────────────────────────────────────────
  for (const day of DAYS_OF_WEEK) {
    if (dailyTotals[day] > 24) {
      issues.push({
        day,
        field: "dailyTotal",
        message: `Total hours on ${day} (${dailyTotals[day].toFixed(2)}) exceeds 24 hours.`,
        severity: "error",
      });
    }
  }

  // ── Weekly totals validation ──────────────────────────────────────────────
  if (weeklyTotalHours > settings.maximumHoursPerWeek) {
    issues.push({
      field: "weeklyTotal",
      message: `Weekly total (${weeklyTotalHours.toFixed(2)}h) exceeds maximum allowed (${settings.maximumHoursPerWeek}h).`,
      severity: "error",
    });
  }

  if (weeklyTotalHours < settings.contractedHoursPerWeek && weeklyTotalHours > 0) {
    issues.push({
      field: "weeklyTotal",
      message: `Weekly total (${weeklyTotalHours.toFixed(2)}h) is below contracted hours (${settings.contractedHoursPerWeek}h).`,
      severity: "warning",
    });
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  return {
    valid: errors.length === 0,
    issues,
    errors,
    warnings,
  };
}

/**
 * Validates a single hour value.
 * Returns null if valid, otherwise an error message.
 */
export function validateHoursInput(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (value < 0) return "Hours cannot be negative";
  if (value > 24) return "Cannot log more than 24 hours in a single cell";
  return null;
}
