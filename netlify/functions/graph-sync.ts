/**
 * Netlify Scheduled Function: graph-sync
 *
 * Runs daily (cron: "0 2 * * *") to sync Entra ID users and group memberships
 * into the Supabase profiles, user_roles, and employee_manager tables.
 *
 * Requires app permissions in Entra:
 *   - User.Read.All
 *   - Group.Read.All
 *   - Directory.Read.All
 */

import type { Config, Context } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { createGraphClient, fetchAllUsers, fetchGroupMembers } from "../../lib/msGraph/client";


export const config: Config = {
  schedule: "0 2 * * *",
};

export default async function handler(_req: Request, _context: Context) {
  const startedAt = Date.now();
  const results = { created: 0, updated: 0, errors: 0 };

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const graph = createGraphClient();

  // ── Fetch role group memberships ────────────────────────────────────────────
  const [adminIds, managerIds, financeIds] = await Promise.all([
    fetchGroupMembers(graph, process.env.AZURE_GROUP_ADMINS!).catch(() => []),
    fetchGroupMembers(graph, process.env.AZURE_GROUP_MANAGERS!).catch(() => []),
    fetchGroupMembers(graph, process.env.AZURE_GROUP_FINANCE ?? "").catch(() => []),
  ]);

  const adminSet = new Set(adminIds);
  const managerSet = new Set(managerIds);
  const financeSet = new Set(financeIds);

  // ── Fetch all users from Graph ───────────────────────────────────────────────
  const graphUsers = await fetchAllUsers(graph);
  console.log(`[graph-sync] Fetched ${graphUsers.length} users from Entra ID`);

  // ── Get existing profiles indexed by azure_user_id and email ─────────────────
  const { data: existingProfiles } = await supabase
    .from("profiles")
    .select("id, azure_user_id, email");

  const existingByAzureId = new Map(
    (existingProfiles ?? [])
      .filter((p) => p.azure_user_id)
      .map((p) => [p.azure_user_id!, p.id])
  );
  const existingByEmail = new Map(
    (existingProfiles ?? [])
      .filter((p) => p.email)
      .map((p) => [p.email!.toLowerCase(), p.id])
  );

  // Build map of Graph user IDs → Supabase IDs for manager resolution
  const graphIdToSupabaseId = new Map<string, string>();
  for (const u of graphUsers) {
    const supabaseId =
      existingByAzureId.get(u.id) ?? existingByEmail.get(u.mail.toLowerCase());
    if (supabaseId) graphIdToSupabaseId.set(u.id, supabaseId);
  }

  // ── Upsert profiles + roles + manager relationships ──────────────────────────
  for (const graphUser of graphUsers) {
    try {
      const existingId =
        existingByAzureId.get(graphUser.id) ??
        existingByEmail.get(graphUser.mail.toLowerCase());

      const managerId = graphUser.manager?.id
        ? graphIdToSupabaseId.get(graphUser.manager.id) ?? null
        : null;

      if (existingId) {
        // Update profile metadata (profiles has no work_status column)
        const { error } = await supabase
          .from("profiles")
          .update({
            display_name: graphUser.displayName,
            email: graphUser.mail,
            azure_user_id: graphUser.id,
            job_title: graphUser.jobTitle ?? null,
            department: graphUser.department ?? null,
          })
          .eq("id", existingId);

        if (error) {
          results.errors++;
          console.error("[graph-sync] profile update error:", error);
          continue;
        }

        // Sync roles: wipe existing, insert fresh from group membership
        await supabase.from("user_roles").delete().eq("user_id", existingId);
        const rolesToInsert: Array<{ user_id: string; role: string }> = [];
        if (adminSet.has(graphUser.id)) rolesToInsert.push({ user_id: existingId, role: "admin" });
        if (managerSet.has(graphUser.id)) rolesToInsert.push({ user_id: existingId, role: "manager" });
        if (financeSet.has(graphUser.id)) rolesToInsert.push({ user_id: existingId, role: "finance" });
        if (rolesToInsert.length === 0) rolesToInsert.push({ user_id: existingId, role: "employee" });
        await supabase.from("user_roles").insert(rolesToInsert as any);

        // Sync manager relationship
        if (managerId) {
          await supabase
            .from("employee_manager")
            .upsert({ employee_id: existingId, manager_id: managerId }, {
              onConflict: "employee_id",
            });
        } else {
          await supabase.from("employee_manager").delete().eq("employee_id", existingId);
        }

        results.updated++;
      } else {
        // User not yet in Supabase — must SSO-login first to trigger handle_new_user.
        results.created++;
      }
    } catch (err) {
      results.errors++;
      console.error("[graph-sync] error processing user:", graphUser.mail, err);
    }
  }

  const elapsed = Date.now() - startedAt;
  console.log(`[graph-sync] Done in ${elapsed}ms:`, results);

  return new Response(
    JSON.stringify({ ok: true, elapsed, ...results }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
