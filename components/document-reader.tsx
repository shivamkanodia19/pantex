"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { SectionSearch } from "@/components/section-search";
import { chapterLinks, chapterKey, sectionLabel } from "@/lib/section-navigation";
import { useDocStore } from "@/lib/store";
import type { DocChange } from "@/lib/document-data";
import { FullDocumentReader } from "@/components/full-document-reader";
import { DoeAnalysisPanel, statusStyles } from "@/components/change-overlay";
import { DocumentFilePicker } from "@/components/document-file-picker";
import clsx from "clsx";

const navButton =
  "rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium disabled:opacity-40 focus-visible:outline-accent";

const offline = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function DocumentReader() {
  const {
    reviewView,
    setReviewView,
    sectionId,
    navigateSection,
    sectionNavigation,
    selectedId,
    selectChange,
    changes,
    getChange,
    undo,
    canUndo,
    meta,
    sections,
    siteId,
    mergeScanChanges,
  } = useDocStore();

  const [scanProgress, setScanProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const scanAbort = useRef(false);
  const scanning = scanProgress !== null;

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

  const sectionHeading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    if (reviewView !== "section" || !sectionNavigation) return;
    sectionHeading.current?.focus({ preventScroll: true });
  }, [sectionNavigation, reviewView]);

  function goSection(index: number) {
    const next = sections[index];
    if (!next) return;
    navigateSection(next.id);
  }

  function switchView(next: "full" | "section") {
    if (next === "section" && !selected)
      selectChange(sectionChanges[0]?.id ?? null);
    setReviewView(next);
  }

  async function runFullScan() {
    if (offline) {
      setScanNotice("Full scan requires a live server (local-only export).");
      return;
    }
    if (scanning || sections.length === 0) return;
    if (!siteId.includes("cd-0039")) {
      setScanNotice("Full RAG scan is for CD-0039. Select the official Pantex PDF first.");
      return;
    }

    scanAbort.current = false;
    setScanNotice(null);
    const total = sections.length;
    setScanProgress({ current: 0, total });

    let merged = 0;
    let started = 0;
    let done = 0;
    const scanOne = async (sec: (typeof sections)[number]) => {
      try {
        const res = await fetch(`${BASE}/api/scan-section`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionId: sec.id,
            sectionNumber: sec.number,
            sectionTitle: sec.title,
            paragraphs: sec.paragraphs.map((p) => ({ id: p.id, text: p.text })),
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          change?: DocChange | null;
          skipped?: boolean;
        };
        if (data.change) {
          const change: DocChange = {
            ...data.change,
            id: data.change.id || `chg-scan-${sec.id}`,
          };
          mergeScanChanges([change]);
          merged += 1;
        }
      } catch {
        // Continue remaining sections on network/parse errors.
      }
    };
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        while (started < total && !scanAbort.current) {
          const sec = sections[started++];
          await scanOne(sec);
          setScanProgress({ current: ++done, total });
        }
      }),
    );

    setScanProgress(null);
    if (scanAbort.current) {
      setScanNotice(
        `Scan stopped${merged ? ` · ${merged} change${merged === 1 ? "" : "s"} merged` : ""}.`,
      );
    } else {
      setScanNotice(
        merged
          ? `Scan complete · ${merged} change${merged === 1 ? "" : "s"} merged.`
          : "Scan complete · no new proposals.",
      );
    }
  }

  function stopScan() {
    scanAbort.current = true;
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-xs text-ink-muted">
              {meta.docId} · {meta.revision}
            </p>
            <DocumentFilePicker compact />
          </div>
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
          {scanNotice && (
            <p className="mt-1 text-xs text-ink-muted">{scanNotice}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {scanProgress ? (
            <>
              <span className="text-xs text-ink-muted">
                Scanning {scanProgress.current}/{scanProgress.total}…
              </span>
              <button className={navButton} type="button" onClick={stopScan}>
                Stop
              </button>
            </>
          ) : (
            <button
              className={navButton}
              type="button"
              onClick={runFullScan}
              disabled={sections.length === 0}
              title={
                offline
                  ? "Full scan needs a live API (not available in static export)"
                  : "Experimental: scan every section via RAG"
              }
            >
              Run full scan
            </button>
          )}
          <button className={navButton} disabled={!canUndo} onClick={undo}>
            Undo
          </button>
        </div>
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
              disabled={changes.length === 0 || globalIndex === 0}
              onClick={() => {
                if (changes.length === 0) return;
                const next =
                  globalIndex < 0
                    ? changes[changes.length - 1]
                    : changes[globalIndex - 1];
                if (next) selectChange(next.id);
              }}
            >
              Prev change
            </button>
            <button
              className={navButton}
              disabled={
                changes.length === 0 ||
                (globalIndex >= 0 && globalIndex >= changes.length - 1)
              }
              onClick={() => {
                if (changes.length === 0) return;
                const next =
                  globalIndex < 0 ? changes[0] : changes[globalIndex + 1];
                if (next) selectChange(next.id);
              }}
            >
              Next change
            </button>
            <span className="ml-auto text-xs text-ink-muted">
              § {sections.length ? sectionIndex + 1 : 0}/{sections.length} ·{" "}
              {sectionChanges.length
                ? `Δ ${changeIndex + 1}/${sectionChanges.length}`
                : "No DOE items"}
            </span>
          </>
        ) : null}
        <SectionSearch />
      </div>

      {reviewView === "full" ? (
        <FullDocumentReader />
      ) : !section ? (
        <p className="rounded border border-border bg-surface p-5 text-sm text-ink-muted">
          Load a review set to begin.
        </p>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_min(400px,40%)]">
          <div className="min-w-0">
            <article className="rounded-card border border-border bg-surface p-5">
              <h2
                ref={sectionHeading}
                tabIndex={-1}
                className="scroll-mt-16 mb-4 border-b border-border pb-3 font-semibold"
              >
                {sectionLabel(section)}
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
            <nav aria-label="Section navigation" className="mt-4 space-y-3">
              <div className="flex justify-between gap-2">
                <button
                  className={navButton}
                  disabled={sectionIndex === 0}
                  onClick={() => goSection(sectionIndex - 1)}
                >
                  ← Previous section
                </button>
                <button
                  className={navButton}
                  disabled={sectionIndex >= sections.length - 1}
                  onClick={() => goSection(sectionIndex + 1)}
                >
                  Next section →
                </button>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {chapterLinks(sections).map((chapter) => (
                  <button
                    key={chapter.label}
                    aria-label={`Chapter ${chapter.label}`}
                    aria-current={
                      chapterKey(section.number) === chapter.label
                        ? "location"
                        : undefined
                    }
                    className={clsx(
                      navButton.replace("bg-surface", ""),
                      chapterKey(section.number) === chapter.label
                        ? "bg-accent text-white"
                        : "bg-surface",
                    )}
                    onClick={() => navigateSection(chapter.sectionId)}
                  >
                    {chapter.label}
                  </button>
                ))}
              </div>
            </nav>
          </div>
          <aside
            aria-label="Section analysis"
            className="max-h-[calc(100dvh-6rem)] lg:sticky lg:top-16"
          >
            {focused ? (
              <DoeAnalysisPanel key={focused.id} change={focused} />
            ) : (
              <p className="rounded border border-border bg-surface p-5 text-sm text-ink-muted">
                No proposed changes in this section.
              </p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
