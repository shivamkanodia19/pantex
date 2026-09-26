"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { DOCUMENT_META, SECTIONS } from "@/lib/document-data";
import { useDocStore } from "@/lib/store";
import { DoeAnalysisPanel, statusStyles } from "@/components/change-overlay";

export function DocumentReader({
  residual = false,
  showToolbar = true,
}: {
  residual?: boolean;
  showToolbar?: boolean;
}) {
  const { changes, selectedId, selectChange, undo, canUndo, getChange } =
    useDocStore();
  const selected = selectedId ? getChange(selectedId) : undefined;
  const [pinned, setPinned] = useState(false);
  const [position, setPosition] = useState({
    left: 12,
    top: 72,
    width: 420,
    maxHeight: 600,
  });
  const popup = useRef<HTMLDivElement>(null);
  const anchors = useRef(new Map<string, HTMLButtonElement>());
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressedFocus = useRef(false);
  const pendingCount = changes.filter(
    (c) => c.status === "pending" || c.status === "edited",
  ).length;
  function clearTimers() {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }
  function close(restoreFocus = false) {
    clearTimers();
    if (restoreFocus && selectedId) {
      suppressedFocus.current = true;
      anchors.current.get(selectedId)?.focus({ preventScroll: true });
      queueMicrotask(() => {
        suppressedFocus.current = false;
      });
    }
    selectChange(null);
    setPinned(false);
  }
  function enter(id: string, immediate = false) {
    clearTimers();
    if (suppressedFocus.current || (pinned && selectedId !== id)) return;
    if (immediate) selectChange(id);
    else openTimer.current = setTimeout(() => selectChange(id), 220);
  }
  function leave() {
    clearTimers();
    if (pinned) return;
    closeTimer.current = setTimeout(() => {
      const focused = document.activeElement;
      if (
        popup.current?.contains(focused) ||
        (selectedId && anchors.current.get(selectedId) === focused)
      )
        return;
      selectChange(null);
    }, 300);
  }
  useEffect(() => () => clearTimers(), []);
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      }
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !popup.current?.contains(target) &&
        !anchors.current.get(selectedId)?.contains(target)
      )
        close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  });
  useLayoutEffect(() => {
    if (!selectedId) return;
    const anchor = anchors.current.get(selectedId);
    if (!anchor) return;
    const initialRect = anchor.getBoundingClientRect();
    if (initialRect.top < 64 || initialRect.bottom > window.innerHeight - 12) {
      anchor.scrollIntoView({ block: "center" });
    }
    function update() {
      const rect = anchor!.getBoundingClientRect();
      const width = Math.min(440, window.innerWidth - 24);
      let maxHeight = Math.min(560, Math.max(120, window.innerHeight - 88));
      const height = Math.min(
        popup.current?.offsetHeight || maxHeight,
        maxHeight,
      );
      let left = rect.right + 12;
      let top = rect.top;
      if (left + width > window.innerWidth - 12) {
        if (rect.left - width - 12 >= 12) left = rect.left - width - 12;
        else {
          left = Math.max(
            12,
            Math.min(rect.left, window.innerWidth - width - 12),
          );
          const below = window.innerHeight - rect.bottom - 20;
          const above = rect.top - 76;
          if (below >= 240 || below >= above) {
            maxHeight = Math.max(160, Math.min(maxHeight, below));
            top = rect.bottom + 8;
          } else {
            maxHeight = Math.max(160, Math.min(maxHeight, above));
            top = rect.top - Math.min(height, maxHeight) - 8;
          }
        }
      }
      if (window.innerWidth < 640) {
        left = 12;
      }
      top = Math.max(
        64,
        Math.min(top, window.innerHeight - Math.min(height, maxHeight) - 12),
      );
      setPosition((prev) =>
        prev.left === left &&
        prev.top === top &&
        prev.width === width &&
        prev.maxHeight === maxHeight
          ? prev
          : { left, top, width, maxHeight },
      );
    }
    update();
    const observer = new ResizeObserver(update);
    if (popup.current) observer.observe(popup.current);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [selectedId]);

  return (
    <div>
      {showToolbar && (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-ink-muted">
              {DOCUMENT_META.docId} · {DOCUMENT_META.revision}
            </p>
            <h1 className="mt-1.5 text-[24px] font-medium">
              {residual ? "New Pantex Document" : DOCUMENT_META.title}
            </h1>
            <p className="mt-1 text-[13px] text-ink-muted">
              {SECTIONS.length} sections · {pendingCount} proposals awaiting
              review
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              Hover or focus a highlighted passage to review. Click or tap to
              keep its popup open.
            </p>
          </div>
          <button
            type="button"
            disabled={!canUndo}
            onClick={undo}
            className="rounded border border-border px-3 py-2 text-xs disabled:opacity-40"
          >
            Undo
          </button>
        </div>
      )}
      <article className="space-y-8">
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
                const active = selectedId === change.id;
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
                    aria-controls={active ? "change-review-popup" : undefined}
                    onPointerEnter={(event) => {
                      if (event.pointerType !== "touch") enter(change.id);
                    }}
                    onPointerLeave={leave}
                    onFocus={() => enter(change.id, true)}
                    onBlur={leave}
                    onPointerDown={() => {
                      clearTimers();
                      selectChange(change.id);
                      setPinned(true);
                    }}
                    onClick={() => {
                      clearTimers();
                      selectChange(change.id);
                      setPinned(true);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Tab" && !event.shiftKey && active) {
                        event.preventDefault();
                        popup.current
                          ?.querySelector<HTMLButtonElement>("button")
                          ?.focus();
                      }
                    }}
                    className={clsx(
                      "block w-full rounded-md px-2.5 py-2 text-left text-[13.5px] leading-relaxed ring-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
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
                        Review change{active && pinned ? " · pinned" : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </article>
      {selected &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popup}
            id="change-review-popup"
            role="dialog"
            aria-modal="false"
            aria-labelledby={`review-title-${selected.id}`}
            style={position}
            className="fixed z-50"
            onPointerEnter={clearTimers}
            onPointerLeave={leave}
            onFocus={clearTimers}
            onBlur={leave}
          >
            <DoeAnalysisPanel
              key={selected.id}
              change={selected}
              onClose={() => close(true)}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
