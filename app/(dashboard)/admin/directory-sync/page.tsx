import { createServerSupabaseClient, getCurrentUserRole } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { DirectorySyncPanel } from "@/components/admin/DirectorySyncPanel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Directory Sync" };

export default async function DirectorySyncPage() {
  const role = await getCurrentUserRole();
  if (role !== "admin") redirect("/unauthorized");

  const supabase = await createServerSupabaseClient();

  const [runsResult, profileCount, roleCount]: any[] = await Promise.all([
    supabase
      .from("directory_sync_runs" as any)
      .select("id, started_at, finished_at, status, users_fetched, profiles_updated, manager_links_upserted, role_grants_upserted, roles_removed, error")
      .order("started_at", { ascending: false })
      .limit(30),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("user_roles" as any).select("id", { count: "exact", head: true }),
  ]);

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Directory Sync" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          <DirectorySyncPanel
            runs={runsResult.data ?? []}
            activeUserCount={profileCount.count ?? 0}
            roleMappingCount={roleCount.count ?? 0}
          />
        </div>
      </div>
    </div>
  );
}
