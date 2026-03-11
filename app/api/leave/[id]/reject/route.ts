/**
 * POST /api/leave/[id]/reject
 *
 * Rejects a leave request with a required reason.
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

    const role = await getCurrentUserRole();
    if (!["manager", "admin", "finance"].includes(role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { id: leaveId } = await params;
    if (!leaveId) return NextResponse.json({ error: "Missing leave request id" }, { status: 400 });

    let body;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    const { managerComments } = BodySchema.parse(body);

    const { data: lr, error: lrErr }: any = await supabase
      .from("leave_requests")
      .select("id, employee_id, manager_id, status")
      .eq("id", leaveId)
      .single();

    if (lrErr || !lr) return NextResponse.json({ error: "Leave request not found" }, { status: 404 });

    assertCanManagerAct(lr.status);

    const newStatus = role === "manager" ? "manager_rejected" : "rejected";
    const adminDb: any = createServiceClient();
    const { data: updated, error: uErr } = await adminDb
      .from("leave_requests")
      .update({
        status: newStatus,
        manager_comments: managerComments,
        rejected_at: new Date().toISOString(),
        approved_at: null,
      })
      .eq("id", leaveId)
      .select()
      .single();

    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 400 });

    await writeAudit({
      actorUserId: user.id,
      entityType: "leave_request",
      entityId: leaveId,
      action: "reject",
      comment: managerComments,
      beforeJson: lr,
      afterJson: updated,
    });

    return NextResponse.json({ ok: true, leaveRequest: updated });
  } catch (e: any) {
    if (e?.name === "ZodError") return NextResponse.json({ error: e.issues?.[0]?.message ?? "Validation error" }, { status: 422 });
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
