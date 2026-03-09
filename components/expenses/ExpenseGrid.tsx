"use client";

import { useState, useCallback } from "react";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExpenseDayEntry, ExpenseDay } from "@/domain/expenses/types";
import { EXPENSE_DAYS } from "@/domain/expenses/types";
import {
  calcExpenseWeeklyTotals,
  formatCurrency,
} from "@/domain/expenses/calculations";
import { validateExpenseWeek } from "@/domain/expenses/validation";

const DAY_LABELS: Record<ExpenseDay, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat",
};

interface ExpenseGridProps {
  days: Record<ExpenseDay, ExpenseDayEntry>;
  weekDates: Partial<Record<ExpenseDay, string>>;
  readOnly?: boolean;
  onChange?: (days: Record<ExpenseDay, ExpenseDayEntry>) => void;
}

type NumericField = "mileageKm" | "mileageCost" | "lodging" | "breakfast" | "lunch" | "dinner" | "other";

const EXPENSE_FIELDS: { key: NumericField; label: string; isKm?: boolean }[] = [
  { key: "mileageKm", label: "Mileage (km)", isKm: true },
  { key: "mileageCost", label: "Mileage Cost ($)" },
  { key: "lodging", label: "Lodging ($)" },
  { key: "breakfast", label: "Breakfast ($)" },
  { key: "lunch", label: "Lunch ($)" },
  { key: "dinner", label: "Dinner ($)" },
  { key: "other", label: "Other ($)" },
];

export function ExpenseGrid({
  days: initialDays,
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

  function updateNumeric(day: ExpenseDay, field: NumericField, raw: string) {
    const val = parseFloat(raw);
    const safeVal = isNaN(val) || raw === "" ? 0 : Math.max(0, val);
    emit({ ...days, [day]: { ...days[day], [field]: safeVal } });
  }

  function updateText(day: ExpenseDay, field: "travelFrom" | "travelTo" | "notes", value: string) {
    emit({ ...days, [day]: { ...days[day], [field]: value } });
  }

  const totals = calcExpenseWeeklyTotals(days);
  const validation = validateExpenseWeek(days);

  function weeklyValForField(field: NumericField): number {
    switch (field) {
      case "mileageKm": return totals.totalMileageKm;
      case "mileageCost": return totals.totalMileageCost;
      case "lodging": return totals.totalLodging;
      case "breakfast":
      case "lunch":
      case "dinner": return EXPENSE_DAYS.reduce((s, d) => s + Number(days[d][field] ?? 0), 0);
      case "other": return totals.totalOther;
      default: return 0;
    }
  }

  return (
    <div className="space-y-3">
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
            {/* Travel From row */}
            <tr className="hover:bg-accent/20 transition-colors">
              <td className="sticky left-0 bg-background px-3 py-1.5 font-medium text-sm">From</td>
              {EXPENSE_DAYS.map((day) => (
                <td key={day}>
                  {readOnly ? (
                    <div className="px-2 py-1 text-sm text-left truncate">{days[day].travelFrom || "—"}</div>
                  ) : (
                    <input
                      type="text"
                      value={days[day].travelFrom}
                      onChange={(e) => updateText(day, "travelFrom", e.target.value)}
                      placeholder="Location"
                      className="w-full text-sm bg-transparent py-1.5 px-2 outline-none focus:ring-2 focus:ring-primary/30 rounded"
                    />
                  )}
                </td>
              ))}
              <td className="bg-muted/30" />
            </tr>

            {/* Travel To row */}
            <tr className="hover:bg-accent/20 transition-colors border-b border-border">
              <td className="sticky left-0 bg-background px-3 py-1.5 font-medium text-sm">To</td>
              {EXPENSE_DAYS.map((day) => (
                <td key={day}>
                  {readOnly ? (
                    <div className="px-2 py-1 text-sm text-left truncate">{days[day].travelTo || "—"}</div>
                  ) : (
                    <input
                      type="text"
                      value={days[day].travelTo}
                      onChange={(e) => updateText(day, "travelTo", e.target.value)}
                      placeholder="Location"
                      className="w-full text-sm bg-transparent py-1.5 px-2 outline-none focus:ring-2 focus:ring-primary/30 rounded"
                    />
                  )}
                </td>
              ))}
              <td className="bg-muted/30" />
            </tr>

            {/* Numeric expense rows */}
            {EXPENSE_FIELDS.map((field) => {
              const weeklyVal = weeklyValForField(field.key);

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

                    return (
                      <td key={day} className={cn("text-right", hasErr && "bg-red-50")}>
                        {readOnly ? (
                          <div className="px-2 py-1 text-sm">
                            {field.isKm
                              ? val > 0 ? `${val}km` : "—"
                              : val > 0
                              ? formatCurrency(val)
                              : "—"}
                          </div>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            step={field.isKm ? "0.1" : "0.01"}
                            value={val || ""}
                            onChange={(e) => updateNumeric(day, field.key, e.target.value)}
                            placeholder="0"
                            className={cn(
                              "w-full text-right text-sm bg-transparent py-1.5 px-2 outline-none focus:ring-2 focus:ring-primary/30 rounded",
                              hasErr && "text-red-600"
                            )}
                          />
                        )}
                      </td>
                    );
                  })}
                  <td className="text-right px-3 py-1.5 bg-muted/30 font-semibold text-sm">
                    {field.isKm
                      ? `${weeklyVal.toFixed(1)}km`
                      : weeklyVal > 0
                      ? formatCurrency(weeklyVal)
                      : "—"}
                  </td>
                </tr>
              );
            })}

            {/* Notes row */}
            {!readOnly && (
              <tr className="border-t-2 border-border">
                <td className="sticky left-0 bg-background px-3 py-1.5 text-sm font-medium">Notes</td>
                {EXPENSE_DAYS.map((day) => (
                  <td key={day}>
                    <input
                      type="text"
                      value={days[day].notes}
                      onChange={(e) => updateText(day, "notes", e.target.value)}
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
          { label: "Mileage cost", value: formatCurrency(totals.totalMileageCost) },
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
