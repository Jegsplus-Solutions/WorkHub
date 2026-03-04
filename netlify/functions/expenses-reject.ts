import type { Config, Context } from "@netlify/functions";
import { z } from "zod";
import { json, getBearerToken, requireMethod } from "./_lib/http";
import { supabaseAdmin, supabaseUser } from "./_lib/supabase";
import { writeAudit } from "./_lib/audit";
import { assertCanManagerAct } from "./_lib/workflow";

export const config: Config = { path: "/api/expenses/:id/reject" };

const BodySchema = z.object({
  managerComments: z.string().min(1, "Rejection reason is required").max(5000),
});

export default async function handler(req: Request, context: Context): Promise<Response> {
  const methodError = requireMethod(req, "POST");
  if (methodError) return methodError;

  try {
    const token = getBearerToken(req);
    if (!token) return json(401, { error: "Missing Bearer token" });

    const reportId = context.params?.id;
    if (!reportId) return json(400, { error: "Missing report id in path" });

    const body = await req.json().catch(() => ({}));
    const { managerComments } = BodySchema.parse(body);

    const userDb = supabaseUser(token);
    const { data: r, error: rErr } = await userDb
      .from("expense_reports")
      .select("id, employee_id, manager_id, status")
      .eq("id", reportId)
      .single();

    if (rErr || !r) return json(404, { error: "Expense report not found" });

    assertCanManagerAct(r.status as any);

    const adminDb = supabaseAdmin();
    const { data: updated, error: uErr } = await adminDb
      .from("expense_reports")
      .update({
        status: "rejected",
        manager_comments: managerComments,
        rejected_at: new Date().toISOString(),
        approved_at: null,
      })
      .eq("id", reportId)
      .select()
      .single();

    if (uErr) return json(400, { error: uErr.message });

    await writeAudit({
      actorUserId: r.manager_id ?? null,
      entityType: "expense_report",
      entityId: reportId,
      action: "reject",
      comment: managerComments,
      beforeJson: r,
      afterJson: updated,
    });

    return json(200, { ok: true, report: updated });
  } catch (e: any) {
    return json(400, { error: e?.message ?? "Unknown error" });
  }
}
