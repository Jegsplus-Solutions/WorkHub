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

const RATE = 0.61;

function makeEntry(overrides: Partial<ExpenseDayEntry> = {}): ExpenseDayEntry {
  return { ...emptyExpenseDayEntry(), ...overrides };
}

// ─── calcExpenseDayTotal ──────────────────────────────────────────────────────

describe("calcExpenseDayTotal", () => {
  it("returns zeros for an empty entry", () => {
    const result = calcExpenseDayTotal(emptyExpenseDayEntry(), RATE);
    expect(result.suggestedMileageCost).toBe(0);
    expect(result.dailyTotal).toBe(0);
    expect(result.totalMeals).toBe(0);
  });

  it("calculates suggestedMileageCost = km * rate (display only)", () => {
    const entry = makeEntry({ mileageKm: 100, mileageCostClaimed: 50 });
    const result = calcExpenseDayTotal(entry, RATE);
    expect(result.suggestedMileageCost).toBeCloseTo(61); // 100 * 0.61
  });

  it("uses mileageCostClaimed (not suggested) in dailyTotal", () => {
    const entry = makeEntry({ mileageKm: 100, mileageCostClaimed: 50 });
    const result = calcExpenseDayTotal(entry, RATE);
    // dailyTotal should use 50, not 61
    expect(result.dailyTotal).toBe(50);
  });

  it("calculates dailyTotal = claimed + lodging + meals + other", () => {
    const entry = makeEntry({
      mileageCostClaimed: 50,
      lodging: 120,
      breakfast: 12,
      lunch: 15,
      dinner: 30,
      other: 25,
    });
    const result = calcExpenseDayTotal(entry, RATE);
    expect(result.totalMeals).toBe(57);
    expect(result.dailyTotal).toBe(50 + 120 + 57 + 25);
  });

  it("does NOT include suggestedMileageCost in dailyTotal", () => {
    // Even if km > claimed, suggested should not be added to the total
    const entry = makeEntry({ mileageKm: 200, mileageCostClaimed: 80 });
    const result = calcExpenseDayTotal(entry, RATE);
    expect(result.dailyTotal).toBe(80); // not 122 (200*0.61)
  });
});

// ─── calcExpenseWeeklyTotals ──────────────────────────────────────────────────

describe("calcExpenseWeeklyTotals", () => {
  it("returns all zeros for empty days", () => {
    const days = emptyExpenseDaysMap();
    const totals = calcExpenseWeeklyTotals(days, RATE);
    expect(totals.weeklyTotal).toBe(0);
    expect(totals.totalMileageKm).toBe(0);
    expect(totals.mileageCostAtRate).toBe(0);
  });

  it("sums totalMileageKm across all days", () => {
    const days = emptyExpenseDaysMap();
    days.mon = makeEntry({ mileageKm: 50 });
    days.tue = makeEntry({ mileageKm: 30 });
    const totals = calcExpenseWeeklyTotals(days, RATE);
    expect(totals.totalMileageKm).toBe(80);
  });

  it("calculates mileageCostAtRate = totalMileageKm * ratePerKm", () => {
    const days = emptyExpenseDaysMap();
    days.mon = makeEntry({ mileageKm: 100 });
    const totals = calcExpenseWeeklyTotals(days, RATE);
    expect(totals.mileageCostAtRate).toBeCloseTo(61);
  });

  it("mileageCostAtRate is NOT included in weeklyTotal", () => {
    const days = emptyExpenseDaysMap();
    // 100km at $0.61/km = $61 suggested, but we claim $50
    days.mon = makeEntry({ mileageKm: 100, mileageCostClaimed: 50 });
    const totals = calcExpenseWeeklyTotals(days, RATE);
    expect(totals.weeklyTotal).toBe(50); // not 61
  });

  it("weeklyTotal = claimed + lodging + meals + other across all days", () => {
    const days = emptyExpenseDaysMap();
    days.mon = makeEntry({ mileageCostClaimed: 50, lodging: 100, breakfast: 10, lunch: 15, dinner: 20, other: 5 });
    days.tue = makeEntry({ mileageCostClaimed: 30, lodging: 0, lunch: 12 });
    const totals = calcExpenseWeeklyTotals(days, RATE);
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

  it("warns when mileage km entered but no claimed cost", () => {
    const days = emptyExpenseDaysMap();
    days.mon = makeEntry({ mileageKm: 50, mileageCostClaimed: 0 });
    const result = validateExpenseWeek(days);
    const warn = result.warnings.find((w) => w.day === "mon" && w.field === "mileageCostClaimed");
    expect(warn).toBeDefined();
    expect(warn?.severity).toBe("warning");
  });

  it("does not warn when claimed cost matches", () => {
    const days = emptyExpenseDaysMap();
    days.mon = makeEntry({ mileageKm: 50, mileageCostClaimed: 30.50 });
    const result = validateExpenseWeek(days);
    const warn = result.warnings.find((w) => w.day === "mon" && w.field === "mileageCostClaimed");
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
