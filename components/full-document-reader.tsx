"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import clsx from "clsx";
import { SECTIONS } from "@/lib/document-data";
import { useDocStore } from "@/lib/store";
import { DoeAnalysisPanel, statusStyles } from "@/components/change-overlay";

export function FullDocumentReader() {
  const { selectedId, selectChange, getChange } = useDocStore();
  const selected = selectedId ? getChange(selectedId) : undefined;
  const [panelOpen, setPanelOpen] = useState(Boolean(selectedId));
  const panel = useRef<HTMLDivElement>(null);
  const anchors = useRef(new Map<string, HTMLButtonElement>());
  const open = panelOpen && Boolean(selected);
  const close = useCallback(() => {
    setPanelOpen(false);
    if (selectedId)
      anchors.current.get(selectedId)?.focus({ preventScroll: true });
  }, [selectedId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  const revealSelection = useCallback(() => {
    if (!open || !selectedId) return;
    const anchor = anchors.current.get(selectedId);
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const mobile = window.matchMedia("(max-width: 1023px)").matches;
    const bottom = mobile ? window.innerHeight * 0.4 : window.innerHeight;
    if (rect.top < 64 || rect.bottom > bottom) {
      anchor.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [open, selectedId]);

  useLayoutEffect(() => {
    revealSelection();
    window.addEventListener("resize", revealSelection);
    return () => window.removeEventListener("resize", revealSelection);
  }, [revealSelection]);

  return (
    <div
      className={clsx(
        "grid items-start lg:overflow-x-clip transition-[grid-template-columns,column-gap] duration-200 motion-reduce:transition-none",
        open
          ? "pb-[60dvh] lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-x-5 lg:pb-0"
          : "lg:grid-cols-[minmax(0,1fr)_0px] lg:gap-x-0",
      )}
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget) revealSelection();
      }}
    >
      <article className="min-w-0 space-y-8">
        {SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="rounded-card border border-border bg-surface p-5 sm:p-6"
          >
            <header className="mb-4 flex flex-wrap justify-between gap-2 border-b border-border-subtle pb-3">
              <h2 className="text-[15px] font-semibold">
                <span className="text-accent">{section.number}</span>{" "}
                {section.title}
              </h2>
              <p className="text-[10px] text-ink-muted">
                Demo page {section.pages.join("–")}
              </p>
            </header>
            <div className="space-y-3">
              {section.paragraphs.map((para) => {
                const change = para.changeId
                  ? getChange(para.changeId)
                  : undefined;
                if (!change)
                  return (
                    <p
                      key={para.id}
                      className="px-2.5 py-2 text-[13.5px] leading-relaxed"
                    >
                      {para.text}
                    </p>
                  );
                const active = panelOpen && selectedId === change.id;
                return (
                  <button
                    key={para.id}
                    ref={(el) => {
                      if (el) anchors.current.set(change.id, el);
                      else anchors.current.delete(change.id);
                    }}
                    type="button"
                    data-change-id={change.id}
                    aria-haspopup="dialog"
                    aria-expanded={active}
                    aria-controls={active ? "change-review-panel" : undefined}
                    onClick={() => {
                      selectChange(change.id);
                      setPanelOpen(true);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Tab" && !event.shiftKey && active) {
                        event.preventDefault();
                        panel.current
                          ?.querySelector<HTMLButtonElement>("button")
                          ?.focus();
                      }
                    }}
                    className={clsx(
                      "scroll-mt-16 block w-full rounded-md px-2.5 py-2 text-left text-[13.5px] leading-relaxed ring-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
                      change.status === "pending" &&
                        "bg-doe-muted/70 ring-doe/25",
                      change.status === "edited" &&
                        "bg-accent-muted ring-accent/25",
                      change.status === "accepted" &&
                        "bg-accepted-muted ring-accepted/20",
                      change.status === "rejected" &&
                        "bg-canvas/60 ring-border",
                      active && "ring-2 ring-accent",
                    )}
                  >
                    {change.approvedText ?? para.text}
                    <span className="mt-2 flex items-center gap-2">
                      <span className={statusStyles(change.status)}>
                        {change.status === "rejected"
                          ? "rejected · original restored"
                          : change.status}
                      </span>
                      <span className="text-[10px] text-ink-muted">
                        Review change{active ? " · selected" : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </article>
      <div
        ref={panel}
        id="change-review-panel"
        role={open ? "dialog" : undefined}
        aria-modal={open ? false : undefined}
        aria-labelledby={open ? `review-title-${selectedId}` : undefined}
        className={clsx(
          "fixed inset-x-2 bottom-2 z-40 max-h-[60dvh] transition-[transform,opacity] duration-200 motion-reduce:transition-none lg:sticky lg:inset-x-auto lg:bottom-auto lg:top-16 lg:max-h-[calc(100dvh-5rem)]",
          open
            ? "translate-y-0 opacity-100 lg:w-[400px]"
            : "pointer-events-none translate-y-full opacity-0 lg:translate-y-0 lg:w-0",
        )}
      >
        {open && selected && (
          <DoeAnalysisPanel
            key={selected.id}
            change={selected}
            onClose={close}
          />
        )}
      </div>
    </div>
  );
}
