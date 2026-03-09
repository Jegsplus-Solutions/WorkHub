import { describe, it, expect } from "vitest";
import {
  calcExpenseDayTotal,
  calcExpenseWeeklyTotals,
  emptyExpenseDayEntry,
  emptyExpenseDaysMap,
  formatCurrency,
} from "@/domain/expenses/calculations";
import { validateExpenseWeek } from "@/domain/expenses/validation";
import type { ExpenseDayEntry } from "@/domain/expenses/types";

function makeEntry(overrides: Partial<ExpenseDayEntry> = {}): ExpenseDayEntry {
  return { ...emptyExpenseDayEntry(), ...overrides };
}

// ─── calcExpenseDayTotal ──────────────────────────────────────────────────────

describe("calcExpenseDayTotal", () => {
  it("returns zeros for an empty entry", () => {
    const result = calcExpenseDayTotal(emptyExpenseDayEntry());
    expect(result.dailyTotal).toBe(0);
    expect(result.totalMeals).toBe(0);
  });

  it("includes mileageCost in dailyTotal", () => {
    const entry = makeEntry({ mileageCost: 50 });
    const result = calcExpenseDayTotal(entry);
    expect(result.dailyTotal).toBe(50);
  });

  it("calculates dailyTotal = mileageCost + lodging + meals + other", () => {
    const entry = makeEntry({
      mileageCost: 50,
      lodging: 120,
      breakfast: 12,
      lunch: 15,
      dinner: 30,
      other: 25,
    });
    const result = calcExpenseDayTotal(entry);
    expect(result.totalMeals).toBe(57);
    expect(result.dailyTotal).toBe(50 + 120 + 57 + 25);
  });

  it("km field does not affect dailyTotal", () => {
    const entry = makeEntry({ mileageKm: 200, mileageCost: 40 });
    const result = calcExpenseDayTotal(entry);
    expect(result.dailyTotal).toBe(40);
  });
});

// ─── calcExpenseWeeklyTotals ──────────────────────────────────────────────────

describe("calcExpenseWeeklyTotals", () => {
  it("returns all zeros for empty days", () => {
    const days = emptyExpenseDaysMap();
    const totals = calcExpenseWeeklyTotals(days);
    expect(totals.weeklyTotal).toBe(0);
    expect(totals.totalMileageKm).toBe(0);
    expect(totals.totalMileageCost).toBe(0);
  });

  it("sums totalMileageKm across all days", () => {
    const days = emptyExpenseDaysMap();
    days.mon = makeEntry({ mileageKm: 100 });
    days.tue = makeEntry({ mileageKm: 30 });
    const totals = calcExpenseWeeklyTotals(days);
    expect(totals.totalMileageKm).toBe(130);
  });

  it("sums totalMileageCost across all days", () => {
    const days = emptyExpenseDaysMap();
    days.mon = makeEntry({ mileageCost: 50 });
    const totals = calcExpenseWeeklyTotals(days);
    expect(totals.totalMileageCost).toBe(50);
  });

  it("weeklyTotal = mileageCost + lodging + meals + other across all days", () => {
    const days = emptyExpenseDaysMap();
    days.mon = makeEntry({ mileageCost: 50, lodging: 100, breakfast: 10, lunch: 15, dinner: 20, other: 5 });
    days.tue = makeEntry({ mileageCost: 30, lodging: 0, lunch: 12 });
    const totals = calcExpenseWeeklyTotals(days);
    // mon: 50+100+(10+15+20)+5 = 200
    // tue: 30+0+(12) = 42
    expect(totals.weeklyTotal).toBe(242);
    expect(totals.totalLodging).toBe(100);
    expect(totals.totalMeals).toBe(10 + 15 + 20 + 12);
  });
});

// ─── validateExpenseWeek ─────────────────────────────────────────────────────

describe("validateExpenseWeek", () => {
  it("rejects an empty week with no data", () => {
    const result = validateExpenseWeek(emptyExpenseDaysMap());
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/No expense data entered/);
  });

  it("errors on negative values", () => {
    const days = emptyExpenseDaysMap();
    days.mon = makeEntry({ mileageKm: -10 });
    const result = validateExpenseWeek(days);
    expect(result.valid).toBe(false);
    const err = result.errors.find((e) => e.day === "mon" && e.field === "mileageKm");
    expect(err).toBeDefined();
  });

  it("warns when mileage km entered but no cost", () => {
    const days = emptyExpenseDaysMap();
    days.mon = makeEntry({ mileageKm: 50, mileageCost: 0 });
    const result = validateExpenseWeek(days);
    const warn = result.warnings.find((w) => w.day === "mon" && w.field === "mileageCost");
    expect(warn).toBeDefined();
    expect(warn?.severity).toBe("warning");
  });

  it("does not warn when cost is provided", () => {
    const days = emptyExpenseDaysMap();
    days.mon = makeEntry({ mileageKm: 50, mileageCost: 30.50 });
    const result = validateExpenseWeek(days);
    const warn = result.warnings.find((w) => w.day === "mon" && w.field === "mileageCost");
    expect(warn).toBeUndefined();
  });

  it("warns on high lodging", () => {
    const days = emptyExpenseDaysMap();
    days.fri = makeEntry({ lodging: 600 });
    const result = validateExpenseWeek(days);
    const warn = result.warnings.find((w) => w.day === "fri" && w.field === "lodging");
    expect(warn).toBeDefined();
    expect(warn?.severity).toBe("warning");
  });
});

// ─── formatCurrency ──────────────────────────────────────────────────────────

describe("formatCurrency", () => {
  it("formats positive amounts", () => {
    expect(formatCurrency(123.45)).toContain("123.45");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toContain("0.00");
  });

  it("includes dollar sign", () => {
    expect(formatCurrency(50)).toMatch(/\$/);
  });
});
