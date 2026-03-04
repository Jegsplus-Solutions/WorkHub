"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const MONTH_NAMES = ["","January","February","March","April","May","June","July","August","September","October","November","December"];

const TABS = ["Timesheets"] as const;
type Tab = typeof TABS[number];

const BILLING_TYPES = [
  "Regular Time 1",
  "Regular Time 2",
  "Regular Time 3",
  "Regular Time 4",
  "Start Holiday",
  "Vacation",
  "Earned Day Off",
  "Sick",
  "Compassionate",
  "Leave Without Pay",
] as const;

interface TsRow { id: string; week_number: number; status: string; month?: number; year?: number; }
interface ExRow { id: string; week_number: number; year: number; status: string; }

interface Props {
  year: number;
  month: number;
  week: number;
  realTimesheets: TsRow[];
  realExpenses: ExRow[];
  newExHref: string;
}

export function OverviewTabsCard({ year, month, week, realTimesheets, realExpenses, newExHref }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("Timesheets");
  const [activeWeek, setActiveWeek] = useState<number>(week);
  const [selectedMonth, setSelectedMonth] = useState<number>(month);
  const [selectedYear, setSelectedYear] = useState<number>(year);
  const [selectedManager, setSelectedManager] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<number | null>(() => {
    const now = new Date();
    if (now.getFullYear() === year && now.getMonth() + 1 === month) return now.getDate();
    return null;
  });
  const [dayEntries, setDayEntries] = useState<Record<number, { billingType: string; project: string; hours: string; manager: string }>>({});
  const [editingBilling, setEditingBilling] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage after hydration
  useEffect(() => {
    try {
      const key = `dayEntries-${selectedYear}-${selectedMonth}`;
      const saved = localStorage.getItem(key);
      if (saved) setDayEntries(JSON.parse(saved));
    } catch {}
    setHydrated(true);
  }, []);

  // Save entries to localStorage on change (only after hydration)
  useEffect(() => {
    if (!hydrated) return;
    const key = `dayEntries-${selectedYear}-${selectedMonth}`;
    localStorage.setItem(key, JSON.stringify(dayEntries));
  }, [dayEntries, selectedYear, selectedMonth, hydrated]);

  // Reload entries when month/year changes
  useEffect(() => {
    if (!hydrated) return;
    try {
      const key = `dayEntries-${selectedYear}-${selectedMonth}`;
      const saved = localStorage.getItem(key);
      setDayEntries(saved ? JSON.parse(saved) : {});
    } catch { setDayEntries({}); }
  }, [selectedYear, selectedMonth, hydrated]);

  const emptyEntry = { billingType: "", project: "", hours: "", manager: "" };
  const curEntry = selectedDay != null ? (dayEntries[selectedDay] ?? emptyEntry) : null;
  function updateEntry(field: "billingType" | "project" | "hours" | "manager", value: string) {
    if (selectedDay == null) return;
    setDayEntries(prev => ({
      ...prev,
      [selectedDay]: { ...(prev[selectedDay] ?? emptyEntry), [field]: value },
    }));
  }

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const numWeeks    = Math.min(Math.ceil(daysInMonth / 7), 5);
  const monthTs     = realTimesheets.filter(t => t.year === selectedYear && t.month === selectedMonth);

  const approvedCnt       = monthTs.filter(t => t.status === "approved").length;
  const submittedCnt      = monthTs.filter(t => t.status === "submitted").length;
  const submittedOrBetter = monthTs.filter(t => ["approved","submitted","draft"].includes(t.status ?? "")).length;
  const missingCnt        = Math.max(0, Math.max(0, week - 1) - submittedOrBetter);

  // ── Selected-week derived state ──────────────────────────────────────────
  const selectedTs    = monthTs.find(t => t.week_number === activeWeek);
  const isCurrentWeek = activeWeek === week;
  const isFutureWeek  = activeWeek > week;
  const startDay      = (activeWeek - 1) * 7 + 1;
  const endDay        = Math.min(activeWeek * 7, daysInMonth);

  let statusLabel = "Upcoming";
  let statusDot   = "bg-gray-300";
  let statusCls   = "text-gray-400";
  let panelBg     = "bg-gray-20";
  let panelBorder = "border-gray-50";

  if (selectedTs?.status === "approved")              { statusLabel = "Approved";         statusDot = "bg-emerald-500"; statusCls = "text-emerald-700"; panelBg = "bg-emerald-50";  panelBorder = "border-emerald-100"; }
  else if (selectedTs?.status === "manager_approved") { statusLabel = "Mgr Approved";     statusDot = "bg-blue-500";    statusCls = "text-blue-700";    panelBg = "bg-blue-50";     panelBorder = "border-blue-100"; }
  else if (selectedTs?.status === "submitted")        { statusLabel = "Pending";          statusDot = "bg-amber-400";   statusCls = "text-amber-600";   panelBg = "bg-amber-50";    panelBorder = "border-amber-100"; }
  else if (selectedTs?.status === "manager_rejected") { statusLabel = "Mgr Rejected";     statusDot = "bg-orange-400";  statusCls = "text-orange-600";  panelBg = "bg-orange-50";   panelBorder = "border-orange-100"; }
  else if (selectedTs?.status === "rejected")         { statusLabel = "Rejected";         statusDot = "bg-red-400";     statusCls = "text-red-600";     panelBg = "bg-red-50";      panelBorder = "border-red-100"; }
  else if (selectedTs?.status === "draft")            { statusLabel = "Draft";            statusDot = "bg-primary/50";  statusCls = "text-primary";     panelBg = "bg-primary/5";   panelBorder = "border-primary/10"; }
  else if (isCurrentWeek)                             { statusLabel = "In Progress";      statusDot = "bg-primary/50";  statusCls = "text-primary";     panelBg = "bg-primary/5";   panelBorder = "border-primary/10"; }
  else if (!isFutureWeek)                             { statusLabel = "Missing";          statusDot = "bg-red-300";     statusCls = "text-red-500";     panelBg = "bg-red-50";      panelBorder = "border-red-100"; }

  const tsHref = selectedTs?.id
    ? `/timesheets/${selectedTs.id}`
    : `/timesheets/new?year=${selectedYear}&month=${selectedMonth}&week=${activeWeek}`;

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
      {/* Header — Month / Year / Manager dropdowns */}
      <div className="flex items-center gap-4 mb-3">
        <select
          value={selectedMonth}
          onChange={e => { setSelectedMonth(Number(e.target.value)); setActiveWeek(1); setSelectedDay(null); }}
          className="select-chevron rounded-lg border border-gray-200 bg-white pl-3 pr-10 py-1.5 text-sm font-bold text-gray-800 cursor-pointer focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
        >
          {MONTH_NAMES.slice(1).map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={e => { setSelectedYear(Number(e.target.value)); setActiveWeek(1); setSelectedDay(null); }}
          className="select-chevron rounded-lg border border-gray-200 bg-white pl-3 pr-10 py-1.5 text-sm font-bold text-gray-800 cursor-pointer focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
        >
          {[year - 1, year, year + 1].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-gray-800">Manager</span>
          <select
            value={selectedManager}
            onChange={e => setSelectedManager(e.target.value)}
            className="select-chevron rounded-lg border border-gray-200 bg-white pl-3 pr-10 py-1.5 text-sm text-gray-700 min-w-[180px] cursor-pointer focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
          >
            <option value="">Select…</option>
          </select>
        </div>
      </div>

      {/* Quick-stat chips */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {submittedCnt > 0 && (
          <div className="flex items-center gap-1 bg-amber-50 rounded-lg px-2 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400"/>
            <span className="text-[11px] font-semibold text-amber-700">{submittedCnt} Pending</span>
          </div>
        )}
        {missingCnt > 0 && (
          <div className="flex items-center gap-1 bg-red-50 rounded-lg px-2 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400"/>
            <span className="text-[11px] font-semibold text-red-600">{missingCnt} Missing</span>
          </div>
        )}
      </div>

      {/* ── Timesheets content ── */}
      <div className="flex gap-2">

          {/* Left: vertical week tabs */}
          <div className="flex flex-col gap-1 shrink-0">
            {Array.from({ length: numWeeks }, (_, i) => {
              const w    = i + 1;
              const ts   = monthTs.find(t => t.week_number === w);
              const isCurr = w === week;
              const isFut  = w > week;

              let dot = "bg-gray-200";
              if (ts?.status === "approved")              dot = "bg-emerald-500";
              else if (ts?.status === "manager_approved") dot = "bg-blue-500";
              else if (ts?.status === "submitted")        dot = "bg-amber-400";
              else if (ts?.status === "manager_rejected") dot = "bg-orange-400";
              else if (ts?.status === "rejected")         dot = "bg-red-400";
              else if (ts?.status === "draft")            dot = "bg-primary/50";
              else if (isCurr)                            dot = "bg-primary/40";
              else if (!isFut)                            dot = "bg-red-300";

              const isActive = activeWeek === w;

              return (
                <button
                  key={w}
                  onClick={() => setActiveWeek(w)}
                  className={`flex flex-col items-center gap-1 px-2 py-3.5 rounded-xl text-[11px] font-bold transition-all w-16 ${
                    isActive
                      ? "bg-primary text-white shadow-md"
                      : isCurr
                      ? "bg-white text-gray shadow-md hover:bg-primary/20"
                      : "bg-white text-gray shadow-md hover:bg-gray-100"
                  }`}
                >
                  <span>W{w}</span>
                  <div className={`w-1.5 h-1.5 rounded-full transition-colors ${isActive ? "bg-white/70" : dot}`}/>
                </button>
              );
            })}
          </div>

          {/* Right: selected week detail panel */}
          <div className={`flex-1 rounded-xl border p-4 flex flex-col gap-3 ${panelBg} ${panelBorder}`}>
            {/* Week info + total hours */}
            {(() => {
              const totalWeekHours = Array.from({ length: endDay - startDay + 1 }, (_, i) => {
                const d = startDay + i;
                return parseFloat(dayEntries[d]?.hours || "0") || 0;
              }).reduce((sum, h) => sum + h, 0);
              return (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[15px] font-bold text-gray-500 uppercase tracking-wider">Week {activeWeek}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[15px] font-semibold text-gray-900 uppercase">Total</span>
                    <span className="text-[22px] font-extrabold text-orange-500 leading-none">{totalWeekHours.toFixed(1)}</span>
                    <span className="text-[14px] font-semibold text-gray-900">hrs</span>
                  </div>
                </div>
              );
            })()}

            {/* Calendar + form area */}
            <div className="bg-[#e6e9f1] rounded-xl px-5 pt-5 pb-10 -mx-1 flex flex-col gap-5">
            {/* Mon–Sun calendar row */}
            {(() => {
              const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
              const slots: (number | null)[] = [null,null,null,null,null,null,null];
              for (let d = startDay; d <= endDay; d++) {
                const dow = new Date(selectedYear, selectedMonth - 1, d).getDay();      // 0=Sun
                slots[dow] = d;
              }
              const today = new Date();
              const todayDate = today.getFullYear() === selectedYear && today.getMonth() + 1 === selectedMonth ? today.getDate() : -1;
              return (
                <div className="flex gap-1">
                  {DAY_LABELS.map((lbl, i) => {
                    const d = slots[i];
                    const isActualToday = d === todayDate;
                    const isToday = isActualToday && (selectedDay == null || selectedDay === d);
                    const isSelected = d != null && d === selectedDay;
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={d == null}
                        onClick={() => d != null && setSelectedDay(d)}
                        className={`flex-1 flex flex-col items-center justify-center rounded-lg border py-3.5 transition-colors ${
                          d == null
                            ? "border-dashed border-gray-200 opacity-30 cursor-default"
                            : isSelected
                            ? "border-primary bg-primary/20 text-gray"
                            : isToday
                            ? "border-primary bg-primary/10 cursor-pointer"
                            : "border-gray-200 bg-white/60 cursor-pointer hover:border-gray-300"
                        }`}
                      >
                        <span className={`text-[14px] font-semibold leading-none ${isSelected ? "text-gray/80" : isActualToday ? "text-primary" : "text-gray-80"}`}>{lbl}</span>
                        <span className={`text-[20px] font-bold leading-tight mt-1 ${d == null ? "text-gray-300" : isSelected ? "text-gray" : isActualToday ? "text-primary" : "text-gray-700"}`}>
                          {d ?? "—"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {/* 4x7 dotted matrix grid with day entry buttons overlaid */}
            {(() => {
              // Collect all days with data + selected day, assign rows to avoid overlap
              const filledDays: { day: number; dow: number; isSelected: boolean }[] = [];
              for (let d = startDay; d <= endDay; d++) {
                const entry = dayEntries[d];
                const hasFill = entry && (entry.hours || entry.project || entry.billingType);
                if (hasFill || d === selectedDay) {
                  filledDays.push({ day: d, dow: new Date(selectedYear, selectedMonth - 1, d).getDay(), isSelected: d === selectedDay });
                }
              }
              // Assign rows: selected day always row 0, others avoid overlap (±2 cols)
              const rowAssign: Record<number, number> = {};
              // Place selected day first at row 0
              const selectedItem = filledDays.find(f => f.isSelected);
              if (selectedItem) rowAssign[selectedItem.dow] = 0;
              // Sort remaining by distance from selected (closest first)
              const others = filledDays.filter(f => !f.isSelected).sort((a, b) => a.dow - b.dow);
              for (const item of others) {
                let row = 0;
                let conflict = true;
                while (conflict) {
                  conflict = false;
                  for (const [dowStr, assignedRow] of Object.entries(rowAssign)) {
                    if (Math.abs(Number(dowStr) - item.dow) <= 2 && assignedRow === row) {
                      row++;
                      conflict = true;
                      break;
                    }
                  }
                }
                rowAssign[item.dow] = row;
              }
              const maxRow = Math.max(0, ...Object.values(rowAssign));
              const rowHeight = 40;
              const gridHeight = Math.max(160, (maxRow + 1) * rowHeight + 80);

              return (
                <div className="relative mt-4" style={{ height: gridHeight }}>
                  {/* Day entry buttons */}
                  {filledDays.map(({ day, dow, isSelected }) => {
                    const centerPct = ((dow + 0.5) / 7) * 100;
                    const translateX = dow === 0 ? "-20%" : dow === 6 ? "-80%" : "-50%";
                    const entry = isSelected ? curEntry! : (dayEntries[day] ?? emptyEntry);
                    const row = rowAssign[dow] ?? 0;
                    const topPx = 4 + row * rowHeight;
                    return (
                      <div
                        key={day}
                        className={`absolute flex items-center gap-2 rounded-full px-3 py-1 shadow-sm w-fit ${isSelected ? "bg-gray-700 z-10" : "bg-gray-700 z-[5] pointer-events-none overflow-hidden"}`}
                        style={{ left: `${centerPct}%`, transform: `translateX(${translateX})`, top: `${topPx}px` }}
                        onClick={() => !isSelected && setSelectedDay(day)}
                      >
                        <div className="flex items-baseline shrink-0">
                          {isSelected ? (
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={entry.hours}
                              onChange={e => updateEntry("hours", e.target.value)}
                              placeholder="0"
                              className="w-8 text-[22px] font-extrabold text-orange-500 bg-transparent border-none outline-none text-right p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          ) : (
                            <span className="text-[22px] font-extrabold text-orange-500">{entry.hours || "0"}</span>
                          )}
                          <span className={`text-[14px] font-bold ${isSelected ? "text-orange-400" : "text-orange-400"}`}>hrs</span>
                        </div>
                        <div className="flex flex-col">
                          {isSelected ? (
                            <input
                              type="text"
                              value={entry.project}
                              onChange={e => updateEntry("project", e.target.value)}
                              placeholder="Location"
                              size={Math.max((entry.project || "Location").length, 5)}
                              className="text-[13px] leading-tight font-semibold text-white bg-transparent border-none outline-none placeholder:text-gray-400 cursor-text p-0 m-0 whitespace-nowrap w-auto"
                            />
                          ) : (
                            <span className="text-[13px] leading-tight font-semibold text-white whitespace-nowrap">{entry.project || "Location"}</span>
                          )}
                          <div className="relative -mt-0.5">
                            {isSelected ? (
                              <>
                                <button
                                  onClick={() => setEditingBilling(!editingBilling)}
                                  className="text-[12px] leading-tight font-medium text-gray-300 cursor-pointer whitespace-nowrap"
                                >
                                  {entry.billingType || "Billing Type"}
                                </button>
                                {editingBilling && (
                                  <>
                                  <div className="fixed inset-0 z-40" onClick={() => setEditingBilling(false)} />
                                  <div className="absolute bottom-full left-0 mb-1 z-50 bg-white rounded-xl border border-gray-200 shadow-lg py-1 min-w-[200px] max-h-[180px] overflow-y-auto">
                                    {BILLING_TYPES.map(bt => (
                                      <button
                                        key={bt}
                                        onClick={() => { updateEntry("billingType", bt); setEditingBilling(false); }}
                                        className={`w-full text-left px-3 py-2 text-[13px] hover:bg-primary/10 transition-colors ${entry.billingType === bt ? "text-primary font-semibold bg-primary/5" : "text-gray-700"}`}
                                      >
                                        {bt}
                                      </button>
                                    ))}
                                  </div>
                                  </>
                                )}
                              </>
                            ) : (
                              <span className="text-[12px] leading-tight font-medium text-gray-300 whitespace-nowrap">{entry.billingType || "Billing Type"}</span>
                            )}
                          </div>
                        </div>
                        {!isSelected && <div className="absolute inset-0 bg-[#dce4f5]/80 rounded-full" />}
                      </div>
                    );
                  })}
              {/* 7 vertical dotted lines aligned under each day */}
              <div className="absolute inset-0 flex gap-1">
                {Array.from({ length: 7 }).map((_, col) => (
                  <div key={col} className="flex-1 flex justify-center">
                    <div className="h-full border-l-2 border-dotted border-gray-400/40" />
                  </div>
                ))}
              </div>
              {/* 4 horizontal dotted lines evenly spaced */}
              {Array.from({ length: 4 }).map((_, row) => (
                <div
                  key={row}
                  className="absolute left-0 right-0 border-t-2 border-dotted border-gray-400/40"
                  style={{ top: `${((row + 1) * 25) - 5}%` }}
                />
              ))}
            </div>
              );
            })()}
            </div>{/* end calendar + form area */}

          </div>

        </div>

    </div>
  );
}
