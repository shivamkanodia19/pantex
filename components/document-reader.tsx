"use client";

import { useDocStore } from "@/lib/store";
import { FullDocumentReader } from "@/components/full-document-reader";
import { DoeAnalysisPanel, statusStyles } from "@/components/change-overlay";
import { DocumentFilePicker } from "@/components/document-file-picker";
import clsx from "clsx";

const navButton =
  "rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium disabled:opacity-40 focus-visible:outline-accent";

export function DocumentReader() {
  const {
    reviewView,
    setReviewView,
    sectionId,
    setSectionId,
    selectedId,
    selectChange,
    changes,
    getChange,
    undo,
    canUndo,
    meta,
    sections,
  } = useDocStore();

  const sectionIndex = Math.max(
    0,
    sections.findIndex((s) => s.id === sectionId),
  );
  const section = sections[sectionIndex] ?? sections[0];
  const sectionChanges = section
    ? changes.filter((c) => c.sectionId === section.id)
    : [];
  const selected = getChange(selectedId ?? "");
  const focused =
    selected?.sectionId === section?.id ? selected : sectionChanges[0];
  const changeIndex = sectionChanges.findIndex((c) => c.id === focused?.id);
  const globalIndex = changes.findIndex((c) => c.id === focused?.id);

  function goSection(index: number) {
    const next = sections[index];
    if (!next) return;
    setSectionId(next.id);
    selectChange(changes.find((c) => c.sectionId === next.id)?.id ?? null);
  }

  function switchView(next: "full" | "section") {
    if (next === "section" && !selected)
      selectChange(sectionChanges[0]?.id ?? null);
    setReviewView(next);
  }

  return (
    <div>
      <DocumentFilePicker />

      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-ink-muted">
            {meta.docId} · {meta.revision}
          </p>
          <h1 className="mt-1 text-2xl font-medium">
            {reviewView === "full" ? meta.title : "Section review"}
          </h1>
          <p className="mt-2 text-xs text-ink-muted">
            {sections.length} sections ·{" "}
            {
              changes.filter(
                (c) => c.status === "pending" || c.status === "edited",
              ).length
            }{" "}
            proposals awaiting review
          </p>
        </div>
        <button className={navButton} disabled={!canUndo} onClick={undo}>
          Undo
        </button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface p-3">
        <div
          role="group"
          aria-label="Document view"
          className="flex gap-1 rounded border border-border p-1"
        >
          {(
            [
              ["full", "Full document"],
              ["section", "Section review"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              aria-pressed={reviewView === value}
              className={clsx(
                "rounded px-3 py-2 text-xs font-semibold focus-visible:outline-accent",
                reviewView === value
                  ? "bg-accent text-white"
                  : "text-ink-muted hover:bg-canvas",
              )}
              onClick={() => switchView(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {reviewView === "section" ? (
          <>
            <button
              className={navButton}
              disabled={sectionIndex === 0}
              onClick={() => goSection(sectionIndex - 1)}
            >
              ← Section
            </button>
            <button
              className={navButton}
              disabled={sectionIndex >= sections.length - 1}
              onClick={() => goSection(sectionIndex + 1)}
            >
              Section →
            </button>
            <button
              className={navButton}
              disabled={globalIndex <= 0 || changes.length === 0}
              onClick={() =>
                selectChange(changes[Math.max(0, globalIndex - 1)].id)
              }
            >
              Prev change (doc)
            </button>
            <button
              className={navButton}
              disabled={globalIndex < 0 || globalIndex >= changes.length - 1}
              onClick={() => selectChange(changes[globalIndex + 1].id)}
            >
              Next change (doc)
            </button>
            <span className="ml-auto text-xs text-ink-muted">
              § {sections.length ? sectionIndex + 1 : 0}/{sections.length} ·{" "}
              {sectionChanges.length
                ? `Δ ${changeIndex + 1}/${sectionChanges.length}`
                : "No DOE items"}
            </span>
          </>
        ) : (
          <p className="text-xs text-ink-muted">
            Click a highlighted passage to open its review panel. Close the
            panel to restore the full document width.
          </p>
        )}
      </div>

      {reviewView === "full" ? (
        <FullDocumentReader />
      ) : !section ? (
        <p className="rounded border border-border bg-surface p-5 text-sm text-ink-muted">
          Load a review set to begin.
        </p>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_min(400px,40%)]">
          <article className="rounded-card border border-border bg-surface p-5">
            <h2 className="mb-4 border-b border-border pb-3 font-semibold">
              {section.number} {section.title}
            </h2>
            <div className="space-y-3">
              {section.paragraphs.map((p) => {
                const change = p.changeId ? getChange(p.changeId) : undefined;
                if (!change)
                  return (
                    <p key={p.id} className="p-2 text-sm leading-relaxed">
                      {p.text}
                    </p>
                  );
                return (
                  <button
                    key={p.id}
                    data-change-id={change.id}
                    onClick={() => selectChange(change.id)}
                    className={clsx(
                      "block w-full rounded border p-3 text-left text-sm leading-relaxed focus-visible:outline-accent",
                      focused?.id === change.id
                        ? "border-accent"
                        : "border-border",
                      change.status === "accepted"
                        ? "bg-accepted-muted"
                        : change.status === "rejected"
                          ? "bg-canvas"
                          : "bg-doe-muted/50",
                    )}
                  >
                    {change.approvedText ?? p.text}
                    <span className="mt-2 block">
                      <span className={statusStyles(change.status)}>
                        {change.status}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </article>
          <aside
            aria-label="Section analysis"
            className="max-h-[calc(100dvh-6rem)] lg:sticky lg:top-16"
          >
            {focused ? (
              <DoeAnalysisPanel key={focused.id} change={focused} />
            ) : (
              <p className="rounded border border-border bg-surface p-5 text-sm text-ink-muted">
                This section has no proposed changes. Continue to another
                section or the next document change.
              </p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
