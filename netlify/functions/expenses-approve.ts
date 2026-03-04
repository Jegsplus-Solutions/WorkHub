import type { Config, Context } from "@netlify/functions";
import { z } from "zod";
import { json, getBearerToken, requireMethod } from "./_lib/http";
import { supabaseAdmin, supabaseUser } from "./_lib/supabase";
import { writeAudit } from "./_lib/audit";
import { assertCanManagerAct } from "./_lib/workflow";
import { syncExpenseReportToSharePoint } from "./_lib/sharepoint/sync";

export const config: Config = { path: "/api/expenses/:id/approve" };

const BodySchema = z.object({
  managerComments: z.string().max(5000).optional(),
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
        status: "approved",
        manager_comments: managerComments ?? null,
        approved_at: new Date().toISOString(),
        rejected_at: null,
      })
      .eq("id", reportId)
      .select()
      .single();

    if (uErr) return json(400, { error: uErr.message });

    await writeAudit({
      actorUserId: r.manager_id ?? null,
      entityType: "expense_report",
      entityId: reportId,
      action: "approve",
      comment: managerComments,
      beforeJson: r,
      afterJson: updated,
    });

    let sharepointSync: { ok: boolean; error?: string } = { ok: true };
    try {
      await syncExpenseReportToSharePoint(reportId);
      await writeAudit({
        actorUserId: r.manager_id ?? null,
        entityType: "sharepoint_sync",
        entityId: reportId,
        action: "sync_success",
        comment: "Expense SharePoint export succeeded",
      });
    } catch (syncErr: any) {
      sharepointSync = { ok: false, error: syncErr?.message };
      await writeAudit({
        actorUserId: r.manager_id ?? null,
        entityType: "sharepoint_sync",
        entityId: reportId,
        action: "sync_failed",
        comment: syncErr?.message ?? "SharePoint export failed",
      });
    }

    return json(200, { ok: true, report: updated, sharepointSync });
  } catch (e: any) {
    return json(400, { error: e?.message ?? "Unknown error" });
  }
}
