"use client";

import { useToast } from "@/hooks/use-toast";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-96 max-w-[calc(100vw-2rem)]">
      {toasts.map((toast) => {
        const Icon =
          toast.variant === "destructive"
            ? AlertCircle
            : toast.variant === "success"
            ? CheckCircle
            : Info;

        return (
          <div
            key={toast.id}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4 shadow-lg bg-background animate-fade-in",
              toast.variant === "destructive" && "border-red-200 bg-red-50",
              toast.variant === "success" && "border-emerald-200 bg-emerald-50"
            )}
          >
            <Icon
              className={cn(
                "w-5 h-5 shrink-0 mt-0.5",
                toast.variant === "destructive" && "text-red-500",
                toast.variant === "success" && "text-emerald-500",
                !toast.variant && "text-blue-500"
              )}
            />
            <div className="flex-1 min-w-0">
              {toast.title && (
                <p className="text-sm font-semibold">{toast.title}</p>
              )}
              {toast.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
