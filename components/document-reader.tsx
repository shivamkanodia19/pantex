"use client";

import clsx from "clsx";

import { DOCUMENT_META, SECTIONS } from "@/lib/document-data";
import { useDocStore } from "@/lib/store";
import { DoeAnalysisPanel, statusStyles } from "@/components/change-overlay";
import { ModeToggle } from "@/components/mode-toggle";

function paragraphDisplay(
  text: string,
  change: ReturnType<ReturnType<typeof useDocStore>["getChange"]>,
) {
  if (!change) return text;
  if (change.status === "accepted" || change.status === "edited") return change.workingText;
  return text;
}

export function DocumentReader({
  residual = false,
  showToolbar = true,
}: {
  residual?: boolean;
  showToolbar?: boolean;
}) {
  const { mode, setMode, changes, selectedId, selectChange, closeOverlay, undo, canUndo, getChange } =
    useDocStore();
  const write = mode === "write";
  const selected = selectedId ? getChange(selectedId) : undefined;
  const pendingCount = changes.filter((c) => c.status === "pending" || c.status === "edited").length;
  const splitWrite = write && !residual;

  return (
    <div>
      {showToolbar ? (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-faint">
              {DOCUMENT_META.docId} · {DOCUMENT_META.revision}
            </p>
            <h1 className="mt-1.5 max-w-2xl text-[22px] font-medium tracking-tight text-ink sm:text-[26px]">
              {residual ? "New Pantex Document" : DOCUMENT_META.title}
            </h1>
            <p className="mt-1.5 text-[13px] text-ink-muted">
              {DOCUMENT_META.totalPages} pages · {SECTIONS.length} sections · {pendingCount} open DOE
              items
              {splitWrite ? " · Write = document + analysis" : ""}
            </p>
          </div>
          {!residual ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!canUndo}
                onClick={undo}
                className="pressable rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold text-ink-muted enabled:hover:text-ink disabled:opacity-40"
              >
                Undo
              </button>
              <ModeToggle value={mode} onChange={setMode} />
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        className={clsx(
          splitWrite && "grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_min(340px,36%)]",
        )}
      >
        <article className="min-w-0 space-y-8">
          {SECTIONS.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="rounded-card border border-border bg-surface px-5 py-5 sm:px-6 sm:py-6"
            >
              <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-border-subtle pb-3">
                <h2 className="text-[15px] font-semibold tracking-tight text-ink">
                  <span className="text-accent">{section.number}</span> {section.title}
                </h2>
                <p className="font-mono text-[11px] text-ink-faint">
                  pp. {section.pages[0]}
                  {section.pages.length > 1 ? `–${section.pages[section.pages.length - 1]}` : ""}
                </p>
              </header>
              <div className="space-y-3">
                {section.paragraphs.map((para, idx) => {
                  const change = para.changeId ? getChange(para.changeId) : undefined;
                  const isSelected = Boolean(change && selectedId === change.id);
                  const showMarks = Boolean(change) && (write || residual);
                  const display = paragraphDisplay(para.text, change);

                  return (
                    <div key={para.id} className="group relative">
                      <span className="absolute -left-1 top-0 hidden w-6 -translate-x-full font-mono text-[10px] text-ink-faint sm:block">
                        {idx + 1}
                      </span>
                      <button
                        type="button"
                        disabled={!change || (!write && !residual)}
                        onClick={() => {
                          if (!change || (!write && !residual)) return;
                          if (selectedId === change.id) closeOverlay();
                          else selectChange(change.id);
                        }}
                        className={clsx(
                          "w-full rounded-md px-2.5 py-2 text-left text-[13.5px] leading-[1.65] transition-colors",
                          "text-ink",
                          showMarks &&
                            change?.status === "pending" &&
                            "bg-doe-muted/70 ring-1 ring-doe/25",
                          showMarks &&
                            change?.status === "edited" &&
                            "bg-accent-muted ring-1 ring-accent/25",
                          showMarks &&
                            change?.status === "accepted" &&
                            "bg-accepted-muted/70 ring-1 ring-accepted/20",
                          isSelected && "ring-2 ring-accent",
                          change && (write || residual) && "pressable cursor-pointer hover:brightness-[0.98]",
                          !change && "cursor-default",
                        )}
                      >
                        {display}
                        {change && showMarks ? (
                          <span className="mt-2 flex flex-wrap items-center gap-2">
                            <span className={statusStyles(change.status)}>{change.status}</span>
                            <span className="font-mono text-[10px] text-ink-faint">
                              +{change.lineCount} −{change.lineCount} · p.{change.page}
                            </span>
                            {isSelected ? (
                              <span className="text-[10px] font-medium text-accent">open in analysis →</span>
                            ) : null}
                          </span>
                        ) : null}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </article>

        {splitWrite ? (
          <div className="lg:sticky lg:top-16 lg:self-start">
            <DoeAnalysisPanel change={selected ?? null} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
