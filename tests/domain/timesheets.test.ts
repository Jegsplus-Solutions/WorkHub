import { describe, it, expect } from "vitest";
import {
  calcRowWeeklyTotal,
  calcDailyTotals,
  calcTimesheetTotals,
  parseHoursInput,
  formatHours,
  emptyHoursMap,
} from "@/domain/timesheets/calculations";
import { validateTimesheet } from "@/domain/timesheets/validation";
import type { TimesheetRow, TimesheetSettings } from "@/domain/timesheets/types";

// ─── Test fixtures ────────────────────────────────────────────────────────────

const defaultSettings: TimesheetSettings = {
  contractedHoursPerWeek: 40,
  maximumHoursPerWeek: 60,
  workWeekStart: "mon",
};

function makeRow(overrides: Partial<TimesheetRow> = {}): TimesheetRow {
  return {
    id: "row-1",
    projectId: "proj-1",
    billingTypeId: "bt-1",
    requiresProject: true,
    hours: emptyHoursMap(),
    ...overrides,
  };
}

// ─── calcRowWeeklyTotal ───────────────────────────────────────────────────────

describe("calcRowWeeklyTotal", () => {
  it("returns 0 for an empty row", () => {
    const row = makeRow();
    expect(calcRowWeeklyTotal(row)).toBe(0);
  });

  it("sums all 7 days correctly", () => {
    const row = makeRow({
      hours: { sun: 0, mon: 8, tue: 8, wed: 8, thu: 8, fri: 8, sat: 0 },
    });
    expect(calcRowWeeklyTotal(row)).toBe(40);
  });

  it("handles decimal hours", () => {
    const row = makeRow({
      hours: { sun: 0, mon: 7.5, tue: 7.5, wed: 7.5, thu: 7.5, fri: 7.5, sat: 0 },
    });
    expect(calcRowWeeklyTotal(row)).toBeCloseTo(37.5);
  });

  it("treats NaN as 0", () => {
    const row = makeRow({ hours: { ...emptyHoursMap(), mon: NaN } });
    expect(calcRowWeeklyTotal(row)).toBe(0);
  });
});

// ─── calcDailyTotals ─────────────────────────────────────────────────────────

describe("calcDailyTotals", () => {
  it("returns all zeros for empty rows array", () => {
    const totals = calcDailyTotals([]);
    expect(totals.mon).toBe(0);
    expect(totals.sat).toBe(0);
  });

  it("sums multiple rows per day", () => {
    const rows = [
      makeRow({ id: "r1", hours: { ...emptyHoursMap(), mon: 4, tue: 3 } }),
      makeRow({ id: "r2", hours: { ...emptyHoursMap(), mon: 4, tue: 5 } }),
    ];
    const totals = calcDailyTotals(rows);
    expect(totals.mon).toBe(8);
    expect(totals.tue).toBe(8);
    expect(totals.wed).toBe(0);
  });
});

// ─── calcTimesheetTotals ──────────────────────────────────────────────────────

describe("calcTimesheetTotals", () => {
  it("computes row totals, daily totals, and weekly total", () => {
    const rows = [
      makeRow({ id: "r1", hours: { ...emptyHoursMap(), mon: 8, tue: 8, wed: 8, thu: 8, fri: 8 } }),
      makeRow({ id: "r2", hours: { ...emptyHoursMap(), mon: 2 } }),
    ];
    const { rowWeeklyTotals, dailyTotals, weeklyTotalHours } = calcTimesheetTotals(rows);

    expect(rowWeeklyTotals["r1"]).toBe(40);
    expect(rowWeeklyTotals["r2"]).toBe(2);
    expect(dailyTotals.mon).toBe(10);
    expect(weeklyTotalHours).toBe(42);
  });
});

// ─── parseHoursInput ─────────────────────────────────────────────────────────

