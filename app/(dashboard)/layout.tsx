import { createServerSupabaseClient, getCurrentUserRole } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/layout/TopNav";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, role]: any[] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, email, avatar_url")
      .eq("id", user.id)
      .single(),
    getCurrentUserRole(),
  ]);

  // Count pending approvals for managers/admins/finance
  let pendingApprovals = 0;
  if (role === "manager" || role === "admin" || role === "finance") {
    const [ts, ex] = await Promise.all([
      supabase
        .from("timesheets")
        .select("id", { count: "exact", head: true })
        .eq("status", "submitted"),
      supabase
        .from("expense_reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "submitted"),
    ]);
    pendingApprovals = (ts.count ?? 0) + (ex.count ?? 0);
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <TopNav
        role={role as any}
        pendingApprovals={pendingApprovals}
        userName={profile?.display_name ?? user.email ?? ""}
        userEmail={profile?.email ?? user.email ?? ""}
        userAvatar={profile?.avatar_url ?? undefined}
      />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
