/**
 * GET /api/admin/directory-sync/status
 *
 * Returns the 30 most recent directory sync run records.
 * Accessible to admin and finance roles.
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient, isFinanceOrAdmin } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const allowed = await isFinanceOrAdmin();
    if (!allowed) {
      return NextResponse.json({ error: "Admin or Finance role required" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("directory_sync_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(30);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, runs: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to load sync status" }, { status: 500 });
  }
}