describe("parseHoursInput", () => {
  it("parses decimal format", () => {
    expect(parseHoursInput("7.5")).toBe(7.5);
    expect(parseHoursInput("0")).toBe(0);
    expect(parseHoursInput("8")).toBe(8);
  });

  it("parses colon format HH:MM", () => {
    expect(parseHoursInput("7:30")).toBeCloseTo(7.5);
    expect(parseHoursInput("1:00")).toBe(1);
    expect(parseHoursInput("0:15")).toBeCloseTo(0.25);
  });

  it("returns null for empty or invalid", () => {
    expect(parseHoursInput("")).toBeNull();
    expect(parseHoursInput("abc")).toBeNull();
    expect(parseHoursInput("7:60")).toBeNull(); // invalid minutes
  });

  it("handles whitespace", () => {
    expect(parseHoursInput("  8  ")).toBe(8);
  });
});

// ─── formatHours ─────────────────────────────────────────────────────────────

describe("formatHours", () => {
  it("formats whole hours", () => {
    expect(formatHours(8)).toBe("8:00");
    expect(formatHours(0)).toBe("0:00");
  });

  it("formats half hours", () => {
    expect(formatHours(7.5)).toBe("7:30");
  });

  it("formats negative values", () => {
    expect(formatHours(-1)).toBe("-1:00");
  });
});

// ─── validateTimesheet ────────────────────────────────────────────────────────

describe("validateTimesheet", () => {
  it("is valid for a normal week", () => {
    const rows = [
      makeRow({ hours: { ...emptyHoursMap(), mon: 8, tue: 8, wed: 8, thu: 8, fri: 8 } }),
    ];
    const result = validateTimesheet(rows, defaultSettings);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("errors when requires_project billing type has no project", () => {
    const row = makeRow({ projectId: null, requiresProject: true });
    row.hours.mon = 8;
    const result = validateTimesheet([row], defaultSettings);
    expect(result.valid).toBe(false);
    const err = result.errors.find((e) => e.field === "projectId");
    expect(err).toBeDefined();
  });

  it("allows no-project billing type without a project", () => {
    const row = makeRow({
      projectId: null,
      requiresProject: false,
      hours: { ...emptyHoursMap(), mon: 8 },
    });
    const result = validateTimesheet([row], defaultSettings);
    const projErr = result.errors.find((e) => e.field === "projectId");
    expect(projErr).toBeUndefined();
  });

  it("errors when daily total exceeds 24", () => {
    const rows = [
      makeRow({ id: "r1", hours: { ...emptyHoursMap(), mon: 14 } }),
      makeRow({ id: "r2", projectId: "p2", hours: { ...emptyHoursMap(), mon: 12 } }),
    ];
    const result = validateTimesheet(rows, defaultSettings);
    const err = result.errors.find((e) => e.field === "dailyTotal" && e.day === "mon");
    expect(err).toBeDefined();
    expect(err?.severity).toBe("error");
  });

  it("errors when weekly total exceeds maximum", () => {
    const rows = [
      makeRow({ hours: { mon: 12, tue: 12, wed: 12, thu: 12, fri: 12, sat: 5, sun: 0 } }),
    ];
    const settings = { ...defaultSettings, maximumHoursPerWeek: 60 };
    const result = validateTimesheet(rows, settings);
    const err = result.errors.find((e) => e.field === "weeklyTotal");
    expect(err).toBeDefined();
  });

  it("warns when weekly total is below contracted hours", () => {
    const rows = [
      makeRow({ hours: { ...emptyHoursMap(), mon: 4, tue: 4 } }),
    ];
    const result = validateTimesheet(rows, defaultSettings);
    const warn = result.warnings.find((w) => w.field === "weeklyTotal");
    expect(warn).toBeDefined();
    expect(warn?.severity).toBe("warning");
  });

  it("errors on negative hours", () => {
    const row = makeRow({ hours: { ...emptyHoursMap(), mon: -1 } });
    const result = validateTimesheet([row], defaultSettings);
    const err = result.errors.find((e) => e.field === "hours");
    expect(err).toBeDefined();
  });
});
