"use client";

import { useState, useEffect, useRef, useMemo } from "react";

export type ManagerOption = { id: string; display_name: string };

interface ManagerComboboxProps {
  managers: ManagerOption[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
}

export function ManagerCombobox({ managers, value, onChange, label = "Manager" }: ManagerComboboxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = managers.find((m) => m.id === value);
  const filtered = useMemo(() => {
    if (!query) return managers;
    const q = query.toLowerCase();
    return managers.filter((m) => m.display_name.toLowerCase().includes(q));
  }, [managers, query]);

  const visible = filtered.slice(0, 50);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="flex items-center gap-1.5" ref={ref}>
      <span className="text-sm font-bold text-gray-800">{label}</span>
      <div className="relative flex-1">
        <input
          type="text"
          placeholder={managers.length > 0 ? "Search by name…" : "No employees synced"}
          disabled={managers.length === 0}
          value={open ? query : (selected?.display_name ?? "")}
          onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => { setOpen(true); setQuery(""); }}
          className="w-full rounded-lg border border-gray-200 bg-white pl-3 pr-8 py-1.5 text-sm text-gray-700 min-w-[200px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(""); setQuery(""); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
            title="Clear"
          >
            ✕
          </button>
        )}
        {open && managers.length > 0 && (
          <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {visible.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400">No matches</li>
            ) : (
              <>
                {visible.map((m) => (
                  <li
                    key={m.id}
                    onClick={() => { onChange(m.id); setQuery(""); setOpen(false); }}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-primary/10 ${m.id === value ? "bg-primary/5 font-medium text-primary" : "text-gray-700"}`}
                  >
                    {m.display_name}
                  </li>
                ))}
                {filtered.length > 50 && (
                  <li className="px-3 py-1.5 text-xs text-gray-400 text-center">Type to narrow {filtered.length} results…</li>
                )}
              </>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
