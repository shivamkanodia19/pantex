"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  DEFAULT_PACK_IDS,
  doeDocOptions,
  siteDocOptions,
} from "@/lib/review-packs";
import { useDocStore } from "@/lib/store";

const selectClass =
  "w-full rounded-md border border-border bg-canvas px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-accent";

/** Pick site + DOE baseline/incoming, then Load into Document. */
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
  } = useDocStore();

  const sites = siteDocOptions();
  const does = doeDocOptions();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [draftSite, setDraftSite] = useState(siteId);
  const [draftFrom, setDraftFrom] = useState(doeFromId);
  const [draftTo, setDraftTo] = useState(doeToId);

  useEffect(() => {
    setDraftSite(siteId);
    setDraftFrom(doeFromId);
    setDraftTo(doeToId);
  }, [siteId, doeFromId, doeToId]);

  // Deep-link: /document?site=&from=&to=
  useEffect(() => {
    const qSite = searchParams.get("site");
    const qFrom = searchParams.get("from");
    const qTo = searchParams.get("to");
    if (!qSite && !qFrom && !qTo) return;
    const nextSite = qSite || DEFAULT_PACK_IDS.siteId;
    const nextFrom = qFrom || DEFAULT_PACK_IDS.doeFromId;
    const nextTo = qTo || DEFAULT_PACK_IDS.doeToId;
    if (
      nextSite !== siteId ||
      nextFrom !== doeFromId ||
      nextTo !== doeToId
    ) {
      loadReviewPack(nextSite, nextFrom, nextTo);
    }
    // only on mount / query change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function applyLoad() {
    loadReviewPack(draftSite, draftFrom, draftTo);
    const params = new URLSearchParams();
    params.set("site", draftSite);
    params.set("from", draftFrom);
    params.set("to", draftTo);
    router.replace(`${pathname}?${params.toString()}`);
  }

  const dirty =
    draftSite !== siteId || draftFrom !== doeFromId || draftTo !== doeToId;

  return (
    <div className="mb-5 rounded-card border border-border bg-surface px-4 py-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
            Review set
          </p>
          <p className="mt-0.5 text-[12px] text-ink-muted">
            Choose files yourself — site doc + DOE baseline → incoming — then Load.
          </p>
        </div>
        <button
          type="button"
          onClick={applyLoad}
          disabled={!dirty}
          className="pressable rounded-md bg-accent px-3 py-1.5 text-[12px] font-semibold text-surface disabled:opacity-40"
        >
          Load
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="text-[11px] font-medium text-ink-faint">Site document</span>
          <select
            className={selectClass + " mt-1"}
            value={draftSite}
            onChange={(e) => setDraftSite(e.target.value)}
          >
            {sites.map((d) => (
              <option key={d.id} value={d.id}>
                {d.shortTitle}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-ink-faint">DOE baseline</span>
          <select
            className={selectClass + " mt-1"}
            value={draftFrom}
            onChange={(e) => setDraftFrom(e.target.value)}
          >
            {does.map((d) => (
              <option key={d.id} value={d.id}>
                {d.shortTitle}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-ink-faint">DOE incoming</span>
          <select
            className={selectClass + " mt-1"}
            value={draftTo}
            onChange={(e) => setDraftTo(e.target.value)}
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
