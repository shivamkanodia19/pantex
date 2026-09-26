"use client";

import { useState } from "react";

import { DocumentReader } from "@/components/document-reader";
import { useDocStore } from "@/lib/store";
import { statusStyles } from "@/components/change-overlay";

export function NewDocumentView() {
  const { histories, restoreSnapshot, pushNamedSnapshot, changes } = useDocStore();
  const [label, setLabel] = useState("");

  const accepted = changes.filter((c) => c.status === "accepted" || c.status === "edited").length;
  const pending = changes.filter((c) => c.status === "pending").length;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <div className="mb-4 flex flex-wrap gap-2 text-[12px]">
          <span className="rounded-md bg-accepted-muted px-2 py-1 font-medium text-accepted">
            {accepted} applied
          </span>
          <span className="rounded-md bg-doe-muted px-2 py-1 font-medium text-doe">{pending} pending</span>
          <span className="rounded-md bg-canvas px-2 py-1 text-ink-muted">Residual markup on</span>
        </div>
        <DocumentReader residual showToolbar />
      </div>

      <aside className="lg:sticky lg:top-16 lg:self-start">
        <div className="rounded-card border border-border bg-surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Version history</p>
          <p className="mt-1 text-[12px] text-ink-muted">Working local history for this wireframe session.</p>

          <div className="mt-3 flex gap-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Snapshot label"
              className="min-w-0 flex-1 rounded-md border border-border bg-canvas px-2.5 py-1.5 text-[12px] outline-none focus:border-accent"
            />
            <button
              type="button"
              className="pressable shrink-0 rounded-md bg-accent px-2.5 py-1.5 text-[11px] font-semibold text-surface"
              onClick={() => {
                pushNamedSnapshot(label.trim() || `Manual save ${new Date().toLocaleTimeString()}`);
                setLabel("");
              }}
            >
              Save
            </button>
          </div>

          <ol className="mt-4 max-h-[min(60vh,520px)] space-y-2 overflow-y-auto">
            {histories.map((snap, i) => (
              <li key={snap.id} className="rounded-md border border-border-subtle bg-canvas px-2.5 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-ink">
                      {i === 0 ? "HEAD · " : ""}
                      {snap.label}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-ink-faint">
                      {new Date(snap.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-1 text-[10px] text-ink-muted">
                      {snap.changes.filter((c) => c.status === "accepted" || c.status === "edited").length} applied ·{" "}
                      {snap.changes.filter((c) => c.status === "pending").length} pending
                    </p>
                  </div>
                  {i !== 0 ? (
                    <button
                      type="button"
                      className="pressable shrink-0 text-[11px] font-semibold text-accent hover:underline"
                      onClick={() => restoreSnapshot(snap.id)}
                    >
                      Restore
                    </button>
                  ) : (
                    <span className={statusStyles("accepted")}>live</span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}
