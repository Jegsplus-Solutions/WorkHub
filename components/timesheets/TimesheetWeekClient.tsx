"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TimesheetGrid } from "./TimesheetGrid";
import { TimesheetPrintView } from "./TimesheetPrintView";
import { AuditTimeline } from "@/components/ui/AuditTimeline";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { validateTimesheet } from "@/domain/timesheets/validation";
import type { TimesheetRow, TimesheetSettings } from "@/domain/timesheets/types";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Save, Send, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimesheetWeekClientProps {
  timesheetId: string | null;
  userId: string;
  year: number;
  month: number;
  weekNumber: number;
  initialRows: TimesheetRow[];
  settings: TimesheetSettings;
  projects: Array<{ id: string; code: string; title: string }>;
  billingTypes: Array<{ id: string; name: string; requires_project: boolean }>;
  weekDates: Record<string, string>;
  status: string;
  userRole: string;
  userName: string;
  userEmail: string;
  managerId?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  managerComments?: string | null;
  employeeNotes?: string | null;
  auditLog: any[];
}

type Tab = "entry" | "print" | "history";

export function TimesheetWeekClient({
  timesheetId,
  userId,
  year,
  month,
  weekNumber,
  initialRows,
  settings,
  projects,
  billingTypes,
  weekDates,
  status: initialStatus,
  userRole,
  userName,
  userEmail,
  managerId,
  submittedAt,
  approvedAt,
  rejectedAt,
  managerComments,
  employeeNotes,
  auditLog,
}: TimesheetWeekClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [rows, setRows] = useState<TimesheetRow[]>(initialRows);
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("entry");
  const [rejectionText, setRejectionText] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [notes, setNotes] = useState(employeeNotes ?? "");

  const isDraft = status === "draft";
  const isSubmitted = status === "submitted";
  const isManagerApproved = status === "manager_approved";
  const isManagerRejected = status === "manager_rejected";
  const canEdit = isDraft || isManagerRejected;
  const canApprove =
    (isSubmitted && (userRole === "manager" || userRole === "admin" || userRole === "finance")) ||
    (isManagerApproved && (userRole === "admin" || userRole === "finance"));

  const validation = validateTimesheet(rows, settings);

  async function writeAuditLog(id: string, action: string, comment?: string) {
    await (supabase.from as any)("audit_log").insert({
      actor_user_id: userId,
      entity_type: "timesheet",
      entity_id: id,
      action: action,
      comment: comment ?? null,
    });
  }

  async function save(newStatus?: string) {
    setSaving(true);
    try {
      let tsId = timesheetId;

      if (!tsId) {
        const { data, error } = await (supabase.from as any)("timesheets")
          .insert({
            employee_id: userId,
            manager_id: managerId ?? null,
            year,
            month,
            week_number: weekNumber,
            status: newStatus ?? "draft",
            employee_notes: notes || null,
          })
          .select("id")
          .single();
        if (error) throw error;
        tsId = data.id;
      } else {
        const { error } = await (supabase.from as any)("timesheets")
          .update({
            status: newStatus ?? status,
            employee_notes: notes || null,
            ...(newStatus === "submitted" ? { submitted_at: new Date().toISOString() } : {}),
          })
          .eq("id", tsId);
        if (error) throw error;
      }

      // Delete all existing rows and re-insert (simpler than upsert for this schema)
      await (supabase.from as any)("timesheet_rows").delete().eq("timesheet_id", tsId);

      const rowData = rows.map((r) => ({
        timesheet_id: tsId!,
        project_id: r.projectId,
        billing_type_id: r.billingTypeId,
        sun: r.hours.sun,
        mon: r.hours.mon,
        tue: r.hours.tue,
        wed: r.hours.wed,
        thu: r.hours.thu,
        fri: r.hours.fri,
        sat: r.hours.sat,
      }));

      if (rowData.length > 0) {
        const { error: rowError } = await (supabase.from as any)("timesheet_rows").insert(rowData);
        if (rowError) throw rowError;
      }

      await writeAuditLog(
        tsId!,
        newStatus === "submitted" ? "submit" : timesheetId ? "update" : "create"
      );

      if (newStatus) setStatus(newStatus);

      toast({
        title: newStatus === "submitted" ? "Submitted for approval" : "Saved",
        variant: "success",
      });

      if (!timesheetId && tsId) {
        router.replace(`/timesheets/${tsId}`);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    setSaving(true);
    // Manager → manager_approved; Finance/Admin → approved (final)
    const newStatus = userRole === "manager" ? "manager_approved" : "approved";
    try {
      await (supabase.from as any)("timesheets")
        .update({ status: newStatus, approved_at: new Date().toISOString() })
        .eq("id", timesheetId!);

      await writeAuditLog(timesheetId!, "approve");
      setStatus(newStatus);
      toast({ title: userRole === "manager" ? "Sent for final approval" : "Timesheet approved", variant: "success" });
      router.refresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!rejectionText.trim()) return;
    setSaving(true);
    // Manager → manager_rejected; Finance/Admin → rejected (final)
    const newStatus = userRole === "manager" ? "manager_rejected" : "rejected";
    try {
      await (supabase.from as any)("timesheets")
        .update({
          status: newStatus,
          rejected_at: new Date().toISOString(),
          manager_comments: rejectionText,
        })
        .eq("id", timesheetId!);

      await writeAuditLog(timesheetId!, "reject", rejectionText);
      setStatus(newStatus);
      setShowRejectModal(false);
      toast({ title: "Timesheet rejected", variant: "destructive" });
      router.refresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleRecall() {
    if (!timesheetId) return;
    setSaving(true);
    try {
      await (supabase.from as any)("timesheets")
        .update({ status: "draft", submitted_at: null })
        .eq("id", timesheetId);

      await writeAuditLog(timesheetId, "update", "Recalled to draft");
      setStatus("draft");
      toast({ title: "Timesheet recalled to draft" });
      router.refresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">
            Week {weekNumber} of {month}/{year}
          </h2>
          <StatusBadge status={status} />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <button
                onClick={() => save()}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => save("submitted")}
                disabled={saving || !validation.valid}
                title={!validation.valid ? "Fix errors before submitting" : ""}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                Submit for Approval
              </button>
            </>
          )}

          {status === "submitted" && (
            <button
              onClick={handleRecall}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Recall
            </button>
          )}

          {canApprove && (
            <>
              <button
                onClick={handleApprove}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                Approve
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            </>
          )}
        </div>
      </div>

      {/* Manager/Finance comments (rejection reason) */}
      {(status === "rejected" || status === "manager_rejected") && managerComments && (
        <div className={`p-3 rounded-lg border text-sm ${status === "manager_rejected" ? "bg-orange-50 border-orange-200 text-orange-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          <strong>{status === "manager_rejected" ? "Manager rejected:" : "Rejected:"}</strong> {managerComments}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["entry", "print", "history"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors",
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === "entry" ? "Time Entry" : tab === "print" ? "Print View" : "History"}
          </button>
        ))}
      </div>

      {/* Employee notes (draft/rejected only) */}
      {activeTab === "entry" && canEdit && (
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes for your manager…"
            className="mt-1 w-full border border-border rounded-lg p-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}

      {/* Tab content */}
      {activeTab === "entry" && (
        <TimesheetGrid
          rows={rows}
          settings={settings}
          projects={projects}
          billingTypes={billingTypes}
          weekDates={weekDates}
          readOnly={!canEdit}
          onChange={setRows}
        />
      )}

      {activeTab === "print" && (
        <TimesheetPrintView
          rows={rows}
          settings={settings}
          weekNumber={weekNumber}
          year={year}
          weekDates={weekDates}
          userName={userName}
          userEmail={userEmail}
          status={status}
          projects={projects}
          billingTypes={billingTypes}
          submittedAt={submittedAt}
          approvedAt={approvedAt}
        />
      )}

      {activeTab === "history" && (
        <div className="max-w-sm">
          <AuditTimeline entries={auditLog} />
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-background rounded-xl border border-border shadow-2xl w-full max-w-md p-6">
            <h3 className="font-semibold text-lg mb-2">Reject Timesheet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Please provide a reason for rejection so the employee can correct their timesheet.
            </p>
            <textarea
              value={rejectionText}
              onChange={(e) => setRejectionText(e.target.value)}
              placeholder="Enter rejection reason…"
              className="w-full border border-border rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionText.trim() || saving}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? "Rejecting…" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
