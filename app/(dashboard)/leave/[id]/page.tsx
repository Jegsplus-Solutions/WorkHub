import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { LeaveRequestClient } from "@/components/leave/LeaveRequestClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Leave Request" };

export default async function LeaveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lr }: any = await (supabase.from as any)("leave_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (!lr) notFound();

  // Load current user role
  const { data: rolesData }: any = await supabase
    .from("user_roles" as any)
    .select("role")
    .eq("user_id", user.id);
  const roles = (rolesData ?? []).map((r: any) => r.role);
  const userRole = roles.includes("admin")
    ? "admin"
    : roles.includes("finance")
      ? "finance"
      : roles.includes("manager")
        ? "manager"
        : "employee";

  return (
    <div className="flex flex-col h-full">
      <TopBar title={`Leave Request — ${lr.leave_type}`} />
      <div className="flex-1 overflow-y-auto p-6">
        <LeaveRequestClient
          leaveId={lr.id}
          userId={user.id}
          managerId={lr.manager_id}
          status={lr.status}
          userRole={userRole}
          managerComments={lr.manager_comments}
          initialData={{
            leaveType: lr.leave_type,
            startDate: lr.start_date,
            endDate: lr.end_date,
            hoursPerDay: Number(lr.hours_per_day),
            totalHours: Number(lr.total_hours),
            employeeNotes: lr.employee_notes ?? "",
            attachmentPath: lr.attachment_path,
          }}
        />
      </div>
    </div>
  );
}
