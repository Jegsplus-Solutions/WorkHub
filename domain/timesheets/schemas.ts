import { z } from "zod";

export const WORK_STATUSES = ["draft", "submitted", "approved", "rejected"] as const;

const DayHoursSchema = z
  .number()
  .finite()
  .min(0, "Hours must be ≥ 0")
  .max(24, "Hours cannot exceed 24 in a single cell");

export const TimesheetRowSchema = z.object({
  id: z.string().uuid().optional(),
  timesheetId: z.string().uuid().optional(),
  billingTypeId: z.string().uuid(),
  requiresProject: z.boolean().optional(),
  projectId: z.string().uuid().nullable(),
  sun: DayHoursSchema.default(0),
  mon: DayHoursSchema.default(0),
  tue: DayHoursSchema.default(0),
  wed: DayHoursSchema.default(0),
  thu: DayHoursSchema.default(0),
  fri: DayHoursSchema.default(0),
  sat: DayHoursSchema.default(0),
});

export const TimesheetSchema = z.object({
  id: z.string().uuid().optional(),
  employeeId: z.string().uuid(),
  managerId: z.string().uuid().nullable().optional(),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  weekNumber: z.number().int().min(1).max(5),
  status: z.enum(WORK_STATUSES),
  employeeNotes: z.string().max(5000).nullable().optional(),
  managerComments: z.string().max(5000).nullable().optional(),
});

export const HoursConfigSchema = z.object({
  contractedHours: z.number().finite().min(0).max(168),
  maximumHours: z.number().finite().min(0).max(168),
});

export const TimesheetUpsertPayloadSchema = z.object({
  timesheet: TimesheetSchema,
  rows: z.array(TimesheetRowSchema),
  hoursConfig: HoursConfigSchema.optional(),
});

export type TimesheetRowInput = z.infer<typeof TimesheetRowSchema>;
export type TimesheetInput = z.infer<typeof TimesheetSchema>;
export type HoursConfigInput = z.infer<typeof HoursConfigSchema>;
