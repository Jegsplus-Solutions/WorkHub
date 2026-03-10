import { getCurrentUserRole } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import DirectoryPanel from "@/components/admin/DirectoryPanel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Employee Directory" };

export default async function DirectoryPage() {
  const role = await getCurrentUserRole();
  if (role !== "admin") redirect("/dashboard");

  const adminDb: any = createServiceClient();

  const { data: members }: any = await adminDb
    .from("directory_members")
    .select("*")
    .order("display_name");

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Employee Directory" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <DirectoryPanel members={members ?? []} />
        </div>
      </div>
    </div>
  );
}
