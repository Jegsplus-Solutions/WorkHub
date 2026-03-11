/**
 * POST /api/expenses/[id]/reject
 *
 * Rejects an expense report with a required reason.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient, createServiceClient, getCurrentUserRole } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/server/audit";
import { assertCanManagerAct } from "@/lib/server/workflow";

const BodySchema = z.object({
  managerComments: z.string().min(1, "Rejection reason is required").max(5000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { id: reportId } = await params;
    if (!reportId) return NextResponse.json({ error: "Missing report id in path" }, { status: 400 });

    let body;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    const { managerComments } = BodySchema.parse(body);

    const { data: r, error: rErr }: any = await supabase
      .from("expense_reports")
      .select("id, employee_id, manager_id, status")
      .eq("id", reportId)
      .single();

    if (rErr || !r) return NextResponse.json({ error: "Expense report not found" }, { status: 404 });

    assertCanManagerAct(r.status as any);

    const role = await getCurrentUserRole();
    const newStatus = role === "manager" ? "manager_rejected" : "rejected";

    const adminDb: any = createServiceClient();
    const { data: updated, error: uErr } = await adminDb
      .from("expense_reports")
      .update({
        status: newStatus,
        manager_comments: managerComments,
        rejected_at: new Date().toISOString(),
        approved_at: null,
      })
      .eq("id", reportId)
      .select()
      .single();

    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 400 });

    await writeAudit({
      actorUserId: user.id,
      entityType: "expense_report",
      entityId: reportId,
      action: "reject",
      comment: managerComments,
      beforeJson: r,
      afterJson: updated,
    });

    return NextResponse.json({ ok: true, report: updated });
  } catch (e: any) {
    if (e?.name === "ZodError") return NextResponse.json({ error: e.issues?.[0]?.message ?? "Validation error" }, { status: 422 });
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
