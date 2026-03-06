import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import Link from "next/link";
import type { Metadata } from "next";
import { format } from "date-fns";

export const metadata: Metadata = { title: "Leave Requests" };

export default async function LeavePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: requests }: any = await (supabase.from as any)("leave_requests")
    .select("id, leave_type, start_date, end_date, status, total_hours, created_at")
    .eq("employee_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Leave Requests"
        actions={
          <Link
            href="/leave/new"
            className="px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            + New Request
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {!requests?.length ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground mb-4">No leave requests yet.</p>
              <Link
                href="/leave/new"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
              >
                Create your first leave request
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dates</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Hours</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requests.map((r: any) => (
                    <tr key={r.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{r.leave_type}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(new Date(r.start_date), "MMM d")} — {format(new Date(r.end_date), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3">{r.total_hours}h</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/leave/${r.id}`}
                          className="text-primary hover:underline text-sm"
                        >
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
