"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";

import { sourcesByFolder, type SourceDoc } from "@/lib/sources";

type FolderId = "pantex" | "doe";

export default function SourceSearchPage() {
  const folders = sourcesByFolder();
  const [folder, setFolder] = useState<FolderId>("pantex");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(folders.pantex[0]?.id ?? null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return folders[folder].filter((d) => {
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.shortTitle.toLowerCase().includes(q) ||
        (d.docId ?? "").toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q)
      );
    });
  }, [folder, folders, query]);

  const selected = list.find((d) => d.id === selectedId) ?? list[0] ?? null;

  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-faint">Library</p>
        <h1 className="mt-1.5 text-[26px] font-medium tracking-tight text-ink">Source Search</h1>
        <p className="mt-1.5 max-w-2xl text-[13px] text-ink-muted">
          Browse Pantex and DOE documents without running the model. Open a file, then use Document for
          section-by-section Haiku analysis (local only).
        </p>
      </div>

      <div className="grid min-h-[520px] overflow-hidden rounded-card border border-border bg-surface lg:grid-cols-[220px_minmax(0,1fr)_minmax(280px,340px)]">
        {/* Folder rail */}
        <aside className="border-b border-border-subtle bg-canvas/60 lg:border-b-0 lg:border-r">
          <p className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
            Folders
          </p>
          <nav className="flex gap-1 px-2 pb-3 lg:flex-col">
            <FolderButton
              active={folder === "pantex"}
              label="Pantex"
              count={folders.pantex.length}
              onClick={() => {
                setFolder("pantex");
                setSelectedId(folders.pantex[0]?.id ?? null);
              }}
            />
            <FolderButton
              active={folder === "doe"}
              label="DOE"
              count={folders.doe.length}
              onClick={() => {
                setFolder("doe");
                setSelectedId(folders.doe[0]?.id ?? null);
              }}
            />
          </nav>
        </aside>

        {/* File list */}
        <section className="flex min-h-0 flex-col border-b border-border-subtle lg:border-b-0 lg:border-r">
          <div className="border-b border-border-subtle px-4 py-3">
            <label className="sr-only" htmlFor="source-q">
              Search files
            </label>
            <input
              id="source-q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles, IDs…"
              className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:border-accent"
            />
          </div>
          <ul className="flex-1 overflow-y-auto p-2">
            {list.length === 0 ? (
              <li className="px-3 py-6 text-[13px] text-ink-faint">No files match.</li>
            ) : (
              list.map((doc) => (
                <li key={doc.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(doc.id)}
                    className={clsx(
                      "pressable flex w-full flex-col gap-0.5 rounded-md px-3 py-2.5 text-left",
                      selected?.id === doc.id ? "bg-accent-muted" : "hover:bg-canvas",
                    )}
                  >
                    <span className="text-[13px] font-medium text-ink">{doc.shortTitle}</span>
                    <span className="truncate text-[11px] text-ink-muted">{doc.title}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* Preview */}
        <aside className="flex min-h-0 flex-col bg-canvas/40 p-5">
          {selected ? <FilePreview doc={selected} /> : (
            <p className="text-[13px] text-ink-faint">Select a file</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function FolderButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "pressable flex flex-1 items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-[13px] lg:flex-none",
        active ? "bg-surface font-semibold text-ink shadow-sm ring-1 ring-border" : "text-ink-muted hover:text-ink",
      )}
    >
      <span>{label}</span>
      <span className="font-mono text-[11px] text-ink-faint">{count}</span>
    </button>
  );
}

function FilePreview({ doc }: { doc: SourceDoc }) {
  const isProcedure = doc.id === "src-px-ops-2204";

  return (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
        {doc.folder === "pantex" ? "Pantex" : "DOE"}
      </p>
      <h2 className="mt-2 text-[16px] font-semibold leading-snug tracking-tight text-ink">{doc.title}</h2>
      {doc.docId ? <p className="mt-1 font-mono text-[11px] text-ink-faint">{doc.docId}</p> : null}
      <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">{doc.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {doc.updatedLabel ? (
          <span className="rounded-md bg-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted ring-1 ring-border">
            {doc.updatedLabel}
          </span>
        ) : null}
        {doc.pages ? (
          <span className="rounded-md bg-surface px-2 py-1 font-mono text-[10px] text-ink-faint ring-1 ring-border">
            {doc.pages} pages
          </span>
        ) : null}
        <span className="rounded-md bg-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted ring-1 ring-border">
          {doc.local ? "Local" : "External"}
        </span>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-8">
        {isProcedure ? (
          <Link
            href="/document"
            className="pressable inline-flex items-center justify-center rounded-md bg-accent px-3 py-2 text-[13px] font-semibold text-surface"
          >
            Open in Document →
          </Link>
        ) : (
          <a
            href={doc.href}
            target="_blank"
            rel="noopener noreferrer"
            className="pressable inline-flex items-center justify-center rounded-md bg-accent px-3 py-2 text-[13px] font-semibold text-surface"
          >
            {doc.local ? "Open PDF ↗" : "Open library ↗"}
          </a>
        )}
        <p className="text-[11px] leading-relaxed text-ink-faint">
          No LLM while browsing. Analysis runs only from Document, section by section.
        </p>
      </div>
    </>
  );
}
