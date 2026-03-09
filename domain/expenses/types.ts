/** Mon–Sat only (day_index 0-5 in expense_entries table; no Sunday) */
export type ExpenseDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export const EXPENSE_DAYS: ExpenseDay[] = [
  "mon", "tue", "wed", "thu", "fri", "sat",
];

/** Maps ExpenseDay to day_index stored in expense_entries */
export const DAY_INDEX: Record<ExpenseDay, number> = {
  mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5,
};

export interface ExpenseDayEntry {
  /** Location traveled from */
  travelFrom: string;
  /** Location traveled to */
  travelTo: string;
  /** Total kilometres driven */
  mileageKm: number;
  /** Mileage cost entered directly by user */
  mileageCost: number;
  lodging: number;
  breakfast: number;
  lunch: number;
  dinner: number;
  other: number;
  notes: string;
  otherNote?: string;
}

export type ExpenseStatus = "draft" | "submitted" | "approved" | "rejected";

export interface ExpenseDayTotal {
  /** dailyTotal = mileageCost + lodging + meals + other */
  dailyTotal: number;
  totalMeals: number;
}

export interface ExpenseWeeklyTotals {
  totalMileageKm: number;
  totalMileageCost: number;
  totalLodging: number;
  totalMeals: number;
  totalOther: number;
  /** weeklyTotal = totalMileageCost + totalLodging + totalMeals + totalOther */
  weeklyTotal: number;
  dayTotals: Record<ExpenseDay, ExpenseDayTotal>;
}
