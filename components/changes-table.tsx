"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { useRouter } from "next/navigation";

import { sectionTitle } from "@/lib/document-data";
import { impactRank, type ImpactJudgement, type ImpactLevel } from "@/lib/impact";
import { useDocStore } from "@/lib/store";
import { statusStyles } from "@/components/change-overlay";

const PAGE_SIZE = 8;

type ImpactFilter = "all" | ImpactLevel | "unscored";
type SortMode = "default" | "urgency";

export function ChangesTable() {
  const router = useRouter();
  const { changes, selectChange, impacts, setImpacts, clearImpacts } = useDocStore();
  const [openId, setOpenId] = useState<string | null>(changes[0]?.id ?? null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [filter, setFilter] = useState<ImpactFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const offline = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";

  const filtered = useMemo(() => {
    let list = [...changes];
    if (filter === "unscored") {
      list = list.filter((c) => !impacts[c.id]);
    } else if (filter !== "all") {
      list = list.filter((c) => impacts[c.id]?.level === filter);
    }
    if (sortMode === "urgency") {
      list.sort((a, b) => {
        const ia = impacts[a.id];
        const ib = impacts[b.id];
        const ua = ia?.urgency ?? -1;
        const ub = ib?.urgency ?? -1;
        if (ub !== ua) return ub - ua;
        return impactRank(ib?.level) - impactRank(ia?.level);
      });
    }
    return list;
  }, [changes, filter, sortMode, impacts]);

  const slice = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;
  const scoredCount = changes.filter((c) => impacts[c.id]).length;

  async function runImpactTriage() {
    if (offline || changes.length === 0) return;
    setScoring(true);
    setScoreError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/impact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: changes.map((ch) => ({
            changeId: ch.id,
            sectionId: ch.sectionId,
            summary: ch.summary,
            oldText: ch.oldText,
            proposedText: ch.workingText,
            doeCitation: ch.doe.citation,
          })),
        }),
      });
      const data = (await res.json()) as {
        judgements?: ImpactJudgement[];
        model?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || `Impact triage failed (${res.status})`);
      if (!Array.isArray(data.judgements)) throw new Error("Invalid impact response");
      const next: Record<string, ImpactJudgement> = {};
      for (const j of data.judgements) {
        next[j.changeId] = { ...j, model: data.model };
      }
      setImpacts(next);
      setSortMode("urgency");
      setFilter("all");
      setVisible(PAGE_SIZE);
    } catch (err) {
      setScoreError(err instanceof Error ? err.message : "Impact triage failed");
    } finally {
      setScoring(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-faint">Screen 3</p>
        <h1 className="mt-1.5 text-[26px] font-medium tracking-tight text-ink">Recommended changes</h1>
        <p className="mt-1.5 max-w-2xl text-[13px] text-ink-muted">
          Accordion detail for every DOE recommendation. Showing {slice.length} of {filtered.length}
          {filtered.length !== changes.length ? ` (filtered from ${changes.length})` : ""} — lazy load{" "}
          {PAGE_SIZE} at a time.
        </p>
      </div>

      {/* Optional impact tool */}
      <div className="mb-5 rounded-card border border-dashed border-border bg-canvas/50 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 max-w-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
              Optional tool · business impact
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
              Rough Haiku triage for urgency sorting — not a risk register, not required for review.
              Ignore this entire block if you do not need it.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={offline || scoring || changes.length === 0}
              onClick={() => void runImpactTriage()}
              className="pressable rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold text-accent disabled:opacity-40"
            >
              {scoring ? "Scoring…" : scoredCount ? "Re-score impact" : "Score impact (LLM)"}
            </button>
            {scoredCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  clearImpacts();
                  setFilter("all");
                  setSortMode("default");
                }}
                className="pressable rounded-md px-3 py-1.5 text-[12px] font-semibold text-ink-muted hover:text-ink"
              >
                Clear scores
              </button>
            ) : null}
          </div>
        </div>

        {offline ? (
          <p className="mt-2 text-[11px] text-ink-faint">
            Static demo: impact scoring needs local `npm run dev` + API key.
          </p>
        ) : null}
        {scoreError ? <p className="mt-2 text-[12px] text-doe">{scoreError}</p> : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-ink-faint">Filter</span>
          {(
            [
              ["all", "All"],
              ["high", "High"],
              ["medium", "Medium"],
              ["low", "Low"],
              ["unscored", "Unscored"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setFilter(id);
                setVisible(PAGE_SIZE);
              }}
              className={clsx(
                "pressable rounded-md px-2.5 py-1 text-[11px] font-semibold",
                filter === id
                  ? "bg-accent text-surface"
                  : "border border-border bg-surface text-ink-muted hover:text-ink",
              )}
            >
              {label}
              {id !== "all" && id !== "unscored"
                ? ` · ${changes.filter((c) => impacts[c.id]?.level === id).length}`
                : id === "unscored"
                  ? ` · ${changes.filter((c) => !impacts[c.id]).length}`
                  : ""}
            </button>
          ))}
          <span className="ml-2 text-[11px] text-ink-faint">Sort</span>
          <button
            type="button"
            onClick={() => setSortMode("default")}
            className={clsx(
              "pressable rounded-md px-2.5 py-1 text-[11px] font-semibold",
              sortMode === "default"
                ? "bg-surface text-ink ring-1 ring-border"
                : "text-ink-muted hover:text-ink",
            )}
          >
            Default
          </button>
          <button
            type="button"
            onClick={() => setSortMode("urgency")}
            disabled={scoredCount === 0}
            className={clsx(
              "pressable rounded-md px-2.5 py-1 text-[11px] font-semibold disabled:opacity-40",
              sortMode === "urgency"
                ? "bg-surface text-ink ring-1 ring-border"
                : "text-ink-muted hover:text-ink",
            )}
          >
            By urgency
          </button>
        </div>
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
          {slice.length === 0 ? (
            <li className="px-4 py-8 text-center text-[13px] text-ink-faint">
              No changes match this filter.
            </li>
          ) : null}
          {slice.map((ch) => {
            const open = openId === ch.id;
            const impact = impacts[ch.id];
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
                    {impact ? (
                      <span className="mt-1 block">
                        <ImpactChip impact={impact} />
                      </span>
                    ) : null}
                  </span>
                  <span className="line-clamp-2 text-[12px] text-ink-muted max-lg:hidden">{ch.oldText}</span>
                  <span className="line-clamp-2 text-[12px] text-ink max-lg:hidden">{ch.workingText}</span>
                  <span className="line-clamp-2 text-[12px] text-ink-muted max-lg:hidden">{ch.summary}</span>
                  <span className="text-right font-mono text-[11px] tabular-nums text-ink-faint max-lg:hidden">
                    +{ch.lineCount}/−{ch.lineCount}
                  </span>
                  <span className="max-lg:mt-1">
                    <span className={statusStyles(ch.status)}>{ch.status}</span>
                  </span>
                </button>

                {open ? (
                  <div className="space-y-3 border-t border-border-subtle bg-canvas/60 px-4 py-4">
                    {impact ? (
                      <div className="rounded-card border border-border bg-surface px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <ImpactChip impact={impact} />
                          <span className="font-mono text-[10px] text-ink-faint">
                            urgency {impact.urgency}/5 · optional triage
                          </span>
                        </div>
                        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">
                          {impact.rationale}
                        </p>
                      </div>
                    ) : null}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-[11px] text-ink-faint">Old text</p>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">{ch.oldText}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-ink-faint">DOE proposed (working)</p>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-ink">{ch.workingText}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] text-ink-faint">Summary</p>
                      <p className="mt-1 text-[12.5px] text-ink">{ch.summary}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-ink-faint">Reasoning</p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">{ch.reasoning}</p>
                    </div>
                    <div className="rounded-card border border-accent/20 bg-accent-muted/50 px-3 py-2.5">
                      <a
                        href={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}${ch.doe.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pressable text-[11px] font-semibold text-accent hover:underline"
                      >
                        {ch.doe.citation} ↗
                      </a>
                      <p className="mt-1 text-[12px] leading-relaxed text-ink">{ch.doe.excerpt}</p>
                      <a
                        href={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}${ch.doe.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pressable mt-2 inline-block text-[11px] font-semibold text-accent hover:underline"
                      >
                        Open DOE order →
                      </a>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-[11px] text-ink-faint">
                        p.{ch.page} · L{ch.lineStart}–L{ch.lineStart + ch.lineCount - 1}
                      </span>
                      <button
                        type="button"
                        className="pressable text-[12px] font-semibold text-accent hover:underline"
                        onClick={() => {
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
            className="pressable rounded-md border border-border bg-surface px-4 py-2 text-[13px] font-semibold text-ink"
            onClick={() => setVisible((v) => Math.min(v + PAGE_SIZE, filtered.length))}
          >
            Load next miniscreen ({Math.min(PAGE_SIZE, filtered.length - visible)} more)
          </button>
        </div>
      ) : (
        <p className="mt-4 text-center text-[12px] text-ink-faint">
          {filtered.length === 0 ? "Nothing to load" : "All matching changes loaded"}
        </p>
      )}
    </div>
  );
}

function ImpactChip({ impact }: { impact: ImpactJudgement }) {
  return (
    <span
      className={clsx(
        "inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        impact.level === "high" && "bg-doe-muted text-doe",
        impact.level === "medium" && "bg-accent-muted text-accent",
        impact.level === "low" && "bg-canvas text-ink-muted ring-1 ring-border",
      )}
    >
      {impact.level} · u{impact.urgency}
    </span>
  );
}
