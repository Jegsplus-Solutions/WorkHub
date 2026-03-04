"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ProjectsSettings } from "./ProjectsSettings";
import { MileageSettings } from "./MileageSettings";
import { ProfileSettings } from "./ProfileSettings";

type Tab = "profile" | "projects" | "mileage";

interface SettingsTabsProps {
  hoursConfig: { contracted_hours: number; maximum_hours: number };
  mileageRate: { rate_per_km: number; year: number };
  projects: Array<{ id: string; code: string; title: string; active: boolean }>;
  userId: string;
  userRole: string;
  isAdmin: boolean;
}

export function SettingsTabs({ hoursConfig, mileageRate, projects, userId, userRole, isAdmin }: SettingsTabsProps) {
  const [tab, setTab] = useState<Tab>("profile");

  const tabs: { key: Tab; label: string; adminOnly?: boolean }[] = [
    { key: "profile", label: "My Profile" },
    { key: "mileage", label: "Mileage Rate" },
    { key: "projects", label: "Projects", adminOnly: true },
  ];

  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="space-y-6">
      <div className="flex border-b border-border">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <ProfileSettings hoursConfig={hoursConfig} userId={userId} userRole={userRole} />
      )}
      {tab === "mileage" && (
        <MileageSettings mileageRate={mileageRate} userId={userId} />
      )}
      {tab === "projects" && isAdmin && (
        <ProjectsSettings projects={projects} userId={userId} />
      )}
    </div>
  );
}
