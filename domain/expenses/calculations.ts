import type {
  ExpenseDay,
  ExpenseDayEntry,
  ExpenseDayTotal,
  ExpenseWeeklyTotals,
} from "./types";
import { EXPENSE_DAYS } from "./types";

/**
 * Calculates totals for a single expense day.
 *
 * dailyTotal = mileageCost + lodging + (breakfast + lunch + dinner) + other
 */
export function calcExpenseDayTotal(entry: ExpenseDayEntry): ExpenseDayTotal {
  const totalMeals =
    safe(entry.breakfast) + safe(entry.lunch) + safe(entry.dinner);
  const dailyTotal =
    safe(entry.mileageCost) +
    safe(entry.lodging) +
    totalMeals +
    safe(entry.other);

  return { dailyTotal, totalMeals };
}

/**
 * Calculates all weekly totals for an expense week.
 *
 * totalMileageKm = sum(mileageKm)
 * totalMileageCost = sum(mileageCost)
 * totalLodging = sum(lodging)
 * totalMeals = sum(breakfast + lunch + dinner)
 * totalOther = sum(other)
 * weeklyTotal = totalMileageCost + totalLodging + totalMeals + totalOther
 */
export function calcExpenseWeeklyTotals(
  days: Record<ExpenseDay, ExpenseDayEntry>
): ExpenseWeeklyTotals {
  let totalMileageKm = 0;
  let totalMileageCost = 0;
  let totalLodging = 0;
  let totalMeals = 0;
  let totalOther = 0;

  const dayTotals = {} as Record<ExpenseDay, ExpenseDayTotal>;

  for (const day of EXPENSE_DAYS) {
    const entry = days[day];
    const dt = calcExpenseDayTotal(entry);
    dayTotals[day] = dt;

    totalMileageKm += safe(entry.mileageKm);
    totalMileageCost += safe(entry.mileageCost);
    totalLodging += safe(entry.lodging);
    totalMeals += dt.totalMeals;
    totalOther += safe(entry.other);
  }

  const weeklyTotal =
    totalMileageCost + totalLodging + totalMeals + totalOther;

  return {
    totalMileageKm,
    totalMileageCost,
    totalLodging,
    totalMeals,
    totalOther,
    weeklyTotal,
    dayTotals,
  };
}

/**
 * Returns an empty expense day entry.
 */
export function emptyExpenseDayEntry(): ExpenseDayEntry {
  return {
    travelFrom: "",
    travelTo: "",
    mileageKm: 0,
    mileageCost: 0,
    lodging: 0,
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    other: 0,
    notes: "",
  };
}

/**
 * Returns a full empty days map for a new expense week.
 */
export function emptyExpenseDaysMap(): Record<ExpenseDay, ExpenseDayEntry> {
  return Object.fromEntries(
    EXPENSE_DAYS.map((d) => [d, emptyExpenseDayEntry()])
  ) as Record<ExpenseDay, ExpenseDayEntry>;
}

/**
 * Formats a currency value to a display string.
 */
export function formatCurrency(value: number, currency = "CAD"): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

function safe(v: number | null | undefined): number {
  if (typeof v !== "number" || isNaN(v)) return 0;
  return Math.max(0, v);
}
