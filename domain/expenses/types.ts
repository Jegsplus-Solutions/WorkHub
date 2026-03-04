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
  /** Kilometres driven (used to calculate suggested mileage cost) */
  mileageKm: number;
  /** Actual mileage cost claimed by employee (may differ from suggested) */
  mileageCostClaimed: number;
  lodging: number;
  breakfast: number;
  lunch: number;
  dinner: number;
  other: number;
  notes: string;
  travelFrom?: string;
  travelTo?: string;
  otherNote?: string;
}

export type ExpenseStatus = "draft" | "submitted" | "approved" | "rejected";

export interface ExpenseDayTotal {
  /** suggestedMileageCost = mileageKm * ratePerKm (display only, not in totals) */
  suggestedMileageCost: number;
  /** dailyTotal = mileageCostClaimed + lodging + meals + other */
  dailyTotal: number;
  totalMeals: number;
}

export interface ExpenseWeeklyTotals {
  totalMileageKm: number;
  totalMileageCostClaimed: number;
  /** mileageCostAtRate = totalMileageKm * ratePerKm (display only, not in grand total) */
  mileageCostAtRate: number;
  totalLodging: number;
  totalMeals: number;
  totalOther: number;
  /** weeklyTotal = totalMileageCostClaimed + totalLodging + totalMeals + totalOther */
  weeklyTotal: number;
  dayTotals: Record<ExpenseDay, ExpenseDayTotal>;
}

export interface MileageRateConfig {
  ratePerKm: number;
  year: number;
}
