"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Info } from "lucide-react";

interface MileageSettingsProps {
  mileageRate: { rate_per_km: number; year: number };
  userId: string;
}

export function MileageSettings({ mileageRate, userId }: MileageSettingsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [rate, setRate] = useState<number>(mileageRate.rate_per_km);
  const [year, setYear] = useState<number>(mileageRate.year);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await (supabase.from as any)("mileage_rate_config")
        .upsert(
          { employee_id: userId, year, rate_per_km: rate },
          { onConflict: "employee_id,year" }
        );

      if (error) throw error;
      toast({ title: "Mileage rate updated", variant: "success" });
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
        <h3 className="font-semibold mb-1">Mileage Rate Configuration</h3>
        <p className="text-sm text-muted-foreground">
          Set your per-year mileage rate. The rate is used to calculate the suggested mileage cost
          in expense claims — you can still claim a different amount.
        </p>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Rates are stored per-year. Create a new entry for each calendar year when the CRA rate changes.
          Existing approved expenses are unaffected.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium block mb-1">Calendar Year</label>
          <input
            type="number"
            min="2020"
            max="2100"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Rate per km ($)</label>
          <input
            type="number"
            min="0"
            step="0.001"
            value={rate}
            onChange={(e) => setRate(parseFloat(e.target.value))}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="text-xs text-muted-foreground mt-1">e.g. 0.61 = $0.61/km (CRA 2024)</p>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-muted/50 text-sm">
        <p className="font-medium mb-1">Example calculation</p>
        <p className="text-muted-foreground">
          100 km × ${rate.toFixed(4)}/km = <strong>${(100 * rate).toFixed(2)} suggested</strong>
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save Rate"}
      </button>
    </div>
  );
}
