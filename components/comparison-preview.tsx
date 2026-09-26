"use client";
import { useMemo } from "react";
import type { ComparisonState } from "@/lib/use-comparison";
import { renderReport } from "@/lib/diff-report";
export function ComparisonPreview({
  state,
  onClose,
  onRetry,
}: {
  state: NonNullable<ComparisonState>;
  onClose: () => void;
  onRetry: () => void;
}) {
  const html = useMemo(
    () => (state.status === "ready" ? renderReport(state.result) : ""),
    [state],
  );
  function download() {
    if (state.status !== "ready") return;
    const url = URL.createObjectURL(
      new Blob([html], { type: "text/html;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `DOE-comparison-${state.result.older.id}-to-${state.result.newer.id}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section
      aria-label="Comparison preview"
      className="flex h-[75dvh] min-h-[420px] flex-col overflow-hidden rounded-card border border-border bg-surface"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
        <h2 className="text-sm font-semibold">DOE comparison</h2>
        <div className="flex gap-2">
          {state.status === "ready" && (
            <button
              className="rounded border border-border px-2 py-1 text-xs text-accent"
              onClick={download}
            >
              Download HTML report
            </button>
          )}
          <button
            className="rounded border border-border px-2 py-1 text-xs"
            onClick={onClose}
            aria-label="Close comparison"
          >
            Close
          </button>
        </div>
      </header>
      {state.status === "loading" ? (
        <p role="status" className="p-4 text-sm">
          Verifying sources and comparing complete files…
        </p>
      ) : state.status === "error" ? (
        <div className="p-4">
          <p role="alert">{state.error}</p>
          <button
            onClick={onRetry}
            className="mt-3 rounded border border-border px-3 py-2"
          >
            Retry comparison
          </button>
        </div>
      ) : (
        <iframe
          title="DOE textual comparison report"
          srcDoc={html}
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          className="min-h-0 w-full flex-1 border-0"
        />
      )}
    </section>
  );
}
