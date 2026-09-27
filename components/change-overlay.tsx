"use client";

import { useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import type { DocChange } from "@/lib/document-data";
import { useDocStore } from "@/lib/store";

interface Analysis {
  analysis: string;
  matchQuality: string;
  recommendedAction: string;
  actionRationale: string;
  gaps: string[];
}
const analysisCache = new Map<string, Analysis>();
const offline = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";
const control =
  "rounded-md border border-border bg-surface px-3 py-2 text-[12px] font-semibold disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent";

export function DoeAnalysisPanel({
  change,
  onClose,
}: {
  change: DocChange;
  onClose?: () => void;
}) {
  const {
    approveChange,
    rejectChange,
    editChange,
    rewriteChange,
    revision,
    undo,
    canUndo,
    editors,
    setEditor,
    clearEditor,
    sections,
  } = useDocStore();
  const editing = Object.prototype.hasOwnProperty.call(editors, change.id);
  const draft = editors[change.id] ?? change.workingText;
  const setDraft = (text: string) => setEditor(change.id, text);
  const setEditing = (active: boolean) =>
    active ? setEditor(change.id, draft) : clearEditor(change.id);
  const [busy, setBusy] = useState<"rewrite" | "analysis" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const controller = useRef<AbortController | null>(null);
  const rewriteNotice = useRef("");
  const generation = useRef(0);
  const currentRevision = useRef(revision);
  currentRevision.current = revision;
  const key = JSON.stringify([
    change.id,
    change.oldText,
    change.workingText,
    change.doe,
    change.summary,
    change.reasoning,
  ]);

  function cancelRequest() {
    generation.current += 1;
    controller.current?.abort();
    setBusy(null);
  }
  useLayoutEffect(() => {
    setAnalysis(analysisCache.get(key) ?? null);
    setNotice(rewriteNotice.current);
    rewriteNotice.current = "";
    setError(null);
    cancelRequest();
    return () => {
      generation.current += 1;
      controller.current?.abort();
    };
  }, [key, revision, change.workingText]);

  async function request(kind: "rewrite" | "analysis") {
    cancelRequest();
    const requestId = generation.current;
    const expectedRevision = revision;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(kind);
    setError(null);
    setNotice("");
    try {
      const context =
        sections
          .find((s) => s.id === change.sectionId)
          ?.paragraphs.map((p) => p.text)
          .join("\n") ?? change.oldText;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/${kind === "rewrite" ? "rewrite" : "analyze"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abort.signal,
          body: JSON.stringify({
            changeId: change.id,
            sectionId: change.sectionId,
            oldText: change.oldText,
            proposedText: change.workingText,
            doeCitation: change.doe.citation,
            doeExcerpt: change.doe.excerpt,
            requirementId: change.doe.requirementId,
            seedSummary: change.summary,
            seedReasoning: change.reasoning,
            context,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Request failed. Try again.");
      if (
        requestId !== generation.current ||
        currentRevision.current !== expectedRevision
      )
        return;
      if (kind === "rewrite") {
        if (
          result.changeId !== change.id ||
          typeof result.proposedText !== "string" ||
          !result.proposedText.trim() ||
          typeof result.explanation !== "string"
        )
          throw new Error(
            "Invalid rewrite response. Your proposal has not changed.",
          );
        clearEditor(change.id);
        rewriteNotice.current = result.explanation;
        rewriteChange(change.id, result.proposedText, expectedRevision);
        // The new proposal remains unapproved; its explanation is retained below.
        setNotice(result.explanation);
      } else {
        if (
          typeof result.analysis !== "string" ||
          typeof result.matchQuality !== "string" ||
          typeof result.recommendedAction !== "string" ||
          typeof result.actionRationale !== "string" ||
          !Array.isArray(result.gaps) ||
          !result.gaps.every((g: unknown) => typeof g === "string")
        )
          throw new Error("Invalid analysis response. Try again.");
        analysisCache.set(key, result);
        setAnalysis(result);
      }
    } catch (err) {
      if (requestId === generation.current && !abort.signal.aborted)
        setError(
          err instanceof Error ? err.message : "Request failed. Try again.",
        );
    } finally {
      if (requestId === generation.current) setBusy(null);
    }
  }
  const dirty = draft !== change.workingText;
  return (
    <div className="flex max-h-[inherit] flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-2xl">
      <header className="flex items-start justify-between gap-3 border-b border-border p-4">
        <div>
          <h2
            id={`review-title-${change.id}`}
            className="text-sm font-semibold"
          >
            Review proposed change
          </h2>
          <span className={statusStyles(change.status)}>{change.status}</span>
        </div>
        {onClose && (
          <button
            className={control}
            onClick={onClose}
            aria-label="Close review panel"
          >
            Close
          </button>
        )}
      </header>
      <div className="min-h-0 space-y-4 overflow-y-auto p-4 text-[13px] leading-relaxed">
        <section className="rounded-md border border-accent/20 bg-accent-muted p-3">
          <a
            className="font-semibold text-accent underline"
            href={change.doe.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {change.doe.citation} ↗
          </a>
          <p className="mt-2">{change.doe.excerpt}</p>
          <p className="mt-1 font-mono text-[10px]">
            {change.doe.requirementId}
          </p>
        </section>
        <section>
          <h3 className="font-semibold">Why this change is proposed</h3>
          <p>{change.reasoning}</p>
        </section>
        {change.approvedText !== undefined &&
          change.approvedText !== change.workingText && (
            <section>
              <h3 className="font-semibold">Currently approved text</h3>
              <p>{change.approvedText}</p>
            </section>
          )}
        <section>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Proposed Pantex wording</h3>
            <button
              className="text-accent underline"
              onClick={() => {
                cancelRequest();
                setEditing(!editing);
              }}
            >
              {editing ? "Cancel edit" : "Edit wording"}
            </button>
          </div>
          {editing ? (
            <div className="mt-2 space-y-2">
              <textarea
                aria-label="Proposed Pantex wording"
                className="w-full rounded border border-border p-2"
                rows={5}
                value={draft}
                onChange={(e) => {
                  cancelRequest();
                  setDraft(e.target.value);
                }}
              />
              <div className="flex gap-2">
                <button
                  className={control}
                  disabled={!draft.trim() || !dirty}
                  onClick={() => {
                    editChange(change.id, draft);
                    setEditing(false);
                  }}
                >
                  Save proposal
                </button>
                <button
                  className={control}
                  onClick={() => {
                    setDraft(change.workingText);
                    setEditing(false);
                  }}
                >
                  Cancel edit
                </button>
              </div>
            </div>
          ) : (
            <p>{change.workingText}</p>
          )}
          <p className="mt-1 text-[11px] text-ink-muted">
            Only approval applies proposed wording to the document.
          </p>
        </section>
        <section>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">Optional AI analysis</h3>
            <button
              className={control}
              disabled={offline || !!busy || dirty}
              onClick={() => void request("analysis")}
            >
              {busy === "analysis"
                ? "Analyzing…"
                : analysis
                  ? "Re-analyze"
                  : "Analyze"}
            </button>
          </div>
          {analysis && (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-ink-muted">
                {analysis.matchQuality} match · Suggested action:{" "}
                {analysis.recommendedAction}
              </p>
              <p className="whitespace-pre-wrap">{analysis.analysis}</p>
              <p>{analysis.actionRationale}</p>
              <ul className="list-disc pl-4">
                {analysis.gaps.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
        {offline && (
          <p className="text-xs text-ink-muted">
            Static demo: AI analysis and rewording require the local/server app.
            Approval, revert, and manual editing are available.
          </p>
        )}
        {dirty && (
          <p className="text-xs text-ink-muted">
            Save or cancel your edit before approving or rewording.
          </p>
        )}
        {error && (
          <p role="alert" className="text-doe">
            {error}
          </p>
        )}
        <p role="status" className="text-xs text-ink-muted">
          {busy === "rewrite" ? "Rewording proposal…" : notice}
        </p>
        <div className="flex gap-4 text-xs text-accent">
          <Link href={`/changes#${change.id}`}>Extended view →</Link>
          <Link href="/sources">All sources →</Link>
        </div>
      </div>
      <footer className="flex flex-wrap gap-2 border-t border-border bg-canvas p-3">
        <button
          className={control + " text-accepted"}
          disabled={!!busy || dirty || change.status === "accepted"}
          onClick={() => approveChange(change.id)}
        >
          ✓ Approve
        </button>
        <button
          className={control + " text-doe"}
          disabled={!!busy || change.status === "rejected"}
          onClick={() => rejectChange(change.id)}
        >
          ✕ Revert
        </button>
        <button
          className={control + " text-accent"}
          disabled={offline || !!busy || dirty}
          onClick={() => void request("rewrite")}
        >
          ↻ Reword
        </button>
        <button className={control} disabled={!canUndo} onClick={undo}>
          Undo
        </button>
      </footer>
    </div>
  );
}
export function statusStyles(status: DocChange["status"]) {
  return clsx(
    "inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
    status === "pending" && "bg-doe-muted text-doe",
    status === "accepted" && "bg-accepted-muted text-accepted",
    status === "edited" && "bg-accent-muted text-accent",
    // Declined proposal — keep red so the recommendation stays visible
    status === "rejected" && "bg-doe-muted text-doe",
  );
}
