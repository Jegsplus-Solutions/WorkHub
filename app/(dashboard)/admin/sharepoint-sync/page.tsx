import { createServerSupabaseClient, getCurrentUserRole } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { SharePointSyncPanel } from "@/components/admin/SharePointSyncPanel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "SharePoint Sync" };

export default async function SharePointSyncPage() {
  const role = await getCurrentUserRole();
  if (role !== "admin") redirect("/dashboard");

  const supabase = await createServerSupabaseClient();

  const { data: logs }: any = await supabase
    .from("sharepoint_sync")
    .select("id, entity_type, entity_id, last_status, last_synced_at, last_error, sync_key, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="flex flex-col h-full">
      <TopBar breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "SharePoint Sync" }]} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          <SharePointSyncPanel logs={logs ?? []} />
        </div>
      </div>
    </div>
  );
}
