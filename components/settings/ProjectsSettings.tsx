"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Check, X, Power } from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  code: string;
  title: string;
  active: boolean;
}

interface ProjectsSettingsProps {
  projects: Project[];
  userId: string;
}

export function ProjectsSettings({ projects: initialProjects, userId }: ProjectsSettingsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Project>>({});
  const [adding, setAdding] = useState(false);
  const [newProject, setNewProject] = useState({ code: "", title: "" });
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!newProject.code.trim() || !newProject.title.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await (supabase.from as any)("projects")
        .insert({
          code: newProject.code.toUpperCase(),
          title: newProject.title,
        })
        .select()
        .single();

      if (error) throw error;
      setProjects((prev) => [...prev, data]);
      setNewProject({ code: "", title: "" });
      setAdding(false);
      toast({ title: "Project created", variant: "success" });
      router.refresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(id: string) {
    setSaving(true);
    try {
      const { error } = await (supabase.from as any)("projects")
        .update(editValues)
        .eq("id", id);

      if (error) throw error;
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...editValues } : p))
      );
      setEditingId(null);
      toast({ title: "Project updated", variant: "success" });
      router.refresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, current: boolean) {
    try {
      await (supabase.from as any)("projects").update({ active: !current }).eq("id", id);
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, active: !current } : p))
      );
      toast({ title: current ? "Project deactivated" : "Project activated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Projects</h3>
          <p className="text-sm text-muted-foreground">Manage projects available for timesheet entries.</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Add Project
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <h4 className="text-sm font-semibold">New Project</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">Code *</label>
              <input
                type="text"
                value={newProject.code}
                onChange={(e) => setNewProject((p) => ({ ...p, code: e.target.value }))}
                placeholder="PROJ-01"
                className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 uppercase"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Title *</label>
              <input
                type="text"
                value={newProject.title}
                onChange={(e) => setNewProject((p) => ({ ...p, title: e.target.value }))}
                placeholder="Project Title"
                className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving} className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {saving ? "Saving…" : "Create"}
            </button>
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-accent">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Projects table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {projects.map((project) => (
              <tr key={project.id} className={cn("hover:bg-accent/30 transition-colors", !project.active && "opacity-60")}>
                <td className="px-4 py-3 font-mono font-medium">
                  {editingId === project.id ? (
                    <input
                      value={editValues.code ?? project.code}
                      onChange={(e) => setEditValues((v) => ({ ...v, code: e.target.value.toUpperCase() }))}
                      className="w-full border border-border rounded px-2 py-1 text-sm uppercase"
                    />
                  ) : project.code}
                </td>
                <td className="px-4 py-3">
                  {editingId === project.id ? (
                    <input
                      value={editValues.title ?? project.title}
                      onChange={(e) => setEditValues((v) => ({ ...v, title: e.target.value }))}
                      className="w-full border border-border rounded px-2 py-1 text-sm"
                    />
                  ) : project.title}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", project.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                    {project.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {editingId === project.id ? (
                      <>
                        <button onClick={() => handleSaveEdit(project.id)} disabled={saving} className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 rounded hover:bg-accent">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditingId(project.id); setEditValues({}); }}
                          className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleActive(project.id, project.active)}
                          className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                          title={project.active ? "Deactivate" : "Activate"}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
