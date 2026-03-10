import { createServerSupabaseClient, getCurrentUserRole } from "@/lib/supabase/server";
import { fetchDepartmentManagers, resolveDefaultManager } from "@/lib/server/managers";
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

  const { data: profile }: any = await supabase
    .from("profiles").select("department").eq("id", user.id).maybeSingle();
  const { managers, allDir } = await fetchDepartmentManagers(profile?.department ?? "");
  const defaultManagerId = await resolveDefaultManager(supabase, user.id, allDir);

  return (
    <div className="flex flex-col h-full">
      <TopBar title="New Leave Request" />
      <div className="flex-1 overflow-y-auto p-6">
        <LeaveRequestClient
          leaveId={null}
          userId={user.id}
          managerId={defaultManagerId || null}
          managers={managers}
          defaultManagerId={defaultManagerId}
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
