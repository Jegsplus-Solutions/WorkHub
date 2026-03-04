"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Clock, RotateCcw, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SyncLog {
  id: string;
  entity_type: string;
  entity_id: string;
  last_status: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  sync_key: string;
  created_at: string;
}

interface SharePointSyncPanelProps {
  logs: SyncLog[];
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; className: string; label: string }> = {
  success: { icon: CheckCircle, className: "text-emerald-600", label: "Success" },
  failed: { icon: XCircle, className: "text-red-500", label: "Failed" },
  pending: { icon: Clock, className: "text-amber-500", label: "Pending" },
};

export function SharePointSyncPanel({ logs: initialLogs }: SharePointSyncPanelProps) {
  const [logs, setLogs] = useState(initialLogs);
  const [retrying, setRetrying] = useState<string | null>(null);

  async function handleRetry(log: SyncLog) {
    setRetrying(log.id);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: log.entity_type, id: log.entity_id }),
      });
      const result = await res.json();
      if (result.ok) {
        toast({ title: "Export re-triggered", variant: "success" });
        // Optimistically update the status
        setLogs((prev) => prev.map((l) => l.id === log.id ? { ...l, last_status: "pending" } : l));
      } else {
        throw new Error(result.error ?? "Export failed");
      }
    } catch (err: any) {
      toast({ title: "Retry failed", description: err.message, variant: "destructive" });
    } finally {
      setRetrying(null);
    }
  }

  const failedCount = logs.filter((l) => l.last_status === "failed").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold mb-1">SharePoint Sync Logs</h2>
          <p className="text-sm text-muted-foreground">
            All approved timesheet and expense exports to SharePoint. Retry failed exports below.
          </p>
        </div>
        {failedCount > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
            {failedCount} failed
          </span>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          No sync logs yet. Approve a timesheet or expense to trigger the first export.
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Record ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Exported</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => {
                const status = log.last_status ?? "pending";
                const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
                const Icon = cfg.icon;
                return (
                  <tr key={log.id} className="hover:bg-accent/30">
                    <td className="px-4 py-3">
                      <span className={cn("flex items-center gap-1.5 text-xs font-medium", cfg.className)}>
                        <Icon className="w-3.5 h-3.5" />
                        {cfg.label}
                      </span>
                      {log.last_error && (
                        <p className="text-xs text-red-400 mt-0.5 max-w-[180px] truncate" title={log.last_error}>
                          {log.last_error}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize text-xs font-medium">{log.entity_type.replace("_", " ")}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate font-mono">
                      {log.entity_id}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {log.last_synced_at
                        ? format(new Date(log.last_synced_at), "MMM d, yyyy 'at' h:mm a")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {status === "failed" && (
                          <button
                            onClick={() => handleRetry(log)}
                            disabled={retrying === log.id}
                            className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                          >
                            <RotateCcw className={cn("w-3 h-3", retrying === log.id && "animate-spin")} />
                            Retry
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
