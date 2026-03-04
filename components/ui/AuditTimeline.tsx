import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  XCircle,
  Send,
  Edit3,
  RotateCcw,
  PlusCircle,
} from "lucide-react";

interface AuditEntry {
  id: string;
  action: string;
  actor_id: string;
  actorName?: string;
  previous_status?: string | null;
  new_status?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

interface AuditTimelineProps {
  entries: AuditEntry[];
  className?: string;
}

const ACTION_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; label: string }
> = {
  created: { icon: PlusCircle, color: "text-slate-500", label: "Created" },
  updated: { icon: Edit3, color: "text-blue-500", label: "Updated" },
  submitted: { icon: Send, color: "text-amber-500", label: "Submitted for approval" },
  approved: { icon: CheckCircle, color: "text-emerald-500", label: "Approved" },
  rejected: { icon: XCircle, color: "text-red-500", label: "Rejected" },
  recalled: { icon: RotateCcw, color: "text-slate-500", label: "Recalled" },
};

export function AuditTimeline({ entries, className }: AuditTimelineProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No history yet
      </p>
    );
  }

  return (
    <ol className={cn("relative space-y-0", className)}>
      {entries.map((entry, idx) => {
        const config = ACTION_CONFIG[entry.action] ?? ACTION_CONFIG.updated;
        const Icon = config.icon;
        const isLast = idx === entries.length - 1;

        return (
          <li key={entry.id} className="flex gap-3 pb-4 relative">
            {/* Vertical line */}
            {!isLast && (
              <div className="absolute left-3.5 top-7 bottom-0 w-px bg-border" />
            )}

            {/* Icon */}
            <div className="shrink-0 w-7 h-7 rounded-full bg-background border border-border flex items-center justify-center z-10">
              <Icon className={cn("w-3.5 h-3.5", config.color)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-sm font-medium">{config.label}</p>
              {entry.actorName && (
                <p className="text-xs text-muted-foreground">
                  by {entry.actorName}
                </p>
              )}
              {(entry.metadata?.reason as string | undefined) && (
                <p className="mt-1 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                  Reason: {entry.metadata!.reason as string}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(entry.created_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
