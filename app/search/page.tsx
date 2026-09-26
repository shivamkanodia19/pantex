"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { sourcesByFolder } from "@/lib/sources";
import { filterSources, visibleSelection } from "@/lib/source-search";
import { SourcePreview } from "@/components/source-preview";

type FolderId = "pantex" | "doe";

export default function SourceSearchPage() {
  const folders = useMemo(sourcesByFolder, []);
  const [folder, setFolder] = useState<FolderId>("pantex");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const list = filterSources(folders[folder], query);
  const selected = visibleSelection(list, selectedId);
  const preview = useRef<HTMLDivElement>(null);
  const resultButtons = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (!selected) return;
    if (window.matchMedia("(max-width: 1023px)").matches)
      preview.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [selected?.id]);

  function closePreview() {
    setSelectedId(null);
    if (selectedId)
      resultButtons.current.get(selectedId)?.focus({ preventScroll: true });
  }
  function search(value: string) {
    setQuery(value);
    if (!visibleSelection(filterSources(folders[folder], value), selectedId))
      setSelectedId(null);
  }
  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-wide text-ink-muted">
          Library
        </p>
        <h1 className="mt-1 text-[26px] font-medium">Source Search</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Find a Pantex or DOE source and select it to preview alongside your
          search. Browsing does not run AI analysis.
        </p>
      </div>
      <div
        className={clsx(
          "grid items-start gap-4",
          selected
            ? "lg:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.15fr)]"
            : "grid-cols-1",
        )}
      >
        <div className="grid min-h-[520px] min-w-0 overflow-hidden rounded-card border border-border bg-surface sm:grid-cols-[160px_minmax(0,1fr)]">
          <aside className="border-b border-border-subtle bg-canvas/60 sm:border-b-0 sm:border-r">
            <p className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
              Libraries
            </p>
            <nav
              aria-label="Source libraries"
              className="flex gap-1 px-2 pb-3 sm:flex-col"
            >
              {(
                [
                  ["pantex", "Pantex"],
                  ["doe", "DOE"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={folder === id}
                  onClick={() => {
                    setFolder(id);
                    setSelectedId(null);
                  }}
                  className={clsx(
                    "flex flex-1 justify-between gap-3 rounded px-3 py-2 text-left text-sm focus-visible:outline-accent",
                    folder === id
                      ? "bg-surface font-semibold ring-1 ring-border"
                      : "hover:bg-canvas",
                  )}
                >
                  <span>{label}</span>
                  <span>{folders[id].length}</span>
                </button>
              ))}
            </nav>
          </aside>
          <section className="flex min-w-0 flex-col">
            <div className="border-b border-border-subtle p-4">
              <label className="sr-only" htmlFor="source-q">
                Search files
              </label>
              <input
                id="source-q"
                value={query}
                onChange={(e) => search(e.target.value)}
                placeholder="Search titles, IDs…"
                className="w-full rounded border border-border bg-canvas px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <ul className="max-h-[65dvh] flex-1 space-y-1 overflow-y-auto p-2">
              {list.length === 0 ? (
                <li className="p-4 text-sm text-ink-muted">No files match.</li>
              ) : (
                list.map((doc) => (
                  <li
                    key={doc.id}
                    className={clsx(
                      "relative rounded p-3",
                      selected?.id === doc.id
                        ? "bg-accent-muted"
                        : "hover:bg-canvas",
                    )}
                  >
                    <button
                      ref={(el) => {
                        if (el) resultButtons.current.set(doc.id, el);
                        else resultButtons.current.delete(doc.id);
                      }}
                      className="block w-full text-left text-sm font-medium after:absolute after:inset-0 after:rounded focus-visible:outline-accent focus-visible:after:ring-2 focus-visible:after:ring-accent"
                      aria-expanded={selected?.id === doc.id}
                      aria-controls={
                        selected?.id === doc.id ? "source-preview" : undefined
                      }
                      onClick={() => setSelectedId(doc.id)}
                    >
                      {doc.shortTitle}
                    </button>
                    <a
                      className="relative z-10 mt-1 inline-block text-xs text-accent underline"
                      href={doc.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${doc.shortTitle} source in new tab`}
                    >
                      Open source in new tab ↗
                    </a>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
        {selected && (
          <div
            ref={preview}
            id="source-preview"
            className="min-w-0 scroll-mt-16"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                closePreview();
              }
            }}
          >
            <SourcePreview
              key={selected.id}
              doc={selected}
              onClose={closePreview}
            />
          </div>
        )}
      </div>
    </div>
  );
}
