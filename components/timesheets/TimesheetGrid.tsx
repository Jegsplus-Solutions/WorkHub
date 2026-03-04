"use client";

import { useState, useCallback, useRef } from "react";
import { Plus, Trash2, AlertCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimesheetRow, TimesheetSettings } from "@/domain/timesheets/types";
import { DAYS_OF_WEEK } from "@/domain/timesheets/types";
import {
  calcTimesheetTotals,
  parseHoursInput,
  emptyHoursMap,
} from "@/domain/timesheets/calculations";
import { validateTimesheet } from "@/domain/timesheets/validation";

const DAY_LABELS: Record<string, string> = {
  sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed",
  thu: "Thu", fri: "Fri", sat: "Sat",
};

interface Project {
  id: string;
  code: string;
  title: string;
}

interface BillingType {
  id: string;
  name: string;
  requires_project: boolean;
}

interface TimesheetGridProps {
  rows: TimesheetRow[];
  settings: TimesheetSettings;
  projects: Project[];
  billingTypes: BillingType[];
  weekDates: Record<string, string>; // day → "MMM d"
  readOnly?: boolean;
  onChange?: (rows: TimesheetRow[]) => void;
}

function newRow(billingTypes: BillingType[]): TimesheetRow {
  const defaultBt = billingTypes.find((b) => b.requires_project) ?? billingTypes[0];
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    projectId: null,
    billingTypeId: defaultBt?.id ?? "",
    requiresProject: defaultBt?.requires_project ?? true,
    hours: emptyHoursMap(),
  };
}

