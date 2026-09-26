"use client";

import { useEffect, useRef, useState } from "react";

import {
  DEFAULT_PACK_IDS,
  doeDocOptions,
  siteDocOptions,
} from "@/lib/review-packs";
import { useDocStore } from "@/lib/store";

const selectClass =
  "w-full rounded-md border border-border bg-canvas px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-accent";

function readQueryPack(): {
  siteId: string;
  doeFromId: string;
  doeToId: string;
} | null {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search);
  const site = q.get("site");
  const from = q.get("from");
  const to = q.get("to");
  if (!site && !from && !to) return null;
  return {
    siteId: site || DEFAULT_PACK_IDS.siteId,
    doeFromId: from || DEFAULT_PACK_IDS.doeFromId,
    doeToId: to || DEFAULT_PACK_IDS.doeToId,
  };
}

function writeQueryPack(siteId: string, doeFromId: string, doeToId: string) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("site", siteId);
  url.searchParams.set("from", doeFromId);
  url.searchParams.set("to", doeToId);
  window.history.replaceState(null, "", url.pathname + url.search);
}

/** Pick site + DOE baseline/incoming; selection loads immediately. */
export function DocumentFilePicker() {
  const {
    siteId,
    doeFromId,
    doeToId,
    loadReviewPack,
    packNote,
    diffHref,
    sitePdfHref,
    doeFromPdfHref,
    doeToPdfHref,
    changes,
    meta,
  } = useDocStore();

  const sites = siteDocOptions();
  const does = doeDocOptions();
  const booted = useRef(false);

  const [draftSite, setDraftSite] = useState(siteId);
  const [draftFrom, setDraftFrom] = useState(doeFromId);
  const [draftTo, setDraftTo] = useState(doeToId);

  // Deep-link once on mount (no useSearchParams — avoids Suspense blanking the bar).
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const q = readQueryPack();
    if (!q) return;
    setDraftSite(q.siteId);
    setDraftFrom(q.doeFromId);
    setDraftTo(q.doeToId);
    if (
      q.siteId !== siteId ||
      q.doeFromId !== doeFromId ||
      q.doeToId !== doeToId
    ) {
      loadReviewPack(q.siteId, q.doeFromId, q.doeToId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setDraftSite(siteId);
    setDraftFrom(doeFromId);
    setDraftTo(doeToId);
  }, [siteId, doeFromId, doeToId]);

  function apply(nextSite: string, nextFrom: string, nextTo: string) {
    setDraftSite(nextSite);
    setDraftFrom(nextFrom);
    setDraftTo(nextTo);
    loadReviewPack(nextSite, nextFrom, nextTo);
    writeQueryPack(nextSite, nextFrom, nextTo);
  }

  return (
    <div className="mb-5 rounded-card border border-border bg-surface px-4 py-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
            Review set
          </p>
          <p className="mt-0.5 text-[12px] text-ink-muted">
            Pick site + DOE baseline → incoming. Selection loads right away.
          </p>
        </div>
        <p className="font-mono text-[10px] text-ink-faint">
          {meta.docId} · {changes.length} cards
        </p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="text-[11px] font-medium text-ink-faint">Site document</span>
          <select
            className={selectClass + " mt-1"}
            value={draftSite}
            onChange={(e) => apply(e.target.value, draftFrom, draftTo)}
          >
            {sites.map((d) => (
              <option key={d.id} value={d.id}>
                {d.shortTitle}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-ink-faint">DOE baseline (older)</span>
          <select
            className={selectClass + " mt-1"}
            value={draftFrom}
            onChange={(e) => apply(draftSite, e.target.value, draftTo)}
          >
            {does.map((d) => (
              <option key={d.id} value={d.id}>
                {d.shortTitle}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-ink-faint">DOE incoming (newer)</span>
          <select
            className={selectClass + " mt-1"}
            value={draftTo}
            onChange={(e) => apply(draftSite, draftFrom, e.target.value)}
          >
            {does.map((d) => (
              <option key={d.id} value={d.id}>
                {d.shortTitle}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-2 text-[11px] text-ink-muted">{packNote}</p>

      <div className="mt-2 flex flex-wrap gap-3 text-[11px]">
        {sitePdfHref ? (
          <a
            href={sitePdfHref}
            target="_blank"
            rel="noopener noreferrer"
            className="pressable font-semibold text-accent hover:underline"
          >
            Site PDF ↗
          </a>
        ) : null}
        {doeFromPdfHref ? (
          <a
            href={doeFromPdfHref}
            target="_blank"
            rel="noopener noreferrer"
            className="pressable font-semibold text-accent hover:underline"
          >
            Baseline DOE ↗
          </a>
        ) : null}
        {doeToPdfHref ? (
          <a
            href={doeToPdfHref}
            target="_blank"
            rel="noopener noreferrer"
            className="pressable font-semibold text-accent hover:underline"
          >
            Incoming DOE ↗
          </a>
        ) : null}
        {diffHref ? (
          <a
            href={diffHref}
            target="_blank"
            rel="noopener noreferrer"
            className="pressable font-semibold text-accent hover:underline"
          >
            Precomputed diff ↗
          </a>
        ) : null}
      </div>
    </div>
  );
}
