"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface ProfileSettingsProps {
  hoursConfig: { contracted_hours: number; maximum_hours: number };
  userId: string;
  userRole: string;
}

export function ProfileSettings({ hoursConfig, userId, userRole }: ProfileSettingsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [contractedHours, setContractedHours] = useState(hoursConfig.contracted_hours);
  const [maxHours, setMaxHours] = useState(hoursConfig.maximum_hours);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await (supabase.from as any)("hours_config")
        .upsert({
          employee_id: userId,
          contracted_hours: contractedHours,
          maximum_hours: maxHours,
        }, { onConflict: "employee_id" });

      if (error) throw error;
      toast({ title: "Hours config updated", variant: "success" });
      router.refresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-1">Timesheet Settings</h3>
        <p className="text-sm text-muted-foreground">
          Your contracted and maximum hours per week. These drive warnings and errors in timesheet validation.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium block mb-1">Contracted Hours / Week</label>
          <input
            type="number"
            min="0"
            max="80"
            step="0.5"
            value={contractedHours}
            onChange={(e) => setContractedHours(parseFloat(e.target.value))}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="text-xs text-muted-foreground mt-1">Below this triggers a warning</p>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Maximum Hours / Week</label>
          <input
            type="number"
            min="0"
            max="120"
            step="0.5"
            value={maxHours}
            onChange={(e) => setMaxHours(parseFloat(e.target.value))}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="text-xs text-muted-foreground mt-1">Above this triggers an error</p>
        </div>
      </div>

      <div className="pt-2">
        <p className="text-sm">
          <span className="text-muted-foreground">Current role:</span>{" "}
          <strong className="capitalize">{userRole}</strong>
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}
