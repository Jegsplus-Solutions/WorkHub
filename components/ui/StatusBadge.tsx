import { cn } from "@/lib/utils";

type Status = "draft" | "submitted" | "approved" | "rejected" | string;

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  submitted: {
    label: "Submitted",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  manager_approved: {
    label: "Manager Approved",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  manager_rejected: {
    label: "Manager Rejected",
    className: "bg-orange-50 text-orange-700 border-orange-200",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full mr-1.5",
          status === "draft" && "bg-slate-400",
          status === "submitted" && "bg-amber-500",
          status === "manager_approved" && "bg-blue-500",
          status === "approved" && "bg-emerald-500",
          status === "manager_rejected" && "bg-orange-500",
          status === "rejected" && "bg-red-500"
        )}
      />
      {config.label}
    </span>
  );
}
