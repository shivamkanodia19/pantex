"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import Link from "next/link";

import type { DocChange } from "@/lib/document-data";
import { sectionTitle } from "@/lib/document-data";
import { useDocStore } from "@/lib/store";

interface LlmAnalysis {
  model: string;
  headline: string;
  matchQuality: string;
  analysis: string;
  gaps: string[];
  recommendedAction: string;
  actionRationale: string;
}

/** Right-hand analysis screen for Write mode — separate from the document. */
export function DoeAnalysisPanel({ change }: { change: DocChange | null }) {
  const {
    closeOverlay,
    requestAccept,
    confirmAcceptId,
    confirmAccept,
    cancelAccept,
    editChange,
  } = useDocStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(change?.workingText ?? "");
  const [llm, setLlm] = useState<LlmAnalysis | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(change?.workingText ?? "");
    setEditing(false);
  }, [change?.id, change?.workingText]);

  useEffect(() => {
    if (!change) {
      setLlm(null);
      setLlmError(null);
      setLlmLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function run() {
      setLlmLoading(true);
      setLlmError(null);
      setLlm(null);
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            changeId: change!.id,
            sectionId: change!.sectionId,
            oldText: change!.oldText,
            proposedText: change!.workingText,
            doeCitation: change!.doe.citation,
            doeExcerpt: change!.doe.excerpt,
            requirementId: change!.doe.requirementId,
            seedSummary: change!.summary,
            seedReasoning: change!.reasoning,
          }),
        });
        const data = (await res.json()) as LlmAnalysis & { error?: string };
        if (!res.ok) throw new Error(data.error || `Analyze failed (${res.status})`);
        if (!cancelled) setLlm(data);
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
        setLlmError(err instanceof Error ? err.message : "Analysis failed");
      } finally {
        if (!cancelled) setLlmLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [change]);

  if (!change) {
    return (
      <aside className="flex h-full min-h-[320px] flex-col rounded-card border border-dashed border-border bg-surface/80 px-4 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
          DOE analysis
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
          Select a highlighted clause in the document to open Haiku match analysis here.
        </p>
        <p className="mt-auto pt-6 text-[11px] text-ink-faint">
          Screen 2 of Write · Claude Haiku
        </p>
      </aside>
    );
  }

  const confirming = confirmAcceptId === change.id;

  function saveEdit() {
    editChange(change!.id, draft);
    setEditing(false);
  }

  async function rerun() {
    setLlmLoading(true);
    setLlmError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changeId: change.id,
          sectionId: change.sectionId,
          oldText: change.oldText,
          proposedText: draft || change.workingText,
          doeCitation: change.doe.citation,
          doeExcerpt: change.doe.excerpt,
          requirementId: change.doe.requirementId,
          seedSummary: change.summary,
          seedReasoning: change.reasoning,
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

  return (
    <aside className="flex h-full min-h-[420px] max-h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-card border border-border bg-surface">
      <div className="flex items-start justify-between gap-2 border-b border-border-subtle px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-accent">
            DOE analysis · Haiku
          </p>
          <p className="mt-1 text-[13px] font-medium leading-snug text-ink">
            {llm?.headline ?? change.summary}
          </p>
          <p className="mt-1 font-mono text-[10px] text-ink-faint">
            {sectionTitle(change.sectionId)} · p.{change.page} · L{change.lineStart}–
            {change.lineStart + change.lineCount - 1}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close analysis"
          className="pressable shrink-0 rounded-md p-1.5 text-ink-faint hover:bg-canvas hover:text-ink"
          onClick={closeOverlay}
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div>
          <p className="text-[11px] tracking-wide text-ink-faint">Old Pantex</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted line-through decoration-doe/45">
            {change.oldText}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] tracking-wide text-ink-faint">DOE proposed</p>
            <button
              type="button"
              className="pressable text-[11px] font-semibold text-accent hover:underline"
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? "Done" : "Edit"}
            </button>
          </div>
          {editing ? (
            <div className="mt-1 space-y-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={5}
                className="w-full rounded-card border border-accent/40 bg-canvas px-3 py-2 text-[12.5px] leading-relaxed text-ink outline-none focus:border-accent"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="pressable rounded-md bg-accent px-2.5 py-1 text-[11px] font-semibold text-surface"
                  onClick={saveEdit}
                >
                  Save edit
                </button>
                <button
                  type="button"
                  className="pressable rounded-md border border-border px-2.5 py-1 text-[11px] font-semibold text-ink-muted"
                  onClick={() => void rerun()}
                >
                  Re-run Haiku
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink">{change.workingText}</p>
          )}
        </div>

        <div className="rounded-card border border-border-subtle bg-canvas px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
              LLM match analysis
            </p>
            <button
              type="button"
              disabled={llmLoading}
              className="pressable text-[11px] font-semibold text-accent enabled:hover:underline disabled:opacity-50"
              onClick={() => void rerun()}
            >
              {llmLoading ? "Running…" : "Re-run"}
            </button>
          </div>

          {llmLoading ? (
            <p className="mt-2 text-[12.5px] text-ink-muted">Haiku is comparing DOE proof to old Pantex…</p>
          ) : null}

          {llmError ? (
            <p className="mt-2 text-[12.5px] text-doe">{llmError}</p>
          ) : null}

          {llm && !llmLoading ? (
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={clsx(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    llm.matchQuality === "strong" && "bg-accepted-muted text-accepted",
                    llm.matchQuality === "partial" && "bg-accent-muted text-accent",
                    llm.matchQuality === "weak" && "bg-doe-muted text-doe",
                    !["strong", "partial", "weak"].includes(llm.matchQuality) &&
                      "bg-canvas text-ink-muted",
                  )}
                >
                  {llm.matchQuality} match
                </span>
                <span className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted ring-1 ring-border">
                  {llm.recommendedAction}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink">{llm.analysis}</p>
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

          {!llm && !llmLoading && !llmError ? (
            <p className="mt-2 text-[12.5px] text-ink-muted">{change.reasoning}</p>
          ) : null}
        </div>

        <div className="rounded-card border border-accent/25 bg-accent-muted/60 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-accent">
            DOE source · proof
          </p>
          <a
            href={change.doe.url}
            target="_blank"
            rel="noopener noreferrer"
            className="pressable mt-1.5 block text-[12px] font-medium text-accent hover:underline"
          >
            {change.doe.citation}
            <span className="ml-1 font-normal text-ink-faint" aria-hidden>
              ↗
            </span>
          </a>
          <p className="mt-0.5 font-mono text-[10px] text-ink-faint">{change.doe.requirementId}</p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink">{change.doe.excerpt}</p>
          <a
            href={change.doe.url}
            target="_blank"
            rel="noopener noreferrer"
            className="pressable mt-3 inline-flex items-center gap-1 rounded-md border border-accent/30 bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-accent hover:bg-accent-muted"
          >
            Open DOE order
            <span aria-hidden>↗</span>
          </a>
        </div>

        <p className="font-mono text-[11px] text-ink-faint">
          +{change.lineCount} −{change.lineCount} lines · status {change.status}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle px-4 py-2.5">
        <Link
          href={`/changes#${change.id}`}
          className="pressable text-[12px] font-semibold text-accent hover:underline"
        >
          Extended view →
        </Link>
        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-ink-muted">Accept?</span>
            <button
              type="button"
              className="pressable rounded-md bg-accepted px-2.5 py-1 text-[11px] font-semibold text-surface"
              onClick={confirmAccept}
            >
              Confirm
            </button>
            <button
              type="button"
              className="pressable rounded-md px-2.5 py-1 text-[11px] font-semibold text-ink-muted"
              onClick={cancelAccept}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={clsx(
              "pressable rounded-md px-3 py-1.5 text-[12px] font-semibold",
              change.status === "accepted"
                ? "border border-border bg-canvas text-ink-muted"
                : "bg-accent text-surface",
            )}
            onClick={() => requestAccept(change.id)}
            disabled={change.status === "accepted"}
          >
            {change.status === "accepted" ? "Accepted" : "Accept"}
          </button>
        )}
      </div>
    </aside>
  );
}

export function statusStyles(status: DocChange["status"]) {
  return clsx(
    "inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
    status === "pending" && "bg-doe-muted text-doe",
    status === "accepted" && "bg-accepted-muted text-accepted",
    status === "edited" && "bg-accent-muted text-accent",
    status === "rejected" && "bg-canvas text-ink-muted",
  );
}
