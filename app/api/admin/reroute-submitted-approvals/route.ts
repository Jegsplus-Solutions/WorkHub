/**
 * POST /api/admin/reroute-submitted-approvals?override=false
 *
 * Re-routes submitted timesheets and expense reports to the correct manager.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/server/audit";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .limit(1);
    if (!roleRows || roleRows.length === 0) return NextResponse.json({ error: "Admin role required" }, { status: 403 });

    const overrideExisting =
      (req.nextUrl.searchParams.get("override") ?? "false") === "true";

    const db: any = createServiceClient();

    const { data: mapRows, error: mapErr } = await db
      .from("employee_manager")
      .select("employee_id, manager_id");
    if (mapErr) return NextResponse.json({ error: mapErr.message }, { status: 400 });

    const managerByEmployee = new Map<string, string | null>();
    for (const r of mapRows ?? []) managerByEmployee.set(r.employee_id, r.manager_id);

    const { data: ts, error: tsErr } = await db
      .from("timesheets")
      .select("id, employee_id, manager_id")
      .eq("status", "submitted");
    if (tsErr) return NextResponse.json({ error: tsErr.message }, { status: 400 });

    let timesheetsRerouted = 0;
    for (const t of ts ?? []) {
      const correct = managerByEmployee.get(t.employee_id as string) ?? null;
      const needsUpdate = overrideExisting
        ? correct !== (t.manager_id ?? null)
        : !(t.manager_id) && !!correct;
      if (!needsUpdate) continue;
      const { error } = await db.from("timesheets").update({ manager_id: correct } as any).eq("id", t.id);
      if (!error) timesheetsRerouted++;
    }

    const { data: ex, error: exErr } = await db
      .from("expense_reports")
      .select("id, employee_id, manager_id")
      .eq("status", "submitted");
    if (exErr) return NextResponse.json({ error: exErr.message }, { status: 400 });

    let expensesRerouted = 0;
    for (const r of ex ?? []) {
      const correct = managerByEmployee.get(r.employee_id as string) ?? null;
      const needsUpdate = overrideExisting
        ? correct !== (r.manager_id ?? null)
        : !(r.manager_id) && !!correct;
      if (!needsUpdate) continue;
      const { error } = await db.from("expense_reports").update({ manager_id: correct } as any).eq("id", r.id);
      if (!error) expensesRerouted++;
    }

    await writeAudit({
      actorUserId: null,
      entityType: "directory_sync",
      entityId: null,
      action: "update",
      comment: `Rerouted submitted approvals. Timesheets=${timesheetsRerouted}, Expenses=${expensesRerouted}, override=${overrideExisting}`,
    });

    return NextResponse.json({
      ok: true,
      overrideExisting,
      timesheetsRerouted,
      expensesRerouted,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to reroute submissions" }, { status: 500 });
  }
}
