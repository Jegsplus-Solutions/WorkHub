"use client";

import { useState, useCallback } from "react";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExpenseDayEntry, ExpenseDay } from "@/domain/expenses/types";
import { EXPENSE_DAYS } from "@/domain/expenses/types";
import {
  calcExpenseWeeklyTotals,
  emptyExpenseDaysMap,
  formatCurrency,
} from "@/domain/expenses/calculations";
import { validateExpenseWeek } from "@/domain/expenses/validation";

const DAY_LABELS: Record<ExpenseDay, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat",
};

interface ExpenseGridProps {
  days: Record<ExpenseDay, ExpenseDayEntry>;
  ratePerKm: number;
  weekDates: Partial<Record<ExpenseDay, string>>;
  readOnly?: boolean;
  onChange?: (days: Record<ExpenseDay, ExpenseDayEntry>) => void;
}

type ExpenseField = keyof Omit<ExpenseDayEntry, "notes">;

const EXPENSE_FIELDS: { key: ExpenseField; label: string; isMileageGroup?: boolean }[] = [
  { key: "mileageKm", label: "Mileage (km)" },
  { key: "mileageCostClaimed", label: "Mileage Cost ($)" },
  { key: "lodging", label: "Lodging ($)" },
  { key: "breakfast", label: "Breakfast ($)" },
  { key: "lunch", label: "Lunch ($)" },
  { key: "dinner", label: "Dinner ($)" },
  { key: "other", label: "Other ($)" },
];

