import { createServerSupabaseClient, getCurrentUserRole } from "@/lib/supabase/server";
import { fetchDepartmentManagers, resolveDefaultManager } from "@/lib/server/managers";
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

  const { data: lr }: any = await supabase
    .from("leave_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (!lr) notFound();

  const userRole = await getCurrentUserRole();

  const { data: profile }: any = await supabase
    .from("profiles").select("department").eq("id", user.id).maybeSingle();
  const { managers, allDir } = await fetchDepartmentManagers(profile?.department ?? "");
  const defaultManagerId = await resolveDefaultManager(supabase, user.id, allDir);

  return (
    <div className="flex flex-col h-full">
      <TopBar title={`Leave Request — ${lr.leave_type}`} />
      <div className="flex-1 overflow-y-auto p-6">
        <LeaveRequestClient
          leaveId={lr.id}
          userId={user.id}
          managerId={lr.manager_id || defaultManagerId || null}
          managers={managers}
          defaultManagerId={defaultManagerId}
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
