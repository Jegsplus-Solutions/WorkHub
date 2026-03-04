import type { Config, Context } from "@netlify/functions";
import { z } from "zod";
import { json, getBearerToken, requireMethod } from "./_lib/http";
import { supabaseAdmin, supabaseUser } from "./_lib/supabase";
import { writeAudit } from "./_lib/audit";
import { assertCanManagerAct } from "./_lib/workflow";

export const config: Config = { path: "/api/timesheets/:id/reject" };

const BodySchema = z.object({
  managerComments: z.string().min(1, "Rejection reason is required").max(5000),
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
        status: "rejected",
        manager_comments: managerComments,
        rejected_at: new Date().toISOString(),
        approved_at: null,
      })
      .eq("id", timesheetId)
      .select()
      .single();

    if (uErr) return json(400, { error: uErr.message });

    await writeAudit({
      actorUserId: t.manager_id ?? null,
      entityType: "timesheet",
      entityId: timesheetId,
      action: "reject",
      comment: managerComments,
      beforeJson: t,
      afterJson: updated,
    });

    return json(200, { ok: true, timesheet: updated });
  } catch (e: any) {
    return json(400, { error: e?.message ?? "Unknown error" });
  }
}