export function ExpenseGrid({
  days: initialDays,
  ratePerKm,
  weekDates,
  readOnly = false,
  onChange,
}: ExpenseGridProps) {
  const [days, setDays] = useState<Record<ExpenseDay, ExpenseDayEntry>>(initialDays);

  const emit = useCallback(
    (next: Record<ExpenseDay, ExpenseDayEntry>) => {
      setDays(next);
      onChange?.(next);
    },
    [onChange]
  );

  function updateField(day: ExpenseDay, field: ExpenseField, raw: string) {
    const val = parseFloat(raw);
    const safeVal = isNaN(val) || raw === "" ? 0 : Math.max(0, val);
    const updated = { ...days[day], [field]: safeVal };
    // Auto-fill Mileage Cost when km is entered
    if (field === "mileageKm") {
      updated.mileageCostClaimed = parseFloat((safeVal * ratePerKm).toFixed(2));
    }
    emit({ ...days, [day]: updated });
  }

  function updateNotes(day: ExpenseDay, notes: string) {
    emit({ ...days, [day]: { ...days[day], notes } });
  }

  const totals = calcExpenseWeeklyTotals(days, ratePerKm);
  const validation = validateExpenseWeek(days);

  return (
    <div className="space-y-3">
      {/* Rate info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
        <Info className="w-3.5 h-3.5 shrink-0" />
        Current mileage rate: <strong>${ratePerKm.toFixed(4)}/km</strong>.
        &ldquo;Mileage Cost&rdquo; is auto-filled from km × rate and can be adjusted manually.
      </div>

      {/* Validation alerts */}
      {validation.errors.map((e, i) => (
        <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {e.message}
        </div>
      ))}
      {validation.warnings.map((w, i) => (
        <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {w.message}
        </div>
      ))}

      {/* Grid */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="expense-grid min-w-full">
          <thead>
            <tr>
              <th className="text-left min-w-[180px] sticky left-0 bg-muted/90 z-20">
                Category
              </th>
              {EXPENSE_DAYS.map((day) => (
                <th key={day} className="min-w-[110px] text-right">
                  <div>{DAY_LABELS[day]}</div>
                  {weekDates[day] && (
                    <div className="font-normal text-xs text-muted-foreground">{weekDates[day]}</div>
                  )}
                </th>
              ))}
              <th className="min-w-[110px] text-right bg-muted/50">Weekly Total</th>
            </tr>
          </thead>

          <tbody>
            {EXPENSE_FIELDS.map((field) => {
              let weeklyVal: number;
              switch (field.key) {
                case "mileageKm": weeklyVal = totals.totalMileageKm; break;
                case "mileageCostClaimed": weeklyVal = totals.totalMileageCostClaimed; break;
                case "lodging": weeklyVal = totals.totalLodging; break;
                case "breakfast":
                case "lunch":
                case "dinner": weeklyVal = EXPENSE_DAYS.reduce((s, d) => s + Number(days[d][field.key] ?? 0), 0); break;
                case "other": weeklyVal = totals.totalOther; break;
                default: weeklyVal = 0;
              }

              const isMileageSuggested = false;

              return (
                <tr key={field.key} className="hover:bg-accent/20 transition-colors">
                  <td className="sticky left-0 bg-background px-3 py-1.5 font-medium text-sm">
                    {field.label}
                  </td>
                  {EXPENSE_DAYS.map((day) => {
                    const val = days[day][field.key] as number;
                    const hasErr = validation.errors.some(
                      (e) => e.day === day && e.field === field.key
                    );

                    // Show suggested mileage cost below the km field
                    const suggestedLabel =
                      field.key === "mileageKm" && days[day].mileageKm > 0
                        ? `≈ ${formatCurrency(totals.dayTotals[day].suggestedMileageCost)}`
                        : null;

                    return (
                      <td key={day} className={cn("text-right", hasErr && "bg-red-50")}>
                        {readOnly ? (
                          <div className="px-2 py-1 text-sm">
                            {field.key === "mileageKm"
                              ? val > 0 ? `${val}km` : "—"
                              : val > 0
                              ? formatCurrency(val)
                              : "—"}
                            {suggestedLabel && (
                              <div className="text-xs text-muted-foreground">{suggestedLabel}</div>
                            )}
                          </div>
                        ) : (
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step={field.key === "mileageKm" ? "0.1" : "0.01"}
                              value={val || ""}
                              onChange={(e) => updateField(day, field.key, e.target.value)}
                              placeholder="0"
                              className={cn(
                                "w-full text-right text-sm bg-transparent py-1.5 px-2 outline-none focus:ring-2 focus:ring-primary/30 rounded",
                                hasErr && "text-red-600"
                              )}
                            />
                            {suggestedLabel && (
                              <div className="text-xs text-muted-foreground text-right px-2 pb-0.5">
                                {suggestedLabel}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="text-right px-3 py-1.5 bg-muted/30 font-semibold text-sm">
                    {field.key === "mileageKm"
                      ? `${weeklyVal.toFixed(1)}km`
                      : weeklyVal > 0
                      ? formatCurrency(weeklyVal)
                      : "—"}
                  </td>
                </tr>
              );
            })}

            {/* Suggested mileage cost at rate — display only */}
            <tr className="bg-blue-50/40 text-muted-foreground italic">
              <td className="sticky left-0 bg-blue-50/40 px-3 py-1.5 text-xs">
                Mileage at rate (reference)
              </td>
              {EXPENSE_DAYS.map((day) => (
                <td key={day} className="text-right px-2 py-1.5 text-xs">
                  {days[day].mileageKm > 0
                    ? formatCurrency(totals.dayTotals[day].suggestedMileageCost)
                    : "—"}
                </td>
              ))}
              <td className="text-right px-3 py-1.5 text-xs bg-blue-50/40">
                {totals.mileageCostAtRate > 0
                  ? formatCurrency(totals.mileageCostAtRate)
                  : "—"}
              </td>
            </tr>

            {/* Notes row */}
            {!readOnly && (
              <tr className="border-t-2 border-border">
                <td className="sticky left-0 bg-background px-3 py-1.5 text-sm font-medium">Notes</td>
                {EXPENSE_DAYS.map((day) => (
                  <td key={day}>
                    <input
                      type="text"
                      value={days[day].notes}
                      onChange={(e) => updateNotes(day, e.target.value)}
                      placeholder="…"
                      className="w-full text-xs bg-transparent py-1.5 px-2 outline-none focus:ring-2 focus:ring-primary/30 rounded"
                    />
                  </td>
                ))}
                <td />
              </tr>
            )}
          </tbody>

          {/* Totals footer */}
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/50">
              <td className="sticky left-0 bg-muted/50 px-3 py-2 font-bold text-sm">Daily Total</td>
              {EXPENSE_DAYS.map((day) => (
                <td key={day} className="text-right px-2 py-2 font-bold text-sm">
                  {totals.dayTotals[day].dailyTotal > 0
                    ? formatCurrency(totals.dayTotals[day].dailyTotal)
                    : "—"}
                </td>
              ))}
              <td className="text-right px-3 py-2 font-bold text-sm bg-primary/10 text-primary">
                {formatCurrency(totals.weeklyTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Weekly summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Mileage km", value: `${totals.totalMileageKm.toFixed(1)}km` },
          { label: "Mileage cost", value: formatCurrency(totals.totalMileageCostClaimed) },
          { label: "Lodging", value: formatCurrency(totals.totalLodging) },
          { label: "Meals", value: formatCurrency(totals.totalMeals) },
          { label: "Other", value: formatCurrency(totals.totalOther) },
          { label: "Weekly Total", value: formatCurrency(totals.weeklyTotal), highlight: true },
        ].map((s) => (
          <div
            key={s.label}
            className={cn(
              "rounded-lg border border-border p-3",
              s.highlight && "bg-primary text-primary-foreground border-primary"
            )}
          >
            <p className={cn("text-xs", s.highlight ? "text-primary-foreground/70" : "text-muted-foreground")}>
              {s.label}
            </p>
            <p className="font-bold text-sm mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
