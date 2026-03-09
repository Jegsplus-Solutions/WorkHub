"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Save, Eye, EyeOff, Shield, Users, Share2 } from "lucide-react";

interface ConfigRow {
  key: string;
  value: string;
  is_secret: boolean;
  label: string;
  description: string | null;
}

interface Props {
  initialRows: ConfigRow[];
}

const GROUPS: { title: string; icon: typeof Shield; iconClass: string; keys: string[] }[] = [
  {
    title: "Azure App Registration",
    icon: Shield,
    iconClass: "bg-blue-50 text-blue-600",
    keys: ["azure_tenant_id", "azure_client_id", "azure_client_secret"],
  },
  {
    title: "Entra Group Mappings",
    icon: Users,
    iconClass: "bg-violet-50 text-violet-600",
    keys: ["azure_group_admins", "azure_group_managers", "azure_group_finance"],
  },
  {
    title: "SharePoint Integration",
    icon: Share2,
    iconClass: "bg-emerald-50 text-emerald-600",
    keys: ["sharepoint_site_id", "sharepoint_drive_id", "sharepoint_payroll_folder"],
  },
];

export function AppConfigPanel({ initialRows }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const rowMap = new Map(initialRows.map((r) => [r.key, r]));
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const r of initialRows) v[r.key] = r.value;
    return v;
  });
  const [original] = useState<Record<string, string>>(() => ({ ...values }));
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const dirtyKeys = Object.keys(values).filter((k) => values[k] !== original[k]);
  const hasDirty = dirtyKeys.length > 0;

  function handleChange(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  function toggleReveal(key: string) {
    setRevealed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave() {
    if (!hasDirty) return;
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Update each dirty key
      for (const key of dirtyKeys) {
        const { error } = await (supabase
          .from("app_config") as any)
          .update({ value: values[key], updated_by: session.user.id })
          .eq("key", key);
        if (error) throw new Error(`Failed to update ${key}: ${error.message}`);
      }

      toast({
        title: "Settings saved",
        description: `${dirtyKeys.length} setting${dirtyKeys.length > 1 ? "s" : ""} updated.`,
        variant: "success",
      });

      router.refresh();
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">Microsoft 365 Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Configure Azure Entra ID, group mappings, and SharePoint integration.
            Values saved here override environment variables.
          </p>
        </div>
      </div>

      {GROUPS.map((group) => {
        const Icon = group.icon;
        return (
          <div key={group.title} className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/30">
              <div className={`p-2 rounded-xl ${group.iconClass}`}>
                <Icon className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm">{group.title}</h3>
            </div>
            <div className="divide-y divide-border">
              {group.keys.map((key) => {
                const row = rowMap.get(key);
                if (!row) return null;
                const isDirty = values[key] !== original[key];
                const isSecret = row.is_secret;
                const isRevealed = revealed[key];

                return (
                  <div key={key} className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <label className="text-sm font-medium" htmlFor={key}>
                        {row.label}
                      </label>
                      {isDirty && (
                        <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          unsaved
                        </span>
                      )}
                    </div>
                    {row.description && (
                      <p className="text-xs text-muted-foreground mb-2">{row.description}</p>
                    )}
                    <div className="relative">
                      <input
                        id={key}
                        type={isSecret && !isRevealed ? "password" : "text"}
                        value={values[key]}
                        onChange={(e) => handleChange(key, e.target.value)}
                        placeholder={isSecret ? "Enter secret value…" : "Enter value…"}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 placeholder:text-muted-foreground/50"
                        autoComplete="off"
                      />
                      {isSecret && (
                        <button
                          type="button"
                          onClick={() => toggleReveal(key)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                          title={isRevealed ? "Hide" : "Show"}
                        >
                          {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={!hasDirty || saving}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Save className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} />
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
