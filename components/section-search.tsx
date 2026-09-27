"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useDocStore } from "@/lib/store";
import { searchSections, sectionLabel } from "@/lib/section-navigation";

export function SectionSearch() {
  const { sections, changes, navigateSection } = useDocStore();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const results = searchSections(sections, changes, query);
  useEffect(() => {
    setQuery("");
    setOpen(false);
    setActive(0);
  }, [sections]);
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  function choose(sectionId: string) {
    setOpen(false);
    navigateSection(sectionId);
  }
  const visible = open && query.trim().length > 0;
  useEffect(() => {
    if (visible)
      document
        .getElementById(`${id}-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, visible, id]);
  return (
    <div
      ref={root}
      className="relative ml-auto w-full sm:w-64"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor={id} className="sr-only">
        Find section
      </label>
      <input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={visible}
        aria-controls={`${id}-results`}
        aria-activedescendant={
          visible && results[active] ? `${id}-${active}` : undefined
        }
        value={query}
        placeholder="Number, title, or passage…"
        className="w-full rounded border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-accent"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            setOpen(false);
          }
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
            setActive((i) =>
              results.length
                ? (i + (e.key === "ArrowDown" ? 1 : -1) + results.length) %
                  results.length
                : 0,
            );
          }
          if (e.key === "Enter" && visible && results[active]) {
            e.preventDefault();
            choose(results[active].section.id);
          }
        }}
      />
      {visible && (
        <div className="absolute right-0 top-full z-50 mt-1 max-h-80 w-full overflow-y-auto rounded border border-border bg-surface shadow-lg sm:w-80">
          <ul
            id={`${id}-results`}
            role="listbox"
            aria-label="Matching sections"
          >
            {results.map((result, index) => (
              <li
                key={result.section.id}
                id={`${id}-${index}`}
                role="option"
                aria-selected={active === index}
                className={`cursor-pointer px-3 py-2 text-sm ${active === index ? "bg-accent-muted" : "hover:bg-canvas"}`}
                onPointerDown={(e) => {
                  if (e.pointerType === "mouse") e.preventDefault();
                }}
                onClick={() => choose(result.section.id)}
              >
                <span className="block font-medium">
                  {sectionLabel(result.section)}
                </span>
                {result.excerpt && (
                  <span className="mt-1 block text-xs text-ink-muted">
                    {result.excerpt}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {!results.length && (
            <p role="status" className="p-3 text-sm text-ink-muted">
              No sections match.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
