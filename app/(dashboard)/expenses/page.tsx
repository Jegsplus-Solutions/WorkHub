import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Expenses" };

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const EXPENSE_YEAR_OPTIONS = Array.from({ length: 101 }, (_, index) => 2000 + index);
const EXPENSE_WEEK_OPTIONS = Array.from({ length: 52 }, (_, index) => String(index + 1).padStart(2, "0"));

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function currentWeekNumber(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000) + 1;
  return String(Math.ceil(dayOfYear / 7)).padStart(2, "0");
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const rawYear = sp.year ? Number.parseInt(sp.year, 10) : now.getFullYear();
  const rawMonth = sp.month ? Number.parseInt(sp.month, 10) : now.getMonth() + 1;
  const filterYear = clamp(Number.isFinite(rawYear) ? rawYear : now.getFullYear(), 2000, 2100);
  const filterMonth = clamp(Number.isFinite(rawMonth) ? rawMonth : now.getMonth() + 1, 1, 12); // 1-indexed

  // Date range for the selected month
  const monthStart = `${filterYear}-${String(filterMonth).padStart(2, "0")}-01`;
  const lastDay = new Date(filterYear, filterMonth, 0).getDate();
  const monthEnd = `${filterYear}-${String(filterMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch reports whose week_beginning_date falls within the selected month
  const { data: reports }: any = await supabase
    .from("expense_reports")
    .select("id, year, week_number, week_beginning_date, destination, status, submitted_at, approved_at")
    .eq("employee_id", user.id)
    .gte("week_beginning_date", monthStart)
    .lte("week_beginning_date", monthEnd)
    .order("week_number", { ascending: false });

  const year = now.getFullYear();
  const week = currentWeekNumber();

  // Navigation months
  const prevMonth = filterMonth === 1 ? 12 : filterMonth - 1;
  const prevYear = filterMonth === 1 ? filterYear - 1 : filterYear;
  const nextMonth = filterMonth === 12 ? 1 : filterMonth + 1;
  const nextYear = filterMonth === 12 ? filterYear + 1 : filterYear;
  const isCurrentMonth = filterYear === now.getFullYear() && filterMonth === now.getMonth() + 1;

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Expenses"
        actions={
          <Link
            href={`/expenses/new?year=${year}&week=${week}`}
            className="px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            + New Week
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Month navigator */}
          <div className="flex items-center justify-between mb-6">
            <Link
              href={`/expenses?month=${prevMonth}&year=${prevYear}`}
              className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>

            <div className="text-center">
              <h2 className="text-lg font-semibold text-foreground">
                {MONTH_NAMES[filterMonth - 1]} {filterYear}
              </h2>
              {!isCurrentMonth && (
                <Link
                  href="/expenses"
                  className="text-xs text-primary hover:underline"
                >
                  Back to current month
                </Link>
              )}
            </div>

            <Link
              href={`/expenses?month=${nextMonth}&year=${nextYear}`}
              className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>

          <form action="/expenses/new" className="mb-6 rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[120px]">
                <label htmlFor="expense-year" className="block text-xs font-medium text-muted-foreground mb-1">
                  Year
                </label>
                <select
                  id="expense-year"
                  name="year"
                  defaultValue={String(filterYear)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {EXPENSE_YEAR_OPTIONS.map((optionYear) => (
                    <option key={optionYear} value={optionYear}>
                      {optionYear}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-[120px]">
                <label htmlFor="expense-week" className="block text-xs font-medium text-muted-foreground mb-1">
                  Week
                </label>
                <select
                  id="expense-week"
                  name="week"
                  defaultValue={week}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {EXPENSE_WEEK_OPTIONS.map((optionWeek) => (
                    <option key={optionWeek} value={optionWeek}>
                      Week {optionWeek}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Create Claim
              </button>
            </div>
          </form>

          {!reports?.length ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground mb-4">
                No expense claims for {MONTH_NAMES[filterMonth - 1]} {filterYear}.
              </p>
              <Link
                href={`/expenses/new?year=${year}&week=${week}`}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
              >
                Create a new claim
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Period</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Destination</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reports.map((r: any) => (
                    <tr key={r.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">Week {r.week_number}, {r.year}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.destination ?? "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/expenses/${r.id}`} className="text-primary hover:underline text-sm">
                          {r.status === "draft" ? "Edit" : "View"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
