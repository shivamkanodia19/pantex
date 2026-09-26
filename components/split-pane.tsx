"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import clsx from "clsx";

import {
  SPLIT_DEFAULT_ASIDE,
  SPLIT_MIN_ASIDE,
  SPLIT_MIN_MAIN,
  nextAsidePx,
} from "@/lib/split-math";

const STORAGE_KEY = "pantex.split.asidePx";
const DEFAULT_ASIDE = SPLIT_DEFAULT_ASIDE;
const MIN_ASIDE = SPLIT_MIN_ASIDE;
const MIN_MAIN = SPLIT_MIN_MAIN;

function readStoredAside(): number {
  if (typeof window === "undefined") return DEFAULT_ASIDE;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : DEFAULT_ASIDE;
}

/**
 * Horizontal split with a draggable gutter. Smooth pointer-driven resize;
 * panes keep min widths so body text reflows by word, not mid-glyph.
 */
export function SplitPane({
  main,
  aside,
  className,
}: {
  main: ReactNode;
  aside: ReactNode;
  className?: string;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [asidePx, setAsidePx] = useState(DEFAULT_ASIDE);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startAside: number } | null>(null);
  const rafRef = useRef(0);
  const pendingRef = useRef<number | null>(null);

  useEffect(() => {
    setAsidePx(readStoredAside());
  }, []);

  useEffect(() => {
    if (dragging) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Math.round(asidePx)));
    } catch {
      /* ignore */
    }
  }, [asidePx, dragging]);

  const applyAside = useCallback((next: number) => {
    pendingRef.current = next;
    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = 0;
      if (pendingRef.current != null) setAsidePx(pendingRef.current);
      pendingRef.current = null;
    });
  }, []);

  function onPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    if (e.button !== 0) return;
    const shell = shellRef.current;
    if (!shell) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startAside: asidePx };
    setDragging(true);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragRef.current || !shellRef.current) return;
    const width = shellRef.current.getBoundingClientRect().width;
    applyAside(
      nextAsidePx(
        width,
        dragRef.current.startAside,
        dragRef.current.startX,
        e.clientX,
      ),
    );
  }

  function endDrag(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    dragRef.current = null;
    setDragging(false);
  }

  // Keep aside in bounds on window resize
  useEffect(() => {
    function onResize() {
      const shell = shellRef.current;
      if (!shell) return;
      const width = shell.getBoundingClientRect().width;
      setAsidePx((v) => nextAsidePx(width, v, 0, 0));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      {/* Mobile / narrow: stack, no drag */}
      <div className={clsx("grid items-start gap-5 lg:hidden", className)}>
        <div className="min-w-0">{main}</div>
        <div className="min-w-0">{aside}</div>
      </div>

      {/* Desktop: resizable split */}
      <div
        ref={shellRef}
        className={clsx(
          "relative hidden min-h-[420px] w-full lg:flex",
          dragging && "select-none",
          className,
        )}
      >
        <div
          className="min-w-0 flex-1 overflow-x-auto"
          style={{ minWidth: MIN_MAIN }}
        >
          <div className="min-w-[min(100%,28rem)] break-normal [overflow-wrap:normal] [word-break:normal]">
            {main}
          </div>
        </div>

        <button
          type="button"
          aria-label="Drag to resize analysis panel"
          aria-orientation="vertical"
          aria-valuemin={MIN_ASIDE}
          aria-valuemax={800}
          aria-valuenow={Math.round(asidePx)}
          role="separator"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={clsx(
            "group relative z-10 mx-1 flex w-3 shrink-0 cursor-col-resize items-stretch justify-center bg-transparent",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
            dragging && "cursor-col-resize",
          )}
        >
          <span
            className={clsx(
              "my-2 w-px rounded-full bg-border transition-colors",
              "group-hover:bg-accent group-focus-visible:bg-accent",
              dragging && "bg-accent",
            )}
          />
          <span className="pointer-events-none absolute inset-y-8 left-1/2 w-1 -translate-x-1/2 rounded-full bg-accent/0 transition-colors group-hover:bg-accent/25" />
        </button>

        <aside
          className="sticky top-16 shrink-0 self-start overflow-x-auto"
          style={{
            width: asidePx,
            minWidth: MIN_ASIDE,
            maxWidth: "55%",
          }}
        >
          <div className="min-w-[17.5rem] break-normal [overflow-wrap:normal] [word-break:normal]">
            {aside}
          </div>
        </aside>
      </div>

      {dragging ? (
        <div className="fixed inset-0 z-40 cursor-col-resize" aria-hidden />
      ) : null}
    </>
  );
}
