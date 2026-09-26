"use client";

import { useState } from "react";
import clsx from "clsx";
import { useRouter } from "next/navigation";

import { sectionTitle } from "@/lib/document-data";
import { useDocStore } from "@/lib/store";
import { statusStyles } from "@/components/change-overlay";

const PAGE_SIZE = 8;

export function ChangesTable() {
  const router = useRouter();
  const { changes, selectChange, setMode } = useDocStore();
  const [openId, setOpenId] = useState<string | null>(changes[0]?.id ?? null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const slice = changes.slice(0, visible);
  const hasMore = visible < changes.length;

  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-faint">
          Screen 3
        </p>
        <h1 className="mt-1.5 text-[26px] font-medium tracking-tight text-ink">
          Recommended changes
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-muted">
          Accordion detail for every DOE recommendation. Showing {slice.length}{" "}
          of {changes.length} — show {PAGE_SIZE} at a time.
        </p>
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-surface">
        <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1.4fr)_minmax(0,1fr)_72px_88px] gap-2 border-b border-border-subtle px-4 py-2.5 text-[11px] font-medium tracking-wide text-ink-faint max-lg:hidden">
          <span>Section</span>
          <span>Old text</span>
          <span>DOE proposed</span>
          <span>Summary</span>
          <span className="text-right">Lines</span>
          <span>Status</span>
        </div>

        <ul className="divide-y divide-border-subtle">
          {slice.map((ch) => {
            const open = openId === ch.id;
            return (
              <li key={ch.id} id={ch.id}>
                <button
                  type="button"
                  className="pressable grid w-full grid-cols-1 gap-2 px-4 py-3 text-left hover:bg-canvas/80 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1.4fr)_minmax(0,1fr)_72px_88px]"
                  onClick={() => setOpenId(open ? null : ch.id)}
                  aria-expanded={open}
                >
                  <span className="text-[12.5px] font-medium text-ink">
                    {sectionTitle(ch.sectionId)}
                  </span>
                  <span className="line-clamp-2 text-[12px] text-ink-muted max-lg:hidden">
                    {ch.oldText}
                  </span>
                  <span className="line-clamp-2 text-[12px] text-ink max-lg:hidden">
                    {ch.workingText}
                  </span>
                  <span className="line-clamp-2 text-[12px] text-ink-muted max-lg:hidden">
                    {ch.summary}
                  </span>
                  <span className="text-right font-mono text-[11px] tabular-nums text-ink-faint max-lg:hidden">
                    +{ch.lineCount}/−{ch.lineCount}
                  </span>
                  <span className="max-lg:mt-1">
                    <span className={statusStyles(ch.status)}>{ch.status}</span>
                  </span>
                </button>

                {open ? (
                  <div className="space-y-3 border-t border-border-subtle bg-canvas/60 px-4 py-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-[11px] text-ink-faint">Old text</p>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
                          {ch.oldText}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-ink-faint">
                          DOE proposed (working)
                        </p>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-ink">
                          {ch.workingText}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] text-ink-faint">Summary</p>
                      <p className="mt-1 text-[12.5px] text-ink">
                        {ch.summary}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-ink-faint">Reasoning</p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
                        {ch.reasoning}
                      </p>
                    </div>
                    <div className="rounded-card border border-accent/20 bg-accent-muted/50 px-3 py-2.5">
                      <a
                        href={ch.doe.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pressable text-[11px] font-semibold text-accent hover:underline"
                      >
                        {ch.doe.citation} ↗
                      </a>
                      <p className="mt-1 text-[10px] text-ink-muted">
                        Demo evidence · not independently verified
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-ink">
                        {ch.doe.excerpt}
                      </p>
                      <a
                        href={ch.doe.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pressable mt-2 inline-block text-[11px] font-semibold text-accent hover:underline"
                      >
                        Open DOE order →
                      </a>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-[11px] text-ink-faint">
                        p.{ch.page} · L{ch.lineStart}–L
                        {ch.lineStart + ch.lineCount - 1}
                      </span>
                      <button
                        type="button"
                        className="pressable text-[12px] font-semibold text-accent hover:underline"
                        onClick={() => {
                          setMode("write");
                          selectChange(ch.id);
                          router.push("/document");
                        }}
                      >
                        Focus in Document tab
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      {hasMore ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            className={clsx(
              "pressable rounded-md border border-border bg-surface px-4 py-2 text-[13px] font-semibold text-ink",
            )}
            onClick={() =>
              setVisible((v) => Math.min(v + PAGE_SIZE, changes.length))
            }
          >
            Load next miniscreen (
            {Math.min(PAGE_SIZE, changes.length - visible)} more)
          </button>
        </div>
      ) : (
        <p className="mt-4 text-center text-[12px] text-ink-faint">
          All changes loaded
        </p>
      )}
    </div>
  );
}