export function TimesheetGrid({
  rows: initialRows,
  settings,
  projects,
  billingTypes,
  weekDates,
  readOnly = false,
  onChange,
}: TimesheetGridProps) {
  const [rows, setRows] = useState<TimesheetRow[]>(initialRows);
  const prevRowsRef = useRef(initialRows);

  // Keep in sync with external updates
  if (initialRows !== prevRowsRef.current) {
    prevRowsRef.current = initialRows;
    setRows(initialRows);
  }

  const emit = useCallback(
    (next: TimesheetRow[]) => {
      setRows(next);
      onChange?.(next);
    },
    [onChange]
  );

  const { rowWeeklyTotals, dailyTotals, weeklyTotalHours } = calcTimesheetTotals(rows);
  const validation = validateTimesheet(rows, settings);

  function updateHours(rowId: string, day: string, raw: string) {
    const val = parseHoursInput(raw);
    emit(
      rows.map((r) =>
        r.id === rowId
          ? { ...r, hours: { ...r.hours, [day]: val ?? 0 } }
          : r
      )
    );
  }

  function updateProject(rowId: string, projectId: string) {
    emit(rows.map((r) => (r.id === rowId ? { ...r, projectId: projectId || null } : r)));
  }

  function updateBillingType(rowId: string, btId: string) {
    const bt = billingTypes.find((b) => b.id === btId);
    emit(
      rows.map((r) =>
        r.id === rowId
          ? {
              ...r,
              billingTypeId: btId,
              requiresProject: bt?.requires_project ?? true,
              projectId: bt?.requires_project ? r.projectId : null,
            }
          : r
      )
    );
  }

  function addRow() {
    emit([...rows, newRow(billingTypes)]);
  }

  function removeRow(rowId: string) {
    if (rows.length <= 1) return;
    emit(rows.filter((r) => r.id !== rowId));
  }

  const getRowErrors = (rowId: string) =>
    validation.errors.filter((e) => e.rowId === rowId);
  const getRowWarnings = (rowId: string) =>
    validation.warnings.filter((w) => w.rowId === rowId);

  const weeklyErrors = validation.errors.filter((e) => !e.rowId);
  const weeklyWarnings = validation.warnings.filter((w) => !w.rowId);

  return (
    <div className="space-y-3">
      {/* Validation alerts */}
      {weeklyErrors.map((e, i) => (
        <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {e.message}
        </div>
      ))}
      {weeklyWarnings.map((w, i) => (
        <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {w.message}
        </div>
      ))}

      {/* Grid */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="timesheet-grid min-w-full">
          <thead>
            <tr>
              <th className="text-left min-w-[180px] w-[180px]">Project</th>
              <th className="text-left min-w-[160px] w-[160px]">Type</th>
              {DAYS_OF_WEEK.map((day) => (
                <th key={day} className="min-w-[72px] w-[72px]">
                  <div>{DAY_LABELS[day]}</div>
                  {weekDates[day] && (
                    <div className="font-normal text-xs text-muted-foreground">{weekDates[day]}</div>
                  )}
                </th>
              ))}
              <th className="min-w-[72px] w-[72px]">Total</th>
              {!readOnly && <th className="w-10" />}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const bt = billingTypes.find((b) => b.id === row.billingTypeId);
              const requiresProject = bt?.requires_project ?? true;
              const rowErrors = getRowErrors(row.id);
              const rowWarnings = getRowWarnings(row.id);
              const hasError = rowErrors.length > 0;
              const hasWarning = rowWarnings.length > 0;

              return (
                <tr
                  key={row.id}
                  className={cn(
                    "group hover:bg-accent/30 transition-colors",
                    hasError && "bg-red-50/50",
                    hasWarning && !hasError && "bg-amber-50/50"
                  )}
                >
                  {/* Project */}
                  <td>
                    {readOnly ? (
                      <span className="px-2 py-1 text-sm">
                        {projects.find((p) => p.id === row.projectId)?.title ?? "—"}
                      </span>
                    ) : (
                      <select
                        value={row.projectId ?? ""}
                        onChange={(e) => updateProject(row.id, e.target.value)}
                        disabled={!requiresProject}
                        className={cn(
                          "w-full text-sm bg-transparent py-1.5 px-2 outline-none focus:ring-2 focus:ring-primary/30 rounded",
                          !requiresProject && "opacity-40 cursor-not-allowed"
                        )}
                      >
                        <option value="">— Select —</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.code} — {p.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>

                  {/* Billing type */}
                  <td>
                    {readOnly ? (
                      <span className="px-2 py-1 text-sm">{bt?.name ?? row.billingTypeId}</span>
                    ) : (
                      <select
                        value={row.billingTypeId}
                        onChange={(e) => updateBillingType(row.id, e.target.value)}
                        className="w-full text-sm bg-transparent py-1.5 px-2 outline-none focus:ring-2 focus:ring-primary/30 rounded"
                      >
                        {billingTypes.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    )}
                  </td>

                  {/* Hour cells */}
                  {DAYS_OF_WEEK.map((day) => {
                    const val = row.hours[day];
                    const cellErrors = validation.errors.filter(
                      (e) => e.rowId === row.id && e.day === day
                    );
                    return (
                      <td key={day} className={cn("text-center", cellErrors.length > 0 && "bg-red-50")}>
                        {readOnly ? (
                          <span className={cn("text-sm", val === 0 && "text-muted-foreground/40")}>
                            {val > 0 ? val : "—"}
                          </span>
                        ) : (
                          <input
                            type="text"
                            value={val || ""}
                            onChange={(e) => updateHours(row.id, day, e.target.value)}
                            placeholder="0"
                            className={cn(
                              "w-full text-center text-sm bg-transparent py-1 outline-none focus:ring-2 focus:ring-primary/30 rounded",
                              cellErrors.length > 0 && "text-red-600"
                            )}
                            title={cellErrors[0]?.message}
                          />
                        )}
                      </td>
                    );
                  })}

                  {/* Row total */}
                  <td className="text-center font-medium text-sm">
                    <span className={cn(rowWeeklyTotals[row.id] === 0 && "text-muted-foreground/40")}>
                      {rowWeeklyTotals[row.id] > 0
                        ? rowWeeklyTotals[row.id].toFixed(2)
                        : "—"}
                    </span>
                  </td>

                  {/* Delete */}
                  {!readOnly && (
                    <td className="text-center">
                      <button
                        onClick={() => removeRow(row.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 hover:text-red-500 transition-all"
                        disabled={rows.length <= 1}
                        title="Remove row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr>
              <td colSpan={2} className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Daily Total
              </td>
              {DAYS_OF_WEEK.map((day) => (
                <td key={day} className="text-center py-2">
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      dailyTotals[day] > 24 && "text-red-600"
                    )}
                  >
                    {dailyTotals[day] > 0 ? dailyTotals[day].toFixed(2) : "—"}
                  </span>
                </td>
              ))}
              <td className="text-center py-2">
                <span
                  className={cn(
                    "text-sm font-bold",
                    weeklyTotalHours > settings.maximumHoursPerWeek && "text-red-600",
                    weeklyTotalHours < settings.contractedHoursPerWeek &&
                      weeklyTotalHours > 0 &&
                      "text-amber-600"
                  )}
                >
                  {weeklyTotalHours.toFixed(2)}h
                </span>
              </td>
              {!readOnly && <td />}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Add row button */}
      {!readOnly && (
        <button
          onClick={addRow}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-accent"
        >
          <Plus className="w-4 h-4" />
          Add row
        </button>
      )}
    </div>
  );
}
