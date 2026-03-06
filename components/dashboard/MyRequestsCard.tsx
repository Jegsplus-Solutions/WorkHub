"use client";

import { useState } from "react";

interface Request {
  id: string;
  kind: string;
  label: string;
  sub?: string;
  dot: string;
}

function DotEl({ kind }: { kind: string }) {
  if (kind === "check-green") {
    // Final approval (finance) → green
    return (
      <span className="w-6 h-6 rounded-full bg-emerald-500 shrink-0 flex items-center justify-center">
        <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
        </svg>
      </span>
    );
  }
  if (kind === "check-blue") {
    // Manager approved (awaiting finance) → blue
    return (
      <span className="w-6 h-6 rounded-full bg-blue-500 shrink-0 flex items-center justify-center">
        <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
        </svg>
      </span>
    );
  }
  if (kind === "check-yellow") {
    // Legacy: keep for backwards compat
    return (
      <span className="w-6 h-6 rounded-full bg-yellow-400 shrink-0 flex items-center justify-center">
        <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
        </svg>
      </span>
    );
  }
  if (kind === "rejected-red") {
    // Finance rejected → red
    return <span className="w-6 h-6 rounded-full bg-red-500 shrink-0" />;
  }
  if (kind === "rejected-orange") {
    // Manager rejected → orange
    return <span className="w-6 h-6 rounded-full bg-orange-400 shrink-0" />;
  }
  if (kind === "pending-gray") {
    return <span className="w-6 h-6 rounded-full shrink-0" style={{ background: "rgba(55,65,81,0.72)" }} />;
  }
  if (kind === "filled-yellow") {
    return <span className="w-6 h-6 rounded-full bg-yellow-400 shrink-0" />;
  }
  return <span className="w-6 h-6 rounded-full shrink-0" style={{ background: "rgba(255,255,255,0.22)" }} />;
}

function ReqIcon({ kind, approved }: { kind: string; approved?: boolean }) {
  const cls = `w-4 h-4 ${approved ? "text-primary" : "text-gray-500"}`;
  if (kind === "expense") {
    return (
      <svg className={cls} viewBox="0 0 20 20" fill="currentColor">
        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
        <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
      </svg>
    );
  }
  if (kind === "timesheet") {
    return (
      <svg className={cls} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/>
    </svg>
  );
}

const PAGE_SIZE = 4;

export function MyRequestsCard({ requests }: { requests: Request[] }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(requests.length / PAGE_SIZE);
  const visible = requests.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <div className="rounded-2xl flex flex-col px-4 pt-4 pb-2" style={{ background: "#1d4ed8" }}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-2.5 shrink-0">
        <h3 className="font-bold text-white text-[17px] leading-tight">My Requests</h3>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={!canPrev}
              className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
              style={{ background: canPrev ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)" }}
            >
              <svg className={`w-3 h-3 ${canPrev ? "text-white" : "text-white/30"}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
            </button>
            <span className="text-[10px] text-white/50 font-medium tabular-nums">{page + 1}/{totalPages}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!canNext}
              className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
              style={{ background: canNext ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)" }}
            >
              <svg className={`w-3 h-3 ${canNext ? "text-white" : "text-white/30"}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.18)" }} />

      {requests.length === 0 ? (
        <p className="text-xs text-white/40 text-center py-4">No submissions yet</p>
      ) : (
        <div>
          {visible.map((r, idx) => {
            const isApproved = r.dot === "check-green" || r.dot === "check-yellow";
            return (
              <div key={r.id}>
                {idx > 0 && <div className="border-b" style={{ borderColor: "rgba(255,255,255,0.12)" }} />}
                <div className="flex items-center gap-2.5 py-2 cursor-pointer group">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: isApproved ? "rgba(186,230,255,0.82)" : "rgba(255,255,255,0.95)" }}
                  >
                    <ReqIcon kind={r.kind} approved={isApproved} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] font-semibold leading-tight ${isApproved ? "line-through text-white/45" : "text-white group-hover:text-primary/80 transition-colors"}`}>
                      {r.label}
                    </p>
                    {r.sub && (
                      <p className={`text-[11px] leading-tight mt-0.5 ${isApproved ? "line-through text-white/35" : "text-white/60"}`}>
                        {r.sub}
                      </p>
                    )}
                  </div>
                  <DotEl kind={r.dot} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
