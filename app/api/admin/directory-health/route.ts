/**
 * GET /api/admin/directory-health?limit=50
 *
 * Returns directory health metrics and issue lists for the admin dashboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, isFinanceOrAdmin } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const allowed = await isFinanceOrAdmin();
    if (!allowed) {
      return NextResponse.json({ error: "Admin or Finance role required" }, { status: 403 });
    }

    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "50"), 200);

    const [metricsRes, missingIdentityRes, missingManagerRes, dupEmpNoRes, mgrNoRoleRes] =
      await Promise.all([
        supabase.from("v_directory_health_metrics").select("*").single(),
        supabase.from("v_directory_missing_identity").select("*").order("updated_at", { ascending: false }).limit(limit),
        supabase.from("v_directory_missing_manager").select("*").order("updated_at", { ascending: false }).limit(limit),
        supabase.from("v_directory_duplicate_employee_number").select("*").order("occurrences", { ascending: false }).limit(limit),
        supabase.from("v_directory_managers_without_role").select("*").order("direct_reports_count", { ascending: false }).limit(limit),
      ]);

    if (metricsRes.error) return NextResponse.json({ error: metricsRes.error.message }, { status: 400 });

    return NextResponse.json({
      ok: true,
      metrics: metricsRes.data,
      lists: {
        missingIdentity: missingIdentityRes.data ?? [],
        missingManager: missingManagerRes.data ?? [],
        duplicateEmployeeNumber: dupEmpNoRes.data ?? [],
        managersWithoutRole: mgrNoRoleRes.data ?? [],
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to load directory health" }, { status: 500 });
  }
}
