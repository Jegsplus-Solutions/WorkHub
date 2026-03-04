/**
 * Integration tests: verifies the full calculation chain for realistic data.
 */
import { describe, it, expect } from "vitest";
import { calcTimesheetTotals } from "@/domain/timesheets/calculations";
import { validateTimesheet } from "@/domain/timesheets/validation";
import { calcExpenseWeeklyTotals } from "@/domain/expenses/calculations";
import { emptyHoursMap } from "@/domain/timesheets/calculations";
import { emptyExpenseDaysMap } from "@/domain/expenses/calculations";
import type { TimesheetRow, TimesheetSettings } from "@/domain/timesheets/types";
import type { ExpenseDayEntry, ExpenseDay } from "@/domain/expenses/types";

describe("Full timesheet week scenario", () => {
  it("calculates a normal 40-hour week correctly with no errors", () => {
    const settings: TimesheetSettings = {
      contractedHoursPerWeek: 40,
      maximumHoursPerWeek: 60,
      workWeekStart: "mon",
    };

    const rows: TimesheetRow[] = [
      {
        id: "r1",
        projectId: "proj-client",
        billingTypeId: "bt-reg",
        requiresProject: true,
        hours: { sun: 0, mon: 8, tue: 8, wed: 8, thu: 8, fri: 8, sat: 0 },
      },
      {
        id: "r2",
        projectId: "proj-internal",
        billingTypeId: "bt-reg",
        requiresProject: true,
        hours: { sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0 },
      },
    ];

    const { rowWeeklyTotals, dailyTotals, weeklyTotalHours } = calcTimesheetTotals(rows);
    expect(rowWeeklyTotals["r1"]).toBe(40);
    expect(rowWeeklyTotals["r2"]).toBe(0);
    expect(dailyTotals.mon).toBe(8);
    expect(dailyTotals.fri).toBe(8);
    expect(weeklyTotalHours).toBe(40);

    const { valid, errors, warnings } = validateTimesheet(rows, settings);
    expect(valid).toBe(true);
    expect(errors).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  it("detects a mixed week with warnings and errors", () => {
    const settings: TimesheetSettings = {
      contractedHoursPerWeek: 40,
      maximumHoursPerWeek: 60,
      workWeekStart: "mon",
    };

    const rows: TimesheetRow[] = [
      {
        id: "r1",
        projectId: null, // MISSING project for requires_project type → error
        billingTypeId: "bt-reg",
        requiresProject: true,
        hours: { sun: 0, mon: 4, tue: 4, wed: 4, thu: 4, fri: 4, sat: 0 },
      },
    ];

    const { valid, errors, warnings } = validateTimesheet(rows, settings);
    expect(valid).toBe(false);
    expect(errors.some((e) => e.field === "projectId")).toBe(true);
    expect(warnings.some((w) => w.field === "weeklyTotal")).toBe(true); // only 20h < 40h
  });
});

describe("Full expense week scenario", () => {
  it("calculates a field week with mileage, lodging and meals", () => {
    const days = emptyExpenseDaysMap();

    days.mon = {
      mileageKm: 120,
      mileageCostClaimed: 73.20,
      lodging: 149.00,
      breakfast: 0,
      lunch: 12.50,
      dinner: 28.00,
      other: 0,
      notes: "Client site A",
    };

    days.tue = {
      mileageKm: 45,
      // Deliberately claim $20 (less than rate-calculated 45*0.61=$27.45)
      // to prove the calculation uses claimed, not suggested
      mileageCostClaimed: 20.00,
      lodging: 149.00,
      breakfast: 8.00,
      lunch: 0,
      dinner: 35.50,
      other: 15.00, // parking
      notes: "Client site A → B",
    };

    const RATE = 0.61;
    const totals = calcExpenseWeeklyTotals(days, RATE);

    expect(totals.totalMileageKm).toBeCloseTo(165);
    expect(totals.mileageCostAtRate).toBeCloseTo(165 * 0.61);
    expect(totals.totalMileageCostClaimed).toBeCloseTo(73.20 + 20.00);
    expect(totals.totalLodging).toBeCloseTo(298.00);
    expect(totals.totalMeals).toBeCloseTo(12.50 + 28.00 + 8.00 + 35.50);
    expect(totals.totalOther).toBeCloseTo(15.00);

    // Weekly total = claimed mileage + lodging + meals + other
    const expectedWeekly =
      (73.20 + 20.00) + 298.00 + (12.50 + 28.00 + 8.00 + 35.50) + 15.00;
    expect(totals.weeklyTotal).toBeCloseTo(expectedWeekly);

    // Mileage at rate (165km * $0.61 = $100.65) is display-only and
    // must NOT be used in weeklyTotal — claimed is $93.20, not $100.65.
    const mileageCostAtRate = 165 * 0.61; // = 100.65
    const mileageClaimed = 73.20 + 20.00;  // = 93.20
    expect(mileageCostAtRate).not.toBeCloseTo(mileageClaimed, 1); // ensure they differ
    // weeklyTotal uses claimed ($93.20), not rate ($100.65)
    expect(totals.weeklyTotal).toBeCloseTo(mileageClaimed + 298.00 + (12.50 + 28.00 + 8.00 + 35.50) + 15.00);
  });
});
