"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import Link from "next/link";

import type { DocChange } from "@/lib/document-data";
import { getSourceDocs } from "@/lib/sources";
import { useDocStore } from "@/lib/store";
import { statusStyles } from "@/components/change-overlay";
import { DocumentFilePicker } from "@/components/document-file-picker";

interface LlmAnalysis {
  model: string;
  headline: string;
  matchQuality: string;
  analysis: string;
  gaps: string[];
  recommendedAction: string;
  actionRationale: string;
}

function paragraphDisplay(text: string, change: DocChange | undefined) {
  if (!change) return text;
  if (change.status === "rejected") return text;
  if (change.approvedText) return change.approvedText;
  return text;
}

export function DocumentReader() {
  const {
    changes,
    selectedId,
    selectChange,
    closeOverlay,
    undo,
    canUndo,
    getChange,
    approveChange,
    rejectChange,
    editChange,
    rewriteChange,
    revision,
    meta,
    sections,
  } = useDocStore();

  const [sectionIndex, setSectionIndex] = useState(0);
  const section = sections[sectionIndex] ?? sections[0];

  const sectionChanges = useMemo(
    () => (section ? changes.filter((c) => c.sectionId === section.id) : []),
    [changes, section],
  );

  const changeIndex = Math.max(
    0,
    sectionChanges.findIndex((c) => c.id === selectedId),
  );
  const focusedChange =
    (selectedId && sectionChanges.find((c) => c.id === selectedId)) || sectionChanges[0] || null;

  const [llm, setLlm] = useState<LlmAnalysis | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState<string | null>(null);
  const [rewriting, setRewriting] = useState(false);
  const [rewriteNotice, setRewriteNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const offline = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";

  useEffect(() => {
    setSectionIndex(0);
    setLlm(null);
    setLlmError(null);
  }, [meta.docId, sections.length]);

  useEffect(() => {
    setLlm(null);
    setLlmError(null);
    setEditing(false);
    if (focusedChange) {
      setDraft(focusedChange.workingText);
      if (!selectedId || !sectionChanges.some((c) => c.id === selectedId)) {
        selectChange(focusedChange.id);
      }
    } else {
      closeOverlay();
      setDraft("");
    }
    // intentionally when section changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section?.id]);

  useEffect(() => {
    if (focusedChange) setDraft(focusedChange.workingText);
  }, [focusedChange?.id, focusedChange?.workingText]);

  const pendingCount = changes.filter((c) => c.status === "pending" || c.status === "edited").length;
  const dirty = focusedChange ? draft !== focusedChange.workingText : false;
  const busy = llmLoading || rewriting;

  function goSection(delta: number) {
    setSectionIndex((i) => Math.min(sections.length - 1, Math.max(0, i + delta)));
  }

  function goChange(delta: number) {
    if (sectionChanges.length === 0) return;
    const idx = sectionChanges.findIndex((c) => c.id === focusedChange?.id);
    const next = sectionChanges[Math.min(sectionChanges.length - 1, Math.max(0, (idx < 0 ? 0 : idx) + delta))];
    if (next) {
      selectChange(next.id);
      setLlm(null);
      setLlmError(null);
    }
  }

  function goGlobalChange(delta: number) {
    const ordered = changes;
    if (ordered.length === 0) return;
    const idx = ordered.findIndex((c) => c.id === focusedChange?.id);
    const nextIdx = Math.min(ordered.length - 1, Math.max(0, (idx < 0 ? 0 : idx) + delta));
    const next = ordered[nextIdx];
    const sIdx = sections.findIndex((s) => s.id === next.sectionId);
    if (sIdx >= 0) setSectionIndex(sIdx);
    selectChange(next.id);
    setLlm(null);
    setLlmError(null);
  }

  async function runLlm() {
    if (!focusedChange) return;
    setLlmLoading(true);
    setLlmError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changeId: focusedChange.id,
          sectionId: focusedChange.sectionId,
          oldText: focusedChange.oldText,
          proposedText: draft || focusedChange.workingText,
          doeCitation: focusedChange.doe.citation,
          doeExcerpt: focusedChange.doe.excerpt,
          requirementId: focusedChange.doe.requirementId,
          seedSummary: focusedChange.summary,
          seedReasoning: focusedChange.reasoning,
        }),
      });
      const data = (await res.json()) as LlmAnalysis & { error?: string };
      if (!res.ok) throw new Error(data.error || `Analyze failed (${res.status})`);
      setLlm(data);
    } catch (err) {
      setLlmError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLlmLoading(false);
    }
  }

  async function runRewrite() {
    if (!focusedChange || offline || dirty) return;
    setRewriting(true);
    setLlmError(null);
    setRewriteNotice("");
    const expectedRevision = revision;
    try {
      const context =
        section.paragraphs.map((p) => p.text).join("\n") || focusedChange.oldText;
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changeId: focusedChange.id,
          oldText: focusedChange.oldText,
          proposedText: focusedChange.workingText,
          doeCitation: focusedChange.doe.citation,
          doeExcerpt: focusedChange.doe.excerpt,
          context,
        }),
      });
      const data = (await res.json()) as {
        proposedText?: string;
        explanation?: string;
        changeId?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || `Reword failed (${res.status})`);
      if (
        data.changeId !== focusedChange.id ||
        typeof data.proposedText !== "string" ||
        !data.proposedText.trim() ||
        typeof data.explanation !== "string"
      ) {
        throw new Error("Invalid rewrite response. Your proposal has not changed.");
      }
      rewriteChange(focusedChange.id, data.proposedText, expectedRevision);
      setRewriteNotice(data.explanation);
      setLlm(null);
    } catch (err) {
      setLlmError(err instanceof Error ? err.message : "Rewording failed");
    } finally {
      setRewriting(false);
    }
  }

  return (
    <div>
      <Suspense fallback={null}>
        <DocumentFilePicker />
      </Suspense>

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-faint">
            {meta.docId} · {meta.revision}
          </p>
          <h1 className="mt-1.5 max-w-2xl text-[22px] font-medium tracking-tight text-ink sm:text-[26px]">
            Section review
          </h1>
          <p className="mt-1.5 max-w-2xl text-[13px] text-ink-muted">
            {meta.docId} · {pendingCount} open items · Run LLM is optional (local only; not auto-run).
          </p>
        </div>
        <button
          type="button"
          disabled={!canUndo}
          onClick={undo}
          className="pressable rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold text-ink-muted enabled:hover:text-ink disabled:opacity-40"
        >
          Undo
        </button>
      </div>

      {/* Navigation bar */}
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface px-3 py-2.5">
        <NavBtn label="← Section" disabled={sectionIndex === 0} onClick={() => goSection(-1)} />
        <NavBtn
          label="Section →"
          disabled={sectionIndex >= sections.length - 1}
          onClick={() => goSection(1)}
        />
        <span className="mx-1 hidden h-4 w-px bg-border sm:block" />
        <NavBtn
          label="← Change"
          disabled={!focusedChange || changeIndex <= 0}
          onClick={() => goChange(-1)}
        />
        <NavBtn
          label="Change →"
          disabled={!focusedChange || changeIndex >= sectionChanges.length - 1}
          onClick={() => goChange(1)}
        />
        <span className="mx-1 hidden h-4 w-px bg-border sm:block" />
        <NavBtn label="Prev change (doc)" onClick={() => goGlobalChange(-1)} />
        <NavBtn label="Next change (doc)" onClick={() => goGlobalChange(1)} />
        <span className="ml-auto font-mono text-[11px] text-ink-faint">
          § {sectionIndex + 1}/{sections.length}
          {sectionChanges.length > 0
            ? ` · Δ ${changeIndex + 1}/${sectionChanges.length}`
            : " · no DOE items"}
        </span>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_min(360px,38%)]">
        <article className="rounded-card border border-border bg-surface px-5 py-5 sm:px-6 sm:py-6">
          {!section ? (
            <p className="text-[13px] text-ink-muted">Load a review set to begin.</p>
          ) : (
            <>
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
              const isSelected = Boolean(change && focusedChange?.id === change.id);
              const showMarks = Boolean(change);
              const display = paragraphDisplay(para.text, change);

              return (
                <div key={para.id} className="group relative">
                  <span className="absolute -left-1 top-0 hidden w-6 -translate-x-full font-mono text-[10px] text-ink-faint sm:block">
                    {idx + 1}
                  </span>
                  <button
                    type="button"
                    disabled={!change}
                    onClick={() => {
                      if (!change) return;
                      selectChange(change.id);
                      setLlm(null);
                      setLlmError(null);
                    }}
                    className={clsx(
                      "w-full rounded-md px-2.5 py-2 text-left text-[13.5px] leading-[1.65] transition-colors text-ink",
                      showMarks && change?.status === "pending" && "bg-doe-muted/70 ring-1 ring-doe/25",
                      showMarks && change?.status === "edited" && "bg-accent-muted ring-1 ring-accent/25",
                      showMarks &&
                        change?.status === "accepted" &&
                        "bg-accepted-muted/70 ring-1 ring-accepted/20",
                      showMarks &&
                        change?.status === "rejected" &&
                        "bg-canvas ring-1 ring-border",
                      isSelected && "ring-2 ring-accent",
                      change && "pressable cursor-pointer hover:brightness-[0.98]",
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
                      </span>
                    ) : null}
                  </button>
                </div>
              );
            })}
          </div>
            </>
          )}
        </article>

        <aside className="lg:sticky lg:top-16 lg:self-start">
          <div className="flex max-h-[calc(100vh-6rem)] min-h-[420px] flex-col overflow-hidden rounded-card border border-border bg-surface">
            <div className="border-b border-border-subtle px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-accent">
                Section analysis · Haiku
              </p>
              {focusedChange ? (
                <>
                  <p className="mt-1 text-[13px] font-medium leading-snug text-ink">
                    {llm?.headline ?? focusedChange.summary}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-ink-faint">
                    {focusedChange.id} · p.{focusedChange.page}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-[13px] text-ink-muted">
                  This section has no DOE-flagged clauses. Move to another section or use Next change
                  (doc).
                </p>
              )}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {focusedChange ? (
                <>
                  <div>
                    <p className="text-[11px] tracking-wide text-ink-faint">Old Pantex</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted line-through decoration-doe/45">
                      {focusedChange.oldText}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] tracking-wide text-ink-faint">
                        After · proposed Pantex wording
                      </p>
                      <button
                        type="button"
                        className="pressable text-[11px] font-semibold text-accent hover:underline"
                        onClick={() => setEditing((v) => !v)}
                      >
                        {editing ? "Cancel edit" : "Edit wording"}
                      </button>
                    </div>
                    {editing ? (
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={4}
                        aria-label="Proposed Pantex wording"
                        className="mt-1 w-full rounded-card border border-accent/40 bg-canvas px-3 py-2 text-[12.5px] leading-relaxed text-ink outline-none focus:border-accent"
                      />
                    ) : (
                      <p className="mt-1 text-[12.5px] leading-relaxed text-ink">
                        {focusedChange.workingText}
                      </p>
                    )}
                    {editing ? (
                      <button
                        type="button"
                        disabled={!draft.trim() || !dirty}
                        className="pressable mt-2 rounded-md bg-accent px-2.5 py-1 text-[11px] font-semibold text-surface disabled:opacity-50"
                        onClick={() => {
                          editChange(focusedChange.id, draft);
                          setEditing(false);
                          setLlm(null);
                        }}
                      >
                        Save proposal
                      </button>
                    ) : null}
                    <p className="mt-1.5 text-[11px] text-ink-muted">
                      Only Approve applies proposed wording to the document.
                    </p>
                    {focusedChange.approvedText !== undefined &&
                    focusedChange.approvedText !== focusedChange.workingText ? (
                      <div className="mt-2">
                        <p className="text-[11px] tracking-wide text-ink-faint">
                          Currently approved text
                        </p>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-ink">
                          {focusedChange.approvedText}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    disabled={busy || offline || dirty}
                    onClick={() => void runLlm()}
                    className="pressable w-full rounded-md border border-accent/40 bg-canvas px-3 py-2.5 text-[13px] font-semibold text-accent disabled:opacity-60"
                  >
                    {llmLoading
                      ? "Running Haiku…"
                      : llm
                        ? "Re-run LLM"
                        : "Run LLM (optional · local)"}
                  </button>
                  <p className="text-[11px] text-ink-faint">
                    Change cards above are precomputed from the B→C DOE diff. LLM is set up for
                    live re-analysis; it does not run until you click.
                  </p>

                  {offline ? (
                    <p className="text-[12px] text-ink-muted">
                      Static demo: AI analysis and rewording need the local app. Approve, Revert, and
                      manual edit still work.
                    </p>
                  ) : null}
                  {dirty ? (
                    <p className="text-[12px] text-ink-muted">
                      Save or cancel your edit before approving or rewording.
                    </p>
                  ) : null}
                  {rewriteNotice ? (
                    <p role="status" className="text-[12px] text-ink-muted">
                      {rewriting ? "Rewording proposal…" : rewriteNotice}
                    </p>
                  ) : rewriting ? (
                    <p role="status" className="text-[12px] text-ink-muted">
                      Rewording proposal…
                    </p>
                  ) : null}

                  {llmError ? <p className="text-[12.5px] text-doe">{llmError}</p> : null}

                  {llm && !llmLoading ? (
                    <div className="space-y-2 rounded-card border border-border-subtle bg-canvas px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={clsx(
                            "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            llm.matchQuality === "strong" && "bg-accepted-muted text-accepted",
                            llm.matchQuality === "partial" && "bg-accent-muted text-accent",
                            llm.matchQuality === "weak" && "bg-doe-muted text-doe",
                          )}
                        >
                          {llm.matchQuality} match
                        </span>
                        <span className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted ring-1 ring-border">
                          {llm.recommendedAction}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink">
                        {llm.analysis}
                      </p>
                      {llm.actionRationale ? (
                        <p className="text-[12px] text-ink-muted">
                          <span className="font-medium text-ink">Action: </span>
                          {llm.actionRationale}
                        </p>
                      ) : null}
                      {llm.gaps.length > 0 ? (
                        <ul className="list-disc space-y-1 pl-4 text-[12px] text-ink-muted">
                          {llm.gaps.map((g) => (
                            <li key={g}>{g}</li>
                          ))}
                        </ul>
                      ) : null}
                      <p className="font-mono text-[10px] text-ink-faint">{llm.model}</p>
                    </div>
                  ) : null}

                  <div className="rounded-card border border-accent/25 bg-accent-muted/60 px-3 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-accent">
                      DEMO EVIDENCE · NOT INDEPENDENTLY VERIFIED
                    </p>
                    <a
                      href={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}${focusedChange.doe.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pressable mt-1.5 block text-[12px] font-medium text-accent hover:underline"
                    >
                      {focusedChange.doe.citation} ↗
                    </a>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-ink">
                      {focusedChange.doe.excerpt}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-ink-faint">
                      {focusedChange.doe.requirementId}
                    </p>
                  </div>

                  <div className="rounded-card border border-border bg-canvas px-3 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                      Reference corpus
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {getSourceDocs()
                        .slice(0, 4)
                        .map((src) => (
                          <li key={src.id}>
                            <a
                              href={src.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="pressable text-[12px] font-medium text-accent hover:underline"
                            >
                              {src.shortTitle} ↗
                            </a>
                          </li>
                        ))}
                    </ul>
                    <Link
                      href="/search"
                      className="pressable mt-2 inline-block text-[11px] font-semibold text-ink-muted hover:text-accent"
                    >
                      Source Search →
                    </Link>
                  </div>
                </>
              ) : null}
            </div>

            {focusedChange ? (
              <div className="flex flex-wrap gap-2 border-t border-border-subtle bg-canvas px-4 py-2.5">
                <button
                  type="button"
                  disabled={busy || dirty || focusedChange.status === "accepted"}
                  onClick={() => approveChange(focusedChange.id)}
                  className="pressable rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold text-accepted disabled:opacity-50"
                >
                  ✓ Approve
                </button>
                <button
                  type="button"
                  disabled={busy || focusedChange.status === "rejected"}
                  onClick={() => rejectChange(focusedChange.id)}
                  className="pressable rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold text-doe disabled:opacity-50"
                >
                  ✕ Revert
                </button>
                <button
                  type="button"
                  disabled={offline || busy || dirty}
                  onClick={() => void runRewrite()}
                  className="pressable rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold text-accent disabled:opacity-50"
                >
                  ↻ Reword
                </button>
                <button
                  type="button"
                  disabled={!canUndo}
                  onClick={undo}
                  className="pressable rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold text-ink-muted disabled:opacity-50"
                >
                  Undo
                </button>
                <Link
                  href={`/changes#${focusedChange.id}`}
                  className="pressable ml-auto self-center text-[12px] font-semibold text-accent hover:underline"
                >
                  Extended view →
                </Link>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

function NavBtn({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="pressable rounded-md border border-border bg-canvas px-2.5 py-1 text-[11px] font-semibold text-ink-muted enabled:hover:border-accent/40 enabled:hover:text-ink disabled:opacity-35"
    >
      {label}
    </button>
  );
}
