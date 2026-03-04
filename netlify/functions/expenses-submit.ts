import type { Config, Context } from "@netlify/functions";
import { json, getBearerToken, requireMethod } from "./_lib/http";
import { supabaseAdmin, supabaseUser } from "./_lib/supabase";
import { writeAudit } from "./_lib/audit";
import { assertCanSubmit } from "./_lib/workflow";

export const config: Config = { path: "/api/expenses/:id/submit" };

export default async function handler(req: Request, context: Context): Promise<Response> {
  const methodError = requireMethod(req, "POST");
  if (methodError) return methodError;

  try {
    const token = getBearerToken(req);
    if (!token) return json(401, { error: "Missing Bearer token" });

    const reportId = context.params?.id;
    if (!reportId) return json(400, { error: "Missing report id in path" });

    const userDb = supabaseUser(token);
    const { data: r, error: rErr } = await userDb
      .from("expense_reports")
      .select("id, employee_id, manager_id, status")
      .eq("id", reportId)
      .single();

    if (rErr || !r) return json(404, { error: "Expense report not found" });

    assertCanSubmit(r.status as any);

    const adminDb = supabaseAdmin();

    let managerId = r.manager_id as string | null;
    if (!managerId) {
      const { data: em } = await adminDb
        .from("employee_manager")
        .select("manager_id")
        .eq("employee_id", r.employee_id)
        .single();
      managerId = em?.manager_id ?? null;
    }

    const { data: updated, error: uErr } = await adminDb
      .from("expense_reports")
      .update({
        status: "submitted",
        manager_id: managerId,
        submitted_at: new Date().toISOString(),
        rejected_at: null,
        approved_at: null,
      })
      .eq("id", reportId)
      .select()
      .single();

    if (uErr) return json(400, { error: uErr.message });

    await writeAudit({
      actorUserId: r.employee_id,
      entityType: "expense_report",
      entityId: reportId,
      action: "submit",
      beforeJson: r,
      afterJson: updated,
    });

    return json(200, { ok: true, report: updated });
  } catch (e: any) {
    return json(400, { error: e?.message ?? "Unknown error" });
  }
}
