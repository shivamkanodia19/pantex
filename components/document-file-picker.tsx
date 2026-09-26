"use client";

import { useEffect, useRef, useState } from "react";

import { DEFAULT_PACK_IDS, siteDocOptions } from "@/lib/review-packs";
import { useDocStore } from "@/lib/store";

function readSiteQuery(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("site");
}

function writeSiteQuery(siteId: string) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("site", siteId);
  url.searchParams.delete("from");
  url.searchParams.delete("to");
  window.history.replaceState(null, "", url.pathname + url.search);
}

/** Compact Pantex site-doc control — DOE pair is fixed (483.1B→483.1C). */
export function DocumentFilePicker({ compact = false }: { compact?: boolean }) {
  const { siteId, loadReviewPack, sitePdfHref, meta } = useDocStore();
  const sites = siteDocOptions();
  const booted = useRef(false);
  const safeSite = sites.some((d) => d.id === siteId)
    ? siteId
    : (sites[0]?.id ?? DEFAULT_PACK_IDS.siteId);
  const [draftSite, setDraftSite] = useState(safeSite);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const qSite = readSiteQuery() || DEFAULT_PACK_IDS.siteId;
    setDraftSite(qSite);
    if (qSite !== siteId) {
      loadReviewPack(qSite, DEFAULT_PACK_IDS.doeFromId, DEFAULT_PACK_IDS.doeToId);
    }
    writeSiteQuery(qSite);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setDraftSite(
      sites.some((d) => d.id === siteId)
        ? siteId
        : (sites[0]?.id ?? siteId),
    );
  }, [siteId, sites]);

  function apply(nextSite: string) {
    setDraftSite(nextSite);
    loadReviewPack(
      nextSite,
      DEFAULT_PACK_IDS.doeFromId,
      DEFAULT_PACK_IDS.doeToId,
    );
    writeSiteQuery(nextSite);
  }

  return (
    <div
      className={
        compact
          ? "flex flex-wrap items-center gap-2"
          : "mb-4 flex flex-wrap items-center gap-2"
      }
    >
      <label className="flex items-center gap-2 text-[12px] text-ink-muted">
        <span className="shrink-0 font-medium text-ink-faint">Pantex doc</span>
        <select
          aria-label="Pantex site document"
          className="max-w-[min(100%,18rem)] rounded-md border border-border bg-canvas px-2 py-1 text-[12px] text-ink outline-none focus:border-accent"
          value={draftSite}
          onChange={(e) => apply(e.target.value)}
        >
          {sites.map((d) => (
            <option key={d.id} value={d.id}>
              {d.shortTitle}
            </option>
          ))}
        </select>
      </label>
      {sitePdfHref ? (
        <a
          href={sitePdfHref}
          target="_blank"
          rel="noopener noreferrer"
          className="pressable text-[11px] font-semibold text-accent hover:underline"
        >
          Open PDF ↗
        </a>
      ) : null}
      {!compact ? (
        <span className="font-mono text-[10px] text-ink-faint">
          {meta.totalPages} pp
        </span>
      ) : null}
    </div>
  );
}
