import type { Config, Context } from "@netlify/functions";
import { z } from "zod";
import { json, getBearerToken, requireMethod } from "./_lib/http";
import { supabaseAdmin, supabaseUser } from "./_lib/supabase";
import { writeAudit } from "./_lib/audit";
import { assertCanManagerAct } from "./_lib/workflow";
import { syncTimesheetToSharePoint } from "./_lib/sharepoint/sync";

export const config: Config = { path: "/api/timesheets/:id/approve" };

const BodySchema = z.object({
  managerComments: z.string().max(5000).optional(),
});

export default async function handler(req: Request, context: Context): Promise<Response> {
  const methodError = requireMethod(req, "POST");
  if (methodError) return methodError;

  try {
    const token = getBearerToken(req);
    if (!token) return json(401, { error: "Missing Bearer token" });

    const timesheetId = context.params?.id;
    if (!timesheetId) return json(400, { error: "Missing timesheet id in path" });

    const body = await req.json().catch(() => ({}));
    const { managerComments } = BodySchema.parse(body);

    const userDb = supabaseUser(token);
    const { data: t, error: tErr } = await userDb
      .from("timesheets")
      .select("id, employee_id, manager_id, status")
      .eq("id", timesheetId)
      .single();

    if (tErr || !t) return json(404, { error: "Timesheet not found" });

    assertCanManagerAct(t.status as any);

    const adminDb = supabaseAdmin();
    const { data: updated, error: uErr } = await adminDb
      .from("timesheets")
      .update({
        status: "approved",
        manager_comments: managerComments ?? null,
        approved_at: new Date().toISOString(),
        rejected_at: null,
      })
      .eq("id", timesheetId)
      .select()
      .single();

    if (uErr) return json(400, { error: uErr.message });

    await writeAudit({
      actorUserId: t.manager_id ?? null,
      entityType: "timesheet",
      entityId: timesheetId,
      action: "approve",
      comment: managerComments,
      beforeJson: t,
      afterJson: updated,
    });

    // Trigger SharePoint sync
    let sharepointSync: { ok: boolean; error?: string } = { ok: true };
    try {
      await syncTimesheetToSharePoint(timesheetId);
      await writeAudit({
        actorUserId: t.manager_id ?? null,
        entityType: "sharepoint_sync",
        entityId: timesheetId,
        action: "sync_success",
        comment: "Timesheet SharePoint export succeeded",
      });
    } catch (syncErr: any) {
      sharepointSync = { ok: false, error: syncErr?.message };
      await writeAudit({
        actorUserId: t.manager_id ?? null,
        entityType: "sharepoint_sync",
        entityId: timesheetId,
        action: "sync_failed",
        comment: syncErr?.message ?? "SharePoint export failed",
      });
    }

    return json(200, { ok: true, timesheet: updated, sharepointSync });
  } catch (e: any) {
    return json(400, { error: e?.message ?? "Unknown error" });
  }
}
