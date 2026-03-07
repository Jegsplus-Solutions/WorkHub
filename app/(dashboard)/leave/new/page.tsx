import { createServerSupabaseClient, getCurrentUserRole } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { LeaveRequestClient } from "@/components/leave/LeaveRequestClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "New Leave Request" };

export default async function NewLeavePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = await getCurrentUserRole();

  // Manager for this employee
  const { data: managerRow }: any = await supabase
    .from("employee_manager")
    .select("manager_id")
    .eq("employee_id", user.id)
    .single();

  return (
    <div className="flex flex-col h-full">
      <TopBar title="New Leave Request" />
      <div className="flex-1 overflow-y-auto p-6">
        <LeaveRequestClient
          leaveId={null}
          userId={user.id}
          managerId={managerRow?.manager_id ?? null}
          status="draft"
          userRole={role}
          initialData={{
            leaveType: "",
            startDate: "",
            endDate: "",
            hoursPerDay: 8,
            totalHours: 0,
            employeeNotes: "",
            attachmentPath: null,
          }}
        />
      </div>
    </div>
  );
}
