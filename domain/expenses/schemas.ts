import { z } from "zod";

export const WORK_STATUSES = ["draft", "submitted", "approved", "rejected"] as const;

const MoneySchema = z.number().finite().min(0, "Amount must be ≥ 0");
const KmSchema = z.number().finite().min(0, "KM must be ≥ 0");

const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const ExpenseReportSchema = z.object({
  id: z.string().uuid().optional(),
  employeeId: z.string().uuid(),
  managerId: z.string().uuid().nullable().optional(),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  weekNumber: z.number().int().min(1).max(5),
  weekBeginningDate: IsoDateSchema,
  destination: z.string().max(200).nullable().optional(),
  status: z.enum(WORK_STATUSES),
  employeeNotes: z.string().max(5000).nullable().optional(),
  managerComments: z.string().max(5000).nullable().optional(),
});

export const ExpenseEntrySchema = z.object({
  id: z.string().uuid().optional(),
  reportId: z.string().uuid().optional(),
  dayIndex: z.number().int().min(0).max(5),
  entryDate: IsoDateSchema.optional(),
  travelFrom: z.string().max(200).nullable().optional(),
  travelTo: z.string().max(200).nullable().optional(),
  mileageKm: KmSchema.default(0),
  mileageCostClaimed: MoneySchema.default(0),
  lodgingAmount: MoneySchema.default(0),
  breakfastAmount: MoneySchema.default(0),
  lunchAmount: MoneySchema.default(0),
  dinnerAmount: MoneySchema.default(0),
  otherAmount: MoneySchema.default(0),
  otherNote: z.string().max(2000).nullable().optional(),
});

export const MileageRateConfigSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  ratePerKm: z.number().finite().min(0).max(9999),
});

export const ExpenseUpsertPayloadSchema = z.object({
  report: ExpenseReportSchema,
  entries: z.array(ExpenseEntrySchema).max(6),
  mileageRate: MileageRateConfigSchema.optional(),
});

export type ExpenseReportInput = z.infer<typeof ExpenseReportSchema>;
export type ExpenseEntryInput = z.infer<typeof ExpenseEntrySchema>;
