"use client";

import { useCallback } from "react";
import { Printer } from "lucide-react";
import type { TimesheetRow, TimesheetSettings } from "@/domain/timesheets/types";
import { DAYS_OF_WEEK } from "@/domain/timesheets/types";
import { calcTimesheetTotals } from "@/domain/timesheets/calculations";
import { format } from "date-fns";

const DAY_LABELS: Record<string, string> = {
  sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed",
  thu: "Thu", fri: "Fri", sat: "Sat",
};

interface TimesheetPrintViewProps {
  rows: TimesheetRow[];
  settings: TimesheetSettings;
  weekNumber: number;
  year: number;
  weekDates: Record<string, string>;
  userName: string;
  userEmail: string;
  status: string;
  projects: Array<{ id: string; title: string; code: string }>;
  billingTypes: Array<{ id: string; name: string }>;
  submittedAt?: string | null;
  approvedAt?: string | null;
  approvedByName?: string | null;
}

export function TimesheetPrintView({
  rows,
  settings,
  weekNumber,
  year,
  weekDates,
  userName,
  userEmail,
  status,
  projects,
  billingTypes,
  submittedAt,
  approvedAt,
  approvedByName,
}: TimesheetPrintViewProps) {
  const { rowWeeklyTotals, dailyTotals, weeklyTotalHours } = calcTimesheetTotals(rows);

  return (
    <>
      {/* Print button — hidden in print */}
      <button
        onClick={() => window.print()}
        className="no-print inline-flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
      >
        <Printer className="w-4 h-4" />
        Print / PDF
      </button>

      {/* Print content */}
      <div className="print-full-width font-sans text-black">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-xl font-bold">Timesheet — Week {weekNumber}, {year}</h1>
            <p className="text-sm text-gray-600 mt-1">
              Employee: <strong>{userName}</strong> ({userEmail})
            </p>
            <p className="text-sm text-gray-600">
              Status: <strong className="capitalize">{status}</strong>
            </p>
          </div>
          <div className="text-right text-xs text-gray-500">
            {submittedAt && <p>Submitted: {format(new Date(submittedAt), "MMM d, yyyy")}</p>}
            {approvedAt && approvedByName && (
              <p>Approved: {format(new Date(approvedAt), "MMM d, yyyy")} by {approvedByName}</p>
            )}
            <p>Printed: {format(new Date(), "MMM d, yyyy")}</p>
          </div>
        </div>

        {/* Grid */}
        <table className="w-full border-collapse text-sm mb-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-2 py-1.5 text-left">Project</th>
              <th className="border border-gray-300 px-2 py-1.5 text-left">Type</th>
              {DAYS_OF_WEEK.map((day) => (
                <th key={day} className="border border-gray-300 px-2 py-1.5 text-center w-16">
                  <div>{DAY_LABELS[day]}</div>
                  {weekDates[day] && (
                    <div className="font-normal text-xs text-gray-500">{weekDates[day]}</div>
                  )}
                </th>
              ))}
              <th className="border border-gray-300 px-2 py-1.5 text-center w-16">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const project = projects.find((p) => p.id === row.projectId);
              const bt = billingTypes.find((b) => b.id === row.billingTypeId);
              return (
                <tr key={row.id}>
                  <td className="border border-gray-300 px-2 py-1">
                    {project ? `${project.code} — ${project.title}` : "—"}
                  </td>
                  <td className="border border-gray-300 px-2 py-1">{bt?.name ?? "—"}</td>
                  {DAYS_OF_WEEK.map((day) => (
                    <td key={day} className="border border-gray-300 px-2 py-1 text-center">
                      {row.hours[day] > 0 ? row.hours[day].toFixed(2) : ""}
                    </td>
                  ))}
                  <td className="border border-gray-300 px-2 py-1 text-center font-semibold">
                    {rowWeeklyTotals[row.id].toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-semibold">
              <td colSpan={2} className="border border-gray-300 px-2 py-1.5">Daily Total</td>
              {DAYS_OF_WEEK.map((day) => (
                <td key={day} className="border border-gray-300 px-2 py-1.5 text-center">
                  {dailyTotals[day] > 0 ? dailyTotals[day].toFixed(2) : ""}
                </td>
              ))}
              <td className="border border-gray-300 px-2 py-1.5 text-center font-bold">
                {weeklyTotalHours.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Signature block */}
        <div className="grid grid-cols-2 gap-8 mt-8">
          <div>
            <p className="text-xs text-gray-500 mb-6">Employee Signature</p>
            <div className="border-t border-gray-400 pt-1 text-xs text-gray-500">
              {userName} · Date: _______________
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-6">Manager Approval</p>
            <div className="border-t border-gray-400 pt-1 text-xs text-gray-500">
              {approvedByName ?? "_______________"} · Date: _______________
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
