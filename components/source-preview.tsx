"use client";

import { useEffect, useState } from "react";
import type { SourceDoc } from "@/lib/sources";
import { DOCUMENT_META, SECTIONS } from "@/lib/document-data";
import { useDocStore } from "@/lib/store";

function ProcedurePreview() {
  const { getChange } = useDocStore();
  return (
    <article aria-label="Procedure preview" className="space-y-6 p-4">
      <p className="text-xs text-ink-muted">
        {DOCUMENT_META.revision} · Read-only preview of currently approved text
      </p>
      {SECTIONS.map((section) => (
        <section key={section.id}>
          <h3 className="mb-2 text-sm font-semibold">
            {section.number} {section.title}
          </h3>
          {section.paragraphs.map((p) => (
            <p key={p.id} className="mb-3 text-sm leading-relaxed">
              {(p.changeId ? getChange(p.changeId)?.approvedText : undefined) ??
                p.text}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}

function BundledPreview({ doc }: { doc: SourceDoc }) {
  const [state, setState] = useState<{
    loading: boolean;
    error?: string;
    text?: string;
  }>({ loading: true });
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setState({ loading: true });
    async function load() {
      try {
        const response = await fetch(doc.href, {
          method: doc.format === "pdf" ? "HEAD" : "GET",
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(`Source unavailable (${response.status}).`);
        const contentType = response.headers.get("content-type") ?? "";
        if (contentType.includes("text/html"))
          throw new Error(
            "The source returned a webpage instead of the requested file.",
          );
        const text = doc.format === "pdf" ? undefined : await response.text();
        if (!cancelled) setState({ loading: false, text });
      } catch (error) {
        if (!cancelled)
          setState({
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Unable to load preview.",
          });
      }
    }
    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [doc.href, doc.format]);
  if (state.loading)
    return (
      <p role="status" className="p-4 text-sm text-ink-muted">
        Loading source preview…
      </p>
    );
  if (state.error)
    return (
      <p role="alert" className="p-4 text-sm text-doe">
        {state.error} You can still try the source link above.
      </p>
    );
  if (doc.format === "pdf")
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <p className="px-4 py-2 text-xs text-ink-muted">
          If your browser cannot display this PDF, use “Open source in new tab”
          above.
        </p>
        <iframe
          title={`PDF preview: ${doc.shortTitle}`}
          src={doc.href}
          className="min-h-[420px] w-full flex-1 border-0 bg-white"
        />
      </div>
    );
  return (
    <pre
      aria-label={`${doc.format === "markdown" ? "Markdown" : "Text"} source preview`}
      className="whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed"
    >
      {state.text}
    </pre>
  );
}

export function SourcePreview({
  doc,
  onClose,
}: {
  doc: SourceDoc;
  onClose: () => void;
}) {
  return (
    <section
      aria-label="Source preview"
      className="flex h-[min(72dvh,760px)] min-h-[420px] min-w-0 flex-col overflow-hidden rounded-card border border-border bg-surface"
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border p-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{doc.title}</h2>
          <p className="mt-1 text-xs text-ink-muted">{doc.docId}</p>
          <a
            className="mt-2 inline-block text-xs font-semibold text-accent underline"
            href={doc.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open source in new tab ↗
          </a>
        </div>
        <button
          className="rounded border border-border px-2 py-1 text-xs focus-visible:outline-accent"
          aria-label="Close source preview"
          onClick={onClose}
        >
          Close
        </button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {doc.format === "procedure" ? (
          <ProcedurePreview />
        ) : doc.format === "external" ? (
          <div className="space-y-3 p-4 text-sm">
            <p>{doc.description}</p>
            <p className="text-ink-muted">
              This external library opens in a new tab. Browse it using the
              source link above.
            </p>
          </div>
        ) : (
          <BundledPreview key={doc.id} doc={doc} />
        )}
      </div>
    </section>
  );
}
