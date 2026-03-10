import { describe, expect, it } from "vitest";
import { validateLeaveRequest } from "@/domain/leave/validation";

describe("validateLeaveRequest", () => {
  it("allows leave requests with past start dates", () => {
    const result = validateLeaveRequest({
      leaveType: "Vacation",
      startDate: "2024-01-10",
      endDate: "2024-01-12",
      hoursPerDay: 8,
      totalHours: 24,
    });

    expect(result.valid).toBe(true);
  });

  it("still rejects ranges where the end date is before the start date", () => {
    const result = validateLeaveRequest({
      leaveType: "Vacation",
      startDate: "2024-01-12",
      endDate: "2024-01-10",
      hoursPerDay: 8,
      totalHours: 24,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.field === "endDate")).toBe(true);
  });
});
