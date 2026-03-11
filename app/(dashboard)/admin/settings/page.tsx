import { createServerSupabaseClient, getCurrentUserRole } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { AppConfigPanel } from "@/components/admin/AppConfigPanel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Microsoft 365 Settings" };

interface ConfigRow {
  key: string;
  value: string;
  is_secret: boolean;
  label: string;
  description: string | null;
}

export default async function AdminSettingsPage() {
  const role = await getCurrentUserRole();
  if (role !== "admin") redirect("/dashboard");

  const supabase = await createServerSupabaseClient();

  const { data: rows } = await supabase
    .from("app_config")
    .select("key, value, is_secret, label, description")
    .order("key");

  // Mask secret values for initial render (admin can reveal via toggle)
  const configRows: ConfigRow[] = (rows ?? []).map((r: any) => ({
    ...r,
    value: r.is_secret && r.value ? "••••••••" : r.value,
  }));

  return (
    <div className="flex flex-col h-full">
      <TopBar breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Microsoft 365 Settings" }]} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <AppConfigPanel initialRows={configRows} />
        </div>
      </div>
    </div>
  );
}
