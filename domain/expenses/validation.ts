import type { ExpenseDay, ExpenseDayEntry } from "./types";
import { EXPENSE_DAYS } from "./types";

export interface ExpenseValidationIssue {
  day?: ExpenseDay;
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ExpenseValidationResult {
  valid: boolean;
  issues: ExpenseValidationIssue[];
  errors: ExpenseValidationIssue[];
  warnings: ExpenseValidationIssue[];
}

const NUMERIC_FIELDS: (keyof ExpenseDayEntry)[] = [
  "mileageKm",
  "mileageCostClaimed",
  "lodging",
  "breakfast",
  "lunch",
  "dinner",
  "other",
];

/**
 * Validates all expense day entries for a week.
 */
export function validateExpenseWeek(
  days: Record<ExpenseDay, ExpenseDayEntry>
): ExpenseValidationResult {
  const issues: ExpenseValidationIssue[] = [];

  for (const day of EXPENSE_DAYS) {
    const entry = days[day];

    for (const field of NUMERIC_FIELDS) {
      const val = entry[field] as number;
      if (typeof val === "number" && val < 0) {
        issues.push({
          day,
          field,
          message: `${field} cannot be negative on ${day}.`,
          severity: "error",
        });
      }
    }

    // If mileage km is entered but no claimed cost, warn
    if (
      entry.mileageKm > 0 &&
      entry.mileageCostClaimed === 0
    ) {
      issues.push({
        day,
        field: "mileageCostClaimed",
        message: `Mileage of ${entry.mileageKm}km entered on ${day} but claimed cost is $0. Did you mean to claim mileage?`,
        severity: "warning",
      });
    }

    // Lodging sanity check (over $500/night)
    if (entry.lodging > 500) {
      issues.push({
        day,
        field: "lodging",
        message: `Lodging of $${entry.lodging.toFixed(2)} on ${day} seems high. Please verify.`,
        severity: "warning",
      });
    }
  }

  // At least one day must have some expense data to submit
  const hasAnyData = EXPENSE_DAYS.some((day) => {
    const entry = days[day];
    return NUMERIC_FIELDS.some((field) => (entry[field] as number) > 0);
  });
  if (!hasAnyData) {
    issues.push({
      field: "all",
      message: "No expense data entered. Fill in at least one day before submitting.",
      severity: "error",
    });
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  return { valid: errors.length === 0, issues, errors, warnings };
}
