"use client";

import { getSourceDocs } from "@/lib/sources";

export default function SourcesPage() {
  const sources = getSourceDocs();

  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-faint">Reference corpus</p>
        <h1 className="mt-1.5 text-[26px] font-medium tracking-tight text-ink">Sources</h1>
        <p className="mt-1.5 max-w-2xl text-[13px] text-ink-muted">
          Reference links for reviewers. These documents are not automatically read by AI analysis.
          Open either source below — the PDF is hosted with this app; the Delegations Library is the live DOE site.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {sources.map((src) => (
          <li key={src.id} className="flex flex-col rounded-card border border-border bg-surface p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
              {src.kind === "pantex" ? "Pantex site doc" : "DOE"}
            </p>
            <h2 className="mt-2 text-[15px] font-semibold tracking-tight text-ink">{src.title}</h2>
            {src.docId ? (
              <p className="mt-1 font-mono text-[11px] text-ink-faint">{src.docId}</p>
            ) : null}
            <p className="mt-3 flex-1 text-[13px] leading-relaxed text-ink-muted">{src.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a
                href={src.href}
                target="_blank"
                rel="noopener noreferrer"
                className="pressable inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[12px] font-semibold text-surface"
              >
                {src.local ? "Open PDF" : "Open library"}
                <span aria-hidden>↗</span>
              </a>
              {src.pages ? (
                <span className="font-mono text-[11px] text-ink-faint">{src.pages} pages</span>
              ) : null}
              {src.local ? (
                <span className="rounded-md bg-canvas px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                  Bundled
                </span>
              ) : (
                <span className="rounded-md bg-accent-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                  External
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
