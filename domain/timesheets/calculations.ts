import type {
  DayOfWeek,
  TimesheetRow,
  TimesheetCalculations,
} from "./types";
import { DAYS_OF_WEEK } from "./types";

/**
 * Calculates the total hours for a single timesheet row across all days.
 * rowWeeklyTotal = sum(sun..sat)
 */
export function calcRowWeeklyTotal(row: TimesheetRow): number {
  return DAYS_OF_WEEK.reduce((sum, day) => {
    const h = row.hours[day];
    return sum + (typeof h === "number" && !isNaN(h) ? h : 0);
  }, 0);
}

/**
 * Calculates the total hours for each day across all rows.
 * dailyTotals[day] = sum(rows[day])
 */
export function calcDailyTotals(rows: TimesheetRow[]): Record<DayOfWeek, number> {
  const totals = Object.fromEntries(DAYS_OF_WEEK.map((d) => [d, 0])) as Record<DayOfWeek, number>;
  for (const row of rows) {
    for (const day of DAYS_OF_WEEK) {
      const h = row.hours[day];
      totals[day] += typeof h === "number" && !isNaN(h) ? h : 0;
    }
  }
  return totals;
}

/**
 * Calculates all timesheet totals:
 * - rowWeeklyTotals: per-row weekly total
 * - dailyTotals: per-day column totals
 * - weeklyTotalHours: sum(rowWeeklyTotals)
 */
export function calcTimesheetTotals(rows: TimesheetRow[]): TimesheetCalculations {
  const rowWeeklyTotals: Record<string, number> = {};
  let weeklyTotalHours = 0;

  for (const row of rows) {
    const rowTotal = calcRowWeeklyTotal(row);
    rowWeeklyTotals[row.id] = rowTotal;
    weeklyTotalHours += rowTotal;
  }

  const dailyTotals = calcDailyTotals(rows);

  return { rowWeeklyTotals, dailyTotals, weeklyTotalHours };
}

/**
 * Formats a decimal hours value to display string (e.g. 7.5 → "7:30")
 */
export function formatHours(hours: number): string {
  const h = Math.floor(Math.abs(hours));
  const m = Math.round((Math.abs(hours) - h) * 60);
  return `${hours < 0 ? "-" : ""}${h}:${String(m).padStart(2, "0")}`;
}

/**
 * Parses a time string like "7:30" or "7.5" into a decimal number.
 * Returns null if invalid.
 */
export function parseHoursInput(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "" || trimmed === "-") return null;

  // Colon format: "7:30"
  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10);
    const m = parseInt(colonMatch[2], 10);
    if (m >= 60) return null;
    return h + m / 60;
  }

  // Decimal format: "7.5" or "7"
  const decimal = parseFloat(trimmed);
  if (isNaN(decimal)) return null;
  return decimal;
}

/**
 * Returns an empty hours map for a new row.
 */
export function emptyHoursMap(): Record<DayOfWeek, number> {
  return Object.fromEntries(DAYS_OF_WEEK.map((d) => [d, 0])) as Record<DayOfWeek, number>;
}
